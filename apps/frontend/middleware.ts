import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import type { Language } from './src/lib/questions/validated-scales';

const LANGUAGE_COOKIE = 'app_language';
const ONE_YEAR_IN_SECONDS = 60 * 60 * 24 * 365;

// Lista publicznych ścieżek (dostępne bez logowania)
// Wszystkie inne ścieżki będą chronione (w tym /flow/* i /setup/*)
const PUBLIC_PATHS = [
  '/', // Landing page
  '/auth/callback', // Auth callback
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

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Skip middleware for static model files (GLTF, GLB, BIN)
  if (pathname.startsWith('/model/')) {
    return NextResponse.next();
  }
  
  // Sprawdź autoryzację - wszystkie ścieżki oprócz publicznych są chronione
  // Note: Supabase używa localStorage, nie cookies, więc szczegółowe sprawdzenie
  // odbywa się w GlobalProtectedRoute po stronie klienta. Middleware tylko przekierowuje
  // niezalogowanych użytkowników na stronę główną, gdzie GlobalProtectedRoute pokaże modal.
  if (!isPublicPath(pathname)) {
    // Przekieruj na stronę główną z parametrem - GlobalProtectedRoute sprawdzi autoryzację
    const url = request.nextUrl.clone();
    url.pathname = '/';
    url.searchParams.set('redirect', pathname);
    url.searchParams.set('auth', 'required');
    return NextResponse.redirect(url);
  }

  // Obsługa języka
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
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|site.webmanifest|icon.png|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|gltf|glb|bin)$).*)',
  ],
};
