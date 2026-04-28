// src/modules/ai/ai.controller.js
const aiService = require('./ai.service');
const { AppError } = require('../../utils/errors');

async function explainAnswer(req, res, next) {
  try {
    const {
      questionId,
      wrongAnswerIndex,
      questionText,
      correctAnswer,
      wrongAnswer,
      concept,
      technology,
    } = req.body;

    // Pass req and res directly for streaming
    await aiService.explainAnswer({
      questionId,
      wrongAnswerIndex,
      questionText,
      correctAnswer,
      wrongAnswer,
      concept,
      technology,
      res,
      req,
    });
  } catch (err) {
    // Only catches errors before streaming starts
    next(err);
  }
}

async function generateQuestions(req, res, next) {
  try {
    const { technology, concept, difficulty, existingCount } = req.body;
    const question = await aiService.generateQuestions({
      technology,
      concept,
      difficulty,
      existingCount,
    });
    res.json(question);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  explainAnswer,
  generateQuestions,
};