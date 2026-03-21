/**
 * Client data layer for AWA: Cloud Run API → Cloud SQL / GCS (Google Cloud).
 * All persistence goes through `gcpApi`; there is no Supabase runtime dependency.
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
// Safe localStorage / sessionStorage helpers
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
// Participant session snapshot (Cloud SQL `participants` via Cloud Run)
// ---------------------------------------------------------------------------
export const fetchSessionSnapshotFromGcp = async (userHash: string) => {
  if (!userHash) return null;
  if (!gcpApi.isConfigured()) return null;

  try {
    const r = await gcpApi.participants.fetchSession(userHash);
    if (!r.ok || r.data?.participant == null) return null;
    const { mapParticipantToSessionData } = await import(
      '@/lib/participants-mapper'
    );
    return mapParticipantToSessionData(r.data.participant as any);
  } catch (err) {
    console.error('fetchSessionSnapshotFromGcp error:', err);
    return null;
  }
};

/** Prevents `{ ...remote, ...local }` from overwriting remote fields with `undefined` (spread assigns undefined). */
function omitUndefinedValues(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) {
      out[k] = v;
    }
  }
  return out;
}

export const saveSessionToGcp = async (sessionData: any): Promise<boolean> => {
  if (DISABLE_SESSION_SYNC) return true;
  if (!sessionData?.userHash) return false;
  if (!gcpApi.isConfigured()) {
    if (process.env.NODE_ENV === 'development') {
      console.warn(
        '[GCP] saveSessionToGcp skipped: set NEXT_PUBLIC_GCP_API_BASE_URL (Cloud Run API)',
      );
    }
    return false;
  }

  try {
    const { mapSessionDataToParticipant, mapParticipantToSessionData } = await import(
      '@/lib/participants-mapper'
    );

    const googleAuthUserId =
      typeof window !== 'undefined'
        ? safeLocalStorage.getItem('aura_google_auth_user_id')
        : null;
    const authId = googleAuthUserId ?? undefined;

    const localRow = mapSessionDataToParticipant(sessionData, authId);
    const localRowDefined = omitUndefinedValues(localRow as unknown as Record<string, unknown>);

    let mergedRow: Record<string, unknown> = {
      ...localRowDefined,
    };

    let rawAuthUserId: string | null | undefined;
    try {
      const fetchRes = await gcpApi.participants.fetchSession(sessionData.userHash);
      if (fetchRes.ok && fetchRes.data?.participant != null) {
        const raw = fetchRes.data.participant as Record<string, unknown>;
        const aid = raw.auth_user_id;
        if (typeof aid === 'string' && aid.length > 0) {
          rawAuthUserId = aid;
        }
        const remoteSession = mapParticipantToSessionData(raw);
        const remoteRow = mapSessionDataToParticipant(remoteSession, authId) as unknown as Record<
          string,
          unknown
        >;
        mergedRow = { ...omitUndefinedValues(remoteRow), ...localRowDefined };
      }
    } catch {
      // merge is best-effort; local-only save still runs
    }

    if (
      (mergedRow.auth_user_id === undefined || mergedRow.auth_user_id === null) &&
      rawAuthUserId != null &&
      rawAuthUserId !== ''
    ) {
      mergedRow.auth_user_id = rawAuthUserId;
    }

    if (!mergedRow.consent_timestamp) {
      mergedRow.consent_timestamp = new Date().toISOString();
    }

    const payload = {
      participantRow: mergedRow,
    };

    let r = await gcpApi.participants.saveSession(sessionData.userHash, payload);
    if (!r.ok) {
      console.error('[GCP] session save failed:', r.error);
      await new Promise((res) => setTimeout(res, 400));
      r = await gcpApi.participants.saveSession(sessionData.userHash, payload);
    }
    if (!r.ok) {
      console.error('[GCP] session save failed after retry:', r.error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('saveSessionToGcp error:', err);
    return false;
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
