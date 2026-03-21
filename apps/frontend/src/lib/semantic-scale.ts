/**
 * Semantic differential (warmth / brightness / complexity / texture) is stored in DB as 0–1.
 * Legacy UI sometimes used 0–100; normalize on read/write boundaries.
 */
export function normalizeSemanticTo01(
  value: number | null | undefined,
): number | undefined {
  if (value === null || value === undefined) return undefined;
  if (typeof value !== 'number' || Number.isNaN(value)) return undefined;
  if (value > 1) return Math.min(1, Math.max(0, value / 100));
  return Math.min(1, Math.max(0, value));
}
