/**
 * Apply infra/gcp/sql/23_share_cards_language.sql to DATABASE_URL.
 *
 *   pnpm --filter @aura/backend-gcp migrate:share-language
 *   pnpm db:migrate:share-language
 */
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const sqlPath = path.join(__dirname, '..', '..', '..', 'infra', 'gcp', 'sql', '23_share_cards_language.sql');
const url = process.env.DATABASE_URL;

if (!url || !String(url).trim()) {
  console.error('[migrate:share-language] Set DATABASE_URL.');
  process.exit(1);
}

if (!fs.existsSync(sqlPath)) {
  console.error('[migrate:share-language] SQL file not found:', sqlPath);
  process.exit(1);
}

const sql = fs.readFileSync(sqlPath, 'utf8');

async function main() {
  const client = new Client({ connectionString: url });
  await client.connect();
  try {
    await client.query(sql);
    console.log('[migrate:share-language] Applied', path.basename(sqlPath), 'OK.');
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error('[migrate:share-language] Failed:', err?.message || err);
  process.exit(1);
});
