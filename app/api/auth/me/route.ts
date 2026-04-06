import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/session'

export async function GET() {
    const session = await getSession()
    if (!session) {
        return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    try {
        const result = await db.query(
            'SELECT id, email, name, role, position, avatar_url, bio FROM portal_users WHERE id = $1',
            [session.id]
        )

        if (result.rows.length === 0) {
            return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
        }

        return NextResponse.json({ user: result.rows[0] })
    } catch (error) {
        console.error('[auth/me GET]', error)
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }
}
