import { NextRequest, NextResponse } from 'next/server';

/**
 * Exchanges authorization code + PKCE verifier for access_token (server-side, no CORS).
 * Google OAuth "Web application" clients require a client_secret at the token endpoint,
 * even when PKCE is used. Keep it server-side only.
 */
export async function POST(req: NextRequest) {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json({ error: 'NEXT_PUBLIC_GOOGLE_CLIENT_ID is not set' }, { status: 500 });
  }

  let body: { code?: string; code_verifier?: string; redirect_uri?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const { code, code_verifier, redirect_uri: rawRedirect } = body;
  if (!code || !code_verifier || !rawRedirect) {
    return NextResponse.json({ error: 'missing code, code_verifier, or redirect_uri' }, { status: 400 });
  }

  const redirect_uri = rawRedirect.trim().replace(/\/+$/, '');

  const expectedFixed = process.env.NEXT_PUBLIC_GOOGLE_OAUTH_REDIRECT_URI?.trim().replace(/\/+$/, '');
  if (expectedFixed && redirect_uri !== expectedFixed) {
    return NextResponse.json(
      {
        error: 'redirect_uri_mismatch',
        error_description: `redirect_uri sent (${redirect_uri}) must equal NEXT_PUBLIC_GOOGLE_OAUTH_REDIRECT_URI (${expectedFixed})`,
      },
      { status: 400 },
    );
  }

  const params = new URLSearchParams({
    client_id: clientId,
    code,
    code_verifier,
    grant_type: 'authorization_code',
    redirect_uri,
  });

  const secret = process.env.GOOGLE_CLIENT_SECRET || process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  if (secret) {
    params.set('client_secret', secret);
  }

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });

  const data = (await tokenRes.json().catch(() => ({}))) as {
    access_token?: string;
    error?: string;
    error_description?: string;
  };

  if (!tokenRes.ok) {
    const msg = data.error_description || data.error || 'token_exchange_failed';
    const missingSecret =
      msg.toLowerCase().includes('client_secret') && msg.toLowerCase().includes('missing');
    return NextResponse.json(
      {
        error: missingSecret ? 'missing_google_client_secret' : msg,
        error_description: missingSecret
          ? 'Ten Google OAuth Client ID wymaga sekretu. Dodaj GOOGLE_CLIENT_SECRET do apps/frontend/.env.local, zrestartuj pnpm dev i spróbuj ponownie.'
          : msg,
      },
      { status: 400 },
    );
  }

  if (!data.access_token) {
    return NextResponse.json({ error: 'no_access_token' }, { status: 400 });
  }

  return NextResponse.json({ access_token: data.access_token });
}
