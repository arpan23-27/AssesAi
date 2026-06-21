// src/modules/quiz/service.js
const questionRepository = require('../../repositories/question.repository');
const masteryRepository = require('../../repositories/mastery.repository');
const sessionRepository = require('../../repositories/quiz.session.repository');
const technologyRepository = require('../../repositories/technology.repository');
const { selectQuestion, updateAbilityScore, selectConcept, nextDifficulty } = require('./adaptive');
const { AppError } = require('../../utils/errors');

const DEFAULT_ABILITY = 0.5;

// Strip the correct answer before a question ever leaves the server.
function toClientQuestion(question) {
  if (!question) return null;
  const { correct_index: _omit, ...safe } = question;
  return safe;
}

async function startSession({ userId, technologyId, difficulty }) {
  const technology = await technologyRepository.findById(technologyId);
  if (!technology) throw new AppError('Technology not found', 404, 'TECHNOLOGY_NOT_FOUND');
  const technologyName = technology.name;

  const session = await sessionRepository.createSession({ userId, technologyId, difficulty });

  const availableConcepts = await questionRepository.findConceptsByTechnology(technologyName);
  const masteryRecords = await masteryRepository.findAllByUserAndTechnology(userId, technologyId);
  const concept = selectConcept(masteryRecords, availableConcepts);

  const mastery = await masteryRepository.findByUserAndConcept({ userId, technologyId, concept });
  const abilityScore = mastery ? Number(mastery.ability_score) : DEFAULT_ABILITY;

  const questions = await questionRepository.findByConceptAndDifficulty({
    technology: technologyName,
    concept,
    difficulty,
    excludeIds: [],
  });
  const firstQuestion = selectQuestion(questions, abilityScore);

  if (firstQuestion) {
    await sessionRepository.setCurrentQuestion(session.id, firstQuestion.id);
  }

  return { session, firstQuestion: toClientQuestion(firstQuestion) };
}

async function submitAnswer({ sessionId, userId, questionId, answerIndex }) {
  const session = await sessionRepository.findById(sessionId);
  if (!session) throw new AppError('Session not found', 404, 'SESSION_NOT_FOUND');
  if (session.user_id !== userId) throw new AppError('Forbidden', 403, 'SESSION_FORBIDDEN');
  if (session.completed_at)
    throw new AppError('Session already completed', 400, 'SESSION_ALREADY_COMPLETED');

  // Bind the answer strictly to the question that was actually served, and
  // reject any question already answered in this session. Together these stop
  // a client from grading itself against an arbitrary or repeated question.
  if (session.current_question_id && session.current_question_id !== questionId) {
    throw new AppError('Question does not match the active session', 409, 'QUESTION_MISMATCH');
  }
  if (await sessionRepository.hasAnswered(sessionId, questionId)) {
    throw new AppError('Question already answered', 409, 'QUESTION_ALREADY_ANSWERED');
  }

  const technology = await technologyRepository.findById(session.technology_id);
  if (!technology) throw new AppError('Technology not found', 404, 'TECHNOLOGY_NOT_FOUND');
  const technologyName = technology.name;

  const question = await questionRepository.findById(questionId);
  if (!question) throw new AppError('Question not found', 404, 'QUESTION_NOT_FOUND');
  if (question.technology !== technologyName) {
    throw new AppError(
      'Question does not belong to this technology',
      409,
      'QUESTION_TECHNOLOGY_MISMATCH'
    );
  }

  // Grade on the server against the stored correct_index — never trust the client.
  const isCorrect = answerIndex === question.correct_index;
  await sessionRepository.saveAnswer(sessionId, questionId, isCorrect);

  // Update concept mastery using the question's real concept.
  const concept = question.concept;
  const mastery = await masteryRepository.findByUserAndConcept({
    userId,
    technologyId: session.technology_id,
    concept,
  });
  const currentScore = mastery ? Number(mastery.ability_score) : DEFAULT_ABILITY;
  const updatedAbilityScore = updateAbilityScore(currentScore, isCorrect);

  await masteryRepository.upsertMastery({
    userId,
    technologyId: session.technology_id,
    concept,
    newAbilityScore: updatedAbilityScore,
    isCorrect,
  });

  // Heuristic difficulty tiering from the full answer history of this session.
  const answeredIds = await sessionRepository.getAnsweredQuestionIds(sessionId);
  const history = await sessionRepository.getAnswerHistory(sessionId);
  const difficulty = nextDifficulty(session.difficulty, history);

  const nextQuestions = await questionRepository.findByConceptAndDifficulty({
    technology: technologyName,
    concept,
    difficulty,
    excludeIds: answeredIds,
  });
  const nextQuestion = selectQuestion(nextQuestions, updatedAbilityScore);

  await sessionRepository.setCurrentQuestion(sessionId, nextQuestion ? nextQuestion.id : null);

  return {
    isCorrect,
    nextQuestion: toClientQuestion(nextQuestion),
    updatedAbilityScore,
    difficulty,
  };
}

async function completeSession({ sessionId, userId }) {
  const session = await sessionRepository.findById(sessionId);
  if (!session) throw new AppError('Session not found', 404, 'SESSION_NOT_FOUND');
  if (session.user_id !== userId) throw new AppError('Forbidden', 403, 'SESSION_FORBIDDEN');
  if (session.completed_at)
    throw new AppError('Session already completed', 400, 'SESSION_ALREADY_COMPLETED');

  // Score is recomputed from recorded answers, not taken from the request body.
  const { total, correct } = await sessionRepository.getSessionStats(sessionId);
  const scorePercent = total > 0 ? (correct / total) * 100 : 0;

  // Final ability = average mastery across the concepts actually exercised.
  const finalAbilityScore = await sessionRepository.getSessionAbilityScore(sessionId, userId);

  const completed = await sessionRepository.completeSession({
    sessionId,
    correctCount: correct,
    totalQuestions: total,
    scorePercent: Number(scorePercent.toFixed(2)),
    abilityScore: finalAbilityScore,
  });

  return { ...completed, finalAbilityScore };
}

module.exports = {
  startSession,
  submitAnswer,
  completeSession,
};
