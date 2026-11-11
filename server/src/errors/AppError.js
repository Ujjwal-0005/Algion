class AppError extends Error {
  constructor(code, message, details = undefined, statusCode = 400) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.details = details;
    this.statusCode = statusCode;
  }

  static validation(message = 'Validation error', details = undefined) {
    return new AppError('VALIDATION_ERROR', message, details, 400);
  }

  static unauthenticated(message = 'Authentication required') {
    return new AppError('UNAUTHENTICATED', message, undefined, 401);
  }

  static forbidden(message = 'Access forbidden') {
    return new AppError('FORBIDDEN', message, undefined, 403);
  }

  static notFound(message = 'Resource not found') {
    return new AppError('NOT_FOUND', message, undefined, 404);
  }

  static conflict(message = 'Conflict occurred', details = undefined) {
    return new AppError('CONFLICT', message, details, 409);
  }

  static insufficientStock(message = 'Insufficient stock', details = undefined) {
    return new AppError('INSUFFICIENT_STOCK', message, details, 400);
  }

  static invalidTransition(message = 'Invalid state transition', details = undefined) {
    return new AppError('INVALID_TRANSITION', message, details, 409);
  }

  static duplicateRequest(message = 'Duplicate request with different payload', details = undefined) {
    return new AppError('DUPLICATE_REQUEST', message, details, 409);
  }

  static paymentDeclined(message = 'Payment was declined', details = undefined) {
    return new AppError('PAYMENT_DECLINED', message, details, 400);
  }
}

module.exports = AppError;

