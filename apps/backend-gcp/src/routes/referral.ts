import { Router } from 'express';
import { pool } from '../db';
import { attributeReferral, getReferralMe } from '../services/referral';

export const referralRouter = Router();

referralRouter.get('/referral/me/:userHash', async (req, res) => {
  const { userHash } = req.params;
  if (!userHash) {
    return res.status(400).json({ ok: false, error: 'userHash is required' });
  }

  try {
    const client = await pool.connect();
    try {
      const me = await getReferralMe(client, userHash);
      return res.json({ ok: true, ...me });
    } finally {
      client.release();
    }
  } catch (error) {
    const err = error as Error;
    if (err.message === 'no_participant') {
      return res.status(404).json({ ok: false, error: 'no_participant' });
    }
    console.error('referral/me error', error);
    return res.status(500).json({ ok: false, error: 'internal_error' });
  }
});

referralRouter.post('/referral/attribute', async (req, res) => {
  const { userHash, code } = req.body as { userHash?: string; code?: string };
  if (!userHash || !code) {
    return res.status(400).json({ ok: false, error: 'userHash and code are required' });
  }

  try {
    const client = await pool.connect();
    try {
      const result = await attributeReferral(client, userHash, code);
      return res.json({ ok: true, ...result });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('referral/attribute error', error);
    return res.status(500).json({ ok: false, error: 'internal_error' });
  }
});
