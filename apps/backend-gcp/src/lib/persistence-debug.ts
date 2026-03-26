/**
 * Opt-in persistence verification logs (Cloud Logging).
 * Enable with DEBUG_PERSISTENCE=1 or DEBUG_SESSION_SYNC=1 on Cloud Run.
 */

export function isPersistenceDebug(): boolean {
  return (
    process.env.DEBUG_PERSISTENCE === '1' || process.env.DEBUG_SESSION_SYNC === '1'
  );
}

export function shortUserHashForLog(userHash: string): string {
  if (!userHash) return '';
  return userHash.length > 14 ? `${userHash.slice(0, 10)}…${userHash.slice(-4)}` : userHash;
}
