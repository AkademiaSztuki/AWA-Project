"use client";

import { usePathname } from 'next/navigation';
import { ProtectedRoute } from './ProtectedRoute';

// Lista publicznych ścieżek (dostępne bez logowania)
const PUBLIC_PATHS = [
  '/', // Landing page
  '/start', // Existing IDA intro and path selection
  '/auth/callback', // Auth callback
  '/auth/google', // Google OAuth PKCE return (/auth/google/callback)
  '/auth/verify', // Magic link verification
  '/auth/verify-email', // Email verification after registration
  '/flow', // Onboarding / funnel without forced login
  '/setup', // Profile wizard without forced login
];

const isPublicPath = (pathname: string): boolean => {
  // Sprawdź dokładne dopasowanie
  if (PUBLIC_PATHS.includes(pathname)) return true;
  
  // Sprawdź czy zaczyna się od publicznej ścieżki
  return PUBLIC_PATHS.some(publicPath => pathname.startsWith(publicPath + '/'));
};

interface GlobalProtectedRouteProps {
  children: React.ReactNode;
}

/**
 * GlobalProtectedRoute - chroni strony poza listą PUBLIC_PATHS.
 *
 * Publiczne: `/`, `/auth/*`, `/flow/*`, `/setup/*` (funnel bez wymuszonego logowania).
 * Chronione m.in.: `/dashboard`, `/subscription`, `/space`, `/research`.
 */
export function GlobalProtectedRoute({ children }: GlobalProtectedRouteProps) {
  const pathname = usePathname();
  
  // Strony publiczne - nie wymagają logowania
  if (isPublicPath(pathname)) {
    return <>{children}</>;
  }
  
  // Wszystkie inne strony wymagają logowania. (/flow i /setup są publiczne wyżej)
  return <ProtectedRoute>{children}</ProtectedRoute>;
}

