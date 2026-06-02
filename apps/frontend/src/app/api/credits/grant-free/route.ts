import { NextRequest, NextResponse } from 'next/server';
import { grantFreeCredits } from '@/lib/credits';
import { checkRateLimit, getClientIP } from '@/lib/rate-limit';
import { resolveAuthenticatedCreditsUser } from '@/lib/server-participant-auth';

export async function POST(request: NextRequest) {
  try {
    const { userHash, authUserId: bodyAuthUserId } = (await request.json()) as {
      userHash?: string;
      authUserId?: string;
    };

    if (!userHash) {
      return NextResponse.json(
        { error: 'Missing userHash' },
        { status: 400 }
      );
    }

    const isAuthenticated = await resolveAuthenticatedCreditsUser(
      request,
      userHash,
      bodyAuthUserId,
    );
    if (!isAuthenticated) {
      return NextResponse.json(
        { error: 'Authentication required for free credit grant' },
        { status: 401 },
      );
    }

    // Rate limiting: 5 requests per minute per userHash (primary) or IP (fallback)
    const identifier = userHash || getClientIP(request);
    const rateLimit = await checkRateLimit(
      identifier,
      5, // max 5 requests
      60 * 1000 // per minute
    );

    if (!rateLimit.success) {
      const retryAfter = Math.ceil((rateLimit.resetAt - Date.now()) / 1000);
      return NextResponse.json(
        {
          error: 'Too many requests. Please try again later.',
          retryAfter,
        },
        {
          status: 429,
          headers: {
            'Retry-After': retryAfter.toString(),
            'X-RateLimit-Limit': '5',
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': new Date(rateLimit.resetAt).toISOString(),
          },
        }
      );
    }

    const { success, reason } = await grantFreeCredits(userHash);
    const rateHeaders = {
      'X-RateLimit-Limit': '5',
      'X-RateLimit-Remaining': rateLimit.remaining.toString(),
      'X-RateLimit-Reset': new Date(rateLimit.resetAt).toISOString(),
    };

    if (success) {
      return NextResponse.json(
        { success: true, reason, message: 'Free credits granted' },
        { headers: rateHeaders },
      );
    }

    const messages: Record<string, string> = {
      already_used: 'Free credits were already claimed for this account.',
      program_full: 'The early access program is full.',
      not_eligible: 'Sign in to claim early access credits.',
      no_participant: 'Participant record not found.',
      error: 'Failed to grant free credits.',
    };

    return NextResponse.json(
      {
        success: false,
        reason,
        message: messages[reason] || messages.error,
      },
      { headers: rateHeaders },
    );
  } catch (error: any) {
    console.error('[API Credits Grant] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to grant free credits' },
      { status: 500 }
    );
  }
}
