import { Pool } from 'pg'

declare global {
    // eslint-disable-next-line no-var
    var pgPool: Pool | undefined
}

export const db =
    globalThis.pgPool ??
    new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false },
        max: 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000,
    })

if (process.env.NODE_ENV !== 'production') {
    globalThis.pgPool = db
}
