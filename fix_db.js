const { db } = require('./lib/db');

async function run() {
    try {
        console.log('Altering table project_updates...');
        await db.query('ALTER TABLE project_updates ALTER COLUMN hours_spent TYPE numeric(10,2)');
        console.log('Success!');
    } catch (e) {
        console.error(e);
    }
    process.exit();
}
run();
