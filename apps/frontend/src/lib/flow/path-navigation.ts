import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import type { SessionData } from '@/types';
import { safeSessionStorage } from '@/lib/gcp-data';
import { navigateWithChunkFallback } from '@/lib/navigation/chunk-safe-navigation';

export const FLOW_PATH_HREFS = {
  fast: '/flow/onboarding',
  full: '/setup/profile',
} as const;

/**
 * Persist path choice and navigate immediately — does not wait for dialogue/audio.
 * `aura_auth_path_type` in sessionStorage is the fallback on the destination page.
 */
export function navigateToFlowPath(
  router: AppRouterInstance,
  pathType: 'fast' | 'full',
  updateSessionData: (updates: Partial<SessionData>) => void,
) {
  safeSessionStorage.setItem('aura_auth_path_type', pathType);
  updateSessionData(
    pathType === 'fast'
      ? { pathType: 'fast', currentStep: 'onboarding' }
      : { pathType: 'full' },
  );
  navigateWithChunkFallback(router, FLOW_PATH_HREFS[pathType]);
}
