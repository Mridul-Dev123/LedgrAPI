import { Pool } from 'pg';

const pool = new Pool({
  // Prefer explicit PG_URL, then Railway/hosted DATABASE_URL, then broken-down DB_* values.
  connectionString: process.env.PG_URL || process.env.DATABASE_URL,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : undefined,
  database: process.env.DB_NAME,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

export default pool;
