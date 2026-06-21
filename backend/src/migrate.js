// src/migrate.js
// Minimal, idempotent SQL migration runner. Applies every *.sql file in
// src/migrations in filename order exactly once, tracking applied files in a
// schema_migrations table. No external migration tooling or psql required.
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { pool } = require('./config/db');

const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

async function waitForDb(retries = 30, delayMs = 1000) {
  for (let i = 0; i < retries; i++) {
    try {
      await pool.query('SELECT 1');
      return;
    } catch (err) {
      if (i === retries - 1) throw err;
      console.log(`Waiting for PostgreSQL... (${i + 1}/${retries})`);
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
}

async function run() {
  await waitForDb();

  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename   TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  const applied = new Set(
    (await pool.query('SELECT filename FROM schema_migrations')).rows.map((r) => r.filename)
  );

  for (const file of files) {
    if (applied.has(file)) {
      console.log(`Skipping (already applied): ${file}`);
      continue;
    }
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [file]);
      await client.query('COMMIT');
      console.log(`Applied: ${file}`);
    } catch (err) {
      await client.query('ROLLBACK');
      console.error(`Failed: ${file}`);
      throw err;
    } finally {
      client.release();
    }
  }

  console.log('Migrations complete.');
}

run()
  .then(() => pool.end())
  .then(() => process.exit(0))
  .catch(async (err) => {
    console.error('Migration error:', err);
    await pool.end().catch(() => {});
    process.exit(1);
  });
