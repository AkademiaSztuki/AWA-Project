import { Router } from 'express';
import { pool } from '../db';
import { requireInternalSecretInProduction } from '../lib/internal-auth';
import { createPromoCode, redeemPromoCode } from '../services/promo-codes';

export const promoRouter = Router();

promoRouter.post('/promo/redeem', (req, res, next) => {
  if (!requireInternalSecretInProduction(req)) {
    return res.status(401).json({ ok: false, error: 'unauthorized' });
  }
  next();
}, async (req, res) => {
  const { userHash, code } = req.body as { userHash?: string; code?: string };
  if (!userHash || !code) {
    return res.status(400).json({ ok: false, error: 'userHash and code are required' });
  }

  try {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const result = await redeemPromoCode(client, userHash, code);
      await client.query('COMMIT');
      return res.json({
        ok: true,
        granted: result.granted,
        reason: result.reason,
        credits: result.credits,
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('promo/redeem error', error);
    return res.status(500).json({ ok: false, error: 'internal_error' });
  }
});

promoRouter.post('/admin/promo', async (req, res) => {
  const secret = process.env.PROMO_ADMIN_SECRET;
  const header = req.headers['x-promo-admin-secret'];
  if (!secret || header !== secret) {
    return res.status(401).json({ ok: false, error: 'unauthorized' });
  }

  const { code, grantCredits, maxRedemptions, validUntil, note, active } = req.body as {
    code?: string;
    grantCredits?: number;
    maxRedemptions?: number;
    validUntil?: string | null;
    note?: string | null;
    active?: boolean;
  };

  if (!code) {
    return res.status(400).json({ ok: false, error: 'code is required' });
  }

  try {
    const client = await pool.connect();
    try {
      const created = await createPromoCode(client, {
        code,
        grantCredits,
        maxRedemptions,
        validUntil,
        note,
        active,
      });
      return res.json({ ok: true, ...created });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('admin/promo error', error);
    return res.status(500).json({ ok: false, error: 'internal_error' });
  }
});
