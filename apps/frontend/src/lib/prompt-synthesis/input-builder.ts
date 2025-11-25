import { SessionData } from '@/types';
import { PromptInputs } from './scoring';

const defaultPRS = { x: 0, y: 0 };

export function buildPromptInputsFromSession(sessionData: SessionData): PromptInputs {
  const semantic = sessionData.semanticDifferential;
  const sensoryPreferences = sessionData.sensoryPreferences;
  const lifestyle = sessionData.lifestyle;
  const visualDNA = sessionData.visualDNA;

  const implicitComplexity = semantic?.complexity ?? 0.5;
  const implicitWarmth = semantic?.warmth ?? 0.5;
  const implicitBrightness = semantic?.brightness ?? 0.5;

  return {
    aestheticDNA: {
      implicit: {
        dominantStyles: visualDNA?.preferences?.styles || [],
        colors: visualDNA?.preferences?.colors || [],
        materials: visualDNA?.preferences?.materials || [],
        complexity: implicitComplexity,
        warmth: implicitWarmth,
        brightness: implicitBrightness
      },
      explicit: {
        selectedPalette: sessionData.colorsAndMaterials?.selectedPalette || '',
        topMaterials: sessionData.colorsAndMaterials?.topMaterials || [],
        warmthPreference: implicitWarmth,
        brightnessPreference: implicitBrightness,
        complexityPreference: implicitComplexity
      }
    },
    psychologicalBaseline: {
      prsIdeal: sessionData.prsIdeal || defaultPRS,
      biophiliaScore: sessionData.biophiliaScore ?? 1
    },
    lifestyle: {
      vibe: lifestyle?.lifeVibe || 'balanced',
      goals: lifestyle?.goals || [],
      values: sessionData.ladderResults?.path?.map((step) => step.selectedAnswer) || []
    },
    sensory: {
      music: sensoryPreferences?.music || 'silence',
      texture: sensoryPreferences?.texture || 'smooth_wood',
      light: sensoryPreferences?.light || 'warm_bright',
      natureMetaphor: sessionData.natureMetaphor || 'forest'
    },
    personality: sessionData.bigFive?.scores
      ? {
          openness: sessionData.bigFive.scores.openness ?? 50,
          conscientiousness: sessionData.bigFive.scores.conscientiousness ?? 50,
          extraversion: sessionData.bigFive.scores.extraversion ?? 50,
          agreeableness: sessionData.bigFive.scores.agreeableness ?? 50,
          neuroticism: sessionData.bigFive.scores.neuroticism ?? 50
        }
      : undefined,
    inspirations: sessionData.inspirations?.map((item) => ({
      tags: item.tags || {},
      description: item.description
    })),
    householdContext: {
      livingSituation: lifestyle?.livingSituation || 'alone',
      householdGoals: lifestyle?.goals || []
    },
    roomType: sessionData.roomType || 'living_room',
    socialContext: sessionData.roomUsageType || 'solo',
    sharedWith: sessionData.roomSharedWith,
    activities: sessionData.roomActivities?.map((activity) => ({
      type: activity.type,
      frequency: activity.frequency,
      satisfaction: activity.satisfaction,
      timeOfDay: activity.timeOfDay,
      withWhom: activity.withWhom
    })) || [],
    painPoints: sessionData.roomPainPoints || [],
    prsCurrent: sessionData.prsCurrent || sessionData.prsIdeal || defaultPRS,
    prsTarget: sessionData.prsTarget || sessionData.prsIdeal || defaultPRS,
    roomVisualDNA: {
      styles: visualDNA?.preferences?.styles || [],
      colors: visualDNA?.preferences?.colors || []
    },
    currentRoomAnalysis: sessionData.roomAnalysis && 
      'clutter' in sessionData.roomAnalysis &&
      'dominantColors' in sessionData.roomAnalysis
      ? {
          clutter: (sessionData.roomAnalysis as any).clutter ?? 0,
          dominantColors: (sessionData.roomAnalysis as any).dominantColors ?? [],
          detectedObjects: (sessionData.roomAnalysis as any).detectedObjects ?? [],
          lightQuality: (sessionData.roomAnalysis as any).lightQuality ?? 'bright'
        }
      : undefined,
    activityContext: sessionData.roomActivityContext
  };
}

