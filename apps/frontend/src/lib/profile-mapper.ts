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

  // --- Personality (Big Five) mapping: IPIP-NEO-120 first, IPIP-60 as legacy fallback ---
  let personality: UserProfile['personality'] | undefined;

  if (sessionData.bigFive) {
    const raw = sessionData.bigFive;
    const scores: any = raw.scores || {};

    // Prefer explicit instrument flag; otherwise infer from presence of domains/facets
    let instrument: 'IPIP-60' | 'IPIP-NEO-120';
    if (raw.instrument === 'IPIP-NEO-120' || scores.domains || scores.facets) {
      instrument = 'IPIP-NEO-120';
    } else {
      instrument = 'IPIP-60';
    }

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

    // Legacy IPIP-60 style fields (keep for backwards compatibility)
    const legacyMap: Array<{ key: keyof typeof scores; short: 'O' | 'C' | 'E' | 'A' | 'N' }> = [
      { key: 'openness', short: 'O' },
      { key: 'conscientiousness', short: 'C' },
      { key: 'extraversion', short: 'E' },
      { key: 'agreeableness', short: 'A' },
      { key: 'neuroticism', short: 'N' }
    ];

    for (const { key, short } of legacyMap) {
      const value = scores[key];
      if (typeof value === 'number') {
        // Preserve original long-key scores
        (normalizedDomains as any)[key] = value;
        // If we don't already have an O/C/E/A/N value, fill it from legacy
        if (typeof (normalizedDomains as any)[short] !== 'number') {
          (normalizedDomains as any)[short] = value;
        }
      }
    }

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

