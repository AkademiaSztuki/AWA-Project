import crypto from 'crypto';
import { PoolClient } from 'pg';
import type { GrantFreeCreditsResult } from './billing';
import { ensureParticipantRecord } from './billing';
import {
  REFERRAL_CODE_PREFIX,
  REFERRAL_CREDIT_SOURCE,
  REFERRAL_FIRST_GENERATION_CREDITS,
  REFERRAL_MILESTONE_10_COUNT,
  REFERRAL_MILESTONE_10_CREDITS,
  REFERRAL_MILESTONE_3_COUNT,
  REFERRAL_MILESTONE_3_CREDITS,
  REFERRAL_VERIFY_CREDITS,
  REFERRAL_WELCOME_CREDITS,
  type ReferralCreditSource,
  type ReferralEventKind,
} from '../lib/referral-constants';

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export interface ReferralMe {
  code: string;
  invitePath: string;
  verifiedCount: number;
  firstGenerationCount: number;
  creditsEarned: number;
  milestone3Claimed: boolean;
  milestone10Claimed: boolean;
}

function generateReferralCode(): string {
  const bytes = crypto.randomBytes(6);
  let suffix = '';
  for (let i = 0; i < 6; i += 1) {
    suffix += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  }
  return `${REFERRAL_CODE_PREFIX}${suffix}`;
}

export function normalizeReferralCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s+/g, '');
}

async function insertGrant(
  client: PoolClient,
  userHash: string,
  amount: number,
  source: ReferralCreditSource,
): Promise<void> {
  if (amount <= 0) return;
  await client.query(
    `
      INSERT INTO credit_transactions (user_hash, type, amount, source, generation_id, expires_at)
      VALUES ($1, 'grant', $2, $3, NULL, NULL)
    `,
    [userHash, amount, source],
  );
}

export async function ensureReferralCode(
  client: PoolClient,
  userHash: string,
): Promise<string> {
  await ensureParticipantRecord(client, userHash);

  const existing = await client.query<{ code: string }>(
    `SELECT code FROM referral_codes WHERE user_hash = $1 LIMIT 1`,
    [userHash],
  );
  if (existing.rows[0]?.code) {
    return existing.rows[0].code;
  }

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const code = generateReferralCode();
    try {
      await client.query(
        `INSERT INTO referral_codes (user_hash, code) VALUES ($1, $2)`,
        [userHash, code],
      );
      return code;
    } catch (error) {
      const err = error as { code?: string };
      if (err.code === '23505') {
        const again = await client.query<{ code: string }>(
          `SELECT code FROM referral_codes WHERE user_hash = $1 LIMIT 1`,
          [userHash],
        );
        if (again.rows[0]?.code) return again.rows[0].code;
        continue;
      }
      throw error;
    }
  }

  throw new Error('referral_code_generation_failed');
}

export async function attributeReferral(
  client: PoolClient,
  inviteeUserHash: string,
  rawCode: string,
): Promise<{ attributed: boolean; reason: string }> {
  const code = normalizeReferralCode(rawCode);
  if (!code) {
    return { attributed: false, reason: 'invalid_code' };
  }

  await ensureParticipantRecord(client, inviteeUserHash);

  const referrer = await client.query<{ user_hash: string; code: string }>(
    `SELECT user_hash, code FROM referral_codes WHERE UPPER(code) = $1 LIMIT 1`,
    [code],
  );
  if (referrer.rows.length === 0) {
    return { attributed: false, reason: 'invalid_code' };
  }

  const referrerHash = referrer.rows[0].user_hash;
  if (referrerHash === inviteeUserHash) {
    return { attributed: false, reason: 'self_referral' };
  }

  const inserted = await client.query(
    `
      INSERT INTO referral_attributions (user_hash, referrer_code, referrer_user_hash)
      VALUES ($1, $2, $3)
      ON CONFLICT (user_hash) DO NOTHING
    `,
    [inviteeUserHash, referrer.rows[0].code, referrerHash],
  );

  if ((inserted.rowCount ?? 0) === 0) {
    return { attributed: false, reason: 'already_attributed' };
  }

  return { attributed: true, reason: 'attributed' };
}

async function insertEvent(
  client: PoolClient,
  payload: {
    referrerUserHash: string;
    inviteeUserHash: string | null;
    inviteeAuthUserId: string | null;
    kind: ReferralEventKind;
    creditsGranted: number;
  },
): Promise<boolean> {
  try {
    const result = await client.query(
      `
        INSERT INTO referral_events (
          user_hash, invitee_user_hash, invitee_auth_user_id, kind, credits_granted
        )
        VALUES ($1, $2, $3, $4, $5)
      `,
      [
        payload.referrerUserHash,
        payload.inviteeUserHash,
        payload.inviteeAuthUserId,
        payload.kind,
        payload.creditsGranted,
      ],
    );
    return (result.rowCount ?? 0) > 0;
  } catch (error) {
    const err = error as { code?: string };
    if (err.code === '23505') {
      return false;
    }
    throw error;
  }
}

async function maybeGrantMilestones(
  client: PoolClient,
  referrerUserHash: string,
): Promise<void> {
  const { rows } = await client.query<{ count: string }>(
    `
      SELECT COUNT(*)::text AS count
      FROM referral_events
      WHERE user_hash = $1 AND kind = 'verified'
    `,
    [referrerUserHash],
  );
  const verifiedCount = Number(rows[0]?.count || 0);

  if (verifiedCount >= REFERRAL_MILESTONE_3_COUNT) {
    const granted = await insertEvent(client, {
      referrerUserHash,
      inviteeUserHash: null,
      inviteeAuthUserId: null,
      kind: 'milestone_3',
      creditsGranted: REFERRAL_MILESTONE_3_CREDITS,
    });
    if (granted) {
      await insertGrant(
        client,
        referrerUserHash,
        REFERRAL_MILESTONE_3_CREDITS,
        REFERRAL_CREDIT_SOURCE.milestone,
      );
    }
  }

  if (verifiedCount >= REFERRAL_MILESTONE_10_COUNT) {
    const granted = await insertEvent(client, {
      referrerUserHash,
      inviteeUserHash: null,
      inviteeAuthUserId: null,
      kind: 'milestone_10',
      creditsGranted: REFERRAL_MILESTONE_10_CREDITS,
    });
    if (granted) {
      await insertGrant(
        client,
        referrerUserHash,
        REFERRAL_MILESTONE_10_CREDITS,
        REFERRAL_CREDIT_SOURCE.milestone,
      );
    }
  }
}

async function loadAttribution(client: PoolClient, inviteeUserHash: string): Promise<{
  referrerUserHash: string;
  referrerCode: string;
} | null> {
  const { rows } = await client.query<{
    referrer_user_hash: string | null;
    referrer_code: string;
  }>(
    `
      SELECT referrer_user_hash, referrer_code
      FROM referral_attributions
      WHERE user_hash = $1
      LIMIT 1
    `,
    [inviteeUserHash],
  );
  const row = rows[0];
  if (!row?.referrer_user_hash) return null;
  return { referrerUserHash: row.referrer_user_hash, referrerCode: row.referrer_code };
}

async function isSameAuthUser(
  client: PoolClient,
  hashA: string,
  hashB: string,
): Promise<boolean> {
  const { rows } = await client.query<{ auth_user_id: string | null }>(
    `
      SELECT auth_user_id FROM participants
      WHERE user_hash = $1 OR user_hash = $2
    `,
    [hashA, hashB],
  );
  const ids = rows
    .map((r) => r.auth_user_id)
    .filter((id): id is string => typeof id === 'string' && id.length > 0);
  if (ids.length < 2) return false;
  return ids[0] === ids[1];
}

export async function applyReferralOnVerified(
  client: PoolClient,
  inviteeUserHash: string,
  foundersResult: GrantFreeCreditsResult,
): Promise<void> {
  await client.query('BEGIN');
  try {
    await applyReferralOnVerifiedInner(client, inviteeUserHash, foundersResult);
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  }
}

async function applyReferralOnVerifiedInner(
  client: PoolClient,
  inviteeUserHash: string,
  foundersResult: GrantFreeCreditsResult,
): Promise<void> {
  const participant = await client.query<{
    auth_user_id: string | null;
    email_verified: boolean | null;
  }>(
    `SELECT auth_user_id, email_verified FROM participants WHERE user_hash = $1 LIMIT 1`,
    [inviteeUserHash],
  );
  const authUserId = participant.rows[0]?.auth_user_id;
  if (!authUserId) return;
  if (participant.rows[0]?.email_verified === false) return;

  const attribution = await loadAttribution(client, inviteeUserHash);
  if (!attribution) return;
  if (attribution.referrerUserHash === inviteeUserHash) return;
  if (await isSameAuthUser(client, attribution.referrerUserHash, inviteeUserHash)) {
    return;
  }

  const verifiedInserted = await insertEvent(client, {
    referrerUserHash: attribution.referrerUserHash,
    inviteeUserHash,
    inviteeAuthUserId: authUserId,
    kind: 'verified',
    creditsGranted: REFERRAL_VERIFY_CREDITS,
  });

  if (verifiedInserted) {
    await insertGrant(
      client,
      attribution.referrerUserHash,
      REFERRAL_VERIFY_CREDITS,
      REFERRAL_CREDIT_SOURCE.referrer,
    );
    await maybeGrantMilestones(client, attribution.referrerUserHash);
  }

  if (foundersResult.reason === 'program_full') {
    const existingWelcome = await client.query(
      `
        SELECT 1 FROM credit_transactions
        WHERE user_hash = $1 AND source = $2
        LIMIT 1
      `,
      [inviteeUserHash, REFERRAL_CREDIT_SOURCE.welcome],
    );
    if ((existingWelcome.rowCount ?? 0) === 0) {
      await insertGrant(
        client,
        inviteeUserHash,
        REFERRAL_WELCOME_CREDITS,
        REFERRAL_CREDIT_SOURCE.welcome,
      );
    }
  }
}

export async function applyReferralOnFirstGeneration(
  client: PoolClient,
  inviteeUserHash: string,
): Promise<void> {
  await client.query('BEGIN');
  try {
    await applyReferralOnFirstGenerationInner(client, inviteeUserHash);
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  }
}

async function applyReferralOnFirstGenerationInner(
  client: PoolClient,
  inviteeUserHash: string,
): Promise<void> {
  const usedCount = await client.query<{ count: string }>(
    `
      SELECT COUNT(*)::text AS count
      FROM credit_transactions
      WHERE user_hash = $1 AND type = 'used'
    `,
    [inviteeUserHash],
  );
  if (Number(usedCount.rows[0]?.count || 0) !== 1) {
    return;
  }

  const participant = await client.query<{ auth_user_id: string | null }>(
    `SELECT auth_user_id FROM participants WHERE user_hash = $1 LIMIT 1`,
    [inviteeUserHash],
  );
  const authUserId = participant.rows[0]?.auth_user_id;
  if (!authUserId) return;

  const attribution = await loadAttribution(client, inviteeUserHash);
  if (!attribution) return;
  if (attribution.referrerUserHash === inviteeUserHash) return;
  if (await isSameAuthUser(client, attribution.referrerUserHash, inviteeUserHash)) {
    return;
  }

  const inserted = await insertEvent(client, {
    referrerUserHash: attribution.referrerUserHash,
    inviteeUserHash,
    inviteeAuthUserId: authUserId,
    kind: 'first_generation',
    creditsGranted: REFERRAL_FIRST_GENERATION_CREDITS,
  });
  if (!inserted) return;

  await insertGrant(
    client,
    attribution.referrerUserHash,
    REFERRAL_FIRST_GENERATION_CREDITS,
    REFERRAL_CREDIT_SOURCE.referrer,
  );
}

export async function getReferralMe(
  client: PoolClient,
  userHash: string,
): Promise<ReferralMe> {
  const code = await ensureReferralCode(client, userHash);

  const stats = await client.query<{
    verified_count: string;
    first_gen_count: string;
    credits_earned: string;
    milestone_3: boolean;
    milestone_10: boolean;
  }>(
    `
      SELECT
        COUNT(*) FILTER (WHERE kind = 'verified')::text AS verified_count,
        COUNT(*) FILTER (WHERE kind = 'first_generation')::text AS first_gen_count,
        COALESCE(SUM(credits_granted), 0)::text AS credits_earned,
        BOOL_OR(kind = 'milestone_3') AS milestone_3,
        BOOL_OR(kind = 'milestone_10') AS milestone_10
      FROM referral_events
      WHERE user_hash = $1
    `,
    [userHash],
  );

  const row = stats.rows[0];
  return {
    code,
    invitePath: `/?ref=${encodeURIComponent(code)}`,
    verifiedCount: Number(row?.verified_count || 0),
    firstGenerationCount: Number(row?.first_gen_count || 0),
    creditsEarned: Number(row?.credits_earned || 0),
    milestone3Claimed: Boolean(row?.milestone_3),
    milestone10Claimed: Boolean(row?.milestone_10),
  };
}

export async function applyReferralOnVerifiedSafe(
  client: PoolClient,
  inviteeUserHash: string,
  foundersResult: GrantFreeCreditsResult,
): Promise<void> {
  try {
    await applyReferralOnVerified(client, inviteeUserHash, foundersResult);
  } catch (error) {
    console.warn('[referral] apply on verified failed', error);
  }
}

export async function applyReferralOnFirstGenerationSafe(
  client: PoolClient,
  inviteeUserHash: string,
): Promise<void> {
  try {
    await applyReferralOnFirstGeneration(client, inviteeUserHash);
  } catch (error) {
    console.warn('[referral] apply on first generation failed', error);
  }
}
