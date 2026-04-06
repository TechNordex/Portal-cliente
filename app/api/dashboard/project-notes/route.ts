import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/session'
import { realtimeEmitter, EVENTS } from '@/lib/realtime'

export async function PUT(req: Request) {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    try {
        const { update_id, note } = await req.json()

        if (!update_id) {
            return NextResponse.json({ error: 'ID da atualização obrigatório' }, { status: 400 })
        }

        // Must verify if this update belongs to the client's project to prevent unauthorized edits across projects
        const checkOwnership = await db.query(
            `SELECT pu.id FROM project_updates pu 
             JOIN projects p ON pu.project_id = p.id 
             WHERE pu.id = $1 AND p.client_id = $2`,
            [update_id, session.id]
        )

        if (checkOwnership.rows.length === 0) {
            return NextResponse.json({ error: 'Atualização não encontrada ou não autorizada' }, { status: 403 })
        }

        await db.query(
            'UPDATE project_updates SET client_note = $1 WHERE id = $2',
            [note || null, update_id]
        )

        // Broadcast note addition/update
        realtimeEmitter.emit(EVENTS.NOTE_ADDED, { update_id, note })

        return NextResponse.json({ success: true, client_note: note || null })
    } catch (error) {
        console.error('[dashboard/project-notes PUT]', error)
        return NextResponse.json({ error: 'Erro ao atualizar anotação da etapa' }, { status: 500 })
    }
}
