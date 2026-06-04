import type { PoolClient } from 'pg';

/** Tables with FK user_hash → participants; reassigned when consolidating rows. */
const USER_HASH_CHILD_TABLES = [
  'participant_swipes',
  'participant_generations',
  'participant_images',
  'participant_spaces',
  'participant_matrix_entries',
  'participant_research_events',
  'participant_preference_snapshots',
  'subscriptions',
  'credit_transactions',
] as const;

type ParticipantRow = Record<string, unknown> & {
  user_hash: string;
  auth_user_id?: string | null;
};

function num(v: unknown): number {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

/** Higher = more research progress on this participant row. */
export function participantRichnessScore(row: ParticipantRow): number {
  let score = 0;
  if (row.big5_completed_at) score += 50;
  if (row.core_profile_complete === true) score += 30;
  score += num(row.generations_count) * 5;
  score += num(row.tinder_total_swipes);
  score += num(row.inspirations_count) * 2;
  if (row.session_export_json != null) score += 20;
  if (row.big5_responses != null) score += 10;
  if (row.path_type) score += 5;
  return score;
}

async function loadParticipant(
  client: PoolClient,
  userHash: string,
): Promise<ParticipantRow | null> {
  const { rows } = await client.query<ParticipantRow>(
    `SELECT * FROM participants WHERE user_hash = $1 LIMIT 1`,
    [userHash],
  );
  return rows[0] ?? null;
}

/** Copy non-auth research fields from `source` onto `target` where target is empty. */
async function copyParticipantResearchFields(
  client: PoolClient,
  sourceHash: string,
  targetHash: string,
): Promise<void> {
  const skip = new Set([
    'user_hash',
    'auth_user_id',
    'email',
    'password_hash',
    'email_verified',
    'created_at',
  ]);
  const source = await loadParticipant(client, sourceHash);
  const target = await loadParticipant(client, targetHash);
  if (!source || !target) return;

  const sets: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  for (const [key, srcVal] of Object.entries(source)) {
    if (skip.has(key)) continue;
    if (srcVal === null || srcVal === undefined) continue;
    const tgtVal = target[key];
    const tgtEmpty =
      tgtVal === null ||
      tgtVal === undefined ||
      (typeof tgtVal === 'string' && tgtVal.trim() === '') ||
      (typeof tgtVal === 'number' && tgtVal === 0 && key.endsWith('_count'));
    if (!tgtEmpty) continue;
    sets.push(`${key} = $${idx}`);
    values.push(srcVal);
    idx += 1;
  }

  if (sets.length === 0) return;
  values.push(targetHash);
  await client.query(
    `UPDATE participants SET ${sets.join(', ')}, updated_at = NOW() WHERE user_hash = $${idx}`,
    values,
  );
}

async function reassignChildRows(
  client: PoolClient,
  fromHash: string,
  toHash: string,
): Promise<void> {
  if (fromHash === toHash) return;

  for (const table of USER_HASH_CHILD_TABLES) {
    // Per-table savepoint: a failed UPDATE (e.g. unique on user_hash+image_id) aborts the
    // Postgres transaction; we must roll back to the savepoint before running DELETE fallback.
    const savepoint = `merge_reassign_${table}`;
    await client.query(`SAVEPOINT ${savepoint}`);
    try {
      await client.query(
        `UPDATE ${table} SET user_hash = $1 WHERE user_hash = $2`,
        [toHash, fromHash],
      );
      await client.query(`RELEASE SAVEPOINT ${savepoint}`);
    } catch (e) {
      const err = e as Error & { code?: string };
      await client.query(`ROLLBACK TO SAVEPOINT ${savepoint}`);
      if (err.code === '23505') {
        await client.query(`DELETE FROM ${table} WHERE user_hash = $1`, [fromHash]);
      } else {
        throw e;
      }
    }
  }
}

export type MergeAnonymousResult =
  | { ok: true; user_hash: string; merged: boolean }
  | { ok: false; error: string };

/**
 * Consolidates anonymous flow row (A) with email-auth row (B) for the same auth_user_id.
 * Prefers the row with more research data; keeps one user_hash for dashboard.
 */
export async function mergeAnonymousSession(
  client: PoolClient,
  params: { authUserId: string; anonymousUserHash: string },
): Promise<MergeAnonymousResult> {
  const { authUserId, anonymousUserHash } = params;
  const anonHash = anonymousUserHash.trim();
  if (!authUserId || !anonHash) {
    return { ok: false, error: 'auth_user_id_and_anonymous_user_hash_required' };
  }

  const { rows: authRows } = await client.query<ParticipantRow>(
    `SELECT * FROM participants WHERE auth_user_id = $1 LIMIT 1`,
    [authUserId],
  );
  const authRow = authRows[0];

  const anon = await loadParticipant(client, anonHash);
  if (!anon) {
    // Local aura_user_hash often exists before participants/ensure (browser-only session).
    // Nothing to merge — keep the authenticated row when present.
    if (authRow) {
      return { ok: true, user_hash: authRow.user_hash, merged: false };
    }
    return { ok: false, error: 'anonymous_participant_not_found' };
  }

  if (!authRow) {
    await client.query(
      `UPDATE participants SET auth_user_id = $2, updated_at = NOW() WHERE user_hash = $1`,
      [anonHash, authUserId],
    );
    return { ok: true, user_hash: anonHash, merged: false };
  }

  const authHash = authRow.user_hash;
  if (authHash === anonHash) {
    return { ok: true, user_hash: anonHash, merged: false };
  }

  const anonScore = participantRichnessScore(anon);
  const authScore = participantRichnessScore(authRow);

  if (authScore > anonScore) {
    await copyParticipantResearchFields(client, anonHash, authHash);
    await reassignChildRows(client, anonHash, authHash);
    await client.query(`DELETE FROM participants WHERE user_hash = $1`, [anonHash]);
    return { ok: true, user_hash: authHash, merged: true };
  }

  const passwordHash = authRow.password_hash;
  const email = authRow.email;
  const emailVerified = authRow.email_verified;

  await copyParticipantResearchFields(client, authHash, anonHash);

  await client.query(
    `UPDATE participants SET auth_user_id = NULL, email = NULL, password_hash = NULL, email_verified = FALSE WHERE user_hash = $1`,
    [authHash],
  );

  await client.query(
    `
    UPDATE participants
    SET auth_user_id = $2,
        email = COALESCE($3::text, email),
        password_hash = COALESCE($4::text, password_hash),
        email_verified = COALESCE($5::boolean, email_verified),
        updated_at = NOW()
    WHERE user_hash = $1
    `,
    [anonHash, authUserId, email ?? null, passwordHash ?? null, emailVerified ?? false],
  );

  await reassignChildRows(client, authHash, anonHash);
  await client.query(`DELETE FROM participants WHERE user_hash = $1`, [authHash]);

  return { ok: true, user_hash: anonHash, merged: true };
}
