// src/utils/errors.js
//
// AppError signature is (message, statusCode, code, details).
// statusCode is the numeric HTTP status; code is a stable machine-readable
// string. This matches how the error is thrown across the services, e.g.
//   throw new AppError('Session not found', 404, 'SESSION_NOT_FOUND')

class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR', details = null) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends AppError {
  constructor(details) {
    super('Validation failed', 400, 'VALIDATION_ERROR', details);
  }
}

class DuplicateEmailError extends AppError {
  constructor(details) {
    super('Email already registered', 409, 'DUPLICATE_EMAIL', details);
  }
}

class InvalidCredentialsError extends AppError {
  constructor(details) {
    super('Invalid credentials', 401, 'INVALID_CREDENTIALS', details);
  }
}

class TokenExpiredError extends AppError {
  constructor() {
    super('Token expired', 401, 'TOKEN_EXPIRED');
  }
}

class TokenInvalidError extends AppError {
  constructor() {
    super('Invalid token', 403, 'TOKEN_INVALID');
  }
}

module.exports = {
  AppError,
  ValidationError,
  DuplicateEmailError,
  InvalidCredentialsError,
  TokenExpiredError,
  TokenInvalidError,
};
