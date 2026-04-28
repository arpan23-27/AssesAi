// backend/repositories/user.repository.js
const { query } = require('../config/db');
const { DuplicateEmailError } = require('../utils/errors');

// Find a user by email
async function findByEmail(email) {
  const result = await query(
    `SELECT id, email, password_hash, role, created_at
     FROM users
     WHERE email = $1`,
    [email]
  );
  return result.rows[0] || null;
}

// Create a new user
async function createUser({ email, password_hash }) {
  try {
    const result = await query(
      `INSERT INTO users (email, password_hash)
       VALUES ($1, $2)
       RETURNING id, email, password_hash, role, created_at`,
      [email, password_hash]
    );
    return result.rows[0];
  } catch (err) {
    // Translate unique constraint violation into domain error
    if (err.code === '23505') {
      throw new DuplicateEmailError([
        { field: 'email', issue: 'Already registered' }
      ]);
    }
    throw err; // rethrow other DB errors
  }
}

// Find a user by ID
async function findById(userId) {
  const result = await query(
    `SELECT id, email, role, password_hash, created_at
     FROM users
     WHERE id = $1`,
    [userId]
  );
  return result.rows[0] || null;
}

module.exports = {
  findByEmail,
  createUser,
  findById, 
};