import { Router } from 'express';
import { pool } from '../db';

export const creditsRouter = Router();

const CREDITS_PER_GENERATION = 10;
const FREE_GRANT_CREDITS = 600;

// POST /credits/grant-free
creditsRouter.post('/credits/grant-free', async (req, res) => {
  const { userHash } = req.body as { userHash?: string };

  if (!userHash) {
    return res.status(400).json({ ok: false, error: 'userHash is required' });
  }

  const client = await pool.connect();
  try {
    // Check if participant already received the free grant
    const { rows: participantRows } = await client.query(
      'SELECT free_grant_used, auth_user_id FROM participants WHERE user_hash = $1',
      [userHash],
    );

    if (participantRows.length > 0 && participantRows[0].free_grant_used) {
      return res.json({ ok: true, granted: false, reason: 'already_granted' });
    }

    // If participant has auth_user_id, check if any other hash for this user already got the grant
    if (participantRows.length > 0 && participantRows[0].auth_user_id) {
      const { rows: otherRows } = await client.query(
        'SELECT 1 FROM participants WHERE auth_user_id = $1 AND free_grant_used = TRUE LIMIT 1',
        [participantRows[0].auth_user_id],
      );
      if (otherRows.length > 0) {
        await client.query(
          'UPDATE participants SET free_grant_used = TRUE, free_grant_used_at = NOW() WHERE user_hash = $1',
          [userHash],
        );
        return res.json({ ok: true, granted: false, reason: 'already_granted_other_hash' });
      }
    }

    // If participant doesn't exist, create minimal record
    if (participantRows.length === 0) {
      await client.query(
        'INSERT INTO participants (user_hash, consent_timestamp, free_grant_used) VALUES ($1, NOW(), FALSE) ON CONFLICT (user_hash) DO NOTHING',
        [userHash],
      );
    }

    // Insert credit transaction
    await client.query(
      `INSERT INTO credit_transactions (user_hash, type, amount, source, expires_at)
       VALUES ($1, 'grant', $2, 'free_grant', NULL)`,
      [userHash, FREE_GRANT_CREDITS],
    );

    // Mark grant as used
    await client.query(
      'UPDATE participants SET free_grant_used = TRUE, free_grant_used_at = NOW() WHERE user_hash = $1',
      [userHash],
    );

    return res.json({ ok: true, granted: true, amount: FREE_GRANT_CREDITS });
  } catch (error: any) {
    // Handle duplicate key (idempotency)
    if (error?.code === '23505') {
      return res.json({ ok: true, granted: false, reason: 'duplicate' });
    }
    console.error('credits/grant-free error', error);
    return res.status(500).json({ ok: false, error: 'internal_error' });
  } finally {
    client.release();
  }
});

// POST /credits/deduct
creditsRouter.post('/credits/deduct', async (req, res) => {
  const { userHash, generationId } = req.body as { userHash?: string; generationId?: string };

  if (!userHash || !generationId) {
    return res.status(400).json({ ok: false, error: 'userHash and generationId are required' });
  }

  const client = await pool.connect();
  try {
    // Only store generation_id if it's a valid UUID
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(generationId);
    const safeGenerationId = isUuid ? generationId : null;

    await client.query(
      `INSERT INTO credit_transactions (user_hash, type, amount, source, generation_id, expires_at)
       VALUES ($1, 'used', $2, NULL, $3, NULL)`,
      [userHash, -CREDITS_PER_GENERATION, safeGenerationId],
    );

    // Update subscription credits if active
    const { rows: subRows } = await client.query(
      `SELECT id, subscription_credits_remaining, credits_used
       FROM subscriptions
       WHERE user_hash = $1 AND status = 'active'
       ORDER BY current_period_start DESC NULLS LAST
       LIMIT 1`,
      [userHash],
    );

    if (subRows.length > 0 && subRows[0].subscription_credits_remaining > 0) {
      const sub = subRows[0];
      await client.query(
        `UPDATE subscriptions
         SET subscription_credits_remaining = GREATEST(0, subscription_credits_remaining - $2),
             credits_used = COALESCE(credits_used, 0) + $2,
             updated_at = NOW()
         WHERE id = $1`,
        [sub.id, CREDITS_PER_GENERATION],
      );
    }

    return res.json({ ok: true });
  } catch (error) {
    console.error('credits/deduct error', error);
    return res.status(500).json({ ok: false, error: 'internal_error' });
  } finally {
    client.release();
  }
});

// GET /credits/balance?userHash=xxx
creditsRouter.get('/credits/balance', async (req, res) => {
  const userHash = req.query.userHash as string | undefined;

  if (!userHash) {
    return res.status(400).json({ ok: false, error: 'userHash query param is required' });
  }

  const client = await pool.connect();
  try {
    // Sum all non-expired credit transactions
    const { rows: txRows } = await client.query(
      `SELECT COALESCE(SUM(amount), 0) AS balance
       FROM credit_transactions
       WHERE user_hash = $1
         AND (expires_at IS NULL OR expires_at > NOW())`,
      [userHash],
    );

    const balance = parseInt(txRows[0]?.balance ?? '0', 10);
    const generationsAvailable = Math.floor(balance / CREDITS_PER_GENERATION);

    // Check active subscription
    const { rows: subRows } = await client.query(
      `SELECT subscription_credits_remaining, credits_used
       FROM subscriptions
       WHERE user_hash = $1 AND status = 'active'
       LIMIT 1`,
      [userHash],
    );

    const hasActiveSubscription = subRows.length > 0;
    const subscriptionCreditsRemaining = subRows[0]?.subscription_credits_remaining ?? 0;

    return res.json({
      ok: true,
      balance,
      generationsAvailable,
      hasActiveSubscription,
      subscriptionCreditsRemaining,
    });
  } catch (error) {
    console.error('credits/balance error', error);
    return res.json({
      ok: true,
      balance: 0,
      generationsAvailable: 0,
      hasActiveSubscription: false,
      subscriptionCreditsRemaining: 0,
    });
  } finally {
    client.release();
  }
});

// POST /credits/check
creditsRouter.post('/credits/check', async (req, res) => {
  const { userHash, amount } = req.body as { userHash?: string; amount?: number };

  if (!userHash) {
    return res.status(400).json({ ok: false, error: 'userHash is required' });
  }

  const needed = amount || CREDITS_PER_GENERATION;

  const client = await pool.connect();
  try {
    // Check subscription first
    const { rows: subRows } = await client.query(
      `SELECT subscription_credits_remaining
       FROM subscriptions
       WHERE user_hash = $1 AND status = 'active'
       LIMIT 1`,
      [userHash],
    );

    if (subRows.length > 0 && subRows[0].subscription_credits_remaining >= needed) {
      return res.json({ ok: true, available: true });
    }

    // Check general balance
    const { rows: txRows } = await client.query(
      `SELECT COALESCE(SUM(amount), 0) AS balance
       FROM credit_transactions
       WHERE user_hash = $1
         AND (expires_at IS NULL OR expires_at > NOW())`,
      [userHash],
    );

    const balance = parseInt(txRows[0]?.balance ?? '0', 10);
    return res.json({ ok: true, available: balance >= needed });
  } catch (error) {
    console.error('credits/check error', error);
    return res.json({ ok: true, available: true });
  } finally {
    client.release();
  }
});
