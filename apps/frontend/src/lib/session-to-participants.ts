/**
 * Mapowanie SessionData do formatu tabeli participants
 * Używane w refaktorze bazy danych
 */

import { SessionData } from '@/types';

export interface ParticipantRow {
  user_hash: string;
  auth_user_id?: string;
  consent_timestamp?: string;
  path_type?: 'fast' | 'full';
  current_step?: string;
  
  // Demografia
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
  
  // Implicit
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
  
  // Sensory
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
 * Mapuje SessionData do formatu participants (kolumny)
 */
export function mapSessionDataToParticipant(sessionData: SessionData, authUserId?: string): ParticipantRow {
  const bigFive = sessionData.bigFive;
  const visualDNA = sessionData.visualDNA;
  const colorsAndMaterials = sessionData.colorsAndMaterials;
  const semanticDifferential = sessionData.semanticDifferential;
  const sensoryPreferences = sessionData.sensoryPreferences;
  const lifestyle = sessionData.lifestyle;
  const aspirationalSelf = sessionData.aspirationalSelf;
  const prsIdeal = sessionData.prsIdeal;
  const prsCurrent = sessionData.prsCurrent;
  const prsTarget = sessionData.prsTarget;
  const ladderResults = sessionData.ladderResults;
  const surveyData = sessionData.surveyData;
  const tinderResults = sessionData.tinderResults || [];
  const inspirations = sessionData.inspirations || [];
  
  // Aggregate inspiration tags
  const allInspirationStyles: string[] = [];
  const allInspirationColors: string[] = [];
  const allInspirationMaterials: string[] = [];
  const biophiliaScores: number[] = [];
  
  inspirations.forEach(insp => {
    if (insp.tags?.styles) {
      allInspirationStyles.push(...insp.tags.styles);
    }
    if (insp.tags?.colors) {
      allInspirationColors.push(...insp.tags.colors);
    }
    if (insp.tags?.materials) {
      allInspirationMaterials.push(...insp.tags.materials);
    }
    if (insp.tags?.biophilia !== undefined) {
      biophiliaScores.push(insp.tags.biophilia);
    }
  });
  
  const uniqueInspirationStyles = Array.from(new Set(allInspirationStyles));
  const uniqueInspirationColors = Array.from(new Set(allInspirationColors));
  const uniqueInspirationMaterials = Array.from(new Set(allInspirationMaterials));
  const inspirationBiophiliaAvg = biophiliaScores.length > 0
    ? biophiliaScores.reduce((a, b) => a + b, 0) / biophiliaScores.length
    : undefined;
  
  // Tinder stats
  const tinderLikes = tinderResults.filter(s => s.direction === 'right').length;
  const tinderDislikes = tinderResults.filter(s => s.direction === 'left').length;
  
  return {
    user_hash: sessionData.userHash,
    auth_user_id: authUserId,
    consent_timestamp: sessionData.consentTimestamp || undefined,
    path_type: sessionData.pathType,
    current_step: sessionData.currentStep,
    
    // Demografia
    age_range: sessionData.demographics?.ageRange,
    gender: sessionData.demographics?.gender,
    country: sessionData.demographics?.country,
    education: sessionData.demographics?.education,
    
    // Big Five
    big5_openness: bigFive?.scores?.domains?.O,
    big5_conscientiousness: bigFive?.scores?.domains?.C,
    big5_extraversion: bigFive?.scores?.domains?.E,
    big5_agreeableness: bigFive?.scores?.domains?.A,
    big5_neuroticism: bigFive?.scores?.domains?.N,
    big5_completed_at: bigFive?.completedAt,
    big5_responses: bigFive?.responses,
    big5_facets: bigFive?.scores?.facets,
    
    // Implicit
    implicit_dominant_style: visualDNA?.dominantStyle,
    implicit_style_1: visualDNA?.preferences?.styles?.[0],
    implicit_style_2: visualDNA?.preferences?.styles?.[1],
    implicit_style_3: visualDNA?.preferences?.styles?.[2],
    implicit_color_1: visualDNA?.preferences?.colors?.[0],
    implicit_color_2: visualDNA?.preferences?.colors?.[1],
    implicit_color_3: visualDNA?.preferences?.colors?.[2],
    implicit_material_1: visualDNA?.preferences?.materials?.[0],
    implicit_material_2: visualDNA?.preferences?.materials?.[1],
    implicit_material_3: visualDNA?.preferences?.materials?.[2],
    dna_accuracy_score: visualDNA?.accuracyScore || sessionData.dnaAccuracyScore,
    
    // Explicit
    explicit_warmth: semanticDifferential?.warmth,
    explicit_brightness: semanticDifferential?.brightness,
    explicit_complexity: semanticDifferential?.complexity,
    explicit_texture: semanticDifferential?.texture,
    explicit_palette: colorsAndMaterials?.selectedPalette,
    explicit_style: colorsAndMaterials?.selectedStyle,
    explicit_material_1: colorsAndMaterials?.topMaterials?.[0],
    explicit_material_2: colorsAndMaterials?.topMaterials?.[1],
    explicit_material_3: colorsAndMaterials?.topMaterials?.[2],
    
    // Sensory
    sensory_music: sensoryPreferences?.music,
    sensory_texture: sensoryPreferences?.texture,
    sensory_light: sensoryPreferences?.light,
    biophilia_score: sessionData.biophiliaScore,
    nature_metaphor: sessionData.natureMetaphor,
    
    // Lifestyle
    living_situation: lifestyle?.livingSituation,
    life_vibe: lifestyle?.lifeVibe,
    life_goals: lifestyle?.goals,
    
    // Aspirational
    aspirational_feelings: aspirationalSelf?.feelings,
    aspirational_rituals: aspirationalSelf?.rituals,
    
    // PRS
    prs_ideal_x: prsIdeal?.x,
    prs_ideal_y: prsIdeal?.y,
    prs_current_x: prsCurrent?.x,
    prs_current_y: prsCurrent?.y,
    prs_target_x: prsTarget?.x,
    prs_target_y: prsTarget?.y,
    
    // Laddering
    // Convert ladderResults.path (array of objects) to string[] if needed
    ladder_path: sessionData.ladderPath || 
      (ladderResults?.path 
        ? ladderResults.path.map((step: any) => 
            typeof step === 'string' ? step : step.selectedAnswer || ''
          )
        : undefined),
    ladder_core_need: ladderResults?.coreNeed || sessionData.coreNeed,
    
    // Surveys
    sus_score: surveyData?.susScore,
    clarity_score: surveyData?.clarityScore,
    agency_score: surveyData?.agencyScore,
    satisfaction_score: surveyData?.satisfactionScore,
    sus_answers: surveyData?.susAnswers,
    agency_answers: surveyData?.agencyAnswers,
    satisfaction_answers: surveyData?.satisfactionAnswers,
    clarity_answers: surveyData?.clarityAnswers,
    
    // Room
    room_type: sessionData.roomType,
    room_name: sessionData.roomName,
    room_usage_type: sessionData.roomUsageType,
    room_shared_with: sessionData.roomSharedWith,
    room_pain_points: sessionData.roomPainPoints,
    room_activities: sessionData.roomActivities,
    room_detected_type: sessionData.detectedRoomType || sessionData.roomAnalysis?.detected_room_type,
    room_analysis_confidence: sessionData.roomAnalysis?.confidence,
    room_description: sessionData.roomAnalysis?.room_description,
    room_suggestions: sessionData.roomAnalysis?.suggestions,
    
    // Tinder stats
    tinder_total_swipes: tinderResults.length,
    tinder_likes: tinderLikes,
    tinder_dislikes: tinderDislikes,
    
    // Inspiration tags
    inspiration_style_1: uniqueInspirationStyles[0],
    inspiration_style_2: uniqueInspirationStyles[1],
    inspiration_style_3: uniqueInspirationStyles[2],
    inspiration_color_1: uniqueInspirationColors[0],
    inspiration_color_2: uniqueInspirationColors[1],
    inspiration_color_3: uniqueInspirationColors[2],
    inspiration_material_1: uniqueInspirationMaterials[0],
    inspiration_material_2: uniqueInspirationMaterials[1],
    inspiration_material_3: uniqueInspirationMaterials[2],
    inspiration_biophilia_avg: inspirationBiophiliaAvg,
    inspirations_count: inspirations.length,
    
    // Generation stats
    generations_count: sessionData.generations?.length || 0,
    
    // Profile status
    core_profile_complete: sessionData.coreProfileComplete,
    core_profile_completed_at: sessionData.coreProfileCompletedAt,
  };
}

/**
 * Mapuje participants (kolumny) z powrotem do SessionData
 */
export function mapParticipantToSessionData(participant: ParticipantRow): Partial<SessionData> {
  return {
    userHash: participant.user_hash,
    consentTimestamp: participant.consent_timestamp || '',
    pathType: participant.path_type,
    currentStep: participant.current_step as any,
    
    // Demografia
    demographics: participant.age_range || participant.gender || participant.country || participant.education
      ? {
          ageRange: participant.age_range || '',
          gender: participant.gender || '',
          country: participant.country || '',
          education: participant.education || '',
        }
      : undefined,
    
    // Big Five
    bigFive: participant.big5_openness !== undefined || participant.big5_completed_at
      ? {
          instrument: 'IPIP-NEO-120' as const,
          responses: participant.big5_responses || {},
          scores: {
            domains: participant.big5_openness !== undefined || participant.big5_conscientiousness !== undefined
              ? {
                  O: participant.big5_openness,
                  C: participant.big5_conscientiousness,
                  E: participant.big5_extraversion,
                  A: participant.big5_agreeableness,
                  N: participant.big5_neuroticism,
                }
              : undefined,
            facets: participant.big5_facets,
          },
          completedAt: participant.big5_completed_at || new Date().toISOString(),
        }
      : undefined,
    
    // Visual DNA (implicit)
    visualDNA: participant.implicit_dominant_style || participant.implicit_style_1
      ? {
          dominantStyle: participant.implicit_dominant_style,
          dominantTags: [],
          preferences: {
            styles: [
              participant.implicit_style_1,
              participant.implicit_style_2,
              participant.implicit_style_3,
            ].filter(Boolean) as string[],
            colors: [
              participant.implicit_color_1,
              participant.implicit_color_2,
              participant.implicit_color_3,
            ].filter(Boolean) as string[],
            materials: [
              participant.implicit_material_1,
              participant.implicit_material_2,
              participant.implicit_material_3,
            ].filter(Boolean) as string[],
            lighting: [],
          },
          accuracyScore: participant.dna_accuracy_score || 0,
        }
      : undefined,
    
    // Explicit
    semanticDifferential: participant.explicit_warmth !== undefined
      ? {
          warmth: participant.explicit_warmth || 0.5,
          brightness: participant.explicit_brightness || 0.5,
          complexity: participant.explicit_complexity || 0.5,
          texture: participant.explicit_texture || 0.5,
        }
      : undefined,
    
    colorsAndMaterials: participant.explicit_palette || participant.explicit_style
      ? {
          selectedPalette: participant.explicit_palette || '',
          selectedStyle: participant.explicit_style,
          topMaterials: [
            participant.explicit_material_1,
            participant.explicit_material_2,
            participant.explicit_material_3,
          ].filter(Boolean) as string[],
        }
      : undefined,
    
    // Sensory
    sensoryPreferences: participant.sensory_music || participant.sensory_texture || participant.sensory_light
      ? {
          music: participant.sensory_music || '',
          texture: participant.sensory_texture || '',
          light: participant.sensory_light || '',
        }
      : undefined,
    
    biophiliaScore: participant.biophilia_score,
    natureMetaphor: participant.nature_metaphor,
    
    // Lifestyle
    lifestyle: participant.living_situation || participant.life_vibe
      ? {
          livingSituation: participant.living_situation || '',
          lifeVibe: participant.life_vibe || '',
          goals: participant.life_goals || [],
        }
      : undefined,
    
    // Aspirational
    aspirationalSelf: participant.aspirational_feelings || participant.aspirational_rituals
      ? {
          feelings: participant.aspirational_feelings || [],
          rituals: participant.aspirational_rituals || [],
        }
      : undefined,
    
    // PRS
    prsIdeal: participant.prs_ideal_x !== undefined ? { x: participant.prs_ideal_x, y: participant.prs_ideal_y || 0 } : undefined,
    prsCurrent: participant.prs_current_x !== undefined ? { x: participant.prs_current_x, y: participant.prs_current_y || 0 } : undefined,
    prsTarget: participant.prs_target_x !== undefined ? { x: participant.prs_target_x, y: participant.prs_target_y || 0 } : undefined,
    
    // Laddering
    ladderResults: participant.ladder_path || participant.ladder_core_need
      ? {
          // Convert string[] to array of objects format expected by LadderResults
          path: (participant.ladder_path || []).map((answer: string, index: number) => ({
            level: index + 1,
            question: '',
            selectedAnswer: answer,
            selectedId: '',
            timestamp: new Date().toISOString()
          })),
          coreNeed: participant.ladder_core_need || '',
          promptElements: {
            atmosphere: '',
            colors: '',
            lighting: '',
            materials: '',
            layout: '',
            mood: ''
          }
        }
      : undefined,
    ladderPath: participant.ladder_path,
    coreNeed: participant.ladder_core_need,
    
    // Surveys
    surveyData: participant.sus_score !== undefined || participant.clarity_score !== undefined
      ? {
          susScore: participant.sus_score,
          clarityScore: participant.clarity_score,
          agencyScore: participant.agency_score,
          satisfactionScore: participant.satisfaction_score,
          susAnswers: participant.sus_answers,
          agencyAnswers: participant.agency_answers,
          satisfactionAnswers: participant.satisfaction_answers,
          clarityAnswers: participant.clarity_answers,
        }
      : undefined,
    
    // Room
    roomType: participant.room_type,
    roomName: participant.room_name,
    roomUsageType: participant.room_usage_type,
    roomSharedWith: participant.room_shared_with,
    roomPainPoints: participant.room_pain_points,
    roomActivities: participant.room_activities,
    detectedRoomType: participant.room_detected_type,
    roomAnalysis: participant.room_description || participant.room_analysis_confidence !== undefined
      ? {
          detected_room_type: participant.room_detected_type || '',
          confidence: participant.room_analysis_confidence || 0,
          room_description: participant.room_description || '',
          suggestions: participant.room_suggestions || [],
        }
      : undefined,
    
    // Profile status
    coreProfileComplete: participant.core_profile_complete,
    coreProfileCompletedAt: participant.core_profile_completed_at,
  };
}

