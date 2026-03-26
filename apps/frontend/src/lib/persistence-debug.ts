/**
 * Client-side persistence verification (browser console only). No PII / no answer contents.
 * Enable: NEXT_PUBLIC_DEBUG_PERSISTENCE=1 (or NEXT_PUBLIC_DEBUG_SESSION_SYNC=1).
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
