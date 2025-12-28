"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase, safeLocalStorage, safeSessionStorage } from '@/lib/supabase';
import { User, Session } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  signInWithGoogle: (nextPath?: string) => Promise<void>;
  signInWithEmail: (email: string, nextPath?: string) => Promise<{ error: any }>;
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
    console.log('[AuthContext] Initializing, checking session...');
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) console.error('[AuthContext] Initial session error:', error);
      console.log('[AuthContext] Initial session check:', !!session);
      
      setSession(session);
      setUser(session?.user || null);
      setIsLoading(false);

      // #region agent log
      void fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: 'debug-session',
          runId: 'auth-fix-v3',
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

    // Listen for auth changes without debounce to ensure immediate UI response
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('[AuthContext] Auth state change:', event, !!session);
      
      setSession(session);
      setUser(session?.user || null);

      // If user just signed in, restore user_hash from Supabase and grant free credits
      if ((event === 'SIGNED_IN' || event === 'USER_UPDATED') && session?.user?.id && typeof window !== 'undefined') {
        try {
          const { getUserHashFromAuth } = await import('@/lib/supabase-deep-personalization');
          const userHash = await getUserHashFromAuth(session.user.id);
          if (userHash) {
            safeLocalStorage.setItem('aura_user_hash', userHash);
            console.log('[AuthContext] Restored user_hash from Supabase:', userHash);
            
            // Przyznaj darmowy grant kredytów (600 kredytów = 60 generacji) przez API
            try {
              const response = await fetch('/api/credits/grant-free', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userHash }),
              });
              const data = await response.json();
              if (data.success) {
                console.log('[AuthContext] Granted free credits to user via API:', userHash);
              } else {
                console.log('[AuthContext] Free credits not granted (maybe already used):', data.message);
              }
            } catch (creditError) {
              console.warn('[AuthContext] Failed to grant free credits via API:', creditError);
            }
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
          runId: 'auth-fix-v2',
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
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signInWithGoogle = async (nextPath?: string) => {
    const redirectTo = `${window.location.origin}/auth/callback`;
    
    // Store nextPath in sessionStorage instead of URL to keep the OAuth URL clean
    // This is more robust for Safari Mobile and prevents URL length issues.
    if (nextPath) {
      safeSessionStorage.setItem('aura_auth_next', nextPath);
    } else {
      safeSessionStorage.removeItem('aura_auth_next');
    }

    // Agent log: starting OAuth
    void fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: 'debug-session',
        runId: 'oauth-fix',
        hypothesisId: 'G1',
        location: 'AuthContext.tsx:signInWithGoogle',
        message: 'Calling signInWithOAuth',
        data: { redirectTo, nextPath },
        timestamp: Date.now()
      })
    }).catch(() => {});

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        }
      }
    });

    if (error) {
      console.error('Error signing in with Google:', error);
      throw error;
    }

    // Fallback: If for some reason auto-redirect fails, try manual redirect
    if (data?.url) {
      console.log('[AuthContext] Manual redirect fallback to:', data.url);
      window.location.assign(data.url);
    }
  };

  const signInWithEmail = async (email: string, nextPath?: string) => {
    const emailRedirectTo = `${window.location.origin}/auth/callback`;
    
    if (nextPath) {
      safeSessionStorage.setItem('aura_auth_next', nextPath);
    } else {
      safeSessionStorage.removeItem('aura_auth_next');
    }

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo
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
      // After radical refactor, link auth user on participants (source of truth)
      // Upewnij się, że consent_timestamp zawsze jest ustawione (NOT NULL constraint)
      // Najpierw sprawdź czy rekord istnieje, aby zachować istniejący consent_timestamp
      const { data: existing } = await supabase
        .from('participants')
        .select('consent_timestamp')
        .eq('user_hash', userHash)
        .maybeSingle();

      const consentTimestamp = existing?.consent_timestamp || new Date().toISOString();

      const { error } = await supabase
        .from('participants')
        .upsert({
          user_hash: userHash,
          auth_user_id: user.id,
          consent_timestamp: consentTimestamp, // Zawsze ustaw consent_timestamp
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_hash' } as any);

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

