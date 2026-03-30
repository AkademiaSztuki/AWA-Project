/**
 * Client-side persistence verification. No PII / no answer contents in summaries.
 *
 * Enable (restart dev server after changing `.env.local`):
 * - `NEXT_PUBLIC_DEBUG_PERSISTENCE=1` — console + read-back after save + **NDJSON audit** (session `855d7b`)
 * - `NEXT_PUBLIC_DEBUG_SESSION_SYNC=1` — same audit gate + verbose `[session-sync:debug]` console
 *
 * When Cursor debug ingest runs on `127.0.0.1:7242`, events land in workspace `debug-855d7b.log`.
 * Grep that file for `persist-audit` (outcome + skipReason + merged column snapshot + read-back flags).
 *
 * Older traces (`hypothesisId` H1/H2/H3…) still fire on some skip/API paths without requiring the flags above.
 */

import type { SessionData } from '@/types';

export const isPersistenceDebugEnabled = (): boolean =>
  typeof process !== 'undefined' &&
  (process.env.NEXT_PUBLIC_DEBUG_PERSISTENCE === '1' ||
    process.env.NEXT_PUBLIC_DEBUG_SESSION_SYNC === '1');

export function shortHashForLog(h: string): string {
  if (!h) return '';
  return h.length > 14 ? `${h.slice(0, 10)}…${h.slice(-4)}` : h;
}

const PERSIST_TRACE_INGEST =
  'http://127.0.0.1:7242/ingest/18b9349d-1699-4e68-9929-30c79f24c497';
const PERSIST_TRACE_SESSION = '855d7b';

/** NDJSON ingest for debug session 855d7b — why persistence skipped or failed (no secrets / no PII). */
export function ingestPersistenceTrace855(payload: {
  hypothesisId: string;
  location: string;
  message: string;
  data?: Record<string, unknown>;
  runId?: string;
}): void {
  try {
    void fetch(PERSIST_TRACE_INGEST, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Debug-Session-Id': PERSIST_TRACE_SESSION,
      },
      body: JSON.stringify({
        sessionId: PERSIST_TRACE_SESSION,
        hypothesisId: payload.hypothesisId,
        location: payload.location,
        message: payload.message,
        data: payload.data ?? {},
        timestamp: Date.now(),
        runId: payload.runId ?? 'persist-trace',
      }),
    }).catch(() => {});
  } catch {
    // ignore
  }
}

/** Counts / flags only — safe for logs. */
export function summarizeSessionForPersistenceDebug(sessionData: SessionData): Record<string, unknown> {
  return {
    currentStep: sessionData.currentStep,
    pathType: sessionData.pathType,
    generationsLen: Array.isArray(sessionData.generations) ? sessionData.generations.length : 0,
    matrixHistoryLen: Array.isArray(sessionData.matrixHistory) ? sessionData.matrixHistory.length : 0,
    hasBigFive: !!sessionData.bigFive,
    tinderSwipesCount:
      sessionData.tinderData?.swipes?.length ??
      sessionData.tinderResults?.length ??
      0,
    inspirationsCount: sessionData.inspirations?.length ?? 0,
    hasSurveyData: !!sessionData.surveyData && Object.keys(sessionData.surveyData).length > 0,
    hasFinalSurvey: !!sessionData.finalSurvey,
    hasRoomActivityContext: !!sessionData.roomActivityContext,
    roomPreferenceSource: sessionData.roomPreferenceSource ?? null,
    hasLadderPromptElements: !!sessionData.ladderResults?.promptElements,
    roomPhotoImageId: sessionData.roomPhotoImageId ? 'set' : null,
    roomAnalysisComments: !!(
      sessionData.roomAnalysis?.comment || sessionData.roomAnalysis?.human_comment
    ),
    imageRatingsKeyCount:
      sessionData.imageRatings && typeof sessionData.imageRatings === 'object'
        ? Object.keys(sessionData.imageRatings).length
        : 0,
    sessionJsonBytesApprox: (() => {
      try {
        return JSON.stringify(sessionData).length;
      } catch {
        return -1;
      }
    })(),
  };
}

const RESEARCH_COLUMN_MARKERS = [
  'room_preference_source',
  'room_activity_context',
  'final_survey',
  'ladder_prompt_elements',
  'ladder_completed_at',
  'room_analysis_comment',
  'room_analysis_human_comment',
  'room_photo_image_id',
  'session_image_ratings',
] as const;

/** After GET /api/session — which research columns are non-null in DB (names only). */
export function summarizeParticipantRowForPersistenceDebug(
  participant: Record<string, unknown> | null | undefined,
): Record<string, unknown> {
  if (!participant || typeof participant !== 'object') {
    return { participantLoaded: false };
  }
  const researchFieldsPresent: Record<string, boolean> = {};
  for (const k of RESEARCH_COLUMN_MARKERS) {
    const v = participant[k];
    researchFieldsPresent[k] =
      v != null && v !== '' && !(typeof v === 'object' && v !== null && Object.keys(v).length === 0);
  }
  return {
    participantLoaded: true,
    participantColumnCount: Object.keys(participant).length,
    researchFieldsPresent,
    generations_count: participant.generations_count,
    current_step: participant.current_step,
    path_type: participant.path_type,
  };
}

/** Subset of merged `participantRow` for audit logs (numeric / enum-ish only). */
export function pickMergedRowAuditFields(row: Record<string, unknown>): Record<string, unknown> {
  const keys = [
    'generations_count',
    'tinder_total_swipes',
    'tinder_likes',
    'tinder_dislikes',
    'inspirations_count',
    'sus_score',
    'clarity_score',
    'agency_score',
    'satisfaction_score',
    'path_type',
    'current_step',
    'core_profile_complete',
    'auth_user_id',
  ] as const;
  const out: Record<string, unknown> = {};
  if ('email' in row) {
    const e = row.email;
    out.email_present = typeof e === 'string' && e.trim().length > 0;
  }
  for (const k of keys) {
    if (!(k in row)) continue;
    const v = row[k];
    if (k === 'auth_user_id' && typeof v === 'string') {
      out[k] = v.length > 8 ? `${v.slice(0, 4)}…${v.slice(-4)}` : 'set';
      continue;
    }
    out[k] = v;
  }
  return out;
}

/**
 * Single-line audit for `saveSessionToGcp` outcome — enable with DEBUG_PERSISTENCE / DEBUG_SESSION_SYNC.
 * `message` = outcome; `data.skipReason` when skipped; `data.mergedAudit` / `data.readBack` when present.
 */
export function emitPersistenceSaveAudit855(payload: {
  outcome: 'ok' | 'failed' | 'skipped' | 'exception';
  skipReason?: string;
  userHashShort: string;
  mergedAudit?: Record<string, unknown>;
  remoteMergeUsed?: boolean;
  httpStatus?: number | null;
  errSlice?: string | null;
  sessionPersistPartial?: boolean | null;
  readBack?: Record<string, unknown> | null;
  exceptionMessage?: string | null;
}): void {
  if (!isPersistenceDebugEnabled()) return;
  ingestPersistenceTrace855({
    hypothesisId: 'persist-audit',
    location: 'persistence-debug:emitPersistenceSaveAudit855',
    message: payload.outcome,
    data: {
      userHashShort: payload.userHashShort,
      skipReason: payload.skipReason ?? null,
      mergedAudit: payload.mergedAudit ?? null,
      remoteMergeUsed: payload.remoteMergeUsed ?? null,
      httpStatus: payload.httpStatus ?? null,
      errSlice: payload.errSlice ? String(payload.errSlice).slice(0, 400) : null,
      sessionPersistPartial: payload.sessionPersistPartial ?? null,
      readBack: payload.readBack ?? null,
      exceptionMessage: payload.exceptionMessage
        ? String(payload.exceptionMessage).slice(0, 400)
        : null,
    },
    runId: 'persist-audit-v1',
  });
}
