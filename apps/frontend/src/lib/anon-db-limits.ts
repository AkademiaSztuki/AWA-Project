import { hashIpForStorage } from './anon-request-helpers';
import {
  type AnonCheckResult,
  type AnonLimitAction,
  type AnonPathScope,
  checkAnonLimitsMemory,
  deductAnonLimitsMemory,
} from './anon-request-helpers';
import { gcpApi } from './gcp-api-client';

function isAnonMemoryOnlyMode(): boolean {
  const v = (
    process.env.IDA_ANON_LIMITS_MEMORY_ONLY ?? process.env.AWA_ANON_LIMITS_MEMORY_ONLY
  )?.toLowerCase();
  return v === '1' || v === 'true' || v === 'yes';
}

/**
 * Anonymous free-generation limits: **one** free generation per path (`fast` / `full`) per browser
 * cookie session, plus a global IP cap (3 / 24h). Prefer backend-gcp + Cloud SQL when
 * `NEXT_PUBLIC_GCP_API_BASE_URL` is set and tables exist (`infra/gcp/sql/15_anon_usage.sql`);
 * otherwise falls back to in-process memory (single Node instance).
 */
export async function checkAnonLimits(
  requestIp: string,
  anonId: string | null,
  action: AnonLimitAction,
  pathScope: AnonPathScope,
): Promise<AnonCheckResult> {
  const ipHash = hashIpForStorage(requestIp);
  if (isAnonMemoryOnlyMode() || !gcpApi.isConfigured()) {
    return checkAnonLimitsMemory(anonId, ipHash, action, pathScope);
  }

  const res = await gcpApi.anon.checkLimits({
    anonId,
    pathScope,
    action,
  });

  if (res.ok && res.data) {
    const d = res.data;
    if (d.ok && d.available !== false) {
      return { ok: true, scope: 'anon', remaining: d.remaining ?? 1 };
    }
    return {
      ok: false,
      reason: d.reason ?? 'login_required',
      scope: (d.scope === 'ip' ? 'ip' : 'anon') as 'anon' | 'ip',
      remaining: d.remaining,
    };
  }

  console.warn('[checkAnonLimits] GCP anon check failed, using memory:', res.error);
  return checkAnonLimitsMemory(anonId, ipHash, action, pathScope);
}

export async function deductAnonGenerate(
  requestIp: string,
  anonId: string,
  generationId: string,
  pathScope: AnonPathScope,
): Promise<{ ok: boolean; duplicate?: boolean; error?: string }> {
  const ipHash = hashIpForStorage(requestIp);
  if (isAnonMemoryOnlyMode() || !gcpApi.isConfigured()) {
    return deductAnonLimitsMemory(anonId, ipHash, generationId, pathScope);
  }

  const res = await gcpApi.anon.deduct({ anonId, generationId, pathScope });
  if (res.ok && res.data && res.data.ok) {
    return { ok: true, duplicate: res.data.duplicate };
  }

  console.warn('[deductAnonGenerate] GCP anon deduct failed, using memory:', res.error);
  return deductAnonLimitsMemory(anonId, ipHash, generationId, pathScope);
}
