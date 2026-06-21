const request = require('supertest');
const app = require('../app');
const { pool } = require('../config/db');
const redis = require('../config/redis');

// Pull the "refreshToken=<value>" pair out of a Set-Cookie header so it can be
// replayed verbatim on a later request.
function refreshCookie(setCookieHeader) {
  const arr = setCookieHeader || [];
  const entry = arr.find((c) => c.startsWith('refreshToken='));
  return entry ? entry.split(';')[0] : null;
}

describe('Refresh-token reuse detection', () => {
  const email = `reuse_${Date.now()}@test.com`;
  const password = 'StrongPass123!';

  beforeAll(async () => {
    await request(app).post('/api/auth/register').send({ email, password });
  });

  it('reusing a rotated refresh token revokes the whole token family', async () => {
    // 1. Login issues the first refresh token (R1).
    const login = await request(app).post('/api/auth/login').send({ email, password });
    expect(login.status).toBe(200);
    const r1 = refreshCookie(login.headers['set-cookie']);
    expect(r1).not.toBeNull();

    // 2. A normal refresh rotates R1 → R2 and returns a new access token.
    const rotate = await request(app).post('/api/auth/refresh').set('Cookie', r1).send();
    expect(rotate.status).toBe(200);
    expect(rotate.body.data).toHaveProperty('accessToken');
    const r2 = refreshCookie(rotate.headers['set-cookie']);
    expect(r2).not.toBeNull();

    // 3. Replaying the already-rotated R1 is detected as reuse and rejected.
    const reuse = await request(app).post('/api/auth/refresh').set('Cookie', r1).send();
    expect(reuse.status).toBe(401);

    // 4. Reuse detection revokes the entire family, so even the legitimately
    //    issued R2 is now dead — a stolen token cannot outlive the breach.
    const afterRevoke = await request(app).post('/api/auth/refresh').set('Cookie', r2).send();
    expect(afterRevoke.status).toBe(401);
  });
});

afterAll(async () => {
  await pool.end();
  await redis.quit();
});
