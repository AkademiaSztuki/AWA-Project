import { createHash } from 'crypto';
import { Router, type Request } from 'express';
import type { PoolClient } from 'pg';
import { pool } from '../db';

export const anonUsageRouter = Router();

const MS_24H = 24 * 60 * 60 * 1000;
const ANON_MAX_PER_PATH = 1;
const IP_MAX_PER_WINDOW = 3;

function getIpHashSalt(): string {
  return process.env.AURA_IP_HASH_SALT || 'awa-dev-salt-set-AURA_IP_HASH_SALT';
}

export function hashIpForStorage(rawIp: string): string {
  return createHash('sha256')
    .update(`${getIpHashSalt()}:${rawIp.trim()}`)
    .digest('hex');
}

function getRequestClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    const first = forwarded.split(',')[0];
    if (first?.trim()) return first.trim();
  }
  const real = req.headers['x-real-ip'];
  if (typeof real === 'string' && real.trim()) return real.trim();
  const socketIp = req.socket?.remoteAddress;
  if (socketIp && socketIp.trim()) return socketIp.trim();
  return '0.0.0.0';
}

type PathScope = 'fast' | 'full';

function parsePathScope(value: unknown): PathScope | null {
  if (value === 'fast' || value === 'full') return value;
  return null;
}

anonUsageRouter.post('/anon/check-limits', async (req, res) => {
  const body = req.body as {
    anonId?: string | null;
    pathScope?: string;
    action?: string;
  };
  const action = typeof body.action === 'string' ? body.action : 'generate';
  const pathScope = parsePathScope(body.pathScope);
  const anonId = typeof body.anonId === 'string' && body.anonId.length > 0 ? body.anonId : null;

  if (action !== 'generate') {
    return res.status(200).json({
      ok: false,
      available: false,
      reason: 'login_required',
      scope: 'anon',
    });
  }
  if (!pathScope) {
    return res.status(400).json({ ok: false, error: 'invalid_path_scope' });
  }
  if (!anonId) {
    return res.status(200).json({
      ok: false,
      available: false,
      reason: 'login_required',
      scope: 'anon',
    });
  }

  const ipHash = hashIpForStorage(getRequestClientIp(req));
  const client = await pool.connect();
  try {
    const pathRow = await client.query<{ usage_count: number }>(
      `SELECT usage_count FROM aura_anon_path_usage WHERE anon_session_id = $1 AND path_scope = $2`,
      [anonId, pathScope],
    );
    const used = pathRow.rows[0]?.usage_count ?? 0;
    if (used >= ANON_MAX_PER_PATH) {
      return res.status(200).json({
        ok: false,
        available: false,
        reason: 'login_required',
        scope: 'anon',
        remaining: 0,
      });
    }

    const ipRow = await client.query<{ window_start: Date; count: number }>(
      `SELECT window_start, count FROM aura_anon_ip_rate WHERE ip_hash = $1`,
      [ipHash],
    );
    const now = Date.now();
    let ipCount = 0;
    if (ipRow.rows[0]) {
      const ws = new Date(ipRow.rows[0].window_start).getTime();
      if (now - ws <= MS_24H) {
        ipCount = ipRow.rows[0].count;
      }
    }
    if (ipCount >= IP_MAX_PER_WINDOW) {
      return res.status(200).json({
        ok: false,
        available: false,
        reason: 'quota_exceeded',
        scope: 'ip',
      });
    }

    return res.json({
      ok: true,
      available: true,
      scope: 'anon',
      remaining: ANON_MAX_PER_PATH - used,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const missing =
      msg.includes('aura_anon_path_usage') ||
      msg.includes('42P01') ||
      msg.includes('does not exist');
    if (missing) {
      console.warn('[anon/check-limits] tables missing — run infra/gcp/sql/15_anon_usage.sql', msg);
      return res.status(503).json({ ok: false, error: 'anon_usage_schema_missing', detail: msg });
    }
    console.error('[anon/check-limits]', e);
    return res.status(500).json({ ok: false, error: 'internal_error' });
  } finally {
    client.release();
  }
});

async function deductInTransaction(
  client: PoolClient,
  anonId: string,
  ipHash: string,
  generationId: string,
  pathScope: PathScope,
): Promise<{ ok: boolean; duplicate?: boolean; error?: string }> {
  await client.query('BEGIN');
  try {
    const ins = await client.query(
      `INSERT INTO aura_anon_generation_dedup (generation_id, anon_session_id)
       VALUES ($1, $2)
       ON CONFLICT (generation_id) DO NOTHING
       RETURNING generation_id`,
      [generationId, anonId],
    );
    if (ins.rowCount === 0) {
      await client.query('COMMIT');
      return { ok: true, duplicate: true };
    }

    await client.query(
      `INSERT INTO aura_anon_path_usage (anon_session_id, path_scope, usage_count, first_used_at, updated_at)
       VALUES ($1, $2, 1, now(), now())
       ON CONFLICT (anon_session_id, path_scope) DO UPDATE SET
         usage_count = aura_anon_path_usage.usage_count + 1,
         first_used_at = COALESCE(aura_anon_path_usage.first_used_at, now()),
         updated_at = now()`,
      [anonId, pathScope],
    );

    const ipSel = await client.query<{ window_start: Date; count: number }>(
      `SELECT window_start, count FROM aura_anon_ip_rate WHERE ip_hash = $1 FOR UPDATE`,
      [ipHash],
    );
    const now = Date.now();
    if (!ipSel.rows[0]) {
      await client.query(
        `INSERT INTO aura_anon_ip_rate (ip_hash, window_start, count, updated_at)
         VALUES ($1, now(), 1, now())`,
        [ipHash],
      );
    } else {
      const ws = new Date(ipSel.rows[0].window_start).getTime();
      if (now - ws > MS_24H) {
        await client.query(
          `UPDATE aura_anon_ip_rate SET window_start = now(), count = 1, updated_at = now() WHERE ip_hash = $1`,
          [ipHash],
        );
      } else {
        await client.query(
          `UPDATE aura_anon_ip_rate SET count = count + 1, updated_at = now() WHERE ip_hash = $1`,
          [ipHash],
        );
      }
    }

    await client.query('COMMIT');
    return { ok: true };
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  }
}

anonUsageRouter.post('/anon/deduct', async (req, res) => {
  const body = req.body as {
    anonId?: string;
    generationId?: string;
    pathScope?: string;
  };
  const anonId = typeof body.anonId === 'string' ? body.anonId : '';
  const generationId = typeof body.generationId === 'string' ? body.generationId : '';
  const pathScope = parsePathScope(body.pathScope);

  if (!anonId || !generationId || !pathScope) {
    return res.status(400).json({ ok: false, error: 'anonId_generationId_pathScope_required' });
  }

  const ipHash = hashIpForStorage(getRequestClientIp(req));
  const client = await pool.connect();
  try {
    const r = await deductInTransaction(client, anonId, ipHash, generationId, pathScope);
    return res.json({ ok: r.ok, duplicate: r.duplicate });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const missing =
      msg.includes('aura_anon_path_usage') ||
      msg.includes('42P01') ||
      msg.includes('does not exist');
    if (missing) {
      console.warn('[anon/deduct] tables missing — run infra/gcp/sql/15_anon_usage.sql', msg);
      return res.status(503).json({ ok: false, error: 'anon_usage_schema_missing', detail: msg });
    }
    console.error('[anon/deduct]', e);
    return res.status(500).json({ ok: false, error: 'internal_error' });
  } finally {
    client.release();
  }
});
