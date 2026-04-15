import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/session'
import { realtimeEmitter, EVENTS } from '@/lib/realtime'
import { sendTeamFeedbackEmail, sendProjectCompletionEmail } from '@/lib/mail'

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
            SELECT u.id, u.stage, u.title, p.name as project_name, p.id as project_id
            FROM project_updates u
            JOIN projects p ON u.project_id = p.id
            WHERE u.id = $1 AND p.client_id = $2
        `, [update_id, session.id])

        if (updateCheck.rows.length === 0) {
            return NextResponse.json({ error: 'Atualização não encontrada ou acesso negado' }, { status: 404 })
        }

        const updateData = updateCheck.rows[0]

        await db.query(`
            UPDATE project_updates 
            SET status = $1, feedback = $2 
            WHERE id = $3
        `, [status, feedback || null, update_id])

        // Sync with the projects table for the overarching status badge
        const previewStatus = status === 'authorized' ? 'approved' : 'rejected'
        
        await db.query(`
            UPDATE projects 
            SET preview_status = $1, 
                preview_feedback = $2,
                updated_at = now()
            WHERE id = $3
        `, [previewStatus, feedback || null, updateData.project_id])

        // Broadcast real-time status change
        realtimeEmitter.emit(EVENTS.STATUS_CHANGED, { project_id: updateData.project_id, status: previewStatus })

        // ==========================================
        //  TRIGGER DE EMAILS (NOVO MOTOR)
        // ==========================================
        try {
            // 1. Notifica o Time Nordex sobre a decisão (Feedback Admin)
            await sendTeamFeedbackEmail({
                clientName: session.name,
                projectName: updateData.project_name,
                status: previewStatus,
                feedback: feedback
            })

            // 2. Se for Aprovado e for a Etapa Final (Entrega -> 6), dispara Relatório de Conclusão para o Cliente
            // Assumindo etapa 6 como padrão de "Entrega"
            if (status === 'authorized' && updateData.stage === 6) {
                await sendProjectCompletionEmail({
                    to: session.email || '',
                    clientName: session.name,
                    projectName: updateData.project_name
                })
            }
        } catch (emailError) {
            console.error('[Email Trigger Error]', emailError)
            // Não falha a request principal se o email der erro
        }

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('[update-status PUT]', error)
        return NextResponse.json({ error: 'Erro ao atualizar status' }, { status: 500 })
    }
}
