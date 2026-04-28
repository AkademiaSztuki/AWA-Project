import { createHash } from 'crypto';
import type { NextRequest } from 'next/server';

export const ANON_SESSION_COOKIE = 'aura_anon_sid';

const TWENTY_FOUR_H = 24 * 60 * 60 * 1000;

function getIpHashSalt(): string {
  return process.env.AURA_IP_HASH_SALT || 'awa-dev-salt-set-AURA_IP_HASH_SALT';
}

export function hashIpForStorage(rawIp: string): string {
  return createHash('sha256')
    .update(`${getIpHashSalt()}:${rawIp.trim()}`)
    .digest('hex');
}

/**
 * Best-effort client IP for rate limiting (behind proxies).
 */
export function getRequestClientIp(request: NextRequest | Request): string {
  const h = (name: string) => request.headers.get(name);
  const forwarded = h('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0];
    if (first?.trim()) return first.trim();
  }
  const real = h('x-real-ip');
  if (real?.trim()) return real.trim();
  return '0.0.0.0';
}

export function getAnonSessionIdFromRequest(request: NextRequest | Request): string | null {
  if ('cookies' in request && request.cookies) {
    return request.cookies.get(ANON_SESSION_COOKIE)?.value || null;
  }
  return null;
}

const MS_24H = TWENTY_FOUR_H;

/** One free image generation on the fast path and one on the full path, per cookie session.
 *  Production: prefer Cloud SQL via backend-gcp (`anon-db-limits.ts` → `/api/anon/*`).
 *  Fallback: this in-memory store when `NEXT_PUBLIC_GCP_API_BASE_URL` is unset or
 *  `IDA_ANON_LIMITS_MEMORY_ONLY=true` (legacy: `AWA_ANON_LIMITS_MEMORY_ONLY=true`).
 */
export type AnonPathScope = 'fast' | 'full';

type MemAnon = {
  pathCounts: { fast: number; full: number };
  firstAt?: string;
};

type MemIp = { windowStart: number; count: number };
type MemDedup = Set<string>;

type GlobalStore = {
  anon: Map<string, MemAnon>;
  ip: Map<string, MemIp>;
  dedup: MemDedup;
};

function getGlobalStore(): GlobalStore {
  const g = globalThis as unknown as { __awaAnonLimits?: GlobalStore };
  if (!g.__awaAnonLimits) {
    g.__awaAnonLimits = { anon: new Map(), ip: new Map(), dedup: new Set() };
  }
  return g.__awaAnonLimits;
}

const ANON_MAX = 1;
const IP_MAX = 3;

export function parseAnonPathScope(value: unknown): AnonPathScope | null {
  if (value === 'fast' || value === 'full') return value;
  return null;
}

function normalizeAnonRow(row: MemAnon | undefined): MemAnon {
  if (!row) {
    return { pathCounts: { fast: 0, full: 0 } };
  }
  if (row.pathCounts) {
    return row;
  }
  return { pathCounts: { fast: 0, full: 0 }, firstAt: row.firstAt };
}

export type AnonLimitAction = 'generate' | 'regenerate' | 'upscale' | 'save' | 'matrix' | string;

export type AnonCheckResult = {
  ok: boolean;
  reason?: 'login_required' | 'quota_exceeded';
  scope?: 'user' | 'anon' | 'ip';
  remaining?: number;
};

/**
 * In-memory check for anon generate + IP cap (dev / single Node instance).
 * @param pathScope — which funnel consumed the free try (`fast` vs `full`); required for `generate`
 */
export function checkAnonLimitsMemory(
  anonId: string | null,
  ipHash: string,
  action: AnonLimitAction,
  pathScope: AnonPathScope,
): AnonCheckResult {
  if (action !== 'generate') {
    return { ok: false, reason: 'login_required', scope: 'anon' };
  }
  if (!anonId) {
    return { ok: false, reason: 'login_required', scope: 'anon' };
  }
  const store = getGlobalStore();
  const row = normalizeAnonRow(store.anon.get(anonId));
  const used = row.pathCounts[pathScope];
  if (used >= ANON_MAX) {
    return { ok: false, reason: 'login_required', scope: 'anon', remaining: 0 };
  }
  const ipRow = store.ip.get(ipHash);
  const now = Date.now();
  let ipCount = 0;
  if (ipRow) {
    if (now - ipRow.windowStart > MS_24H) {
      ipCount = 0;
    } else {
      ipCount = ipRow.count;
    }
  }
  if (ipCount >= IP_MAX) {
    return { ok: false, reason: 'quota_exceeded', scope: 'ip' };
  }
  const remPath = ANON_MAX - used;
  return { ok: true, scope: 'anon', remaining: remPath };
}

/**
 * In-memory after successful generate (idempotent by generationId).
 */
export function deductAnonLimitsMemory(
  anonId: string,
  ipHash: string,
  generationId: string,
  pathScope: AnonPathScope,
): { ok: boolean; duplicate?: boolean } {
  const store = getGlobalStore();
  if (store.dedup.has(generationId)) {
    return { ok: true, duplicate: true };
  }
  store.dedup.add(generationId);
  const row = normalizeAnonRow(store.anon.get(anonId));
  row.pathCounts[pathScope] += 1;
  if (!row.firstAt) row.firstAt = new Date().toISOString();
  store.anon.set(anonId, row);
  const now = Date.now();
  const ip = store.ip.get(ipHash);
  if (!ip || now - ip.windowStart > MS_24H) {
    store.ip.set(ipHash, { windowStart: now, count: 1 });
  } else {
    ip.count += 1;
  }
  return { ok: true };
}

export { ANON_MAX as ANON_MAX_GENERATIONS_PER_PATH, IP_MAX as IP_MAX_GENERATIONS_PER_24H };
