// src/modules/ai/ai.schema.js
const { z } = require('zod');

// POST /ai/explain — only the question id and the chosen wrong option index.
const explainSchema = z.object({
  questionId: z.string().uuid(),
  wrongAnswerIndex: z.number().int().min(0).max(3),
});

// POST /ai/generate — admin-only question generation.
const generateSchema = z.object({
  technology: z.string().min(1),
  concept: z.string().min(1),
  difficulty: z.enum(['basic', 'intermediate', 'advanced']),
  existingCount: z.number().int().min(0).optional().default(0),
});

module.exports = { explainSchema, generateSchema };
