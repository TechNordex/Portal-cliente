import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/session'
import { realtimeEmitter, EVENTS } from '@/lib/realtime'

export async function POST(req: Request) {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    try {
        const { conversationId } = await req.json()

        if (!conversationId) {
            return NextResponse.json({ error: 'Missing conversationId' }, { status: 400 })
        }

        // Ideally check if user is the creator or has admin rights
        // For simplicity, we check if they are a participant
        const check = await db.query('SELECT 1 FROM chat_participants WHERE conversation_id = $1 AND user_id = $2', [conversationId, session.id])
        if (check.rows.length === 0 && session.role !== 'admin') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        // Soft delete or Hard delete? Hard delete for now as per "apagar grupos"
        await db.query('DELETE FROM chat_messages WHERE conversation_id = $1', [conversationId])
        await db.query('DELETE FROM chat_participants WHERE conversation_id = $1', [conversationId])
        await db.query('DELETE FROM chat_conversations WHERE id = $1', [conversationId])

        if (realtimeEmitter) {
            realtimeEmitter.emit(EVENTS.CONVERSATION_DELETED, { conversationId })
        }

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('[chat/delete POST]', error)
        return NextResponse.json({ error: 'Erro ao deletar conversa' }, { status: 500 })
    }
}
