import { Pool } from 'pg';

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/coclerk',
});

/**
 * Executes a query using the global Postgres pool.
 */
export async function query(text: string, params?: any[]) {
  return pool.query(text, params);
}
