import { useSession } from './useSession';
import { SessionData } from '@/types';
import { saveFullSessionToSupabase } from '@/lib/supabase';

interface UseSessionDataReturn {
  sessionData: SessionData;
  updateSessionData: (updates: Partial<SessionData>) => void;
  exportSessionData: () => string;
}

export const useSessionData = (): UseSessionDataReturn => {
  const { sessionData, updateSession } = useSession();

  const updateSessionData = (updates: Partial<SessionData>) => {
    updateSession(updates);
    // Zapisz całą sesję do supabase
    setTimeout(() => saveFullSessionToSupabase({ ...sessionData, ...updates }), 0);
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
  };
}; 