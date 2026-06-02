#!/usr/bin/env node
/**
 * Verify participant_preference_snapshots for a user (requires psql + Cloud SQL proxy).
 *
 * Usage:
 *   cd apps/frontend && USER_HASH=user_xxx pnpm verify:preference-snapshots
 *   PGPORT=15432 USER_HASH=user_xxx pnpm verify:preference-snapshots
 */

import dotenv from 'dotenv';
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const frontendRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
for (const name of ['.env', '.env.local']) {
  const p = resolve(frontendRoot, name);
  if (existsSync(p)) dotenv.config({ path: p, override: name === '.env.local' });
}

const userHash = process.env.USER_HASH || process.argv[2];
const host = process.env.PGHOST || '127.0.0.1';
const port = process.env.PGPORT || '15432';
const user = process.env.PGUSER || 'awa_app';
const database = process.env.PGDATABASE || 'awa_db';
const password = process.env.PGPASSWORD || process.env.HASLO_BAZY;

if (!userHash) {
  console.error('[verify-preference-snapshots] Set USER_HASH or pass as first argument');
  process.exit(2);
}
if (!password) {
  console.error('[verify-preference-snapshots] Set PGPASSWORD or HASLO_BAZY in .env.local');
  process.exit(2);
}

const sql = `
SELECT COUNT(*)::int AS snapshot_count
FROM participant_preference_snapshots
WHERE user_hash = '${userHash.replace(/'/g, "''")}';

SELECT created_at, source, milestone, content_hash, explicit_style, explicit_palette
FROM participant_preference_snapshots
WHERE user_hash = '${userHash.replace(/'/g, "''")}'
ORDER BY created_at DESC, id DESC
LIMIT 5;
`;

const result = spawnSync(
  'psql',
  ['-h', host, '-p', port, '-U', user, '-d', database, '-v', 'ON_ERROR_STOP=1', '-c', sql],
  {
    env: { ...process.env, PGPASSWORD: password },
    encoding: 'utf8',
  },
);

if (result.error) {
  console.error('[verify-preference-snapshots] psql not found or failed:', result.error.message);
  process.exit(2);
}

process.stdout.write(result.stdout || '');
if (result.stderr) process.stderr.write(result.stderr);

if (result.status !== 0) {
  console.error('[verify-preference-snapshots] FAIL (is migration 20 applied? proxy on', port, '?)');
  process.exit(1);
}

if (/relation "participant_preference_snapshots" does not exist/i.test(result.stderr || '')) {
  console.error('[verify-preference-snapshots] Table missing — run infra/gcp/scripts/apply-migrations-20.ps1');
  process.exit(1);
}

console.log('[verify-preference-snapshots] OK');
