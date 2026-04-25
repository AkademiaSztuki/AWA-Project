/**
 * Apply infra/gcp/sql/15_anon_usage.sql to the database pointed to by DATABASE_URL.
 *
 * Usage (PowerShell):
 *   $env:DATABASE_URL = "postgresql://awa_app:...@127.0.0.1:5432/awa_db"
 *   pnpm --filter @aura/backend-gcp migrate:anon-usage
 *
 * Or from repo root:
 *   pnpm db:migrate:anon-usage
 */
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const sqlPath = path.join(__dirname, '..', '..', '..', 'infra', 'gcp', 'sql', '15_anon_usage.sql');
const url = process.env.DATABASE_URL;

if (!url || !String(url).trim()) {
  console.error('[migrate:anon-usage] Set DATABASE_URL (e.g. Cloud SQL Proxy or public IP connection string).');
  process.exit(1);
}

if (!fs.existsSync(sqlPath)) {
  console.error('[migrate:anon-usage] SQL file not found:', sqlPath);
  process.exit(1);
}

const sql = fs.readFileSync(sqlPath, 'utf8');

async function main() {
  const client = new Client({ connectionString: url });
  await client.connect();
  try {
    await client.query(sql);
    console.log('[migrate:anon-usage] Applied', path.basename(sqlPath), 'OK.');
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error('[migrate:anon-usage] Failed:', err?.message || err);
  process.exit(1);
});
