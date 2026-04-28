// src/modules/quiz/routes.js
const express = require('express');
const router = express.Router();
const quizController = require('./controller');
const { startSessionSchema, submitAnswerSchema } = require('./schema');
const validate = require('../../middleware/validate');
const auth = require('../../middleware/auth');


//POST /sessions -> start a new session
router.post('/sessions',auth,validate(startSessionSchema),quizController.startSession);


//POST /sessions/:id/answer -> submite an answer
router.post('/sessions/:id/answer', auth, validate(submitAnswerSchema), quizController.submitAnswer);


//POST /sessions/: id/complete -> completethe se ssion
router.post('/sessions/:id/complete', auth, quizController.completeSession);

module.exports = router;
