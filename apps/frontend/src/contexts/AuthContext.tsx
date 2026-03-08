"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { safeLocalStorage, safeSessionStorage } from '@/lib/supabase';
import { gcpApi } from '@/lib/gcp-api-client';

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
  signOut: () => Promise<void>;
  linkUserHashToAuth: (userHash: string) => Promise<void>;
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
            const hash =
              (res.data.participant as { user_hash?: string }).user_hash ||
              storedHash;
            if (hash) safeLocalStorage.setItem('aura_user_hash', hash);
            const authUser: AuthUser = {
              id: storedAuthId,
              email: storedAuthId.startsWith('email:') ? storedAuthId.slice(6) : undefined,
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
    const { signInWithGoogleNative } = await import('@/lib/google-auth');
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
    return {
      error: { message: res.error || 'Nie udało się wysłać linku.' },
    };
  };

  const signOut = async () => {
    safeLocalStorage.removeItem(GOOGLE_AUTH_USER_KEY);
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

  const value = {
    user,
    session,
    isLoading,
    signInWithGoogle,
    signInWithEmail,
    signOut,
    linkUserHashToAuth,
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
