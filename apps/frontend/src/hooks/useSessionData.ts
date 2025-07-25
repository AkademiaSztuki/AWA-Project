import { useSession } from './useSession';
import { SessionData } from '@/types';

interface UseSessionDataReturn {
  sessionData: SessionData;
  updateSessionData: (updates: Partial<SessionData>) => void;
  exportSessionData: () => string;
}

export const useSessionData = (): UseSessionDataReturn => {
  const { sessionData, updateSession } = useSession();

  const updateSessionData = (updates: Partial<SessionData>) => {
    updateSession(updates);
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