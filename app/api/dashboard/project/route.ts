import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/session'

export async function GET() {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    try {
        const userResult = await db.query(
            'SELECT id, name, email, avatar_url, role, terms_accepted_at, tour_completed_at FROM portal_users WHERE id = $1',
            [session.id]
        )
        const user = userResult.rows[0]

        const projectsResult = await db.query(
            `SELECT p.*, 
                COALESCE(
                    (SELECT json_agg(u) FROM (
                        SELECT pu.id, pu.name, pu.avatar_url, pu.position, pu.bio 
                        FROM project_assignments pa 
                        JOIN portal_users pu ON pa.user_id = pu.id 
                        WHERE pa.project_id = p.id
                    ) u), '[]'
                ) as squad
            FROM projects p 
            WHERE p.client_id = $1 AND p.deleted_at IS NULL 
            ORDER BY p.updated_at DESC`,
            [session.id]
        )

        let updates = { rows: [] as any[] }
        if (projectsResult.rows.length > 0) {
            const projectIds = projectsResult.rows.map(p => p.id)
            updates = await db.query(
                `SELECT 
                    id, 
                    project_id, 
                    stage, 
                    title, 
                    message, 
                    client_note, 
                    status, 
                    feedback, 
                    viewed_at, 
                    preview_url, 
                    created_at,
                    revision_of
                 FROM project_updates 
                 WHERE project_id = ANY($1::uuid[]) 
                 ORDER BY created_at DESC`,
                [projectIds]
            )
        }

        return NextResponse.json({
            projects: projectsResult.rows,
            allUpdates: updates.rows,
            user: { id: user.id, name: user.name, email: user.email, avatar_url: user.avatar_url, role: user.role },
            termsAccepted: !!user.terms_accepted_at,
            tourCompleted: !!user.tour_completed_at,
        })
    } catch (error) {
        console.error('[dashboard/project GET]', error)
        return NextResponse.json({ error: 'Erro ao buscar projeto' }, { status: 500 })
    }
}

// Update client notes
export async function PUT(req: Request) {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    try {
        const { notes } = await req.json()
        
        await db.query(
            'UPDATE projects SET client_notes = $1 WHERE client_id = $2',
            [notes || '', session.id]
        )

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('[dashboard/project PUT]', error)
        return NextResponse.json({ error: 'Erro ao atualizar anotações' }, { status: 500 })
    }
}
