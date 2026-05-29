import { NextRequest, NextResponse } from 'next/server';
import { createPortalSession } from '@/lib/stripe';
import { sanitizeSameOriginUrl } from '@/lib/safe-relative-redirect';
import {
  requireStripeActorOwnsUserHash,
  verifyStripeCustomerForUserHash,
} from '@/lib/stripe-route-auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { customerId, returnUrl, userHash, authUserId: bodyAuthUserId } = body;

    if (!customerId || !userHash) {
      return NextResponse.json(
        { error: 'Missing required fields: customerId, userHash' },
        { status: 400 },
      );
    }

    const authReject = await requireStripeActorOwnsUserHash(
      request,
      userHash,
      bodyAuthUserId,
    );
    if (authReject) return authReject;

    const ownsCustomer = await verifyStripeCustomerForUserHash(userHash, customerId);
    if (!ownsCustomer) {
      return NextResponse.json(
        { error: 'Stripe customer does not match participant' },
        { status: 403 },
      );
    }

    const portalUrl = await createPortalSession({
      customerId,
      returnUrl: sanitizeSameOriginUrl(
        returnUrl,
        request.nextUrl.origin,
        '/dashboard',
      ),
    });

    return NextResponse.json({ url: portalUrl });
  } catch (error: any) {
    console.error('Error creating portal session:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create portal session' },
      { status: 500 },
    );
  }
}
