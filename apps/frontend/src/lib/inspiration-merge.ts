/**
 * Inspiration list merge / dedupe for session + dashboard.
 * PostgreSQL + GCP store https URLs; local session may still hold data URLs after upload —
 * merge keys must align or we dedupe paired stale rows.
 */

const makeImageSig = (img?: string | null): string => {
  if (!img) return 'none';
  const len = img.length;
  const head = img.slice(0, 64);
  const tail = len > 64 ? img.slice(-64) : '';
  return `${len}:${head}:${tail}`;
};

export function inspirationMergeKey(item: {
  url?: string;
  imageBase64?: string;
  previewUrl?: string;
  id?: string;
}): string {
  const u = item?.url || item?.imageBase64 || item?.previewUrl;
  if (typeof u === 'string' && u.length > 0) {
    if (u.startsWith('http://') || u.startsWith('https://')) {
      try {
        const p = new URL(u);
        return `h:${p.origin}${p.pathname}`;
      } catch {
        return `u:${u.slice(0, 2048)}`;
      }
    }
    if (u.startsWith('data:') || u.startsWith('blob:')) {
      return `d:${makeImageSig(u)}`;
    }
    return `u:${u.slice(0, 2048)}`;
  }
  if (item?.id != null && String(item.id).length > 0) return `id:${String(item.id)}`;
  return '';
}

const MAX_SESSION_INSPIRATIONS = 10;

/** Union remote + local by URL/id, newest wins, cap at MAX_SESSION_INSPIRATIONS. */
export function mergeInspirationLists(a: unknown[], b: unknown[]): any[] {
  const map = new Map<string, any>();
  const put = (item: any) => {
    const k = inspirationMergeKey(item);
    if (!k) return;
    const prev = map.get(k);
    const tNew = new Date(item.addedAt || item.createdAt || 0).getTime();
    const tOld = prev ? new Date(prev.addedAt || prev.createdAt || 0).getTime() : 0;
    if (!prev || tNew >= tOld) {
      map.set(k, { ...prev, ...item });
    }
  };
  for (const x of a) put(x);
  for (const x of b) put(x);

  // Do not strip data-URL-only rows here: 1×https + 1×new data URL are two different images;
  // a previous heuristic removed the new upload as "duplicate". Duplicates of the *same*
  // upload (https + stale data URL) are reduced by canonical keys + post-save refresh in flow.

  return Array.from(map.values())
    .sort(
      (x, y) =>
        new Date(y.addedAt || y.createdAt || 0).getTime() -
        new Date(x.addedAt || x.createdAt || 0).getTime(),
    )
    .slice(0, MAX_SESSION_INSPIRATIONS);
}
