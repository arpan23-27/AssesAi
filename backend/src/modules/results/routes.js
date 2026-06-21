// src/modules/results/routes.js
const express = require('express');
const router = express.Router();
const { z } = require('zod');
const resultsController = require('./results.controller');
const auth = require('../../middleware/auth');
const validate = require('../../middleware/validate');

const sessionIdParamSchema = z.object({ id: z.string().uuid() });

// GET /sessions/:id → result for a single session
router.get(
  '/sessions/:id',
  auth,
  validate(sessionIdParamSchema, 'params'),
  resultsController.getSessionResult
);

// GET /mastery → mastery across all concepts for the user
router.get('/mastery', auth, resultsController.getUserMastery);

module.exports = router;
