import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { createJWT, COOKIE_NAME, COOKIE_OPTIONS } from '@/lib/jwt'
import type { SessionUser } from '@/lib/types'

export async function POST(req: NextRequest) {
    try {
        const { email, password } = await req.json()

        if (!email || !password) {
            return NextResponse.json({ error: 'Email e senha são obrigatórios' }, { status: 400 })
        }

        const result = await db.query(
            `SELECT id, email, name, role, deleted_at FROM portal_users
       WHERE email = $1 AND password_hash = crypt($2, password_hash)`,
            [email.toLowerCase().trim(), password]
        )

        if (result.rows.length === 0) {
            return NextResponse.json({ error: 'Credenciais inválidas' }, { status: 401 })
        }

        const user = result.rows[0]

        if (user.deleted_at) {
            return NextResponse.json({ 
                error: 'Sua conta está na lixeira e será excluída permanentemente em breve. Entre em contato com o suporte se desejar restaurá-la.' 
            }, { status: 403 })
        }
        const token = await createJWT(user)

        const response = NextResponse.json({ user, success: true })
        response.cookies.set(COOKIE_NAME, token, COOKIE_OPTIONS)
        return response
    } catch (error) {
        console.error('[login]', error)
        return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
    }
}
