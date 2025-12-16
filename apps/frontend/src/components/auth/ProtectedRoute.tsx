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
      const authRequired = urlParams.get('auth') === 'required' || searchParams.get('auth') === 'required';
      
      // Pokaż modal logowania tylko jeśli nie ma już innego modala na stronie
      // (niektóre strony jak PathSelectionScreen mają własne modale)
      setShowLogin(true);
    } else {
      // Użytkownik zalogowany - zamknij modal jeśli był otwarty
      setShowLogin(false);
    }
  }, [user, isLoading, requireAuth, pathname, searchParams]);

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
    return (
      <>
        <LoginModal
          isOpen={showLogin}
          onClose={() => {
            setShowLogin(false);
            // Przekieruj na stronę główną jeśli zamknięto modal
            router.push('/');
          }}
          onSuccess={() => {
            setShowLogin(false);
            // Po zalogowaniu przekieruj na docelową stronę
            // Sprawdź redirect z URL (może być ustawiony przez window.history.replaceState)
            const urlParams = new URLSearchParams(window.location.search);
            const redirect = urlParams.get('redirect') || searchParams.get('redirect');
            
            if (redirect && redirect !== pathname && redirect !== '/flow/path-selection') {
              // Użyj redirect z URL (ustawiony przez PathSelectionScreen lub middleware)
              router.push(redirect);
            } else if (pathname !== '/flow/path-selection') {
              // Jeśli nie ma redirect i nie jesteśmy na path-selection, użyj pathname
              router.push(pathname);
            } else {
              // Fallback dla path-selection - dashboard
              router.push('/dashboard');
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

