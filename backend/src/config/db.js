// src/config/db.js

const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

//Centralized querry helper
async function query(text, params) {
  try {
    return await pool.query(text, params);
  } catch (err) {
    //Log the error but don't crash silently
    console.error('Database query error:', err);
    throw err;
  }
}

//Handle pool-level errors (e.g., lost connection)
pool.on('error', (err) => {
  console.error('Unexpected database error:', err);
  //Don't exit process - keep running, but log for  investigation
});

module.exports = { query, pool };
