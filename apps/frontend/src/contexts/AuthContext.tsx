"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { safeLocalStorage, safeSessionStorage } from '@/lib/gcp-data';
import { gcpApi } from '@/lib/gcp-api-client';
import { GOOGLE_AUTH_EMAIL_STORAGE_KEY } from '@/lib/auth-storage-keys';
import { signInWithGoogleNative } from '@/lib/google-auth';

const GOOGLE_AUTH_USER_KEY = 'aura_google_auth_user_id';

export interface AuthUser {
  id: string;
  email?: string;
  user_metadata: Record<string, any>;
  app_metadata: Record<string, any>;
  aud: string;
  created_at: string;
}

export interface AuthSession {
  user: AuthUser;
}

interface AuthContextType {
  user: AuthUser | null;
  session: AuthSession | null;
  isLoading: boolean;
  signInWithGoogle: (nextPath?: string) => Promise<void>;
  signInWithEmail: (email: string, nextPath?: string) => Promise<{ error: any; dev_link?: string }>;
  registerWithEmail: (email: string, password: string) => Promise<{ error?: any }>;
  loginWithEmail: (email: string, password: string) => Promise<{ error?: any }>;
  resendVerificationEmail: (email: string) => Promise<{ error?: any }>;
  setPassword: (password: string) => Promise<{ error?: any }>;
  signOut: () => Promise<void>;
  linkUserHashToAuth: (userHash: string) => Promise<void>;
  hydrateFromMagicLink: (authUserId: string, email?: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (typeof window === 'undefined') {
      setIsLoading(false);
      return;
    }

    const storedAuthId = safeLocalStorage.getItem(GOOGLE_AUTH_USER_KEY);
    const storedHash = safeLocalStorage.getItem('aura_user_hash');

    if (storedAuthId) {
      gcpApi.participants
        .fetchByAuth(storedAuthId)
        .then((res) => {
          if (res.ok && res.data?.participant) {
            const p = res.data.participant as { user_hash?: string; email?: string };
            const hash = p.user_hash || storedHash;
            if (hash) safeLocalStorage.setItem('aura_user_hash', hash);
            const emailFromDb =
              typeof p.email === 'string' && p.email.trim().length > 0 ? p.email.trim() : undefined;
            if (emailFromDb) {
              safeLocalStorage.setItem(GOOGLE_AUTH_EMAIL_STORAGE_KEY, emailFromDb);
            }
            const authUser: AuthUser = {
              id: storedAuthId,
              email:
                emailFromDb ||
                (storedAuthId.startsWith('email:') ? storedAuthId.slice(6) : undefined),
              user_metadata: {},
              app_metadata: {},
              aud: '',
              created_at: '',
            };
            setUser(authUser);
            setSession({ user: authUser });
          }
          setIsLoading(false);
        })
        .catch(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, []);

  const signInWithGoogle = async (nextPath?: string) => {
    const currentHash = safeLocalStorage.getItem('aura_user_hash');
    const result = await signInWithGoogleNative({
      currentUserHash: currentHash,
      consentTimestamp: new Date().toISOString(),
      onGrantFreeCredits: async (userHash) => {
        const r = await fetch('/api/credits/grant-free', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userHash }),
        });
        const d = await r.json();
        if (d.success) console.log('[AuthContext] Granted free credits:', userHash);
      },
    });

    if (!result.ok) {
      console.error('[AuthContext] Google sign-in error:', result.error);
      throw new Error(result.error);
    }

    const { user: nativeUser } = result;
    safeLocalStorage.setItem('aura_user_hash', nativeUser.userHash);
    safeLocalStorage.setItem(GOOGLE_AUTH_USER_KEY, nativeUser.authUserId);
    if (nativeUser.email && nativeUser.email.trim().length > 0) {
      safeLocalStorage.setItem(GOOGLE_AUTH_EMAIL_STORAGE_KEY, nativeUser.email.trim());
    }

    if (nativeUser.email?.trim()) {
      try {
        const sync = await gcpApi.participants.linkAuth({
          userHash: nativeUser.userHash,
          authUserId: nativeUser.authUserId,
          email: nativeUser.email.trim().toLowerCase(),
        });
        if (!sync.ok) {
          console.warn('[AuthContext] linkAuth after Google sign-in failed:', sync.error);
        }
      } catch (e) {
        console.warn('[AuthContext] linkAuth after Google sign-in error:', e);
      }
    }

    const authUser: AuthUser = {
      id: nativeUser.authUserId,
      email: nativeUser.email ?? undefined,
      user_metadata: { full_name: nativeUser.name },
      app_metadata: {},
      aud: '',
      created_at: '',
    };
    setUser(authUser);
    setSession({ user: authUser });

    const next =
      nextPath ||
      safeSessionStorage.getItem('aura_auth_next') ||
      '/';
    safeSessionStorage.removeItem('aura_auth_next');
    // Keep aura_auth_path_type so destination page (/flow/onboarding or /setup/profile) can apply it
    window.location.href = next;
  };

  const signInWithEmail = async (
    email: string,
    nextPath?: string,
  ): Promise<{ error: any; dev_link?: string }> => {
    if (!gcpApi.isConfigured()) {
      return {
        error: { message: 'Backend nie jest skonfigurowany (NEXT_PUBLIC_GCP_API_BASE_URL).' },
      };
    }
    const res = await gcpApi.auth.sendMagicLink({
      email,
      nextPath: nextPath || undefined,
    });
    if (res.ok) {
      if (res.data?.dev_link) {
        return { error: null, dev_link: res.data.dev_link };
      }
      return { error: null };
    }
    const msg = res.error || 'Nie udało się wysłać linku.';
    return {
      error: { message: typeof msg === 'string' ? msg : 'Nie udało się wysłać linku.' },
    };
  };

  const registerWithEmail = async (
    email: string,
    password: string,
  ): Promise<{ error?: any }> => {
    if (!gcpApi.isConfigured()) {
      return {
        error: { message: 'Backend nie jest skonfigurowany (NEXT_PUBLIC_GCP_API_BASE_URL).' },
      };
    }
    const res = await gcpApi.auth.register({ email, password });
    if (res.ok) {
      return {};
    }

    const raw = res.error || 'Nie udało się utworzyć konta.';
    const msg = typeof raw === 'string' ? raw : 'Nie udało się utworzyć konta.';

    let friendly = msg;
    if (msg.includes('email_already_exists')) {
      friendly =
        'Ten adres e‑mail jest już używany. Zaloguj się lub użyj innego adresu.';
    } else if (msg.includes('password_too_weak')) {
      friendly =
        'Hasło jest za słabe. Użyj co najmniej 8 znaków (litery, cyfry, znak specjalny).';
    } else if (msg.includes('valid email required')) {
      friendly = 'Podaj poprawny adres e‑mail.';
    } else if (msg.includes('email_send_failed') || msg.includes('email_not_configured')) {
      friendly =
        'Konto zostało założone, ale nie udało się wysłać maila weryfikacyjnego. Spróbuj ponownie później lub skontaktuj się z nami.';
    } else if (msg.includes('internal_error')) {
      friendly =
        'Coś poszło nie tak po naszej stronie. Spróbuj ponownie za chwilę.';
    }

    return {
      error: { message: friendly },
    };
  };

  const loginWithEmail = async (
    email: string,
    password: string,
  ): Promise<{ error?: any }> => {
    if (!gcpApi.isConfigured()) {
      return {
        error: { message: 'Backend nie jest skonfigurowany (NEXT_PUBLIC_GCP_API_BASE_URL).' },
      };
    }
    const res = await gcpApi.auth.login({ email, password });
    if (!res.ok || !res.data?.user_hash || !res.data?.auth_user_id) {
      const msg = res.error || 'Nie udało się zalogować.';
      return {
        error: { message: typeof msg === 'string' ? msg : 'Nie udało się zalogować.' },
      };
    }
    const { user_hash, auth_user_id, email: responseEmail } = res.data;
    safeLocalStorage.setItem('aura_user_hash', user_hash);
    safeLocalStorage.setItem(GOOGLE_AUTH_USER_KEY, auth_user_id);
    hydrateFromMagicLink(auth_user_id, responseEmail || email);
    return {};
  };

  const resendVerificationEmail = async (email: string): Promise<{ error?: any }> => {
    if (!gcpApi.isConfigured()) {
      return {
        error: { message: 'Backend nie jest skonfigurowany (NEXT_PUBLIC_GCP_API_BASE_URL).' },
      };
    }
    const res = await gcpApi.auth.resendVerification({ email });
    if (res.ok) {
      return {};
    }
    const msg = res.error || 'Nie udało się wysłać maila.';
    return {
      error: { message: typeof msg === 'string' ? msg : 'Nie udało się wysłać maila.' },
    };
  };

  const setPassword = async (password: string): Promise<{ error?: any }> => {
    if (!gcpApi.isConfigured()) {
      return {
        error: { message: 'Backend nie jest skonfigurowany (NEXT_PUBLIC_GCP_API_BASE_URL).' },
      };
    }
    if (!user) {
      return {
        error: { message: 'Brak zalogowanego użytkownika.' },
      };
    }
    const userHash = safeLocalStorage.getItem('aura_user_hash') || undefined;
    const payload: { auth_user_id?: string; user_hash?: string; password: string } = {
      password,
    };
    if (user.id) payload.auth_user_id = user.id;
    if (userHash) payload.user_hash = userHash;

    const res = await gcpApi.auth.setPassword(payload);
    if (res.ok) {
      return {};
    }
    const msg = res.error || 'Nie udało się ustawić hasła.';
    return {
      error: { message: typeof msg === 'string' ? msg : 'Nie udało się ustawić hasła.' },
    };
  };

  const signOut = async () => {
    safeLocalStorage.removeItem(GOOGLE_AUTH_USER_KEY);
    safeLocalStorage.removeItem(GOOGLE_AUTH_EMAIL_STORAGE_KEY);
    safeLocalStorage.removeItem('aura_session');
    safeLocalStorage.removeItem('aura_user_hash');
    safeSessionStorage.removeItem('aura_session');
    safeSessionStorage.removeItem('aura_user_hash');
    setUser(null);
    setSession(null);
  };

  const linkUserHashToAuth = async (userHash: string) => {
    if (!user) {
      console.error('Cannot link user_hash – no authenticated user');
      return;
    }

    try {
      const linked = await gcpApi.participants.linkAuth({
        userHash,
        authUserId: user.id,
        email: user.email || undefined,
      });
      if (linked.ok) {
        safeLocalStorage.setItem(
          'aura_user_hash',
          linked.data?.existingUserHash || userHash,
        );
      } else {
        console.warn('linkUserHashToAuth failed:', linked.error);
      }
    } catch (error) {
      console.error('Error in linkUserHashToAuth:', error);
    }
  };

  const hydrateFromMagicLink = (authUserId: string, email?: string) => {
    const resolvedEmail = email ?? (authUserId.startsWith('email:') ? authUserId.slice(6) : undefined);
    if (resolvedEmail && resolvedEmail.trim().length > 0) {
      safeLocalStorage.setItem(GOOGLE_AUTH_EMAIL_STORAGE_KEY, resolvedEmail.trim());
    }
    const authUser: AuthUser = {
      id: authUserId,
      email: resolvedEmail,
      user_metadata: {},
      app_metadata: {},
      aud: '',
      created_at: '',
    };
    setUser(authUser);
    setSession({ user: authUser });
  };

  const value = {
    user,
    session,
    isLoading,
    signInWithGoogle,
    signInWithEmail,
    registerWithEmail,
    loginWithEmail,
    resendVerificationEmail,
    setPassword,
    signOut,
    linkUserHashToAuth,
    hydrateFromMagicLink,
  };

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
