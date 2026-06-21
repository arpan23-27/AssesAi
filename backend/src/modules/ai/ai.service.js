// src/modules/ai/ai.service.js
const openai = require('../../config/openai');
const redis = require('../../config/redis');
const questionRepository = require('../../repositories/question.repository');
const sessionRepository = require('../../repositories/quiz.session.repository');
const {
  buildExplanationPrompt,
  buildGenerationPrompt,
  EXPLANATION_PROMPT_VERSION,
  GENERATION_PROMPT_VERSION,
} = require('./prompts');
const { AppError } = require('../../utils/errors');
const { z } = require('zod');
const EXPLAIN_MODEL = process.env.GROQ_EXPLAIN_MODEL || 'openai/gpt-oss-20b';

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

  // Headers are now sent, so any failure from here on must be reported as an SSE
  // frame — calling next(err) would try to set a status on an already-sent
  // response and crash. Creating the stream is the most likely place to fail
  // (Groq unreachable, bad key, rate limit), so it gets its own guard.
  let stream;
  try {
    stream = await openai.chat.completions.create({
      model: EXPLAIN_MODEL,
      stream: true,
      temperature: 0.3,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    });
  } catch {
    res.write(`data: ${JSON.stringify({ error: 'AI service unavailable' })}\n\n`);
    res.write('data: [DONE]\n\n');
    res.end();
    return;
  }

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
 * Generate a new quiz question via the model, validate it, and persist it for
 * review. Generated questions are written with source='ai_generated' and
 * status='pending_review', so they never enter the live pool until an admin
 * promotes them to 'active'.
 */
const GENERATION_MODEL = process.env.GROQ_GENERATION_MODEL || 'openai/gpt-oss-120b';

// Tier → representative difficulty_score, matching the manual seed banding.
const DIFFICULTY_SCORE = { basic: 0.25, intermediate: 0.55, advanced: 0.85 };

async function generateQuestions({ technology, concept, difficulty, existingCount }) {
  const { system, user } = buildGenerationPrompt({
    technology,
    concept,
    difficulty,
    existingCount,
  });

  const questionSchema = z.object({
    questionText: z.string().min(1),
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
      model: GENERATION_MODEL,
      stream: false,
      // Force a JSON object so we get parseable output instead of prose.
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new AppError('No content from model', 500, 'AI_NO_CONTENT');

    let parsed;
    try {
      parsed = questionSchema.parse(JSON.parse(content));
    } catch {
      if (attempts >= 3) {
        throw new AppError('Failed to generate valid question', 500, 'AI_INVALID_OUTPUT');
      }
      continue;
    }

    // Trust the admin-supplied technology/concept/difficulty over the model's
    // echo of them, and persist for review.
    const persisted = await questionRepository.insertGeneratedQuestion({
      technology,
      concept,
      difficulty,
      difficultyScore: DIFFICULTY_SCORE[difficulty] ?? 0.5,
      text: parsed.questionText,
      options: parsed.options,
      correctIndex: parsed.correctIndex,
      model: GENERATION_MODEL,
      promptVersion: GENERATION_PROMPT_VERSION,
    });

    // A null row means the text already exists (idempotent insert).
    if (!persisted) {
      return { status: 'duplicate', question: { ...parsed, status: 'duplicate' } };
    }
    return { status: 'pending_review', question: persisted };
  }
}

module.exports = {
  explainAnswer,
  generateQuestions,
};
