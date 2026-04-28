const express = require('express');
const router = express.Router();
const aiController = require('./ai.controller');
const auth = require('../../middleware/auth');
const { requireRole } = require('../../middleware/rbac');
const { aiLimiter } = require('../../middleware/rateLimiter');

// POST /explain → auth → aiLimiter → explainAnswer
router.post('/explain', auth, aiLimiter, aiController.explainAnswer);

// POST /generate → auth → requireRole('admin') → generateQuestions
router.post('/generate', auth, requireRole('admin'), aiController.generateQuestions);

module.exports = router;