'use client';

import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import { useFullFlowProgress } from '@/contexts/FullFlowProgressContext';
import { useSessionData } from '@/hooks/useSessionData';
import {
  FULL_FLOW_USER_STEPS,
  FULL_FLOW_STEP_COUNT,
  FULL_FLOW_MAX_JOURNEY_INDEX_STORAGE_KEY,
  getFullFlowCompletedStepHref,
  getFullFlowProgressPercent,
  getActiveFullFlowStep,
  getFullFlowProgressIndex,
} from '@/lib/flow/full-flow-progress';
import {
  FAST_FLOW_USER_STEPS,
  FAST_FLOW_STEP_COUNT,
  FAST_FLOW_MAX_JOURNEY_INDEX_STORAGE_KEY,
  getFastFlowProgressPercent,
  getActiveFastFlowStep,
  getFastFlowProgressIndex,
  getFastCompletedStepHref,
  journeyPercentForFastStepIndex,
  resolveFlowJourneyMode,
} from '@/lib/flow/fast-flow-progress';
import { cn } from '@/lib/utils';

type JourneyUserStep = {
  id: string;
  title: { pl: string; en: string };
  description: { pl: string; en: string };
};

interface PartOneProgressBarProps {
  currentPath?: string;
  className?: string;
}

function journeyPercentForFullStepIndex(index: number): number {
  if (FULL_FLOW_STEP_COUNT <= 1) return 100;
  return (index / (FULL_FLOW_STEP_COUNT - 1)) * 100;
}

type JourneyMarkerLayout = 'flat' | 'rich';

function JourneyStepMarkers({
  layout,
  userSteps,
  stepCount,
  journeyPercentAtIndex,
  currentIndex,
  furthestIndex,
  previewIndex,
  hoveredIndex,
  language,
  listId,
  onHoverIndex,
  onDotClick,
  onDotFocus,
  onDotBlur,
}: {
  layout: JourneyMarkerLayout;
  userSteps: readonly JourneyUserStep[];
  stepCount: number;
  journeyPercentAtIndex: (index: number) => number;
  currentIndex: number;
  /** Max step index reached this session — keeps dots/click targets correct when revisiting earlier routes */
  furthestIndex: number;
  previewIndex: number | null;
  hoveredIndex: number | null;
  language: 'pl' | 'en';
  listId: string;
  onHoverIndex: (i: number | null) => void;
  onDotClick: (i: number) => void;
  onDotFocus: (i: number) => void;
  onDotBlur: () => void;
}) {
  return (
    <ul
      className={cn(
        'm-0 list-none p-0',
        layout === 'rich'
          ? 'absolute bottom-0 left-4 right-4 top-0 z-20'
          : 'absolute inset-0 z-20 w-full pointer-events-none',
      )}
      role="list"
      aria-label={language === 'pl' ? 'Znaczniki etapów' : 'Step markers'}
    >
      {userSteps.map((s, i) => {
        const isActive = i === currentIndex;
        const isCompleted =
          i !== currentIndex && (i < currentIndex || (i > currentIndex && i <= furthestIndex));
        const isStepPreviewed = previewIndex === i;
        const dimmed =
          hoveredIndex !== null && i !== hoveredIndex && !isActive && !isCompleted;
        return (
          <li
            key={s.id}
            className="group/marker absolute top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center"
            style={{ left: `${journeyPercentAtIndex(i)}%` }}
            onPointerEnter={(e) => {
              if (e.pointerType === 'mouse') onHoverIndex(i);
            }}
          >
            <button
              type="button"
              onClick={() => onDotClick(i)}
              className={cn(
                layout === 'flat' ? 'h-10 w-10 pointer-events-auto' : 'h-8 w-8',
                'relative flex min-h-[2.5rem] min-w-[2.5rem] touch-manipulation cursor-pointer items-center justify-center rounded-full p-0',
                'transition-transform duration-200 sm:hover:scale-110',
                'focus:outline-none sm:focus-visible:scale-110',
                '[-webkit-tap-highlight-color:transparent]',
                !isCompleted && !isActive && 'cursor-help',
              )}
              aria-label={
                language === 'pl'
                  ? `Krok ${i + 1} z ${stepCount}: ${s.title.pl}. ${s.description.pl}`
                  : `Step ${i + 1} of ${stepCount}: ${s.title.en}. ${s.description.en}`
              }
              aria-current={isActive ? 'step' : undefined}
              aria-pressed={layout === 'flat' && isStepPreviewed && !isActive ? true : undefined}
              onFocus={() => onDotFocus(i)}
              onBlur={() => onDotBlur()}
            >
              {isActive && (
                <span
                  className="pointer-events-none absolute left-1/2 top-1/2 z-0 h-9 w-9 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gold/20 blur-md sm:h-10 sm:w-10"
                  aria-hidden
                />
              )}
              <DotNode
                isActive={isActive}
                isCompleted={isCompleted}
                isDimmed={dimmed}
                isHovered={isStepPreviewed}
              />
            </button>
            <span id={`${listId}-${layout}-tip-${i}`} className="sr-only">
              {i + 1}. {s.title[language]}. {s.description[language]}
              {i !== currentIndex && i <= furthestIndex
                ? language === 'pl'
                  ? ' Kliknij, aby wrócić do tej części.'
                  : ' Click to revisit this section.'
                : ''}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

function DotNode({
  isActive,
  isCompleted,
  isDimmed,
  isHovered,
}: {
  isActive: boolean;
  isCompleted: boolean;
  isDimmed: boolean;
  isHovered: boolean;
}) {
  return (
    <motion.span
      layout
      className={cn(
        'relative z-20 flex items-center justify-center rounded-full border-0 transition-all duration-200',
        isActive &&
          'h-7 w-7 bg-gold text-white shadow-[0_0_0_5px_rgba(255,205,70,0.14)] sm:h-9 sm:w-9',
        !isActive &&
          isCompleted &&
          'h-6 w-6 bg-gold/70 text-white shadow-[0_0_0_1px_rgba(170,110,0,0.08)] sm:h-8 sm:w-8',
        !isActive &&
          !isCompleted &&
          'h-5 w-5 bg-white/25 sm:h-6 sm:w-6',
        isHovered && !isActive && isCompleted && 'bg-gold shadow-[0_0_0_3px_rgba(255,200,0,0.12)]',
        isHovered && !isActive && !isCompleted && 'bg-gold/35',
        isDimmed && 'opacity-70',
      )}
      initial={false}
      animate={
        isActive
          ? { scale: [1, 1.06, 1], opacity: 1 }
          : { scale: isHovered ? 1.12 : isDimmed ? 0.95 : 1, opacity: isDimmed ? 0.7 : 1 }
      }
      transition={
        isActive
          ? { duration: 2.4, repeat: Number.POSITIVE_INFINITY, ease: 'easeInOut' }
          : { duration: 0.2 }
      }
    >
      {isCompleted && !isActive && (
        <Check className="h-3.5 w-3.5 sm:h-4 sm:w-4" strokeWidth={2.5} aria-hidden />
      )}
    </motion.span>
  );
}

export function PartOneProgressBar({ currentPath, className = '' }: PartOneProgressBarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const path = currentPath ?? pathname;
  const { language } = useLanguage();
  const { profileStep, roomStep } = useFullFlowProgress();
  const { sessionData } = useSessionData();
  const pathType = sessionData?.pathType;
  const journeyMode = resolveFlowJourneyMode(path, pathType);
  const isFast = journeyMode === 'fast';

  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [touchPreviewIndex, setTouchPreviewIndex] = useState<number | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const listId = useId();

  const ctx = { profileStep, roomStep };
  const progress = isFast ? getFastFlowProgressPercent(path) : getFullFlowProgressPercent(path, ctx);
  const currentIndex = isFast ? getFastFlowProgressIndex(path) : getFullFlowProgressIndex(path, ctx);
  const stepInfo: JourneyUserStep = isFast
    ? getActiveFastFlowStep(path)
    : getActiveFullFlowStep(path, ctx);
  const userSteps: readonly JourneyUserStep[] = isFast ? FAST_FLOW_USER_STEPS : FULL_FLOW_USER_STEPS;
  const stepCount = isFast ? FAST_FLOW_STEP_COUNT : FULL_FLOW_STEP_COUNT;
  const journeyPercentAtIndex = isFast ? journeyPercentForFastStepIndex : journeyPercentForFullStepIndex;
  const [furthestIndex, setFurthestIndex] = useState(0);

  useLayoutEffect(() => {
    if (typeof window === 'undefined' || journeyMode === null) return;
    const idx = isFast ? getFastFlowProgressIndex(path) : getFullFlowProgressIndex(path, ctx);
    const storageKey = isFast
      ? FAST_FLOW_MAX_JOURNEY_INDEX_STORAGE_KEY
      : FULL_FLOW_MAX_JOURNEY_INDEX_STORAGE_KEY;
    const stored = parseInt(sessionStorage.getItem(storageKey) || '0', 10);
    const safeStored = Number.isFinite(stored) && stored >= 0 ? stored : 0;
    setFurthestIndex(() => {
      const next = Math.max(idx, safeStored);
      sessionStorage.setItem(storageKey, String(next));
      return next;
    });
  }, [path, journeyMode, isFast, ctx.profileStep, ctx.roomStep]);

  const previewIndex = hoveredIndex ?? touchPreviewIndex;
  const previewWidth =
    previewIndex !== null && previewIndex >= 0 ? journeyPercentAtIndex(previewIndex) : null;

  useEffect(() => {
    if (touchPreviewIndex == null) return;
    const onDown = (e: PointerEvent) => {
      if (!trackRef.current) return;
      if (!trackRef.current.contains(e.target as Node)) {
        setTouchPreviewIndex(null);
      }
    };
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, [touchPreviewIndex]);

  if (journeyMode === null) {
    return null;
  }

  const stageLabel =
    language === 'pl'
      ? `Etap ${currentIndex + 1} / ${stepCount}`
      : `Stage ${currentIndex + 1} / ${stepCount}`;

  const previewStep =
    previewIndex !== null ? (userSteps[previewIndex] ?? stepInfo) : stepInfo;
  const previewStageLabel =
    previewIndex !== null
      ? language === 'pl'
        ? `Etap ${previewIndex + 1} / ${stepCount}`
        : `Stage ${previewIndex + 1} / ${stepCount}`
      : stageLabel;
  const isPreviewing = previewIndex !== null && previewIndex !== currentIndex;

  const pushCompletedStep = (i: number) => {
    const href = isFast ? getFastCompletedStepHref(i) : getFullFlowCompletedStepHref(i, { pathnameHint: path });
    router.push(href);
  };

  return (
    <div ref={trackRef} className={cn('w-full', className)}>
      <section
        className="sticky top-0 z-[60] -mx-1 overflow-visible bg-transparent px-3 py-2 text-graphite sm:static sm:z-auto sm:mx-0 sm:rounded-2xl sm:border sm:border-amber-900/10 sm:bg-white/[0.07] sm:px-4 sm:py-2.5 sm:shadow-[inset_0_1px_0_rgba(255,255,255,0.22),0_8px_22px_rgba(0,0,0,0.05)] sm:backdrop-blur-glass md:px-5"
        aria-labelledby={`${listId}-heading`}
        aria-describedby={`${listId}-blurb`}
        onPointerLeave={() => {
          setHoveredIndex(null);
          setTouchPreviewIndex(null);
        }}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="m-0 font-modern text-[10px] font-semibold uppercase tracking-[0.16em] text-silver-dark sm:text-[11px]">
              {previewStageLabel}
              {isPreviewing && (
                <span className="ml-1 font-medium normal-case tracking-normal text-silver-dark/60">
                  {language === 'pl' ? 'podgląd' : 'preview'}
                </span>
              )}
            </p>
            <h2
              className="mt-0.5 truncate font-nasalization text-sm leading-tight text-graphite sm:text-base"
              id={`${listId}-heading`}
              aria-current="step"
            >
              {previewStep.title[language]}
            </h2>
          </div>

          <div className="flex flex-shrink-0 items-center gap-1.5">
            <span
              className="rounded-full border border-gold/20 bg-gold/10 px-3 py-0.5 font-nasalization text-xs tabular-nums text-graphite ring-0 outline-none sm:py-1 sm:text-sm"
              aria-label={language === 'pl' ? 'Procent ukończenia flow' : 'Journey completion percent'}
            >
              {Math.round(progress)}%
            </span>
          </div>
        </div>

        <p
          id={`${listId}-blurb`}
          className="mt-1 line-clamp-1 font-modern text-[11px] leading-snug text-silver-dark/95 sm:text-xs"
        >
          {previewStep.description[language]}
        </p>

        <div className="relative mt-2.5 h-11 w-full sm:mt-3 md:hidden">
          <div
            className="absolute left-0 right-0 top-1/2 z-[1] h-1.5 w-full -translate-y-1/2 overflow-hidden rounded-full border border-amber-900/10 bg-white/15"
            role="progressbar"
            aria-label={language === 'pl' ? 'Postęp' : 'Progress'}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(progress)}
          >
            {previewWidth !== null && (
              <motion.div
                className="absolute bottom-0 left-0 top-0 z-[1] h-full max-w-full rounded-full bg-gold/25"
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: `${Math.min(100, previewWidth)}%`, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              />
            )}
            <motion.div
              className="absolute bottom-0 left-0 top-0 z-[2] h-full min-w-0 max-w-full rounded-full bg-gold/75"
              initial={false}
              style={{ maxWidth: '100%' }}
              animate={{ width: `${progress}%` }}
              transition={{ type: 'spring', stiffness: 200, damping: 26 }}
            />
          </div>
          <JourneyStepMarkers
            layout="flat"
            userSteps={userSteps}
            stepCount={stepCount}
            journeyPercentAtIndex={journeyPercentAtIndex}
            currentIndex={currentIndex}
            furthestIndex={furthestIndex}
            previewIndex={previewIndex}
            hoveredIndex={hoveredIndex}
            language={language as 'pl' | 'en'}
            listId={listId}
            onHoverIndex={() => {}}
            onDotClick={(i) => {
              if (i !== currentIndex && i <= furthestIndex) {
                pushCompletedStep(i);
                return;
              }
              if (typeof window === 'undefined') return;
              const narrow = window.matchMedia('(max-width: 767.98px)').matches;
              if (!narrow) return;
              setTouchPreviewIndex((prev) => (prev === i ? null : i));
              setHoveredIndex(null);
            }}
            onDotFocus={() => {}}
            onDotBlur={() => {}}
          />
        </div>

        <div
          className="relative z-0 mt-3 hidden h-8 overflow-visible md:mt-3.5 md:block"
          onPointerLeave={() => setHoveredIndex(null)}
        >
            <div className="absolute left-4 right-4 top-1/2 h-2 -translate-y-1/2" role="presentation" aria-hidden>
            <div className="h-full w-full rounded-full border border-amber-900/10 bg-white/15" />
            {previewWidth !== null && (
              <motion.div
                className="absolute bottom-0 left-0 z-[2] h-2 rounded-full bg-gold/25"
                style={{ maxWidth: '100%' }}
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: `${Math.min(100, previewWidth)}%`, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 260, damping: 28 }}
                aria-hidden
              />
            )}
            <motion.div
              className="absolute bottom-0 left-0 z-[3] h-2 min-w-0 max-w-full rounded-full bg-gold/80"
              initial={false}
              style={{ maxWidth: '100%' }}
              aria-hidden
              animate={{ width: `${progress}%` }}
              transition={{ type: 'spring', stiffness: 180, damping: 24 }}
            />
          </div>

          <JourneyStepMarkers
            layout="rich"
            userSteps={userSteps}
            stepCount={stepCount}
            journeyPercentAtIndex={journeyPercentAtIndex}
            currentIndex={currentIndex}
            furthestIndex={furthestIndex}
            previewIndex={previewIndex}
            hoveredIndex={hoveredIndex}
            language={language as 'pl' | 'en'}
            listId={listId}
            onHoverIndex={setHoveredIndex}
            onDotClick={(i) => {
              if (i !== currentIndex && i <= furthestIndex) {
                pushCompletedStep(i);
              }
            }}
            onDotFocus={setHoveredIndex}
            onDotBlur={() => setHoveredIndex(null)}
          />
        </div>

        <p className="sr-only" aria-live="polite">
          {stageLabel}. {stepInfo.title[language]}. {stepInfo.description[language]}.
        </p>
      </section>
    </div>
  );
}
