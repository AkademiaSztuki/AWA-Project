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

  return {
    userHash: sessionData.userHash,

    aestheticDNA: {
      implicit: {
        dominantStyles: weightedDNA.top.styles,
        colors: weightedDNA.top.colors,
        materials: weightedDNA.top.materials,
        complexity: 0.5, // TODO: derive from swipe patterns
        warmth: 0.5, // TODO: derive from color preferences
        brightness: 0.5, // TODO: derive from lighting preferences
        swipePatterns: [] // TODO: add pattern analysis
      },
      explicit: {
        selectedPalette: sessionData.colorsAndMaterials?.selectedPalette || '',
        topMaterials: sessionData.colorsAndMaterials?.topMaterials || [],
        warmthPreference: sessionData.semanticDifferential?.warmth || 0.5,
        brightnessPreference: sessionData.semanticDifferential?.brightness || 0.5,
        complexityPreference: sessionData.semanticDifferential?.complexity || 0.5
      }
    },

    psychologicalBaseline: {
      prsIdeal: sessionData.prsIdeal || { x: 0, y: 0 },
      biophiliaScore: sessionData.biophiliaScore || 0
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

