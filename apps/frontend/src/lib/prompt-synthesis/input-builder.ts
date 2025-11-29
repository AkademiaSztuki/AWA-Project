import { SessionData } from '@/types';
import { PromptInputs } from './scoring';

const defaultPRS = { x: 0, y: 0 };

function transformRoomAnalysis(
  roomAnalysis: SessionData['roomAnalysis'],
  visualDNA?: SessionData['visualDNA']
): PromptInputs['currentRoomAnalysis'] {
  if (!roomAnalysis) return undefined;
  const description = (roomAnalysis.room_description || '').toLowerCase();
  const suggestions = (roomAnalysis.suggestions || []).join(' ').toLowerCase();
  const clutterKeywords = ['bałagan', 'chaos', 'clutter', 'messy', 'disorganized', 'przeładowane'];
  const hasClutterIndicators = clutterKeywords.some(k => description.includes(k) || suggestions.includes(k));
  const clutter = hasClutterIndicators ? 0.7 : 0.3;
  const objectKeywords = ['sofa', 'table', 'chair', 'bed', 'desk', 'lamp', 'shelf', 'cabinet', 'kanapa', 'stolik', 'krzesło', 'łóżko', 'biurko', 'lampa', 'półka', 'szafka'];
  const detectedObjects: string[] = objectKeywords.filter(k => description.includes(k));
  if (detectedObjects.length === 0 && description) {
    const words = description.split(/\s+/).filter(w => w.length > 4);
    detectedObjects.push(...words.slice(0, 5));
  }
  let dominantColors: string[] = visualDNA?.preferences?.colors?.slice(0, 3) || [];
  if (dominantColors.length === 0) {
    const colorKeywords = ['white', 'beige', 'gray', 'brown', 'black', 'blue', 'green', 'red', 'yellow', 'biały', 'beżowy', 'szary', 'brązowy', 'czarny', 'niebieski', 'zielony', 'czerwony', 'żółty'];
    dominantColors = colorKeywords.filter(c => description.includes(c) && dominantColors.length < 3);
  }
  if (dominantColors.length === 0) dominantColors = ['neutral'];
  const brightKeywords = ['bright', 'jasne', 'oświetlone', 'natural light', 'światło dzienne'];
  const darkKeywords = ['dark', 'ciemne', 'dim', 'przyciemnione', 'słabe światło'];
  let lightQuality = 'bright';
  if (brightKeywords.some(k => description.includes(k))) lightQuality = 'very_bright';
  else if (darkKeywords.some(k => description.includes(k))) lightQuality = 'dim';
  return { clutter, dominantColors, detectedObjects: detectedObjects.length > 0 ? detectedObjects : ['furniture'], lightQuality };
}

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
    currentRoomAnalysis: transformRoomAnalysis(sessionData.roomAnalysis, visualDNA),
    activityContext: sessionData.roomActivityContext
  };
}