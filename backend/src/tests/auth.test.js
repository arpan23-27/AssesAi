const request = require('supertest');
const app = require('../app');
const { pool } = require('../config/db');
const redis = require('../config/redis');

describe('Auth routes', () => {
  const testEmail = `test_${Date.now()}@test.com`;
  const testPassword = 'StrongPass123!';

  describe('Register', () => {
    it('Valid input → 201, returns id and email, no password_hash', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: testEmail, password: testPassword });

      expect(res.status).toBe(201);
      expect(res.body.data).toHaveProperty('id');
      expect(res.body.data).toHaveProperty('email', testEmail);
      expect(res.body.data).not.toHaveProperty('password_hash');
    });

    it('Duplicate email → 409, code DUPLICATE_EMAIL', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: testEmail, password: testPassword });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('DUPLICATE_EMAIL');
    });

    it('Missing password → 400, code VALIDATION_ERROR', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: `missing_${Date.now()}@test.com` });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('Short password → 400, code VALIDATION_ERROR', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: `short_${Date.now()}@test.com`, password: '123' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('Login', () => {
    it('Valid credentials → 200, returns accessToken', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: testEmail, password: testPassword });

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('accessToken');
    });

    it('Wrong password → 401, code INVALID_CREDENTIALS', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: testEmail, password: 'WrongPass!' });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
    });

    it('Non-existent email → 401, code INVALID_CREDENTIALS', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: `nouser_${Date.now()}@test.com`, password: testPassword });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
    });
  });

  // Full token lifecycle: login → refresh (rotation) → logout → refresh fails.
  describe('Token lifecycle', () => {
    const agent = request.agent(app); // persists the httpOnly refresh cookie
    let accessToken;

    it('login issues an access token and a refresh cookie', async () => {
      const res = await agent
        .post('/api/auth/login')
        .send({ email: testEmail, password: testPassword });

      expect(res.status).toBe(200);
      accessToken = res.body.data.accessToken;
      const setCookie = res.headers['set-cookie'] || [];
      expect(setCookie.some((c) => c.startsWith('refreshToken='))).toBe(true);
    });

    it('refresh rotates the token and returns a new access token', async () => {
      const res = await agent.post('/api/auth/refresh').send();
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('accessToken');
      accessToken = res.body.data.accessToken;
    });

    it('logout succeeds with the access token', async () => {
      const res = await agent
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .send();
      expect(res.status).toBe(204);
    });

    it('refresh after logout is rejected', async () => {
      const res = await agent.post('/api/auth/refresh').send();
      expect(res.status).toBe(401);
    });
  });
});

// Teardown: close DB and Redis connections.
afterAll(async () => {
  await pool.end();
  await redis.quit();
});
