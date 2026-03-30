import type { PoolClient } from 'pg';
import { Router } from 'express';
import { pool } from '../db';
import {
  jsonbKeyByteLengths,
  pgErrorSnapshot,
  sessionSyncTrace,
} from '../lib/session-sync-trace';
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

/**
 * All json/jsonb columns on `participants` — **not cached**: Cloud SQL can gain columns while the
 * process runs; a stale list skips sanitization/strip and leaves bad JSONB in the UPSERT (22P02).
 * Merge pg_catalog + information_schema so domains / odd builds still match.
 */
async function getParticipantsJsonbColumnNames(client: PoolClient): Promise<Set<string>> {
  const { rows: fromPgCat } = await client.query<{ column_name: string }>(
    `SELECT a.attname AS column_name
     FROM pg_attribute a
     INNER JOIN pg_class c ON c.oid = a.attrelid
     INNER JOIN pg_namespace n ON n.oid = c.relnamespace
     INNER JOIN pg_type t ON t.oid = a.atttypid
     WHERE n.nspname = 'public'
       AND c.relname = 'participants'
       AND a.attnum > 0
       AND NOT a.attisdropped
       AND t.typname IN ('json', 'jsonb')`,
  );
  const { rows: fromInfo } = await client.query<{ column_name: string }>(
    `SELECT column_name
     FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name = 'participants'
       AND (
         data_type IN ('json', 'jsonb')
         OR udt_name::text IN ('json', 'jsonb')
       )`,
  );
  return new Set<string>([
    ...PARTICIPANTS_JSONB_COLUMNS,
    ...fromPgCat.map((r) => r.column_name),
    ...fromInfo.map((r) => r.column_name),
  ]);
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

/** Fallback JSONB list if information_schema returns none (should not happen in production). */
const PARTICIPANTS_JSONB_COLUMNS = new Set<string>([
  'big5_responses',
  'big5_facets',
  'sus_answers',
  'agency_answers',
  'satisfaction_answers',
  'clarity_answers',
  'room_activities',
  'session_image_ratings',
  'room_activity_context',
  'final_survey',
  'ladder_prompt_elements',
  'modification_prompt_log',
]);

/**
 * PostgreSQL `json`/`jsonb` rejects U+0000 in strings; lone UTF-16 surrogates often fail RFC-style JSON (22P02)
 * even when `JSON.parse` in Node accepted the payload.
 */
function sanitizeJsonStringForPostgres(s: string): string {
  let r = '';
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (c === 0) continue;
    if (c >= 0xd800 && c <= 0xdbff) {
      if (i + 1 < s.length) {
        const d = s.charCodeAt(i + 1);
        if (d >= 0xdc00 && d <= 0xdfff) {
          r += s.slice(i, i + 2);
          i++;
          continue;
        }
      }
      r += '\uFFFD';
      continue;
    }
    if (c >= 0xdc00 && c <= 0xdfff) {
      r += '\uFFFD';
      continue;
    }
    r += s[i];
  }
  return r;
}

function sanitizeJsonLeafStringsForPostgres(value: unknown): unknown {
  if (typeof value === 'string') {
    return sanitizeJsonStringForPostgres(value);
  }
  if (Array.isArray(value)) {
    return value.map(sanitizeJsonLeafStringsForPostgres);
  }
  if (value !== null && typeof value === 'object') {
    const o = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(o)) {
      out[k] = sanitizeJsonLeafStringsForPostgres(v);
    }
    return out;
  }
  return value;
}

function sanitizeJsonbCellForPg(value: unknown): { ok: true; value: unknown } | { ok: false } {
  if (value === null || value === undefined) {
    return { ok: true, value: null };
  }
  if (typeof value === 'string') {
    const t = value.trim();
    if (t === '') return { ok: true, value: null };
    try {
      return { ok: true, value: sanitizeJsonLeafStringsForPostgres(JSON.parse(t)) };
    } catch {
      return { ok: false };
    }
  }
  try {
    const round = JSON.stringify(value, (_k, v) => {
      if (typeof v === 'number' && !Number.isFinite(v)) return null;
      if (typeof v === 'bigint') return Number(v);
      return v;
    });
    return { ok: true, value: sanitizeJsonLeafStringsForPostgres(JSON.parse(round)) };
  } catch {
    return { ok: false };
  }
}

/**
 * Ensures JSONB-bound values round-trip as valid JSON for PostgreSQL (avoids 22P02 invalid input syntax for type json).
 * Invalid cells are removed from the row so UPSERT does not fail entirely.
 */
function sanitizeParticipantRowJsonb(
  row: Record<string, unknown>,
  userHash: string,
  jsonbColumns: Set<string>,
): Record<string, unknown> {
  const out = { ...row };
  const dropped: string[] = [];
  for (const col of jsonbColumns) {
    if (!(col in out) || out[col] === undefined) continue;
    const res = sanitizeJsonbCellForPg(out[col]);
    if (res.ok) {
      out[col] = res.value;
    } else {
      delete out[col];
      dropped.push(col);
    }
  }
  if (dropped.length) {
    sessionSyncTrace({
      hypothesisId: 'S4',
      location: 'participants.ts:sanitizeParticipantRowJsonb',
      message: 'jsonb_cell_invalid_removed',
      data: { userHash, droppedColumns: dropped },
    });
    console.warn('[participants.session] dropped invalid JSONB cells', {
      userHash,
      droppedColumns: dropped,
    });
  }
  return out;
}

/** Avoid passing `undefined` as a bound parameter (pg/jsonb edge cases and cleaner UPSERT rows). */
function omitUndefinedRowValues(row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) {
    if (v !== undefined) {
      out[k] = v;
    }
  }
  return out;
}

function stripJsonbColumns(
  row: Record<string, unknown>,
  jsonbCols: Set<string>,
): Record<string, unknown> {
  const out = { ...row };
  for (const c of jsonbCols) {
    delete out[c];
  }
  return out;
}

/**
 * Node's JSON.stringify can accept values that PostgreSQL jsonb input rejects (22P02).
 * Use the same parameter binding as INSERT to validate each JSONB cell against PG before upsert.
 */
async function filterJsonbRowByPostgresCast(
  client: PoolClient,
  row: Record<string, unknown>,
  jsonbCols: Set<string>,
  userHash: string,
): Promise<{ row: Record<string, unknown>; droppedPgCast: string[] }> {
  const out = { ...row };
  const droppedPgCast: string[] = [];
  for (const col of jsonbCols) {
    if (!(col in out) || out[col] === undefined) continue;
    const v = out[col];
    try {
      await client.query('SELECT $1::jsonb AS _j', [v]);
    } catch (e) {
      const err = e as Error & { code?: string; detail?: string };
      delete out[col];
      droppedPgCast.push(col);
      sessionSyncTrace({
        hypothesisId: 'S6',
        location: 'participants.ts:filterJsonbRowByPostgresCast',
        message: 'jsonb_precast_failed_column_dropped',
        data: {
          userHash,
          column: col,
          pg: pgErrorSnapshot(e),
        },
      });
      console.warn('[participants.session] dropped JSONB column (PostgreSQL jsonb cast failed)', {
        userHash,
        column: col,
        code: err.code,
        detail: err.detail,
      });
    }
  }
  if (droppedPgCast.length) {
    sessionSyncTrace({
      hypothesisId: 'S6',
      location: 'participants.ts:filterJsonbRowByPostgresCast',
      message: 'jsonb_precast_dropped_summary',
      data: { userHash, droppedPgCast },
    });
  }
  return { row: out, droppedPgCast };
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
    email: rawEmail,
  } = req.body as {
    userHash?: string;
    authUserId?: string;
    consentTimestamp?: string;
    email?: string;
  };

  const email =
    typeof rawEmail === 'string' && rawEmail.trim().length > 0
      ? rawEmail.trim().toLowerCase()
      : null;

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

      // $3 = OAuth email when provided; COALESCE($3, email) fills empty column and overwrites when Google sends a value
      await client.query(
        `
          UPDATE participants
          SET auth_user_id = $2,
              email = COALESCE($3::text, participants.email),
              updated_at = NOW()
          WHERE user_hash = $1
        `,
        [userHash, authUserId, email],
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

// POST /participants/session-export — same JSON as "Pobierz dane" (thanks page); requires column session_export_json
participantsRouter.post('/participants/session-export', async (req, res) => {
  const { userHash, sessionExport } = req.body as {
    userHash?: string;
    sessionExport?: unknown;
  };

  if (!userHash || typeof userHash !== 'string') {
    return res.status(400).json({ ok: false, error: 'userHash is required' });
  }
  if (sessionExport === undefined || sessionExport === null) {
    return res.status(400).json({ ok: false, error: 'sessionExport is required' });
  }

  let payload: string;
  try {
    payload = JSON.stringify(sessionExport);
  } catch {
    return res.status(400).json({ ok: false, error: 'sessionExport_not_serializable' });
  }

  try {
    const client = await pool.connect();
    try {
      const upd = await client.query(
        `
        UPDATE participants
        SET session_export_json = $2::jsonb,
            updated_at = NOW()
        WHERE user_hash = $1
        `,
        [userHash, payload],
      );
      if (upd.rowCount === 0) {
        return res.status(404).json({ ok: false, error: 'participant_not_found' });
      }
      return res.json({ ok: true });
    } catch (e) {
      const err = e as Error & { code?: string; message?: string };
      if (err.code === '42703') {
        return res.status(503).json({
          ok: false,
          error: 'column_missing',
          detail: 'Run migration 14_session_export_json.sql on Cloud SQL (session_export_json).',
        });
      }
      throw e;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('participants/session-export error', error);
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

      sessionSyncTrace({
        hypothesisId: 'S0',
        location: 'participants.ts:POST/session',
        message: 'incoming_row_shape',
        data: {
          userHash,
          keyCount: Object.keys(rawRow).length,
          keysSample: Object.keys(rawRow).sort().slice(0, 48),
        },
      });

      for (let attempt = 0; attempt < 2; attempt++) {
        const allowed = await getParticipantsTableColumns(client);
        const jsonbCols = await getParticipantsJsonbColumnNames(client);
        const jsonbSorted = [...jsonbCols].sort();
        sessionSyncTrace({
          hypothesisId: 'S1',
          location: 'participants.ts:POST/session',
          message: 'jsonb_columns_resolved',
          data: {
            userHash,
            attempt,
            jsonbColumnCount: jsonbCols.size,
            jsonbNamesSample: jsonbSorted.slice(0, 48),
          },
        });
        const { filtered, droppedKeys } = filterParticipantRowToExistingColumns(rawRow, allowed);
        if (droppedKeys.length) {
          sessionSyncTrace({
            hypothesisId: 'S2',
            location: 'participants.ts:POST/session',
            message: 'unknown_columns_dropped',
            data: {
              userHash,
              droppedKeysCount: droppedKeys.length,
              droppedKeysSample: droppedKeys.slice(0, 24),
            },
          });
          console.warn('[participants.session] dropped unknown columns (not in participants table)', {
            userHash,
            droppedKeys,
          });
        }

        const rowSanitized = omitUndefinedRowValues(
          sanitizeParticipantRowJsonb({ ...filtered }, userHash, jsonbCols),
        );
        const { row: rowAfterPrecast, droppedPgCast } = await filterJsonbRowByPostgresCast(
          client,
          rowSanitized,
          jsonbCols,
          userHash,
        );
        const row = rowAfterPrecast;
        const columns = Object.keys(row);
        const values = Object.values(row);

        let rowBytesApprox = 0;
        try {
          rowBytesApprox = JSON.stringify(row).length;
        } catch {
          rowBytesApprox = -1;
        }
        sessionSyncTrace({
          hypothesisId: 'S5',
          location: 'participants.ts:POST/session',
          message: 'ready_for_upsert',
          data: {
            userHash,
            attempt,
            upsertKeyCount: columns.length,
            droppedPgCastCount: droppedPgCast.length,
            droppedPgCastSample: droppedPgCast.slice(0, 16),
            jsonbByteLengths: jsonbKeyByteLengths(row, jsonbCols),
            rowBytesApprox,
          },
        });

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
          sessionSyncTrace({
            hypothesisId: 'S7',
            location: 'participants.ts:POST/session',
            message: 'upsert_ok',
            data: { userHash, attempt, columnCount: columns.length },
          });
          if (isSessionPersistDebug()) {
            console.log('[participants.session:debug] upsert OK', {
              userHash,
              columnCount: columns.length,
            });
          }
          return res.json({ ok: true });
        } catch (queryErr) {
          const qe = queryErr as Error & {
            code?: string;
            detail?: string;
            schema?: string;
            column?: string;
          };
          if (qe.code === '22P02') {
            sessionSyncTrace({
              hypothesisId: 'S8',
              location: 'participants.ts:POST/session',
              message: 'upsert_22p02',
              data: {
                userHash,
                attempt,
                upsertColumnCount: columns.length,
                jsonbColsInRow: jsonbSorted.filter((c) => c in row),
                pg: pgErrorSnapshot(queryErr),
              },
            });
            console.error('[participants.session] upsert JSON/JSONB diagnostic', {
              message: qe.message,
              code: qe.code,
              detail: qe.detail,
              schema: qe.schema,
              column: qe.column,
            });

            const rowScalars = stripJsonbColumns(row, jsonbCols);
            let cols2 = Object.keys(rowScalars);
            let vals2 = Object.values(rowScalars);
            if (!cols2.includes('consent_timestamp')) {
              cols2 = [...cols2, 'consent_timestamp'];
              vals2 = [...vals2, new Date().toISOString()];
            }
            if (cols2.length > 0) {
              const assignments2 = cols2.map((col, idx) => `${col} = $${idx + 2}`);
              const sqlScalars = `
        INSERT INTO participants (user_hash, ${cols2.join(', ')})
        VALUES ($1, ${cols2.map((_, idx) => `$${idx + 2}`).join(', ')})
        ON CONFLICT (user_hash) DO UPDATE
        SET ${assignments2.join(', ')}, updated_at = NOW()
      `;
              try {
                await client.query(sqlScalars, [userHash, ...vals2]);
                console.warn('[participants.session] upsert recovered after 22P02 by omitting all JSONB columns', {
                  userHash,
                });
                sessionSyncTrace({
                  hypothesisId: 'S9',
                  location: 'participants.ts:POST/session',
                  message: 'upsert_22p02_recovered_scalar_only',
                  data: { userHash, scalarColumnCount: cols2.length },
                });
                return res.json({ ok: true, sessionPersistPartial: true });
              } catch (scalarErr) {
                sessionSyncTrace({
                  hypothesisId: 'S10',
                  location: 'participants.ts:POST/session',
                  message: 'upsert_22p02_scalar_retry_failed',
                  data: {
                    userHash,
                    scalarColumnCount: cols2.length,
                    pg: pgErrorSnapshot(scalarErr),
                  },
                });
                console.error('[participants.session] scalar-only upsert also failed', scalarErr);
              }
            }
          }
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
    const err = error as Error & { code?: string; detail?: string; column?: string };
    sessionSyncTrace({
      hypothesisId: 'S99',
      location: 'participants.ts:POST/session',
      message: 'session_route_unhandled_error',
      data: {
        userHash: sessionData?.userHash ?? 'unknown',
        pg: pgErrorSnapshot(error),
      },
    });
    console.error('participants/session error', error);
    const message = err?.message ?? String(error);
    const detail =
      typeof err.detail === 'string' && err.detail.length > 0
        ? `${message.slice(0, 280)} | PG: ${err.detail.slice(0, 420)}`
        : message;
    return res.status(500).json({
      ok: false,
      error: 'session_persist_failed',
      detail,
      code: err?.code,
      pgColumn: err.column,
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

