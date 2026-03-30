/**
 * Client data layer for AWA: Cloud Run API → Cloud SQL / GCS (Google Cloud).
 * All persistence goes through `gcpApi`; there is no Supabase runtime dependency.
 */

import type { FlowStep, SessionData } from '@/types';
import { GOOGLE_AUTH_EMAIL_STORAGE_KEY } from '@/lib/auth-storage-keys';
import { gcpApi } from './gcp-api-client';
import {
  emitPersistenceSaveAudit855,
  ingestPersistenceTrace855,
  isPersistenceDebugEnabled,
  pickMergedRowAuditFields,
  shortHashForLog,
  summarizeParticipantRowForPersistenceDebug,
  summarizeSessionForPersistenceDebug,
} from '@/lib/persistence-debug';

// ---------------------------------------------------------------------------
// Feature flags
// ---------------------------------------------------------------------------
export const DISABLE_SESSION_SYNC =
  (process.env.NEXT_PUBLIC_DISABLE_SESSION_SYNC ?? '0') !== '0';

/**
 * Włącz szczegółowe logi zapisu sesji → Cloud Run w konsoli przeglądarki.
 * W `.env.local`: `NEXT_PUBLIC_DEBUG_SESSION_SYNC=1` (wymaga restartu dev server / przebudowy).
 */
export const isSessionSyncDebugEnabled = (): boolean =>
  process.env.NEXT_PUBLIC_DEBUG_SESSION_SYNC === '1';

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
// Research events (participant_research_events via Cloud Run)
// `projectId` in older call sites is the participant user_hash.
// ---------------------------------------------------------------------------
export const logBehavioralEvent = async (
  userHash: string,
  eventType: string,
  eventData: Record<string, unknown>,
): Promise<void> => {
  if (!userHash || String(userHash).trim() === '') {
    // #region agent log
    ingestPersistenceTrace855({
      hypothesisId: 'H2',
      location: 'gcp-data.ts:logBehavioralEvent',
      message: 'skip_no_userHash',
      data: { eventType },
    });
    // #endregion
    return;
  }
  if (!gcpApi.isConfigured()) {
    // #region agent log
    ingestPersistenceTrace855({
      hypothesisId: 'H1',
      location: 'gcp-data.ts:logBehavioralEvent',
      message: 'skip_gcp_not_configured',
      data: { eventType, userHashShort: shortHashForLog(userHash) },
    });
    // #endregion
    return;
  }
  try {
    void ensureParticipantExists(userHash);
    const r = await gcpApi.research.events({
      events: [
        {
          userHash,
          eventType,
          payload: eventData,
          clientTimestamp: new Date().toISOString(),
        },
      ],
    });
    if (!r.ok) {
      // #region agent log
      ingestPersistenceTrace855({
        hypothesisId: 'H3',
        location: 'gcp-data.ts:logBehavioralEvent',
        message: 'research_events_failed',
        data: {
          eventType,
          userHashShort: shortHashForLog(userHash),
          errSlice: String(r.error ?? '').slice(0, 400),
          status: r.status ?? null,
        },
      });
      // #endregion
      if (isPersistenceDebugEnabled()) {
        console.warn('[logBehavioralEvent]', eventType, r.error);
      }
    }
  } catch (e) {
    // #region agent log
    ingestPersistenceTrace855({
      hypothesisId: 'H4',
      location: 'gcp-data.ts:logBehavioralEvent',
      message: 'exception',
      data: {
        eventType,
        userHashShort: shortHashForLog(userHash),
        errSlice: e instanceof Error ? e.message.slice(0, 400) : 'unknown',
      },
    });
    // #endregion
    if (isPersistenceDebugEnabled()) console.warn('[logBehavioralEvent]', e);
  }
};

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
  if (!r.ok) {
    // #region agent log
    ingestPersistenceTrace855({
      hypothesisId: 'H3',
      location: 'gcp-data.ts:saveGenerationFeedback',
      message: 'generation_feedback_failed',
      data: {
        sessionIdSlice: String(feedback.sessionId ?? '').slice(0, 24),
        errSlice: String(r.error ?? '').slice(0, 400),
        status: r.status ?? null,
      },
    });
    // #endregion
  }
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

/** Same idea as participants-mapper — repeated here so the save path always sees live sessionData. */
function computeGenerationCountFromSession(sessionData: Record<string, unknown>): number {
  const g = Array.isArray(sessionData.generations) ? sessionData.generations.length : 0;
  const mh = Array.isArray(sessionData.matrixHistory) ? sessionData.matrixHistory.length : 0;
  const gi = Array.isArray(sessionData.generatedImages) ? sessionData.generatedImages.length : 0;
  return Math.max(g, mh, gi);
}

/** Live Tinder aggregates from session (avoids zeroing DB after GCP rehydration left empty `swipes` but `totalImages` holds prior total). */
function computeTinderStatsFromSession(sessionData: Record<string, unknown>): {
  total: number;
  likes: number;
  dislikes: number;
} {
  const results = Array.isArray(sessionData.tinderResults)
    ? (sessionData.tinderResults as Array<{ direction?: string }>)
    : [];
  const td = sessionData.tinderData as { swipes?: Array<{ direction?: string }>; totalImages?: number } | undefined;
  const swipes = Array.isArray(td?.swipes) ? td.swipes : [];
  const totalImages = typeof td?.totalImages === 'number' && td.totalImages > 0 ? td.totalImages : 0;

  const countSwipeList = (arr: Array<{ direction?: string }>) => {
    let likes = 0;
    let dislikes = 0;
    for (const s of arr) {
      if (s?.direction === 'right') likes++;
      else if (s?.direction === 'left') dislikes++;
    }
    return { len: arr.length, likes, dislikes };
  };

  const r = countSwipeList(results);
  const w = countSwipeList(swipes);
  const detailLen = Math.max(r.len, w.len);
  const total = detailLen > 0 ? detailLen : totalImages;

  let likes = 0;
  let dislikes = 0;
  if (w.len > 0) {
    likes = w.likes;
    dislikes = w.dislikes;
  } else if (r.len > 0) {
    likes = r.likes;
    dislikes = r.dislikes;
  }

  return { total, likes, dislikes };
}

function numOr0(v: unknown): number {
  return typeof v === 'number' && !Number.isNaN(v) ? v : 0;
}

/**
 * Ensures `path_type`, `current_step`, and top-level room fields used by CSV exist when possible
 * before mapping to `participants` (UPSERT only updates keys present in the payload).
 */
export function finalizeSessionDataForParticipantPersist(sessionData: SessionData): SessionData {
  const out = { ...sessionData } as SessionData;

  const step = out.currentStep;
  if (
    step === undefined ||
    step === null ||
    (typeof step === 'string' && step.trim() === '')
  ) {
    out.currentStep = 'landing' as FlowStep;
  }

  if (out.pathType !== 'fast' && out.pathType !== 'full') {
    const stored =
      typeof window !== 'undefined'
        ? safeSessionStorage.getItem('aura_auth_path_type')
        : null;
    if (stored === 'fast' || stored === 'full') {
      out.pathType = stored;
    } else if (typeof out.consentTimestamp === 'string' && out.consentTimestamp.length > 0) {
      // Product default once consent exists; avoids NULL path_type in exports when UI skipped PathSelection.
      out.pathType = 'full';
    }
  }

  // Denormalize from active space when setup flow stored room only on the space card.
  if (out.currentSpaceId && Array.isArray(out.spaces) && out.spaces.length > 0) {
    const sp = out.spaces.find((s) => s.id === out.currentSpaceId);
    if (sp) {
      if (!out.roomType || String(out.roomType).trim() === '') {
        out.roomType = sp.type;
      }
      if (!out.roomName || String(out.roomName).trim() === '') {
        out.roomName = sp.name;
      }
    }
  }

  return out;
}

function summarizeParticipantRowForDebug(row: Record<string, unknown>) {
  const has = (k: string) => {
    const v = row[k];
    if (v === null || v === undefined) return false;
    if (typeof v === 'string') return v.length > 0;
    return true;
  };
  return {
    columnCount: Object.keys(row).length,
    path_type: row.path_type,
    current_step: row.current_step,
    generations_count: row.generations_count,
    big5_completed_at: row.big5_completed_at,
    explicit_any:
      has('explicit_warmth') ||
      has('explicit_brightness') ||
      has('explicit_complexity') ||
      has('explicit_style'),
    room_any: has('room_type') || has('room_name') || has('room_usage_type'),
    session_image_ratings: has('session_image_ratings'),
    tinder_total_swipes: row.tinder_total_swipes,
    tinder_likes: row.tinder_likes,
  };
}

async function reportSessionPersistFailure(
  userHash: string,
  detail: { stage: string; error: unknown },
): Promise<void> {
  if (typeof window === 'undefined') return;
  try {
    const msg =
      detail.error instanceof Error
        ? detail.error.message
        : typeof detail.error === 'string'
          ? detail.error
          : JSON.stringify(detail.error);
    await fetch('/api/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId: userHash,
        eventType: 'session_persist_failed',
        eventData: { stage: detail.stage, error: msg.slice(0, 500) },
      }),
    });
  } catch {
    // ignore secondary failures
  }
}

export const saveSessionToGcp = async (sessionData: any): Promise<boolean> => {
  const dbg = isSessionSyncDebugEnabled();
  const pdb = isPersistenceDebugEnabled();
  const shortHash = (h: string) =>
    h.length > 14 ? `${h.slice(0, 10)}…${h.slice(-4)}` : h;

  if (DISABLE_SESSION_SYNC) {
    // #region agent log
    ingestPersistenceTrace855({
      hypothesisId: 'H1',
      location: 'gcp-data.ts:saveSessionToGcp',
      message: 'skip_session_sync_disabled',
      data: {},
    });
    // #endregion
    if (pdb) {
      emitPersistenceSaveAudit855({
        outcome: 'skipped',
        skipReason: 'NEXT_PUBLIC_DISABLE_SESSION_SYNC',
        userHashShort: '',
      });
    }
    if (dbg) {
      console.log('[session-sync:debug] save skipped (NEXT_PUBLIC_DISABLE_SESSION_SYNC)');
    }
    return true;
  }
  if (!sessionData?.userHash) {
    // #region agent log
    ingestPersistenceTrace855({
      hypothesisId: 'H2',
      location: 'gcp-data.ts:saveSessionToGcp',
      message: 'skip_no_userHash',
      data: { hasSession: !!sessionData },
    });
    // #endregion
    if (pdb) {
      emitPersistenceSaveAudit855({
        outcome: 'skipped',
        skipReason: 'no_userHash',
        userHashShort: '',
      });
    }
    if (dbg) console.warn('[session-sync:debug] save skipped: no userHash');
    return false;
  }
  if (!gcpApi.isConfigured()) {
    // #region agent log
    ingestPersistenceTrace855({
      hypothesisId: 'H1',
      location: 'gcp-data.ts:saveSessionToGcp',
      message: 'skip_gcp_not_configured',
      data: { userHashShort: shortHash(String(sessionData.userHash)) },
    });
    // #endregion
    if (pdb) {
      emitPersistenceSaveAudit855({
        outcome: 'skipped',
        skipReason: 'NEXT_PUBLIC_GCP_API_BASE_URL_missing',
        userHashShort: shortHashForLog(String(sessionData.userHash)),
      });
    }
    if (process.env.NODE_ENV === 'development') {
      console.warn(
        '[GCP] saveSessionToGcp skipped: set NEXT_PUBLIC_GCP_API_BASE_URL (Cloud Run API)',
      );
    }
    if (dbg) console.warn('[session-sync:debug] save skipped: GCP API not configured');
    return false;
  }

  try {
    if (dbg) {
      console.log('[session-sync:debug] save start (session snapshot)', {
        userHash: shortHash(sessionData.userHash),
        pathType: sessionData.pathType,
        currentStep: sessionData.currentStep,
        generationsCount: Array.isArray(sessionData.generations)
          ? sessionData.generations.length
          : undefined,
        hasBigFive: !!sessionData.bigFive,
        imageRatingsCount: Array.isArray(sessionData.imageRatings)
          ? sessionData.imageRatings.length
          : undefined,
      });
    }
    if (pdb) {
      console.log('[persistence:debug] session snapshot before persist (counts only)', {
        userHash: shortHashForLog(String(sessionData.userHash)),
        ...summarizeSessionForPersistenceDebug(sessionData as SessionData),
      });
    }

    const { mapSessionDataToParticipant, mapParticipantToSessionData } = await import(
      '@/lib/participants-mapper'
    );

    const googleAuthUserId =
      typeof window !== 'undefined'
        ? safeLocalStorage.getItem('aura_google_auth_user_id')
        : null;
    const authId = googleAuthUserId ?? undefined;

    const oauthEmailRaw =
      typeof window !== 'undefined' ? safeLocalStorage.getItem(GOOGLE_AUTH_EMAIL_STORAGE_KEY) : null;
    const oauthEmail =
      typeof oauthEmailRaw === 'string' && oauthEmailRaw.trim().length > 0
        ? oauthEmailRaw.trim().toLowerCase()
        : undefined;

    const finalized = finalizeSessionDataForParticipantPersist(sessionData as SessionData);

    const localRow = mapSessionDataToParticipant(finalized, authId, oauthEmail);
    const localRowDefined = omitUndefinedValues(localRow as unknown as Record<string, unknown>);

    let mergedRow: Record<string, unknown> = {
      ...localRowDefined,
    };

    let rawAuthUserId: string | null | undefined;
    let rawParticipantRow: Record<string, unknown> | null = null;
    let remoteMergeUsed = false;
    try {
      const fetchRes = await gcpApi.participants.fetchSession(sessionData.userHash);
      if (fetchRes.ok && fetchRes.data?.participant != null) {
        remoteMergeUsed = true;
        const raw = fetchRes.data.participant as Record<string, unknown>;
        rawParticipantRow = raw;
        const aid = raw.auth_user_id;
        if (typeof aid === 'string' && aid.length > 0) {
          rawAuthUserId = aid;
        }
        const remoteSession = mapParticipantToSessionData(raw);
        const remoteRow = mapSessionDataToParticipant(remoteSession, authId, oauthEmail) as unknown as Record<
          string,
          unknown
        >;
        mergedRow = { ...omitUndefinedValues(remoteRow), ...localRowDefined };
      }
    } catch {
      // merge is best-effort; local-only save still runs
    }

    // Safety net: merge can leave path/current empty if both remote and local omitted them; re-apply from finalized row.
    const lrPath = localRowDefined.path_type;
    if (
      (mergedRow.path_type === undefined ||
        mergedRow.path_type === null ||
        mergedRow.path_type === '') &&
      lrPath !== undefined &&
      lrPath !== null &&
      lrPath !== ''
    ) {
      mergedRow.path_type = lrPath;
    }
    const lrStep = localRowDefined.current_step;
    if (
      (mergedRow.current_step === undefined ||
        mergedRow.current_step === null ||
        mergedRow.current_step === '') &&
      lrStep !== undefined &&
      lrStep !== null &&
      lrStep !== ''
    ) {
      mergedRow.current_step = lrStep;
    }

    if (
      (mergedRow.auth_user_id === undefined || mergedRow.auth_user_id === null) &&
      rawAuthUserId != null &&
      rawAuthUserId !== ''
    ) {
      mergedRow.auth_user_id = rawAuthUserId;
    }

    if (
      oauthEmail &&
      (mergedRow.email === undefined ||
        mergedRow.email === null ||
        String(mergedRow.email).trim() === '')
    ) {
      mergedRow.email = oauthEmail;
    }

    if (!mergedRow.consent_timestamp) {
      mergedRow.consent_timestamp = new Date().toISOString();
    }

    // generations_count: mapper + raw DB max, then bump from live session (matrixHistory is not always in mapped row timing).
    const rawGc = rawParticipantRow?.generations_count;
    let gc =
      typeof mergedRow.generations_count === 'number' ? mergedRow.generations_count : 0;
    if (typeof rawGc === 'number') {
      gc = Math.max(gc, rawGc);
    }
    gc = Math.max(gc, computeGenerationCountFromSession(finalized as unknown as Record<string, unknown>));
    mergedRow.generations_count = gc;

    // Tinder_*: merged local row can be 0 after GCP rehydration (empty swipes); never regress below remote or live session.
    const liveTinder = computeTinderStatsFromSession(finalized as unknown as Record<string, unknown>);
    const rawTt = rawParticipantRow?.tinder_total_swipes;
    const rawTl = rawParticipantRow?.tinder_likes;
    const rawTd = rawParticipantRow?.tinder_dislikes;
    mergedRow.tinder_total_swipes = Math.max(
      numOr0(mergedRow.tinder_total_swipes),
      numOr0(rawTt),
      liveTinder.total,
    );
    mergedRow.tinder_likes = Math.max(
      numOr0(mergedRow.tinder_likes),
      numOr0(rawTl),
      liveTinder.likes,
    );
    mergedRow.tinder_dislikes = Math.max(
      numOr0(mergedRow.tinder_dislikes),
      numOr0(rawTd),
      liveTinder.dislikes,
    );

    // inspirations_count: session array may be empty while rows exist in participant_images; do not regress.
    const rawInsp = rawParticipantRow?.inspirations_count;
    const sessionInspLen = Array.isArray((finalized as unknown as { inspirations?: unknown[] }).inspirations)
      ? (finalized as { inspirations: unknown[] }).inspirations.length
      : 0;
    mergedRow.inspirations_count = Math.max(
      numOr0(mergedRow.inspirations_count),
      numOr0(rawInsp),
      sessionInspLen,
    );

    if (dbg) {
      console.log(
        '[session-sync:debug] merged row (going to API)',
        summarizeParticipantRowForDebug(mergedRow),
      );
    }

    // #region agent log (debug session 995889 — generation_count persist)
    {
      const fd = finalized as unknown as Record<string, unknown>;
      const matrixLen = Array.isArray(fd.matrixHistory) ? fd.matrixHistory.length : 0;
      const genLen = Array.isArray(fd.generations) ? fd.generations.length : 0;
      const imgLen = Array.isArray(fd.generatedImages) ? fd.generatedImages.length : 0;
      const mh = Array.isArray(fd.matrixHistory) ? fd.matrixHistory : [];
      const matrixSourcesSample = mh
        .slice(-10)
        .map((it: unknown) =>
          String(typeof it === 'object' && it !== null && 'source' in it ? (it as { source?: string }).source : '?'),
        );
      let spacesGeneratedImageCount = 0;
      if (Array.isArray(fd.spaces)) {
        for (const s of fd.spaces as { images?: Array<{ type?: string }> }[]) {
          if (!Array.isArray(s?.images)) continue;
          spacesGeneratedImageCount += s.images.filter((i) => i?.type === 'generated').length;
        }
      }
      fetch('http://127.0.0.1:7242/ingest/18b9349d-1699-4e68-9929-30c79f24c497', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Debug-Session-Id': '995889',
        },
        body: JSON.stringify({
          sessionId: '995889',
          hypothesisId: 'H2',
          location: 'gcp-data.ts:saveSessionToGcp:prePost',
          message: 'generation_counts_before_api',
          data: {
            userHashShort: shortHash(String(sessionData.userHash)),
            currentStep: sessionData?.currentStep ?? null,
            pathType: sessionData?.pathType ?? null,
            gc,
            rawGc: typeof rawGc === 'number' ? rawGc : null,
            matrixLen,
            genLen,
            imgLen,
            spacesGeneratedImageCount,
            matrixSourcesSample,
            remoteMergeUsed,
            mergedRowKeyCount: Object.keys(mergedRow).length,
            mergedRowKeysSample: Object.keys(mergedRow).sort().slice(0, 40),
            hasSessionImageRatings: mergedRow.session_image_ratings != null,
            hasBig5Responses: mergedRow.big5_responses != null,
          },
          timestamp: Date.now(),
          runId: 'gen-persist',
        }),
      }).catch(() => {});
    }
    // #endregion

    const payload = {
      participantRow: mergedRow,
    };

    let participantRowBytesApprox = 0;
    try {
      participantRowBytesApprox = JSON.stringify(payload.participantRow).length;
      if (participantRowBytesApprox > 1_500_000) {
        console.warn(
          '[GCP] participantRow JSON is very large; if saves fail, check Cloud Run / proxy body limits (bytes ≈',
          participantRowBytesApprox,
          ')',
        );
      }
      if (dbg && participantRowBytesApprox > 200_000) {
        console.log('[session-sync:debug] participantRow JSON size (bytes)', participantRowBytesApprox);
      }
    } catch {
      participantRowBytesApprox = -1;
    }

    let r = await gcpApi.participants.saveSession(sessionData.userHash, payload);
    // #region agent log (debug session 995889 — generation_count persist)
    {
      fetch('http://127.0.0.1:7242/ingest/18b9349d-1699-4e68-9929-30c79f24c497', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Debug-Session-Id': '995889',
        },
        body: JSON.stringify({
          sessionId: '995889',
          hypothesisId: 'H1',
          location: 'gcp-data.ts:saveSessionToGcp:afterFirstPost',
          message: 'save_session_response',
          data: {
            userHashShort: shortHash(String(sessionData.userHash)),
            ok: r.ok,
            errSlice: r.ok ? null : String(r.error ?? '').slice(0, 500),
            httpStatus: r.ok ? r.status ?? null : r.status ?? null,
            pgCode: !r.ok ? r.code ?? null : null,
            generationsCountSent: mergedRow.generations_count,
            participantRowBytesApprox,
            sessionPersistPartial: r.ok ? r.data?.sessionPersistPartial === true : null,
          },
          timestamp: Date.now(),
          runId: 'gen-persist',
        }),
      }).catch(() => {});
    }
    // #endregion
    if (!r.ok) {
      console.error('[GCP] session save failed:', r.error);
      if (dbg) {
        console.warn('[session-sync:debug] first POST failed, retry in 400ms', r.error);
      }
      await new Promise((res) => setTimeout(res, 400));
      r = await gcpApi.participants.saveSession(sessionData.userHash, payload);
    }
    // #region agent log (debug session 995889 — generation_count persist)
    {
      fetch('http://127.0.0.1:7242/ingest/18b9349d-1699-4e68-9929-30c79f24c497', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Debug-Session-Id': '995889',
        },
        body: JSON.stringify({
          sessionId: '995889',
          hypothesisId: 'H1',
          location: 'gcp-data.ts:saveSessionToGcp:final',
          message: 'save_session_final',
          data: {
            userHashShort: shortHash(String(sessionData.userHash)),
            ok: r.ok,
            errSlice: r.ok ? null : String(r.error ?? '').slice(0, 500),
            httpStatus: r.ok ? r.status ?? null : r.status ?? null,
            pgCode: !r.ok ? r.code ?? null : null,
            generationsCountSent: mergedRow.generations_count,
            participantRowBytesApprox,
            sessionPersistPartial: r.ok ? r.data?.sessionPersistPartial === true : null,
          },
          timestamp: Date.now(),
          runId: 'gen-persist',
        }),
      }).catch(() => {});
    }
    // #endregion
    if (!r.ok) {
      console.error('[GCP] session save failed after retry:', r.error);
      if (dbg) {
        console.warn('[session-sync:debug] save FAILED after retry', {
          userHash: shortHash(sessionData.userHash),
          error: r.error,
        });
      }
      void reportSessionPersistFailure(sessionData.userHash, {
        stage: 'saveSession_retry_exhausted',
        error: r.error,
      });
      if (pdb) {
        emitPersistenceSaveAudit855({
          outcome: 'failed',
          userHashShort: shortHashForLog(String(sessionData.userHash)),
          mergedAudit: pickMergedRowAuditFields(mergedRow),
          remoteMergeUsed,
          httpStatus: r.status ?? null,
          errSlice: String(r.error ?? '').slice(0, 400),
          sessionPersistPartial: r.data?.sessionPersistPartial === true,
        });
      }
      return false;
    }
    if (dbg) {
      console.log('[session-sync:debug] save OK', {
        userHash: shortHash(sessionData.userHash),
      });
    }
    if (pdb) {
      let readBackSummary: Record<string, unknown> | null = null;
      try {
        const fr = await gcpApi.participants.fetchSession(sessionData.userHash);
        const row = fr.data?.participant as Record<string, unknown> | undefined;
        readBackSummary = summarizeParticipantRowForPersistenceDebug(row);
        console.log('[persistence:debug] read-back after save (which DB fields are set)', {
          userHash: shortHashForLog(String(sessionData.userHash)),
          ...readBackSummary,
        });
      } catch (readErr) {
        console.warn('[persistence:debug] read-back after save failed', readErr);
        readBackSummary = { readBackFailed: true };
      }
      emitPersistenceSaveAudit855({
        outcome: 'ok',
        userHashShort: shortHashForLog(String(sessionData.userHash)),
        mergedAudit: pickMergedRowAuditFields(mergedRow),
        remoteMergeUsed,
        httpStatus: r.status ?? null,
        errSlice: null,
        sessionPersistPartial: r.data?.sessionPersistPartial === true,
        readBack: readBackSummary,
      });
    }
    return true;
  } catch (err) {
    console.error('saveSessionToGcp error:', err);
    if (sessionData?.userHash) {
      if (pdb) {
        emitPersistenceSaveAudit855({
          outcome: 'exception',
          userHashShort: shortHashForLog(String(sessionData.userHash)),
          exceptionMessage: err instanceof Error ? err.message : String(err),
        });
      }
      if (dbg) {
        console.warn('[session-sync:debug] save exception', {
          userHash: shortHash(sessionData.userHash),
          err,
        });
      }
      void reportSessionPersistFailure(sessionData.userHash, {
        stage: 'saveSession_exception',
        error: err,
      });
    }
    return false;
  }
};

// ---------------------------------------------------------------------------
// Participant id for logging (legacy name: was a Supabase project row)
// ---------------------------------------------------------------------------
export const getOrCreateProjectId = async (
  userHash: string | undefined,
): Promise<string | null> => {
  if (!userHash || String(userHash).trim() === '') return null;
  return String(userHash);
};

export const saveTinderSwipes = async (
  _projectId: string,
  _swipes: any[],
) => {};

export const saveDeviceContext = async (
  userHash: string,
  context: Record<string, unknown>,
): Promise<void> => {
  if (!userHash) return;
  await logBehavioralEvent(userHash, 'device_context', context);
};

function newPageViewId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

export const startPageView = async (
  userHash: string | undefined,
  page: string,
  meta?: Record<string, unknown>,
): Promise<string | null> => {
  if (!userHash || !gcpApi.isConfigured()) return null;
  const pageViewId = newPageViewId();
  await logBehavioralEvent(userHash, 'page_view_start', {
    pageViewId,
    page,
    ...(meta ?? {}),
  });
  return pageViewId;
};

export const endPageView = async (
  userHash: string | undefined,
  pageViewId: string | null | undefined,
): Promise<void> => {
  if (!userHash || !pageViewId) return;
  await logBehavioralEvent(userHash, 'page_view_end', { pageViewId });
};

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
  if (!participantExists) {
    // #region agent log
    ingestPersistenceTrace855({
      hypothesisId: 'H5',
      location: 'gcp-data.ts:saveParticipantSwipes',
      message: 'skip_ensure_failed',
      data: { userHashShort: shortHashForLog(userHash), swipeCount: swipes.length },
    });
    // #endregion
    return;
  }

  const r = await gcpApi.swipes.save(userHash, swipes);
  if (!r.ok) {
    // #region agent log
    ingestPersistenceTrace855({
      hypothesisId: 'H3',
      location: 'gcp-data.ts:saveParticipantSwipes',
      message: 'swipes_save_failed',
      data: {
        userHashShort: shortHashForLog(userHash),
        count: swipes.length,
        errSlice: String(r.error ?? '').slice(0, 400),
        status: r.status ?? null,
      },
    });
    // #endregion
  }
  if (isPersistenceDebugEnabled()) {
    console.log('[persistence:debug] swipes POST', {
      userHash: shortHashForLog(userHash),
      count: swipes.length,
      ok: r.ok,
    });
  }
  return r.ok;
};

/** Persists matrix steps to `participant_matrix_entries` (no base64; URLs only when not data:/blob:). */
export async function syncMatrixHistoryToGcp(
  userHash: string,
  matrixHistory:
    | Array<{
        id?: string;
        label?: string;
        timestamp?: number;
        imageUrl?: string;
        source?: string;
        isSelected?: boolean;
        base64?: string;
      }>
    | undefined,
): Promise<boolean> {
  if (!userHash || !gcpApi.isConfigured()) {
    // #region agent log
    ingestPersistenceTrace855({
      hypothesisId: !userHash ? 'H2' : 'H1',
      location: 'gcp-data.ts:syncMatrixHistoryToGcp',
      message: 'skip_no_user_or_gcp',
      data: {
        hasUserHash: !!userHash,
        gcpConfigured: gcpApi.isConfigured(),
        matrixLen: matrixHistory?.length ?? 0,
      },
    });
    // #endregion
    return false;
  }
  const ensured = await ensureParticipantExists(userHash);
  if (!ensured) {
    // #region agent log
    ingestPersistenceTrace855({
      hypothesisId: 'H5',
      location: 'gcp-data.ts:syncMatrixHistoryToGcp',
      message: 'skip_ensure_failed',
      data: { userHashShort: shortHashForLog(userHash), matrixLen: matrixHistory?.length ?? 0 },
    });
    // #endregion
    return false;
  }

  const entries = (matrixHistory || []).map((h, stepIndex) => {
    const url = h.imageUrl;
    const safeUrl =
      url && typeof url === 'string' && !url.startsWith('data:') && !url.startsWith('blob:')
        ? url
        : undefined;
    const extra: Record<string, unknown> = {};
    if (h.timestamp != null) extra.timestamp = h.timestamp;
    if (h.base64) extra.hasBase64 = true;
    return {
      stepIndex,
      clientId: h.id ?? null,
      label: h.label ?? null,
      source: h.source ?? null,
      isSelected: h.isSelected ?? null,
      imageUrl: safeUrl ?? null,
      extra: Object.keys(extra).length ? extra : undefined,
    };
  });
  const r = await gcpApi.participants.matrixSync(userHash, entries);
  if (!r.ok) {
    // #region agent log
    ingestPersistenceTrace855({
      hypothesisId: 'H3',
      location: 'gcp-data.ts:syncMatrixHistoryToGcp',
      message: 'matrix_sync_http_failed',
      data: {
        userHashShort: shortHashForLog(userHash),
        entryCount: entries.length,
        errSlice: String((r as { error?: unknown }).error ?? '').slice(0, 400),
        status: r.status ?? null,
      },
    });
    // #endregion
  }
  if (isPersistenceDebugEnabled()) {
    console.log('[persistence:debug] matrix sync POST', {
      userHash: shortHashForLog(userHash),
      entryCount: entries.length,
      ok: r.ok,
      httpStatus: r.status,
    });
  }
  // #region agent log (debug session 995889 — matrix → participant_matrix_entries)
  {
    fetch('http://127.0.0.1:7242/ingest/18b9349d-1699-4e68-9929-30c79f24c497', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Debug-Session-Id': '995889',
      },
      body: JSON.stringify({
        sessionId: '995889',
        hypothesisId: 'F3',
        location: 'gcp-data.ts:syncMatrixHistoryToGcp',
        message: 'matrix_sync_result',
        data: {
          userHashShort: shortHashForLog(userHash),
          entryCount: entries.length,
          ok: r.ok,
          httpStatus: r.status ?? null,
          errSlice: r.ok ? null : String((r as { error?: unknown }).error ?? '').slice(0, 400),
        },
        timestamp: Date.now(),
        runId: 'full-flow',
      }),
    }).catch(() => {});
  }
  // #endregion
  return r.ok;
}

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
  userHash: string,
  event: { local_image_id: string; rating_key: string; value: number },
): Promise<void> => {
  if (!userHash) return;
  await logBehavioralEvent(userHash, 'image_rating_detail', {
    local_image_id: event.local_image_id,
    rating_key: event.rating_key,
    value: event.value,
  });
};

export const logHealthCheck = async (
  userHash: string,
  ok: boolean,
  latency_ms: number,
): Promise<void> => {
  await logBehavioralEvent(userHash, 'health_check', { ok, latency_ms });
};

export const logErrorEvent = async (
  userHash: string,
  payload: {
    source: string;
    message: string;
    stack?: string;
    meta?: unknown;
  },
): Promise<void> => {
  await logBehavioralEvent(userHash, 'client_error', payload as Record<string, unknown>);
};

// ---------------------------------------------------------------------------
// Ensure participant exists
// ---------------------------------------------------------------------------
export const ensureParticipantExists = async (
  userHash: string,
): Promise<boolean> => {
  if (!userHash) {
    // #region agent log
    ingestPersistenceTrace855({
      hypothesisId: 'H2',
      location: 'gcp-data.ts:ensureParticipantExists',
      message: 'no_userHash',
      data: {},
    });
    // #endregion
    return false;
  }

  const r = await gcpApi.participants.ensure(userHash);
  if (!r.ok) {
    // #region agent log
    ingestPersistenceTrace855({
      hypothesisId: 'H5',
      location: 'gcp-data.ts:ensureParticipantExists',
      message: 'ensure_failed',
      data: {
        userHashShort: shortHashForLog(userHash),
        errSlice: String(r.error ?? '').slice(0, 400),
        status: r.status ?? null,
      },
    });
    // #endregion
  }
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
