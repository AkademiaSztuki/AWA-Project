import { NextRequest, NextResponse } from 'next/server';
import { gcpApi } from '@/lib/gcp-api-client';
import { checkRateLimit, getClientIP } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  try {
    const { userHash, code } = (await request.json()) as { userHash?: string; code?: string };
    if (!userHash || !code) {
      return NextResponse.json({ error: 'userHash and code are required' }, { status: 400 });
    }

    const rateLimit = await checkRateLimit(getClientIP(request) || userHash, 20, 60 * 1000);
    if (!rateLimit.success) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const result = await gcpApi.referral.attribute({ userHash, code });
    if (!result.ok || !result.data) {
      return NextResponse.json(
        { error: result.error || 'attribute_failed' },
        { status: result.status || 502 },
      );
    }
    return NextResponse.json(result.data);
  } catch (error) {
    console.error('[API referral/attribute]', error);
    return NextResponse.json({ error: 'attribute_failed' }, { status: 500 });
  }
}
