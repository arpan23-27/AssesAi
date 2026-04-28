// src/modules/quiz/service.js
const questionRepository = require('../../repositories/question.repository');
const masteryRepository = require('../../repositories/mastery.repository');
const sessionRepository = require('../../repositories/quiz.session.repository');
const technologyRepository = require('../../repositories/technology.repository');
const { selectQuestion, updateAbilityScore, selectConcept } = require('./adaptive');
const { AppError } = require('../../utils/errors');

async function startSession({ userId, technologyId, difficulty }) {
  const session = await sessionRepository.createSession({ userId, technologyId, difficulty });
  const technology = await technologyRepository.findById(technologyId);
  if (!technology) throw new AppError('Technology not found', 404, 'TECHNOLOGY_NOT_FOUND');
  const technologyName = technology.name;
  const availableConcepts = await questionRepository.findConceptsByTechnology(technologyName);
  const masteryRecords = await masteryRepository.findAllByUserAndTechnology(userId, technologyId);
  const concept = selectConcept(masteryRecords, availableConcepts);
  let mastery = await masteryRepository.findByUserAndConcept({ userId, technologyId, concept });
  let abilityScore = mastery ? mastery.ability_score : 0.5;
  const questions = await questionRepository.findByConceptAndDifficulty({
    technology: technologyName,
    concept,
    difficulty,
    excludeIds: [],
  });
  const firstQuestion = selectQuestion(questions, abilityScore);
  if (firstQuestion) {
    const { correct_index, ...safeQuestion } = firstQuestion.toObject ? firstQuestion.toObject() : firstQuestion;
    return { session, firstQuestion: safeQuestion };
  }
  return { session, firstQuestion: null };
}

async function submitAnswer({ sessionId, userId, questionId, answerIndex }) {
  const session = await sessionRepository.findById(sessionId);
  if (!session) throw new AppError('Session not found', 404, 'SESSION_NOT_FOUND');
  if (session.user_id !== userId) throw new AppError('Forbidden', 403, 'SESSION_FORBIDDEN');
  if (session.completed_at) throw new AppError('Session already completed', 400, 'SESSION_ALREADY_COMPLETED');

  const technology = await technologyRepository.findById(session.technology_id);
  if (!technology) throw new AppError('Technology not found', 404, 'TECHNOLOGY_NOT_FOUND');
  const technologyName = technology.name;

  const question = await questionRepository.findById(questionId);
  if (!question) throw new AppError('Question not found', 404, 'QUESTION_NOT_FOUND');

  const isCorrect = answerIndex === question.correct_index;
  await sessionRepository.saveAnswer(sessionId, questionId, isCorrect);

  const masteryConcept = question.concept;
  let mastery = await masteryRepository.findByUserAndConcept({
    userId,
    technologyId: session.technology_id,
    concept: masteryConcept,
  });
  let currentScore = mastery ? parseFloat(mastery.ability_score) : 0.5;
  const updatedAbilityScore = updateAbilityScore(currentScore, isCorrect);

  await masteryRepository.upsertMastery({
    userId,
    technologyId: session.technology_id,
    concept: masteryConcept,
    newAbilityScore: updatedAbilityScore,
    isCorrect,
  });

  const excludeIds = await sessionRepository.getAnsweredQuestionIds(sessionId);
  const nextQuestions = await questionRepository.findByConceptAndDifficulty({
    technology: technologyName,
    concept: masteryConcept,
    difficulty: session.difficulty,
    excludeIds,
  });
  const nextQuestion = selectQuestion(nextQuestions, updatedAbilityScore);

  let safeNext = null;
  if (nextQuestion) {
    const { correct_index, ...safe } = nextQuestion.toObject ? nextQuestion.toObject() : nextQuestion;
    safeNext = safe;
  }

  return { isCorrect, nextQuestion: safeNext, updatedAbilityScore };
}

async function completeSession({ sessionId, userId, correctCount, totalQuestions }) {
  const session = await sessionRepository.findById(sessionId);
  if (!session) throw new AppError('Session not found', 404, 'SESSION_NOT_FOUND');
  if (session.user_id !== userId) throw new AppError('Forbidden', 403, 'SESSION_FORBIDDEN');

  const scorePercent = (correctCount / totalQuestions) * 100;

  const masteryConcept = 'closures';
  const mastery = await masteryRepository.findByUserAndConcept({
    userId,
    technologyId: session.technology_id,
    concept: masteryConcept,
  });
  const finalAbilityScore = mastery ? mastery.ability_score : null;

  const completed = await sessionRepository.completeSession({
    sessionId,
    correctCount,
    totalQuestions,
    scorePercent,
    abilityScore: finalAbilityScore,
  });

  return { ...completed, finalAbilityScore };
}

module.exports = {
  startSession,
  submitAnswer,
  completeSession,
};