"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { safeLocalStorage, safeSessionStorage, saveSessionToGcp } from '@/lib/gcp-data';
import { gcpApi } from '@/lib/gcp-api-client';
import {
  GOOGLE_AUTH_EMAIL_STORAGE_KEY,
  GOOGLE_AUTH_USER_ID_STORAGE_KEY,
  PRE_LOGIN_USER_HASH_STORAGE_KEY,
} from '@/lib/auth-storage-keys';
import { getSessionStoreSnapshot, syncSessionUserHash } from '@/hooks/useSession';
import type { SessionData } from '@/types';
import { FULL_FLOW_MAX_JOURNEY_INDEX_STORAGE_KEY } from '@/lib/flow/full-flow-progress';
import { FAST_FLOW_MAX_JOURNEY_INDEX_STORAGE_KEY } from '@/lib/flow/fast-flow-progress';
import {
  persistNativeGoogleUserToLocalStorage,
  signInWithGoogleNative,
  syncGoogleNativeEmailLinkAuth,
} from '@/lib/google-auth';

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
  registerWithEmail: (
    email: string,
    password: string,
    options?: { nextPath?: string },
  ) => Promise<{ error?: any }>;
  loginWithEmail: (email: string, password: string) => Promise<{ error?: any }>;
  completeEmailLogin: (
    email: string,
    password: string,
  ) => Promise<{ error?: { message: string }; effectiveUserHash?: string }>;
  checkEmailVerificationStatus: (email: string) => Promise<boolean>;
  resendVerificationEmail: (email: string, nextPath?: string) => Promise<{ error?: any }>;
  requestPasswordReset: (email: string) => Promise<{ error?: any }>;
  resetPasswordWithToken: (
    token: string,
    password: string,
  ) => Promise<{ error?: any; effectiveUserHash?: string }>;
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

    const storedAuthId = safeLocalStorage.getItem(GOOGLE_AUTH_USER_ID_STORAGE_KEY);
    const storedHash = safeLocalStorage.getItem('aura_user_hash');

    if (!storedAuthId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const AUTH_INIT_MAX_MS = 8_000;
    let alive = true;
    const safetyTimer = window.setTimeout(() => {
      if (alive) setIsLoading(false);
    }, AUTH_INIT_MAX_MS);

    gcpApi.participants
      .fetchByAuth(storedAuthId)
      .then((res) => {
        if (!alive) return;
        if (res.ok && res.data?.participant) {
          const p = res.data.participant as { user_hash?: string; email?: string };
          const hash = p.user_hash || storedHash;
          if (hash) {
            safeLocalStorage.setItem('aura_user_hash', hash);
            syncSessionUserHash(hash);
          }
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
      })
      .catch(() => {})
      .finally(() => {
        window.clearTimeout(safetyTimer);
        // Always clear loading for this request; skip setState if effect was torn down (e.g. React StrictMode remount).
        if (alive) setIsLoading(false);
      });

    return () => {
      alive = false;
      window.clearTimeout(safetyTimer);
    };
  }, []);

  const signInWithGoogle = async (nextPath?: string) => {
    const currentHash = safeLocalStorage.getItem('aura_user_hash');
    const authNextPath = nextPath || safeSessionStorage.getItem('aura_auth_next') || undefined;
    const result = await signInWithGoogleNative({
      currentUserHash: currentHash,
      consentTimestamp: new Date().toISOString(),
      authNextPath,
      onGrantFreeCredits: async (userHash, authUserId) => {
        const r = await fetch('/api/credits/grant-free', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userHash, authUserId }),
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
    persistNativeGoogleUserToLocalStorage(nativeUser);
    await syncGoogleNativeEmailLinkAuth(nativeUser);

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

    const next = authNextPath || '/';
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
    options?: { nextPath?: string },
  ): Promise<{ error?: any }> => {
    if (!gcpApi.isConfigured()) {
      return {
        error: { message: 'Backend nie jest skonfigurowany (NEXT_PUBLIC_GCP_API_BASE_URL).' },
      };
    }
    const linkUserHash = safeLocalStorage.getItem('aura_user_hash') || undefined;
    const res = await gcpApi.auth.register({
      email,
      password,
      linkUserHash,
      nextPath: options?.nextPath,
    });
    if (res.ok) {
      if (res.data?.user_hash) {
        safeLocalStorage.setItem('aura_user_hash', res.data.user_hash);
      }
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
    const result = await completeEmailLogin(email, password);
    if (result.error) {
      return { error: result.error };
    }
    return {};
  };

  const completeEmailLogin = async (
    email: string,
    password: string,
  ): Promise<{ error?: { message: string }; effectiveUserHash?: string }> => {
    if (!gcpApi.isConfigured()) {
      return {
        error: { message: 'Backend nie jest skonfigurowany (NEXT_PUBLIC_GCP_API_BASE_URL).' },
      };
    }

    const priorHash = safeLocalStorage.getItem('aura_user_hash');
    if (priorHash) {
      safeSessionStorage.setItem(PRE_LOGIN_USER_HASH_STORAGE_KEY, priorHash);
    }

    const res = await gcpApi.auth.login({ email, password });
    if (!res.ok || !res.data?.user_hash || !res.data?.auth_user_id) {
      safeSessionStorage.removeItem(PRE_LOGIN_USER_HASH_STORAGE_KEY);
      const raw = typeof res.error === 'string' ? res.error : 'Nie udało się zalogować.';
      let friendly = raw;
      if (raw.includes('email_not_verified')) {
        friendly =
          'Adres e‑mail nie został jeszcze potwierdzony. Otwórz link z wiadomości lub wyślij ponownie.';
      } else if (raw.includes('password_not_set')) {
        friendly =
          'To konto nie ma hasła (logowanie linkiem). Użyj „Zapomniałem hasła” lub magic link.';
      } else if (raw.includes('invalid_credentials')) {
        friendly =
          'Nieprawidłowy e‑mail lub hasło. Sprawdź wielkość liter w adresie i czy konto zostało potwierdzone.';
      }
      return { error: { message: friendly } };
    }

    const { user_hash, auth_user_id, email: responseEmail } = res.data;
    let effectiveHash = user_hash;

    const anonHash = safeSessionStorage.getItem(PRE_LOGIN_USER_HASH_STORAGE_KEY);
    safeSessionStorage.removeItem(PRE_LOGIN_USER_HASH_STORAGE_KEY);

    if (anonHash && anonHash !== user_hash) {
      try {
        const merged = await gcpApi.participants.mergeAnonymousSession({
          authUserId: auth_user_id,
          anonymousUserHash: anonHash,
        });
        if (merged.ok && merged.data?.user_hash) {
          effectiveHash = merged.data.user_hash;
        }
      } catch (e) {
        console.warn('[AuthContext] mergeAnonymousSession failed:', e);
      }
    }

    safeLocalStorage.setItem('aura_user_hash', effectiveHash);
    safeLocalStorage.setItem(GOOGLE_AUTH_USER_ID_STORAGE_KEY, auth_user_id);
    syncSessionUserHash(effectiveHash);
    hydrateFromMagicLink(auth_user_id, responseEmail || email);

    try {
      const snap = getSessionStoreSnapshot();
      await saveSessionToGcp({
        ...snap,
        userHash: effectiveHash,
      } as SessionData);
    } catch (e) {
      console.warn('[AuthContext] saveSessionToGcp after email login failed:', e);
    }

    return { effectiveUserHash: effectiveHash };
  };

  const checkEmailVerificationStatus = async (email: string): Promise<boolean> => {
    if (!gcpApi.isConfigured()) return false;
    const res = await gcpApi.auth.verificationStatus({ email });
    return !!(res.ok && res.data?.verified);
  };

  const requestPasswordReset = async (email: string): Promise<{ error?: any }> => {
    if (!gcpApi.isConfigured()) {
      return {
        error: { message: 'Backend nie jest skonfigurowany (NEXT_PUBLIC_GCP_API_BASE_URL).' },
      };
    }
    const res = await gcpApi.auth.forgotPassword({ email });
    if (res.ok) return {};
    const msg = res.error || 'Nie udało się wysłać maila resetującego.';
    return { error: { message: typeof msg === 'string' ? msg : 'Nie udało się wysłać maila.' } };
  };

  const resetPasswordWithToken = async (
    token: string,
    password: string,
  ): Promise<{ error?: { message: string }; effectiveUserHash?: string }> => {
    if (!gcpApi.isConfigured()) {
      return {
        error: { message: 'Backend nie jest skonfigurowany (NEXT_PUBLIC_GCP_API_BASE_URL).' },
      };
    }
    const res = await gcpApi.auth.resetPassword({ token, password });
    if (!res.ok || !res.data?.user_hash || !res.data?.auth_user_id) {
      const raw = typeof res.error === 'string' ? res.error : 'Nie udało się ustawić hasła.';
      let friendly = raw;
      if (raw.includes('invalid_or_expired_token') || raw.includes('token_already_used')) {
        friendly = 'Link wygasł lub został już użyty. Poproś o nowy reset hasła.';
      } else if (raw.includes('password_too_weak')) {
        friendly = 'Hasło jest za słabe (min. 8 znaków).';
      }
      return { error: { message: friendly } };
    }

    const { user_hash, auth_user_id, email: responseEmail } = res.data;
    safeLocalStorage.setItem('aura_user_hash', user_hash);
    safeLocalStorage.setItem(GOOGLE_AUTH_USER_ID_STORAGE_KEY, auth_user_id);
    syncSessionUserHash(user_hash);
    hydrateFromMagicLink(auth_user_id, responseEmail);
    return { effectiveUserHash: user_hash };
  };

  const resendVerificationEmail = async (
    email: string,
    nextPath?: string,
  ): Promise<{ error?: any }> => {
    if (!gcpApi.isConfigured()) {
      return {
        error: { message: 'Backend nie jest skonfigurowany (NEXT_PUBLIC_GCP_API_BASE_URL).' },
      };
    }
    const res = await gcpApi.auth.resendVerification({ email, nextPath });
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
    safeLocalStorage.removeItem(GOOGLE_AUTH_USER_ID_STORAGE_KEY);
    safeLocalStorage.removeItem(GOOGLE_AUTH_EMAIL_STORAGE_KEY);
    safeLocalStorage.removeItem('aura_session');
    safeLocalStorage.removeItem('aura_user_hash');
    safeSessionStorage.removeItem('aura_session');
    safeSessionStorage.removeItem('aura_user_hash');
    safeSessionStorage.removeItem(FULL_FLOW_MAX_JOURNEY_INDEX_STORAGE_KEY);
    safeSessionStorage.removeItem(FAST_FLOW_MAX_JOURNEY_INDEX_STORAGE_KEY);
    safeSessionStorage.removeItem(PRE_LOGIN_USER_HASH_STORAGE_KEY);
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
        const resolvedHash = linked.data?.existingUserHash || userHash;
        safeLocalStorage.setItem('aura_user_hash', resolvedHash);
        syncSessionUserHash(resolvedHash);
      } else {
        console.warn('linkUserHashToAuth failed:', linked.error);
      }
    } catch (error) {
      console.error('Error in linkUserHashToAuth:', error);
    }

    try {
      await fetch('/api/anon/link-auth', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ authUserId: user.id, userHash }),
      });
    } catch (e) {
      console.warn('[AuthContext] /api/anon/link-auth failed:', e);
    }
  };

  const hydrateFromMagicLink = (authUserId: string, email?: string) => {
    const storedHash = safeLocalStorage.getItem('aura_user_hash');
    if (storedHash) syncSessionUserHash(storedHash);
    safeLocalStorage.setItem(GOOGLE_AUTH_USER_ID_STORAGE_KEY, authUserId);
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
    completeEmailLogin,
    checkEmailVerificationStatus,
    resendVerificationEmail,
    requestPasswordReset,
    resetPasswordWithToken,
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
