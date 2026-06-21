// src/tests/adaptive.test.js
const {
  selectConcept,
  selectQuestion,
  updateAbilityScore,
  nextDifficulty,
} = require('../modules/quiz/adaptive');

describe('selectConcept', () => {
  test('returns first alphabetical concept for a new learner', () => {
    expect(selectConcept([], ['promises', 'closures', 'event-loop'])).toBe('closures');
  });

  test('returns the weakest concept for an existing learner', () => {
    const mastery = [
      { concept: 'closures', ability_score: 0.8 },
      { concept: 'promises', ability_score: 0.3 },
    ];
    expect(selectConcept(mastery, ['closures', 'promises'])).toBe('promises');
  });

  test('breaks ties alphabetically', () => {
    const mastery = [
      { concept: 'streams', ability_score: 0.4 },
      { concept: 'events', ability_score: 0.4 },
    ];
    expect(selectConcept(mastery, ['streams', 'events'])).toBe('events');
  });
});

describe('updateAbilityScore', () => {
  test('moves up on a correct answer and down on a wrong one', () => {
    expect(updateAbilityScore(0.5, true)).toBeGreaterThan(0.5);
    expect(updateAbilityScore(0.5, false)).toBeLessThan(0.5);
  });

  test('stays within [0, 1]', () => {
    expect(updateAbilityScore(1, true)).toBeLessThanOrEqual(1);
    expect(updateAbilityScore(0, false)).toBeGreaterThanOrEqual(0);
  });
});

describe('selectQuestion', () => {
  test('picks the question closest to the ability score', () => {
    const qs = [{ difficulty_score: 0.2 }, { difficulty_score: 0.6 }, { difficulty_score: 0.9 }];
    expect(selectQuestion(qs, 0.55).difficulty_score).toBe(0.6);
  });

  test('returns null for an empty pool', () => {
    expect(selectQuestion([], 0.5)).toBeNull();
  });
});

describe('nextDifficulty (streak-based tiering)', () => {
  test('no answers leaves the tier unchanged', () => {
    expect(nextDifficulty('basic', [])).toBe('basic');
  });

  test('two correct answers do NOT promote', () => {
    expect(nextDifficulty('basic', [true, true])).toBe('basic');
  });

  test('three correct in a row promotes one tier', () => {
    expect(nextDifficulty('basic', [true, true, true])).toBe('intermediate');
  });

  test('two wrong in a row demotes one tier', () => {
    expect(nextDifficulty('intermediate', [false, false])).toBe('basic');
  });

  test('cannot demote below basic', () => {
    expect(nextDifficulty('basic', [false, false, false, false])).toBe('basic');
  });

  test('cannot promote above advanced', () => {
    expect(nextDifficulty('advanced', [true, true, true, true, true, true])).toBe('advanced');
  });

  test('six correct from basic promotes twice to advanced', () => {
    expect(nextDifficulty('basic', [true, true, true, true, true, true])).toBe('advanced');
  });

  test('a wrong answer resets the correct streak', () => {
    expect(nextDifficulty('basic', [true, true, false, true, true])).toBe('basic');
  });

  test('promotion resets the streak counter', () => {
    // 3 correct -> promote to intermediate (streak reset), then only 2 more
    // correct, which is not enough to promote again.
    expect(nextDifficulty('basic', [true, true, true, true, true])).toBe('intermediate');
  });
});
