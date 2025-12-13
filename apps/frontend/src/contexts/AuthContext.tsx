"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase, safeLocalStorage, safeSessionStorage } from '@/lib/supabase';
import { User, Session } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  linkUserHashToAuth: (userHash: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user || null);
      setIsLoading(false);

      // #region agent log
      void fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: 'debug-session',
          runId: 'pre-fix',
          hypothesisId: 'H2',
          location: 'AuthContext.tsx:getSession',
          message: 'Supabase getSession resolved',
          data: {
            sessionExists: !!session,
            hasUser: !!session?.user,
            provider: session?.user?.app_metadata?.provider ?? null
          },
          timestamp: Date.now()
        })
      }).catch(() => {});
      // #endregion
    });

    // Listen for auth changes with debounce to avoid multiple rapid calls
    let authChangeTimeout: NodeJS.Timeout | null = null;
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      // Debounce rapid auth state changes (e.g., from React StrictMode double renders)
      if (authChangeTimeout) {
        clearTimeout(authChangeTimeout);
      }
      
      authChangeTimeout = setTimeout(async () => {
        setSession(session);
        setUser(session?.user || null);

        // If user just signed in, restore user_hash from Supabase
        if (event === 'SIGNED_IN' && session?.user?.id && typeof window !== 'undefined') {
          try {
            const { getUserHashFromAuth } = await import('@/lib/supabase-deep-personalization');
            const userHash = await getUserHashFromAuth(session.user.id);
            if (userHash) {
              safeLocalStorage.setItem('aura_user_hash', userHash);
              console.log('[AuthContext] Restored user_hash from Supabase:', userHash);
            }
          } catch (error) {
            console.warn('[AuthContext] Failed to restore user_hash:', error);
          }
        }

        // #region agent log
        void fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: 'debug-session',
            runId: 'pre-fix',
            hypothesisId: 'H2',
            location: 'AuthContext.tsx:onAuthStateChange',
            message: 'Auth state change event',
            data: {
              event,
              sessionExists: !!session,
              hasUser: !!session?.user,
              provider: session?.user?.app_metadata?.provider ?? null
            },
            timestamp: Date.now()
          })
        }).catch(() => {});
        // #endregion
      }, 100); // 100ms debounce
    });

    return () => {
      if (authChangeTimeout) {
        clearTimeout(authChangeTimeout);
      }
      subscription.unsubscribe();
    };
  }, []);

  const signInWithGoogle = async () => {
    const redirectTo = `${window.location.origin}/auth/callback`;

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        flowType: 'pkce',
        redirectTo,
        skipBrowserRedirect: true,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        }
      }
    });

    const url = data?.url ?? null;
    const hasUrl = !!url;
    const parsedUrl = hasUrl ? new URL(url) : null;
    const responseType = parsedUrl?.searchParams.get('response_type') ?? null;
    const hasCodeChallenge = parsedUrl?.searchParams.has('code_challenge') ?? false;

    // #region agent log
    void fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: 'debug-session',
        runId: 'fix4',
        hypothesisId: 'H3',
        location: 'AuthContext.tsx:signInWithGoogle',
        message: 'OAuth sign-in call completed',
        data: {
          redirectTo,
          hasError: !!error,
          errorMessage: error?.message || null,
          responseType,
          hasCodeChallenge,
          hasUrl
        },
        timestamp: Date.now()
      })
    }).catch(() => {});
    // #endregion

    if (error) {
      console.error('Error signing in with Google:', error);
      throw error;
    }

    if (url) {
      window.location.assign(url);
    }
  };

  const signInWithEmail = async (email: string) => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`
      }
    });

    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    // Clear local session
    safeLocalStorage.removeItem('aura_session');
    safeLocalStorage.removeItem('aura_user_hash');
    safeSessionStorage.removeItem('aura_session');
    safeSessionStorage.removeItem('aura_user_hash');
  };

  const linkUserHashToAuth = async (userHash: string) => {
    if (!user) {
      console.error('Cannot link user_hash - no authenticated user');
      return;
    }

    try {
      // Update user_profiles table to link auth user
      const { error } = await supabase
        .from('user_profiles')
        .upsert({
          user_hash: userHash,
          auth_user_id: user.id, // CRITICAL: Link to auth user
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_hash'
        });

      if (error) {
        console.error('Error linking user_hash to auth:', error);
      } else {
        console.log('Successfully linked user_hash to authenticated user');
        // Save user_hash to localStorage for persistence
        safeLocalStorage.setItem('aura_user_hash', userHash);
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
    linkUserHashToAuth
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

