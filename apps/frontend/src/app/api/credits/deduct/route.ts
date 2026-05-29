import { NextRequest, NextResponse } from 'next/server';
import { deductCredits } from '@/lib/credits';
import { getAnonSessionIdFromRequest, getRequestClientIp, parseAnonPathScope } from '@/lib/anon-request-helpers';
import { deductAnonGenerate } from '@/lib/anon-db-limits';
import { resolveAuthenticatedCreditsUser, strictParticipantAuthMismatchResponse } from '@/lib/server-participant-auth';

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      userHash?: string;
      generationId?: string;
      pathScope?: string;
    };
    const { userHash, generationId } = body;
    const pathScope = parseAnonPathScope(body.pathScope);

    if (!userHash || !generationId) {
      return NextResponse.json(
        { error: 'Missing required fields: userHash, generationId' },
        { status: 400 },
      );
    }

    const isAuthenticated = await resolveAuthenticatedCreditsUser(request, userHash);
    if (!isAuthenticated) {
      const strictReject = await strictParticipantAuthMismatchResponse(request, userHash);
      if (strictReject) return strictReject;
    }
    if (isAuthenticated) {
      const success = await deductCredits(userHash, generationId);
      if (!success) {
        return NextResponse.json({ error: 'Failed to deduct credits' }, { status: 500 });
      }
      return NextResponse.json({ success: true, ok: true, scope: 'user' as const });
    }

    if (!pathScope) {
      return NextResponse.json(
        { error: 'Invalid or missing pathScope (expected "fast" or "full")' },
        { status: 400 },
      );
    }

    const anonId = getAnonSessionIdFromRequest(request);
    if (!anonId) {
      return NextResponse.json({ error: 'Anon session cookie required', reason: 'login_required' }, { status: 400 });
    }
    const ip = getRequestClientIp(request);
    const r = await deductAnonGenerate(ip, anonId, generationId, pathScope);
    if (!r.ok) {
      return NextResponse.json(
        { error: r.error || 'Failed to record anon usage', success: false },
        { status: 500 },
      );
    }
    return NextResponse.json({ success: true, ok: true, scope: 'anon' as const, duplicate: r.duplicate });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to deduct credits';
    console.error('Error in credits deduct:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
