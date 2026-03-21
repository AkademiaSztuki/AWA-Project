import type { PoolClient } from 'pg';
import { Router } from 'express';
import { pool } from '../db';
import { ensureParticipantRecord, grantFreeCredits } from '../services/billing';

/** Lazily loaded; cleared on schema mismatch so new migrations are picked up after deploy. */
let participantsTableColumns: Set<string> | null = null;

async function getParticipantsTableColumns(client: PoolClient): Promise<Set<string>> {
  if (participantsTableColumns) {
    return participantsTableColumns;
  }
  const { rows } = await client.query<{ column_name: string }>(
    `SELECT column_name FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'participants'`,
  );
  participantsTableColumns = new Set(rows.map((r) => r.column_name));
  return participantsTableColumns;
}

function isSessionPersistDebug(): boolean {
  return process.env.DEBUG_SESSION_SYNC === '1';
}

function summarizeParticipantRowForDebug(row: Record<string, unknown>) {
  const has = (k: string) => {
    const v = row[k];
    if (v === null || v === undefined) return false;
    if (typeof v === 'string') return v.length > 0;
    return true;
  };
  return {
    path_type: row.path_type,
    current_step: row.current_step,
    generations_count: row.generations_count,
    big5_completed_at: row.big5_completed_at,
    explicit_any:
      has('explicit_warmth') ||
      has('explicit_brightness') ||
      has('explicit_complexity') ||
      has('explicit_style'),
    room_any: has('room_type') || has('room_name'),
    session_image_ratings: has('session_image_ratings'),
    tinder_total_swipes: row.tinder_total_swipes,
  };
}

function filterParticipantRowToExistingColumns(
  row: Record<string, unknown>,
  allowed: Set<string>,
): { filtered: Record<string, unknown>; droppedKeys: string[] } {
  const filtered: Record<string, unknown> = {};
  const droppedKeys: string[] = [];
  for (const [k, v] of Object.entries(row)) {
    if (allowed.has(k)) {
      filtered[k] = v;
    } else {
      droppedKeys.push(k);
    }
  }
  return { filtered, droppedKeys };
}

/** Make a DB row JSON-serializable (Date → ISO string, BigInt → number, Buffer → skip or base64). */
function sanitizeRow(row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) {
    if (v === null || v === undefined) {
      out[k] = v;
    } else if (typeof v === 'bigint') {
      out[k] = Number(v);
    } else if (v instanceof Date) {
      out[k] = v.toISOString();
    } else if (typeof Buffer !== 'undefined' && Buffer.isBuffer(v)) {
      out[k] = (v as Buffer).toString('base64');
    } else if (Array.isArray(v)) {
      out[k] = v.map((item) =>
        typeof item === 'object' && item !== null && !(item instanceof Date)
          ? sanitizeRow(item as Record<string, unknown>)
          : item
      );
    } else if (typeof v === 'object' && v !== null && !(v instanceof Date)) {
      out[k] = sanitizeRow(v as Record<string, unknown>);
    } else {
      out[k] = v;
    }
  }
  return out;
}

export const participantsRouter = Router();

// GET /api/debug/participants-auth-column jest w server.ts (na app), żeby uniknąć problemów z routingiem

// GET/POST /api/debug/migrate-auth-user-id-to-text – jednorazowa migracja UUID→TEXT (idempotentna)
// W przeglądarce: https://...run.app/api/debug/migrate-auth-user-id-to-text?key=awa-migrate-2025
async function runMigrateAuthUserIdToText(
  res: import('express').Response
): Promise<void> {
  try {
    const client = await pool.connect();
    try {
      const { rows: check } = await client.query<{ data_type: string }>(
        `SELECT data_type FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = 'participants' AND column_name = 'auth_user_id'`
      );
      if (check[0]?.data_type === 'text') {
        res.json({ ok: true, message: 'already text' });
        return;
      }
      await client.query(
        `ALTER TABLE public.participants ALTER COLUMN auth_user_id TYPE TEXT USING auth_user_id::TEXT`
      );
      res.json({ ok: true, message: 'migrated to TEXT' });
    } finally {
      client.release();
    }
  } catch (e: unknown) {
    const err = e as Error & { code?: string };
    console.error('migrate-auth-user-id error', err?.message, err?.code);
    res.status(500).json({
      ok: false,
      error: err?.message ?? String(e),
      code: err?.code,
      hint: 'If permission denied, run the ALTER in Cloud SQL Console.',
    });
  }
}

participantsRouter.get('/debug/migrate-auth-user-id-to-text', async (req, res) => {
  const secret = process.env.MIGRATE_SECRET || 'awa-migrate-2025';
  if (req.query?.key !== secret) {
    return res.status(403).json({ ok: false, error: 'forbidden' });
  }
  await runMigrateAuthUserIdToText(res);
});

participantsRouter.post('/debug/migrate-auth-user-id-to-text', async (req, res) => {
  const secret = process.env.MIGRATE_SECRET || 'awa-migrate-2025';
  if (req.query?.key !== secret && req.body?.key !== secret) {
    return res.status(403).json({ ok: false, error: 'forbidden' });
  }
  await runMigrateAuthUserIdToText(res);
});

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
        'INSERT INTO participants (user_hash, consent_timestamp, updated_at) VALUES ($1, NOW(), NOW())',
        [userHash],
      );

      await grantFreeCredits(client, userHash);
      return res.json({ ok: true, created: true });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('participants/ensure error', error);
    return res.status(500).json({ ok: false, error: 'internal_error' });
  }
});

participantsRouter.post('/participants/link-auth', async (req, res) => {
  const {
    userHash,
    authUserId,
    consentTimestamp,
  } = req.body as { userHash?: string; authUserId?: string; consentTimestamp?: string };

  if (!userHash || !authUserId) {
    return res.status(400).json({ ok: false, error: 'userHash and authUserId are required' });
  }

  try {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const { rows: existingForAuth } = await client.query<{ user_hash: string }>(
        `
          SELECT user_hash
          FROM participants
          WHERE auth_user_id = $1
          LIMIT 1
        `,
        [authUserId]
      );

      if (existingForAuth[0] && existingForAuth[0].user_hash !== userHash) {
        await client.query('ROLLBACK');
        return res.json({
          ok: true,
          existingUserHash: existingForAuth[0].user_hash,
        });
      }

      await ensureParticipantRecord(client, userHash, {
        authUserId,
        consentTimestamp: consentTimestamp || null,
      });

      await client.query(
        `
          UPDATE participants
          SET auth_user_id = $2, updated_at = NOW()
          WHERE user_hash = $1
        `,
        [userHash, authUserId]
      );

      await client.query('COMMIT');
      return res.json({ ok: true, existingUserHash: userHash });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error: unknown) {
    const err = error as Error & { code?: string; detail?: string };
    const message = err?.message ?? String(error);
    const code = err?.code ?? '';
    console.error('participants/link-auth error', message, code, err?.detail);
    const safeDetail = message.slice(0, 300);
    const isUuidError =
      code === '42804' ||
      /uuid|type.*text|invalid input syntax for type uuid/i.test(message);
    const hint = isUuidError
      ? ' Wywołaj w przeglądarce: POST ' +
        (req.get('origin') || 'https://awa-backend-api-986280192250.europe-west4.run.app') +
        '/api/debug/migrate-auth-user-id-to-text?key=awa-migrate-2025 (albo w Cloud SQL: ALTER TABLE public.participants ALTER COLUMN auth_user_id TYPE TEXT USING auth_user_id::TEXT;)'
      : undefined;
    return res.status(500).json({
      ok: false,
      error: 'internal_error',
      detail: safeDetail,
      code,
      hint,
    });
  }
});

participantsRouter.get('/participants/by-auth/:authUserId', async (req, res) => {
  const { authUserId } = req.params;

  if (!authUserId) {
    return res.status(400).json({ ok: false, error: 'authUserId is required' });
  }

  try {
    const client = await pool.connect();
    try {
      const { rows } = await client.query(
        `
          SELECT *
          FROM participants
          WHERE auth_user_id = $1
          ORDER BY core_profile_complete DESC, core_profile_completed_at DESC NULLS LAST, updated_at DESC
          LIMIT 1
        `,
        [authUserId]
      );

      return res.json({ ok: true, participant: rows[0] || null });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('participants/by-auth error', error);
    return res.status(500).json({ ok: false, error: 'internal_error' });
  }
});

participantsRouter.get('/participants/completion-status', async (req, res) => {
  const authUserId =
    typeof req.query.authUserId === 'string' ? req.query.authUserId : undefined;
  const userHash = typeof req.query.userHash === 'string' ? req.query.userHash : undefined;

  if (!authUserId && !userHash) {
    return res.status(400).json({ ok: false, error: 'authUserId or userHash is required' });
  }

  try {
    const client = await pool.connect();
    try {
      if (authUserId) {
        const { rows } = await client.query(
          `
            SELECT core_profile_complete, core_profile_completed_at
            FROM participants
            WHERE auth_user_id = $1
            ORDER BY core_profile_complete DESC, core_profile_completed_at DESC NULLS LAST, updated_at DESC
            LIMIT 1
          `,
          [authUserId]
        );

        if (rows[0]) {
          return res.json({
            ok: true,
            completion: {
              coreProfileComplete: !!rows[0].core_profile_complete,
              coreProfileCompletedAt: rows[0].core_profile_completed_at,
            },
          });
        }
      }

      if (userHash) {
        const { rows } = await client.query(
          `
            SELECT core_profile_complete, core_profile_completed_at
            FROM participants
            WHERE user_hash = $1
            LIMIT 1
          `,
          [userHash]
        );

        if (rows[0]) {
          return res.json({
            ok: true,
            completion: {
              coreProfileComplete: !!rows[0].core_profile_complete,
              coreProfileCompletedAt: rows[0].core_profile_completed_at,
            },
          });
        }
      }

      return res.json({
        ok: true,
        completion: {
          coreProfileComplete: false,
          coreProfileCompletedAt: null,
        },
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('participants/completion-status error', error);
    return res.status(500).json({ ok: false, error: 'internal_error' });
  }
});

// POST /participants/session  (frontend: saveSessionToGcp)
participantsRouter.post('/session', async (req, res) => {
  const sessionData = req.body as any;
  const userHash: string | undefined = sessionData?.userHash;

  if (!userHash) {
    return res.status(400).json({ ok: false, error: 'userHash is required' });
  }

  const participantRow = sessionData.participantRow as Record<string, unknown> | undefined;

  if (!participantRow) {
    return res.status(400).json({ ok: false, error: 'participantRow is required' });
  }

  console.log('[participants.session] incoming', {
    userHash,
    keys: Object.keys(participantRow),
  });
  if (isSessionPersistDebug()) {
    console.log('[participants.session:debug] incoming row summary', {
      userHash,
      ...summarizeParticipantRowForDebug(participantRow),
    });
  }

  try {
    const client = await pool.connect();
    try {
      const rawRow = { ...participantRow };
      delete rawRow.user_hash;

      for (let attempt = 0; attempt < 2; attempt++) {
        const allowed = await getParticipantsTableColumns(client);
        const { filtered, droppedKeys } = filterParticipantRowToExistingColumns(rawRow, allowed);
        if (droppedKeys.length) {
          console.warn('[participants.session] dropped unknown columns (not in participants table)', {
            userHash,
            droppedKeys,
          });
        }

        const row = { ...filtered };
        const columns = Object.keys(row);
        const values = Object.values(row);

        if (!columns.length) {
          console.log('[participants.session] empty participantRow, nothing to upsert', { userHash });
          return res.json({ ok: true });
        }

        if (isSessionPersistDebug()) {
          if (row.path_type == null || row.path_type === '') {
            console.warn('[participants.session:debug] incoming row has empty path_type', { userHash });
          }
          if (row.current_step == null || row.current_step === '') {
            console.warn('[participants.session:debug] incoming row has empty current_step', { userHash });
          }
          console.log('[participants.session:debug] after column filter', {
            userHash,
            upsertColumnCount: columns.length,
            droppedKeyCount: droppedKeys.length,
            ...summarizeParticipantRowForDebug(row),
          });
        }

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

        try {
          await client.query(sql, [userHash, ...values]);
          console.log('[participants.session] upsert success', { userHash });
          if (isSessionPersistDebug()) {
            console.log('[participants.session:debug] upsert OK', {
              userHash,
              columnCount: columns.length,
            });
          }
          return res.json({ ok: true });
        } catch (queryErr) {
          const qe = queryErr as Error & { code?: string };
          if (qe.code === '42703' && attempt === 0) {
            console.warn('[participants.session] schema mismatch, refreshing column cache and retrying');
            participantsTableColumns = null;
            continue;
          }
          throw queryErr;
        }
      }
      return res.status(500).json({ ok: false, error: 'session_persist_failed', detail: 'retry_exhausted' });
    } finally {
      client.release();
    }
  } catch (error) {
    const err = error as Error & { code?: string; detail?: string };
    console.error('participants/session error', error);
    const message = err?.message ?? String(error);
    return res.status(500).json({
      ok: false,
      error: 'session_persist_failed',
      detail: message,
      code: err?.code,
    });
  }
});

// GET /participants/session/:userHash (frontend: fetchSessionSnapshotFromGcp)
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

      const row = rows[0] as Record<string, unknown>;
      return res.json({ ok: true, participant: sanitizeRow(row) });
    } finally {
      client.release();
    }
  } catch (error: unknown) {
    const err = error as Error & { code?: string; detail?: string };
    const message = err?.message ?? String(error);
    console.error('participants/session GET error', message, err?.code, err?.detail);
    return res.status(500).json({
      ok: false,
      error: 'internal_error',
      detail: message.slice(0, 200),
    });
  }
});

