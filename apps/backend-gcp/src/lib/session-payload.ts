import { PREFERENCE_SNAPSHOT_MILESTONES, type PreferenceSnapshotMilestone } from '../services/preference-snapshot';

const USER_HASH_RE = /^[a-zA-Z0-9_-]{8,128}$/;
const MAX_PARTICIPANT_ROW_KEYS = 256;
const MAX_ROW_JSON_BYTES = 8 * 1024 * 1024;

export type { PreferenceSnapshotMilestone };

function parsePreferenceSnapshotMilestone(
  value: unknown,
): PreferenceSnapshotMilestone | undefined {
  if (typeof value !== 'string') return undefined;
  return PREFERENCE_SNAPSHOT_MILESTONES.includes(value as PreferenceSnapshotMilestone)
    ? (value as PreferenceSnapshotMilestone)
    : undefined;
}

export function isValidUserHash(value: unknown): value is string {
  return typeof value === 'string' && USER_HASH_RE.test(value);
}

export function validateSessionPostBody(body: unknown):
  | {
      ok: true;
      userHash: string;
      participantRow: Record<string, unknown>;
      preferenceSnapshotMilestone?: PreferenceSnapshotMilestone;
    }
  | { ok: false; error: string } {
  if (!body || typeof body !== 'object') {
    return { ok: false, error: 'invalid_body' };
  }
  const sessionData = body as Record<string, unknown>;
  const userHash = sessionData.userHash;
  if (!isValidUserHash(userHash)) {
    return { ok: false, error: 'invalid_userHash' };
  }

  const participantRow = sessionData.participantRow;
  if (!participantRow || typeof participantRow !== 'object' || Array.isArray(participantRow)) {
    return { ok: false, error: 'participantRow is required' };
  }

  const row = participantRow as Record<string, unknown>;
  const keys = Object.keys(row);
  if (keys.length > MAX_PARTICIPANT_ROW_KEYS) {
    return { ok: false, error: 'participantRow_too_large' };
  }
  if ('password_hash' in row) {
    return { ok: false, error: 'forbidden_field' };
  }
  const rowUserHash = row.user_hash;
  if (
    rowUserHash != null &&
    typeof rowUserHash === 'string' &&
    rowUserHash !== userHash
  ) {
    return { ok: false, error: 'user_hash_mismatch' };
  }

  try {
    if (JSON.stringify(row).length > MAX_ROW_JSON_BYTES) {
      return { ok: false, error: 'participantRow_payload_too_large' };
    }
  } catch {
    return { ok: false, error: 'participantRow_not_serializable' };
  }

  const preferenceSnapshotMilestone = parsePreferenceSnapshotMilestone(
    sessionData.preferenceSnapshotMilestone,
  );

  return { ok: true, userHash, participantRow: row, preferenceSnapshotMilestone };
}
