import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';

// Inline .env loader — replaces the `dotenv` runtime dep (which is not declared
// in this package's package.json). Same semantics as `dotenv.config()`:
// existing process.env wins; only unset keys are populated from the file.
function loadEnvFile(filepath: string) {
  try {
    const text = fs.readFileSync(filepath, 'utf8');
    for (const line of text.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      if (!(key in process.env)) process.env[key] = value;
    }
  } catch {
    // .env absent — fall through to whatever is already in process.env.
  }
}
loadEnvFile(path.resolve(__dirname, '../../../.env'));

const connectionString = process.env.DATABASE_URL || 'postgres://coclerk:coclerk_password@localhost:5432/coclerk_dev';

async function runMigrations() {
  console.log('Running migrations...');
  const pool = new Pool({ connectionString, max: 1 });
  const db = drizzle(pool);

  await migrate(db, { migrationsFolder: './migrations' });

  console.log('Migrations completed successfully.');
  await pool.end();
}

runMigrations().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
