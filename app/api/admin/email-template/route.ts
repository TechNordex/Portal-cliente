import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/session'
import { DEFAULT_TEMPLATE } from '@/lib/email'

// Ensure the email_templates table exists
async function ensureTable() {
    await db.query(`
        CREATE TABLE IF NOT EXISTS email_templates (
            key TEXT PRIMARY KEY,
            html TEXT NOT NULL,
            subject TEXT,
            updated_at TIMESTAMPTZ DEFAULT now(),
            updated_by TEXT
        )
    `)
}

export async function GET() {
    const session = await getSession()
    if (!session || session.role !== 'admin') {
        return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }
    try {
        await ensureTable()
        const res = await db.query('SELECT * FROM email_templates WHERE key = $1', ['update_notification'])
        
        let template = res.rows[0] || null
        if (!template) {
            template = {
                key: 'update_notification',
                html: DEFAULT_TEMPLATE,
                subject: '[{{projectName}}] Nova atualização: {{updateTitle}}'
            }
        }
        
        return NextResponse.json({ template })
    } catch (error) {
        console.error('[email-template GET]', error)
        return NextResponse.json({ error: 'Erro ao buscar template' }, { status: 500 })
    }
}

export async function PUT(req: NextRequest) {
    const session = await getSession()
    if (!session || session.role !== 'admin') {
        return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }
    try {
        await ensureTable()
        const { html, subject } = await req.json()
        if (!html) return NextResponse.json({ error: 'html é obrigatório' }, { status: 400 })

        await db.query(`
            INSERT INTO email_templates (key, html, subject, updated_at, updated_by)
            VALUES ('update_notification', $1, $2, now(), $3)
            ON CONFLICT (key) DO UPDATE
            SET html = EXCLUDED.html, subject = EXCLUDED.subject, updated_at = now(), updated_by = EXCLUDED.updated_by
        `, [html, subject || null, session.id])

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('[email-template PUT]', error)
        return NextResponse.json({ error: 'Erro ao salvar template' }, { status: 500 })
    }
}

export async function DELETE() {
    const session = await getSession()
    if (!session || session.role !== 'admin') {
        return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }
    try {
        await db.query('DELETE FROM email_templates WHERE key = $1', ['update_notification'])
        return NextResponse.json({ success: true, message: 'Template restaurado para o padrão' })
    } catch (error) {
        return NextResponse.json({ error: 'Erro ao redefinir template' }, { status: 500 })
    }
}
