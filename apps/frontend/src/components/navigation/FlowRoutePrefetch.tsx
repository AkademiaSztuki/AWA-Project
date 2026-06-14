'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { usePreferHardNavigation } from '@/hooks/useSlowNetwork';
import {
  FLOW_ENTRY_PREFETCH_ROUTES,
  prefetchRoutes,
} from '@/lib/navigation/chunk-safe-navigation';

function scheduleIdleWork(work: () => void, timeoutMs: number) {
  if (typeof window.requestIdleCallback === 'function') {
    const idleId = window.requestIdleCallback(work, { timeout: timeoutMs });
    return () => window.cancelIdleCallback(idleId);
  }
  const timeoutId = window.setTimeout(work, Math.min(timeoutMs, 1200));
  return () => window.clearTimeout(timeoutId);
}

/** Prefetch flow entry chunks while the user reads the marketing hero. */
export function FlowRoutePrefetch() {
  const router = useRouter();
  const preferHardNavigation = usePreferHardNavigation();

  useEffect(() => {
    if (preferHardNavigation) return;
    void router.prefetch(FLOW_ENTRY_PREFETCH_ROUTES[0]);
    return scheduleIdleWork(
      () => prefetchRoutes(router, FLOW_ENTRY_PREFETCH_ROUTES.slice(1)),
      2000
    );
  }, [router, preferHardNavigation]);

  return null;
}
