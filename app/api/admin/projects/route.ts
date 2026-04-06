import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/session'
import { realtimeEmitter, EVENTS } from '@/lib/realtime'

export async function GET(req: NextRequest) {
    const session = await getSession()
    if (!session || session.role !== 'admin') {
        return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const showTrash = searchParams.get('trash') === 'true'

    try {
        const result = await db.query(`
      SELECT
        p.*,
        u.name as client_name,
        u.email as client_email,
        COALESCE(
          (
            SELECT json_agg(update_data)
            FROM (
              SELECT pu.*, cu.name as creator_name
              FROM project_updates pu
              LEFT JOIN portal_users cu ON pu.created_by = cu.id
              WHERE pu.project_id = p.id
              ORDER BY pu.created_at DESC
            ) update_data
          ),
          '[]'
        ) as updates
      FROM projects p
      LEFT JOIN portal_users u ON p.client_id = u.id
      WHERE ${showTrash ? 'p.deleted_at IS NOT NULL' : 'p.deleted_at IS NULL'}
      GROUP BY p.id, u.name, u.email
      ORDER BY ${showTrash ? 'p.deleted_at DESC' : 'p.updated_at DESC'}
    `)
        return NextResponse.json({ projects: result.rows })
    } catch (error) {
        console.error('[admin/projects GET]', error)
        return NextResponse.json({ error: 'Erro ao buscar projetos' }, { status: 500 })
    }
}

export async function POST(req: NextRequest) {
    const session = await getSession()
    if (!session || session.role !== 'admin') {
        return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    try {
        const body = await req.json()
        const { client_id, name, description, preview_url, estimated_hours, action, id } = body

        // Handle Restore
        if (action === 'restore' && id) {
            const result = await db.query(
                `UPDATE projects SET deleted_at = NULL, updated_at = NOW() WHERE id = $1 RETURNING *`,
                [id]
            )
            const restoredProject = result.rows[0]
            if (restoredProject) {
                realtimeEmitter.emit(EVENTS.PROJECT_UPDATED, { project_id: id })
            }
            return NextResponse.json({ project: restoredProject })
        }

        if (!client_id || !name) {
            return NextResponse.json({ error: 'client_id e name são obrigatórios' }, { status: 400 })
        }

        // estimated_minutes is an integer (minutes); stored in the estimated_hours column as integer minutes
        const estimatedVal = body.estimated_minutes != null 
            ? Math.round(Number(body.estimated_minutes)) 
            : (body.estimated_hours != null ? Math.round(Number(body.estimated_hours)) : null)

        const result = await db.query(
            `INSERT INTO projects (client_id, name, description, preview_url, estimated_hours, stage_url, prod_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
            [client_id, name, description || null, preview_url || null, estimatedVal, body.stage_url || null, body.prod_url || null]
        )
        const newProject = result.rows[0]
        
        // Broadcast new project
        realtimeEmitter.emit(EVENTS.PROJECT_UPDATED, { client_id, project_id: newProject.id })

        return NextResponse.json({ project: newProject }, { status: 201 })
    } catch (error) {
        console.error('[admin/projects POST]', error)
        return NextResponse.json({ error: 'Erro ao criar/restaurar projeto' }, { status: 500 })
    }
}

export async function PUT(req: NextRequest) {
    const session = await getSession()
    if (!session || session.role !== 'admin') {
        return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    try {
        const body = await req.json()
        const { id, name, description, preview_url, stage_url, prod_url } = body
        if (!id || !name) {
            return NextResponse.json({ error: 'id e name são obrigatórios para edição' }, { status: 400 })
        }

        const estimatedVal = body.estimated_minutes != null 
            ? Math.round(Number(body.estimated_minutes)) 
            : (body.estimated_hours != null ? Math.round(Number(body.estimated_hours)) : null)

        const result = await db.query(
            `UPDATE projects 
             SET name = $1, description = $2, preview_url = $3, estimated_hours = $4, stage_url = $5, prod_url = $6, updated_at = NOW() 
             WHERE id = $7 RETURNING *`,
            [name, description || null, preview_url || null, estimatedVal, stage_url || null, prod_url || null, id]
        )
        
        if (result.rows.length === 0) {
            return NextResponse.json({ error: 'Projeto não encontrado' }, { status: 404 })
        }

        const updatedProject = result.rows[0]
        // Broadcast update
        realtimeEmitter.emit(EVENTS.PROJECT_UPDATED, { project_id: id })
        
        return NextResponse.json({ project: updatedProject })
    } catch (error) {
        console.error('[admin/projects PUT]', error)
        return NextResponse.json({ error: 'Erro ao atualizar projeto' }, { status: 500 })
    }
}

export async function DELETE(req: NextRequest) {
    const session = await getSession()
    if (!session || session.role !== 'admin') {
        return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    try {
        const { searchParams } = new URL(req.url)
        const id = searchParams.get('id')
        const permanent = searchParams.get('permanent') === 'true'

        if (!id) {
            return NextResponse.json({ error: 'id é obrigatório' }, { status: 400 })
        }

        if (permanent) {
            await db.query('DELETE FROM projects WHERE id = $1', [id])
            realtimeEmitter.emit(EVENTS.PROJECT_UPDATED, { project_id: id, deleted: true })
            return NextResponse.json({ message: 'Projeto excluído permanentemente' })
        } else {
            await db.query('UPDATE projects SET deleted_at = NOW() WHERE id = $1', [id])
            realtimeEmitter.emit(EVENTS.PROJECT_UPDATED, { project_id: id, trashed: true })
            return NextResponse.json({ message: 'Projeto movido para a lixeira' })
        }
    } catch (error) {
        console.error('[admin/projects DELETE]', error)
        return NextResponse.json({ error: 'Erro ao excluir projeto' }, { status: 500 })
    }
}
