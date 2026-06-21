// src/modules/quiz/schema.js
const { z } = require('zod');

// Body schema for starting a quiz session.
const startSessionSchema = z.object({
  technologyId: z.number().int().positive(),
  difficulty: z.enum(['basic', 'intermediate', 'advanced']),
});

// Body schema for submitting an answer. questionId is a PostgreSQL UUID.
const submitAnswerSchema = z.object({
  questionId: z.string().uuid(),
  answerIndex: z.number().int().min(0).max(3),
});

// Param schema for any route carrying a session id in the path.
const sessionIdParamSchema = z.object({
  id: z.string().uuid(),
});

module.exports = {
  startSessionSchema,
  submitAnswerSchema,
  sessionIdParamSchema,
};
