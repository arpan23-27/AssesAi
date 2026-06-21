// src/repositories/quiz.session.repository.js
const db = require('../config/db');
const { AppError } = require('../utils/errors');

const SESSION_COLUMNS = `
  id,
  user_id,
  technology_id,
  difficulty,
  total_questions,
  correct_count,
  score_percent,
  ability_score,
  current_question_id,
  started_at,
  completed_at
`;

async function createSession({ userId, technologyId, difficulty }) {
  const result = await db.query(
    `INSERT INTO quiz_sessions (user_id, technology_id, difficulty, started_at)
     VALUES ($1, $2, $3, NOW())
     RETURNING ${SESSION_COLUMNS}`,
    [userId, technologyId, difficulty]
  );
  return result.rows[0];
}

async function findById(id) {
  const result = await db.query(`SELECT ${SESSION_COLUMNS} FROM quiz_sessions WHERE id = $1`, [id]);
  return result.rows[0] || null;
}

/**
 * Persist the id of the question currently served to the learner. Answers are
 * later validated against this value so a client cannot answer an arbitrary
 * question of its choosing.
 */
async function setCurrentQuestion(sessionId, questionId, client) {
  await db.query(
    `UPDATE quiz_sessions SET current_question_id = $2 WHERE id = $1`,
    [sessionId, questionId],
    client
  );
}

/**
 * Finalise a session. correctCount / totalQuestions / scorePercent are computed
 * server-side by the service from session_answers — never accepted from the client.
 */
async function completeSession({
  sessionId,
  correctCount,
  totalQuestions,
  scorePercent,
  abilityScore,
}) {
  const result = await db.query(
    `UPDATE quiz_sessions
     SET completed_at = NOW(),
         correct_count = $2,
         total_questions = $3,
         score_percent = $4,
         ability_score = $5,
         current_question_id = NULL
     WHERE id = $1
     RETURNING ${SESSION_COLUMNS}`,
    [sessionId, correctCount, totalQuestions, scorePercent, abilityScore]
  );
  return result.rows[0];
}

async function saveAnswer(sessionId, questionId, isCorrect, client) {
  try {
    const result = await db.query(
      `INSERT INTO session_answers (session_id, question_id, is_correct, answered_at)
       VALUES ($1, $2, $3, NOW())
       RETURNING id, session_id, question_id, is_correct, answered_at`,
      [sessionId, questionId, isCorrect],
      client
    );
    return result.rows[0];
  } catch (err) {
    // UNIQUE(session_id, question_id) violation: a concurrent request already
    // recorded this answer. Surface it as the same domain error the pre-check
    // raises, so the double-submit race resolves cleanly.
    if (err.code === '23505') {
      throw new AppError('Question already answered', 409, 'QUESTION_ALREADY_ANSWERED');
    }
    throw err;
  }
}

async function getAnsweredQuestionIds(sessionId, client) {
  const result = await db.query(
    `SELECT question_id FROM session_answers WHERE session_id = $1`,
    [sessionId],
    client
  );
  return result.rows.map((r) => r.question_id);
}

/** Chronological correct/incorrect sequence for a session, oldest → newest. */
async function getAnswerHistory(sessionId, client) {
  const result = await db.query(
    `SELECT is_correct FROM session_answers
     WHERE session_id = $1 ORDER BY answered_at ASC`,
    [sessionId],
    client
  );
  return result.rows.map((r) => r.is_correct);
}

/** True if this question has already been answered in this session. */
async function hasAnswered(sessionId, questionId) {
  const result = await db.query(
    `SELECT 1 FROM session_answers WHERE session_id = $1 AND question_id = $2 LIMIT 1`,
    [sessionId, questionId]
  );
  return result.rows.length > 0;
}

/**
 * Authoritative score for a session, derived entirely from recorded answers.
 * @returns {Promise<{total:number, correct:number}>}
 */
async function getSessionStats(sessionId) {
  const result = await db.query(
    `SELECT COUNT(*)::int AS total,
            COUNT(*) FILTER (WHERE is_correct)::int AS correct
     FROM session_answers
     WHERE session_id = $1`,
    [sessionId]
  );
  const row = result.rows[0] || { total: 0, correct: 0 };
  return { total: row.total, correct: row.correct };
}

/**
 * Average current mastery across the concepts actually exercised in a session.
 * Relies on a JOIN between session_answers and questions — only possible now
 * that questions live in PostgreSQL alongside the rest of the schema.
 * @returns {Promise<number|null>}
 */
async function getSessionAbilityScore(sessionId, userId) {
  const result = await db.query(
    `SELECT AVG(ucm.ability_score)::float8 AS avg_ability
     FROM session_answers sa
     JOIN questions q ON q.id::text = sa.question_id
     JOIN user_concept_mastery ucm
       ON ucm.user_id = $2
      AND ucm.technology_id = (SELECT technology_id FROM quiz_sessions WHERE id = $1)
      AND ucm.concept = q.concept
     WHERE sa.session_id = $1`,
    [sessionId, userId]
  );
  return result.rows[0]?.avg_ability ?? null;
}

/**
 * True if the learner has previously answered this question incorrectly in any
 * of their own sessions. Gates the AI explanation endpoint so it can only be
 * called for genuinely-attempted wrong answers (not used to peek at answers).
 */
async function userAnsweredIncorrectly(userId, questionId) {
  const result = await db.query(
    `SELECT 1
     FROM session_answers sa
     JOIN quiz_sessions s ON s.id = sa.session_id
     WHERE s.user_id = $1
       AND sa.question_id = $2
       AND sa.is_correct = false
     LIMIT 1`,
    [userId, questionId]
  );
  return result.rows.length > 0;
}

module.exports = {
  createSession,
  findById,
  setCurrentQuestion,
  completeSession,
  saveAnswer,
  getAnsweredQuestionIds,
  getAnswerHistory,
  hasAnswered,
  getSessionStats,
  getSessionAbilityScore,
  userAnsweredIncorrectly,
};
