/**
 * Grant credits to a user_hash in Cloud SQL (dev / ops).
 *
 * Usage:
 *   $env:DATABASE_URL = "postgresql://..."
 *   node scripts/grant-dev-credits.cjs <user_hash> [amount]
 *
 * If DATABASE_URL is unset, reads apps/frontend/.env.local (DATABASE_URL=...).
 */
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const userHash = process.argv[2];
const amount = Math.max(1, parseInt(process.argv[3] || '500000', 10) || 500000);

function loadDatabaseUrlFromEnvLocal() {
  const envLocal = path.join(__dirname, '..', '..', '..', 'apps', 'frontend', '.env.local');
  if (!fs.existsSync(envLocal)) return null;
  const text = fs.readFileSync(envLocal, 'utf8');
  const m = text.match(/^\s*DATABASE_URL\s*=\s*(.+)$/m);
  if (!m) return null;
  return m[1].trim().replace(/^['"]|['"]$/g, '');
}

let url = process.env.DATABASE_URL && String(process.env.DATABASE_URL).trim();
if (!url) url = loadDatabaseUrlFromEnvLocal();

if (!url) {
  console.error('[grant-dev-credits] Set DATABASE_URL or add it to apps/frontend/.env.local');
  process.exit(1);
}

if (!userHash || !userHash.startsWith('user_')) {
  console.error('[grant-dev-credits] Usage: node scripts/grant-dev-credits.cjs <user_hash> [amount]');
  process.exit(1);
}

async function main() {
  const client = new Client({ connectionString: url });
  await client.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      `
        INSERT INTO participants (user_hash, auth_user_id, consent_timestamp, updated_at)
        VALUES ($1, NULL, NOW(), NOW())
        ON CONFLICT (user_hash) DO UPDATE SET updated_at = NOW()
      `,
      [userHash]
    );
    await client.query(
      `
        INSERT INTO credit_transactions (user_hash, type, amount, source, generation_id, expires_at)
        VALUES ($1, 'grant', $2, 'dev_manual_grant', NULL, NULL)
      `,
      [userHash, amount]
    );
    await client.query('COMMIT');
    const { rows } = await client.query(
      `
        SELECT COALESCE(SUM(amount), 0)::text AS balance
        FROM credit_transactions
        WHERE user_hash = $1
          AND (expires_at IS NULL OR expires_at > NOW())
      `,
      [userHash]
    );
    console.log('[grant-dev-credits] OK. user_hash=', userHash, 'granted=', amount, 'balance=', rows[0]?.balance);
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {});
    throw e;
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  const msg = err?.message || String(err);
  console.error('[grant-dev-credits] Failed:', msg);
  if (/ETIMEDOUT|ECONNREFUSED/i.test(msg)) {
    console.error(
      '[grant-dev-credits] Hint: public IP often blocked (authorized networks / firewall). ' +
        'Use Cloud SQL Auth Proxy + DATABASE_URL on 127.0.0.1, or run: ' +
        'infra/gcp/grant-dev-credits-cloud.ps1 (GCS + gcloud sql import).',
    );
  }
  process.exit(1);
});
