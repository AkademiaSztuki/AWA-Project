import { NextRequest, NextResponse } from 'next/server';
import { getCreditOverviewAdmin } from '@/lib/credits';
import { checkRateLimit, getClientIP } from '@/lib/rate-limit';
import { strictParticipantAuthMismatchResponse } from '@/lib/server-participant-auth';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userHash = searchParams.get('userHash');

    if (!userHash) {
      return NextResponse.json(
        { error: 'Missing required parameter: userHash' },
        { status: 400 },
      );
    }

    const ip = getClientIP(request);
    const rateLimit = await checkRateLimit(`balance:${ip}`, 120, 60 * 1000);
    if (!rateLimit.success) {
      return NextResponse.json(
        { error: 'Too many requests' },
        { status: 429 },
      );
    }

    const strictReject = await strictParticipantAuthMismatchResponse(
      request,
      userHash,
    );
    if (strictReject) return strictReject;

    const balance = await getCreditOverviewAdmin(userHash);

    return NextResponse.json(balance);
  } catch (error: any) {
    console.error('Error getting credit balance:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get credit balance' },
      { status: 500 },
    );
  }
}
