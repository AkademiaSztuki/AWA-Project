import { NextRequest, NextResponse } from 'next/server';
import { redeemPromoCode } from '@/lib/credits';
import { checkRateLimit, getClientIP } from '@/lib/rate-limit';
import { resolveAuthenticatedCreditsUser } from '@/lib/server-participant-auth';

export async function POST(request: NextRequest) {
  try {
    const { userHash, code, authUserId: bodyAuthUserId } = (await request.json()) as {
      userHash?: string;
      code?: string;
      authUserId?: string;
    };

    if (!userHash || !code) {
      return NextResponse.json(
        { error: 'Missing userHash or code' },
        { status: 400 },
      );
    }

    const isAuthenticated = await resolveAuthenticatedCreditsUser(
      request,
      userHash,
      bodyAuthUserId,
    );
    if (!isAuthenticated) {
      return NextResponse.json(
        { error: 'Authentication required to redeem a promo code' },
        { status: 401 },
      );
    }

    const identifier = userHash || getClientIP(request);
    const rateLimit = await checkRateLimit(identifier, 10, 60 * 1000);
    if (!rateLimit.success) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 },
      );
    }

    const result = await redeemPromoCode(userHash, code);

    const messages: Record<string, string> = {
      granted: 'Promo code applied successfully.',
      already_redeemed: 'You have already used this code.',
      invalid_code: 'Invalid promo code.',
      expired: 'This promo code has expired.',
      exhausted: 'This promo code has reached its usage limit.',
      inactive: 'This promo code is not active.',
      not_eligible: 'Sign in to redeem a promo code.',
      error: 'Could not redeem promo code.',
    };

    return NextResponse.json({
      success: result.success,
      reason: result.reason,
      credits: result.credits,
      message: messages[result.reason] || messages.error,
    });
  } catch (error: unknown) {
    console.error('[API Promo Redeem] Error:', error);
    return NextResponse.json(
      { error: 'Failed to redeem promo code' },
      { status: 500 },
    );
  }
}
