/**
 * Apply infra/gcp/sql/22_share_and_referral.sql to DATABASE_URL.
 *
 *   pnpm --filter @aura/backend-gcp migrate:share-referral
 *   pnpm db:migrate:share-referral
 */
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const sqlPath = path.join(__dirname, '..', '..', '..', 'infra', 'gcp', 'sql', '22_share_and_referral.sql');
const url = process.env.DATABASE_URL;

if (!url || !String(url).trim()) {
  console.error('[migrate:share-referral] Set DATABASE_URL.');
  process.exit(1);
}

if (!fs.existsSync(sqlPath)) {
  console.error('[migrate:share-referral] SQL file not found:', sqlPath);
  process.exit(1);
}

const sql = fs.readFileSync(sqlPath, 'utf8');

async function main() {
  const client = new Client({ connectionString: url });
  await client.connect();
  try {
    await client.query(sql);
    console.log('[migrate:share-referral] Applied', path.basename(sqlPath), 'OK.');
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error('[migrate:share-referral] Failed:', err?.message || err);
  process.exit(1);
});
