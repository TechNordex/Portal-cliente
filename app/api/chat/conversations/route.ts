import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/session'

export async function GET() {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    try {
        // Find all conversations where this user is a participant
        // For direct chats, we want to know who the *other* person is.
        // For group chats, we want to know the name and project.
        
        const conversationsResult = await db.query(
            `
            WITH user_convs AS (
                SELECT conversation_id 
                FROM chat_participants 
                WHERE user_id = $1
            )
            SELECT 
                c.id, 
                c.project_id, 
                c.name as group_name, 
                c.type, 
                c.updated_at,
                cp.last_read_at,
                (
                    SELECT count(*)
                    FROM chat_messages m
                    WHERE m.conversation_id = c.id
                      AND m.created_at > COALESCE(cp.last_read_at, '1970-01-01')
                      AND m.sender_id != $1
                ) as unread_count,
                (
                    SELECT json_build_object(
                        'id', m.id,
                        'content', m.content,
                        'created_at', m.created_at,
                        'sender_id', m.sender_id
                    )
                    FROM chat_messages m
                    WHERE m.conversation_id = c.id
                    ORDER BY m.created_at DESC
                    LIMIT 1
                ) as last_message,
                (
                    SELECT json_agg(json_build_object(
                        'id', pu.id,
                        'name', pu.name,
                        'avatar_url', pu.avatar_url,
                        'role', pu.role
                    ))
                    FROM chat_participants cp2
                    JOIN portal_users pu ON cp2.user_id = pu.id
                    WHERE cp2.conversation_id = c.id
                ) as participants
            FROM chat_conversations c
            JOIN user_convs uc ON c.id = uc.conversation_id
            JOIN chat_participants cp ON c.id = cp.conversation_id AND cp.user_id = $1
            ORDER BY c.updated_at DESC
            `,
            [session.id]
        )

        // Process the result to make it easier for the frontend
        const formattedConversations = conversationsResult.rows.map(conv => {
            let title = conv.group_name
            let avatar = null
            
            if (conv.type === 'direct') {
                const otherParticipant = conv.participants?.find((p: any) => p.id !== session.id)
                if (otherParticipant) {
                    title = otherParticipant.name
                    avatar = otherParticipant.avatar_url
                }
            }
            
            return {
                ...conv,
                title: title || 'Chat',
                avatar
            }
        })

        return NextResponse.json({ conversations: formattedConversations })
    } catch (error) {
        console.error('[chat/conversations GET]', error)
        return NextResponse.json({ error: 'Erro ao buscar conversas' }, { status: 500 })
    }
}
