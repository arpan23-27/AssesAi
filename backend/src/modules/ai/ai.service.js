// src/modules/ai/ai.service.js
const openai = require('../../config/openai');
const redis = require('../../config/redis');
const questionRepository = require('../../repositories/question.repository');
const sessionRepository = require('../../repositories/quiz.session.repository');
const {
  buildExplanationPrompt,
  buildGenerationPrompt,
  EXPLANATION_PROMPT_VERSION,
} = require('./prompts');
const { AppError } = require('../../utils/errors');
const { z } = require('zod');

/**
 * Stream an explanation for a wrong answer back to the client via SSE.
 *
 * Everything except the question id and the chosen wrong index is derived
 * server-side from the stored question — the client never supplies the question
 * text or the correct answer. Access is gated to questions the learner has
 * actually answered incorrectly, so this endpoint can't be used to peek at
 * correct answers before responding.
 */
async function explainAnswer({ questionId, wrongAnswerIndex, userId, res, req }) {
  const question = await questionRepository.findById(questionId);
  if (!question) throw new AppError('Question not found', 404, 'QUESTION_NOT_FOUND');

  const answeredWrong = await sessionRepository.userAnsweredIncorrectly(userId, questionId);
  if (!answeredWrong) {
    throw new AppError('No incorrect attempt found for this question', 403, 'EXPLAIN_FORBIDDEN');
  }

  const correctAnswer = question.options[question.correct_index];
  const wrongAnswer = question.options[wrongAnswerIndex];
  const { concept, technology, text: questionText } = question;

  const cacheKey = `explain:${questionId}:${wrongAnswerIndex}:${EXPLANATION_PROMPT_VERSION}`;

  const cached = await redis.get(cacheKey).catch(() => null);
  if (cached) {
    writeSseHeaders(res);
    res.write(`data: ${JSON.stringify({ text: cached })}\n\n`);
    res.write('data: [DONE]\n\n');
    res.end();
    return;
  }

  const { system, user } = buildExplanationPrompt({
    questionText,
    correctAnswer,
    wrongAnswer,
    concept,
    technology,
  });

  writeSseHeaders(res);

  const stream = await openai.chat.completions.create({
    model: 'llama-3.1-8b-instant',
    stream: true,
    temperature: 0.3,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
  });

  let fullText = '';

  req.on('close', () => {
    if (stream.controller) stream.controller.abort();
  });

  try {
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || '';
      if (content) {
        fullText += content;
        res.write(`data: ${JSON.stringify({ text: content })}\n\n`);
      }
    }
    await redis.set(cacheKey, fullText, 'EX', 60 * 60 * 24 * 7).catch(() => {});
  } catch {
    res.write(`data: ${JSON.stringify({ error: 'Stream interrupted' })}\n\n`);
  } finally {
    res.write('data: [DONE]\n\n');
    res.end();
  }
}

function writeSseHeaders(res) {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
}

/**
 * Generate a new quiz question via the model, validating and retrying output.
 */
async function generateQuestions({ technology, concept, difficulty, existingCount }) {
  const { system, user } = buildGenerationPrompt({
    technology,
    concept,
    difficulty,
    existingCount,
  });

  const questionSchema = z.object({
    questionText: z.string(),
    options: z.array(z.string()).length(4),
    correctIndex: z.number().int().min(0).max(3),
    difficulty: z.string(),
    concept: z.string(),
    technology: z.string(),
  });

  let attempts = 0;
  while (attempts < 3) {
    attempts++;
    const response = await openai.chat.completions.create({
      model: 'mixtral-8x7b-32768',
      stream: false,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new AppError('No content from model', 500, 'AI_NO_CONTENT');

    try {
      return questionSchema.parse(JSON.parse(content));
    } catch {
      if (attempts >= 3) {
        throw new AppError('Failed to generate valid question', 500, 'AI_INVALID_OUTPUT');
      }
    }
  }
}

module.exports = {
  explainAnswer,
  generateQuestions,
};
