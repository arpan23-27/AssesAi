// src/modules/ai/prompts.js

// Prompt versions (used in cache keys and logs)
const EXPLANATION_PROMPT_VERSION = 'v1';
const GENERATION_PROMPT_VERSION = 'v1';

/**
 * Build an explanation prompt for why a student’s answer was wrong.
 * @param {Object} params
 * @param {string} params.questionText - The quiz question text
 * @param {string} params.correctAnswer - The correct option text
 * @param {string} params.wrongAnswer - The student’s chosen wrong option text
 * @param {string} params.concept - The underlying concept (e.g. "closures")
 * @param {string} params.technology - The technology (e.g. "JavaScript")
 * @returns {{ system: string, user: string }}
 */
function buildExplanationPrompt({ questionText, correctAnswer, wrongAnswer, concept, technology }) {
  const system = `
You are AssesAI, a teaching assistant for software engineering students.
Persona: patient, precise, and focused on conceptual clarity.
Constraints:
- Never reveal the correct_index or internal metadata.
- Never insult or discourage the student.
- Never output code without explanation.
Output format:
- Two paragraphs only.
  1. First paragraph: explain why the chosen wrong answer is incorrect, tied to the ${concept} concept in ${technology}.
  2. Second paragraph: explain why the correct answer is right, reinforcing the concept and giving a practical mental model.
`;

  const user = `
Question: ${questionText}
Student's answer: "${wrongAnswer}"
Correct answer: "${correctAnswer}"
Concept: ${concept}
Technology: ${technology}
Explain clearly in two paragraphs as instructed.
`;

  return { system, user };
}

/**
 * Build a generation prompt for creating new quiz questions.
 * @param {Object} params
 * @param {string} params.technology - The technology (e.g. "JavaScript")
 * @param {string} params.concept - The concept (e.g. "closures")
 * @param {string} params.difficulty - Difficulty level ("basic", "intermediate", "advanced")
 * @param {number} params.existingCount - How many questions already exist for this concept
 * @returns {{ system: string, user: string }}
 */
function buildGenerationPrompt({ technology, concept, difficulty, existingCount }) {
  const system = `
You are AssesAI, a question generator for software engineering quizzes.
Persona: rigorous, creative, and aligned with curriculum standards.
Constraints:
- Always generate exactly 4 options.
- Mark one option as correct.
- Ensure distractors are plausible but wrong.
- Never repeat existing questions verbatim.
Output format:
- JSON with fields: questionText, options[4], correctIndex, difficulty, concept, technology.
`;

  const user = `
Generate a new ${difficulty} level multiple-choice question for ${technology}, focusing on the concept "${concept}".
There are already ${existingCount} questions for this concept — avoid duplication.
Return the question in the specified JSON format.
`;

  return { system, user };
}

module.exports = {
  buildExplanationPrompt,
  buildGenerationPrompt,
  EXPLANATION_PROMPT_VERSION,
  GENERATION_PROMPT_VERSION,
};
