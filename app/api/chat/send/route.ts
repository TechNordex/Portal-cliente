import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/session'
import { realtimeEmitter, EVENTS } from '@/lib/realtime'

export async function POST(req: Request) {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    try {
        const { conversationId, content, type = 'text', replyToId = null } = await req.json()

        if (!conversationId || !content) {
            return NextResponse.json({ error: 'Missing conversationId or content' }, { status: 400 })
        }

        // Check Access
        const accessCheck = await db.query(
            'SELECT 1 FROM chat_participants WHERE conversation_id = $1 AND user_id = $2',
            [conversationId, session.id]
        )
        if (accessCheck.rows.length === 0) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        const insertRes = await db.query(
            `INSERT INTO chat_messages (conversation_id, sender_id, content, type, reply_to_id) 
             VALUES ($1, $2, $3, $4, $5) RETURNING id, created_at`,
             [conversationId, session.id, content, type, replyToId]
        )
        const msg = insertRes.rows[0]

        // Update conversation last activity
        await db.query(
            'UPDATE chat_conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = $1',
            [conversationId]
        )

        // Fetch user info for the realtime event
        const userRes = await db.query('SELECT name, avatar_url, role FROM portal_users WHERE id = $1', [session.id])
        const user = userRes.rows[0]

        // Fetch reply info if needed
        let replyTo = null
        if (replyToId) {
            const replyRes = await db.query(
                `SELECT m.content, pu.name as sender_name 
                 FROM chat_messages m 
                 JOIN portal_users pu ON m.sender_id = pu.id 
                 WHERE m.id = $1`, 
                [replyToId]
            )
            replyTo = replyRes.rows[0]
        }

        // Realtime notification
        if (realtimeEmitter) {
            realtimeEmitter.emit(EVENTS.NEW_MESSAGE, {
                conversationId,
                message: {
                    id: msg.id,
                    sender_id: session.id,
                    content,
                    type,
                    created_at: msg.created_at,
                    is_edited: false,
                    reply_to_id: replyToId,
                    reply_to: replyTo,
                    sender: {
                        name: user?.name || session.name,
                        avatar_url: user?.avatar_url,
                        role: user?.role || session.role
                    }
                }
            })
        }

        return NextResponse.json({ success: true, message: msg })
    } catch (error: any) {
        console.error('[chat/send POST]', error)
        return NextResponse.json({ error: 'Erro ao enviar mensagem', detail: error.message }, { status: 500 })
    }
}
