import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { realtimeEmitter, EVENTS } from '@/lib/realtime'

export async function POST(req: Request) {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    try {
        const { conversationId, isTyping } = await req.json()

        if (!conversationId) {
            return NextResponse.json({ error: 'Missing conversationId' }, { status: 400 })
        }

        // Realtime notification
        if (realtimeEmitter) {
            realtimeEmitter.emit(EVENTS.USER_TYPING, {
                conversationId,
                userId: session.id,
                userName: session.name,
                isTyping
            })
        }

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('[chat/typing POST]', error)
        return NextResponse.json({ error: 'Erro ao sinalizar digitação' }, { status: 500 })
    }
}
