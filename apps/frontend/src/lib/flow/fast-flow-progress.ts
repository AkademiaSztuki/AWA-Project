/**
 * Fast-track journey progress (4 steps), parallel to full-flow-progress.
 */

import type { Language } from '@/lib/questions/validated-scales';
import { isFullFlowJourneyPath } from '@/lib/flow/full-flow-progress';

export const FAST_FLOW_STEP_COUNT = 4;

export const FAST_FLOW_MAX_JOURNEY_INDEX_STORAGE_KEY = 'awa-fast-flow-max-journey-index';

const FAST_ONLY_PREFIXES: readonly string[] = [
  '/flow/fast-track',
  '/flow/style-selection',
  '/flow/fast-generate',
];

export type FastFlowUserStep = {
  id: string;
  groupId: 'intro' | 'space' | 'taste' | 'gen';
  title: { pl: string; en: string };
  description: { pl: string; en: string };
};

export const FAST_FLOW_USER_STEPS: readonly FastFlowUserStep[] = [
  {
    id: 'fast_onboarding',
    groupId: 'intro',
    title: { pl: 'Start', en: 'Getting started' },
    description: {
      pl: 'Zgody i kilka informacji o Tobie — zanim przejdziemy do zdjęcia.',
      en: 'Consent and a few basics before we move to your photo.',
    },
  },
  {
    id: 'fast_space_photo',
    groupId: 'space',
    title: { pl: 'Twoja przestrzeń', en: 'Your space' },
    description: {
      pl: 'Zdjęcie miejsca, które chcesz odmienić.',
      en: 'A photo of the space you want to transform.',
    },
  },
  {
    id: 'fast_style',
    groupId: 'taste',
    title: { pl: 'Styl', en: 'Style' },
    description: {
      pl: 'Wybierz kierunek wizualny dla propozycji.',
      en: 'Pick a visual direction for your proposal.',
    },
  },
  {
    id: 'fast_generate',
    groupId: 'gen',
    title: { pl: 'Generacja', en: 'Generation' },
    description: {
      pl: 'Tworzymy obraz i możesz go ocenić.',
      en: 'We generate an image and you can rate it.',
    },
  },
] as const;

const GROUP_LABELS: Record<FastFlowUserStep['groupId'], { pl: string; en: string }> = {
  intro: { pl: 'Rozpoczęcie', en: 'Getting started' },
  space: { pl: 'Twoja przestrzeń', en: 'Your space' },
  taste: { pl: 'Twój styl', en: 'Your style' },
  gen: { pl: 'Generowanie', en: 'Generation' },
};

export function getFastFlowGroupLabel(groupId: FastFlowUserStep['groupId'], language: Language): string {
  return GROUP_LABELS[groupId][language];
}

/** True for fast-track URLs that never belong to the full 12-step journey. */
export function isFastOnlyFlowPath(pathname: string): boolean {
  return FAST_ONLY_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/**
 * Show the fast progress bar on this pathname when pathType is known for onboarding.
 */
export function shouldShowFastProgressBar(
  pathname: string,
  pathType: 'fast' | 'full' | undefined,
): boolean {
  if (isFastOnlyFlowPath(pathname)) return true;
  if (pathname === '/flow/onboarding' && pathType === 'fast') return true;
  return false;
}

export type FlowJourneyMode = 'full' | 'fast' | null;

export function resolveFlowJourneyMode(
  pathname: string,
  pathType: 'fast' | 'full' | undefined,
): FlowJourneyMode {
  if (shouldShowFastProgressBar(pathname, pathType)) return 'fast';
  if (isFullFlowJourneyPath(pathname)) return 'full';
  return null;
}

function resolveFastIndexFromPathname(pathname: string): number {
  if (pathname === '/flow/onboarding') return 0;
  if (pathname === '/flow/fast-track' || pathname.startsWith('/flow/fast-track/')) return 1;
  if (pathname === '/flow/style-selection' || pathname.startsWith('/flow/style-selection/')) return 2;
  if (pathname === '/flow/fast-generate' || pathname.startsWith('/flow/fast-generate/')) return 3;
  return 0;
}

export function getFastFlowProgressIndex(pathname: string): number {
  if (!isFastOnlyFlowPath(pathname) && pathname !== '/flow/onboarding') return 0;
  return resolveFastIndexFromPathname(pathname);
}

/** Linear 0–100% across the four steps (last step reaches 100%). */
export function getFastFlowProgressPercent(pathname: string): number {
  const idx = getFastFlowProgressIndex(pathname);
  const n = FAST_FLOW_STEP_COUNT;
  if (n <= 1) return 100;
  return (idx / (n - 1)) * 100;
}

export function getActiveFastFlowStep(pathname: string): FastFlowUserStep {
  const idx = Math.max(0, Math.min(FAST_FLOW_USER_STEPS.length - 1, getFastFlowProgressIndex(pathname)));
  return FAST_FLOW_USER_STEPS[idx];
}

export function getFastCompletedStepHref(index: number): string {
  switch (index) {
    case 0:
      return '/flow/onboarding';
    case 1:
      return '/flow/fast-track';
    case 2:
      return '/flow/style-selection';
    case 3:
      return '/flow/fast-generate';
    default:
      return '/flow/onboarding';
  }
}

export function journeyPercentForFastStepIndex(index: number): number {
  if (FAST_FLOW_STEP_COUNT <= 1) return 100;
  return (index / (FAST_FLOW_STEP_COUNT - 1)) * 100;
}
