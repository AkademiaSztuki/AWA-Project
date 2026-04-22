import { NextRequest, NextResponse } from 'next/server';

/**
 * Optional hook after Google sign-in: client already calls `gcpApi.participants.linkAuth`
 * (Cloud Run / Cloud SQL). This route is a no-op success so older clients can still POST
 * without a second store.
 */
export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as { authUserId?: string; userHash?: string };
  if (!body.authUserId || !body.userHash) {
    return NextResponse.json({ error: 'authUserId and userHash are required' }, { status: 400 });
  }

  return NextResponse.json({ ok: true, source: 'gcp' as const });
}
