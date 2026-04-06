import { cookies } from 'next/headers'
import { verifyJWT, COOKIE_NAME } from './jwt'
import type { SessionUser } from './types'

export async function getSession(): Promise<SessionUser | null> {
    const cookieStore = await cookies()
    const token = cookieStore.get(COOKIE_NAME)?.value
    if (!token) return null
    return verifyJWT(token)
}
