// src/modules/quiz/schema.js
const { z } = require('zod');

// Schema for starting a quiz session
const startSessionSchema = z.object({
  technologyId: z.number().int().positive(), // SERIAL PK from Postgres
  difficulty: z.enum(['basic', 'intermediate', 'advanced']),
});

// Schema for submitting an answer
const submitAnswerSchema = z.object({
  questionId: z.string(), // MongoDB ObjectId as string
  answerIndex: z.number().int().min(0).max(3),
});

module.exports = {
  startSessionSchema,
  submitAnswerSchema,
};