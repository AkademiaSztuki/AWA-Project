/**
 * Map SessionData to participants table columns
 * Converts SessionData object to flat structure for database
 */

import { SessionData } from '@/types';
import { normalizeSemanticTo01 } from '@/lib/semantic-scale';
import { isParticipantSpaceUuid } from '@/lib/remote-spaces';
import {
  buildPreferenceComparisonFromSession,
  flattenPreferenceComparisonForParticipant,
  resolveExplicitBiophiliaScore,
} from '@/lib/preferences/preference-comparison-registry';

/**
 * Room Setup often stores answers only in `roomPreferences`; Core Profile uses root
 * `semanticDifferential` / `colorsAndMaterials` (see `CoreProfileWizard.tsx`, `RoomSetup.tsx`).
 * Merge so GCP/CSV see full explicit prefs.
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

/** Resolve explicit materials for dashboard / profile (DB columns → sensory → session export). */
export function resolveExplicitTopMaterialsFromRow(row: {
  explicit_material_1?: string | null;
  explicit_material_2?: string | null;
  explicit_material_3?: string | null;
  sensory_texture?: string | null;
  session_export_json?: unknown;
}): string[] {
  const fromCols = [
    row.explicit_material_1,
    row.explicit_material_2,
    row.explicit_material_3,
  ].filter((m): m is string => typeof m === 'string' && m.trim().length > 0);
  if (fromCols.length > 0) return fromCols;

  const sensoryTex =
    typeof row.sensory_texture === 'string' ? row.sensory_texture.trim() : '';
  if (sensoryTex) return [sensoryTex];

  let exportObj: unknown = row.session_export_json;
  if (typeof exportObj === 'string' && exportObj.trim()) {
    try {
      exportObj = JSON.parse(exportObj);
    } catch {
      return [];
    }
  }
  if (!exportObj || typeof exportObj !== 'object') return [];

  const snap = exportObj as Record<string, unknown>;
  const cm = snap.colorsAndMaterials as { topMaterials?: string[] } | undefined;
  const fromExport = Array.isArray(cm?.topMaterials)
    ? cm.topMaterials.filter((m): m is string => typeof m === 'string' && m.trim().length > 0)
    : [];
  if (fromExport.length > 0) return fromExport;

  const rp = snap.roomPreferences as { colorsAndMaterials?: { topMaterials?: string[] } } | undefined;
  const fromRoom = rp?.colorsAndMaterials?.topMaterials;
  if (Array.isArray(fromRoom) && fromRoom.filter(Boolean).length > 0) {
    return fromRoom.filter((m): m is string => typeof m === 'string' && m.trim().length > 0);
  }

  const sp = snap.sensoryPreferences as { texture?: string } | undefined;
  const rpSp = (snap.roomPreferences as { sensoryPreferences?: { texture?: string } } | undefined)
    ?.sensoryPreferences;
  const tex = sp?.texture?.trim() || rpSp?.texture?.trim();
  return tex ? [tex] : [];
}

export function mergeColorsMaterialsForParticipant(sessionData: SessionData) {
  const cm = sessionData.colorsAndMaterials;
  const rcm = sessionData.roomPreferences?.colorsAndMaterials;
  const topFrom = (a?: string[]) =>
    Array.isArray(a) && a.filter(Boolean).length > 0 ? a.filter(Boolean) as string[] : undefined;
  let topMaterials = topFrom(cm?.topMaterials) ?? topFrom(rcm?.topMaterials) ?? [];
  // Legacy rows: sensory suite choice may live only in sensoryPreferences.texture.
  const tex =
    sessionData.sensoryPreferences?.texture?.trim() ||
    sessionData.roomPreferences?.sensoryPreferences?.texture?.trim();
  if (topMaterials.length === 0 && tex) {
    topMaterials = [tex];
  }
  return {
    selectedPalette: cm?.selectedPalette || rcm?.selectedPalette,
    selectedStyle: cm?.selectedStyle || rcm?.selectedStyle,
    topMaterials,
  };
}

function nonEmptyString(value?: string): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
}

/** Only persist current_space_id when the id is listed in session spaces (synced from GCP). */
export function resolveCurrentSpaceIdForParticipant(
  sessionData: SessionData,
): string | undefined {
  const id = sessionData.currentSpaceId;
  if (!isParticipantSpaceUuid(id)) return undefined;
  const spaces = sessionData.spaces;
  if (!Array.isArray(spaces) || spaces.length === 0) return undefined;
  return spaces.some((s) => s.id === id) ? id : undefined;
}

function nonEmptyMaterials(materials?: string[]): string[] | undefined {
  const list = Array.isArray(materials)
    ? materials.filter((m): m is string => typeof m === 'string' && m.trim().length > 0)
    : [];
  return list.length > 0 ? list : undefined;
}

/** Sensory suite completion payload → explicit `topMaterials` (material = former “texture” step). */
export type SensoryMaterialResultInput = {
  material?: string;
  texture?: string;
  topMaterials?: string[];
};

export function topMaterialsFromSensorySuiteResults(
  results: SensoryMaterialResultInput,
): string[] {
  const fromArr = nonEmptyMaterials(results.topMaterials);
  if (fromArr?.length) return fromArr;
  const choice =
    nonEmptyString(results.material) ?? nonEmptyString(results.texture);
  return choice ? [choice] : [];
}

/** Copy sensory texture into `colorsAndMaterials.topMaterials` when missing (session + GCP export). */
export function normalizeSessionExplicitMaterials(sessionData: SessionData): SessionData {
  const mergedCm = mergeColorsMaterialsForParticipant(sessionData);
  const mergedSensory = mergeSensoryForParticipant(sessionData);
  const out = { ...sessionData };

  const existingTop = (out.colorsAndMaterials?.topMaterials || []).filter(
    (m): m is string => typeof m === 'string' && m.trim().length > 0,
  );
  const topMaterials =
    mergedCm.topMaterials.length > 0 ? mergedCm.topMaterials : existingTop;

  if (
    topMaterials.length > 0 ||
    mergedCm.selectedPalette ||
    mergedCm.selectedStyle ||
    out.colorsAndMaterials
  ) {
    out.colorsAndMaterials = {
      selectedPalette: mergedCm.selectedPalette || out.colorsAndMaterials?.selectedPalette || '',
      selectedStyle: mergedCm.selectedStyle ?? out.colorsAndMaterials?.selectedStyle,
      topMaterials,
    };
  }

  const primaryMaterial = topMaterials[0]?.trim();
  const tex = primaryMaterial || mergedSensory.texture?.trim();
  if (tex || mergedSensory.music || mergedSensory.light) {
    out.sensoryPreferences = {
      music: mergedSensory.music || out.sensoryPreferences?.music || '',
      texture: tex || out.sensoryPreferences?.texture || '',
      light: mergedSensory.light || out.sensoryPreferences?.light || '',
    };
  }

  return out;
}

/**
 * Field-wise merge for profile reload / partial `updateSession` — avoids wiping
 * `topMaterials` when API returns style/palette with empty material columns.
 */
export function mergeSessionDataUpdates(
  base: SessionData,
  updates: Partial<SessionData>,
): SessionData {
  const out: SessionData = { ...base, ...updates };

  if (updates.colorsAndMaterials) {
    const prev = base.colorsAndMaterials;
    const next = updates.colorsAndMaterials;
    out.colorsAndMaterials = {
      selectedPalette:
        nonEmptyString(next.selectedPalette) ??
        nonEmptyString(prev?.selectedPalette) ??
        '',
      selectedStyle:
        nonEmptyString(next.selectedStyle) ?? nonEmptyString(prev?.selectedStyle) ?? '',
      topMaterials:
        nonEmptyMaterials(next.topMaterials) ??
        nonEmptyMaterials(prev?.topMaterials) ??
        [],
    };
  }

  if (updates.sensoryPreferences) {
    const prev = base.sensoryPreferences;
    const next = updates.sensoryPreferences;
    out.sensoryPreferences = {
      music: nonEmptyString(next.music) ?? nonEmptyString(prev?.music) ?? '',
      texture: nonEmptyString(next.texture) ?? nonEmptyString(prev?.texture) ?? '',
      light: nonEmptyString(next.light) ?? nonEmptyString(prev?.light) ?? '',
    };
  }

  if (updates.semanticDifferential) {
    out.semanticDifferential = {
      ...base.semanticDifferential,
      ...updates.semanticDifferential,
    };
  }

  return normalizeSessionExplicitMaterials(out);
}

/** Display list for dashboard explicit materials row (session root). */
export function resolveExplicitMaterialsForDisplay(sessionData: {
  colorsAndMaterials?: { topMaterials?: string[] };
  sensoryPreferences?: { texture?: string };
}): string[] {
  return topMaterialsFromSensorySuiteResults({
    topMaterials: sessionData.colorsAndMaterials?.topMaterials,
    texture: sessionData.sensoryPreferences?.texture,
  });
}

function mergeSensoryForParticipant(sessionData: SessionData) {
  const sp = sessionData.sensoryPreferences;
  const rsp = sessionData.roomPreferences?.sensoryPreferences;
  const explicitMaterial =
    nonEmptyMaterials(sessionData.colorsAndMaterials?.topMaterials)?.[0] ??
    nonEmptyMaterials(sessionData.roomPreferences?.colorsAndMaterials?.topMaterials)?.[0];
  return {
    music: sp?.music || rsp?.music,
    texture: explicitMaterial ?? sp?.texture ?? rsp?.texture,
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

function toSurveyNumber(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

/** Coerce `final_survey` JSONB (numeric strings from exports / drivers) to real numbers. */
function normalizeFinalSurveyFromRow(fs: unknown): SessionData['finalSurvey'] | undefined {
  if (!fs || typeof fs !== 'object') return undefined;
  const x = fs as Record<string, unknown>;
  const sat = (x.satisfaction as Record<string, unknown>) || {};
  const ag = (x.agency as Record<string, unknown>) || {};
  const pref = (x.preferences as Record<string, unknown>) || {};
  return {
    satisfaction: {
      easeOfUse: toSurveyNumber(sat.easeOfUse),
      engagement: toSurveyNumber(sat.engagement),
      clarity: toSurveyNumber(sat.clarity),
      overall: toSurveyNumber(sat.overall),
    },
    agency: {
      control: toSurveyNumber(ag.control),
      collaboration: toSurveyNumber(ag.collaboration),
      creativity: toSurveyNumber(ag.creativity),
      ownership: toSurveyNumber(ag.ownership),
    },
    preferences: {
      evolution: toSurveyNumber(pref.evolution),
      crystallization: toSurveyNumber(pref.crystallization),
      discovery: toSurveyNumber(pref.discovery),
    },
  };
}

/** Roll up research survey scores into `final_survey` JSONB (avoids persisting only default zeros). */
function resolveFinalSurveyForParticipantRow(sessionData: SessionData): SessionData['finalSurvey'] | undefined {
  const sd = sessionData.surveyData;
  if (!sd) return undefined;
  const has =
    sd.susScore != null ||
    sd.clarityScore != null ||
    sd.agencyScore != null ||
    sd.satisfactionScore != null;
  if (!has) return undefined;

  const susN = toSurveyNumber(sd.susScore);
  const clarityN = toSurveyNumber(sd.clarityScore);
  const agencyN = toSurveyNumber(sd.agencyScore);
  const satN = toSurveyNumber(sd.satisfactionScore);
  const susAsSeven = susN > 0 ? Math.min(7, Math.max(0, (susN / 100) * 7)) : 0;

  return {
    satisfaction: {
      easeOfUse: satN,
      engagement: susAsSeven,
      clarity: clarityN,
      overall: satN,
    },
    agency: {
      control: agencyN,
      collaboration: agencyN,
      creativity: agencyN,
      ownership: agencyN,
    },
    preferences: {
      evolution: clarityN,
      crystallization: clarityN,
      discovery: clarityN,
    },
  };
}

function isDefaultZeroFinalSurvey(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false;
  const v = value as SessionData['finalSurvey'];
  const z = (n: unknown) => n === 0;
  return (
    z(v.satisfaction?.easeOfUse) &&
    z(v.satisfaction?.engagement) &&
    z(v.satisfaction?.clarity) &&
    z(v.satisfaction?.overall) &&
    z(v.agency?.control) &&
    z(v.agency?.collaboration) &&
    z(v.agency?.creativity) &&
    z(v.agency?.ownership) &&
    z(v.preferences?.evolution) &&
    z(v.preferences?.crystallization) &&
    z(v.preferences?.discovery)
  );
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
  /** OAuth / magic-link email (column from 05_auth_passwords.sql) */
  email?: string;
  consent_timestamp?: string;
  path_type?: 'fast' | 'full';
  current_step?: string;
  current_space_id?: string;

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
  implicit_dominant_tags?: string[];
  dna_accuracy_score?: number;
  blind_selection_made?: boolean;
  
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
  /** Modify / fast-generate: chronological prompt log (JSONB in DB) */
  modification_prompt_log?: unknown[];

  room_preference_source?: string;
  room_activity_context?: Record<string, unknown>;
  final_survey?: unknown;
  ladder_prompt_elements?: unknown;
  ladder_completed_at?: string;
  room_analysis_comment?: string;
  room_analysis_human_comment?: string;
  room_photo_image_id?: string;

  // Profile status
  core_profile_complete?: boolean;
  core_profile_completed_at?: string;

  /** Implicit (Tinder) vs explicit (/setup/profile) — canonical comparison */
  preference_comparison_json?: import('@/lib/preferences/preference-comparison-registry').PreferenceComparisonResult;
  style_match?: boolean;
  color_tokens_match_score?: number;
  biophilia_match?: boolean;
  nature_metaphor_match?: boolean;
}

/**
 * Map SessionData to ParticipantRow (for database insert/update)
 * @param oauthEmail — Google / magic-link email from secure client storage (not in SessionData)
 */
export function mapSessionDataToParticipant(
  sessionData: SessionData,
  authUserId?: string,
  oauthEmail?: string,
): ParticipantRow {
  const normalized = normalizeSessionExplicitMaterials(sessionData);
  const explicitSem = mergeExplicitSemanticsForParticipant(normalized);
  const mergedCm = mergeColorsMaterialsForParticipant(normalized);
  const mergedSensory = mergeSensoryForParticipant(normalized);
  const explicitTopMaterials = nonEmptyMaterials(mergedCm.topMaterials) ?? [];
  const implicitMaterials = (normalized.visualDNA?.preferences?.materials || []).filter(
    (m): m is string => typeof m === 'string' && m.trim().length > 0,
  );
  const big5Domains = extractBigFiveDomains(normalized);

  const emailNorm =
    typeof oauthEmail === 'string' && oauthEmail.trim().length > 0
      ? oauthEmail.trim().toLowerCase()
      : undefined;

  const row: ParticipantRow = {
    user_hash: sessionData.userHash,
    auth_user_id: authUserId,
    email: emailNorm,
    consent_timestamp: sessionData.consentTimestamp,
    path_type: sessionData.pathType,
    current_step: sessionData.currentStep,
    current_space_id: resolveCurrentSpaceIdForParticipant(normalized),

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
    ...(() => {
      try {
        const comparison = buildPreferenceComparisonFromSession(normalized);
        const flat = flattenPreferenceComparisonForParticipant(comparison);
        const implicitProfile = comparison.dimensions.find((d) => d.id === 'color_tokens');
        const topColors =
          implicitProfile?.implicitCanonical?.slice(0, 5) ||
          normalized.visualDNA?.preferences?.colors?.slice(0, 3) ||
          [];
        return {
          ...flat,
          implicit_color_1: topColors[0] ?? sessionData.visualDNA?.preferences?.colors?.[0],
          implicit_color_2: topColors[1] ?? sessionData.visualDNA?.preferences?.colors?.[1],
          implicit_color_3: topColors[2] ?? sessionData.visualDNA?.preferences?.colors?.[2],
        };
      } catch (err) {
        console.warn('[participants-mapper] preference comparison build failed:', err);
        return {};
      }
    })(),
    // Implicit only: Tinder / visualDNA (never mixed with explicit Sensory “Materiały” choice).
    implicit_material_1: implicitMaterials[0],
    implicit_material_2: implicitMaterials[1],
    implicit_material_3: implicitMaterials[2],
    implicit_warmth: sessionData.visualDNA?.implicitScores?.warmth,
    implicit_brightness: sessionData.visualDNA?.implicitScores?.brightness,
    implicit_complexity: sessionData.visualDNA?.implicitScores?.complexity,
    implicit_dominant_tags:
      sessionData.visualDNA?.dominantTags && sessionData.visualDNA.dominantTags.length > 0
        ? sessionData.visualDNA.dominantTags
        : undefined,
    dna_accuracy_score: sessionData.visualDNA?.accuracyScore ?? sessionData.dnaAccuracyScore,
    blind_selection_made:
      typeof sessionData.blindSelectionMade === 'boolean' ? sessionData.blindSelectionMade : undefined,
    
    // Explicit (0–1 in DB; root session OR roomPreferences from Room Setup)
    explicit_warmth: explicitSem.warmth,
    explicit_brightness: explicitSem.brightness,
    explicit_complexity: explicitSem.complexity,
    explicit_texture: explicitSem.texture,
    explicit_palette: mergedCm.selectedPalette,
    explicit_style: mergedCm.selectedStyle,
    // Explicit only: Sensory “Materiały” step → colorsAndMaterials.topMaterials (normalized).
    explicit_material_1: explicitTopMaterials[0],
    explicit_material_2: explicitTopMaterials[1],
    explicit_material_3: explicitTopMaterials[2],
    
    // Sensory / Biophilia
    sensory_music: mergedSensory.music,
    // Legacy duplicate of explicit_material_1 (same option id); research compares implicit_material_* vs explicit_material_*.
    sensory_texture: explicitTopMaterials[0] ?? mergedSensory.texture,
    sensory_light: mergedSensory.light,
    biophilia_score: resolveExplicitBiophiliaScore(normalized) ?? undefined,
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
    room_analysis_comment: sessionData.roomAnalysis?.comment,
    room_analysis_human_comment: sessionData.roomAnalysis?.human_comment,
    room_preference_source: sessionData.roomPreferenceSource,
    room_activity_context: sessionData.roomActivityContext as Record<string, unknown> | undefined,
    final_survey:
      resolveFinalSurveyForParticipantRow(sessionData) ??
      normalizeFinalSurveyFromRow(sessionData.finalSurvey),
    ladder_prompt_elements: sessionData.ladderResults?.promptElements,
    ladder_completed_at: sessionData.ladderCompleteTime,
    room_photo_image_id: sessionData.roomPhotoImageId,
    
    // Tinder stats (aggregate swipes; `totalImages` holds rehydrated total when `swipes` is empty)
    ...(() => {
      const results = sessionData.tinderResults ?? [];
      const swipes = sessionData.tinderData?.swipes ?? [];
      const stubTotal =
        results.length === 0 &&
        swipes.length === 0 &&
        typeof sessionData.tinderData?.totalImages === 'number' &&
        sessionData.tinderData.totalImages > 0
          ? sessionData.tinderData.totalImages
          : 0;
      const total = Math.max(results.length, swipes.length, stubTotal);
      const countDir = (arr: Array<{ direction?: string }>, dir: 'left' | 'right') =>
        arr.filter((s) => s.direction === dir).length;
      let likes = 0;
      let dislikes = 0;
      if (swipes.length > 0) {
        likes = countDir(swipes, 'right');
        dislikes = countDir(swipes, 'left');
      } else if (results.length > 0) {
        likes = countDir(results, 'right');
        dislikes = countDir(results, 'left');
      }
      return {
        tinder_total_swipes: total,
        tinder_likes: likes,
        tinder_dislikes: dislikes,
      };
    })(),
    
    // Inspiration tags (aggregate from inspirations array)
    inspirations_count: sessionData.inspirations?.length || 0,
    
    // Generation stats (matrix uses `matrixHistory`, not always `generations[]`)
    generations_count: computeGenerationCount(sessionData),
    session_image_ratings: sessionData.imageRatings as Record<string, unknown> | undefined,
    modification_prompt_log: sessionData.modificationPromptLog as unknown[] | undefined,

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
  const timestampFields = [
    'consent_timestamp',
    'big5_completed_at',
    'core_profile_completed_at',
    'ladder_completed_at',
  ];
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
    'room_preference_source',
    'room_analysis_comment',
    'room_analysis_human_comment',
  ]);

  for (const [key, value] of Object.entries(row)) {
    if (value !== undefined && value !== null) {
      if (key === 'final_survey' && isDefaultZeroFinalSurvey(value)) {
        continue;
      }
      if (key === 'modification_prompt_log' && Array.isArray(value) && value.length === 0) {
        continue;
      }
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
      dominantTags: (() => {
        const raw = row.implicit_dominant_tags;
        if (Array.isArray(raw)) {
          return raw.filter((t): t is string => typeof t === 'string' && t.trim().length > 0);
        }
        if (typeof raw === 'string' && raw.trim()) {
          try {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
              return parsed.filter((t): t is string => typeof t === 'string' && t.trim().length > 0);
            }
          } catch {
            /* ignore */
          }
        }
        return [];
      })(),
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
    
    colorsAndMaterials: (() => {
      const topMaterials = resolveExplicitTopMaterialsFromRow(row);
      const hasExplicit =
        row.explicit_palette ||
        row.explicit_style ||
        topMaterials.length > 0;
      if (!hasExplicit) return undefined;
      return {
        selectedPalette: row.explicit_palette || '',
        selectedStyle: row.explicit_style,
        topMaterials,
      };
    })(),
    
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
    surveyData:
      row.sus_score !== undefined ||
      row.clarity_score !== undefined ||
      row.agency_score !== undefined ||
      row.satisfaction_score !== undefined
        ? {
            susScore: row.sus_score,
            clarityScore: row.clarity_score,
            agencyScore: row.agency_score,
            satisfactionScore: row.satisfaction_score,
            susAnswers: row.sus_answers,
            agencyAnswers: row.agency_answers,
            satisfactionAnswers: row.satisfaction_answers,
            clarityAnswers: row.clarity_answers,
          }
        : undefined,
    
    // Room
    roomType: row.room_type,
    roomName: row.room_name,
    roomUsageType: row.room_usage_type,
    roomSharedWith: row.room_shared_with,
    roomPainPoints: row.room_pain_points,
    roomActivities: row.room_activities,
    roomPreferenceSource: row.room_preference_source as SessionData['roomPreferenceSource'],
    roomActivityContext: row.room_activity_context as SessionData['roomActivityContext'],
    detectedRoomType: row.room_detected_type,
    roomAnalysis: row.room_description || row.room_analysis_comment || row.room_analysis_human_comment ? {
      detected_room_type: row.room_detected_type || '',
      confidence: row.room_analysis_confidence || 0,
      room_description: row.room_description || '',
      suggestions: row.room_suggestions || [],
      comment: row.room_analysis_comment,
      human_comment: row.room_analysis_human_comment,
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
    roomPhotoImageId: row.room_photo_image_id || undefined,
    modificationPromptLog: Array.isArray(row.modification_prompt_log)
      ? (row.modification_prompt_log as SessionData['modificationPromptLog'])
      : undefined,

    // Profile status
    coreProfileComplete: row.core_profile_complete || false,
    coreProfileCompletedAt: row.core_profile_completed_at,
    
    // Required fields
    finalSurvey: (() => {
      const fs = row.final_survey;
      const normalized = normalizeFinalSurveyFromRow(fs);
      if (normalized) return normalized;
      return {
        satisfaction: { easeOfUse: 0, engagement: 0, clarity: 0, overall: 0 },
        agency: { control: 0, collaboration: 0, creativity: 0, ownership: 0 },
        preferences: { evolution: 0, crystallization: 0, discovery: 0 },
      };
    })(),
  };
  
  return sessionData;
}

