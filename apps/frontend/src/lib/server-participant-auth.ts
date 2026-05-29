import type { NextRequest } from 'next/server';
import { gcpApi } from '@/lib/gcp-api-client';
import { AUTH_USER_ID_HEADER } from '@/lib/credits-request-headers';

export function getAuthUserIdFromRequest(request: NextRequest): string | null {
  const fromHeader = request.headers.get(AUTH_USER_ID_HEADER)?.trim();
  return fromHeader || null;
}

export async function verifyUserHashOwnedByAuthUser(
  authUserId: string,
  userHash: string,
): Promise<boolean> {
  if (!gcpApi.isConfigured()) return false;
  const res = await gcpApi.participants.fetchByAuth(authUserId);
  if (!res.ok || !res.data?.participant) return false;
  const p = res.data.participant as { user_hash?: string };
  return p.user_hash === userHash;
}

export async function resolveAuthenticatedCreditsUser(
  request: NextRequest,
  userHash: string,
  bodyAuthUserId?: string | null,
): Promise<boolean> {
  const authUserId = getAuthUserIdFromRequest(request) || bodyAuthUserId?.trim() || null;
  if (!authUserId) return false;
  return verifyUserHashOwnedByAuthUser(authUserId, userHash);
}
