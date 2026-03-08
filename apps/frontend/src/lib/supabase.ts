/**
 * Data persistence layer – GCP backend only (Supabase removed).
 *
 * This module used to wrap the Supabase JS client. After decoupling from
 * Supabase the file keeps the same public API surface so that callers do
 * not need to change their imports, but every database / storage operation
 * now goes through the GCP Cloud Run backend via `gcpApi`.
 */

import { gcpApi } from './gcp-api-client';

// ---------------------------------------------------------------------------
// Feature flags
// ---------------------------------------------------------------------------
export const DISABLE_SESSION_SYNC =
  (process.env.NEXT_PUBLIC_DISABLE_SESSION_SYNC ?? '0') !== '0';

/** Always true – GCP is the only backend now. */
export const isGcpPrimaryEnabled = (): boolean => true;

// ---------------------------------------------------------------------------
// Safe localStorage / sessionStorage helpers (no Supabase dependency)
// ---------------------------------------------------------------------------
const memoryStorage: Record<string, string> = {};

export const safeLocalStorage = {
  getItem: (key: string): string | null => {
    try {
      if (typeof window === 'undefined') return null;
      return localStorage.getItem(key) || memoryStorage[key] || null;
    } catch {
      return memoryStorage[key] || null;
    }
  },
  setItem: (key: string, value: string): void => {
    try {
      if (typeof window === 'undefined') return;
      localStorage.setItem(key, value);
    } catch {
      memoryStorage[key] = value;
    }
  },
  removeItem: (key: string): void => {
    try {
      if (typeof window === 'undefined') return;
      localStorage.removeItem(key);
    } catch {
      delete memoryStorage[key];
    }
  },
};

const sessionMemoryStorage: Record<string, string> = {};
export const safeSessionStorage = {
  getItem: (key: string): string | null => {
    try {
      if (typeof window === 'undefined') return null;
      return sessionStorage.getItem(key) || sessionMemoryStorage[key] || null;
    } catch {
      return sessionMemoryStorage[key] || null;
    }
  },
  setItem: (key: string, value: string): void => {
    try {
      if (typeof window === 'undefined') return;
      sessionStorage.setItem(key, value);
    } catch {
      sessionMemoryStorage[key] = value;
    }
  },
  removeItem: (key: string): void => {
    try {
      if (typeof window === 'undefined') return;
      sessionStorage.removeItem(key);
    } catch {
      delete sessionMemoryStorage[key];
    }
  },
};

// ---------------------------------------------------------------------------
// Legacy no-op stubs (kept for backward compatibility)
// ---------------------------------------------------------------------------
export const logBehavioralEvent = async (
  _projectId: string,
  _eventType: string,
  _eventData: Record<string, any>,
) => {};

export const createProject = async (_userHash: string) => null;

export const updateDiscoverySession = async (
  _projectId: string,
  _visualDNA: any,
  _accuracyScore: number,
  _ladderingPath: any,
  _coreNeed: string,
) => {};

export const saveGenerationSet = async (_projectId: string, _prompt: string) =>
  null;

// ---------------------------------------------------------------------------
// Generation feedback & regeneration events
// ---------------------------------------------------------------------------
export const saveGenerationFeedback = async (
  feedback: {
    sessionId: string;
    projectId?: string;
    generatedSources: string[];
    selectedSource: string | null;
    selectionTime: number;
    hasCompleteBigFive: boolean;
    tinderSwipeCount: number;
    explicitAnswerCount: number;
    sourceQuality?: Record<string, string> | Record<string, any>;
    implicitQuality?: any;
    conflictAnalysis?: any;
    userRating?: number;
  },
) => {
  const r = await gcpApi.research.generationFeedback(feedback);
  return r.ok;
};

export const saveRegenerationEvent = async (
  event: {
    sessionId: string;
    projectId?: string;
    previousSources: string[];
    previousSelected: string | null;
    regenerationCount: number;
    timeSinceLastGen: number;
    interpretation: string;
    sourceQuality?: Record<string, string>;
    implicitQuality?: any;
  },
) => {
  const r = await gcpApi.research.regenerationEvent({
    sessionId: event.sessionId,
    projectId: event.projectId,
    previousSources: event.previousSources,
    previousSelected: event.previousSelected,
    regenerationCount: event.regenerationCount,
    timeSinceLastMs: event.timeSinceLastGen,
    interpretation: event.interpretation,
    sourceQuality: event.sourceQuality,
    implicitQuality: event.implicitQuality,
  });
  return r.ok;
};

// ---------------------------------------------------------------------------
// Full session save / fetch (participants table)
// ---------------------------------------------------------------------------
export const saveFullSessionToSupabase = async (sessionData: any) => {
  if (DISABLE_SESSION_SYNC) return true;
  if (!sessionData?.userHash) return;

  try {
    const { mapSessionDataToParticipant } = await import(
      '@/lib/participants-mapper'
    );

    const googleAuthUserId =
      typeof window !== 'undefined'
        ? safeLocalStorage.getItem('aura_google_auth_user_id')
        : null;

    const participantRow = mapSessionDataToParticipant(
      sessionData,
      googleAuthUserId ?? undefined,
    );
    if (!participantRow.consent_timestamp) {
      participantRow.consent_timestamp = new Date().toISOString();
    }

    const r = await gcpApi.participants.saveSession(sessionData.userHash, {
      participantRow: participantRow as unknown as Record<string, unknown>,
    });
    if (!r.ok) {
      console.error('[GCP] session save failed:', r.error);
    }
  } catch (err) {
    console.error('saveFullSessionToSupabase error:', err);
  }
};

export const fetchLatestSessionSnapshot = async (userHash: string) => {
  if (!userHash) return null;

  try {
    const r = await gcpApi.participants.fetchSession(userHash);
    if (!r.ok || r.data?.participant == null) return null;
    const { mapParticipantToSessionData } = await import(
      '@/lib/participants-mapper'
    );
    return mapParticipantToSessionData(r.data.participant as any);
  } catch (err) {
    console.error('fetchLatestSessionSnapshot error:', err);
    return null;
  }
};

// ---------------------------------------------------------------------------
// Legacy stubs
// ---------------------------------------------------------------------------
export const getOrCreateProjectId = async (
  _userHash: string,
): Promise<string | null> => null;

export const saveTinderSwipes = async (
  _projectId: string,
  _swipes: any[],
) => {};

export const saveDeviceContext = async (
  _projectId: string,
  _context: Record<string, any>,
) => {};

export const startPageView = async (
  _projectId: string,
  _page: string,
  _meta?: any,
) => null;

export const endPageView = async (_pageViewId: string) => {};

export const saveTinderExposures = async (
  _projectId: string,
  _exposures: any[],
) => {};

// ---------------------------------------------------------------------------
// Participant swipes
// ---------------------------------------------------------------------------
export const saveParticipantSwipes = async (
  userHash: string,
  swipes: Array<{
    imageId: number | string;
    direction: 'left' | 'right';
    reactionTime?: number;
    reactionTimeMs?: number;
    timestamp?: number | string;
    tags?: string[];
    categories?: {
      style?: string | null;
      colors?: string[];
      materials?: string[];
    };
  }>,
) => {
  if (!userHash || !swipes.length) return;

  const participantExists = await ensureParticipantExists(userHash);
  if (!participantExists) return;

  const r = await gcpApi.swipes.save(userHash, swipes);
  return r.ok;
};

export const saveTinderSwipesDetailed = async (
  _projectId: string,
  _swipes: any[],
) => {};

export const saveDnaSnapshot = async (
  _projectId: string,
  _snapshot: {
    weights: any;
    top: any;
    confidence: number;
    parser_version: string;
  },
) => {};

export const saveLadderPathRows = async (
  _projectId: string,
  _rows: any[],
) => {};

export const saveLadderSummary = async (
  _projectId: string,
  _summary: any,
) => {};

// ---------------------------------------------------------------------------
// Participant generations
// ---------------------------------------------------------------------------
export const startParticipantGeneration = async (
  userHash: string,
  job: {
    type: 'initial' | 'micro' | 'macro';
    prompt: string;
    parameters: any;
    has_base_image: boolean;
    modification_label?: string;
    source?: string;
  },
) => {
  if (!userHash) return null;

  const participantExists = await ensureParticipantExists(userHash);
  if (!participantExists) return null;

  const r = await gcpApi.generations.start(userHash, job);
  return r.ok && r.data?.generationId ? r.data.generationId : null;
};

export const endParticipantGeneration = async (
  jobId: string,
  outcome: {
    status: 'success' | 'error';
    latency_ms: number;
    error_message?: string;
  },
) => {
  const r = await gcpApi.generations.end(jobId, outcome);
  return r.ok;
};

export const startGenerationJob = async (
  _projectId: string,
  _job: {
    type: string;
    prompt: string;
    parameters: any;
    has_base_image: boolean;
    modification_label?: string;
  },
) => null;

export const endGenerationJob = async (
  _jobId: string,
  _outcome: {
    status: 'success' | 'error';
    latency_ms: number;
    error_message?: string;
  },
) => {};

export const saveImageRatingEvent = async (
  _projectId: string,
  _event: { local_image_id: string; rating_key: string; value: number },
) => {};

export const logHealthCheck = async (
  _projectId: string,
  _ok: boolean,
  _latency_ms: number,
) => {};

export const logErrorEvent = async (
  _projectId: string,
  _payload: {
    source: string;
    message: string;
    stack?: string;
    meta?: any;
  },
) => {};

// ---------------------------------------------------------------------------
// Ensure participant exists
// ---------------------------------------------------------------------------
export const ensureParticipantExists = async (
  userHash: string,
): Promise<boolean> => {
  if (!userHash) return false;

  const r = await gcpApi.participants.ensure(userHash);
  return r.ok;
};

// ---------------------------------------------------------------------------
// Participant images
// ---------------------------------------------------------------------------
export const saveParticipantImage = async (
  userHash: string,
  image: {
    type: 'generated' | 'inspiration' | 'room_photo' | 'room_photo_empty';
    space_id?: string;
    storage_path: string;
    public_url?: string;
    thumbnail_url?: string;
    is_favorite?: boolean;
    tags_styles?: string[];
    tags_colors?: string[];
    tags_materials?: string[];
    tags_biophilia?: number;
    description?: string;
    source?: string;
    generation_id?: string;
  },
): Promise<string | null> => {
  if (!userHash || !image.storage_path) return null;

  const participantExists = await ensureParticipantExists(userHash);
  if (!participantExists) return null;

  const r = await gcpApi.images.register(userHash, {
    type: image.type,
    storage_path: image.storage_path,
    public_url: image.public_url,
    thumbnail_url: image.thumbnail_url,
    is_favorite: image.is_favorite,
    space_id: image.space_id,
    tags_styles: image.tags_styles,
    tags_colors: image.tags_colors,
    tags_materials: image.tags_materials,
    tags_biophilia: image.tags_biophilia,
    description: image.description,
    source: image.source,
    generation_id: image.generation_id,
  });
  return r.ok ? (r.data?.imageId ?? null) : null;
};

export const saveGeneratedImages = async (
  _generationSetId: string,
  _images: Array<{ url: string; prompt: string; parameters?: any }>,
) => [];

export const updateGeneratedImageRatings = async (
  _imageId: string,
  _ratings: {
    aesthetic_match?: number;
    character?: number;
    harmony?: number;
  },
) => {};

// ---------------------------------------------------------------------------
// Research consent
// ---------------------------------------------------------------------------
export const CONSENT_VERSION = '2025-12-22';

export const saveResearchConsent = async (
  userId: string,
  consent: {
    consentResearch: boolean;
    consentProcessing: boolean;
    acknowledgedArt13: boolean;
  },
  locale: 'pl' | 'en',
) => {
  const r = await gcpApi.research.consent({
    userId,
    consent,
    locale,
    consentVersion: CONSENT_VERSION,
  });
  return r.ok ? (r.data as any) : null;
};
