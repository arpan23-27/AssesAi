// src/modules/quiz/service.js
const questionRepository = require('../../repositories/question.repository');
const masteryRepository = require('../../repositories/mastery.repository');
const sessionRepository = require('../../repositories/quiz.session.repository');
const technologyRepository = require('../../repositories/technology.repository');
const { withTransaction } = require('../../config/db');
const {
  selectQuestion,
  updateAbilityScore,
  selectConcept,
  nextDifficulty,
  tiersByProximity,
  MAX_QUESTIONS,
} = require('./adaptive');
const { AppError } = require('../../utils/errors');

const DEFAULT_ABILITY = 0.5;

/**
 * Technologies the learner can start a quiz in: those with active questions,
 * each with its real database id and question count. The client uses these ids
 * rather than assuming them, so the quiz cards stay correct regardless of how
 * the technologies table was seeded.
 */
async function listTechnologies() {
  return technologyRepository.findAllWithQuestions();
}

// Strip the correct answer before a question ever leaves the server.
function toClientQuestion(question) {
  if (!question) return null;
  const { correct_index: _omit, ...safe } = question;
  return safe;
}

/**
 * Pick the next question for a concept, widening across difficulty tiers when
 * the target tier is empty. Starts at `targetDifficulty` and falls back to the
 * nearest adjacent tiers, so a promoted strong learner never dead-ends on an
 * exhausted pool — they get the closest available question instead.
 * @returns {Promise<Object|null>} a question row, or null only if the concept
 *   is fully exhausted across all tiers.
 */
async function pickQuestion({ technology, concept, targetDifficulty, abilityScore, excludeIds }) {
  for (const tier of tiersByProximity(targetDifficulty)) {
    const pool = await questionRepository.findByConceptAndDifficulty({
      technology,
      concept,
      difficulty: tier,
      excludeIds,
    });
    const picked = selectQuestion(pool, abilityScore);
    if (picked) return picked;
  }
  return null;
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
  // Widen across tiers if the requested starting tier happens to be empty.
  const firstQuestion =
    selectQuestion(questions, abilityScore) ||
    (await pickQuestion({
      technology: technologyName,
      concept,
      targetDifficulty: difficulty,
      abilityScore,
      excludeIds: [],
    }));

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
  const concept = question.concept;

  // Pre-answer mastery, read before the write transaction.
  const mastery = await masteryRepository.findByUserAndConcept({
    userId,
    technologyId: session.technology_id,
    concept,
  });
  const currentScore = mastery ? Number(mastery.ability_score) : DEFAULT_ABILITY;
  const updatedAbilityScore = updateAbilityScore(currentScore, isCorrect);

  // The answer, the mastery update, and the next-question pointer move together
  // atomically. The UNIQUE(session_id, question_id) constraint plus this
  // transaction close the double-submit race: a concurrent insert fails and the
  // whole unit rolls back instead of leaving a half-applied answer.
  const { nextQuestion, difficulty } = await withTransaction(async (client) => {
    await sessionRepository.saveAnswer(sessionId, questionId, isCorrect, client);

    await masteryRepository.upsertMastery(
      {
        userId,
        technologyId: session.technology_id,
        concept,
        newAbilityScore: updatedAbilityScore,
        isCorrect,
      },
      client
    );

    // Read inside the transaction so they include the answer just saved.
    const answeredIds = await sessionRepository.getAnsweredQuestionIds(sessionId, client);
    const history = await sessionRepository.getAnswerHistory(sessionId, client);
    const tier = nextDifficulty(session.difficulty, history);

    // Fixed-length stop: once MAX_QUESTIONS is reached the session ends
    // deterministically (null next question). Below the cap, pickQuestion widens
    // across tiers, so a promoted strong learner is never dead-ended by an empty
    // pool — performing well advances the quiz instead of ending it.
    let picked = null;
    if (answeredIds.length < MAX_QUESTIONS) {
      picked = await pickQuestion({
        technology: technologyName,
        concept,
        targetDifficulty: tier,
        abilityScore: updatedAbilityScore,
        excludeIds: answeredIds,
      });
    }

    await sessionRepository.setCurrentQuestion(sessionId, picked ? picked.id : null, client);
    return { nextQuestion: picked, difficulty: tier };
  });

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
  listTechnologies,
  startSession,
  submitAnswer,
  completeSession,
};
