const crypto = require('crypto');
const request = require('supertest');
const app = require('../app');
const { pool } = require('../config/db');
const redis = require('../config/redis');

// These tests are hermetic: they create their own technology + question pool
// with unique names, so they don't depend on the full seed having run (CI runs
// migrations but not seeds). All grading is verified against the stored
// correct_index, never against anything the client sent.
describe('Quiz routes', () => {
  const suffix = `${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
  const techName = `testtech_${suffix}`;
  const concept = 'grading';
  const email = `quiz_${suffix}@test.com`;
  const password = 'StrongPass123!';

  let technologyId;
  let accessToken;

  // Insert one question and return its row (id + correct_index).
  async function insertQuestion({ text, options, correctIndex, difficultyScore }) {
    const textHash = crypto.createHash('sha256').update(text).digest('hex');
    const res = await pool.query(
      `INSERT INTO questions
         (technology, concept, difficulty, difficulty_score, text,
          options, correct_index, source, status, metadata, text_hash)
       VALUES ($1,$2,'basic',$3,$4,$5::jsonb,$6,'manual','active','{}'::jsonb,$7)
       RETURNING id, correct_index`,
      [techName, concept, difficultyScore, text, JSON.stringify(options), correctIndex, textHash]
    );
    return res.rows[0];
  }

  // Look up the stored correct_index for a served question (the API strips it).
  async function correctIndexOf(questionId) {
    const res = await pool.query('SELECT correct_index FROM questions WHERE id = $1', [questionId]);
    return res.rows[0].correct_index;
  }

  beforeAll(async () => {
    const tech = await pool.query(`INSERT INTO technologies (name) VALUES ($1) RETURNING id`, [
      techName,
    ]);
    technologyId = tech.rows[0].id;

    await insertQuestion({
      text: `Q1 ${suffix}: which is true?`,
      options: ['a', 'b', 'c', 'd'],
      correctIndex: 0,
      difficultyScore: 0.2,
    });
    await insertQuestion({
      text: `Q2 ${suffix}: which is true?`,
      options: ['a', 'b', 'c', 'd'],
      correctIndex: 1,
      difficultyScore: 0.25,
    });
    await insertQuestion({
      text: `Q3 ${suffix}: which is true?`,
      options: ['a', 'b', 'c', 'd'],
      correctIndex: 2,
      difficultyScore: 0.3,
    });

    await request(app).post('/api/auth/register').send({ email, password });
    const login = await request(app).post('/api/auth/login').send({ email, password });
    accessToken = login.body.data.accessToken;
  });

  function startSession() {
    return request(app)
      .post('/api/quiz/sessions')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ technologyId, difficulty: 'basic' });
  }

  it('start → serves a question with the correct answer stripped', async () => {
    const res = await startSession();
    expect(res.status).toBe(201);
    expect(res.body.session).toHaveProperty('id');
    expect(res.body.firstQuestion).toHaveProperty('id');
    expect(res.body.firstQuestion).not.toHaveProperty('correct_index');
  });

  it('grades a correct answer server-side (isCorrect true)', async () => {
    const start = await startSession();
    const q = start.body.firstQuestion;
    const answerIndex = await correctIndexOf(q.id);

    const res = await request(app)
      .post(`/api/quiz/sessions/${start.body.session.id}/answer`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ questionId: q.id, answerIndex });

    expect(res.status).toBe(200);
    expect(res.body.isCorrect).toBe(true);
    expect(res.body).toHaveProperty('updatedAbilityScore');
    expect(res.body).toHaveProperty('difficulty');
  });

  it('grades a wrong answer server-side (isCorrect false)', async () => {
    const start = await startSession();
    const q = start.body.firstQuestion;
    const correct = await correctIndexOf(q.id);
    const wrong = (correct + 1) % 4;

    const res = await request(app)
      .post(`/api/quiz/sessions/${start.body.session.id}/answer`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ questionId: q.id, answerIndex: wrong });

    expect(res.status).toBe(200);
    expect(res.body.isCorrect).toBe(false);
  });

  it('rejects an answer whose questionId is not the served one (QUESTION_MISMATCH)', async () => {
    const start = await startSession();
    const otherQuestionId = crypto.randomUUID(); // valid uuid, but not the served one

    const res = await request(app)
      .post(`/api/quiz/sessions/${start.body.session.id}/answer`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ questionId: otherQuestionId, answerIndex: 0 });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('QUESTION_MISMATCH');
  });

  it('recomputes the score from recorded answers on complete (one right, one wrong → 50%)', async () => {
    const start = await startSession();
    const sessionId = start.body.session.id;

    // Answer the first question correctly.
    const q1 = start.body.firstQuestion;
    const a1 = await correctIndexOf(q1.id);
    const r1 = await request(app)
      .post(`/api/quiz/sessions/${sessionId}/answer`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ questionId: q1.id, answerIndex: a1 });
    expect(r1.body.isCorrect).toBe(true);

    // Answer the next served question incorrectly.
    const q2 = r1.body.nextQuestion;
    expect(q2).not.toBeNull();
    const correct2 = await correctIndexOf(q2.id);
    await request(app)
      .post(`/api/quiz/sessions/${sessionId}/answer`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ questionId: q2.id, answerIndex: (correct2 + 1) % 4 });

    // Complete: the client never sends a score; the server derives it.
    const done = await request(app)
      .post(`/api/quiz/sessions/${sessionId}/complete`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send();

    expect(done.status).toBe(200);
    expect(done.body.total_questions).toBe(2);
    expect(done.body.correct_count).toBe(1);
    expect(Number(done.body.score_percent)).toBe(50);
  });
});

// Teardown: remove the rows this suite created, then close connections.
afterAll(async () => {
  await pool.query(`DELETE FROM questions WHERE technology LIKE 'testtech_%'`).catch(() => {});
  await pool.query(`DELETE FROM technologies WHERE name LIKE 'testtech_%'`).catch(() => {});
  await pool.end();
  await redis.quit();
});
