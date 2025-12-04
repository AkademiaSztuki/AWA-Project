import { SessionData } from '@/types';
import { PromptInputs } from './scoring';
import { analyzeSwipePatterns } from '@/lib/tinderImagesMetadata';

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
  const lifestyle = sessionData.lifestyle;
  const visualDNA = sessionData.visualDNA;
  
  // Room preferences from RoomSetup flow (stored in roomPreferences)
  const roomPrefs = sessionData.roomPreferences;
  
  // Sensory preferences - check both roomPreferences and top-level
  const sensoryPreferences = roomPrefs?.sensoryPreferences || sessionData.sensoryPreferences;
  
  // Colors and materials - check both roomPreferences and top-level
  const colorsAndMaterials = roomPrefs?.colorsAndMaterials || sessionData.colorsAndMaterials;
  
  // Biophilia score - check roomPreferences first, then top-level, default to 1
  const biophiliaScore = roomPrefs?.biophiliaScore ?? sessionData.biophiliaScore ?? 1;
  
  // Calculate implicit biophilia from Tinder swipes (avgBiophilia from liked images)
  // This will be used for Implicit source instead of global biophiliaScore
  let implicitBiophiliaScore: number | undefined;
  const tinderData = (sessionData as any).tinderData;
  if (tinderData?.swipes && Array.isArray(tinderData.swipes) && tinderData.swipes.length > 0) {
    try {
      const swipes = tinderData.swipes.map((s: any) => ({
        imageId: s.imageId || s.id,
        direction: s.direction
      }));
      const analysis = analyzeSwipePatterns(swipes);
      // Round to nearest integer (0-3 scale, same as biophiliaScore)
      implicitBiophiliaScore = Math.round(analysis.avgBiophilia);
      console.log('[InputBuilder] Calculated implicitBiophiliaScore from Tinder:', implicitBiophiliaScore, '(avgBiophilia:', analysis.avgBiophilia, ')');
    } catch (error) {
      console.warn('[InputBuilder] Could not calculate implicitBiophiliaScore from Tinder:', error);
    }
  }
  
  // Nature metaphor - check roomPreferences first
  const natureMetaphor = roomPrefs?.natureMetaphor || sessionData.natureMetaphor || 'forest';
  
  // Semantic differential from roomPreferences or top-level
  const roomSemantic = roomPrefs?.semanticDifferential;
  const implicitComplexity = roomSemantic?.complexity ?? semantic?.complexity ?? 0.5;
  const implicitWarmth = roomSemantic?.warmth ?? semantic?.warmth ?? 0.5;
  const implicitBrightness = roomSemantic?.brightness ?? semantic?.brightness ?? 0.5;

  // Debug logging
  console.log('[InputBuilder] Building inputs from session:');
  console.log('  - roomPreferences:', !!roomPrefs);
  console.log('  - roomPrefs.colorsAndMaterials:', roomPrefs?.colorsAndMaterials);
  console.log('  - top-level colorsAndMaterials:', sessionData.colorsAndMaterials);
  console.log('  - final selectedStyle:', colorsAndMaterials?.selectedStyle);
  console.log('  - biophiliaScore:', biophiliaScore);
  console.log('  - sensoryPreferences:', sensoryPreferences);
  console.log('  - visualDNA.dominantStyle:', visualDNA?.dominantStyle);
  console.log('  - visualDNA.preferences.styles:', visualDNA?.preferences?.styles);
  console.log('  - visualDNA.preferences.colors:', visualDNA?.preferences?.colors);
  console.log('  - inspirations count:', sessionData.inspirations?.length || 0);
  if (sessionData.inspirations && sessionData.inspirations.length > 0) {
    console.log('  - inspirations with tags:', sessionData.inspirations.map((insp: any) => ({
      hasTags: !!insp.tags,
      tags: insp.tags ? {
        styles: insp.tags.styles?.length || 0,
        colors: insp.tags.colors?.length || 0,
        materials: insp.tags.materials?.length || 0,
        biophilia: insp.tags.biophilia
      } : null,
      hasDescription: !!insp.description
    })));
  }
  console.log('  - tinderData swipes:', (sessionData as any).tinderData?.swipes?.length || 0);

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
        selectedPalette: colorsAndMaterials?.selectedPalette || '',
        // Explicit style from room setup questionnaire
        selectedStyle: colorsAndMaterials?.selectedStyle || '',
        topMaterials: colorsAndMaterials?.topMaterials || [],
        warmthPreference: implicitWarmth,
        brightnessPreference: implicitBrightness,
        complexityPreference: implicitComplexity
      }
    },
    psychologicalBaseline: {
      prsIdeal: sessionData.prsIdeal || defaultPRS,
      biophiliaScore: biophiliaScore,
      implicitBiophiliaScore: implicitBiophiliaScore
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
      natureMetaphor: natureMetaphor
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