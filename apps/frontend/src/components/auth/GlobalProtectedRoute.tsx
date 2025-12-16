"use client";

import { usePathname } from 'next/navigation';
import { ProtectedRoute } from './ProtectedRoute';

// Lista publicznych ścieżek (dostępne bez logowania)
const PUBLIC_PATHS = [
  '/', // Landing page
  '/auth/callback', // Auth callback
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
 * GlobalProtectedRoute - chroni wszystkie strony oprócz landing i auth callback
 * 
 * Wszystkie strony wymagają logowania, w tym:
 * - /flow/* (onboarding flow)
 * - /setup/* (setup pages)
 * - /dashboard/*
 * - /space/*
 * - /research/*
 * - i wszystkie inne
 */
export function GlobalProtectedRoute({ children }: GlobalProtectedRouteProps) {
  const pathname = usePathname();
  
  // Strony publiczne - nie wymagają logowania
  if (isPublicPath(pathname)) {
    return <>{children}</>;
  }
  
  // Wszystkie inne strony - wymagają logowania (w tym /flow/* i /setup/*)
  return <ProtectedRoute>{children}</ProtectedRoute>;
}

