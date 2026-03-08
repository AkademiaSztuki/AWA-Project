import { useCallback } from 'react';
import { useSession } from './useSession';
import { SessionData } from '@/types';
import { saveFullSessionToSupabase, DISABLE_SESSION_SYNC } from '@/lib/supabase';

interface UseSessionDataReturn {
  sessionData: SessionData;
  updateSessionData: (updates: Partial<SessionData>) => void;
  exportSessionData: () => string;
  isInitialized: boolean;
}

export const useSessionData = (): UseSessionDataReturn => {
  const { sessionData, updateSession, isInitialized } = useSession();

  const updateSessionData = useCallback((updates: Partial<SessionData>) => {
    const normalizedUpdates: Partial<SessionData> = { ...updates };
    if (normalizedUpdates.coreProfileComplete && !normalizedUpdates.coreProfileCompletedAt) {
      normalizedUpdates.coreProfileCompletedAt = new Date().toISOString();
    }
    
    updateSession(normalizedUpdates);
    // Zapisz całą sesję do supabase
    if (!DISABLE_SESSION_SYNC) {
      // Avoid setTimeout (can mask ordering/race issues); schedule microtask instead
      queueMicrotask(() => {
        void saveFullSessionToSupabase({ ...sessionData, ...normalizedUpdates });
      });
    } else {
    }
  }, [sessionData, updateSession]);

  const exportSessionData = () => {
    try {
      return JSON.stringify(sessionData, null, 2);
    } catch (err) {
      console.error('Failed to export session data', err);
      return '{}';
    }
  };

  return {
    sessionData,
    updateSessionData,
    exportSessionData,
    isInitialized,
  };
}; 