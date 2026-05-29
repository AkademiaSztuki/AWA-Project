import { NextRequest, NextResponse } from 'next/server';
import { checkCreditsAvailableAdmin } from '@/lib/credits';
import {
  getAnonSessionIdFromRequest,
  getRequestClientIp,
  parseAnonPathScope,
  type AnonLimitAction,
} from '@/lib/anon-request-helpers';
import { checkAnonLimits } from '@/lib/anon-db-limits';
import { resolveAuthenticatedCreditsUser } from '@/lib/server-participant-auth';

const CREDIT_ACTIONS: AnonLimitAction[] = [
  'generate',
  'regenerate',
  'upscale',
  'save',
  'matrix',
];

function isAction(x: unknown): x is AnonLimitAction {
  return typeof x === 'string' && (CREDIT_ACTIONS as string[]).includes(x);
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      userHash?: string;
      amount?: number;
      action?: string;
      pathScope?: string;
    };
    const { userHash, amount = 10 } = body;
    const action: AnonLimitAction = isAction(body.action) ? body.action : 'generate';
    const pathScope = parseAnonPathScope(body.pathScope);

    if (!userHash) {
      return NextResponse.json({ error: 'Missing required field: userHash' }, { status: 400 });
    }

    const isAuthenticated = await resolveAuthenticatedCreditsUser(request, userHash);
    if (isAuthenticated) {
      const available = await checkCreditsAvailableAdmin(userHash, amount);
      return NextResponse.json({
        ok: true,
        available,
        scope: 'user' as const,
        ...(available ? {} : { reason: 'quota_exceeded' as const }),
      });
    }

    if (!pathScope) {
      return NextResponse.json(
        { error: 'Invalid or missing pathScope (expected "fast" or "full")' },
        { status: 400 },
      );
    }

    const ip = getRequestClientIp(request);
    const anonId = getAnonSessionIdFromRequest(request);
    const result = await checkAnonLimits(ip, anonId, action, pathScope);

    if (!result.ok) {
      return NextResponse.json(
        {
          ok: false,
          available: false,
          reason: result.reason,
          scope: result.scope,
          remaining: result.remaining,
        },
        { status: 429 },
      );
    }

    return NextResponse.json({
      ok: true,
      available: true,
      scope: result.scope,
      remaining: result.remaining,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to check credits';
    console.error('Error checking credits:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
