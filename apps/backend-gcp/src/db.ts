import { Pool } from 'pg';

// DATABASE_URL: postgres://user:password@host:port/awa_db
// Na Cloud Run ustaw też CLOUD_SQL_CONNECTION_NAME (np. project:europe-west4:awa-research-sql)
// i przy deployu: --add-cloudsql-instances=CONNECTION_NAME — wtedy łączymy się przez socket, nie po publicznym IP.
const databaseUrl = process.env.DATABASE_URL;
const cloudSqlConnectionName = process.env.CLOUD_SQL_CONNECTION_NAME;

if (!databaseUrl) {
  throw new Error('DATABASE_URL env var is required for backend-gcp');
}

function buildPoolConfig(): ConstructorParameters<typeof Pool>[0] {
  if (cloudSqlConnectionName) {
    try {
      const u = new URL(databaseUrl!);
      const db = u.pathname ? u.pathname.replace(/^\//, '') || 'awa_db' : 'awa_db';
      return {
        user: u.username ? decodeURIComponent(u.username) : 'awa_app',
        password: u.password || undefined,
        database: db,
        host: `/cloudsql/${cloudSqlConnectionName}`,
      };
    } catch (e) {
      console.error('db: parse DATABASE_URL failed, using connectionString', (e as Error)?.message);
      return { connectionString: databaseUrl };
    }
  }
  return { connectionString: databaseUrl };
}

const poolConfig = buildPoolConfig();
export const pool = new Pool(poolConfig);

// Przy starcie: w logach Cloud Run widać, czy łączymy się przez socket (Cloud SQL) czy po URL
const isSocket = typeof (poolConfig as { host?: string }).host === 'string' && (poolConfig as { host?: string }).host?.startsWith('/cloudsql/');
console.log('[db] connection mode:', isSocket ? 'Cloud SQL socket' : 'DATABASE_URL (TCP)', isSocket ? (poolConfig as { host: string }).host : '(see DATABASE_URL)');

export async function withClient<T>(fn: (client: Pool) => Promise<T>): Promise<T> {
  // For now we just reuse the pool; if we need per-request clients/transactions
  // we can extend this helper.
  return fn(pool);
}

