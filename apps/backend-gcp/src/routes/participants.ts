import { Router } from 'express';
import { pool } from '../db';

export const participantsRouter = Router();

// POST /participants/ensure
participantsRouter.post('/ensure', async (req, res) => {
  const { userHash } = req.body as { userHash?: string };

  if (!userHash) {
    return res.status(400).json({ ok: false, error: 'userHash is required' });
  }

  try {
    const client = await pool.connect();
    try {
      const existing = await client.query(
        'SELECT user_hash FROM participants WHERE user_hash = $1',
        [userHash],
      );

      if ((existing.rowCount ?? 0) > 0) {
        return res.json({ ok: true, created: false });
      }

      await client.query(
        'INSERT INTO participants (user_hash, consent_timestamp) VALUES ($1, NOW())',
        [userHash],
      );

      // NOTE: free credits logic is intentionally not reproduced here yet.
      return res.json({ ok: true, created: true });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('participants/ensure error', error);
    return res.status(500).json({ ok: false, error: 'internal_error' });
  }
});

// POST /participants/session  (saveFullSessionToSupabase equivalent)
participantsRouter.post('/session', async (req, res) => {
  const sessionData = req.body as any;
  const userHash: string | undefined = sessionData?.userHash;

  if (!userHash) {
    return res.status(400).json({ ok: false, error: 'userHash is required' });
  }

  // For now we store sessionData as a full participant row update by mapping on the client;
  // backend assumes the body already matches participants columns.
  const participantRow = sessionData.participantRow as Record<string, unknown> | undefined;

  if (!participantRow) {
    return res.status(400).json({ ok: false, error: 'participantRow is required' });
  }

  try {
    const client = await pool.connect();
    try {
      const columns = Object.keys(participantRow);
      const values = Object.values(participantRow);

      if (!columns.length) {
        return res.status(400).json({ ok: false, error: 'participantRow is empty' });
      }

      // Ensure consent_timestamp is always set
      if (!columns.includes('consent_timestamp')) {
        columns.push('consent_timestamp');
        values.push(new Date().toISOString());
      }

      const assignments = columns.map((col, idx) => `${col} = $${idx + 2}`);

      const sql = `
        INSERT INTO participants (user_hash, ${columns.join(', ')})
        VALUES ($1, ${columns.map((_, idx) => `$${idx + 2}`).join(', ')})
        ON CONFLICT (user_hash) DO UPDATE
        SET ${assignments.join(', ')}, updated_at = NOW()
      `;

      await client.query(sql, [userHash, ...values]);

      return res.json({ ok: true });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('participants/session error', error);
    return res.status(500).json({ ok: false, error: 'internal_error' });
  }
});

// GET /participants/session/:userHash (fetchLatestSessionSnapshot equivalent)
participantsRouter.get('/session/:userHash', async (req, res) => {
  const { userHash } = req.params;

  if (!userHash) {
    return res.status(400).json({ ok: false, error: 'userHash is required' });
  }

  try {
    const client = await pool.connect();
    try {
      const { rows } = await client.query('SELECT * FROM participants WHERE user_hash = $1', [
        userHash,
      ]);

      if (rows.length === 0) {
        return res.json({ ok: true, participant: null });
      }

      return res.json({ ok: true, participant: rows[0] });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('participants/session GET error', error);
    return res.status(500).json({ ok: false, error: 'internal_error' });
  }
});

