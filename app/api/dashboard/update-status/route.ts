import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/session'
import { realtimeEmitter, EVENTS } from '@/lib/realtime'

export async function PUT(req: Request) {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    try {
        const { update_id, status, feedback } = await req.json()
        
        if (!['authorized', 'denied'].includes(status)) {
            return NextResponse.json({ error: 'Status inválido' }, { status: 400 })
        }

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
            SET status = $1, feedback = $2 
            WHERE id = $3
        `, [status, feedback || null, update_id])

        // Sync with the projects table for the overarching status badge
        const projectResult = await db.query(`
            SELECT project_id FROM project_updates WHERE id = $1
        `, [update_id])

        if (projectResult.rows.length > 0) {
            const projectId = projectResult.rows[0].project_id
            const previewStatus = status === 'authorized' ? 'approved' : 'rejected'
            
            await db.query(`
                UPDATE projects 
                SET preview_status = $1, 
                    preview_feedback = $2,
                    updated_at = now()
                WHERE id = $3
            `, [previewStatus, feedback || null, projectId])

            // Broadcast real-time status change
            realtimeEmitter.emit(EVENTS.STATUS_CHANGED, { project_id: projectId, status: previewStatus })
        }

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('[update-status PUT]', error)
        return NextResponse.json({ error: 'Erro ao atualizar status' }, { status: 500 })
    }
}
