import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import type { Language } from './src/lib/questions/validated-scales';

const LANGUAGE_COOKIE = 'app_language';
const ONE_YEAR_IN_SECONDS = 60 * 60 * 24 * 365;

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

export function middleware(request: NextRequest) {
  const resolvedLanguage = resolveLanguage(request);
  const current = request.cookies.get(LANGUAGE_COOKIE)?.value;

  if (current === resolvedLanguage) {
    return NextResponse.next();
  }

  const response = NextResponse.next();
  response.cookies.set({
    name: LANGUAGE_COOKIE,
    value: resolvedLanguage,
    path: '/',
    maxAge: ONE_YEAR_IN_SECONDS,
  });

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|site.webmanifest|icon.png|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
