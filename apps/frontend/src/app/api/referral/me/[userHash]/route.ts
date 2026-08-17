import { NextRequest, NextResponse } from 'next/server';
import { gcpApi } from '@/lib/gcp-api-client';

export async function GET(
  _request: NextRequest,
  { params }: { params: { userHash: string } },
) {
  const userHash = params.userHash?.trim();
  if (!userHash) {
    return NextResponse.json({ error: 'userHash is required' }, { status: 400 });
  }

  const result = await gcpApi.referral.me(userHash);
  if (!result.ok || !result.data) {
    return NextResponse.json(
      { error: result.error || 'referral_unavailable' },
      { status: result.status || 502 },
    );
  }
  return NextResponse.json(result.data);
}
