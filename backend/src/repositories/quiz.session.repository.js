// src/repositories/quizSession.repository.js
const db = require('../config/db');

/**
 * Create a new quiz session.
 */
async function createSession({ userId, technologyId, difficulty }) {
  const result = await db.query(
    `
    INSERT INTO quiz_sessions (
      user_id,
      technology_id,
      difficulty,
      started_at
    )
    VALUES ($1, $2, $3, NOW())
    RETURNING 
      id,
      user_id,
      technology_id,
      difficulty,
      total_questions,
      correct_count,
      score_percent,
      ability_score,
      started_at,
      completed_at
    `,
    [userId, technologyId, difficulty]
  );
  return result.rows[0];
}

/**
 * Find a quiz session by ID.
 */
async function findById(id) {
  const result = await db.query(
    `
    SELECT 
      id,
      user_id,
      technology_id,
      difficulty,
      total_questions,
      correct_count,
      score_percent,
      ability_score,
      started_at,
      completed_at
    FROM quiz_sessions
    WHERE id = $1
    `,
    [id]
  );
  return result.rows[0] || null;
}

/**
 * Complete a session: set final scores and return updated row.
 */
async function completeSession({ sessionId, correctCount, totalQuestions, scorePercent, abilityScore }) {
  const result = await db.query(
    `
    UPDATE quiz_sessions
    SET 
      completed_at = NOW(),
      correct_count = $2,
      total_questions = $3,
      score_percent = $4,
      ability_score = $5
    WHERE id = $1
    RETURNING 
      id,
      user_id,
      technology_id,
      difficulty,
      total_questions,
      correct_count,
      score_percent,
      ability_score,
      started_at,
      completed_at
    `,
    [sessionId, correctCount, totalQuestions, scorePercent, abilityScore]
  );
  return result.rows[0];
}

async function saveAnswer(sessionId, questionId, isCorrect) {
  const result = await db.query(
    `
    INSERT INTO session_answers (session_id, question_id, is_correct, answered_at)
    VALUES ($1, $2, $3, NOW())
    RETURNING id, session_id, question_id, is_correct, answered_at
    `,
    [sessionId, questionId, isCorrect]
  );
  return result.rows[0];
}

async function getAnsweredQuestionIds(sessionId) {
  const result = await db.query(
    `SELECT question_id FROM session_answers WHERE session_id = $1`,
    [sessionId]
  );
  return result.rows.map(r => r.question_id);
}

module.exports = {
  createSession,
  findById,
  completeSession,
  saveAnswer,
  getAnsweredQuestionIds,
};