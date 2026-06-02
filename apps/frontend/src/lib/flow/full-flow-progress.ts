/**
 * Full product journey progress (friendly labels, no "research" framing in the bar).
 * Linear indices 0..11 map to the 12 user-facing steps.
 */

import type { Language } from '@/lib/questions/validated-scales';
import type { SessionData } from '@/types';

export const FULL_FLOW_STEP_COUNT = 12;

/** Highest journey index (0..11) reached this browser session — survives revisiting earlier steps. */
export const FULL_FLOW_MAX_JOURNEY_INDEX_STORAGE_KEY = 'awa-full-flow-max-journey-index';

export type CoreProfileWizardStepId =
  | 'consent'
  | 'demographics'
  | 'lifestyle'
  | 'tinder_swipes'
  | 'semantic_diff'
  | 'sensory_tests';

export type RoomSetupStepId =
  | 'photo_upload'
  | 'preference_source'
  | 'preference_questions'
  | 'prs_current'
  | 'usage_context'
  | 'activities'
  | 'pain_points'
  | 'social_dynamics'
  | 'prs_target'
  | 'summary';

export type FullFlowUserStep = {
  id: string;
  groupId: 'intro' | 'taste' | 'space' | 'gen' | 'outro';
  title: { pl: string; en: string };
  description: { pl: string; en: string };
};

export const FULL_FLOW_USER_STEPS: readonly FullFlowUserStep[] = [
  {
    id: 'lets_meet',
    groupId: 'intro',
    title: { pl: 'Poznajmy się', en: "Let's get started" },
    description: {
      pl: 'Zaczynamy spokojnie: zgody i pierwszy kontekst.',
      en: 'A calm start: consent and first context.',
    },
  },
  {
    id: 'about_you',
    groupId: 'intro',
    title: { pl: 'O Tobie', en: 'About you' },
    description: {
      pl: 'Kilka detali, żeby projekt pasował do Twojego rytmu.',
      en: 'A few details so the design fits your rhythm.',
    },
  },
  {
    id: 'tinder',
    groupId: 'taste',
    title: { pl: 'Wnętrzarski Tinder', en: 'Interior Tinder' },
    description: {
      pl: 'Szybkie wybory, które zdradzają Twój kierunek.',
      en: 'Quick choices that reveal your direction.',
    },
  },
  {
    id: 'mood',
    groupId: 'taste',
    title: { pl: 'Klimat wnętrza', en: 'Interior mood' },
    description: {
      pl: 'Ustalamy nastrój: ciepło, światło i energię.',
      en: 'We tune the mood: warmth, light, and energy.',
    },
  },
  {
    id: 'senses',
    groupId: 'taste',
    title: { pl: 'Zmysły', en: 'Senses' },
    description: {
      pl: 'Światło, faktury i dźwięki, które dobrze na Ciebie działają.',
      en: 'Light, textures, and sounds that feel good to you.',
    },
  },
  {
    id: 'inspirations',
    groupId: 'taste',
    title: { pl: 'Twoje inspiracje', en: 'Your inspirations' },
    description: {
      pl: 'Obrazy, które pokazują, co naprawdę Cię przyciąga.',
      en: 'Images that show what truly draws you in.',
    },
  },
  {
    id: 'personality',
    groupId: 'taste',
    title: { pl: 'Osobowość', en: 'Personality' },
    description: {
      pl: 'Subtelna mapa cech, która pomaga dobrać styl.',
      en: 'A subtle trait map that helps shape the style.',
    },
  },
  {
    id: 'space_photo',
    groupId: 'space',
    title: { pl: 'Zdjęcie przestrzeni', en: 'Your space photo' },
    description: {
      pl: 'Pokaż miejsce, które IDA ma odmienić.',
      en: 'Show the space IDA will transform.',
    },
  },
  {
    id: 'space_needs',
    groupId: 'space',
    title: { pl: 'Potrzeby przestrzeni', en: 'What this space needs' },
    description: {
      pl: 'Co ma działać lepiej, wygodniej i piękniej.',
      en: 'What should work better, easier, and more beautifully.',
    },
  },
  {
    id: 'space_mood',
    groupId: 'space',
    title: { pl: 'Nastrój przestrzeni', en: 'Mood of the space' },
    description: {
      pl: 'Łączymy obecny klimat z tym, jak chcesz się tu czuć.',
      en: 'We connect the current mood with how you want to feel.',
    },
  },
  {
    id: 'generate',
    groupId: 'gen',
    title: { pl: 'Generowanie wnętrza', en: 'Interior generation' },
    description: {
      pl: 'IDA tworzy pierwsze propozycje gotowe do dopracowania.',
      en: 'IDA creates first concepts ready to refine.',
    },
  },
  {
    id: 'your_project',
    groupId: 'outro',
    title: { pl: 'Twój projekt', en: 'Your project' },
    description: {
      pl: 'Domykamy całość, żeby projekt był spójny i gotowy.',
      en: 'We bring it together so your project feels ready.',
    },
  },
] as const;

const GROUP_LABELS: Record<FullFlowUserStep['groupId'], { pl: string; en: string }> = {
  intro: { pl: 'Rozpoczęcie', en: 'Getting started' },
  taste: { pl: 'Twój gust', en: 'Your taste' },
  space: { pl: 'Twoja przestrzeń', en: 'Your space' },
  gen: { pl: 'Generowanie', en: 'Generation' },
  outro: { pl: 'Twój projekt', en: 'Your project' },
};

export function getFullFlowGroupLabel(
  groupId: FullFlowUserStep['groupId'],
  language: Language,
): string {
  return GROUP_LABELS[groupId][language];
}

/**
 * Map Core Profile wizard step to global index 0-5.
 */
export function fullFlowIndexFromCoreProfileStep(step: CoreProfileWizardStepId | null | undefined): number {
  if (!step) return 0;
  switch (step) {
    case 'consent':
      return 0;
    case 'demographics':
    case 'lifestyle':
      return 1;
    case 'tinder_swipes':
      return 2;
    case 'semantic_diff':
      return 3;
    case 'sensory_tests':
      return 4;
  }
}

/** Minimum journey bar index required to open this profile step via `?step=` (gate vs max-journey storage). */
export function minJourneyIndexForCoreProfileStep(step: CoreProfileWizardStepId): number {
  return fullFlowIndexFromCoreProfileStep(step);
}

/** Progress bar indices 0..4 → `step` query for `/setup/profile?step=`. */
export function coreProfileStepQueryFromFlowBarIndex(index: number): CoreProfileWizardStepId | null {
  switch (index) {
    case 0:
      return 'consent';
    case 1:
      return 'demographics';
    case 2:
      return 'tinder_swipes';
    case 3:
      return 'semantic_diff';
    case 4:
      return 'sensory_tests';
    default:
      return null;
  }
}

export const FULL_FLOW_PROFILE_STEP_QUERY_KEY = 'step';

/** Query flag: user opened a funnel step from the dashboard (retake / revisit). */
export const FULL_FLOW_FROM_DASHBOARD_QUERY_KEY = 'from';
export const FULL_FLOW_FROM_DASHBOARD_VALUE = 'dashboard';

export function isFullFlowFromDashboard(
  searchParams: Pick<URLSearchParams, 'get'> | { get: (key: string) => string | null },
): boolean {
  return searchParams.get(FULL_FLOW_FROM_DASHBOARD_QUERY_KEY) === FULL_FLOW_FROM_DASHBOARD_VALUE;
}

export function appendFromDashboardQuery(href: string): string {
  if (href.includes(`${FULL_FLOW_FROM_DASHBOARD_QUERY_KEY}=`)) {
    return href;
  }
  const separator = href.includes('?') ? '&' : '?';
  return `${href}${separator}${FULL_FLOW_FROM_DASHBOARD_QUERY_KEY}=${FULL_FLOW_FROM_DASHBOARD_VALUE}`;
}

/**
 * Progress bar indices 7–9 → `step` query for `/setup/room/[id]?step=` (revisit from journey bar).
 */
export function roomSetupStepQueryFromFlowBarIndex(index: number): RoomSetupStepId | null {
  switch (index) {
    case 7:
      return 'photo_upload';
    case 8:
      return 'preference_source';
    case 9:
      return 'prs_current';
    default:
      return null;
  }
}

/**
 * Target URL when revisiting a completed full-flow step (same rules as progress bar dot navigation).
 */
export function getFullFlowCompletedStepHref(
  index: number,
  options?: { spaceId?: string | null; pathnameHint?: string },
): string {
  let spaceId = options?.spaceId ?? null;
  const hint = options?.pathnameHint ?? '';
  if (!spaceId && hint) {
    const match = hint.match(/^\/setup\/room\/([^/?#]+)/);
    spaceId = match?.[1] ?? null;
  }

  if (index <= 4) {
    const step = coreProfileStepQueryFromFlowBarIndex(index);
    return step
      ? `/setup/profile?${FULL_FLOW_PROFILE_STEP_QUERY_KEY}=${encodeURIComponent(step)}`
      : '/setup/profile';
  }
  if (index === 5) return '/flow/inspirations';
  if (index === 6) return '/flow/big-five';
  if (index <= 9) {
    const roomStep = roomSetupStepQueryFromFlowBarIndex(index);
    if (spaceId && roomStep) {
      return `/setup/room/${spaceId}?${FULL_FLOW_PROFILE_STEP_QUERY_KEY}=${encodeURIComponent(roomStep)}`;
    }
    return '/setup/room';
  }
  if (index === 10) return '/flow/generate';
  return '/flow/thanks';
}

/**
 * Dashboard journey links: same routes as the flow bar, plus `from=dashboard` on key funnel routes,
 * and step index 11 opens the primary space hub when `spaceId` is provided.
 */
export function getFullFlowDashboardStepHref(index: number, spaceId?: string | null): string {
  if (index === 11 && spaceId) {
    return `/space/${spaceId}`;
  }

  const href = getFullFlowCompletedStepHref(index, { spaceId });

  if (href.startsWith('/setup/profile') || href.startsWith('/setup/room/')) {
    return appendFromDashboardQuery(href);
  }
  if (href === '/flow/inspirations' || href.startsWith('/flow/inspirations?')) {
    return appendFromDashboardQuery('/flow/inspirations');
  }
  if (href === '/flow/big-five' || href.startsWith('/flow/big-five?')) {
    return appendFromDashboardQuery('/flow/big-five');
  }
  if (href === '/flow/generate' || href.startsWith('/flow/generate')) {
    return appendFromDashboardQuery(href);
  }
  return href;
}

/**
 * Map room setup step to global index 7-9 (and summary still "space" segment).
 */
export function fullFlowIndexFromRoomStep(step: RoomSetupStepId | null | undefined): number {
  if (!step) return 7;
  switch (step) {
    case 'photo_upload':
      return 7;
    case 'preference_source':
    case 'preference_questions':
    case 'activities':
    case 'usage_context':
    case 'pain_points':
    case 'social_dynamics':
      return 8;
    case 'prs_current':
    case 'prs_target':
    case 'summary':
      return 9;
  }
}

export type FullFlowResolveContext = {
  /** Current wizard step on /setup/profile (client-only) */
  profileStep?: CoreProfileWizardStepId | null;
  /** Current room setup step on /setup/room/[id] (client-only) */
  roomStep?: RoomSetupStepId | null;
};

/**
 * Public routes that are part of the product journey and show the progress bar.
 */
const PREFIX_PATHS: readonly string[] = [
  '/setup/room', // including /setup/room/[id]
  '/flow/inspirations',
  '/flow/big-five',
  '/flow/generate',
  '/flow/modify',
  '/flow/survey1',
  '/flow/survey2',
  '/flow/thanks',
];

const EXACT_PATHS: readonly string[] = ['/setup/profile', '/flow/inspirations', '/flow/big-five'];

export function isFullFlowJourneyPath(pathname: string): boolean {
  if (EXACT_PATHS.includes(pathname)) return true;
  return PREFIX_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'));
}

function resolveIndexFromPathname(
  pathname: string,
  ctx: FullFlowResolveContext,
): number {
  if (pathname === '/setup/profile') {
    return fullFlowIndexFromCoreProfileStep(ctx.profileStep ?? 'consent');
  }
  if (pathname === '/flow/inspirations') return 5;
  if (pathname === '/flow/big-five') return 6;
  if (pathname === '/setup/room' || pathname.startsWith('/setup/room/')) {
    if (pathname === '/setup/room' && !ctx.roomStep) return 7; // loading redirect
    return fullFlowIndexFromRoomStep(ctx.roomStep ?? 'photo_upload');
  }
  if (pathname.startsWith('/flow/generate') || pathname.startsWith('/flow/modify')) {
    return 10;
  }
  if (pathname === '/flow/survey1' || pathname === '/flow/survey2' || pathname === '/flow/thanks') {
    return 11;
  }
  return 0;
}

export function getFullFlowProgressIndex(pathname: string, ctx: FullFlowResolveContext = {}): number {
  if (!isFullFlowJourneyPath(pathname)) {
    return 0;
  }
  return resolveIndexFromPathname(pathname, ctx);
}

/**
 * Journey fill along the bar (0–100). Matches dot positions for steps 0..n-2 via linear spacing.
 * On the last user-facing segment (index n-1), reserves full completion until `/flow/thanks`
 * so “Twój projekt” / ankiety do not show 100% before the flow is actually finished.
 */
export function getFullFlowProgressPercent(pathname: string, ctx: FullFlowResolveContext = {}): number {
  if (!isFullFlowJourneyPath(pathname)) return 0;
  if (pathname === '/flow/thanks') return 100;
  const idx = resolveIndexFromPathname(pathname, ctx);
  const n = FULL_FLOW_STEP_COUNT;
  if (n <= 1) return 100;
  const linearAlongTrack = (idx / (n - 1)) * 100;
  if (idx === n - 1) {
    return ((n - 1) / n) * 100;
  }
  return linearAlongTrack;
}

export function getActiveFullFlowStep(
  pathname: string,
  ctx: FullFlowResolveContext = {},
): FullFlowUserStep {
  const idx = Math.max(
    0,
    Math.min(
      FULL_FLOW_USER_STEPS.length - 1,
      resolveIndexFromPathname(pathname, ctx),
    ),
  );
  return FULL_FLOW_USER_STEPS[idx];
}

export type FullFlowCompletionInput = {
  sessionData: SessionData | null | undefined;
  spaces: ReadonlyArray<{ images?: ReadonlyArray<{ type?: string }> }>;
  spacesCount: number;
  generatedCount: number;
  inspirationsCount: number;
  hasUserHash: boolean;
};

function isDefinedNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function hasSensoryCompletion(session: SessionData): boolean {
  const sp = session.sensoryPreferences;
  const rsp = session.roomPreferences?.sensoryPreferences;

  if (sp?.music || sp?.texture || sp?.light) return true;
  if (rsp?.music || rsp?.texture || rsp?.light) return true;
  if (session.natureMetaphor) return true;
  if (session.coreProfileComplete || session.coreProfileCompletedAt) return true;
  return false;
}

function hasRoomMoodCompletion(session: SessionData): boolean {
  const roomPrefs = session.roomPreferences as
    | (typeof session.roomPreferences & {
        prsCurrent?: { x: number; y: number };
        prsTarget?: { x: number; y: number };
        biophiliaScore?: number;
      })
    | undefined;

  if (session.prsCurrent || session.prsTarget || session.prsIdeal) return true;
  if (roomPrefs?.prsCurrent || roomPrefs?.prsTarget) return true;
  if (isDefinedNumber(session.biophiliaScore)) return true;
  if (isDefinedNumber(roomPrefs?.biophiliaScore)) return true;
  return false;
}

/**
 * Derive completed dashboard journey step indices (0..11) from session + participant data.
 * Applies linear-funnel backfill so a later completed step implies earlier ones.
 */
export function resolveCompletedFullFlowStepIndices(input: FullFlowCompletionInput): number[] {
  const session = input.sessionData ?? ({} as SessionData);
  const legacySession = session as SessionData & {
    age?: unknown;
    household?: unknown;
    swipes?: unknown[];
    tinderResults?: unknown;
  };
  const completed = new Set<number>();

  if (input.hasUserHash) completed.add(0);
  if (
    session.demographics ||
    legacySession.age ||
    legacySession.household ||
    session.lifestyle ||
    session.currentStep === 'dashboard'
  ) {
    completed.add(1);
  }
  if (
    session.visualDNA ||
    legacySession.tinderResults ||
    (legacySession.swipes?.length || 0) > 0 ||
    (session.tinderResults?.length || 0) > 0
  ) {
    completed.add(2);
  }
  if (session.semanticDifferential || session.colorsAndMaterials?.selectedStyle) {
    completed.add(3);
  }
  if (hasSensoryCompletion(session)) completed.add(4);
  if (input.inspirationsCount > 0) completed.add(5);
  if (session.bigFive?.scores) completed.add(6);

  const hasAnySpace =
    input.spacesCount > 0 || !!session.currentSpaceId || !!session.roomImage;
  const hasRoomSetup =
    !!session.roomPreferences ||
    !!session.roomType ||
    input.spaces.some((space) => (space.images || []).length > 0);

  if (hasAnySpace) completed.add(7);
  if (hasRoomSetup) completed.add(8);
  if (hasRoomMoodCompletion(session)) completed.add(9);
  if (input.generatedCount > 0 || (session.generations?.length || 0) > 0) {
    completed.add(10);
  }
  if (session.currentStep === 'thanks') {
    completed.add(11);
  } else if (session.currentStep === 'dashboard' && input.generatedCount > 0) {
    completed.add(11);
  }

  const furthest = completed.size > 0 ? Math.max(...completed) : -1;
  for (let i = 0; i <= furthest; i++) {
    completed.add(i);
  }

  return Array.from(completed).sort((a, b) => a - b);
}
