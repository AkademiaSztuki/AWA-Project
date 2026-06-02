import type { SessionData } from '@/types';
import { getSessionStoreSnapshot } from '@/hooks/useSession';
import { saveSessionToGcp } from '@/lib/gcp-data';
import { isParticipantSpaceUuid } from '@/lib/remote-spaces';

type SpaceLike = { id: string; isDefault?: boolean };

/**
 * Pick active space only when it exists in the synced spaces list (matches
 * `resolveCurrentSpaceIdForParticipant` on the API).
 */
export function resolveActiveSpaceId(
  spaces: SpaceLike[],
  preferredId?: string | null,
  recentImageSpaceIds?: Array<string | null | undefined>,
): string | undefined {
  if (!spaces.length) return undefined;

  const known = new Set(spaces.map((s) => s.id));
  const pick = (id?: string | null): string | undefined => {
    if (!id || !isParticipantSpaceUuid(id) || !known.has(id)) return undefined;
    return id;
  };

  const fromPreferred = pick(preferredId);
  if (fromPreferred) return fromPreferred;

  for (const sid of recentImageSpaceIds ?? []) {
    const fromImage = pick(sid);
    if (fromImage) return fromImage;
  }

  const defaultSpace = spaces.find((s) => s.isDefault);
  return defaultSpace?.id ?? spaces[0]?.id;
}

export function inferRecentSpaceIdFromImages(
  spaces: SpaceLike[],
  images: Array<{ spaceId?: string | null; createdAt?: string }>,
): string | undefined {
  if (!images.length || !spaces.length) return undefined;
  const known = new Set(spaces.map((s) => s.id));
  const sorted = [...images].sort(
    (a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime(),
  );
  for (const img of sorted) {
    const sid = img.spaceId;
    if (sid && known.has(sid)) return sid;
  }
  return undefined;
}

/**
 * Merge session patch, resolve currentSpaceId against spaces, POST /session.
 * Use when spaces list is known (after fetch or create) so current_space_id is not dropped.
 */
export async function saveSessionWithActiveSpace(
  patch: Partial<SessionData> = {},
  options?: Parameters<typeof saveSessionToGcp>[1],
): Promise<boolean> {
  const base = getSessionStoreSnapshot();
  const spaces = (patch.spaces ?? base.spaces ?? []) as SpaceLike[];
  if (!spaces.length) {
    return saveSessionToGcp({ ...base, ...patch } as Record<string, unknown>, options);
  }

  const currentSpaceId = resolveActiveSpaceId(
    spaces,
    patch.currentSpaceId ?? base.currentSpaceId,
  );

  const snapshot: SessionData = {
    ...base,
    ...patch,
    spaces: patch.spaces ?? base.spaces,
    currentSpaceId,
  };

  return saveSessionToGcp(snapshot as unknown as Record<string, unknown>, options);
}
