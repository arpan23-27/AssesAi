// src/modules/quiz/adaptive.js

const LEARNING_RATE = 0.1;

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

function updateAbilityScore(currentScore, isCorrect) {
  if (isCorrect) {
    return currentScore + LEARNING_RATE * (1 - currentScore);
  }
  return currentScore - LEARNING_RATE * currentScore;
}

function selectConcept(masteryRecords, availableConcepts) {
  if (!masteryRecords || masteryRecords.length === 0) {
    return availableConcepts.sort()[0];
  }
  const lowestScore = Math.min(...masteryRecords.map(r => r.ability_score));
  const weakestConcepts = masteryRecords
    .filter(r => r.ability_score === lowestScore)
    .map(r => r.concept);
  const candidates = weakestConcepts.length > 0 ? weakestConcepts : availableConcepts;
  return candidates.sort()[0];
}

module.exports = {
  selectQuestion,
  updateAbilityScore,
  selectConcept,
};