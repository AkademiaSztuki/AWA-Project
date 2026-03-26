/**
 * Semantic differential (warmth / brightness / complexity / texture) is stored in DB as 0–1.
 * Legacy UI sometimes used 0–100; normalize on read/write boundaries.
 * PostgreSQL `NUMERIC` often arrives as string via node-pg — coerce before checks.
 */
export function normalizeSemanticTo01(
  value: number | string | null | undefined,
): number | undefined {
  if (value === null || value === undefined) return undefined;
  let n: number;
  if (typeof value === 'number') {
    if (Number.isNaN(value)) return undefined;
    n = value;
  } else if (typeof value === 'string') {
    const t = value.trim();
    if (t === '') return undefined;
    n = Number(t);
    if (Number.isNaN(n)) return undefined;
  } else {
    return undefined;
  }
  if (n > 1) return Math.min(1, Math.max(0, n / 100));
  return Math.min(1, Math.max(0, n));
}
