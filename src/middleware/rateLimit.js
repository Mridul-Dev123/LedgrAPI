import rateLimit from 'express-rate-limit';

const toPositiveInteger = (value, fallbackValue) => {
  const parsedValue = Number(value);

  if (!Number.isInteger(parsedValue) || parsedValue <= 0) {
    return fallbackValue;
  }

  return parsedValue;
};

const buildRateLimitResponse = (message) => ({
  success: false,
  statusCode: 429,
  message,
  errors: [],
});

const createJsonRateLimiter = ({ windowMs, max, message }) =>
  rateLimit({
    windowMs,
    max,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler: (req, res, _next, options) => {
      // Keep rate-limit responses in the same JSON shape as the rest of the API.
      const retryAfterSeconds = req.rateLimit?.resetTime
        ? Math.max(1, Math.ceil((req.rateLimit.resetTime.getTime() - Date.now()) / 1000))
        : undefined;

      if (retryAfterSeconds) {
        res.set('Retry-After', String(retryAfterSeconds));
      }

      return res.status(options.statusCode).json(buildRateLimitResponse(message));
    },
  });

const apiLimiter = createJsonRateLimiter({
  windowMs: toPositiveInteger(process.env.RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000),
  max: toPositiveInteger(process.env.RATE_LIMIT_MAX_REQUESTS, 300),
  message: 'Too many requests from this client. Please try again later.',
});

const authLimiter = createJsonRateLimiter({
  windowMs: toPositiveInteger(process.env.AUTH_RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000),
  max: toPositiveInteger(process.env.AUTH_RATE_LIMIT_MAX_REQUESTS, 10),
  message: 'Too many authentication attempts. Please try again later.',
});

const mutationLimiter = createJsonRateLimiter({
  windowMs: toPositiveInteger(process.env.MUTATION_RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000),
  max: toPositiveInteger(process.env.MUTATION_RATE_LIMIT_MAX_REQUESTS, 60),
  message: 'Too many write operations. Please slow down and try again later.',
});

export { apiLimiter, authLimiter, mutationLimiter };
