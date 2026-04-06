/**
 * Migration — adds `deleted_at` to `portal_users` for soft delete support.
 * Run once by calling POST /api/admin/migrate
 */
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/session'

export async function POST() {
    const session = await getSession()
    if (!session || session.role !== 'admin') {
        return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const migrations = [
        {
            name: 'add_deleted_at_to_portal_users',
            sql: `ALTER TABLE portal_users ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL`
        },
    ]

    const results: { name: string; status: string; error?: string }[] = []

    for (const migration of migrations) {
        try {
            await db.query(migration.sql)
            results.push({ name: migration.name, status: 'ok' })
        } catch (err: any) {
            results.push({ name: migration.name, status: 'error', error: err.message })
        }
    }

    const hasErrors = results.some(r => r.status === 'error')
    return NextResponse.json(
        { message: hasErrors ? 'Migração concluída com erros' : 'Migração concluída com sucesso', results },
        { status: hasErrors ? 207 : 200 }
    )
}
