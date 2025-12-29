import { NextRequest, NextResponse } from 'next/server';
import { grantFreeCredits } from '@/lib/credits';
import { checkRateLimit, getClientIP } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  try {
    const { userHash } = await request.json();

    if (!userHash) {
      return NextResponse.json(
        { error: 'Missing userHash' },
        { status: 400 }
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

    const success = await grantFreeCredits(userHash);

    if (success) {
      return NextResponse.json(
        { success: true, message: 'Free credits granted' },
        {
          headers: {
            'X-RateLimit-Limit': '5',
            'X-RateLimit-Remaining': rateLimit.remaining.toString(),
            'X-RateLimit-Reset': new Date(rateLimit.resetAt).toISOString(),
          },
        }
      );
    } else {
      return NextResponse.json(
        { success: false, message: 'Free credits already granted or failed to grant' },
        {
          headers: {
            'X-RateLimit-Limit': '5',
            'X-RateLimit-Remaining': rateLimit.remaining.toString(),
            'X-RateLimit-Reset': new Date(rateLimit.resetAt).toISOString(),
          },
        }
      );
    }
  } catch (error: any) {
    console.error('[API Credits Grant] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to grant free credits' },
      { status: 500 }
    );
  }
}
