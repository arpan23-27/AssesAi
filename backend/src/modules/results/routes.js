// src/modules/results/routes.js
const express = require('express');
const router = express.Router();
const resultsController = require('./results.controller');
const auth = require('../../middleware/auth');

// GET /sessions/:id → getSessionResult
router.get(
  '/sessions/:id',
  auth,
  resultsController.getSessionResult
);

// GET /mastery → getUserMastery
router.get(
  '/mastery',
  auth,
  resultsController.getUserMastery
);

module.exports = router;