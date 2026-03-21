/**
 * Map SessionData to participants table columns
 * Converts SessionData object to flat structure for database
 */

import { SessionData } from '@/types';
import { normalizeSemanticTo01 } from '@/lib/semantic-scale';

/**
 * Room Setup often stores answers only in `roomPreferences`; Core Profile uses root
 * `semanticDifferential` / `colorsAndMaterials`. Merge so GCP/CSV see full explicit prefs.
 */
function mergeExplicitSemanticsForParticipant(sessionData: SessionData) {
  const rp = sessionData.roomPreferences;
  const sd = sessionData.semanticDifferential;
  const rsd = rp?.semanticDifferential;
  return {
    warmth: normalizeSemanticTo01(sd?.warmth ?? rsd?.warmth),
    brightness: normalizeSemanticTo01(sd?.brightness ?? rsd?.brightness),
    complexity: normalizeSemanticTo01(sd?.complexity ?? rsd?.complexity),
    texture: normalizeSemanticTo01(sd?.texture ?? rsd?.texture),
  };
}

function mergeColorsMaterialsForParticipant(sessionData: SessionData) {
  const cm = sessionData.colorsAndMaterials;
  const rcm = sessionData.roomPreferences?.colorsAndMaterials;
  const topFrom = (a?: string[]) =>
    Array.isArray(a) && a.filter(Boolean).length > 0 ? a.filter(Boolean) as string[] : undefined;
  const topMaterials = topFrom(cm?.topMaterials) ?? topFrom(rcm?.topMaterials) ?? [];
  return {
    selectedPalette: cm?.selectedPalette || rcm?.selectedPalette,
    selectedStyle: cm?.selectedStyle || rcm?.selectedStyle,
    topMaterials,
  };
}

function mergeSensoryForParticipant(sessionData: SessionData) {
  const sp = sessionData.sensoryPreferences;
  const rsp = sessionData.roomPreferences?.sensoryPreferences;
  return {
    music: sp?.music || rsp?.music,
    texture: sp?.texture || rsp?.texture,
    light: sp?.light || rsp?.light,
  };
}

/** Matrix flow fills `matrixHistory`; legacy flow uses `generations` / `generatedImages`. */
function computeGenerationCount(sessionData: SessionData): number {
  const genLen = Array.isArray(sessionData.generations) ? sessionData.generations.length : 0;
  const matrixLen = Array.isArray(sessionData.matrixHistory) ? sessionData.matrixHistory.length : 0;
  const genImgLen = Array.isArray(sessionData.generatedImages) ? sessionData.generatedImages.length : 0;
  return Math.max(genLen, matrixLen, genImgLen);
}

/**
 * Support both `scores.domains.{O,C,E,A,N}` and legacy flat keys on `scores` (openness, …).
 */
function extractBigFiveDomains(sessionData: SessionData): {
  O?: number;
  C?: number;
  E?: number;
  A?: number;
  N?: number;
} | undefined {
  const bf = sessionData.bigFive;
  if (!bf?.scores || typeof bf.scores !== 'object') return undefined;
  const scores = bf.scores as Record<string, unknown>;
  const domains = scores.domains as Record<string, unknown> | undefined;
  if (domains && typeof domains === 'object') {
    const pick = (k: string) => (typeof domains[k] === 'number' ? (domains[k] as number) : undefined);
    const O = pick('O');
    const C = pick('C');
    const E = pick('E');
    const A = pick('A');
    const N = pick('N');
    if ([O, C, E, A, N].some((x) => typeof x === 'number')) {
      return { O, C, E, A, N };
    }
  }
  const legacy = scores as Record<string, unknown>;
  const O = typeof legacy.openness === 'number' ? legacy.openness : undefined;
  const C = typeof legacy.conscientiousness === 'number' ? legacy.conscientiousness : undefined;
  const E = typeof legacy.extraversion === 'number' ? legacy.extraversion : undefined;
  const A = typeof legacy.agreeableness === 'number' ? legacy.agreeableness : undefined;
  const N = typeof legacy.neuroticism === 'number' ? legacy.neuroticism : undefined;
  if ([O, C, E, A, N].some((x) => typeof x === 'number')) {
    return { O: O as number, C: C as number, E: E as number, A: A as number, N: N as number };
  }
  return undefined;
}

export interface ParticipantRow {
  user_hash: string;
  auth_user_id?: string;
  consent_timestamp?: string;
  path_type?: 'fast' | 'full';
  current_step?: string;
  
  // Demographics
  age_range?: string;
  gender?: string;
  country?: string;
  education?: string;
  
  // Big Five
  big5_openness?: number;
  big5_conscientiousness?: number;
  big5_extraversion?: number;
  big5_agreeableness?: number;
  big5_neuroticism?: number;
  big5_completed_at?: string;
  big5_responses?: any;
  big5_facets?: any;
  
  // Implicit (from swipes)
  implicit_dominant_style?: string;
  implicit_style_1?: string;
  implicit_style_2?: string;
  implicit_style_3?: string;
  implicit_color_1?: string;
  implicit_color_2?: string;
  implicit_color_3?: string;
  implicit_material_1?: string;
  implicit_material_2?: string;
  implicit_material_3?: string;
  implicit_warmth?: number;
  implicit_brightness?: number;
  implicit_complexity?: number;
  dna_accuracy_score?: number;
  
  // Explicit
  explicit_warmth?: number;
  explicit_brightness?: number;
  explicit_complexity?: number;
  explicit_texture?: number;
  explicit_palette?: string;
  explicit_style?: string;
  explicit_material_1?: string;
  explicit_material_2?: string;
  explicit_material_3?: string;
  
  // Sensory / Biophilia
  sensory_music?: string;
  sensory_texture?: string;
  sensory_light?: string;
  biophilia_score?: number;
  nature_metaphor?: string;
  
  // Lifestyle
  living_situation?: string;
  life_vibe?: string;
  life_goals?: string[];
  
  // Aspirational
  aspirational_feelings?: string[];
  aspirational_rituals?: string[];
  
  // PRS
  prs_ideal_x?: number;
  prs_ideal_y?: number;
  prs_current_x?: number;
  prs_current_y?: number;
  prs_target_x?: number;
  prs_target_y?: number;
  
  // Laddering
  ladder_path?: string[];
  ladder_core_need?: string;
  
  // Surveys
  sus_score?: number;
  clarity_score?: number;
  agency_score?: number;
  satisfaction_score?: number;
  sus_answers?: any;
  agency_answers?: any;
  satisfaction_answers?: any;
  clarity_answers?: any;
  
  // Room
  room_type?: string;
  room_name?: string;
  room_usage_type?: 'solo' | 'shared';
  room_shared_with?: string[];
  room_pain_points?: string[];
  room_activities?: any;
  room_detected_type?: string;
  room_analysis_confidence?: number;
  room_description?: string;
  room_suggestions?: string[];
  
  // Tinder stats
  tinder_total_swipes?: number;
  tinder_likes?: number;
  tinder_dislikes?: number;
  
  // Inspiration tags (aggregated)
  inspiration_style_1?: string;
  inspiration_style_2?: string;
  inspiration_style_3?: string;
  inspiration_color_1?: string;
  inspiration_color_2?: string;
  inspiration_color_3?: string;
  inspiration_material_1?: string;
  inspiration_material_2?: string;
  inspiration_material_3?: string;
  inspiration_biophilia_avg?: number;
  inspirations_count?: number;
  
  // Generation stats
  generations_count?: number;
  /** Generate flow: per-image ratings (JSONB in DB) */
  session_image_ratings?: Record<string, unknown>;

  // Profile status
  core_profile_complete?: boolean;
  core_profile_completed_at?: string;
}

/**
 * Map SessionData to ParticipantRow (for database insert/update)
 */
export function mapSessionDataToParticipant(sessionData: SessionData, authUserId?: string): ParticipantRow {
  const explicitSem = mergeExplicitSemanticsForParticipant(sessionData);
  const mergedCm = mergeColorsMaterialsForParticipant(sessionData);
  const mergedSensory = mergeSensoryForParticipant(sessionData);
  const big5Domains = extractBigFiveDomains(sessionData);

  const row: ParticipantRow = {
    user_hash: sessionData.userHash,
    auth_user_id: authUserId,
    consent_timestamp: sessionData.consentTimestamp,
    path_type: sessionData.pathType,
    current_step: sessionData.currentStep,
    
    // Demographics
    age_range: sessionData.demographics?.ageRange,
    gender: sessionData.demographics?.gender,
    country: sessionData.demographics?.country,
    education: sessionData.demographics?.education,
    
    // Big Five
    big5_openness: big5Domains?.O ?? sessionData.bigFive?.scores?.domains?.O,
    big5_conscientiousness: big5Domains?.C ?? sessionData.bigFive?.scores?.domains?.C,
    big5_extraversion: big5Domains?.E ?? sessionData.bigFive?.scores?.domains?.E,
    big5_agreeableness: big5Domains?.A ?? sessionData.bigFive?.scores?.domains?.A,
    big5_neuroticism: big5Domains?.N ?? sessionData.bigFive?.scores?.domains?.N,
    big5_completed_at: sessionData.bigFive?.completedAt,
    big5_responses: sessionData.bigFive?.responses,
    big5_facets: sessionData.bigFive?.scores?.facets,
    
    // Implicit (from visualDNA)
    implicit_dominant_style: sessionData.visualDNA?.dominantStyle,
    implicit_style_1: sessionData.visualDNA?.preferences?.styles?.[0],
    implicit_style_2: sessionData.visualDNA?.preferences?.styles?.[1],
    implicit_style_3: sessionData.visualDNA?.preferences?.styles?.[2],
    implicit_color_1: sessionData.visualDNA?.preferences?.colors?.[0],
    implicit_color_2: sessionData.visualDNA?.preferences?.colors?.[1],
    implicit_color_3: sessionData.visualDNA?.preferences?.colors?.[2],
    implicit_material_1: sessionData.visualDNA?.preferences?.materials?.[0],
    implicit_material_2: sessionData.visualDNA?.preferences?.materials?.[1],
    implicit_material_3: sessionData.visualDNA?.preferences?.materials?.[2],
    implicit_warmth: sessionData.visualDNA?.implicitScores?.warmth,
    implicit_brightness: sessionData.visualDNA?.implicitScores?.brightness,
    implicit_complexity: sessionData.visualDNA?.implicitScores?.complexity,
    dna_accuracy_score: sessionData.visualDNA?.accuracyScore ?? sessionData.dnaAccuracyScore,
    
    // Explicit (0–1 in DB; root session OR roomPreferences from Room Setup)
    explicit_warmth: explicitSem.warmth,
    explicit_brightness: explicitSem.brightness,
    explicit_complexity: explicitSem.complexity,
    explicit_texture: explicitSem.texture,
    explicit_palette: mergedCm.selectedPalette,
    explicit_style: mergedCm.selectedStyle,
    explicit_material_1: mergedCm.topMaterials[0],
    explicit_material_2: mergedCm.topMaterials[1],
    explicit_material_3: mergedCm.topMaterials[2],
    
    // Sensory / Biophilia
    sensory_music: mergedSensory.music,
    sensory_texture: mergedSensory.texture,
    sensory_light: mergedSensory.light,
    biophilia_score: sessionData.biophiliaScore ?? sessionData.roomPreferences?.biophiliaScore,
    nature_metaphor: sessionData.natureMetaphor ?? sessionData.roomPreferences?.natureMetaphor,
    
    // Lifestyle
    living_situation: sessionData.lifestyle?.livingSituation,
    life_vibe: sessionData.lifestyle?.lifeVibe,
    life_goals: sessionData.lifestyle?.goals,
    
    // Aspirational
    aspirational_feelings: sessionData.aspirationalSelf?.feelings,
    aspirational_rituals: sessionData.aspirationalSelf?.rituals,
    
    // PRS
    prs_ideal_x: sessionData.prsIdeal?.x,
    prs_ideal_y: sessionData.prsIdeal?.y,
    prs_current_x: sessionData.prsCurrent?.x,
    prs_current_y: sessionData.prsCurrent?.y,
    prs_target_x: sessionData.prsTarget?.x,
    prs_target_y: sessionData.prsTarget?.y,
    
    // Laddering
    // Convert ladderResults.path (array of objects) to string[] if needed
    ladder_path: sessionData.ladderPath || 
      (sessionData.ladderResults?.path 
        ? sessionData.ladderResults.path.map((step: any) => 
            typeof step === 'string' ? step : step.selectedAnswer || ''
          )
        : undefined),
    ladder_core_need: sessionData.ladderResults?.coreNeed || sessionData.coreNeed,
    
    // Surveys
    sus_score: sessionData.surveyData?.susScore,
    clarity_score: sessionData.surveyData?.clarityScore,
    agency_score: sessionData.surveyData?.agencyScore,
    satisfaction_score: sessionData.surveyData?.satisfactionScore,
    sus_answers: sessionData.surveyData?.susAnswers,
    agency_answers: sessionData.surveyData?.agencyAnswers,
    satisfaction_answers: sessionData.surveyData?.satisfactionAnswers,
    clarity_answers: sessionData.surveyData?.clarityAnswers,
    
    // Room
    room_type: sessionData.roomType,
    room_name: sessionData.roomName,
    room_usage_type: sessionData.roomUsageType,
    room_shared_with: sessionData.roomSharedWith,
    room_pain_points: sessionData.roomPainPoints,
    room_activities: sessionData.roomActivities,
    room_detected_type: sessionData.roomAnalysis?.detected_room_type || sessionData.detectedRoomType,
    room_analysis_confidence: sessionData.roomAnalysis?.confidence,
    room_description: sessionData.roomAnalysis?.room_description,
    room_suggestions: sessionData.roomAnalysis?.suggestions,
    
    // Tinder stats (aggregate from tinderResults)
    tinder_total_swipes: sessionData.tinderResults?.length || sessionData.tinderData?.swipes?.length || 0,
    tinder_likes: sessionData.tinderResults?.filter(s => s.direction === 'right').length || 
                  sessionData.tinderData?.swipes?.filter((s: any) => s.direction === 'right').length || 0,
    tinder_dislikes: sessionData.tinderResults?.filter(s => s.direction === 'left').length || 
                     sessionData.tinderData?.swipes?.filter((s: any) => s.direction === 'left').length || 0,
    
    // Inspiration tags (aggregate from inspirations array)
    inspirations_count: sessionData.inspirations?.length || 0,
    
    // Generation stats (matrix uses `matrixHistory`, not always `generations[]`)
    generations_count: computeGenerationCount(sessionData),
    session_image_ratings: sessionData.imageRatings as Record<string, unknown> | undefined,

    // Profile status
    core_profile_complete: sessionData.coreProfileComplete,
    core_profile_completed_at: sessionData.coreProfileCompletedAt,
  };
  
  // Aggregate inspiration tags (top 3 styles, colors, materials)
  if (sessionData.inspirations && sessionData.inspirations.length > 0) {
    const allStyles = new Set<string>();
    const allColors = new Set<string>();
    const allMaterials = new Set<string>();
    let biophiliaSum = 0;
    let biophiliaCount = 0;
    
    for (const insp of sessionData.inspirations) {
      if (insp.tags?.styles) {
        insp.tags.styles.forEach((s: string) => allStyles.add(s));
      }
      if (insp.tags?.colors) {
        insp.tags.colors.forEach((c: string) => allColors.add(c));
      }
      if (insp.tags?.materials) {
        insp.tags.materials.forEach((m: string) => allMaterials.add(m));
      }
      if (insp.tags?.biophilia !== undefined) {
        biophiliaSum += insp.tags.biophilia;
        biophiliaCount++;
      }
    }
    
    const stylesArray = Array.from(allStyles);
    const colorsArray = Array.from(allColors);
    const materialsArray = Array.from(allMaterials);
    
    row.inspiration_style_1 = stylesArray[0];
    row.inspiration_style_2 = stylesArray[1];
    row.inspiration_style_3 = stylesArray[2];
    row.inspiration_color_1 = colorsArray[0];
    row.inspiration_color_2 = colorsArray[1];
    row.inspiration_color_3 = colorsArray[2];
    row.inspiration_material_1 = materialsArray[0];
    row.inspiration_material_2 = materialsArray[1];
    row.inspiration_material_3 = materialsArray[2];
    row.inspiration_biophilia_avg = biophiliaCount > 0 ? biophiliaSum / biophiliaCount : undefined;
  }
  
  // Remove undefined, null, and empty string values to avoid overwriting existing data
  // Also filter out empty strings for timestamp fields (they cause SQL errors)
  const cleaned: any = {};
  const timestampFields = ['consent_timestamp', 'big5_completed_at', 'core_profile_completed_at'];
  /** Do not UPSERT '' over existing DB text (path, step, room, explicit labels, …) */
  const skipEmptyStringKeys = new Set([
    'path_type',
    'current_step',
    'room_type',
    'room_name',
    'room_usage_type',
    'explicit_palette',
    'explicit_style',
    'explicit_material_1',
    'explicit_material_2',
    'explicit_material_3',
    'implicit_dominant_style',
    'implicit_style_1',
    'implicit_style_2',
    'implicit_style_3',
    'implicit_color_1',
    'implicit_color_2',
    'implicit_color_3',
    'implicit_material_1',
    'implicit_material_2',
    'implicit_material_3',
    'sensory_music',
    'sensory_texture',
    'sensory_light',
    'nature_metaphor',
    'age_range',
    'gender',
    'country',
    'education',
  ]);

  for (const [key, value] of Object.entries(row)) {
    if (value !== undefined && value !== null) {
      // For timestamp fields, skip empty strings (they cause "invalid input syntax for type timestamp" errors)
      if (timestampFields.includes(key) && value === '') {
        continue;
      }
      if (value === '' && skipEmptyStringKeys.has(key)) {
        continue;
      }
      cleaned[key] = value;
    }
  }
  
  return cleaned;
}

/**
 * Map ParticipantRow back to SessionData (for loading from database)
 */
export function mapParticipantToSessionData(row: any): SessionData {
  const sessionData: SessionData = {
    userHash: row.user_hash,
    consentTimestamp: row.consent_timestamp || '',
    currentStep: (row.current_step as any) || 'landing',
    pathType: row.path_type,
    
    // Demographics
    demographics: row.age_range || row.gender || row.country || row.education ? {
      ageRange: row.age_range || '',
      gender: row.gender || '',
      country: row.country || '',
      education: row.education || ''
    } : undefined,
    
    // Big Five
    bigFive: row.big5_openness !== undefined || row.big5_completed_at ? {
      instrument: 'IPIP-NEO-120' as const,
      responses: row.big5_responses || {},
      scores: {
        domains: {
          O: row.big5_openness,
          C: row.big5_conscientiousness,
          E: row.big5_extraversion,
          A: row.big5_agreeableness,
          N: row.big5_neuroticism
        },
        facets: row.big5_facets
      },
      completedAt: row.big5_completed_at || new Date().toISOString()
    } : undefined,
    
    // Visual DNA (implicit)
    visualDNA: row.implicit_dominant_style || row.implicit_style_1 ? {
      dominantStyle: row.implicit_dominant_style,
      dominantTags: [],
      preferences: {
        styles: [row.implicit_style_1, row.implicit_style_2, row.implicit_style_3].filter(Boolean),
        colors: [row.implicit_color_1, row.implicit_color_2, row.implicit_color_3].filter(Boolean),
        materials: [row.implicit_material_1, row.implicit_material_2, row.implicit_material_3].filter(Boolean),
        lighting: [],
        // Keep these for backward compatibility (CoreProfileWizard writes them here)
        warmth: row.implicit_warmth,
        brightness: row.implicit_brightness,
        complexity: row.implicit_complexity
      } as any, // TypeScript doesn't allow these in preferences, but they exist at runtime
      implicitScores: {
        warmth: row.implicit_warmth,
        brightness: row.implicit_brightness,
        complexity: row.implicit_complexity
      },
      accuracyScore: row.dna_accuracy_score || 0
    } : {
      dominantTags: [],
      preferences: { colors: [], materials: [], styles: [], lighting: [] },
      accuracyScore: 0
    },
    
    // Explicit (NULL-safe; legacy 0–100 from DB → 0–1)
    semanticDifferential: (() => {
      const warmth = normalizeSemanticTo01(row.explicit_warmth);
      const brightness = normalizeSemanticTo01(row.explicit_brightness);
      const complexity = normalizeSemanticTo01(row.explicit_complexity);
      const texture = normalizeSemanticTo01(row.explicit_texture);
      if (
        warmth === undefined &&
        brightness === undefined &&
        complexity === undefined &&
        texture === undefined
      ) {
        return undefined;
      }
      return { warmth, brightness, complexity, texture };
    })(),
    
    colorsAndMaterials: row.explicit_palette || row.explicit_style ? {
      selectedPalette: row.explicit_palette || '',
      selectedStyle: row.explicit_style,
      topMaterials: [row.explicit_material_1, row.explicit_material_2, row.explicit_material_3].filter(Boolean)
    } : undefined,
    
    // Sensory / Biophilia
    sensoryPreferences: row.sensory_music || row.sensory_texture || row.sensory_light ? {
      music: row.sensory_music || '',
      texture: row.sensory_texture || '',
      light: row.sensory_light || ''
    } : undefined,
    
    biophiliaScore: row.biophilia_score,
    natureMetaphor: row.nature_metaphor,
    
    // Lifestyle
    lifestyle: row.living_situation || row.life_vibe ? {
      livingSituation: row.living_situation || '',
      lifeVibe: row.life_vibe || '',
      goals: row.life_goals || []
    } : undefined,
    
    // Aspirational
    aspirationalSelf: row.aspirational_feelings || row.aspirational_rituals ? {
      feelings: row.aspirational_feelings || [],
      rituals: row.aspirational_rituals || []
    } : undefined,
    
    // PRS
    prsIdeal: row.prs_ideal_x !== undefined ? { x: row.prs_ideal_x, y: row.prs_ideal_y || 0 } : undefined,
    prsCurrent: row.prs_current_x !== undefined ? { x: row.prs_current_x, y: row.prs_current_y || 0 } : undefined,
    prsTarget: row.prs_target_x !== undefined ? { x: row.prs_target_x, y: row.prs_target_y || 0 } : undefined,
    
    // Laddering
    ladderPath: row.ladder_path,
    coreNeed: row.ladder_core_need,
    ladderResults: row.ladder_path || row.ladder_core_need ? {
      path: row.ladder_path || [],
      coreNeed: row.ladder_core_need || '',
      promptElements: {
        atmosphere: '',
        colors: '',
        lighting: '',
        materials: '',
        layout: '',
        mood: ''
      }
    } : undefined,
    
    // Surveys
    surveyData: row.sus_score !== undefined || row.clarity_score !== undefined ? {
      susScore: row.sus_score,
      clarityScore: row.clarity_score,
      agencyScore: row.agency_score,
      satisfactionScore: row.satisfaction_score,
      susAnswers: row.sus_answers,
      agencyAnswers: row.agency_answers,
      satisfactionAnswers: row.satisfaction_answers,
      clarityAnswers: row.clarity_answers
    } : undefined,
    
    // Room
    roomType: row.room_type,
    roomName: row.room_name,
    roomUsageType: row.room_usage_type,
    roomSharedWith: row.room_shared_with,
    roomPainPoints: row.room_pain_points,
    roomActivities: row.room_activities,
    detectedRoomType: row.room_detected_type,
    roomAnalysis: row.room_description ? {
      detected_room_type: row.room_detected_type || '',
      confidence: row.room_analysis_confidence || 0,
      room_description: row.room_description || '',
      suggestions: row.room_suggestions || []
    } : undefined,
    
    // Tinder
    tinderResults: [],
    tinderData: row.tinder_total_swipes ? {
      swipes: [],
      totalImages: row.tinder_total_swipes
    } : undefined,
    
    // Inspirations (will be loaded separately from participant_images)
    inspirations: [],
    
    // Generations (will be loaded separately from participant_generations)
    generations: [],

    imageRatings: row.session_image_ratings || undefined,
    
    // Profile status
    coreProfileComplete: row.core_profile_complete || false,
    coreProfileCompletedAt: row.core_profile_completed_at,
    
    // Required fields
    finalSurvey: {
      satisfaction: { easeOfUse: 0, engagement: 0, clarity: 0, overall: 0 },
      agency: { control: 0, collaboration: 0, creativity: 0, ownership: 0 },
      preferences: { evolution: 0, crystallization: 0, discovery: 0 }
    }
  };
  
  return sessionData;
}

