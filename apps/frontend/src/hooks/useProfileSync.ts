import { useEffect, useRef } from 'react';
import { useSession } from './useSession';
import { saveUserProfile } from '@/lib/supabase-deep-personalization';
import { mapSessionToUserProfile } from '@/lib/profile-mapper';

export function useProfileSync() {
  const { sessionData } = useSession();
  const lastSyncRef = useRef<string>('');
  
  useEffect(() => {
    if (!sessionData?.userHash) return;
    
    // Sync when core profile is complete OR when Big Five is saved (IPIP-NEO-120)
    // Big Five can be saved independently, so sync whenever it's completed
    const hasBigFive = sessionData.bigFive?.completedAt && sessionData.bigFive?.scores;
    const shouldSync = 
      sessionData.coreProfileComplete || 
      hasBigFive;
    
    // #region agent log
    void fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: 'debug-session',
        runId: 'sync-check',
        hypothesisId: 'H6',
        location: 'useProfileSync.ts:shouldSync-check',
        message: 'Checking if should sync',
        data: {
          hasUserHash: !!sessionData.userHash,
          coreProfileComplete: !!sessionData.coreProfileComplete,
          hasBigFive: !!sessionData.bigFive,
          bigFiveCompletedAt: sessionData.bigFive?.completedAt || null,
          hasBigFiveScores: !!sessionData.bigFive?.scores,
          bigFiveScoresKeys: sessionData.bigFive?.scores ? Object.keys(sessionData.bigFive.scores) : [],
          shouldSync
        },
        timestamp: Date.now()
      })
    }).catch(() => {});
    // #endregion
    
    if (!shouldSync) return;
    
    // Create a sync key to avoid duplicate syncs
    // Include Big Five completedAt in key to trigger sync when Big Five is saved
    const syncKey = `${sessionData.userHash}-${sessionData.coreProfileComplete ? 'core' : ''}-${sessionData.bigFive?.completedAt || ''}-${hasBigFive ? 'bigfive' : ''}`;
    if (lastSyncRef.current === syncKey) return;
    
    const profileData = mapSessionToUserProfile(sessionData);
    
    // #region agent log
    void fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: 'debug-session',
        runId: 'sync-check',
        hypothesisId: 'H6',
        location: 'useProfileSync.ts:after-mapping',
        message: 'After mapping session to profile',
        data: {
          hasPersonality: !!profileData.personality,
          personalityInstrument: profileData.personality?.instrument,
          personalityDomains: profileData.personality?.domains ? Object.keys(profileData.personality.domains) : [],
          personalityCompletedAt: profileData.personality?.completedAt
        },
        timestamp: Date.now()
      })
    }).catch(() => {});
    // #endregion
    
    // #region agent log
    void fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: 'debug-session',
        runId: 'sync-check',
        hypothesisId: 'H1',
        location: 'useProfileSync.ts:sync',
        message: 'Syncing profile to Supabase',
        data: {
          userHash: sessionData.userHash,
          hasImplicit: !!profileData.aestheticDNA?.implicit,
          implicitStyles: profileData.aestheticDNA?.implicit?.dominantStyles?.length || 0,
          implicitColors: profileData.aestheticDNA?.implicit?.colors?.length || 0,
          implicitMaterials: profileData.aestheticDNA?.implicit?.materials?.length || 0,
          hasExplicit: !!profileData.aestheticDNA?.explicit,
          hasPersonality: !!profileData.personality,
          hasInspirations: !!profileData.inspirations && profileData.inspirations.length > 0
        },
        timestamp: Date.now()
      })
    }).catch(() => {});
    // #endregion
    
    saveUserProfile(profileData)
      .then((result) => {
        lastSyncRef.current = syncKey;
        console.log('[useProfileSync] Profile synced to Supabase', {
          hasImplicit: !!result?.aestheticDNA?.implicit,
          hasExplicit: !!result?.aestheticDNA?.explicit,
          hasPersonality: !!result?.personality
        });
        
        // #region agent log
        void fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: 'debug-session',
            runId: 'sync-check',
            hypothesisId: 'H1',
            location: 'useProfileSync.ts:sync-success',
            message: 'Profile sync successful',
            data: {
              success: true,
              hasImplicit: !!result?.aestheticDNA?.implicit,
              hasExplicit: !!result?.aestheticDNA?.explicit,
              hasPersonality: !!result?.personality
            },
            timestamp: Date.now()
          })
        }).catch(() => {});
        // #endregion
      })
      .catch(error => {
        console.error('[useProfileSync] Failed to sync profile to Supabase:', error);
        
        // #region agent log
        void fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: 'debug-session',
            runId: 'sync-check',
            hypothesisId: 'H1',
            location: 'useProfileSync.ts:sync-error',
            message: 'Profile sync failed',
            data: {
              error: error?.message || String(error),
              errorCode: error?.code
            },
            timestamp: Date.now()
          })
        }).catch(() => {});
        // #endregion
      });
  }, [
    sessionData?.coreProfileComplete, 
    sessionData?.userHash,
    sessionData?.bigFive?.completedAt,
    sessionData?.bigFive?.scores,
    sessionData?.colorsAndMaterials,
    sessionData?.semanticDifferential
  ]);
}

