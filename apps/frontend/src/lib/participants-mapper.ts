/**
 * Map SessionData to participants table columns
 * Converts SessionData object to flat structure for database
 */

import { SessionData } from '@/types';

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
  
  // Profile status
  core_profile_complete?: boolean;
  core_profile_completed_at?: string;
}

/**
 * Map SessionData to ParticipantRow (for database insert/update)
 */
export function mapSessionDataToParticipant(sessionData: SessionData, authUserId?: string): ParticipantRow {
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
    big5_openness: sessionData.bigFive?.scores?.domains?.O,
    big5_conscientiousness: sessionData.bigFive?.scores?.domains?.C,
    big5_extraversion: sessionData.bigFive?.scores?.domains?.E,
    big5_agreeableness: sessionData.bigFive?.scores?.domains?.A,
    big5_neuroticism: sessionData.bigFive?.scores?.domains?.N,
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
    dna_accuracy_score: sessionData.visualDNA?.accuracyScore ?? sessionData.dnaAccuracyScore,
    
    // Explicit
    explicit_warmth: (() => {
      const val = sessionData.semanticDifferential?.warmth;
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'participants-mapper.ts:mapSessionDataToParticipant-explicit_warmth',message:'Mapping warmth to Supabase column',data:{sessionWarmth:val,hasSemanticDifferential:!!sessionData.semanticDifferential,rawSemantic:sessionData.semanticDifferential},timestamp:Date.now(),sessionId:'debug-session',runId:'supabase-mapping',hypothesisId:'C'})}).catch(()=>{});
      // #endregion
      return val;
    })(),
    explicit_brightness: (() => {
      const val = sessionData.semanticDifferential?.brightness;
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'participants-mapper.ts:mapSessionDataToParticipant-explicit_brightness',message:'Mapping brightness to Supabase column',data:{sessionBrightness:val,hasSemanticDifferential:!!sessionData.semanticDifferential},timestamp:Date.now(),sessionId:'debug-session',runId:'supabase-mapping',hypothesisId:'C'})}).catch(()=>{});
      // #endregion
      return val;
    })(),
    explicit_complexity: (() => {
      const val = sessionData.semanticDifferential?.complexity;
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'participants-mapper.ts:mapSessionDataToParticipant-explicit_complexity',message:'Mapping complexity to Supabase column',data:{sessionComplexity:val,hasSemanticDifferential:!!sessionData.semanticDifferential},timestamp:Date.now(),sessionId:'debug-session',runId:'supabase-mapping',hypothesisId:'C'})}).catch(()=>{});
      // #endregion
      return val;
    })(),
    explicit_texture: sessionData.semanticDifferential?.texture,
    explicit_palette: sessionData.colorsAndMaterials?.selectedPalette,
    explicit_style: sessionData.colorsAndMaterials?.selectedStyle,
    explicit_material_1: sessionData.colorsAndMaterials?.topMaterials?.[0],
    explicit_material_2: sessionData.colorsAndMaterials?.topMaterials?.[1],
    explicit_material_3: sessionData.colorsAndMaterials?.topMaterials?.[2],
    
    // Sensory / Biophilia
    sensory_music: sessionData.sensoryPreferences?.music,
    sensory_texture: sessionData.sensoryPreferences?.texture,
    sensory_light: sessionData.sensoryPreferences?.light,
    biophilia_score: sessionData.biophiliaScore,
    nature_metaphor: sessionData.natureMetaphor,
    
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
    
    // Generation stats
    generations_count: sessionData.generations?.length || 0,
    
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
  
  for (const [key, value] of Object.entries(row)) {
    if (value !== undefined && value !== null) {
      // For timestamp fields, skip empty strings (they cause "invalid input syntax for type timestamp" errors)
      if (timestampFields.includes(key) && value === '') {
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
        lighting: []
      },
      accuracyScore: row.dna_accuracy_score || 0
    } : {
      dominantTags: [],
      preferences: { colors: [], materials: [], styles: [], lighting: [] },
      accuracyScore: 0
    },
    
    // Explicit
    semanticDifferential: (() => {
      const hasWarmth = row.explicit_warmth !== undefined;
      const result = hasWarmth ? {
        warmth: row.explicit_warmth || 0.5,
        brightness: row.explicit_brightness || 0.5,
        complexity: row.explicit_complexity || 0.5,
        texture: row.explicit_texture || 0.5
      } : undefined;
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'participants-mapper.ts:mapParticipantToSessionData-semanticDifferential',message:'Retrieving semanticDifferential from Supabase',data:{hasWarmth,dbWarmth:row.explicit_warmth,dbBrightness:row.explicit_brightness,dbComplexity:row.explicit_complexity,mappedWarmth:result?.warmth,mappedBrightness:result?.brightness,mappedComplexity:result?.complexity},timestamp:Date.now(),sessionId:'debug-session',runId:'supabase-retrieve',hypothesisId:'D'})}).catch(()=>{});
      // #endregion
      return result;
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

