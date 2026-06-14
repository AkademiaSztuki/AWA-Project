'use client';

import { useEffect, useState } from 'react';
import {
  isLiveSlowConnection,
  shouldPreferHardNavigation,
  syncSlowNetworkSession,
} from '@/lib/network/slow-connection';

/** Prefer full-page navigation on flaky / slow links (includes sticky session from prior chunk errors). */
export function usePreferHardNavigation(): boolean {
  const [preferHard, setPreferHard] = useState(false);

  useEffect(() => {
    syncSlowNetworkSession();
    setPreferHard(shouldPreferHardNavigation());

    const connection = (navigator as Navigator & {
      connection?: {
        addEventListener?: (type: string, listener: () => void) => void;
        removeEventListener?: (type: string, listener: () => void) => void;
      };
    }).connection;
    if (!connection?.addEventListener) return;

    const onChange = () => {
      syncSlowNetworkSession();
      setPreferHard(shouldPreferHardNavigation());
    };
    connection.addEventListener('change', onChange);
    return () => connection.removeEventListener?.('change', onChange);
  }, []);

  return preferHard;
}

/** Skip 3D / particles only on a live slow connection (2G/3G/save-data). */
export function useLiveSlowConnection(): boolean {
  const [liveSlow, setLiveSlow] = useState(false);

  useEffect(() => {
    setLiveSlow(isLiveSlowConnection());

    const connection = (navigator as Navigator & {
      connection?: {
        addEventListener?: (type: string, listener: () => void) => void;
        removeEventListener?: (type: string, listener: () => void) => void;
      };
    }).connection;
    if (!connection?.addEventListener) return;

    const onChange = () => setLiveSlow(isLiveSlowConnection());
    connection.addEventListener('change', onChange);
    return () => connection.removeEventListener?.('change', onChange);
  }, []);

  return liveSlow;
}

/** @deprecated Use usePreferHardNavigation or useLiveSlowConnection */
export function useSlowNetwork(): boolean {
  return usePreferHardNavigation();
}
