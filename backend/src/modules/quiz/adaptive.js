// src/modules/quiz/adaptive.js
//
// Heuristic adaptive engine. This is deliberately a transparent rule-based
// system, NOT item-response theory. Three signals drive question selection:
//
//   1. selectConcept     — target the learner's weakest concept first.
//   2. nextDifficulty    — streak-based difficulty tiering (see below).
//   3. selectQuestion    — within a tier, pick the item whose difficulty_score
//                          is closest to the learner's running ability score.
//
// updateAbilityScore is a simple exponential move toward 1 on a correct answer
// and toward 0 on a wrong one. It is a smoothing heuristic for item selection,
// not a calibrated ability estimate.

const LEARNING_RATE = 0.1;

// Ordered difficulty tiers, easiest → hardest.
const TIERS = ['basic', 'intermediate', 'advanced'];

// Streak thresholds that move the learner between tiers.
const PROMOTE_AFTER_CORRECT = 3; // 3 correct in a row → harder tier
const DEMOTE_AFTER_WRONG = 2; // 2 wrong in a row → easier tier

/**
 * Pick the question whose difficulty_score is closest to `abilityScore`.
 * @param {Array} questions
 * @param {number} abilityScore 0..1
 * @returns {Object|null}
 */
function selectQuestion(questions, abilityScore) {
  if (!questions || questions.length === 0) return null;
  let closest = questions[0];
  let minDiff = Math.abs(closest.difficulty_score - abilityScore);
  for (let i = 1; i < questions.length; i++) {
    const diff = Math.abs(questions[i].difficulty_score - abilityScore);
    if (diff < minDiff) {
      closest = questions[i];
      minDiff = diff;
    }
  }
  return closest;
}

/**
 * Smoothly nudge the running ability score after an answer.
 * @param {number} currentScore 0..1
 * @param {boolean} isCorrect
 * @returns {number}
 */
function updateAbilityScore(currentScore, isCorrect) {
  if (isCorrect) {
    return currentScore + LEARNING_RATE * (1 - currentScore);
  }
  return currentScore - LEARNING_RATE * currentScore;
}

/**
 * Choose the concept to drill: the one with the lowest mastery, breaking ties
 * alphabetically. Falls back to the first available concept for new learners.
 * @param {Array<{concept:string, ability_score:number}>} masteryRecords
 * @param {Array<string>} availableConcepts
 * @returns {string|undefined}
 */
function selectConcept(masteryRecords, availableConcepts) {
  if (!masteryRecords || masteryRecords.length === 0) {
    return [...(availableConcepts || [])].sort()[0];
  }
  const lowestScore = Math.min(...masteryRecords.map((r) => Number(r.ability_score)));
  const weakestConcepts = masteryRecords
    .filter((r) => Number(r.ability_score) === lowestScore)
    .map((r) => r.concept);
  const candidates = weakestConcepts.length > 0 ? weakestConcepts : availableConcepts;
  return [...candidates].sort()[0];
}

/**
 * Replay the answer history for a session and compute the current difficulty
 * tier from the starting tier using transparent streak rules:
 *   - PROMOTE_AFTER_CORRECT correct answers in a row bump the tier up one.
 *   - DEMOTE_AFTER_WRONG wrong answers in a row bump the tier down one.
 * The relevant streak counter resets whenever the tier changes or the streak
 * breaks. Stateless and deterministic, which makes it trivial to unit test.
 *
 * @param {string} startTier one of TIERS
 * @param {Array<boolean>} answerHistory isCorrect flags, oldest → newest
 * @returns {string} resulting tier
 */
function nextDifficulty(startTier, answerHistory) {
  let idx = TIERS.indexOf(startTier);
  if (idx === -1) idx = 0;

  let correctStreak = 0;
  let wrongStreak = 0;

  for (const correct of answerHistory || []) {
    if (correct) {
      correctStreak++;
      wrongStreak = 0;
      if (correctStreak >= PROMOTE_AFTER_CORRECT && idx < TIERS.length - 1) {
        idx++;
        correctStreak = 0;
      }
    } else {
      wrongStreak++;
      correctStreak = 0;
      if (wrongStreak >= DEMOTE_AFTER_WRONG && idx > 0) {
        idx--;
        wrongStreak = 0;
      }
    }
  }

  return TIERS[idx];
}

module.exports = {
  TIERS,
  PROMOTE_AFTER_CORRECT,
  DEMOTE_AFTER_WRONG,
  selectQuestion,
  updateAbilityScore,
  selectConcept,
  nextDifficulty,
};
