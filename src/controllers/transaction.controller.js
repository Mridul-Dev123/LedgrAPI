import {
  createTransactionService,
  deleteTransactionService,
  getTransactionByIdService,
  listTransactionsService,
  updateTransactionService,
} from '../services/transactions.service.js';
import { ApiError, ApiResponse, asyncHandler } from '../utils/index.js';

const ALLOWED_TRANSACTION_TYPES = ['income', 'expense', 'transfer'];

const parsePositiveInteger = (value, fieldName) => {
  const parsedValue = Number(value);

  if (!Number.isInteger(parsedValue) || parsedValue <= 0) {
    throw new ApiError(400, `${fieldName} must be a valid positive integer`);
  }

  return parsedValue;
};

const parseAmount = (value) => {
  const parsedAmount = Number(value);

  if (!Number.isFinite(parsedAmount) || parsedAmount < 0) {
    throw new ApiError(400, 'Amount must be a valid number greater than or equal to 0');
  }

  return parsedAmount;
};

const parseDate = (value, fieldName) => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new ApiError(400, `${fieldName} must be in YYYY-MM-DD format`);
  }

  const parsedDate = new Date(`${value}T00:00:00.000Z`);

  if (Number.isNaN(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== value) {
    throw new ApiError(400, `${fieldName} must be a valid date`);
  }

  return value;
};

const parseOptionalDate = (value, fieldName) => {
  if (value === undefined) {
    return undefined;
  }

  return parseDate(value, fieldName);
};

const validateTransactionType = (type) => {
  if (!ALLOWED_TRANSACTION_TYPES.includes(type)) {
    throw new ApiError(400, 'Type must be one of: income, expense, transfer');
  }

  return type;
};

const listTransactions = asyncHandler(async (req, res) => {
  const type = req.query.type?.trim()?.toLowerCase();
  const category = req.query.category?.trim();
  const startDate = parseOptionalDate(req.query.startDate, 'startDate');
  const endDate = parseOptionalDate(req.query.endDate, 'endDate');
  const search = req.query.search?.trim();
  const page = req.query.page ? parsePositiveInteger(req.query.page, 'page') : 1;
  const limit = req.query.limit ? parsePositiveInteger(req.query.limit, 'limit') : 10;

  if (type) {
    validateTransactionType(type);
  }

  if (startDate && endDate && startDate > endDate) {
    throw new ApiError(400, 'startDate cannot be greater than endDate');
  }

  const paginatedResult = await listTransactionsService({
    type,
    category,
    startDate,
    endDate,
    search,
    page,
    limit,
  });

  return res
    .status(200)
    .json(new ApiResponse(200, paginatedResult, 'Transactions fetched successfully'));
});

const getTransactionById = asyncHandler(async (req, res) => {
  const transactionId = parsePositiveInteger(req.params.transactionId, 'transactionId');
  const transaction = await getTransactionByIdService(transactionId);

  return res
    .status(200)
    .json(new ApiResponse(200, transaction, 'Transaction fetched successfully'));
});

const createTransaction = asyncHandler(async (req, res) => {
  const { amount, type, category, date, notes } = req.body;

  if (!category?.trim()) {
    throw new ApiError(400, 'Category is required');
  }

  const transaction = await createTransactionService({
    amount: parseAmount(amount),
    type: validateTransactionType(type?.trim()?.toLowerCase()),
    category: category.trim(),
    date: parseDate(date, 'date'),
    notes: typeof notes === 'string' ? notes.trim() || null : null,
    createdBy: req.user.id,
  });

  return res
    .status(201)
    .json(new ApiResponse(201, transaction, 'Transaction created successfully'));
});

const updateTransaction = asyncHandler(async (req, res) => {
  const transactionId = parsePositiveInteger(req.params.transactionId, 'transactionId');
  const { amount, type, category, date, notes } = req.body;
  const updates = {};

  if (amount !== undefined) {
    updates.amount = parseAmount(amount);
  }

  if (type !== undefined) {
    updates.type = validateTransactionType(type?.trim()?.toLowerCase());
  }

  if (category !== undefined) {
    if (!category?.trim()) {
      throw new ApiError(400, 'Category cannot be empty');
    }

    updates.category = category.trim();
  }

  if (date !== undefined) {
    updates.date = parseDate(date, 'date');
  }

  if (notes !== undefined) {
    if (notes !== null && typeof notes !== 'string') {
      throw new ApiError(400, 'Notes must be a string or null');
    }

    updates.notes = typeof notes === 'string' ? notes.trim() || null : null;
  }

  if (Object.keys(updates).length === 0) {
    throw new ApiError(400, 'At least one transaction field is required to update');
  }

  const transaction = await updateTransactionService({
    transactionId,
    updates,
    actorUserId: req.user.id,
  });

  return res
    .status(200)
    .json(new ApiResponse(200, transaction, 'Transaction updated successfully'));
});

const deleteTransaction = asyncHandler(async (req, res) => {
  const transactionId = parsePositiveInteger(req.params.transactionId, 'transactionId');
  const deletedTransaction = await deleteTransactionService({
    transactionId,
    actorUserId: req.user.id,
  });

  return res
    .status(200)
    .json(new ApiResponse(200, deletedTransaction, 'Transaction deleted successfully'));
});

export {
  createTransaction,
  deleteTransaction,
  getTransactionById,
  listTransactions,
  updateTransaction,
};
