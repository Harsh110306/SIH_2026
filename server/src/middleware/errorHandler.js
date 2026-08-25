class AppError extends Error {
  constructor(message, statusCode = 500, errorCode = 'INTERNAL_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

function notFoundHandler(req, res, next) {
  const err = new AppError(`Resource not found: ${req.originalUrl}`, 404, 'NOT_FOUND');
  next(err);
}

function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || 500;
  const errorCode = err.errorCode || 'INTERNAL_ERROR';
  const isDev = process.env.NODE_ENV === 'development';

  // Log error details on server side
  console.error(`[API Error] ${req.method} ${req.originalUrl} | Code: ${errorCode} | Status: ${statusCode}`);
  if (err.stack && isDev) {
    console.error(err.stack);
  }

  res.status(statusCode).json({
    success: false,
    message: err.message || 'An unexpected internal server error occurred.',
    errorCode: errorCode,
    ...(isDev && { details: err.stack ? err.stack.split('\n')[1].trim() : null })
  });
}

module.exports = {
  AppError,
  notFoundHandler,
  errorHandler
};
