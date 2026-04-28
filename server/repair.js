const {db, initDb} = require('./db');
async function repair() {
    try {
        console.log('Starting DB repair...');
        // Drop problematic tables to recreate them cleanly
        await db.schema.dropTableIfExists('cron_logs');
        await db.schema.dropTableIfExists('timesheet_entries');
        
        // Re-run init
        await initDb();
        console.log('DB Schema Repaired');
    } catch(e) { console.error('Repair failed:', e); }
    process.exit();
}
repair();
