import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/session'

export async function POST(req: Request) {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    try {
        const { conversationId } = await req.json()

        if (!conversationId) {
            return NextResponse.json({ error: 'Missing conversationId' }, { status: 400 })
        }

        await db.query(
            `UPDATE chat_participants SET last_read_at = CURRENT_TIMESTAMP WHERE conversation_id = $1 AND user_id = $2`,
            [conversationId, session.id]
        )

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('[chat/read POST]', error)
        return NextResponse.json({ error: 'Erro ao marcar como lida' }, { status: 500 })
    }
}
