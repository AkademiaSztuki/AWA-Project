import { SessionData } from '@/types';
import {
  buildPreferenceComparisonFromSession,
  type PreferenceComparisonResult,
} from '@/lib/preferences/preference-comparison-registry';

// Wymiary macierzy (legacy + rozszerzone o comparison registry)
export type PreferenceDimensionId =
  | 'style'
  | 'colors'
  | 'materials'
  | 'lighting'
  | 'textures'
  | 'complexity'
  | 'mood'
  | 'color_temperature'
  | 'brightness'
  | 'biophilia'
  | 'nature_metaphor'
  | 'music';

export interface PreferenceDimensionEntry {
  id: PreferenceDimensionId;
  implicitTags: string[];
  explicitChoices: string[];
  explicitNumeric?: number | null;
  match?: boolean;
  matchScore?: number | null;
  comparable?: boolean;
}

export interface PreferenceMatrix {
  userHash: string;
  dimensions: PreferenceDimensionEntry[];
  comparison?: PreferenceComparisonResult;
  sources: {
    hasTinder: boolean;
    hasInspirations: boolean;
    hasExplicitProfile: boolean;
  };
}

const COMPARISON_TO_MATRIX_ID: Record<string, PreferenceDimensionId> = {
  style: 'style',
  color_tokens: 'colors',
  materials: 'materials',
  lighting: 'lighting',
  complexity: 'complexity',
  mood: 'mood',
  color_temperature: 'color_temperature',
  brightness: 'brightness',
  biophilia: 'biophilia',
  nature_metaphor: 'nature_metaphor',
  music: 'music',
};

export function buildPreferenceMatrixFromSession(sessionData: SessionData): PreferenceMatrix {
  const comparison = buildPreferenceComparisonFromSession(sessionData);
  const tinderSwipes = sessionData.tinderData?.swipes || [];
  const likedSwipes = tinderSwipes.filter((s: { direction?: string }) => s.direction === 'right');
  const inspirations = sessionData.inspirations || [];

  const dimensions: PreferenceDimensionEntry[] = [];
  for (const d of comparison.dimensions) {
    const matrixId = COMPARISON_TO_MATRIX_ID[d.id];
    if (!matrixId) continue;
    dimensions.push({
      id: matrixId,
      implicitTags: d.implicitCanonical,
      explicitChoices: d.explicitCanonical,
      match: d.match,
      matchScore: d.matchScore,
      comparable: d.comparable,
    });
  }

  return {
    userHash: sessionData.userHash,
    dimensions,
    comparison,
    sources: {
      hasTinder: likedSwipes.length > 0,
      hasInspirations: inspirations.length > 0,
      hasExplicitProfile: comparison.dimensions.some(
        (d) => d.explicitCanonical.length > 0 && d.comparable,
      ),
    },
  };
}
