import { Router } from 'express';
import { pool } from '../db';
import { isPersistenceDebug, shortUserHashForLog } from '../lib/persistence-debug';
import { sessionSyncTrace } from '../lib/session-sync-trace';

export const matrixRouter = Router();

export type MatrixSyncEntry = {
  stepIndex: number;
  clientId?: string | null;
  label?: string | null;
  source?: string | null;
  isSelected?: boolean | null;
  imageUrl?: string | null;
  extra?: Record<string, unknown> | null;
};

/**
 * POST /participants/:userHash/matrix/sync
 * Replaces all matrix entries for the participant with the provided snapshot (no base64).
 */
matrixRouter.post('/participants/:userHash/matrix/sync', async (req, res) => {
  const { userHash } = req.params;
  const entries = (req.body?.entries ?? []) as MatrixSyncEntry[];

  if (!userHash) {
    return res.status(400).json({ ok: false, error: 'userHash required' });
  }
  if (!Array.isArray(entries)) {
    return res.status(400).json({ ok: false, error: 'entries must be an array' });
  }

  try {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const { rows: pRows } = await client.query(`SELECT 1 FROM participants WHERE user_hash = $1`, [
        userHash,
      ]);
      if (pRows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ ok: false, error: 'participant_not_found' });
      }

      await client.query(`DELETE FROM participant_matrix_entries WHERE user_hash = $1`, [userHash]);

      if (entries.length === 0) {
        await client.query('COMMIT');
        if (isPersistenceDebug()) {
          sessionSyncTrace({
            hypothesisId: 'P1',
            location: 'matrix.ts:matrix/sync',
            message: 'matrix_sync_cleared',
            data: { userHashShort: shortUserHashForLog(userHash), inserted: 0 },
            runId: 'persistence',
          });
        }
        return res.json({ ok: true, inserted: 0 });
      }

      const values: unknown[] = [];
      const placeholders: string[] = [];
      for (let idx = 0; idx < entries.length; idx++) {
        const e = entries[idx];
        const step = typeof e.stepIndex === 'number' ? e.stepIndex : idx;
        values.push(
          userHash,
          step,
          e.clientId ?? null,
          e.label ?? null,
          e.source ?? null,
          e.isSelected ?? false,
          e.imageUrl ?? null,
          e.extra && typeof e.extra === 'object' ? JSON.stringify(e.extra) : '{}',
        );
        const o = idx * 8;
        placeholders.push(
          `($${o + 1}, $${o + 2}, $${o + 3}, $${o + 4}, $${o + 5}, $${o + 6}, $${o + 7}, $${o + 8}::jsonb)`,
        );
      }

      await client.query(
        `
        INSERT INTO participant_matrix_entries (
          user_hash,
          step_index,
          client_id,
          label,
          source,
          is_selected,
          image_url,
          extra
        )
        VALUES ${placeholders.join(', ')}
      `,
        values,
      );

      await client.query('COMMIT');
      if (isPersistenceDebug()) {
        sessionSyncTrace({
          hypothesisId: 'P1',
          location: 'matrix.ts:matrix/sync',
          message: 'matrix_sync_committed',
          data: {
            userHashShort: shortUserHashForLog(userHash),
            inserted: entries.length,
            sourcesSample: entries.slice(0, 8).map((e) => String(e.source ?? '')),
          },
          runId: 'persistence',
        });
      }
      return res.json({ ok: true, inserted: entries.length });
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('matrix/sync error', error);
    return res.status(500).json({ ok: false, error: 'internal_error' });
  }
});
