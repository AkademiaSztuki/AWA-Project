type Entry = { count: number; resetAt: number };

const store = new Map<string, Entry>();

const MAX_STORE = 5000;

function pruneIfNeeded(): void {
  if (store.size <= MAX_STORE) return;
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    if (entry.resetAt <= now) store.delete(key);
  }
}

export function checkRequestRateLimit(
  key: string,
  max: number,
  windowMs: number,
): { ok: boolean; retryAfterSec: number } {
  const now = Date.now();
  const entry = store.get(key);
  if (!entry || entry.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    pruneIfNeeded();
    return { ok: true, retryAfterSec: 0 };
  }
  if (entry.count >= max) {
    return {
      ok: false,
      retryAfterSec: Math.max(1, Math.ceil((entry.resetAt - now) / 1000)),
    };
  }
  entry.count += 1;
  return { ok: true, retryAfterSec: 0 };
}
