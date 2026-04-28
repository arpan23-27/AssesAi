// src/middleware/validate.js
const { ValidationError } = require('../utils/errors');

function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);

    if (result.success) {
      // Replace req.body with parsed + normalized output
      req.body = result.data;
      return next();
    }

    // Map Zod errors into [{ field, issue }] format
   const details = result.error.issues.map(err => ({
  field: err.path.join('.'),
  issue: err.message,
}));
    next(new ValidationError(details));
  };
}

module.exports = validate;