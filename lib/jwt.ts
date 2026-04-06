import { SignJWT, jwtVerify } from 'jose'
import type { SessionUser } from './types'

const secret = new TextEncoder().encode(process.env.JWT_SECRET!)

export const COOKIE_NAME = 'nordex_portal_session'

export const COOKIE_OPTIONS = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 7 days
}

export async function createJWT(user: SessionUser): Promise<string> {
    return new SignJWT({ id: user.id, email: user.email, name: user.name, role: user.role })
        .setProtectedHeader({ alg: 'HS256' })
        .setExpirationTime('7d')
        .setIssuedAt()
        .sign(secret)
}

export async function verifyJWT(token: string): Promise<SessionUser | null> {
    try {
        const { payload } = await jwtVerify(token, secret)
        return payload as unknown as SessionUser
    } catch {
        return null
    }
}
