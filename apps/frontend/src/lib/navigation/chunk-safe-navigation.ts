import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import {
  markSlowNetworkSession,
  shouldPreferHardNavigation,
} from '@/lib/network/slow-connection';

const CHUNK_ERROR_MARKERS = [
  'ChunkLoadError',
  'Loading chunk',
  'Failed to fetch dynamically imported module',
  'Importing a module script failed',
] as const;

const NAV_FALLBACK_STORAGE_KEY = 'ida-nav-fallback-href';

export function isChunkLoadError(error: unknown): boolean {
  if (!error) return false;
  const message =
    error instanceof Error
      ? `${error.name} ${error.message}`
      : typeof error === 'string'
        ? error
        : '';
  return CHUNK_ERROR_MARKERS.some((marker) => message.includes(marker));
}

export function shouldUseHardNavigation(): boolean {
  return shouldPreferHardNavigation();
}

export function prepareClientNavigationFallback(href: string) {
  try {
    sessionStorage.setItem(NAV_FALLBACK_STORAGE_KEY, href);
  } catch {
    // sessionStorage may be unavailable in private mode
  }
}

export function peekClientNavigationFallback(): string | null {
  try {
    return sessionStorage.getItem(NAV_FALLBACK_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function clearClientNavigationFallback() {
  try {
    sessionStorage.removeItem(NAV_FALLBACK_STORAGE_KEY);
  } catch {
    // ignore
  }
}

export function consumeClientNavigationFallback(): string | null {
  const href = peekClientNavigationFallback();
  clearClientNavigationFallback();
  return href;
}

export function hardNavigate(href: string, replace = false) {
  if (replace) {
    window.location.replace(href);
    return;
  }
  window.location.assign(href);
}

/** Client transition with full-page fallback for slow / flaky networks (3G, chunk timeouts). */
export function navigateWithChunkFallback(
  router: AppRouterInstance,
  href: string,
  options?: { replace?: boolean }
) {
  prepareClientNavigationFallback(href);

  if (shouldUseHardNavigation()) {
    markSlowNetworkSession();
    hardNavigate(href, options?.replace);
    return;
  }

  if (options?.replace) {
    router.replace(href);
    return;
  }
  router.push(href);
}

export const FLOW_ENTRY_PREFETCH_ROUTES = [
  '/flow/path-selection',
  '/flow/onboarding',
  '/setup/profile',
] as const;

export function prefetchRoutes(router: AppRouterInstance, routes: readonly string[]) {
  for (const route of routes) {
    void router.prefetch(route);
  }
}
