//src/repositories/token.repository.js
const { query } = require('../config/db');

//Store a new refresh token
async function storeToken({ userId, tokenHash, expiresAt }) {
  await query(
    `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
        VALUES ($1, $2, $3)`,
    [userId, tokenHash, expiresAt]
  );
}

// Find a refresh token by hash — including revoked, for reuse detection
async function findByHash(tokenHash) {
  const result = await query(
    `SELECT id, user_id, token_hash, expires_at, created_at, revoked_at
    FROM  refresh_tokens
    WHERE token_hash = $1`,
    [tokenHash]
  );

  return result.rows[0] || null;
}

// Revoke a single refresh token (soft delete)
async function revokeToken(tokenHash) {
  await query(
    `UPDATE refresh_tokens
     SET revoked_at = NOW()
     WHERE token_hash = $1 AND revoked_at IS NULL`,
    [tokenHash]
  );
}

// Revoke all refresh tokens for a user (soft delete)
async function revokeAllForUser(userId) {
  await query(
    `UPDATE    refresh_tokens
        SET revoked_at = NOW()
        WHERE user_id = $1 AND revoked_at IS NULL`,
    [userId]
  );
}

module.exports = {
  storeToken,
  findByHash,
  revokeToken,
  revokeAllForUser,
};
