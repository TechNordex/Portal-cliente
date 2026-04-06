import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/session'

export async function GET(req: NextRequest) {
    const session = await getSession()
    if (!session || session.role !== 'admin') {
        return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const projectId = searchParams.get('projectId')

    try {
        if (projectId) {
            // Project Specific Report
            const projectResult = await db.query(`
                SELECT 
                    p.name, 
                    p.created_at, 
                    p.current_stage,
                    COUNT(pu.id) as total_updates,
                    COUNT(pu.id) FILTER (WHERE pu.status = 'denied') as total_rejections,
                    COUNT(pu.id) FILTER (WHERE pu.viewed_at IS NOT NULL) as total_views,
                    AVG(EXTRACT(EPOCH FROM (pu.viewed_at - pu.created_at))) as avg_view_time_seconds
                FROM projects p
                LEFT JOIN project_updates pu ON p.id = pu.project_id
                WHERE p.id = $1
                GROUP BY p.id
            `, [projectId])

            const involvementResult = await db.query(`
                SELECT u.name, u.avatar_url, COUNT(pu.id) as contributions
                FROM project_updates pu
                JOIN portal_users u ON pu.created_by = u.id
                WHERE pu.project_id = $1
                GROUP BY u.id, u.name, u.avatar_url
                ORDER BY contributions DESC
            `, [projectId])

            return NextResponse.json({
                report: projectResult.rows[0],
                teamInvolvement: involvementResult.rows
            })
        } else {
            // General Platform Report
            const generalStats = await db.query(`
                SELECT 
                    COUNT(*) as total_projects,
                    COUNT(*) FILTER (WHERE current_stage = 6) as completed_projects,
                    COUNT(*) FILTER (WHERE deleted_at IS NULL) as active_projects,
                    (SELECT COUNT(*) FROM portal_users WHERE role = 'client') as total_clients,
                    (SELECT COUNT(*) FROM project_updates) as total_updates_posted
                FROM projects
            `)

            const stageDistribution = await db.query(`
                SELECT current_stage as stage, COUNT(*) as count
                FROM projects
                WHERE deleted_at IS NULL
                GROUP BY current_stage
                ORDER BY current_stage
            `)

            return NextResponse.json({
                stats: generalStats.rows[0],
                stageDistribution: stageDistribution.rows
            })
        }
    } catch (error) {
        console.error('[admin/reports GET]', error)
        return NextResponse.json({ error: 'Erro ao gerar relatório' }, { status: 500 })
    }
}
