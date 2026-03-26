/**
 * Session persist tracing: NDJSON ingest (local dev) + structured console (Cloud Run → Cloud Logging).
 * Session id fixed for grep / .cursor/debug-*.log correlation.
 */

export const SESSION_SYNC_DEBUG_ID = '995889';
const INGEST =
  'http://127.0.0.1:7242/ingest/18b9349d-1699-4e68-9929-30c79f24c497';

export function pgErrorSnapshot(err: unknown): Record<string, unknown> {
  const e = err as Record<string, unknown>;
  const str = (v: unknown, n: number) =>
    typeof v === 'string' ? v.slice(0, n) : v ?? null;
  return {
    code: e.code ?? null,
    severity: e.severity ?? null,
    message: str(e.message, 500),
    detail: str(e.detail, 600),
    hint: str(e.hint, 300),
    position: e.position ?? null,
    internalPosition: e.internalPosition ?? null,
    internalQuery: str(e.internalQuery, 200),
    where: str(e.where, 400),
    schema: e.schema ?? null,
    table: e.table ?? null,
    column: e.column ?? null,
    dataType: e.dataType ?? null,
    constraint: e.constraint ?? null,
    file: e.file ?? null,
    line: e.line ?? null,
    routine: e.routine ?? null,
  };
}

export function sessionSyncTrace(payload: {
  hypothesisId: string;
  location: string;
  message: string;
  data: Record<string, unknown>;
  runId?: string;
}): void {
  const line = {
    sessionId: SESSION_SYNC_DEBUG_ID,
    timestamp: Date.now(),
    runId: payload.runId ?? 'session-sync',
    hypothesisId: payload.hypothesisId,
    location: payload.location,
    message: payload.message,
    data: payload.data,
  };
  void fetch(INGEST, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Debug-Session-Id': SESSION_SYNC_DEBUG_ID,
    },
    body: JSON.stringify(line),
  }).catch(() => {});
  console.log('[SESSION_SYNC_TRACE]', JSON.stringify(line));
}

/** Per-JSONB column serialized size (bytes) for diagnosing 22P02 / payload shape — no string contents. */
export function jsonbKeyByteLengths(
  row: Record<string, unknown>,
  jsonbCols: Set<string>,
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const col of jsonbCols) {
    if (!(col in row) || row[col] === undefined) continue;
    try {
      out[col] = JSON.stringify(row[col]).length;
    } catch {
      out[col] = -1;
    }
  }
  return out;
}
