import { useCallback } from 'react';
import { useSession } from './useSession';
import { SessionData } from '@/types';

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
    // Persist: useSession.updateSession schedules saveSessionToGcp (see useSession.ts).
  }, [updateSession]);

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