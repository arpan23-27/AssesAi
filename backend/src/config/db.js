// src/config/db.js

const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

//Centralized query helper. Pass an optional pg client (from withTransaction)
//to run the statement inside an open transaction; otherwise it uses the pool.
async function query(text, params, client) {
  const executor = client || pool;
  try {
    return await executor.query(text, params);
  } catch (err) {
    //Log the error but don't crash silently
    console.error('Database query error:', err);
    throw err;
  }
}

//Run `fn` inside a single transaction. Commits on success, rolls back on any
//error, and always releases the client. `fn` receives the transaction client,
//which must be threaded into the repository calls that should be atomic.
async function withTransaction(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

//Handle pool-level errors (e.g., lost connection)
pool.on('error', (err) => {
  console.error('Unexpected database error:', err);
  //Don't exit process - keep running, but log for  investigation
});

module.exports = { query, pool, withTransaction };
