import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/session'

export async function GET() {
    const session = await getSession()
    if (!session || session.role !== 'admin') {
        return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    try {
        // Get workload distribution (projects per member)
        const workloadResult = await db.query(`
            SELECT 
                u.id, 
                u.name, 
                u.avatar_url, 
                u.position,
                COUNT(pa.project_id) as project_count
            FROM portal_users u
            LEFT JOIN project_assignments pa ON u.id = pa.user_id
            WHERE u.role = 'admin'
            GROUP BY u.id, u.name, u.avatar_url, u.position
            ORDER BY project_count DESC
        `)

        // Get recent individual contributions
        const contributionsResult = await db.query(`
            SELECT 
                u.name,
                u.avatar_url,
                pu.title,
                pu.created_at,
                p.name as project_name
            FROM project_updates pu
            JOIN portal_users u ON pu.created_by = u.id
            JOIN projects p ON pu.project_id = p.id
            ORDER BY pu.created_at DESC
            LIMIT 10
        `)

        return NextResponse.json({
            workload: workloadResult.rows,
            recentContributions: contributionsResult.rows
        })
    } catch (error) {
        console.error('[admin/team GET]', error)
        return NextResponse.json({ error: 'Erro ao buscar dados da equipe' }, { status: 500 })
    }
}
