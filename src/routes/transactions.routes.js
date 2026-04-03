import { Router } from 'express';

import {
  createTransaction,
  deleteTransaction,
  getTransactionById,
  listTransactions,
  updateTransaction,
} from '../controllers/transaction.controller.js';
import verifyJWT from '../middleware/auth.js';
import { mutationLimiter } from '../middleware/rateLimit.js';
import requireRoles from '../middleware/rbac.js';
import validate from '../middleware/validate.js';
import {
  createTransactionRequest,
  listTransactionsRequest,
  transactionIdParams,
  updateTransactionRequest,
} from '../validators/request.schemas.js';

const transactionRouter = Router();

transactionRouter.use(verifyJWT);

transactionRouter.get(
  '/',
  requireRoles('analyst', 'admin'),
  validate(listTransactionsRequest),
  listTransactions
);
transactionRouter.get(
  '/:transactionId',
  requireRoles('analyst', 'admin'),
  validate(transactionIdParams),
  getTransactionById
);
transactionRouter.post(
  '/',
  requireRoles('admin'),
  mutationLimiter,
  validate(createTransactionRequest),
  createTransaction
);
transactionRouter.patch(
  '/:transactionId',
  requireRoles('admin'),
  mutationLimiter,
  validate(updateTransactionRequest),
  updateTransaction
);
transactionRouter.delete(
  '/:transactionId',
  requireRoles('admin'),
  mutationLimiter,
  validate(transactionIdParams),
  deleteTransaction
);

export default transactionRouter;
