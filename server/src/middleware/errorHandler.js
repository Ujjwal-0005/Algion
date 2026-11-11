const AppError = require('../errors/AppError');

function errorHandler(err, req, res, next) {
  // If headers already sent, delegate to default express handler
  if (res.headersSent) {
    return next(err);
  }

  // Handle known AppError
  if (err instanceof AppError) {
    const responsePayload = {
      error: {
        code: err.code,
        message: err.message
      }
    };
    if (err.details !== undefined) {
      responsePayload.error.details = err.details;
    }
    return res.status(err.statusCode).json(responsePayload);
  }

  // Handle ZodError
  if (err && err.name === 'ZodError') {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid request data',
        details: err.errors.map(e => ({
          path: e.path.join('.'),
          message: e.message
        }))
      }
    });
  }

  // Handle Mongoose ValidationError
  if (err && err.name === 'ValidationError') {
    const details = Object.keys(err.errors || {}).map(key => ({
      path: key,
      message: err.errors[key].message
    }));
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: err.message,
        details
      }
    });
  }

  // Handle Mongo duplicate key error (code 11000)
  if (err && (err.code === 11000 || err.code === 11001)) {
    return res.status(409).json({
      error: {
        code: 'CONFLICT',
        message: 'Resource already exists or duplicate key violated',
        details: err.keyValue
      }
    });
  }

  // Handle WriteConflict / TransientTransactionError that escaped retry
  if (err && (err.code === 112 || err.codeName === 'WriteConflict' || (err.hasErrorLabel && err.hasErrorLabel('TransientTransactionError')))) {
    return res.status(409).json({
      error: {
        code: 'CONFLICT',
        message: 'Write conflict or concurrent operation detected'
      }
    });
  }

  // Fallback for unhandled unexpected errors
  console.error('Unhandled server error:', err);
  return res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected internal error occurred'
    }
  });
}

module.exports = errorHandler;
