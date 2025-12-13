import { SessionData } from '@/types';
import { UserProfile } from '@/types/deep-personalization';
import { computeWeightedDNAFromSwipes } from '@/lib/dna';

export function mapSessionToUserProfile(sessionData: SessionData): Partial<UserProfile> {
  // Analyze Tinder swipes to get implicit preferences
  const tinderSwipes = sessionData.tinderData?.swipes || [];
  const weightedDNA = computeWeightedDNAFromSwipes(
    tinderSwipes,
    sessionData.tinderData?.totalImages
  );
  
  // CRITICAL: Use visualDNA if it exists and has data, otherwise use weightedDNA
  // This ensures that visualDNA from Supabase is preserved when loading profile
  const hasVisualDNA = !!sessionData.visualDNA && (
    (sessionData.visualDNA.preferences?.colors && sessionData.visualDNA.preferences.colors.length > 0) ||
    (sessionData.visualDNA.preferences?.materials && sessionData.visualDNA.preferences.materials.length > 0) ||
    (sessionData.visualDNA.preferences?.styles && sessionData.visualDNA.preferences.styles.length > 0) ||
    !!sessionData.visualDNA.dominantStyle
  );
  
  const implicitData = hasVisualDNA ? {
    dominantStyles: sessionData.visualDNA.preferences?.styles || [sessionData.visualDNA.dominantStyle].filter(Boolean),
    colors: sessionData.visualDNA.preferences?.colors || [],
    materials: sessionData.visualDNA.preferences?.materials || []
  } : {
    dominantStyles: weightedDNA.top.styles,
    colors: weightedDNA.top.colors,
    materials: weightedDNA.top.materials
  };

    // --- Personality (Big Five) mapping: IPIP-NEO-120 only ---
  let personality: UserProfile['personality'] | undefined;

  if (sessionData.bigFive) {
    const raw = sessionData.bigFive;
    const scores: any = raw.scores || {};

    // #region agent log
    void fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: 'debug-session',
        runId: 'sync-check',
        hypothesisId: 'H7',
        location: 'profile-mapper.ts:bigFive-mapping',
        message: 'Mapping Big Five to profile',
        data: {
          hasBigFive: true,
          instrument: raw.instrument,
          hasScores: !!scores,
          scoresKeys: scores ? Object.keys(scores) : [],
          hasDomains: !!scores.domains,
          hasFacets: !!scores.facets,
          domainsKeys: scores.domains ? Object.keys(scores.domains) : [],
          facetsKeys: scores.facets ? Object.keys(scores.facets) : []
        },
        timestamp: Date.now()
      })
    }).catch(() => {});
    // #endregion

    // Always use IPIP-NEO-120 (IPIP-60 removed)
    const instrument: 'IPIP-NEO-120' = 'IPIP-NEO-120';

    // Normalize domain scores into unified structure
    const normalizedDomains: NonNullable<UserProfile['personality']>['domains'] = {};

    // IPIP-NEO-120 canonical domains (O, C, E, A, N)
    if (scores.domains) {
      const d = scores.domains as {
        O?: number;
        C?: number;
        E?: number;
        A?: number;
        N?: number;
      };
      if (typeof d.O === 'number') normalizedDomains.O = d.O;
      if (typeof d.C === 'number') normalizedDomains.C = d.C;
      if (typeof d.E === 'number') normalizedDomains.E = d.E;
      if (typeof d.A === 'number') normalizedDomains.A = d.A;
      if (typeof d.N === 'number') normalizedDomains.N = d.N;
    }

    // IPIP-60 removed - only IPIP-NEO-120 format (O/C/E/A/N) is supported

    // Facets: pass through IPIP-NEO-120 facet structure when available
    const facetsSource = scores.facets as
      | {
          O?: { [key: number]: number };
          C?: { [key: number]: number };
          E?: { [key: number]: number };
          A?: { [key: number]: number };
          N?: { [key: number]: number };
        }
      | undefined;

    const facets =
      facetsSource &&
      (facetsSource.O ||
        facetsSource.C ||
        facetsSource.E ||
        facetsSource.A ||
        facetsSource.N)
        ? {
            O: facetsSource.O || {},
            C: facetsSource.C || {},
            E: facetsSource.E || {},
            A: facetsSource.A || {},
            N: facetsSource.N || {}
          }
        : undefined;

    personality = {
      instrument,
      domains: normalizedDomains,
      facets,
      // We currently don't persist per-item metadata here – can be added later if needed
      completedAt: raw.completedAt
    };
    
    // #region agent log
    void fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: 'debug-session',
        runId: 'sync-check',
        hypothesisId: 'H7',
        location: 'profile-mapper.ts:bigFive-mapped',
        message: 'Big Five mapped to personality',
        data: {
          instrument: personality.instrument,
          hasDomains: !!personality.domains,
          domainsKeys: personality.domains ? Object.keys(personality.domains) : [],
          hasFacets: !!personality.facets,
          facetsKeys: personality.facets ? Object.keys(personality.facets) : [],
          completedAt: personality.completedAt
        },
        timestamp: Date.now()
      })
    }).catch(() => {});
    // #endregion
  } else {
    // #region agent log
    void fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: 'debug-session',
        runId: 'sync-check',
        hypothesisId: 'H7',
        location: 'profile-mapper.ts:bigFive-missing',
        message: 'No Big Five in sessionData',
        data: {
          hasBigFive: false
        },
        timestamp: Date.now()
      })
    }).catch(() => {});
    // #endregion
  }

  // Biophilia score: check roomPreferences first (room-specific), then top-level (global profile)
  // This matches the logic in input-builder.ts: roomPrefs?.biophiliaScore ?? sessionData.biophiliaScore ?? 1
  const biophiliaScore = sessionData.roomPreferences?.biophiliaScore ?? sessionData.biophiliaScore ?? 0;
  
  // #region agent log
  // Log biophiliaScore mapping
  void fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId: 'debug-session',
      runId: 'explicit-check',
      hypothesisId: 'E6',
      location: 'profile-mapper.ts:biophilia-mapping',
      message: 'Mapping biophiliaScore from sessionData to UserProfile',
      data: {
        roomPreferencesBiophiliaScore: sessionData.roomPreferences?.biophiliaScore,
        roomPreferencesBiophiliaScoreType: typeof sessionData.roomPreferences?.biophiliaScore,
        sessionDataBiophiliaScore: sessionData.biophiliaScore,
        sessionDataBiophiliaScoreType: typeof sessionData.biophiliaScore,
        sessionDataBiophiliaScoreUndefined: sessionData.biophiliaScore === undefined,
        sessionDataBiophiliaScoreNull: sessionData.biophiliaScore === null,
        mappedBiophiliaScore: biophiliaScore,
        hasRoomPreferences: !!sessionData.roomPreferences,
        hasPrsIdeal: !!sessionData.prsIdeal,
        sessionDataKeys: Object.keys(sessionData).filter(k => k.includes('biophilia') || k.includes('sensory') || k.includes('nature') || k.includes('roomPreferences'))
      },
      timestamp: Date.now()
    })
  }).catch(() => {});
  // #endregion

  // #region agent log
  const explicitStyle = sessionData.colorsAndMaterials?.selectedStyle || '';
  const explicitPalette = sessionData.colorsAndMaterials?.selectedPalette || '';
  const explicitMaterials = sessionData.colorsAndMaterials?.topMaterials || [];
  void fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'profile-mapper.ts:explicit-mapping',message:'Mapping explicit to UserProfile',data:{selectedPalette:explicitPalette,selectedStyle:explicitStyle,selectedStyleType:typeof explicitStyle,selectedStyleIsEmpty:explicitStyle==='',materialsCount:explicitMaterials.length},timestamp:Date.now(),sessionId:'debug-session',runId:'explicit-check',hypothesisId:'E11'})}).catch(()=>{});
  void fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'profile-mapper.ts:explicit-mapping-2',message:'Explicit payload snapshot',data:{selectedPalette:explicitPalette||null,selectedStyle:explicitStyle||null,selectedStyleType:typeof explicitStyle,selectedStyleIsEmpty:explicitStyle==='',materials:explicitMaterials.slice(0,5)},timestamp:Date.now(),sessionId:'debug-session',runId:'explicit-check',hypothesisId:'E12'})}).catch(()=>{});
  // #endregion

  return {
    userHash: sessionData.userHash,

    aestheticDNA: {
      implicit: {
        dominantStyles: implicitData.dominantStyles,
        colors: implicitData.colors,
        materials: implicitData.materials,
        complexity: (sessionData.visualDNA as any)?.implicitScores?.complexity || 0.5, // Use visualDNA scores if available
        warmth: (sessionData.visualDNA as any)?.implicitScores?.warmth || 0.5, // Use visualDNA scores if available
        brightness: (sessionData.visualDNA as any)?.implicitScores?.brightness || 0.5, // Use visualDNA scores if available
        swipePatterns: [] // TODO: add pattern analysis
      },
      explicit: {
        selectedPalette: sessionData.colorsAndMaterials?.selectedPalette || '',
        topMaterials: sessionData.colorsAndMaterials?.topMaterials || [],
        selectedStyle: (() => {
          const style = sessionData.colorsAndMaterials?.selectedStyle;
          // CRITICAL: Only map if style is a non-empty string
          // If style is empty string '', null, or undefined, return undefined (don't overwrite existing value in Supabase)
          if (!style || style === '') {
            return undefined;
          }
          // #region agent log
          void fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sessionId: 'debug-session',
              runId: 'explicit-check',
              hypothesisId: 'E19',
              location: 'profile-mapper.ts:selectedStyle-mapping',
              message: 'Mapping selectedStyle to UserProfile',
              data: {
                rawStyle: style,
                rawStyleType: typeof style,
                rawStyleIsEmpty: style === '',
                rawStyleIsNull: style === null,
                rawStyleIsUndefined: style === undefined,
                hasColorsAndMaterials: !!sessionData.colorsAndMaterials,
                colorsAndMaterialsKeys: sessionData.colorsAndMaterials ? Object.keys(sessionData.colorsAndMaterials) : [],
                mappedStyle: style
              },
              timestamp: Date.now()
            })
          }).catch(() => {});
          // #endregion
          return style;
        })(),
        warmthPreference: sessionData.semanticDifferential?.warmth || 0.5,
        brightnessPreference: sessionData.semanticDifferential?.brightness || 0.5,
        complexityPreference: sessionData.semanticDifferential?.complexity || 0.5
      } as any
    },

    psychologicalBaseline: {
      prsIdeal: sessionData.prsIdeal || { x: 0, y: 0 },
      biophiliaScore: biophiliaScore
    },

    lifestyle: {
      vibe: sessionData.lifestyle?.lifeVibe || '',
      goals: sessionData.lifestyle?.goals || [],
      values: [] // TODO: extract from ladder results
    },

    sensoryPreferences: {
      music: sessionData.sensoryPreferences?.music || '',
      texture: sessionData.sensoryPreferences?.texture || '',
      light: sessionData.sensoryPreferences?.light || '',
      natureMetaphor: sessionData.natureMetaphor || ''
    },

    projectiveResponses: {
      naturePlace: sessionData.natureMetaphor || '',
      aspirationalSelf: sessionData.aspirationalSelf
        ? JSON.stringify(sessionData.aspirationalSelf)
        : undefined
    },

    personality,

    inspirations: sessionData.inspirations || [],

    profileCompletedAt: sessionData.coreProfileCompletedAt || (sessionData.coreProfileComplete ? new Date().toISOString() : undefined)
  };
}

/**
 * Map UserProfile back to SessionData (reverse mapping)
 * Used when loading user profile from Supabase to restore session state
 */
export function mapUserProfileToSessionData(userProfile: UserProfile): Partial<SessionData> {
  const sessionUpdates: Partial<SessionData> = {};

  // Map Big Five personality
  if (userProfile.personality) {
    const personality = userProfile.personality;
    sessionUpdates.bigFive = {
      instrument: personality.instrument || 'IPIP-NEO-120',
      responses: {}, // We don't store individual responses in UserProfile
      scores: {
        domains: personality.domains ? { ...personality.domains } : undefined,
        facets: personality.facets ? { ...personality.facets } : undefined
      },
      completedAt: personality.completedAt || new Date().toISOString()
    };
  }

  // Map implicit preferences (aestheticDNA.implicit) to visualDNA
  // CRITICAL: Only map if implicit has actual data (non-empty arrays or dominantStyle)
  if (userProfile.aestheticDNA?.implicit) {
    const implicit = userProfile.aestheticDNA.implicit;
    const hasImplicitData = (
      (implicit.colors && implicit.colors.length > 0) ||
      (implicit.materials && implicit.materials.length > 0) ||
      (implicit.dominantStyles && implicit.dominantStyles.length > 0)
    );
    if (hasImplicitData) {
      sessionUpdates.visualDNA = {
        dominantStyle: implicit.dominantStyles?.[0],
        preferences: {
          colors: implicit.colors || [],
          materials: implicit.materials || [],
          styles: implicit.dominantStyles || [],
          lighting: []
        },
        accuracyScore: implicit.complexity || 0.5, // Use complexity as accuracy score fallback
        implicitScores: {
          warmth: implicit.warmth || 0.5,
          brightness: implicit.brightness || 0.5,
          complexity: implicit.complexity || 0.5
        }
      } as any;
    }
  }

  // Map explicit preferences (aestheticDNA.explicit)
  if (userProfile.aestheticDNA?.explicit) {
    const explicit = userProfile.aestheticDNA.explicit;
    sessionUpdates.colorsAndMaterials = {
      selectedPalette: explicit.selectedPalette || '',
      topMaterials: explicit.topMaterials || [],
      // CRITICAL: Only map selectedStyle if it's a non-empty string    
      // If it's empty string '', null, or undefined, don't overwrite existing value in sessionData                                                    
      ...((explicit as any).selectedStyle && (explicit as any).selectedStyle.length > 0 ? { selectedStyle: (explicit as any).selectedStyle } : {})
    };
    sessionUpdates.semanticDifferential = {
      warmth: explicit.warmthPreference ?? 0.5,
      brightness: explicit.brightnessPreference ?? 0.5,
      complexity: explicit.complexityPreference ?? 0.5,
      texture: 0.5 // Not stored in UserProfile
    };
  }

  // Map sensory preferences
  if (userProfile.sensoryPreferences) {
    sessionUpdates.sensoryPreferences = {
      music: userProfile.sensoryPreferences.music || '',
      texture: userProfile.sensoryPreferences.texture || '',
      light: userProfile.sensoryPreferences.light || '',
      natureMetaphor: (userProfile.sensoryPreferences as any).natureMetaphor || ''
    } as any;
  }

  // Map biophiliaScore
  if (userProfile.psychologicalBaseline?.biophiliaScore !== undefined) {
    sessionUpdates.biophiliaScore = userProfile.psychologicalBaseline.biophiliaScore;
  }

  // Map PRS ideal
  if (userProfile.psychologicalBaseline?.prsIdeal) {
    sessionUpdates.prsIdeal = userProfile.psychologicalBaseline.prsIdeal;
  }

  // Map lifestyle
  if (userProfile.lifestyle) {
    sessionUpdates.lifestyle = {
      livingSituation: '', // Not stored in UserProfile
      lifeVibe: userProfile.lifestyle.vibe || '',
      goals: userProfile.lifestyle.goals || []
    };
  }

  // Map nature metaphor
  if (userProfile.sensoryPreferences?.natureMetaphor) {
    sessionUpdates.natureMetaphor = userProfile.sensoryPreferences.natureMetaphor;
  }

  // Mark core profile as complete if profileCompletedAt exists
  if (userProfile.profileCompletedAt) {
    sessionUpdates.coreProfileComplete = true;
    sessionUpdates.coreProfileCompletedAt = userProfile.profileCompletedAt;
  }

  // #region agent log
  void fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId: 'debug-session',
      runId: 'profile-load',
      hypothesisId: 'P1',
      location: 'profile-mapper.ts:mapUserProfileToSessionData',
      message: 'Mapping UserProfile to SessionData',
      data: {
        hasPersonality: !!sessionUpdates.bigFive,
        hasImplicit: !!sessionUpdates.visualDNA,
        hasExplicit: !!sessionUpdates.colorsAndMaterials,
        hasSensory: !!sessionUpdates.sensoryPreferences,
        hasBiophilia: sessionUpdates.biophiliaScore !== undefined,
        biophiliaScore: sessionUpdates.biophiliaScore,
        hasLifestyle: !!sessionUpdates.lifestyle,
        profileCompletedAt: userProfile.profileCompletedAt,
        implicitStyle: sessionUpdates.visualDNA?.dominantStyle,
        implicitColorsCount: sessionUpdates.visualDNA?.preferences?.colors?.length || 0,
        implicitMaterialsCount: sessionUpdates.visualDNA?.preferences?.materials?.length || 0,
        explicitPalette: sessionUpdates.colorsAndMaterials?.selectedPalette,
        explicitStyle: sessionUpdates.colorsAndMaterials?.selectedStyle,
        explicitStyleType: typeof sessionUpdates.colorsAndMaterials?.selectedStyle,
        explicitStyleIsEmpty: sessionUpdates.colorsAndMaterials?.selectedStyle === '',
        explicitStyleIsNull: sessionUpdates.colorsAndMaterials?.selectedStyle === null,
        explicitStyleIsUndefined: sessionUpdates.colorsAndMaterials?.selectedStyle === undefined,
        explicitMaterialsCount: sessionUpdates.colorsAndMaterials?.topMaterials?.length || 0,
        profileExplicitSelectedStyle: (userProfile.aestheticDNA?.explicit as any)?.selectedStyle,
        profileExplicitSelectedStyleType: typeof (userProfile.aestheticDNA?.explicit as any)?.selectedStyle
      },
      timestamp: Date.now()
    })
  }).catch(() => {});
  // #endregion

  return sessionUpdates;
}

