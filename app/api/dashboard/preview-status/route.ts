import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/session'

// PUT /api/dashboard/preview-status
// Client calls this to approve or reject the preview link
export async function PUT(req: NextRequest) {
    const session = await getSession()
    if (!session || session.role !== 'client') {
        return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    try {
        const { status, feedback } = await req.json()
        if (!['approved', 'rejected'].includes(status)) {
            return NextResponse.json({ error: 'Status inválido' }, { status: 400 })
        }

        if (status === 'rejected' && (!feedback || feedback.trim().length < 5)) {
            return NextResponse.json({ error: 'Por favor, descreva o que precisa ser ajustado (mínimo 5 caracteres).' }, { status: 400 })
        }

        // Find the client's project
        const result = await db.query(
            `UPDATE projects SET preview_status = $1, preview_feedback = $2, updated_at = now()
             WHERE client_id = $3
             RETURNING id, preview_status`,
            [status, status === 'rejected' ? feedback : null, session.id]
        )

        if (result.rowCount === 0) {
            return NextResponse.json({ error: 'Projeto não encontrado' }, { status: 404 })
        }

        return NextResponse.json({ success: true, preview_status: result.rows[0].preview_status })
    } catch (error) {
        console.error('[dashboard/preview-status PUT]', error)
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }
}
