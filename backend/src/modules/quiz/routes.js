// src/modules/quiz/routes.js
const express = require('express');
const router = express.Router();
const quizController = require('./controller');
const { startSessionSchema, submitAnswerSchema, sessionIdParamSchema } = require('./schema');
const validate = require('../../middleware/validate');
const auth = require('../../middleware/auth');

// GET /technologies -> list technologies (with real ids) that have questions
router.get('/technologies', auth, quizController.listTechnologies);

// POST /sessions -> start a new session
router.post('/sessions', auth, validate(startSessionSchema), quizController.startSession);

// POST /sessions/:id/answer -> submit an answer
router.post(
  '/sessions/:id/answer',
  auth,
  validate(sessionIdParamSchema, 'params'),
  validate(submitAnswerSchema),
  quizController.submitAnswer
);

// POST /sessions/:id/complete -> complete the session
router.post(
  '/sessions/:id/complete',
  auth,
  validate(sessionIdParamSchema, 'params'),
  quizController.completeSession
);

module.exports = router;
