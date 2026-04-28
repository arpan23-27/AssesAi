// tests/adaptive.test.js
const { selectConcept } = require('../modules/quiz/adaptive');

describe('selectConcept', () => {
  test('returns first alphabetical concept for new user', () => {
    expect(selectConcept([], ['promises', 'closures', 'event-loop']))
      .toBe('closures');
  });

  test('returns weakest concept for existing user', () => {
    const mastery = [
      { concept: 'closures', ability_score: 0.8 },
      { concept: 'promises', ability_score: 0.3 },
    ];
    expect(selectConcept(mastery, ['closures', 'promises']))
      .toBe('promises');
  });
});
