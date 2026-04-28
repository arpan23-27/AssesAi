//src/middleware/errorHandler
const { AppError } = require('../utils/errors');

function errorHandler(err, req, res, next) {
    const isDev = process.env.NODE_ENV === 'development';

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
        details: err.details || []
      }
    });
  }

 if (err.name === 'ZodError') {
  const issues = err.issues || [];
  const details = issues.map(e => ({
    field: e.path.join('.'),
    issue: e.message,
  }));
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid request payload',
        details
      }
    });
  }

  if (isDev) console.error('Unexpected error:', err);
  return res.status(500).json({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Something went wrong',
      details: isDev ? [err.stack] : []
    }
  });
}


module.exports = errorHandler;