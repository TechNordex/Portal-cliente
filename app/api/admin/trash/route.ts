import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/session'

/**
 * GET /api/admin/trash
 * Returns all soft-deleted items: projects + users
 */
export async function GET() {
    const session = await getSession()
    if (!session || session.role !== 'admin') {
        return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    try {
        const [projectsResult, usersResult] = await Promise.all([
            db.query(`
                SELECT
                    p.id,
                    p.name,
                    p.description,
                    p.deleted_at,
                    p.created_at,
                    p.updated_at,
                    u.name  AS client_name,
                    u.email AS client_email,
                    (SELECT COUNT(*) FROM project_updates pu WHERE pu.project_id = p.id)::int AS update_count
                FROM projects p
                LEFT JOIN portal_users u ON p.client_id = u.id
                WHERE p.deleted_at IS NOT NULL
                ORDER BY p.deleted_at DESC
            `),
            db.query(`
                SELECT
                    id,
                    name,
                    email,
                    role,
                    position,
                    avatar_url,
                    deleted_at,
                    created_at,
                    (SELECT COUNT(*) FROM projects pr WHERE pr.client_id = portal_users.id)::int AS project_count,
                    (
                        SELECT COALESCE(json_agg(json_build_object('id', pr.id, 'name', pr.name, 'deleted_at', pr.deleted_at)), '[]'::json)
                        FROM projects pr 
                        WHERE pr.client_id = portal_users.id
                    ) AS linked_projects
                FROM portal_users
                WHERE deleted_at IS NOT NULL
                ORDER BY deleted_at DESC
            `)
        ])

        const items = [
            ...projectsResult.rows.map(r => ({ ...r, type: 'project' as const })),
            ...usersResult.rows.map(r => ({ ...r, type: 'user' as const })),
        ].sort((a, b) => new Date(b.deleted_at).getTime() - new Date(a.deleted_at).getTime())

        return NextResponse.json({
            items,
            // Also expose separately for potential future use
            projects: projectsResult.rows,
            users: usersResult.rows,
        })
    } catch (error) {
        console.error('[admin/trash GET]', error)
        return NextResponse.json({ error: 'Erro ao buscar lixeira' }, { status: 500 })
    }
}

/**
 * POST /api/admin/trash
 * Body: { action: 'restore', type: 'project' | 'user', id: string }
 */
export async function POST(req: NextRequest) {
    const session = await getSession()
    if (!session || session.role !== 'admin') {
        return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    try {
        const { action, type, id } = await req.json()

        if (action !== 'restore' || !type || !id) {
            return NextResponse.json({ error: 'Parâmetros inválidos' }, { status: 400 })
        }

        if (type === 'project') {
            await db.query(
                `UPDATE projects SET deleted_at = NULL, updated_at = NOW() WHERE id = $1`,
                [id]
            )
            return NextResponse.json({ success: true, message: 'Projeto restaurado com sucesso.' })
        }

        if (type === 'user') {
            await db.query(
                `UPDATE portal_users SET deleted_at = NULL WHERE id = $1`,
                [id]
            )
            return NextResponse.json({ success: true, message: 'Usuário restaurado com sucesso.' })
        }

        return NextResponse.json({ error: 'Tipo inválido' }, { status: 400 })
    } catch (error) {
        console.error('[admin/trash POST]', error)
        return NextResponse.json({ error: 'Erro ao restaurar item' }, { status: 500 })
    }
}

/**
 * DELETE /api/admin/trash
 * Query params: ?type=project|user&id=...
 * Optional: ?all=true to empty the entire trash
 */
export async function DELETE(req: NextRequest) {
    const session = await getSession()
    if (!session || session.role !== 'admin') {
        return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    try {
        const { searchParams } = new URL(req.url)
        const type = searchParams.get('type')
        const id = searchParams.get('id')
        const emptyAll = searchParams.get('all') === 'true'

        if (emptyAll) {
            // Permanent delete everything in trash
            await db.query(`DELETE FROM projects WHERE deleted_at IS NOT NULL`)
            await db.query(`DELETE FROM portal_users WHERE deleted_at IS NOT NULL`)
            return NextResponse.json({ success: true, message: 'Lixeira esvaziada com sucesso.' })
        }

        if (!type || !id) {
            return NextResponse.json({ error: 'type e id são obrigatórios' }, { status: 400 })
        }

        if (type === 'project') {
            await db.query(`DELETE FROM projects WHERE id = $1 AND deleted_at IS NOT NULL`, [id])
            return NextResponse.json({ success: true, message: 'Projeto excluído permanentemente.' })
        }

        if (type === 'user') {
            // Permanent delete user and cascade projects if they exist
            await db.query(`DELETE FROM portal_users WHERE id = $1 AND deleted_at IS NOT NULL`, [id])
            return NextResponse.json({ success: true, message: 'Usuário excluído permanentemente.' })
        }

        return NextResponse.json({ error: 'Tipo inválido' }, { status: 400 })
    } catch (error) {
        console.error('[admin/trash DELETE]', error)
        return NextResponse.json({ error: 'Erro ao excluir item permanentemente' }, { status: 500 })
    }
}
