// src/repositories/question.repository.js
const Question = require('../models/question.model');

/**
 * Find a question by its ID.
 * @param {string} questionId - MongoDB ObjectId string
 * @returns {Promise<Object|null>} Question document or null
 */
async function findById(questionId) {
  return Question.findById(questionId).lean();
}

/**
 * Find questions by concept and difficulty for a given technology.
 * @param {Object} params
 * @param {string} params.technology - Technology name (e.g. "JavaScript")
 * @param {string} params.concept - Concept name (e.g. "closures")
 * @param {string} params.difficulty - Difficulty level
 * @param {Array<string>} params.excludeIds - Array of question IDs to exclude
 * @returns {Promise<Array>} Array of question documents
 */
async function findByConceptAndDifficulty({ technology, concept, difficulty, excludeIds }) {
  const query = {
    technology,
    concept,
    difficulty,
    status: 'active',
  };
  if (excludeIds && excludeIds.length > 0) {
    query._id = { $nin: excludeIds };
  }
  return Question.find(query).lean();
}

/**
 * Get distinct concepts for a given technology.
 * @param {string} technology - Technology name
 * @returns {Promise<Array<string>>} Array of concept names
 */
async function findConceptsByTechnology(technology) {
  return Question.distinct('concept', { technology, status: 'active' });
}

module.exports = {
  findById,
  findByConceptAndDifficulty,
  findConceptsByTechnology,
};