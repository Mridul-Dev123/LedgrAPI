import 'dotenv/config';

import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import pool from '../config/db.js';

// ES modules do not provide __filename/__dirname automatically,
// so we recreate them to locate the migrations folder.
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

// Creates a table that keeps track of which migration files
// have already been applied to the database.
async function ensureMigrationsTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id BIGSERIAL PRIMARY KEY,
      filename TEXT NOT NULL UNIQUE,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

// Reads the migrations directory, keeps only .sql files,
// and sorts them so they run in a predictable order.
async function getSqlMigrationFiles() {
  const files = await readdir(MIGRATIONS_DIR);
  return files.filter((file) => file.endsWith('.sql')).sort();
}

// Checks whether a specific migration filename is already
// stored in schema_migrations.
async function hasMigrationRun(client, filename) {
  const result = await client.query('SELECT 1 FROM schema_migrations WHERE filename = $1 LIMIT 1', [
    filename,
  ]);

  return result.rowCount > 0;
}

// Main migration runner.
async function run() {
  // Get one dedicated database connection from the pool.
  const client = await pool.connect();

  try {
    // Make sure the migration tracking table exists first.
    await ensureMigrationsTable(client);

    // Discover all SQL migration files in the migrations folder.
    const migrationFiles = await getSqlMigrationFiles();

    if (migrationFiles.length === 0) {
      console.log('No SQL migrations found.');
      return;
    }

    for (const filename of migrationFiles) {
      // Skip files that were already applied earlier.
      const alreadyApplied = await hasMigrationRun(client, filename);

      if (alreadyApplied) {
        console.log(`Skipping ${filename} (already applied)`);
        continue;
      }

      // Read the SQL text from the migration file.
      const filePath = path.join(MIGRATIONS_DIR, filename);
      const sql = await readFile(filePath, 'utf8');

      // Run each migration inside its own transaction so it either
      // completes fully or gets rolled back completely on failure.
      await client.query('BEGIN');
      try {
        await client.query(sql);

        // Record the migration only after the SQL succeeds.
        await client.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [filename]);

        await client.query('COMMIT');
        console.log(`Applied ${filename}`);
      } catch (error) {
        // Undo any partial changes from this migration.
        await client.query('ROLLBACK');
        throw error;
      }
    }

    console.log('Migration run complete.');
  } finally {
    // Always release the connection and close the pool,
    // even if a migration throws an error.
    client.release();
    await pool.end();
  }
}

// Start the script and exit with an error code if anything fails.
run().catch((error) => {
  console.error('Migration failed:', error.message);
  process.exit(1);
});
