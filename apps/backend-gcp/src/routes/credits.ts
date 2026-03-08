import { Router } from 'express';
import { pool } from '../db';
import {
  CREDITS_PER_IMAGE,
  checkCreditsAvailable,
  deductCredits,
  getCreditOverview,
  grantFreeCredits,
} from '../services/billing';

export const creditsRouter = Router();

creditsRouter.get('/credits/balance/:userHash', async (req, res) => {
  const { userHash } = req.params;
  if (!userHash) {
    return res.status(400).json({ ok: false, error: 'userHash is required' });
  }

  try {
    const client = await pool.connect();
    try {
      const overview = await getCreditOverview(client, userHash);
      return res.json({ ok: true, ...overview });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('credits/balance error', error);
    return res.status(500).json({ ok: false, error: 'internal_error' });
  }
});

creditsRouter.post('/credits/check', async (req, res) => {
  const { userHash, amount } = req.body as { userHash?: string; amount?: number };
  if (!userHash) {
    return res.status(400).json({ ok: false, error: 'userHash is required' });
  }

  try {
    const client = await pool.connect();
    try {
      const available = await checkCreditsAvailable(
        client,
        userHash,
        typeof amount === 'number' ? amount : CREDITS_PER_IMAGE
      );
      return res.json({ ok: true, available });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('credits/check error', error);
    return res.status(500).json({ ok: false, error: 'internal_error' });
  }
});

creditsRouter.post('/credits/deduct', async (req, res) => {
  const { userHash, generationId } = req.body as { userHash?: string; generationId?: string };
  if (!userHash || !generationId) {
    return res.status(400).json({ ok: false, error: 'userHash and generationId are required' });
  }

  try {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const success = await deductCredits(client, userHash, generationId);
      await client.query('COMMIT');
      return res.json({ ok: true, success });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('credits/deduct error', error);
    return res.status(500).json({ ok: false, error: 'internal_error' });
  }
});

creditsRouter.post('/credits/grant-free', async (req, res) => {
  const { userHash } = req.body as { userHash?: string };
  if (!userHash) {
    return res.status(400).json({ ok: false, error: 'userHash is required' });
  }

  try {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const granted = await grantFreeCredits(client, userHash);
      await client.query('COMMIT');
      return res.json({ ok: true, granted });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('credits/grant-free error', error);
    return res.status(500).json({ ok: false, error: 'internal_error' });
  }
});
