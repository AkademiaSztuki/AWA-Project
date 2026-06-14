const SLOW_SESSION_KEY = 'ida-slow-network';

type NetworkInformationLike = {
  effectiveType?: string;
  saveData?: boolean;
  downlink?: number;
};

export function getNetworkInformation(): NetworkInformationLike | undefined {
  if (typeof navigator === 'undefined') return undefined;
  return (navigator as Navigator & { connection?: NetworkInformationLike }).connection;
}

/** Live connection only — used to skip 3D / particles (not sticky session flags). */
export function isLiveSlowConnection(): boolean {
  const connection = getNetworkInformation();
  if (!connection) return false;
  if (connection.saveData) return true;

  const type = connection.effectiveType ?? '';
  return type === 'slow-2g' || type === '2g' || type === '3g';
}

export function markSlowNetworkSession() {
  try {
    sessionStorage.setItem(SLOW_SESSION_KEY, '1');
  } catch {
    // ignore
  }
}

export function clearSlowNetworkSession() {
  try {
    sessionStorage.removeItem(SLOW_SESSION_KEY);
  } catch {
    // ignore
  }
}

export function readSlowNetworkSession(): boolean {
  try {
    return sessionStorage.getItem(SLOW_SESSION_KEY) === '1';
  } catch {
    return false;
  }
}

/** Hard navigation fallback — sticky session OR live slow link. */
export function shouldPreferHardNavigation(): boolean {
  if (readSlowNetworkSession()) return true;
  return isLiveSlowConnection();
}

/** @deprecated Use isLiveSlowConnection or shouldPreferHardNavigation */
export function isSlowNetworkConnection(): boolean {
  return shouldPreferHardNavigation();
}

export function syncSlowNetworkSession(): boolean {
  if (isLiveSlowConnection()) {
    markSlowNetworkSession();
    return true;
  }
  clearSlowNetworkSession();
  return false;
}
