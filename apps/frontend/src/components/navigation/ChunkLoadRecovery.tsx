'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import {
  clearClientNavigationFallback,
  consumeClientNavigationFallback,
  hardNavigate,
  isChunkLoadError,
  peekClientNavigationFallback,
} from '@/lib/navigation/chunk-safe-navigation';
import { markSlowNetworkSession } from '@/lib/network/slow-connection';

/**
 * Recovers from webpack chunk load failures (common on 3G) by retrying via full document navigation.
 */
export function ChunkLoadRecovery() {
  const pathname = usePathname();

  useEffect(() => {
    clearClientNavigationFallback();
  }, [pathname]);

  useEffect(() => {
    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      if (!isChunkLoadError(event.reason)) return;
      const href = peekClientNavigationFallback() ?? window.location.href;
      event.preventDefault();
      markSlowNetworkSession();
      consumeClientNavigationFallback();
      hardNavigate(href);
    };

    window.addEventListener('unhandledrejection', onUnhandledRejection);
    return () => window.removeEventListener('unhandledrejection', onUnhandledRejection);
  }, []);

  return null;
}
