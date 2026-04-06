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
            const result = await db.query(`
                SELECT u.id, u.name, u.email, u.avatar_url, u.position
                FROM portal_users u
                JOIN project_assignments pa ON u.id = pa.user_id
                WHERE pa.project_id = $1
            `, [projectId])
            return NextResponse.json({ assignments: result.rows })
        } else {
            const result = await db.query(`SELECT * FROM project_assignments`)
            return NextResponse.json({ assignments: result.rows })
        }
    } catch (error) {
        console.error('[admin/assignments GET]', error)
        return NextResponse.json({ error: 'Erro ao buscar atribuições' }, { status: 500 })
    }
}

export async function POST(req: NextRequest) {
    const session = await getSession()
    if (!session || session.role !== 'admin') {
        return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    try {
        const { project_id, user_id } = await req.json()
        if (!project_id || !user_id) {
            return NextResponse.json({ error: 'project_id e user_id são obrigatórios' }, { status: 400 })
        }

        const userCheck = await db.query('SELECT role FROM portal_users WHERE id = $1', [user_id])
        if (userCheck.rows.length === 0 || userCheck.rows[0].role !== 'admin') {
            return NextResponse.json({ error: 'Apenas administradores podem ser atribuídos a projetos' }, { status: 400 })
        }

        await db.query(
            `INSERT INTO project_assignments (project_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
            [project_id, user_id]
        )
        return NextResponse.json({ success: true }, { status: 201 })
    } catch (error) {
        console.error('[admin/assignments POST]', error)
        return NextResponse.json({ error: 'Erro ao atribuir usuário' }, { status: 500 })
    }
}

export async function DELETE(req: NextRequest) {
    const session = await getSession()
    if (!session || session.role !== 'admin') {
        return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    try {
        const { searchParams } = new URL(req.url)
        const projectId = searchParams.get('projectId')
        const userId = searchParams.get('userId')

        if (!projectId || !userId) {
            return NextResponse.json({ error: 'projectId e userId são obrigatórios' }, { status: 400 })
        }

        await db.query(
            `DELETE FROM project_assignments WHERE project_id = $1 AND user_id = $2`,
            [projectId, userId]
        )
        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('[admin/assignments DELETE]', error)
        return NextResponse.json({ error: 'Erro ao remover atribuição' }, { status: 500 })
    }
}
