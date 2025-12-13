import { useEffect, useLayoutEffect, useRef } from 'react';
import { useSession } from './useSession';
import { saveUserProfile } from '@/lib/supabase-deep-personalization';
import { mapSessionToUserProfile } from '@/lib/profile-mapper';
import { safeLocalStorage } from '@/lib/supabase';

export function useProfileSync() {
  const { sessionData } = useSession();
  const lastSyncRef = useRef<string>('');
  
  // useEffect will re-run when biophiliaScore changes (it's in dependency array)
  // This ensures sync happens with the latest biophiliaScore value
  useEffect(() => {
    if (!sessionData?.userHash) return;
    
    // #region agent log
    void fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: 'debug-session',
        runId: 'sync-check',
        hypothesisId: 'H8',
        location: 'useProfileSync.ts:useEffect-triggered',
        message: 'useProfileSync useEffect triggered',
        data: {
          roomPreferencesBiophiliaScore: sessionData.roomPreferences?.biophiliaScore,
          roomPreferencesBiophiliaScoreType: typeof sessionData.roomPreferences?.biophiliaScore,
          biophiliaScore: sessionData.biophiliaScore,
          biophiliaScoreType: typeof sessionData.biophiliaScore,
          biophiliaScoreUndefined: sessionData.biophiliaScore === undefined,
          hasRoomPreferences: !!sessionData.roomPreferences,
          coreProfileComplete: !!sessionData.coreProfileComplete,
          hasBigFive: !!sessionData.bigFive,
          hasExplicit: !!sessionData.colorsAndMaterials,
          explicitStyle: sessionData.colorsAndMaterials?.selectedStyle,
          explicitStyleType: typeof sessionData.colorsAndMaterials?.selectedStyle,
          explicitStyleIsEmpty: sessionData.colorsAndMaterials?.selectedStyle === '',
          explicitStyleIsNull: sessionData.colorsAndMaterials?.selectedStyle === null,
          explicitStyleIsUndefined: sessionData.colorsAndMaterials?.selectedStyle === undefined,
          explicitPalette: sessionData.colorsAndMaterials?.selectedPalette,
          explicitMaterialsCount: sessionData.colorsAndMaterials?.topMaterials?.length || 0,
          colorsAndMaterialsKeys: sessionData.colorsAndMaterials ? Object.keys(sessionData.colorsAndMaterials) : []
        },
        timestamp: Date.now()
      })
    }).catch(() => {});
    // #endregion
    
    // Sync when core profile is complete OR when Big Five is saved (IPIP-NEO-120)
    // Big Five can be saved independently, so sync whenever it's completed
    // CRITICAL: Also sync when explicit preferences or visualDNA exist (even if profile is not complete)
    const hasBigFive = sessionData.bigFive?.completedAt && sessionData.bigFive?.scores;
    const hasExplicitPreferences = !!sessionData.colorsAndMaterials && (
      (sessionData.colorsAndMaterials.selectedStyle && sessionData.colorsAndMaterials.selectedStyle.length > 0) ||
      (sessionData.colorsAndMaterials.selectedPalette && sessionData.colorsAndMaterials.selectedPalette.length > 0) ||
      (sessionData.colorsAndMaterials.topMaterials && sessionData.colorsAndMaterials.topMaterials.length > 0)
    );
    const hasVisualDNA = !!sessionData.visualDNA && (
      (sessionData.visualDNA.preferences?.colors && sessionData.visualDNA.preferences.colors.length > 0) ||
      (sessionData.visualDNA.preferences?.materials && sessionData.visualDNA.preferences.materials.length > 0) ||
      (sessionData.visualDNA.preferences?.styles && sessionData.visualDNA.preferences.styles.length > 0) ||
      !!sessionData.visualDNA.dominantStyle
    );
    const shouldSync = 
      sessionData.coreProfileComplete || 
      hasBigFive ||
      hasExplicitPreferences ||
      hasVisualDNA;
    
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
            hasExplicitPreferences,
            hasVisualDNA,
            roomPreferencesBiophiliaScore: sessionData.roomPreferences?.biophiliaScore,
            roomPreferencesBiophiliaScoreType: typeof sessionData.roomPreferences?.biophiliaScore,
            biophiliaScore: sessionData.biophiliaScore,
            biophiliaScoreType: typeof sessionData.biophiliaScore,
            biophiliaScoreUndefined: sessionData.biophiliaScore === undefined,
            hasRoomPreferences: !!sessionData.roomPreferences,
            shouldSync
          },
          timestamp: Date.now()
        })
      }).catch(() => {});
      // #endregion
    
    if (!shouldSync) return;
    
    // Create a sync key to avoid duplicate syncs
    // Include Big Five completedAt in key to trigger sync when Big Five is saved
    // Also include biophiliaScore in key to trigger sync when biophiliaScore changes
    // Check both roomPreferences.biophiliaScore (room-specific) and sessionData.biophiliaScore (global)
    // CRITICAL: Include selectedStyle, selectedPalette, and topMaterials in syncKey to trigger sync when explicit preferences change
    const effectiveBiophiliaScore = sessionData.roomPreferences?.biophiliaScore ?? sessionData.biophiliaScore;
    const explicitStyle = sessionData.colorsAndMaterials?.selectedStyle || '';
    const explicitPalette = sessionData.colorsAndMaterials?.selectedPalette || '';
    const explicitMaterials = sessionData.colorsAndMaterials?.topMaterials || [];
    const explicitMaterialsKey = explicitMaterials.length > 0 ? explicitMaterials.join(',') : 'none';
    const syncKey = `${sessionData.userHash}-${sessionData.coreProfileComplete ? 'core' : ''}-${sessionData.bigFive?.completedAt || ''}-${hasBigFive ? 'bigfive' : ''}-biophilia:${effectiveBiophiliaScore ?? 'undefined'}-style:${explicitStyle}-palette:${explicitPalette}-materials:${explicitMaterialsKey}`;
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
          explicitSelectedStyle: profileData.aestheticDNA?.explicit?.selectedStyle || null,
          explicitSelectedStyleType: typeof profileData.aestheticDNA?.explicit?.selectedStyle,
          explicitSelectedStyleIsEmpty: profileData.aestheticDNA?.explicit?.selectedStyle === '',
          explicitSelectedStyleIsNull: profileData.aestheticDNA?.explicit?.selectedStyle === null,
          explicitSelectedStyleIsUndefined: profileData.aestheticDNA?.explicit?.selectedStyle === undefined,
          explicitSelectedPalette: profileData.aestheticDNA?.explicit?.selectedPalette || null,
          explicitTopMaterials: profileData.aestheticDNA?.explicit?.topMaterials || [],
          explicitTopMaterialsCount: profileData.aestheticDNA?.explicit?.topMaterials?.length || 0,
          hasPersonality: !!profileData.personality,
          hasInspirations: !!profileData.inspirations && profileData.inspirations.length > 0,
          biophiliaScore: profileData.psychologicalBaseline?.biophiliaScore,
          hasPsychologicalBaseline: !!profileData.psychologicalBaseline
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
              hasPersonality: !!result?.personality,
              biophiliaScore: result?.psychologicalBaseline?.biophiliaScore,
              hasPsychologicalBaseline: !!result?.psychologicalBaseline,
              authUserId: result?.auth_user_id || null
            },
            timestamp: Date.now()
          })
        }).catch(() => {});
        // #endregion
        
        // After saving profile with auth_user_id, try to restore userHash if needed
        // This helps when user logs in for the first time and gets a new userHash
        // but there's an existing profile with auth_user_id
        if (result && result.auth_user_id && typeof window !== 'undefined') {
          import('@/lib/supabase-deep-personalization').then(({ getUserHashFromAuth }) => {
            getUserHashFromAuth(result.auth_user_id!).then((restoredUserHash) => {
              if (restoredUserHash && restoredUserHash !== sessionData.userHash) {
                // #region agent log
                void fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    sessionId: 'debug-session',
                    runId: 'incognito-fix',
                    hypothesisId: 'I10',
                    location: 'useProfileSync.ts:restore-userHash-after-save',
                    message: 'Restored userHash after profile save',
                    data: {
                      oldUserHash: sessionData.userHash,
                      newUserHash: restoredUserHash,
                      authUserId: result.auth_user_id
                    },
                    timestamp: Date.now()
                  })
                }).catch(() => {});
                // #endregion
                safeLocalStorage.setItem('aura_user_hash', restoredUserHash);
                console.log('[useProfileSync] Restored userHash after profile save:', restoredUserHash);
                // Trigger a page reload to use the correct userHash
                // This is a workaround - ideally we'd update sessionData directly
                window.location.reload();
              }
            }).catch((error) => {
              console.warn('[useProfileSync] Failed to restore userHash after save:', error);
            });
          });
        }
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
    // CRITICAL: Use individual fields instead of the whole object to ensure React detects changes
    sessionData?.colorsAndMaterials?.selectedStyle, // CRITICAL: React to selectedStyle changes
    sessionData?.colorsAndMaterials?.selectedPalette, // CRITICAL: React to selectedPalette changes
    sessionData?.colorsAndMaterials?.topMaterials?.length, // CRITICAL: React to topMaterials changes (use length to avoid array reference issues)
    sessionData?.semanticDifferential,
    sessionData?.biophiliaScore, // CRITICAL: React to biophiliaScore changes to trigger sync
    sessionData?.roomPreferences?.biophiliaScore, // CRITICAL: React to roomPreferences.biophiliaScore changes (room-specific override)
    // CRITICAL: Also include the whole colorsAndMaterials object to ensure React detects changes even if individual fields don't trigger
    sessionData?.colorsAndMaterials
  ]);
}

