import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import type { Language } from './src/lib/questions/validated-scales';
import { REFERRAL_COOKIE_NAME } from './src/lib/referral-constants';

const LANGUAGE_COOKIE = 'app_language';
const ONE_YEAR_IN_SECONDS = 60 * 60 * 24 * 365;
const REFERRAL_COOKIE_MAX_AGE = 60 * 60 * 24 * 30;
const REFERRAL_CODE_PATTERN = /^IDA-[A-Z0-9]{4,12}$/;

// Lista publicznych ścieżek (dostępne bez logowania)
// Wszystkie inne ścieżki będą chronione (w tym /flow/* i /setup/*)
const PUBLIC_PATHS = [
  '/', // Landing page
  '/auth/callback', // Legacy OAuth return (implicit + PKCE)
  '/auth/google', // Google OAuth return (/auth/google/callback)
];

const isLanguage = (value: string | undefined | null): value is Language =>
  value === 'pl' || value === 'en';

const resolveLanguage = (request: NextRequest): Language => {
  const cookieLang = request.cookies.get(LANGUAGE_COOKIE)?.value;
  if (isLanguage(cookieLang)) return cookieLang;

  const country =
    request.geo?.country ??
    request.headers.get('x-vercel-ip-country') ??
    request.headers.get('cf-ipcountry') ??
    request.headers.get('x-country');

  if (country?.toUpperCase() === 'PL') return 'pl';

  const acceptLanguage = request.headers.get('accept-language')?.toLowerCase() ?? '';
  if (acceptLanguage.startsWith('pl')) return 'pl';

  return 'en';
};

const isPublicPath = (pathname: string): boolean => {
  // Sprawdź dokładne dopasowanie
  if (PUBLIC_PATHS.includes(pathname)) return true;
  
  // Sprawdź czy zaczyna się od publicznej ścieżki
  return PUBLIC_PATHS.some(publicPath => pathname.startsWith(publicPath + '/'));
};

function applyReferralCookie(request: NextRequest, response: NextResponse): void {
  const raw = request.nextUrl.searchParams.get('ref')?.trim().toUpperCase() || '';
  if (!REFERRAL_CODE_PATTERN.test(raw)) return;
  response.cookies.set({
    name: REFERRAL_COOKIE_NAME,
    value: raw,
    path: '/',
    maxAge: REFERRAL_COOKIE_MAX_AGE,
    sameSite: 'lax',
  });
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Skip middleware for static model files (GLTF, GLB, BIN)
  if (pathname.startsWith('/model/')) {
    return NextResponse.next();
  }
  
  // Obsługa języka
  const resolvedLanguage = resolveLanguage(request);
  const current = request.cookies.get(LANGUAGE_COOKIE)?.value;

  if (current === resolvedLanguage) {
    const response = NextResponse.next();
    applyReferralCookie(request, response);
    return response;
  }

  const response = NextResponse.next();
  response.cookies.set({
    name: LANGUAGE_COOKIE,
    value: resolvedLanguage,
    path: '/',
    maxAge: ONE_YEAR_IN_SECONDS,
  });
  applyReferralCookie(request, response);

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|site.webmanifest|icon.png|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|gltf|glb|bin)$).*)',
  ],
};
