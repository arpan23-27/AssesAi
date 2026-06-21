// src/modules/results/service.js
const sessionRepository = require('../../repositories/quiz.session.repository');
const masteryRepository = require('../../repositories/mastery.repository');
const technologyRepository = require('../../repositories/technology.repository');
const { AppError } = require('../../utils/errors');

async function getSessionResult(sessionId, userId) {
  const session = await sessionRepository.findById(sessionId);
  if (!session) throw new AppError('Session not found', 404, 'SESSION_NOT_FOUND');
  if (session.user_id !== userId) throw new AppError('Forbidden', 403, 'SESSION_FORBIDDEN');
  const technology = await technologyRepository.findById(session.technology_id);
  if (!technology) throw new AppError('Technology not found', 404, 'TECHNOLOGY_NOT_FOUND');
  return { ...session, technologyName: technology.name };
}

async function getUserMastery(userId) {
  const records = await masteryRepository.findAllByUser(userId);
  return records;
}

module.exports = { getSessionResult, getUserMastery };
