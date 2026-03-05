import { Pool } from 'pg';

// DATABASE_URL example:
// postgres://user:password@host:port/awa_db
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL env var is required for backend-gcp');
}

export const pool = new Pool({
  connectionString: databaseUrl,
});

export async function withClient<T>(fn: (client: Pool) => Promise<T>): Promise<T> {
  // For now we just reuse the pool; if we need per-request clients/transactions
  // we can extend this helper.
  return fn(pool);
}

