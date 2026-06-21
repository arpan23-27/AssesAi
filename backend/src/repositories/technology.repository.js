// src/repositories/technologyRepository.js
const db = require('../config/db');

async function findById(id) {
  const result = await db.query(`SELECT id, name FROM technologies WHERE id = $1`, [id]);
  return result.rows[0] || null;
}

module.exports = {
  findById,
};
