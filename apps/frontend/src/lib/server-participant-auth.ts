import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { gcpApi } from '@/lib/gcp-api-client';
import { AUTH_USER_ID_HEADER } from '@/lib/credits-request-headers';

export function isIdaStrictParticipantAuthEnabled(): boolean {
  return process.env.IDA_STRICT_PARTICIPANT_AUTH === 'true';
}

export function getAuthUserIdFromRequest(request: NextRequest): string | null {
  const fromHeader = request.headers.get(AUTH_USER_ID_HEADER)?.trim();
  return fromHeader || null;
}

export function getDeclaredAuthUserId(
  request: NextRequest,
  bodyAuthUserId?: string | null,
): string | null {
  return getAuthUserIdFromRequest(request) || bodyAuthUserId?.trim() || null;
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
  const authUserId = getDeclaredAuthUserId(request, bodyAuthUserId);
  if (!authUserId) return false;
  return verifyUserHashOwnedByAuthUser(authUserId, userHash);
}

/** When strict mode is on, reject spoofed auth (declared user id does not own userHash). */
export async function strictParticipantAuthMismatchResponse(
  request: NextRequest,
  userHash: string,
  bodyAuthUserId?: string | null,
): Promise<NextResponse | null> {
  if (!isIdaStrictParticipantAuthEnabled()) return null;
  const authUserId = getDeclaredAuthUserId(request, bodyAuthUserId);
  if (!authUserId) return null;
  const ok = await verifyUserHashOwnedByAuthUser(authUserId, userHash);
  if (ok) return null;
  return NextResponse.json(
    { error: 'Participant authentication mismatch' },
    { status: 401 },
  );
}