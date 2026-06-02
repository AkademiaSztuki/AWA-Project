#!/usr/bin/env node
/**
 * Minimal full-flow participant persistence check (session row + image count).
 *
 * Usage:
 *   cd apps/frontend && USER_HASH=user_xxx pnpm verify:participant-full
 */

import dotenv from 'dotenv';
import { existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const frontendRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
for (const name of ['.env', '.env.local']) {
  const p = resolve(frontendRoot, name);
  if (existsSync(p)) {
    dotenv.config({ path: p, override: name === '.env.local' });
  }
}

const base = (
  process.env.NEXT_PUBLIC_GCP_API_BASE_URL ||
  process.env.GCP_API_BASE_URL ||
  ''
).replace(/\/$/, '');

const userHash = process.env.USER_HASH || process.argv[2];

if (!base) {
  console.error('[verify-participant-full] Missing NEXT_PUBLIC_GCP_API_BASE_URL');
  process.exit(2);
}
if (!userHash) {
  console.error('[verify-participant-full] Set USER_HASH or pass as first argument');
  process.exit(2);
}

async function getJson(path) {
  const url = `${base}${path.startsWith('/') ? path : `/${path}`}`;
  const res = await fetch(url);
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text.slice(0, 500) };
  }
  return { url, status: res.status, ok: res.ok, json };
}

async function main() {
  console.log('[verify-participant-full] userHash:', userHash);
  const session = await getJson(`/api/session/${encodeURIComponent(userHash)}`);
  const images = await getJson(`/api/participants/${encodeURIComponent(userHash)}/images`);

  const participant = session.json?.participant ?? null;
  const imageList = Array.isArray(images.json?.images) ? images.json.images : [];
  const ok =
    session.ok &&
    !!participant &&
    typeof participant.user_hash === 'string' &&
    images.ok;

  console.log('session:', session.status, session.ok ? 'ok' : 'fail');
  if (participant) {
    console.log('  current_step:', participant.current_step ?? '(null)');
    console.log('  path_type:', participant.path_type ?? '(null)');
    console.log('  generations_count:', participant.generations_count ?? '(null)');
    console.log('  blind_selection_made:', participant.blind_selection_made ?? '(null)');
  } else {
    console.log('  participant: missing');
  }

  console.log('images:', images.status, images.ok ? 'ok' : 'fail', `count=${imageList.length}`);

  if (!ok) {
    process.exit(1);
  }
  console.log('[verify-participant-full] PASS');
}

main().catch((e) => {
  console.error('[verify-participant-full]', e);
  process.exit(1);
});
