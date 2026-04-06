import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/session'
import { sendUpdateNotification } from '@/lib/email'
import { realtimeEmitter, EVENTS } from '@/lib/realtime'

// GET - list updates for a given project (for admin revision dropdown)
export async function GET(req: NextRequest) {
    const session = await getSession()
    if (!session || session.role !== 'admin') {
        return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const project_id = searchParams.get('project_id')
    if (!project_id) {
        return NextResponse.json({ error: 'project_id é obrigatório' }, { status: 400 })
    }

    try {
        const result = await db.query(
            'SELECT id, stage, title, created_at, status, revision_of FROM project_updates WHERE project_id = $1 ORDER BY created_at DESC',
            [project_id]
        )
        return NextResponse.json({ updates: result.rows })
    } catch (error: any) {
        console.error('[admin/updates GET]', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

export async function POST(req: NextRequest) {
    const session = await getSession()
    if (!session || session.role !== 'admin') {
        return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    try {
        const { project_id, stage, title, message, preview_url, minutes_spent, hours_spent, revision_of } = await req.json()
        if (!project_id || !stage || !title) {
            return NextResponse.json({ error: 'project_id, stage e title são obrigatórios' }, { status: 400 })
        }

        const timeVal = minutes_spent != null 
            ? Math.round(Number(minutes_spent)) 
            : (hours_spent != null ? Math.round(Number(hours_spent)) : null)

        // Insert the update (with optional revision_of link)
        const insertResult = await db.query(
            `INSERT INTO project_updates
             (project_id, stage, title, message, preview_url, hours_spent, created_by, status, revision_of)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
             RETURNING id`,
            [
                project_id,
                stage,
                title,
                message || null,
                preview_url || null,
                timeVal,
                session.id,
                'pending',
                revision_of || null,
            ]
        )

        // Update the project stage / preview URL
        const hasNewUrl = preview_url && preview_url.trim() !== ''
        const clearUrl = preview_url === ''

        let updateQuery = `UPDATE projects SET current_stage = $2, updated_at = now()`
        const queryParams: (string | number)[] = [project_id, stage]

        if (hasNewUrl) {
            updateQuery += `, preview_url = $${queryParams.length + 1}, preview_status = 'pending', preview_feedback = NULL`
            queryParams.push(preview_url.trim())
        } else if (clearUrl) {
            updateQuery += `, preview_url = NULL, preview_status = 'none', preview_feedback = NULL`
        }

        updateQuery += ` WHERE id = $1`
        await db.query(updateQuery, queryParams)

        // ── Send email notification ───────────────────────────────────────
        try {
            const projRes = await db.query(`
                SELECT 
                    p.name AS project_name,
                    u.name AS client_name,
                    u.email AS client_email,
                    author.name AS author_name
                FROM projects p
                LEFT JOIN portal_users u ON u.id = p.client_id
                LEFT JOIN portal_users author ON author.id = $2
                WHERE p.id = $1
            `, [project_id, session.id])

            if (projRes.rows.length > 0) {
                const row = projRes.rows[0]
                if (row.client_email) {
                    console.log(`[updates POST] Attempting to send email to ${row.client_email} for project ${project_id}`)
                    const emailResult = await sendUpdateNotification({
                        clientName: row.client_name || 'Cliente',
                        clientEmail: row.client_email,
                        projectName: row.project_name,
                        updateTitle: title,
                        updateMessage: message || undefined,
                        updateStage: stage,
                        authorName: row.author_name || 'Equipe Nordex Tech',
                        isRevision: !!revision_of,
                    })
                    if (emailResult.success) {
                        console.log(`[updates POST] Email SUCCESS for ${row.client_email} | ID: ${emailResult.id}`)
                    } else {
                        console.error(`[updates POST] Email FAILED for ${row.client_email}:`, JSON.stringify(emailResult.error, null, 2))
                    }
                } else {
                    console.warn(`[updates POST] SKIP EMAIL: No client email found for project ${project_id} (Client: ${row.client_name})`)
                }
            } else {
                console.warn(`[updates POST] SKIP EMAIL: Project ${project_id} not found or no client associated`)
            }
        } catch (emailErr) {
            console.error('[updates POST] Email error (continuing):', emailErr)
        }
        // ──────────────────────────────────────────────────────────────────

        // Broadcast real-time update
        realtimeEmitter.emit(EVENTS.PROJECT_UPDATED, { project_id, stage, title })

        return NextResponse.json({ success: true, id: insertResult.rows[0].id }, { status: 201 })
    } catch (error: any) {
        console.error('[admin/updates POST]', error)
        return NextResponse.json({ error: error.message || 'Erro ao postar atualização' }, { status: 500 })
    }
}

// PUT - edit an existing update
export async function PUT(req: NextRequest) {
    const session = await getSession()
    if (!session || session.role !== 'admin') {
        return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    try {
        const body = await req.json()
        console.log('[admin/updates PUT] Iniciando edição:', body)
        
        const { id, title, message, preview_url, minutes_spent, hours_spent } = body
        if (!id || !title) {
            console.error('[admin/updates PUT] Faltam campos obrigatórios:', { id, title })
            return NextResponse.json({ error: 'id e title são obrigatórios' }, { status: 400 })
        }

        const timeVal = minutes_spent != null 
            ? Math.round(Number(minutes_spent)) 
            : (hours_spent != null ? Math.round(Number(hours_spent)) : null)

        console.log('[admin/updates PUT] Executando query para ID:', id)
        await db.query(
            `UPDATE project_updates 
             SET title = $1, message = $2, preview_url = $3, hours_spent = $4 
             WHERE id::text = $5::text`,
            [title, message || null, preview_url || null, timeVal, String(id)]
        )

        console.log('[admin/updates PUT] Sucesso ao editar ID:', id)
        return NextResponse.json({ success: true })
    } catch (error: any) {
        console.error('[admin/updates PUT] Erro fatal:', error)
        return NextResponse.json({ error: error.message || 'Erro ao editar atualização' }, { status: 500 })
    }
}
