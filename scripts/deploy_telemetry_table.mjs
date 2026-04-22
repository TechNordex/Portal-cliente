import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function main() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS project_telemetry (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
                user_id UUID REFERENCES portal_users(id) ON DELETE CASCADE,
                log_type VARCHAR(20) DEFAULT 'info',
                message TEXT NOT NULL,
                action_label TEXT,
                action_url TEXT,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
        `);
        console.log("Telemetry table created successfully.");
    } catch (err) {
        console.error("Error creating telemetry table:", err);
    } finally {
        await pool.end();
    }
}

main();
