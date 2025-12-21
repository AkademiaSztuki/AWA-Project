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
  // #region prompt debug
  fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'input-builder.ts:buildPromptInputsFromSession:start',message:'STARTING: Building PromptInputs from SessionData',data:{hasVisualDNA:!!sessionData.visualDNA,hasTinderData:!!(sessionData as any).tinderData,hasBigFive:!!sessionData.bigFive,hasInspirations:!!sessionData.inspirations,hasRoomPreferences:!!sessionData.roomPreferences,hasSemanticDifferential:!!sessionData.semanticDifferential,roomType:sessionData.roomType},timestamp:Date.now(),sessionId:'debug-session',runId:'prompt-debug'})}).catch(()=>{});
  // #endregion

  const semantic = sessionData.semanticDifferential;
  const lifestyle = sessionData.lifestyle;
  const visualDNA = sessionData.visualDNA;
  
  // Room preferences from RoomSetup flow (stored in roomPreferences)
  const roomPrefs = sessionData.roomPreferences;
  
  // Sensory preferences - check both roomPreferences and top-level
  const sensoryPreferences = roomPrefs?.sensoryPreferences || sessionData.sensoryPreferences;
  
  // Colors and materials - check both roomPreferences and top-level
  const colorsAndMaterials = roomPrefs?.colorsAndMaterials || sessionData.colorsAndMaterials;
  
  // #region prompt debug
  fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'input-builder.ts:buildPromptInputsFromSession:colors-and-materials',message:'Colors and Materials source determination',data:{hasRoomPrefs:!!roomPrefs,hasRoomPrefsColors:!!roomPrefs?.colorsAndMaterials,hasTopLevelColors:!!sessionData.colorsAndMaterials,selectedStyle:colorsAndMaterials?.selectedStyle,selectedPalette:colorsAndMaterials?.selectedPalette,topMaterials:colorsAndMaterials?.topMaterials},timestamp:Date.now(),sessionId:'debug-session',runId:'prompt-debug'})}).catch(()=>{});
  // #endregion
  
  // Biophilia score - check roomPreferences first, then top-level, default to 1
  const biophiliaScore = roomPrefs?.biophiliaScore ?? sessionData.biophiliaScore ?? 1;
  // #region prompt debug
  fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'input-builder.ts:buildPromptInputsFromSession:biophilia-source',message:'Biophilia score source determination',data:{roomPrefsBiophilia:roomPrefs?.biophiliaScore,sessionDataBiophilia:sessionData.biophiliaScore,finalBiophiliaScore:biophiliaScore,hasRoomPrefs:!!roomPrefs},timestamp:Date.now(),sessionId:'debug-session',runId:'prompt-debug'})}).catch(()=>{});
  // #endregion
  
  // Calculate implicit biophilia from Tinder swipes (avgBiophilia from liked images)
  // This will be used for Implicit source instead of global biophiliaScore
  let implicitBiophiliaScore: number | undefined;
  const tinderData = (sessionData as any).tinderData;
  if (tinderData?.swipes && Array.isArray(tinderData.swipes) && tinderData.swipes.length > 0) {
    try {
      const swipes = tinderData.swipes.map((s: { imageId?: string; id?: string; direction: 'left' | 'right' }) => ({
        imageId: s.imageId || s.id,
        direction: s.direction
      }));
      const analysis = analyzeSwipePatterns(swipes);
      // Round to nearest integer (0-3 scale, same as biophiliaScore)
      implicitBiophiliaScore = Math.round(analysis.avgBiophilia);
      // #region prompt debug
      const likedCount = swipes.filter((s: { direction: string }) => s.direction === 'right').length;
      fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'input-builder.ts:buildPromptInputsFromSession:implicit-biophilia',message:'Calculated implicit biophilia from Tinder swipes',data:{swipesCount:tinderData.swipes.length,avgBiophilia:analysis.avgBiophilia,implicitBiophiliaScore,likedCount},timestamp:Date.now(),sessionId:'debug-session',runId:'prompt-debug'})}).catch(()=>{});
      // #endregion
      console.log('[InputBuilder] Calculated implicitBiophiliaScore from Tinder:', implicitBiophiliaScore, '(avgBiophilia:', analysis.avgBiophilia, ')');
    } catch (error) {
      console.warn('[InputBuilder] Could not calculate implicitBiophiliaScore from Tinder:', error);
    }
  } else {
    // #region prompt debug
    fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'input-builder.ts:buildPromptInputsFromSession:no-tinder-data',message:'No Tinder data for implicit biophilia calculation',data:{hasTinderData:!!tinderData,swipesCount:tinderData?.swipes?.length||0},timestamp:Date.now(),sessionId:'debug-session',runId:'prompt-debug'})}).catch(()=>{});
    // #endregion
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

  // #region agent log
  // Log final PromptInputs psychologicalBaseline
  fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'input-builder.ts:PromptInputs-psychologicalBaseline',message:'Final PromptInputs psychologicalBaseline',data:{biophiliaScore:biophiliaScore,implicitBiophiliaScore:implicitBiophiliaScore,prsIdeal:sessionData.prsIdeal||defaultPRS},timestamp:Date.now(),sessionId:'debug-session',runId:'explicit-check',hypothesisId:'E10'})}).catch(()=>{});
  // #endregion

  const result: PromptInputs = {
    aestheticDNA: {
      implicit: {
        dominantStyles: visualDNA?.preferences?.styles || [],
        styleWeights: (visualDNA?.preferences as any)?.styleWeights || undefined, // Include style weights if available
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
    personality: (() => {
      if (!sessionData.bigFive?.scores) return undefined;
      const scores = sessionData.bigFive.scores as any;
      const personality = {
        // CRITICAL FIX: Read from scores.domains (O/C/E/A/N) instead of scores.openness/etc
        // The IPIP-NEO-120 structure uses domains: {O, C, E, A, N}, not {openness, conscientiousness, ...}
        openness: scores.domains?.O ?? scores.openness ?? 50,
        conscientiousness: scores.domains?.C ?? scores.conscientiousness ?? 50,
        extraversion: scores.domains?.E ?? scores.extraversion ?? 50,
        agreeableness: scores.domains?.A ?? scores.agreeableness ?? 50,
        neuroticism: scores.domains?.N ?? scores.neuroticism ?? 50,
        domains: scores.domains,
        facets: scores.facets
      };
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'input-builder.ts:144',message:'Building personality from sessionData.bigFive.scores',data:{hasScores:!!scores,hasDomains:!!scores.domains,domainsFromDomains:scores.domains?{O:scores.domains.O,C:scores.domains.C,E:scores.domains.E,A:scores.domains.A,N:scores.domains.N}:null,domainsFromLegacy:scores.openness?{O:scores.openness,C:scores.conscientiousness,E:scores.extraversion,A:scores.agreeableness,N:scores.neuroticism}:null,resultPersonality:{O:personality.openness,C:personality.conscientiousness,E:personality.extraversion,A:personality.agreeableness,N:personality.neuroticism}},timestamp:Date.now(),sessionId:'debug-session',runId:'personality-check',hypothesisId:'P2'})}).catch(()=>{});
      // #endregion
      return personality;
    })(),
    inspirations: sessionData.inspirations?.map((item) => ({
      tags: item.tags || {},
      description: item.description,
      url: item.url || (item as any).image || (item as any).previewUrl,
      imageBase64: (item as any).imageBase64
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
  
  // #region prompt debug
  fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'input-builder.ts:buildPromptInputsFromSession:final',message:'FINAL PromptInputs built from SessionData',data:{aestheticDNA:{implicit:{dominantStyles:result.aestheticDNA.implicit.dominantStyles,colors:result.aestheticDNA.implicit.colors,materials:result.aestheticDNA.implicit.materials,complexity:result.aestheticDNA.implicit.complexity,warmth:result.aestheticDNA.implicit.warmth,brightness:result.aestheticDNA.implicit.brightness},explicit:{selectedPalette:result.aestheticDNA.explicit.selectedPalette,selectedStyle:result.aestheticDNA.explicit.selectedStyle,topMaterials:result.aestheticDNA.explicit.topMaterials}},psychologicalBaseline:{biophiliaScore:result.psychologicalBaseline.biophiliaScore,implicitBiophiliaScore:result.psychologicalBaseline.implicitBiophiliaScore,prsIdeal:result.psychologicalBaseline.prsIdeal},hasPersonality:!!result.personality,personalityDomains:result.personality?{O:result.personality.openness,C:result.personality.conscientiousness,E:result.personality.extraversion,A:result.personality.agreeableness,N:result.personality.neuroticism}:null,roomType:result.roomType,prsCurrent:result.prsCurrent,prsTarget:result.prsTarget,activitiesCount:result.activities?.length||0,painPointsCount:result.painPoints?.length||0,inspirationsCount:result.inspirations?.length||0},timestamp:Date.now(),sessionId:'debug-session',runId:'prompt-debug'})}).catch(()=>{});
  // #endregion
  
  return result;
}