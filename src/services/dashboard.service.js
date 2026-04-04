import pool from '../config/db.js';

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

const serializeNumericRow = (row, numericKeys) =>
  Object.fromEntries(
    Object.entries(row).map(([key, value]) => [
      key,
      numericKeys.includes(key) ? Number(value) : value,
    ])
  );

const NUMERIC_TREND_KEYS = ['transaction_count', 'total_amount'];

const serializeTrendRow = (row, periodKey) =>
  serializeNumericRow(
    {
      ...row,
      [periodKey]:
        row[periodKey] instanceof Date ? row[periodKey].toISOString().slice(0, 10) : row[periodKey],
    },
    NUMERIC_TREND_KEYS
  );

const getDashboardSummaryService = async ({ limit = 5 } = {}) => {
  const [summaryResult, recentTransactionsResult] = await Promise.all([
    pool.query(
      `SELECT
         COUNT(*) AS total_transactions,
         COUNT(*) FILTER (WHERE type = 'income') AS income_transactions,
         COUNT(*) FILTER (WHERE type = 'expense') AS expense_transactions,
         COUNT(*) FILTER (WHERE type = 'transfer') AS transfer_transactions,
         COALESCE(SUM(amount) FILTER (WHERE type = 'income'), 0) AS total_income,
         COALESCE(SUM(amount) FILTER (WHERE type = 'expense'), 0) AS total_expense,
         COALESCE(SUM(amount) FILTER (WHERE type = 'transfer'), 0) AS total_transfer_amount
       FROM transactions
       WHERE is_deleted = FALSE`
    ),
    pool.query(
      `SELECT
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
       WHERE t.is_deleted = FALSE
       ORDER BY t.date DESC, t.id DESC
       LIMIT $1`,
      [limit]
    ),
  ]);

  const summaryRow = serializeNumericRow(summaryResult.rows[0], [
    'total_transactions',
    'income_transactions',
    'expense_transactions',
    'transfer_transactions',
    'total_income',
    'total_expense',
    'total_transfer_amount',
  ]);

  return {
    ...summaryRow,
    netBalance: summaryRow.total_income - summaryRow.total_expense,
    recentTransactions: recentTransactionsResult.rows.map(serializeTransaction),
  };
};

const getDashboardInsightsService = async ({ startDate, endDate }) => {
  const conditions = ['is_deleted = FALSE'];
  const values = [];

  if (startDate) {
    values.push(startDate);
    conditions.push(`date >= $${values.length}`);
  }

  if (endDate) {
    values.push(endDate);
    conditions.push(`date <= $${values.length}`);
  }

  const whereClause = conditions.join(' AND ');

  // These queries are independent, so running them together keeps the dashboard endpoint responsive.
  const [categoryBreakdownResult, monthlyTrendResult, weeklyTrendResult] = await Promise.all([
    pool.query(
      `SELECT
         type,
         category,
         COUNT(*) AS transaction_count,
         COALESCE(SUM(amount), 0) AS total_amount
       FROM transactions
       WHERE ${whereClause}
       GROUP BY type, category
       ORDER BY type ASC, total_amount DESC, category ASC`,
      values
    ),
    pool.query(
      `SELECT
         DATE_TRUNC('month', date::timestamp)::date AS month,
         type,
         COUNT(*) AS transaction_count,
         COALESCE(SUM(amount), 0) AS total_amount
       FROM transactions
       WHERE ${whereClause}
       GROUP BY DATE_TRUNC('month', date::timestamp), type
       ORDER BY DATE_TRUNC('month', date::timestamp) ASC, type ASC`,
      values
    ),
    pool.query(
      `SELECT
         DATE_TRUNC('week', date::timestamp)::date AS week_start,
         type,
         COUNT(*) AS transaction_count,
         COALESCE(SUM(amount), 0) AS total_amount
       FROM transactions
       WHERE ${whereClause}
       GROUP BY DATE_TRUNC('week', date::timestamp), type
       ORDER BY DATE_TRUNC('week', date::timestamp) ASC, type ASC`,
      values
    ),
  ]);

  return {
    filters: {
      startDate: startDate || null,
      endDate: endDate || null,
    },
    categoryBreakdown: categoryBreakdownResult.rows.map((row) =>
      serializeNumericRow(row, ['transaction_count', 'total_amount'])
    ),
    // Using the first day of the month keeps month buckets easy to sort and chart on the client.
    monthlyTrend: monthlyTrendResult.rows.map((row) => serializeTrendRow(row, 'month')),
    // PostgreSQL week buckets start at the week boundary, which is useful for week-over-week comparisons.
    weeklyTrend: weeklyTrendResult.rows.map((row) => serializeTrendRow(row, 'week_start')),
  };
};

export { getDashboardInsightsService, getDashboardSummaryService };
