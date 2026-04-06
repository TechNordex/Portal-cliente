import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/session'

// POST /api/dashboard/accept-terms — marks the user as having accepted the terms
export async function POST() {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    try {
        await db.query(
            'UPDATE portal_users SET terms_accepted_at = NOW() WHERE id = $1',
            [session.id]
        )
        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('[dashboard/accept-terms POST]', error)
        return NextResponse.json({ error: 'Erro ao registrar aceite dos termos' }, { status: 500 })
    }
}
