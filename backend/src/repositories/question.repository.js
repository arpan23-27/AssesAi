// src/repositories/question.repository.js
// PostgreSQL-backed question store. `options` and `metadata` are JSONB and come
// back already parsed into JS values by node-postgres.
const db = require('../config/db');

// UUID v4 shape — used to short-circuit lookups for malformed ids instead of
// letting Postgres throw "invalid input syntax for type uuid".
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const BASE_COLUMNS = `
  id,
  technology,
  concept,
  difficulty,
  difficulty_score::float8 AS difficulty_score,
  text,
  options,
  correct_index,
  source,
  status
`;

/**
 * Find a single active-or-not question by id.
 * @param {string} questionId UUID string
 * @returns {Promise<Object|null>}
 */
async function findById(questionId) {
  if (!UUID_RE.test(questionId)) return null;
  const result = await db.query(`SELECT ${BASE_COLUMNS} FROM questions WHERE id = $1`, [
    questionId,
  ]);
  return result.rows[0] || null;
}

/**
 * Find active questions for a technology/concept/difficulty, optionally
 * excluding ids already served in the current session.
 * @param {Object} params
 * @param {string} params.technology
 * @param {string} params.concept
 * @param {string} params.difficulty
 * @param {Array<string>} [params.excludeIds]
 * @returns {Promise<Array>}
 */
async function findByConceptAndDifficulty({ technology, concept, difficulty, excludeIds = [] }) {
  const clean = excludeIds.filter((id) => UUID_RE.test(id));
  const result = await db.query(
    `SELECT ${BASE_COLUMNS}
     FROM questions
     WHERE technology = $1
       AND concept = $2
       AND difficulty = $3
       AND status = 'active'
       AND ($4::uuid[] IS NULL OR id <> ALL($4::uuid[]))`,
    [technology, concept, difficulty, clean.length ? clean : null]
  );
  return result.rows;
}

/**
 * Distinct active concepts for a technology.
 * @param {string} technology
 * @returns {Promise<Array<string>>}
 */
async function findConceptsByTechnology(technology) {
  const result = await db.query(
    `SELECT DISTINCT concept
     FROM questions
     WHERE technology = $1 AND status = 'active'`,
    [technology]
  );
  return result.rows.map((r) => r.concept);
}

module.exports = {
  findById,
  findByConceptAndDifficulty,
  findConceptsByTechnology,
};
