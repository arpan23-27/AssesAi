require('dotenv').config();
// src/seeds/admin.seed.js
// Seeds a single admin user so the admin-only POST /api/ai/generate route is
// reachable. Driven by env (ADMIN_EMAIL / ADMIN_PASSWORD). Idempotent: if the
// user already exists its role is ensured to be 'admin' without touching the
// password. If the env vars are unset the seed is skipped (not an error), so
// `npm run seed` still succeeds when no admin is configured.
const argon2 = require('argon2');
const db = require('../config/db');

async function seedAdmin() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    console.log('Admin seed skipped: set ADMIN_EMAIL and ADMIN_PASSWORD to create one.');
    await db.pool.end().catch(() => {});
    process.exit(0);
  }

  try {
    const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
    const result = await db.query(
      `INSERT INTO users (email, password_hash, role)
       VALUES ($1, $2, 'admin')
       ON CONFLICT (email) DO UPDATE SET role = 'admin'
       RETURNING id, email, role`,
      [email, passwordHash]
    );
    const user = result.rows[0];
    console.log(`Admin user ready: ${user.email} (role=${user.role})`);
    await db.pool.end();
    process.exit(0);
  } catch (err) {
    console.error('Error seeding admin user:', err);
    await db.pool.end().catch(() => {});
    process.exit(1);
  }
}

seedAdmin();
