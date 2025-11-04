import { SessionData } from '@/types';
import { UserProfile } from '@/types/deep-personalization';
import { computeWeightedDNAFromSwipes } from '@/lib/dna';

export function mapSessionToUserProfile(sessionData: SessionData): Partial<UserProfile> {
  // Analyze Tinder swipes to get implicit preferences
  const tinderSwipes = sessionData.tinderData?.swipes || [];
  const weightedDNA = computeWeightedDNAFromSwipes(tinderSwipes, sessionData.tinderData?.totalImages);
  
  return {
    userHash: sessionData.userHash,
    
    aestheticDNA: {
      implicit: {
        dominantStyles: weightedDNA.top.styles,
        colors: weightedDNA.top.colors,
        materials: weightedDNA.top.materials,
        complexity: 0.5, // TODO: derive from swipe patterns
        warmth: 0.5,     // TODO: derive from color preferences
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
      aspirationalSelf: sessionData.aspirationalSelf ? JSON.stringify(sessionData.aspirationalSelf) : undefined
    },
    
    personality: sessionData.bigFive ? {
      instrument: 'IPIP-60' as const,
      domains: {
        openness: sessionData.bigFive.scores.openness || 0,
        conscientiousness: sessionData.bigFive.scores.conscientiousness || 0,
        extraversion: sessionData.bigFive.scores.extraversion || 0,
        agreeableness: sessionData.bigFive.scores.agreeableness || 0,
        neuroticism: sessionData.bigFive.scores.neuroticism || 0
      }
    } : undefined,
    
    inspirations: sessionData.inspirations || [],
    
    profileCompletedAt: sessionData.coreProfileCompletedAt
  };
}

