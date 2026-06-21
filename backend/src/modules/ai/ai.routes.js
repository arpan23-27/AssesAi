// src/modules/ai/ai.routes.js
const express = require('express');
const router = express.Router();
const aiController = require('./ai.controller');
const auth = require('../../middleware/auth');
const validate = require('../../middleware/validate');
const { requireRole } = require('../../middleware/rbac');
const { aiLimiter } = require('../../middleware/rateLimiter');
const { explainSchema, generateSchema } = require('./ai.schema');

// POST /explain → auth → per-user rate limit → validate → stream explanation
router.post('/explain', auth, aiLimiter, validate(explainSchema), aiController.explainAnswer);

// POST /generate → auth → admin only → validate → generate
router.post(
  '/generate',
  auth,
  requireRole('admin'),
  validate(generateSchema),
  aiController.generateQuestions
);

module.exports = router;
