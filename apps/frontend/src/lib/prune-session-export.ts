/**
 * Session export can include multi‑MB base64 (matrix, room photos). Sending that as JSON
 * breaks browser fetch / gateways. For DB persistence we keep structure + metadata, drop blobs.
 */
const LARGE_STRING_THRESHOLD = 24 * 1024;

export function pruneLargeStringsForSessionExport(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value === 'string') {
    if (value.length <= LARGE_STRING_THRESHOLD) return value;
    return {
      _pruned: true,
      reason: 'large_string',
      approxChars: value.length,
    };
  }
  if (Array.isArray(value)) {
    return value.map((item) => pruneLargeStringsForSessionExport(item));
  }
  if (typeof value === 'object') {
    const o = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(o)) {
      out[k] = pruneLargeStringsForSessionExport(v);
    }
    return out;
  }
  return value;
}
