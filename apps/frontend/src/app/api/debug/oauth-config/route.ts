import { NextRequest, NextResponse } from 'next/server';
import { describeGoogleOAuthClientConfig } from '@/lib/google-oauth-config';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function isOAuthDebugAllowed(req: NextRequest): boolean {
  if (process.env.NODE_ENV !== 'production') return true;
  if (process.env.VERCEL_ENV === 'preview') return true;

  const secret = process.env.OAUTH_DEBUG_SECRET?.trim();
  if (!secret) return false;

  const header = req.headers.get('x-oauth-debug-secret')?.trim();
  const query = req.nextUrl.searchParams.get('secret')?.trim();
  return header === secret || query === secret;
}

/**
 * Returns redirect_uri and flow metadata for debugging redirect_uri_mismatch.
 * Production: only with OAUTH_DEBUG_SECRET (header or ?secret=).
 */
export async function GET(req: NextRequest) {
  if (!isOAuthDebugAllowed(req)) {
    return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 });
  }

  const proto = req.headers.get('x-forwarded-proto') ?? 'https';
  const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host') ?? 'localhost';
  const origin = `${proto}://${host}`.replace(/\/+$/, '');
  const hostname = host.split(':')[0] ?? host;
  const userAgent = req.headers.get('user-agent') ?? '';

  const config = describeGoogleOAuthClientConfig({ origin, hostname, userAgent });

  return NextResponse.json({
    ok: true,
    ...config,
    origin,
    hostname,
    vercelEnv: process.env.VERCEL_ENV ?? null,
    nodeEnv: process.env.NODE_ENV,
  });
}
