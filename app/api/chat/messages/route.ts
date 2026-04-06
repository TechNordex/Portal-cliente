import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/session'

export async function GET(req: NextRequest) {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const searchParams = req.nextUrl.searchParams
    const conversationId = searchParams.get('conversationId')

    if (!conversationId) {
        return NextResponse.json({ error: 'Invalid conversationId' }, { status: 400 })
    }

    try {
        // Enforce participation
        const accessCheck = await db.query(
            'SELECT 1 FROM chat_participants WHERE conversation_id = $1 AND user_id = $2',
            [conversationId, session.id]
        )
        if (accessCheck.rows.length === 0) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        const result = await db.query(
            `
            SELECT 
                m.id, 
                m.sender_id,
                m.content, 
                m.type, 
                m.created_at,
                m.is_edited,
                m.reply_to_id,
                (
                    SELECT json_build_object('content', r.content, 'sender_name', pu_r.name)
                    FROM chat_messages r
                    JOIN portal_users pu_r ON r.sender_id = pu_r.id
                    WHERE r.id = m.reply_to_id
                ) as reply_to,
                json_build_object('name', pu.name, 'avatar_url', pu.avatar_url, 'role', pu.role) as sender
            FROM chat_messages m
            LEFT JOIN portal_users pu ON m.sender_id = pu.id
            WHERE m.conversation_id = $1
            ORDER BY m.created_at ASC
            `,
            [conversationId]
        )

        return NextResponse.json({ messages: result.rows })
    } catch (error) {
        console.error('[chat/messages GET]', error)
        return NextResponse.json({ error: 'Erro ao buscar mensagens' }, { status: 500 })
    }
}
