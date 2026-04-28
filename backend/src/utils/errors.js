// backend/utils/errors.js

class AppError extends Error {
  constructor(message, code, statusCode, details = null) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    this.name = this.constructor.name;
Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends AppError {
  constructor(details) {
    super('Validation failed', 'VALIDATION_ERROR', 400, details);
  }
}

class DuplicateEmailError extends AppError {
  constructor(details) {
    super('Email already registered', 'DUPLICATE_EMAIL', 409, details);
  }
}

class InvalidCredentialsError extends AppError {
  constructor(details) {
    super('Invalid credentials', 'INVALID_CREDENTIALS', 401, details);
  }
}

class TokenExpiredError extends AppError {
  constructor() {
    super('Token expired', 'TOKEN_EXPIRED', 401);
  }
}

class TokenInvalidError extends AppError {
  constructor() {
    super('Invalid token', 'TOKEN_INVALID', 403);
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