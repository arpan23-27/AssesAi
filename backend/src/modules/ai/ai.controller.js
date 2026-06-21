// src/modules/ai/ai.controller.js
const aiService = require('./ai.service');

async function explainAnswer(req, res, next) {
  try {
    const userId = req.user.sub;
    const { questionId, wrongAnswerIndex } = req.body;
    // The service streams directly to res; req is passed for abort handling.
    await aiService.explainAnswer({ questionId, wrongAnswerIndex, userId, res, req });
  } catch (err) {
    // Only reached if the error occurs before SSE streaming starts.
    next(err);
  }
}

async function generateQuestions(req, res, next) {
  try {
    const { technology, concept, difficulty, existingCount } = req.body;
    const result = await aiService.generateQuestions({
      technology,
      concept,
      difficulty,
      existingCount,
    });
    // 201 when a new pending_review question was written, 200 when it already
    // existed (idempotent on the question text).
    res.status(result.status === 'pending_review' ? 201 : 200).json(result);
  } catch (err) {
    next(err);
  }
}

module.exports = { explainAnswer, generateQuestions };
