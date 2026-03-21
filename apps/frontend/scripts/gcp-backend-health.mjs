#!/usr/bin/env node
/**
 * Szybki test dostępności backendu GCP (Cloud Run) — health + debug DB.
 *
 * Wczytuje opcjonalnie `apps/frontend/.env` oraz `.env.local` (jak Next.js),
 * żeby `pnpm verify:gcp-health` działał bez ręcznego exportu zmiennych.
 *
 * Użycie:
 *   cd apps/frontend && pnpm verify:gcp-health
 * Albo z URL w shellu: $env:NEXT_PUBLIC_GCP_API_BASE_URL="https://....run.app" (PowerShell)
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

const raw =
  process.env.NEXT_PUBLIC_GCP_API_BASE_URL ||
  process.env.GCP_API_BASE_URL ||
  '';
const base = raw.replace(/\/$/, '');

if (!base) {
  console.error(
    '[gcp-backend-health] Brak NEXT_PUBLIC_GCP_API_BASE_URL (lub GCP_API_BASE_URL).',
  );
  console.error(
    '  Ustaw NEXT_PUBLIC_GCP_API_BASE_URL w apps/frontend/.env.local (lub w shellu).',
  );
  process.exit(2);
}

async function check(path) {
  const url = `${base}${path.startsWith('/') ? path : `/${path}`}`;
  const res = await fetch(url, { method: 'GET' });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = null;
  }
  return { url, status: res.status, ok: res.ok, text, json };
}

async function main() {
  console.log('[gcp-backend-health] Base URL:', base);
  for (const path of ['/health', '/api/debug/participants-auth-column']) {
    const r = await check(path);
    const label = `${r.status} ${path}`;
    if (r.ok) {
      console.log(`OK   ${label}`);
      if (r.json) console.log(JSON.stringify(r.json, null, 2));
      else console.log(r.text.slice(0, 400));
    } else {
      console.error(`FAIL ${label}`);
      console.error(r.text.slice(0, 800));
      process.exitCode = 1;
    }
  }
}

main().catch((e) => {
  console.error('[gcp-backend-health]', e);
  process.exit(1);
});
