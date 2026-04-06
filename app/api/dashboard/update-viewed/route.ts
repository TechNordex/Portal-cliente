import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/session'

export async function POST(req: Request) {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    try {
        const { update_id } = await req.json()

        // Verify that the update belongs to a project the user owns
        const updateCheck = await db.query(`
            SELECT u.id 
            FROM project_updates u
            JOIN projects p ON u.project_id = p.id
            WHERE u.id = $1 AND p.client_id = $2
        `, [update_id, session.id])

        if (updateCheck.rows.length === 0) {
            return NextResponse.json({ error: 'Atualização não encontrada ou acesso negado' }, { status: 404 })
        }

        await db.query(`
            UPDATE project_updates 
            SET viewed_at = NOW() 
            WHERE id = $1 AND viewed_at IS NULL
        `, [update_id])

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('[update-viewed POST]', error)
        return NextResponse.json({ error: 'Erro ao registrar visualização' }, { status: 500 })
    }
}
