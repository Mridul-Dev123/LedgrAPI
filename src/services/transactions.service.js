import pool from '../config/db.js';
import { ApiError } from '../utils/index.js';

const serializeTransaction = (transaction) => ({
  id: transaction.id,
  amount: Number(transaction.amount),
  type: transaction.type,
  category: transaction.category,
  date:
    transaction.date instanceof Date
      ? transaction.date.toISOString().slice(0, 10)
      : transaction.date,
  notes: transaction.notes,
  createdBy: transaction.created_by,
  createdByName: transaction.created_by_name || null,
});

const TRANSACTION_SELECT = `
  SELECT
    t.id,
    t.amount,
    t.type,
    t.category,
    t.date,
    t.notes,
    t.created_by,
    u.name AS created_by_name
  FROM transactions t
  JOIN users u ON u.id = t.created_by
`;

const insertAuditLog = async (client, { action, entity, entityId, actorId, metadata }) => {
  await client.query(
    `INSERT INTO audit_logs (action, entity, entity_id, actor_id, metadata)
     VALUES ($1, $2, $3, $4, $5)`,
    [action, entity, entityId, actorId, JSON.stringify(metadata || {})]
  );
};

const listTransactionsService = async ({ type, category, startDate, endDate, search }) => {
  const conditions = ['t.is_deleted = FALSE'];
  const values = [];

  if (type) {
    values.push(type);
    conditions.push(`t.type = $${values.length}`);
  }

  if (category) {
    values.push(`%${category}%`);
    conditions.push(`t.category ILIKE $${values.length}`);
  }

  if (startDate) {
    values.push(startDate);
    conditions.push(`t.date >= $${values.length}`);
  }

  if (endDate) {
    values.push(endDate);
    conditions.push(`t.date <= $${values.length}`);
  }

  if (search) {
    values.push(`%${search}%`);
    conditions.push(`COALESCE(t.notes, '') ILIKE $${values.length}`);
  }

  const result = await pool.query(
    `${TRANSACTION_SELECT}
     WHERE ${conditions.join(' AND ')}
     ORDER BY t.date DESC, t.id DESC`,
    values
  );

  return result.rows.map(serializeTransaction);
};

const getTransactionByIdService = async (transactionId) => {
  const result = await pool.query(
    `${TRANSACTION_SELECT}
     WHERE t.id = $1
       AND t.is_deleted = FALSE
     LIMIT 1`,
    [transactionId]
  );

  const transaction = result.rows[0];

  if (!transaction) {
    throw new ApiError(404, 'Transaction not found');
  }

  return serializeTransaction(transaction);
};

const createTransactionService = async ({ amount, type, category, date, notes, createdBy }) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const result = await client.query(
      `INSERT INTO transactions (amount, type, category, date, notes, created_by)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      [amount, type, category, date, notes, createdBy]
    );

    const transactionId = result.rows[0].id;
    const transactionResult = await client.query(
      `${TRANSACTION_SELECT}
       WHERE t.id = $1
       LIMIT 1`,
      [transactionId]
    );

    await insertAuditLog(client, {
      action: 'transaction.created',
      entity: 'transaction',
      entityId: transactionId,
      actorId: createdBy,
      metadata: { amount, type, category, date },
    });

    await client.query('COMMIT');
    return serializeTransaction(transactionResult.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

const updateTransactionService = async ({ transactionId, updates, actorUserId }) => {
  const entries = Object.entries(updates);
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const existingResult = await client.query(
      `${TRANSACTION_SELECT}
       WHERE t.id = $1
         AND t.is_deleted = FALSE
       LIMIT 1`,
      [transactionId]
    );

    const existingTransaction = existingResult.rows[0];

    if (!existingTransaction) {
      throw new ApiError(404, 'Transaction not found');
    }

    const setClauses = entries.map(([field], index) => `${field} = $${index + 1}`);
    const values = entries.map(([, value]) => value);
    values.push(transactionId);

    const updatedResult = await client.query(
      `UPDATE transactions
       SET ${setClauses.join(', ')}
       WHERE id = $${values.length}
         AND is_deleted = FALSE
       RETURNING id`,
      values
    );

    const updatedTransactionId = updatedResult.rows[0].id;
    const transactionResult = await client.query(
      `${TRANSACTION_SELECT}
       WHERE t.id = $1
       LIMIT 1`,
      [updatedTransactionId]
    );

    await insertAuditLog(client, {
      action: 'transaction.updated',
      entity: 'transaction',
      entityId: updatedTransactionId,
      actorId: actorUserId,
      metadata: {
        previous: serializeTransaction(existingTransaction),
        updates,
      },
    });

    await client.query('COMMIT');
    return serializeTransaction(transactionResult.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

const deleteTransactionService = async ({ transactionId, actorUserId }) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const existingResult = await client.query(
      `${TRANSACTION_SELECT}
       WHERE t.id = $1
         AND t.is_deleted = FALSE
       LIMIT 1`,
      [transactionId]
    );

    const existingTransaction = existingResult.rows[0];

    if (!existingTransaction) {
      throw new ApiError(404, 'Transaction not found');
    }

    await client.query(
      `UPDATE transactions
       SET is_deleted = TRUE
       WHERE id = $1
         AND is_deleted = FALSE`,
      [transactionId]
    );

    await insertAuditLog(client, {
      action: 'transaction.deleted',
      entity: 'transaction',
      entityId: transactionId,
      actorId: actorUserId,
      metadata: { deletedTransaction: serializeTransaction(existingTransaction) },
    });

    await client.query('COMMIT');
    return serializeTransaction(existingTransaction);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export {
  createTransactionService,
  deleteTransactionService,
  getTransactionByIdService,
  listTransactionsService,
  updateTransactionService,
};
