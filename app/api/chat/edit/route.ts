import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/session'
import { realtimeEmitter, EVENTS } from '@/lib/realtime'

export async function POST(req: Request) {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    try {
        const { messageId, content } = await req.json()

        if (!messageId || !content) {
            return NextResponse.json({ error: 'Missing messageId or content' }, { status: 400 })
        }

        // Check ownership
        const msgCheck = await db.query(
            'SELECT sender_id, conversation_id FROM chat_messages WHERE id = $1',
            [messageId]
        )
        if (msgCheck.rows.length === 0) {
            return NextResponse.json({ error: 'Message not found' }, { status: 404 })
        }
        if (msgCheck.rows[0].sender_id !== session.id) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        const conversationId = msgCheck.rows[0].conversation_id

        await db.query(
            `UPDATE chat_messages SET content = $1, is_edited = TRUE, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
            [content, messageId]
        )

        // Realtime notification
        if (realtimeEmitter) {
            realtimeEmitter.emit(EVENTS.MESSAGE_EDITED, {
                conversationId,
                messageId,
                newContent: content
            })
        }

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('[chat/edit POST]', error)
        return NextResponse.json({ error: 'Erro ao editar mensagem' }, { status: 500 })
    }
}
