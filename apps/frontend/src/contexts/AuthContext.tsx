"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
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
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user || null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
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
    if (typeof window !== 'undefined') {
      localStorage.removeItem('aura_session');
      localStorage.removeItem('aura_user_hash');
      sessionStorage.removeItem('aura_session');
      sessionStorage.removeItem('aura_user_hash');
    }
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
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_hash'
        });

      if (error) {
        console.error('Error linking user_hash to auth:', error);
      } else {
        console.log('Successfully linked user_hash to authenticated user');
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

