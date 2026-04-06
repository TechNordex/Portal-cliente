import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/session'

export async function POST(req: Request) {
    const session = await getSession()
    if (!session || session.role !== 'admin') {
        return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    try {
        const { userId } = await req.json()
        if (!userId) {
            return NextResponse.json({ error: 'ID do usuário é obrigatório' }, { status: 400 })
        }

        await db.query(
            'UPDATE portal_users SET tour_completed_at = NULL WHERE id = $1',
            [userId]
        )

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('[admin/users/reset-tour POST]', error)
        return NextResponse.json({ error: 'Erro ao resetar tour' }, { status: 500 })
    }
}
