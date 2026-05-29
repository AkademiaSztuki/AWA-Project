import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getCreditOverviewAdmin } from '@/lib/credits';
import {
  getDeclaredAuthUserId,
  isIdaStrictParticipantAuthEnabled,
  resolveAuthenticatedCreditsUser,
  strictParticipantAuthMismatchResponse,
  verifyUserHashOwnedByAuthUser,
} from '@/lib/server-participant-auth';

export async function requireStripeActorOwnsUserHash(
  request: NextRequest,
  userHash: string,
  bodyAuthUserId?: string | null,
): Promise<NextResponse | null> {
  if (isIdaStrictParticipantAuthEnabled()) {
    const authUserId = getDeclaredAuthUserId(request, bodyAuthUserId);
    if (!authUserId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    const ok = await verifyUserHashOwnedByAuthUser(authUserId, userHash);
    if (!ok) {
      return NextResponse.json(
        { error: 'Participant authentication mismatch' },
        { status: 401 },
      );
    }
    return null;
  }

  const authUserId = getDeclaredAuthUserId(request, bodyAuthUserId);
  if (!authUserId) return null;

  const mismatch = await strictParticipantAuthMismatchResponse(
    request,
    userHash,
    bodyAuthUserId,
  );
  if (mismatch) return mismatch;

  const ok = await resolveAuthenticatedCreditsUser(request, userHash, bodyAuthUserId);
  if (!ok) {
    return NextResponse.json(
      { error: 'Participant authentication mismatch' },
      { status: 401 },
    );
  }
  return null;
}

export async function verifyStripeCustomerForUserHash(
  userHash: string,
  customerId: string,
): Promise<boolean> {
  const overview = await getCreditOverviewAdmin(userHash);
  const subCustomer = overview.subscription?.stripe_customer_id;
  return typeof subCustomer === 'string' && subCustomer === customerId;
}
