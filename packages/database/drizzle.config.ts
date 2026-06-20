import type { Config } from 'drizzle-kit';
import * as dotenv from 'dotenv';
dotenv.config({ path: '../../.env' });

export default {
  schema: './src/schema.ts',
  out: './migrations',
  driver: 'pg',
  dbCredentials: {
    connectionString: process.env.DATABASE_URL || 'postgresql://coclerk:coclerk_password@localhost:5432/coclerk_dev',
  },
} satisfies Config;
