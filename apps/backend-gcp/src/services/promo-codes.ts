import { PoolClient } from 'pg';
import { ensureParticipantRecord } from './billing';

export type RedeemPromoReason =
  | 'granted'
  | 'already_redeemed'
  | 'invalid_code'
  | 'expired'
  | 'exhausted'
  | 'inactive'
  | 'not_eligible';

export interface RedeemPromoResult {
  granted: boolean;
  reason: RedeemPromoReason;
  credits?: number;
}

function normalizePromoCode(raw: string): string {
  return raw.trim().toUpperCase();
}

export async function redeemPromoCode(
  client: PoolClient,
  userHash: string,
  rawCode: string,
): Promise<RedeemPromoResult> {
  const code = normalizePromoCode(rawCode);
  if (!code) {
    return { granted: false, reason: 'invalid_code' };
  }

  await ensureParticipantRecord(client, userHash);

  const participantResult = await client.query<{ auth_user_id: string | null }>(
    `SELECT auth_user_id FROM participants WHERE user_hash = $1 FOR UPDATE`,
    [userHash],
  );
  const authUserId = participantResult.rows[0]?.auth_user_id;
  if (!authUserId) {
    return { granted: false, reason: 'not_eligible' };
  }

  await client.query(`SELECT pg_advisory_xact_lock(hashtext('promo_redeem:' || $1))`, [code]);

  const promoResult = await client.query<{
    id: string;
    grant_credits: number;
    max_redemptions: number;
    redemption_count: number;
    valid_from: string | null;
    valid_until: string | null;
    active: boolean;
  }>(
    `
      SELECT id, grant_credits, max_redemptions, redemption_count, valid_from, valid_until, active
      FROM promo_codes
      WHERE UPPER(code) = $1
      FOR UPDATE
    `,
    [code],
  );

  const promo = promoResult.rows[0];
  if (!promo) {
    return { granted: false, reason: 'invalid_code' };
  }
  if (!promo.active) {
    return { granted: false, reason: 'inactive' };
  }
  const now = new Date();
  if (promo.valid_from && new Date(promo.valid_from) > now) {
    return { granted: false, reason: 'expired' };
  }
  if (promo.valid_until && new Date(promo.valid_until) < now) {
    return { granted: false, reason: 'expired' };
  }
  if (promo.redemption_count >= promo.max_redemptions) {
    return { granted: false, reason: 'exhausted' };
  }

  const existing = await client.query(
    `
      SELECT 1 FROM promo_redemptions
      WHERE promo_code_id = $1 AND auth_user_id = $2
      LIMIT 1
    `,
    [promo.id, authUserId],
  );
  if ((existing.rowCount ?? 0) > 0) {
    return { granted: false, reason: 'already_redeemed' };
  }

  await client.query(
    `
      INSERT INTO credit_transactions (user_hash, type, amount, source, generation_id, expires_at)
      VALUES ($1, 'grant', $2, 'promo_code', NULL, NULL)
    `,
    [userHash, promo.grant_credits],
  );

  await client.query(
    `
      INSERT INTO promo_redemptions (promo_code_id, user_hash, auth_user_id)
      VALUES ($1, $2, $3)
    `,
    [promo.id, userHash, authUserId],
  );

  await client.query(
    `
      UPDATE promo_codes
      SET redemption_count = redemption_count + 1
      WHERE id = $1
    `,
    [promo.id],
  );

  return { granted: true, reason: 'granted', credits: promo.grant_credits };
}

export async function createPromoCode(
  client: PoolClient,
  payload: {
    code: string;
    grantCredits?: number;
    maxRedemptions?: number;
    validUntil?: string | null;
    note?: string | null;
    active?: boolean;
  },
): Promise<{ id: string; code: string }> {
  const code = normalizePromoCode(payload.code);
  const grantCredits = payload.grantCredits ?? 6000;
  const maxRedemptions = payload.maxRedemptions ?? 1;
  const { rows } = await client.query<{ id: string; code: string }>(
    `
      INSERT INTO promo_codes (code, grant_credits, max_redemptions, valid_until, note, active)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, code
    `,
    [
      code,
      grantCredits,
      maxRedemptions,
      payload.validUntil ?? null,
      payload.note ?? null,
      payload.active ?? true,
    ],
  );
  return rows[0];
}
