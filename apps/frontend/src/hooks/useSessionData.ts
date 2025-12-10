import { useSession } from './useSession';
import { SessionData } from '@/types';
import { saveFullSessionToSupabase, DISABLE_SESSION_SYNC } from '@/lib/supabase';
import { useProfileSync } from './useProfileSync';

interface UseSessionDataReturn {
  sessionData: SessionData;
  updateSessionData: (updates: Partial<SessionData>) => void;
  exportSessionData: () => string;
  isInitialized: boolean;
}

export const useSessionData = (): UseSessionDataReturn => {
  const { sessionData, updateSession, isInitialized } = useSession();
  
  // Auto-sync profile data (Big Five, explicit preferences) to Supabase
  useProfileSync();

  const updateSessionData = (updates: Partial<SessionData>) => {
    updateSession(updates);
    // Zapisz całą sesję do supabase
    if (!DISABLE_SESSION_SYNC) {
    setTimeout(() => saveFullSessionToSupabase({ ...sessionData, ...updates }), 0);
    }
  };

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