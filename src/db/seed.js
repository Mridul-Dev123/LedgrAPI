import 'dotenv/config';

import bcrypt from 'bcryptjs';

import pool from '../config/db.js';

const SEED_USERS = [
  {
    name: 'System Admin',
    email: 'admin@ledgr.local',
    password: 'Admin123!',
    role: 'admin',
    isActive: true,
  },
  {
    name: 'Finance Analyst',
    email: 'analyst@ledgr.local',
    password: 'Analyst123!',
    role: 'analyst',
    isActive: true,
  },
  {
    name: 'Dashboard Viewer',
    email: 'viewer@ledgr.local',
    password: 'Viewer123!',
    role: 'viewer',
    isActive: true,
  },
  {
    name: 'Inactive Viewer',
    email: 'inactive@ledgr.local',
    password: 'Inactive123!',
    role: 'viewer',
    isActive: false,
  },
];

const SEED_TRANSACTIONS = [
  {
    amount: 5200,
    type: 'income',
    category: 'Salary',
    date: '2026-01-05',
    notes: '[seed] January salary',
    createdByEmail: 'admin@ledgr.local',
  },
  {
    amount: 180,
    type: 'expense',
    category: 'Groceries',
    date: '2026-01-07',
    notes: '[seed] Weekly groceries',
    createdByEmail: 'admin@ledgr.local',
  },
  {
    amount: 1200,
    type: 'expense',
    category: 'Rent',
    date: '2026-01-10',
    notes: '[seed] Monthly rent',
    createdByEmail: 'admin@ledgr.local',
  },
  {
    amount: 320,
    type: 'income',
    category: 'Freelance',
    date: '2026-01-14',
    notes: '[seed] Freelance dashboard project',
    createdByEmail: 'analyst@ledgr.local',
  },
  {
    amount: 95,
    type: 'expense',
    category: 'Utilities',
    date: '2026-01-16',
    notes: '[seed] Electricity bill',
    createdByEmail: 'analyst@ledgr.local',
  },
  {
    amount: 250,
    type: 'expense',
    category: 'Transport',
    date: '2026-01-18',
    notes: '[seed] Fuel and commute',
    createdByEmail: 'analyst@ledgr.local',
  },
  {
    amount: 5400,
    type: 'income',
    category: 'Salary',
    date: '2026-02-05',
    notes: '[seed] February salary',
    createdByEmail: 'admin@ledgr.local',
  },
  {
    amount: 230,
    type: 'expense',
    category: 'Groceries',
    date: '2026-02-09',
    notes: '[seed] Grocery restock',
    createdByEmail: 'admin@ledgr.local',
  },
  {
    amount: 1400,
    type: 'expense',
    category: 'Rent',
    date: '2026-02-10',
    notes: '[seed] February rent',
    createdByEmail: 'admin@ledgr.local',
  },
  {
    amount: 600,
    type: 'income',
    category: 'Bonus',
    date: '2026-02-20',
    notes: '[seed] Performance bonus',
    createdByEmail: 'admin@ledgr.local',
  },
  {
    amount: 410,
    type: 'income',
    category: 'Freelance',
    date: '2026-03-03',
    notes: '[seed] API consulting',
    createdByEmail: 'analyst@ledgr.local',
  },
  {
    amount: 110,
    type: 'expense',
    category: 'Internet',
    date: '2026-03-06',
    notes: '[seed] Internet bill',
    createdByEmail: 'analyst@ledgr.local',
  },
  {
    amount: 5450,
    type: 'income',
    category: 'Salary',
    date: '2026-03-05',
    notes: '[seed] March salary',
    createdByEmail: 'admin@ledgr.local',
  },
  {
    amount: 260,
    type: 'expense',
    category: 'Dining',
    date: '2026-03-12',
    notes: '[seed] Team dinner',
    createdByEmail: 'admin@ledgr.local',
  },
  {
    amount: 700,
    type: 'transfer',
    category: 'Savings',
    date: '2026-03-15',
    notes: '[seed] Transfer to savings account',
    createdByEmail: 'admin@ledgr.local',
  },
];

const serializeCredentials = (users) =>
  users.map(({ role, email, password, isActive }) => ({
    role,
    email,
    password,
    isActive,
  }));

const insertOrUpdateSeedUser = async (client, user) => {
  const saltRounds = Number(process.env.BCRYPT_SALT_ROUNDS) || 10;
  const passwordHash = await bcrypt.hash(user.password, saltRounds);

  const result = await client.query(
    `INSERT INTO users (name, email, password_hash, role, is_active)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (email) DO UPDATE
       SET name = EXCLUDED.name,
           password_hash = EXCLUDED.password_hash,
           role = EXCLUDED.role,
           is_active = EXCLUDED.is_active
     RETURNING id, email`,
    [user.name, user.email, passwordHash, user.role, user.isActive]
  );

  return result.rows[0];
};

const insertSeedTransactionIfMissing = async (client, transaction, userId) => {
  const result = await client.query(
    `INSERT INTO transactions (amount, type, category, date, notes, created_by)
     SELECT
       $1::numeric(14, 2),
       $2::varchar(20),
       $3::varchar(100),
       $4::date,
       $5::text,
       $6::bigint
     WHERE NOT EXISTS (
       SELECT 1
       FROM transactions
       WHERE amount = $1::numeric(14, 2)
         AND type = $2::varchar(20)
         AND category = $3::varchar(100)
         AND date = $4::date
         AND notes = $5::text
         AND created_by = $6::bigint
     )
     RETURNING id`,
    [
      transaction.amount,
      transaction.type,
      transaction.category,
      transaction.date,
      transaction.notes,
      userId,
    ]
  );

  return result.rowCount > 0;
};

async function run() {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const userIdByEmail = new Map();

    for (const user of SEED_USERS) {
      const savedUser = await insertOrUpdateSeedUser(client, user);
      userIdByEmail.set(savedUser.email, savedUser.id);
    }

    let insertedTransactions = 0;

    for (const transaction of SEED_TRANSACTIONS) {
      const userId = userIdByEmail.get(transaction.createdByEmail);

      if (!userId) {
        throw new Error(`Seed user not found for email ${transaction.createdByEmail}`);
      }

      const inserted = await insertSeedTransactionIfMissing(client, transaction, userId);

      if (inserted) {
        insertedTransactions += 1;
      }
    }

    await client.query('COMMIT');

    console.log('Seed completed successfully.');
    console.log(`Users upserted: ${SEED_USERS.length}`);
    console.log(`Transactions inserted: ${insertedTransactions}`);
    console.log('Seed credentials:');
    console.table(serializeCredentials(SEED_USERS));
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Seed failed:', error.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

run();
