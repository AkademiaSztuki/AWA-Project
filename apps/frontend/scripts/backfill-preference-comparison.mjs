#!/usr/bin/env node
/**
 * Re-map participant from GET /api/session and POST /api/session (preference_comparison_json).
 *
 * Usage:
 *   cd apps/frontend && USER_HASH=user_xxx pnpm exec tsx scripts/backfill-preference-comparison.mjs
 */

import dotenv from 'dotenv';
import { existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const frontendRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
for (const name of ['.env', '.env.local']) {
  const p = resolve(frontendRoot, name);
  if (existsSync(p)) dotenv.config({ path: p, override: name === '.env.local' });
}

const base = (
  process.env.NEXT_PUBLIC_GCP_API_BASE_URL ||
  process.env.GCP_API_BASE_URL ||
  ''
).replace(/\/$/, '');
const userHash = process.env.USER_HASH || process.argv[2];

if (!base || !userHash) {
  console.error('Need NEXT_PUBLIC_GCP_API_BASE_URL and USER_HASH');
  process.exit(2);
}

async function main() {
  const getRes = await fetch(`${base}/api/session/${encodeURIComponent(userHash)}`);
  const getJson = await getRes.json();
  if (!getRes.ok || !getJson.participant) {
    console.error('GET session failed', getRes.status, getJson);
    process.exit(1);
  }

  const { mapParticipantToSessionData, mapSessionDataToParticipant } = await import(
    '../src/lib/participants-mapper.ts'
  );

  const sessionData = mapParticipantToSessionData(getJson.participant);
  sessionData.userHash = userHash;
  const row = mapSessionDataToParticipant(sessionData);
  const participantRow = Object.fromEntries(
    Object.entries(row).filter(([, v]) => v !== undefined),
  );

  console.log('participantRow keys:', Object.keys(participantRow).length);
  console.log('has preference_comparison_json:', Boolean(participantRow.preference_comparison_json));
  console.log('style_match:', participantRow.style_match);

  const postRes = await fetch(`${base}/api/session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userHash, participantRow }),
  });
  const postText = await postRes.text();
  let postJson = null;
  try {
    postJson = JSON.parse(postText);
  } catch {
    postJson = { raw: postText.slice(0, 400) };
  }

  if (!postRes.ok) {
    console.error('POST session failed', postRes.status, postJson);
    process.exit(1);
  }

  console.log('POST ok', postJson);

  const verify = await fetch(`${base}/api/session/${encodeURIComponent(userHash)}`);
  const verifyJson = await verify.json();
  const p = verifyJson.participant || {};
  console.log('verify preference_comparison_json:', Boolean(p.preference_comparison_json));
  console.log('verify style_match:', p.style_match);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
