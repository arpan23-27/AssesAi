const { rateLimit, ipKeyGenerator } = require('express-rate-limit');
const { AppError } = require('../utils/errors');

const isTest = process.env.NODE_ENV === 'test';

// Shared error handler for consistent shape
function rateLimitHandler(req, res, next, _options) {
  next(new AppError('Too many requests', 429, 'RATE_LIMIT_EXCEEDED'));
}

// In test mode, limiters are no-ops
const noop = (req, res, next) => next();

// Global limiter — applies to all routes
const globalLimiter = isTest
  ? noop
  : rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100,
      handler: rateLimitHandler,
      keyGenerator: (req) => ipKeyGenerator(req),
    });

// Auth limiter — stricter, brute force protection
const authLimiter = isTest
  ? noop
  : rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 10,
      handler: rateLimitHandler,
      keyGenerator: (req) => ipKeyGenerator(req),
    });

// AI limiter — tied to user identity for cost control.
// Keyed on req.user.sub (the JWT subject); falls back to IP for safety.
const aiLimiter = isTest
  ? noop
  : rateLimit({
      windowMs: 60 * 1000,
      max: 20, // relaxed for dev/testing
      handler: rateLimitHandler,
      keyGenerator: (req) => req.user?.sub || ipKeyGenerator(req),
    });

module.exports = {
  globalLimiter,
  authLimiter,
  aiLimiter,
};
