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

  const updateSessionData = (updates: Partial<SessionData>) => {
    // #region agent log
    void fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useSessionData.ts:updateSessionData',message:'Updating session data',data:{hasUserHash:!!sessionData?.userHash,updateKeys:Object.keys(updates),hasBigFive:!!updates.bigFive,hasVisualDNA:!!updates.visualDNA,hasColorsAndMaterials:!!updates.colorsAndMaterials,hasInspirations:!!updates.inspirations},timestamp:Date.now(),sessionId:'debug-session',runId:'flow-debug',hypothesisId:'H13'})}).catch(()=>{});
    // #endregion
    
    updateSession(updates);
    // Zapisz całą sesję do supabase
    // #region agent log
    void fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useSessionData.ts:updateSessionData-check-sync',message:'Checking if sync should run',data:{disableSync:DISABLE_SESSION_SYNC,hasUserHash:!!sessionData?.userHash},timestamp:Date.now(),sessionId:'debug-session',runId:'flow-debug',hypothesisId:'H13'})}).catch(()=>{});
    // #endregion
    if (!DISABLE_SESSION_SYNC) {
      // Avoid setTimeout (can mask ordering/race issues); schedule microtask instead
      // #region agent log
      void fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useSessionData.ts:updateSessionData-queueing-sync',message:'Queueing saveFullSessionToSupabase',data:{hasUserHash:!!sessionData?.userHash,updateKeys:Object.keys(updates)},timestamp:Date.now(),sessionId:'debug-session',runId:'flow-debug',hypothesisId:'H13'})}).catch(()=>{});
      // #endregion
      queueMicrotask(() => {
        // #region agent log
        void fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useSessionData.ts:updateSessionData-calling-sync',message:'Calling saveFullSessionToSupabase',data:{hasUserHash:!!sessionData?.userHash,mergedKeys:Object.keys({...sessionData,...updates})},timestamp:Date.now(),sessionId:'debug-session',runId:'flow-debug',hypothesisId:'H13'})}).catch(()=>{});
        // #endregion
        void saveFullSessionToSupabase({ ...sessionData, ...updates });
      });
    } else {
      // #region agent log
      void fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useSessionData.ts:updateSessionData-sync-disabled',message:'Session sync is disabled',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'flow-debug',hypothesisId:'H13'})}).catch(()=>{});
      // #endregion
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