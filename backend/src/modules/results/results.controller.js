// src/modules/results/results.controller.js
const resultsService = require('./service');

async function getSessionResult(req, res, next) {
  try {
    const userId = req.user.sub;
    const sessionId = req.params.id;
    const result = await resultsService.getSessionResult(sessionId, userId);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function getUserMastery(req, res, next) {
  try {
    const userId = req.user.sub;
    const result = await resultsService.getUserMastery(userId);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

module.exports = { getSessionResult, getUserMastery };