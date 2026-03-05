import { Router } from 'express';
import { pool } from '../db';

export const generationsRouter = Router();

// POST /participants/:userHash/generations/start
generationsRouter.post('/participants/:userHash/generations/start', async (req, res) => {
  const { userHash } = req.params;
  const job = req.body as {
    type: 'initial' | 'micro' | 'macro';
    prompt: string;
    parameters?: any;
    has_base_image: boolean;
    modification_label?: string;
    source?: string;
  };

  if (!userHash || !job?.type || !job?.prompt) {
    return res.status(400).json({ ok: false, error: 'userHash, type and prompt are required' });
  }

  try {
    const client = await pool.connect();
    try {
      const { rows, rowCount } = await client.query(
        `
        INSERT INTO participant_generations (
          user_hash,
          job_type,
          prompt,
          parameters,
          source,
          has_base_image,
          modification_label,
          started_at,
          status
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), 'pending')
        RETURNING id
      `,
        [
          userHash,
          job.type,
          job.prompt,
          job.parameters || {},
          job.source || null,
          job.has_base_image,
          job.modification_label || null,
        ],
      );

      if (!rowCount) {
        return res.status(500).json({ ok: false, error: 'insert_failed' });
      }

      const generationId = rows[0].id as string;
      return res.json({ ok: true, generationId });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('generations/start error', error);
    return res.status(500).json({ ok: false, error: 'internal_error' });
  }
});

// POST /generations/:id/end
generationsRouter.post('/generations/:id/end', async (req, res) => {
  const { id } = req.params;
  const outcome = req.body as {
    status: 'success' | 'error';
    latency_ms: number;
    error_message?: string;
  };

  if (!id || !outcome?.status) {
    return res.status(400).json({ ok: false, error: 'id and status are required' });
  }

  const safeLatency = Math.min(Math.max(0, Math.round(outcome.latency_ms || 0)), 2147483647);

  try {
    const client = await pool.connect();
    try {
      const { rowCount } = await client.query(
        `
        UPDATE participant_generations
        SET
          finished_at = NOW(),
          status = $2,
          latency_ms = $3,
          error_message = $4
        WHERE id = $1
      `,
        [id, outcome.status, safeLatency, outcome.error_message || null],
      );

      if (!rowCount) {
        return res.status(404).json({ ok: false, error: 'generation_not_found' });
      }

      return res.json({ ok: true });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('generations/end error', error);
    return res.status(500).json({ ok: false, error: 'internal_error' });
  }
});

