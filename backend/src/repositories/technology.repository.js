// src/repositories/technology.repository.js
const db = require('../config/db');

async function findById(id) {
  const result = await db.query(`SELECT id, name FROM technologies WHERE id = $1`, [id]);
  return result.rows[0] || null;
}

/**
 * All technologies that have at least one active question, with a per-technology
 * question count. Joining on the question pool means the quiz UI only ever shows
 * a card the learner can actually start — an empty technology is omitted.
 * @returns {Promise<Array<{id:number, name:string, question_count:number}>>}
 */
async function findAllWithQuestions() {
  const result = await db.query(
    `SELECT t.id, t.name, COUNT(q.id)::int AS question_count
       FROM technologies t
       JOIN questions q
         ON q.technology = t.name AND q.status = 'active'
      GROUP BY t.id, t.name
      ORDER BY t.id`
  );
  return result.rows;
}

module.exports = {
  findById,
  findAllWithQuestions,
};
