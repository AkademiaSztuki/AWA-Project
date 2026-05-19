import type { SessionData } from '@/types';

/** True after the user completed the research consent step (checkboxes + art. 13). */
export function hasResearchConsent(
  sessionData: Pick<SessionData, 'consentTimestamp'> | null | undefined,
): boolean {
  const ts = sessionData?.consentTimestamp;
  return typeof ts === 'string' && ts.trim().length > 0;
}
