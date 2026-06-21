// src/middleware/validate.js
const { ValidationError } = require('../utils/errors');

/**
 * Validate a request against a Zod schema.
 * @param {import('zod').ZodTypeAny} schema
 * @param {'body'|'params'|'query'} source which part of the request to check
 *
 * For `body` the parsed/normalised output replaces req.body. `params` and
 * `query` are validated but not reassigned (req.query is read-only in Express 5).
 */
function validate(schema, source = 'body') {
  return (req, res, next) => {
    const result = schema.safeParse(req[source]);

    if (result.success) {
      if (source === 'body') req.body = result.data;
      return next();
    }

    const details = result.error.issues.map((err) => ({
      field: err.path.join('.'),
      issue: err.message,
    }));
    next(new ValidationError(details));
  };
}

module.exports = validate;
