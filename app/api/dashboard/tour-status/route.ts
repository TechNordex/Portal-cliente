import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/session'

export async function POST() {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    try {
        await db.query(
            'UPDATE portal_users SET tour_completed_at = CURRENT_TIMESTAMP WHERE id = $1',
            [session.id]
        )
        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('[dashboard/tour-status POST]', error)
        return NextResponse.json({ error: 'Erro ao atualizar status do tour' }, { status: 500 })
    }
}
