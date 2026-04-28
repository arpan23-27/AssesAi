// src/modules/ai/ai.service.js
const openai = require('../../config/openai');
const redis = require('../../config/redis');
const {
  buildExplanationPrompt,
  buildGenerationPrompt,
  EXPLANATION_PROMPT_VERSION,
  GENERATION_PROMPT_VERSION,
} = require('./prompts');
const { AppError } = require('../../utils/errors');
const { z } = require('zod');

/**
 * Stream an explanation for a wrong answer back to the client via SSE.
 */
async function explainAnswer({
  questionId,
  wrongAnswerIndex,
  questionText,
  correctAnswer,
  wrongAnswer,
  concept,
  technology,
  res,
  req,
}) {
  // 1. Build cache key
  const cacheKey = `explain:${questionId}:${wrongAnswerIndex}:${EXPLANATION_PROMPT_VERSION}`;

  // 2. Check Redis
  const cached = await redis.get(cacheKey);
  if (cached) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.write(`data: ${JSON.stringify({ text: cached })}\n\n`);
    res.write('data: [DONE]\n\n');
    res.end();
    return;
  }

  // 3. Build prompt
  const { system, user } = buildExplanationPrompt({
    questionText,
    correctAnswer,
    wrongAnswer,
    concept,
    technology,
  });

  // 4. Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  // 5. Call OpenAI with stream: true
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

  // 6. Abort if client disconnects
  req.on('close', () => {
    if (stream.controller) {
      stream.controller.abort();
    }
  });

  // 7–9. Streaming loop wrapped in try/catch/finally
  try {
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || '';
      if (content) {
        fullText += content;
        res.write(`data: ${JSON.stringify({ text: content })}\n\n`);
      }
    }
    // Cache full text in Redis with 7 day TTL
    await redis.set(cacheKey, fullText, 'EX', 60 * 60 * 24 * 7);
  } catch (err) {
    res.write(`data: ${JSON.stringify({ error: 'Stream interrupted' })}\n\n`);
  } finally {
    res.write('data: [DONE]\n\n');
    res.end();
  }
}

/**
 * Generate new quiz questions using OpenAI, with validation and retries.
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
    if (!content) throw new AppError('No content from OpenAI', 500, 'OPENAI_NO_CONTENT');

    try {
      const parsed = JSON.parse(content);
      const validated = questionSchema.parse(parsed);
      return validated;
    } catch (err) {
      if (attempts >= 3) {
        throw new AppError('Failed to generate valid question', 500, 'OPENAI_INVALID_OUTPUT');
      }
      // retry loop continues
    }
  }
}

module.exports = {
  explainAnswer,
  generateQuestions,
};