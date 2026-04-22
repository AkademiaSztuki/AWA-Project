import { randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { ANON_SESSION_COOKIE } from '@/lib/anon-request-helpers';

const MAX_AGE_SEC = 60 * 60 * 24 * 365;

export async function POST(request: NextRequest) {
  // Cookie id is the only key for anon limits; IP is hashed at check/deduct time.
  const existing = request.cookies.get(ANON_SESSION_COOKIE)?.value;
  const id = existing && existing.length > 0 ? existing : randomUUID();

  const res = NextResponse.json({ ok: true, sessionId: id, reused: !!existing });
  res.cookies.set(ANON_SESSION_COOKIE, id, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: MAX_AGE_SEC,
    secure: process.env.NODE_ENV === 'production',
  });
  return res;
}
