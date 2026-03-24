/**
 * Run migrate.sql against Supabase
 * Usage: node tmp/run_migrate.js
 */
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function main() {
  const sqlPath = path.join(__dirname, '..', 'apps', 'backend', 'scripts', 'migrate.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');

  console.log('Running migrate.sql against Supabase...');
  try {
    await pool.query(sql);
    console.log('✅ Migration complete - all tables, indexes and triggers created.');
  } catch (err) {
    // Print nicely so partial duplicates are obvious
    console.error('Migration error:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
