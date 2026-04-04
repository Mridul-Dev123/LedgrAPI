import cors from 'cors';
import cookieParser from 'cookie-parser';
import express from 'express';
import swaggerUi from 'swagger-ui-express';

import swaggerSpec from './docs/swagger.js';
import authRouter from './routes/auth.routes.js';
import dashboardRouter from './routes/dashboard.routes.js';
import { apiLimiter } from './middleware/rateLimit.js';
import transactionRouter from './routes/transactions.routes.js';
import userRouter from './routes/users.routes.js';
import { ApiError } from './utils/index.js';

const app = express();

// Trust first proxy (Railway/Render/etc.) so req.ip and rate-limiters see client IP correctly.
app.set('trust proxy', 1);

app.use(
  cors({
    origin: true,
    credentials: true,
  })
);
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));
app.use(cookieParser());

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Check API health
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Server is healthy.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Server is healthy
 */
app.get('/health', (_req, res) => {
  res.status(200).json({ success: true, message: 'Server is healthy' });
});

app.get('/api-docs.json', (_req, res) => {
  res.status(200).json(swaggerSpec);
});
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, { explorer: true }));

app.use('/api/v1', apiLimiter);
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/dashboard', dashboardRouter);
app.use('/api/v1/transactions', transactionRouter);
app.use('/api/v1/users', userRouter);

app.use((req, _res, next) => {
  next(new ApiError(404, `Route ${req.method} ${req.originalUrl} was not found`));
});

app.use((err, _req, res, _next) => {
  let normalizedError = err;

  if (err?.type === 'entity.parse.failed') {
    normalizedError = new ApiError(400, 'Request body contains invalid JSON', [
      {
        field: 'body',
        message: 'Request body contains invalid JSON',
        code: 'entity.parse.failed',
      },
    ]);
  } else if (err?.type === 'entity.too.large') {
    normalizedError = new ApiError(413, 'Request body is too large', [
      {
        field: 'body',
        message: 'Request body is too large',
        code: 'entity.too.large',
      },
    ]);
  } else if (err?.code === '22P02') {
    normalizedError = new ApiError(400, 'Request contains a value with an invalid format');
  } else if (err?.code === '23503') {
    normalizedError = new ApiError(
      409,
      'Request references a related resource that does not exist'
    );
  } else if (err?.code === '23514' || err?.code === '23502') {
    normalizedError = new ApiError(400, 'Request violates a database validation rule');
  } else if (!(err instanceof ApiError)) {
    normalizedError = new ApiError(500, 'Internal server error');
  }

  const statusCode = normalizedError.statusCode || 500;

  if (statusCode >= 500) {
    console.error(err);
  }

  res.status(statusCode).json({
    success: false,
    statusCode,
    message: normalizedError.message || 'Internal server error',
    errors: normalizedError.errors || [],
  });
});

export default app;
