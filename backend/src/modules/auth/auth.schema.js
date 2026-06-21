//backend/modules/auth/auth.schema.js
const { z } = require('zod');

//Register Schema
const registerSchema = z.object({
  email: z
    .string()
    .email('Invalid email format')
    .max(255, 'Email must be at most 255 characters')
    .transform((val) => val.toLowerCase().trim()),

  password: z
    .string()
    .min(8, 'Password must be atleast 8 characters')
    .max(128, 'Password must be at most 128 characters'),
});

const loginSchema = z.object({
  email: z
    .string()
    .email('Invalid email format')
    .max(255, 'Email must be at most 255 characters')
    .transform((val) => val.toLowerCase().trim()),

  password: z
    .string()
    .min(8, 'Password must be atleast 8 characters')
    .max(128, 'Password must be at most 128 characters'),
});

module.exports = { registerSchema, loginSchema };
