"use client";

import { useEffect, useState } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { LoginModal } from './LoginModal';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAuth?: boolean; // Domyślnie true
}

export function ProtectedRoute({ 
  children, 
  requireAuth = true 
}: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [showLogin, setShowLogin] = useState(false);

  useEffect(() => {
    if (!requireAuth) return;

    // Poczekaj na załadowanie sesji
    if (isLoading) return;

    // Jeśli użytkownik nie jest zalogowany
    if (!user) {
      // Sprawdź czy redirect jest w URL (może być ustawiony przez window.history.replaceState)
      const urlParams = new URLSearchParams(window.location.search);
      const redirect = urlParams.get('redirect') || searchParams.get('redirect') || pathname;
      
      // Pokaż modal logowania
      setShowLogin(true);
    } else {
      // Użytkownik zalogowany
      setShowLogin(false);

      // Dodatkowa logika dostępu do dashboardu została wyłączona –
      // zalogowany użytkownik zawsze może wejść na /dashboard.
    }
  }, [user, isLoading, requireAuth, pathname, searchParams, router]);

  // Pokaż loading podczas sprawdzania autoryzacji
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold mx-auto mb-4"></div>
          <p className="text-graphite font-modern">Ładowanie...</p>
        </div>
      </div>
    );
  }

  // Jeśli wymagane logowanie i użytkownik nie zalogowany - pokaż modal
  if (requireAuth && !user) {
    // Determine the path we want to return to
    const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
    const effectiveRedirect = urlParams?.get('redirect') || searchParams.get('redirect') || pathname;

    return (
      <>
        <LoginModal
          isOpen={showLogin}
          redirectPath={effectiveRedirect}
          onClose={() => {
            setShowLogin(false);
            // Przekieruj na stronę główną jeśli zamknięto modal
            router.push('/');
          }}
          onSuccess={() => {
            setShowLogin(false);
            // Przekieruj na docelową stronę (standardowo wracamy tam, gdzie był login)
            if (effectiveRedirect && effectiveRedirect !== pathname) {
              router.push(effectiveRedirect);
            } else {
              router.push(pathname);
            }
          }}
          message="Musisz się zalogować, aby uzyskać dostęp do tej strony."
        />
        {/* Możesz pokazać placeholder lub pustą stronę podczas logowania */}
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <p className="text-graphite font-modern mb-4">Wymagane logowanie</p>
          </div>
        </div>
      </>
    );
  }

  // Użytkownik zalogowany - pokaż zawartość
  return <>{children}</>;
}

