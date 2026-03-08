import { Router } from 'express';
import { pool } from '../db';

export const spacesRouter = Router();

spacesRouter.get('/participants/:userHash/spaces', async (req, res) => {
  const { userHash } = req.params;
  if (!userHash) {
    return res.status(400).json({ ok: false, error: 'userHash is required' });
  }

  try {
    const client = await pool.connect();
    try {
      const { rows } = await client.query(
        `
          SELECT *
          FROM participant_spaces
          WHERE user_hash = $1
          ORDER BY updated_at DESC
        `,
        [userHash]
      );

      return res.json({ ok: true, spaces: rows });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('spaces list error', error);
    return res.status(500).json({ ok: false, error: 'internal_error' });
  }
});

spacesRouter.post('/participants/:userHash/spaces', async (req, res) => {
  const { userHash } = req.params;
  const space = req.body as { name?: string; type?: string; is_default?: boolean };

  if (!userHash || !space?.name) {
    return res.status(400).json({ ok: false, error: 'userHash and name are required' });
  }

  try {
    const client = await pool.connect();
    try {
      const { rows } = await client.query(
        `
          INSERT INTO participant_spaces (user_hash, name, type, is_default)
          VALUES ($1, $2, $3, $4)
          RETURNING *
        `,
        [userHash, space.name, space.type || 'personal', !!space.is_default]
      );

      return res.json({ ok: true, space: rows[0] || null });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('spaces create error', error);
    return res.status(500).json({ ok: false, error: 'internal_error' });
  }
});

spacesRouter.patch('/spaces/:spaceId', async (req, res) => {
  const { spaceId } = req.params;
  const patch = req.body as { userHash?: string; name?: string; type?: string };

  if (!spaceId || !patch?.userHash) {
    return res.status(400).json({ ok: false, error: 'spaceId and userHash are required' });
  }

  try {
    const client = await pool.connect();
    try {
      const updates: string[] = [];
      const values: any[] = [spaceId, patch.userHash];
      let idx = 3;

      if (typeof patch.name === 'string' && patch.name.trim()) {
        updates.push(`name = $${idx++}`);
        values.push(patch.name.trim());
      }

      if (typeof patch.type === 'string' && patch.type.trim()) {
        updates.push(`type = $${idx++}`);
        values.push(patch.type.trim());
      }

      if (updates.length === 0) {
        return res.json({ ok: true });
      }

      updates.push('updated_at = NOW()');

      await client.query(
        `
          UPDATE participant_spaces
          SET ${updates.join(', ')}
          WHERE id = $1 AND user_hash = $2
        `,
        values
      );

      return res.json({ ok: true });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('spaces patch error', error);
    return res.status(500).json({ ok: false, error: 'internal_error' });
  }
});

spacesRouter.delete('/spaces/:spaceId', async (req, res) => {
  const { spaceId } = req.params;
  const userHash =
    typeof req.query.userHash === 'string'
      ? req.query.userHash
      : typeof req.body?.userHash === 'string'
        ? req.body.userHash
        : '';

  if (!spaceId || !userHash) {
    return res.status(400).json({ ok: false, error: 'spaceId and userHash are required' });
  }

  try {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        `
          DELETE FROM participant_images
          WHERE user_hash = $1 AND space_id = $2
        `,
        [userHash, spaceId]
      );
      await client.query(
        `
          DELETE FROM participant_spaces
          WHERE id = $1 AND user_hash = $2
        `,
        [spaceId, userHash]
      );
      await client.query('COMMIT');
      return res.json({ ok: true });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('spaces delete error', error);
    return res.status(500).json({ ok: false, error: 'internal_error' });
  }
});
