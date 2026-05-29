import type { NextRequest } from 'next/server';
import { checkRateLimit } from '@/lib/rate-limit';
import { getRequestClientIp } from '@/lib/anon-request-helpers';

const AI_PROXY_MAX_PER_MINUTE = 30;

export async function enforceAiProxyRateLimit(
  request: NextRequest,
  bucket: string,
): Promise<{ ok: true } | { ok: false; retryAfter: number }> {
  const ip = getRequestClientIp(request);
  const key = `ai:${bucket}:${ip}`;
  const limit = await checkRateLimit(key, AI_PROXY_MAX_PER_MINUTE, 60 * 1000);
  if (!limit.success) {
    const retryAfter = Math.max(1, Math.ceil((limit.resetAt - Date.now()) / 1000));
    return { ok: false, retryAfter };
  }
  return { ok: true };
}
