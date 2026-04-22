import { hashIpForStorage } from './anon-request-helpers';
import {
  type AnonCheckResult,
  type AnonLimitAction,
  type AnonPathScope,
  checkAnonLimitsMemory,
  deductAnonLimitsMemory,
} from './anon-request-helpers';

/**
 * Anonymous free-generation limits: **one** free generation per path (`fast` / `full`) per browser
 * cookie session, plus a global IP cap (3 / 24h) on this Node instance.
 * Primary stack: Google sign-in + GCP (participants, credits). Limits are in-process memory
 * (OK for a single instance; use shared store if you scale horizontally).
 */
export async function checkAnonLimits(
  requestIp: string,
  anonId: string | null,
  action: AnonLimitAction,
  pathScope: AnonPathScope,
): Promise<AnonCheckResult> {
  const ipHash = hashIpForStorage(requestIp);
  return checkAnonLimitsMemory(anonId, ipHash, action, pathScope);
}

export async function deductAnonGenerate(
  requestIp: string,
  anonId: string,
  generationId: string,
  pathScope: AnonPathScope,
): Promise<{ ok: boolean; duplicate?: boolean; error?: string }> {
  const ipHash = hashIpForStorage(requestIp);
  return deductAnonLimitsMemory(anonId, ipHash, generationId, pathScope);
}
