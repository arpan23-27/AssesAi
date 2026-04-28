// src/repositories/mastery.repository.js
const db = require('../config/db');

async function findByUserAndConcept({ userId, technologyId, concept }) {
  const result = await db.query(
    `SELECT user_id, technology_id, concept, ability_score, questions_seen, questions_correct, updated_at
     FROM user_concept_mastery
     WHERE user_id = $1 AND technology_id = $2 AND concept = $3`,
    [userId, technologyId, concept]
  );
  return result.rows[0] || null;
}

async function upsertMastery({ userId, technologyId, concept, newAbilityScore, isCorrect }) {
  await db.query(
    `INSERT INTO user_concept_mastery (user_id, technology_id, concept, ability_score, questions_seen, questions_correct)
     VALUES ($1, $2, $3, $4, 1, CASE WHEN $5 THEN 1 ELSE 0 END)
     ON CONFLICT (user_id, technology_id, concept)
     DO UPDATE SET
       ability_score = $4,
       questions_seen = user_concept_mastery.questions_seen + 1,
       questions_correct = user_concept_mastery.questions_correct + CASE WHEN $5 THEN 1 ELSE 0 END,
       updated_at = NOW()`,
    [userId, technologyId, concept, newAbilityScore, isCorrect]
  );
}

async function findAllByUser(userId) {
  const result = await db.query(
    `SELECT ucm.concept, t.name AS technology_name, ucm.ability_score, ucm.questions_seen, ucm.questions_correct
     FROM user_concept_mastery ucm
     JOIN technologies t ON t.id = ucm.technology_id
     WHERE ucm.user_id = $1`,
    [userId]
  );
  return result.rows;
}

async function findAllByUserAndTechnology(userId, technologyId) {
  const result = await db.query(
    `SELECT ucm.concept, t.name AS technology_name, ucm.ability_score, ucm.questions_seen, ucm.questions_correct
     FROM user_concept_mastery ucm
     JOIN technologies t ON t.id = ucm.technology_id
     WHERE ucm.user_id = $1 AND ucm.technology_id = $2`,
    [userId, technologyId]
  );
  return result.rows;
}

module.exports = {
  findByUserAndConcept,
  upsertMastery,
  findAllByUser,
  findAllByUserAndTechnology,
};