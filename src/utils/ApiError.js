class ApiError extends Error {
  constructor(statusCode, message = 'Something went wrong', error = [], stack = '') {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.data = null;
    this.message = message;
    this.success = false;
    this.errors = error;
    this.isOperational = true;
    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

export default ApiError;
