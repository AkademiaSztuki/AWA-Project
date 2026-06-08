'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  FULL_FLOW_USER_STEPS,
  FULL_FLOW_STEP_COUNT,
  getFullFlowGroupLabel,
  getFullFlowDashboardStepHref,
} from '@/lib/flow/full-flow-progress';
import { cn } from '@/lib/utils';

type DashboardJourneyStepsProps = {
  primarySpaceId?: string | null;
  completedStepIndices?: number[];
  onNeedSpace: () => void;
};

function journeyPercentForIndex(index: number): number {
  if (FULL_FLOW_STEP_COUNT <= 1) return 100;
  return (index / (FULL_FLOW_STEP_COUNT - 1)) * 100;
}

export function DashboardJourneySteps({
  primarySpaceId,
  completedStepIndices = [],
  onNeedSpace,
}: DashboardJourneyStepsProps) {
  const router = useRouter();
  const { language } = useLanguage();
  const lang = language === 'pl' ? 'pl' : 'en';
  const [previewIndex, setPreviewIndex] = useState(primarySpaceId ? 7 : 0);
  const [hoveredStepIndex, setHoveredStepIndex] = useState<number | null>(null);
  const [mobileTappedIndex, setMobileTappedIndex] = useState<number | null>(null);
  const mobileTrackRef = useRef<HTMLDivElement>(null);

  const t = (pl: string, en: string) => (lang === 'pl' ? pl : en);
  const completedSteps = new Set(completedStepIndices);
  const completedCount = completedSteps.size;

  useEffect(() => {
    setHoveredStepIndex(null);
    setMobileTappedIndex(null);
  }, [primarySpaceId]);

  useEffect(() => {
    if (mobileTappedIndex === null) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!mobileTrackRef.current?.contains(e.target as Node)) {
        setMobileTappedIndex(null);
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [mobileTappedIndex]);

  const activePreviewIndex = hoveredStepIndex ?? mobileTappedIndex ?? previewIndex;
  const activePreviewStep = FULL_FLOW_USER_STEPS[activePreviewIndex] ?? FULL_FLOW_USER_STEPS[0];
  const activePreviewGroupLabel = getFullFlowGroupLabel(activePreviewStep.groupId, lang);
  const isActivePreviewCompleted = completedSteps.has(activePreviewIndex);
  const isPreviewingStep = hoveredStepIndex !== null || mobileTappedIndex !== null;

  const goToStep = (index: number) => {
    const needsSpaceFirst = index >= 7 && index <= 9 && !primarySpaceId;
    if (needsSpaceFirst) {
      onNeedSpace();
      return;
    }
    const href = getFullFlowDashboardStepHref(index, primarySpaceId ?? null);
    router.push(href);
  };

  const handleMobileStepClick = (index: number) => {
    if (mobileTappedIndex === index) {
      goToStep(index);
      setMobileTappedIndex(null);
      return;
    }
    setMobileTappedIndex(index);
    setPreviewIndex(index);
  };

  const renderStepDot = (
    index: number,
    step: (typeof FULL_FLOW_USER_STEPS)[number],
    size: 'mobile' | 'desktop',
  ) => {
    const isSelected = previewIndex === index;
    const isCompleted = completedSteps.has(index);
    const needsSpaceFirst = index >= 7 && index <= 9 && !primarySpaceId;
    const isMobileTooltipOpen = size === 'mobile' && mobileTappedIndex === index;

    const dotClassName = cn(
      'flex items-center justify-center rounded-full transition',
      size === 'mobile' ? 'h-7 w-7' : 'h-9 w-9',
      isSelected
        ? 'bg-gold text-white shadow-[0_0_0_5px_rgba(255,205,70,0.14)]'
        : isCompleted
          ? 'bg-gold/70 text-white shadow-[0_0_0_1px_rgba(170,110,0,0.08)]'
          : 'bg-white/25 text-silver-dark',
      size === 'desktop' && !isSelected && !isCompleted && 'group-hover:bg-gold/35',
      size === 'mobile' && isMobileTooltipOpen && 'ring-2 ring-gold/40',
    );

    return (
      <>
        <span className={dotClassName}>
          {isCompleted ? (
            <Check className={size === 'mobile' ? 'h-3.5 w-3.5' : 'h-4 w-4'} aria-hidden />
          ) : (
            <span className={cn('font-modern font-semibold', size === 'mobile' ? 'text-[10px]' : 'text-[11px]')}>
              {index + 1}
            </span>
          )}
        </span>
        {size === 'mobile' && isMobileTooltipOpen && (
          <span
            role="tooltip"
            className="pointer-events-none absolute bottom-full left-1/2 z-30 mb-2 w-max max-w-[min(11rem,calc(100vw-2rem))] -translate-x-1/2 rounded-lg border border-amber-900/10 bg-white/95 px-2 py-1.5 text-center shadow-lg backdrop-blur-sm"
          >
            <span className="block font-nasalization text-[11px] leading-tight text-graphite">
              {step.title[lang]}
            </span>
            <span className="mt-0.5 block font-modern text-[9px] leading-tight text-silver-dark">
              {t('Dotknij ponownie, aby przejść', 'Tap again to open')}
            </span>
          </span>
        )}
      </>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45 }}
      className="mb-8"
    >
      <GlassCard variant="flatOnMobile" className="p-4 sm:p-6">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="relative min-h-[72px] min-w-0 sm:min-h-[84px]">
            <AnimatePresence mode="wait" initial={false}>
              {!isPreviewingStep ? (
                <motion.div
                  key="journey-header-default"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -3 }}
                  transition={{ duration: 0.16 }}
                  className="relative"
                >
                  <h2 className="font-nasalization text-lg text-graphite sm:text-xl">
                    {t('Etapy personalizacji', 'Personalization steps')}
                  </h2>
                  <p className="mt-2 max-w-prose font-modern text-xs leading-relaxed text-silver-dark sm:text-sm">
                    {t(
                      'Wróć do wybranego etapu, jeśli chcesz coś doprecyzować.',
                      'Return to any step whenever you want to refine something.',
                    )}
                  </p>
                </motion.div>
              ) : (
                <motion.div
                  key={`journey-header-step-${activePreviewStep.id}`}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -3 }}
                  transition={{ duration: 0.16 }}
                  className="relative"
                  aria-live="polite"
                >
                  <p className="font-modern text-[10px] font-semibold uppercase tracking-[0.12em] text-silver-dark">
                    {activePreviewGroupLabel} · {activePreviewIndex + 1}/{FULL_FLOW_STEP_COUNT} ·{' '}
                    {isActivePreviewCompleted ? t('ukończone', 'completed') : t('do uzupełnienia', 'to complete')}
                  </p>
                  <p className="mt-0.5 font-nasalization text-sm text-graphite">
                    {activePreviewStep.title[lang]}
                  </p>
                  <p className="mt-0.5 line-clamp-3 font-modern text-xs text-silver-dark sm:text-sm">
                    {activePreviewStep.description[lang]}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <div className="flex shrink-0 sm:items-start">
            <span className="rounded-full border border-gold/20 bg-gold/10 px-3 py-1 font-modern text-[11px] text-graphite">
              {t('Ukończono', 'Completed')} {completedCount}/{FULL_FLOW_STEP_COUNT}
            </span>
          </div>
        </div>

        {/* Mobile: compact dots that fit the viewport */}
        <div ref={mobileTrackRef} className="relative md:hidden">
          <div className="relative h-10 w-full px-1">
            <div
              className="absolute left-2 right-2 top-1/2 z-[1] h-1.5 -translate-y-1/2 rounded-full border border-amber-900/10 bg-white/15"
              role="presentation"
              aria-hidden
            />
            <ul
              className="absolute inset-0 z-10 m-0 list-none p-0"
              role="list"
              aria-label={t('Etapy personalizacji', 'Personalization steps')}
            >
              {FULL_FLOW_USER_STEPS.map((step, index) => {
                const percent = journeyPercentForIndex(index);
                return (
                  <li
                    key={step.id}
                    className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2"
                    style={{ left: `${percent}%` }}
                  >
                    <button
                      type="button"
                      onClick={() => handleMobileStepClick(index)}
                      onFocus={() => {
                        setPreviewIndex(index);
                        setMobileTappedIndex(index);
                      }}
                      onBlur={(e) => {
                        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
                          setMobileTappedIndex(null);
                        }
                      }}
                      className="relative flex h-10 w-10 touch-manipulation items-center justify-center rounded-full p-0 [-webkit-tap-highlight-color:transparent] focus:outline-none focus-visible:ring-2 focus-visible:ring-gold/50"
                      aria-label={`${index + 1}/${FULL_FLOW_STEP_COUNT}: ${step.title[lang]}`}
                      aria-expanded={mobileTappedIndex === index}
                      aria-current={previewIndex === index ? 'step' : undefined}
                    >
                      {renderStepDot(index, step, 'mobile')}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
          <p className="mt-1 text-center font-modern text-[11px] leading-snug text-graphite">
            <span className="text-silver-dark">{activePreviewIndex + 1}/{FULL_FLOW_STEP_COUNT}</span>
            {' · '}
            {activePreviewStep.title[lang]}
          </p>
        </div>

        {/* Desktop: full stepper with labels */}
        <div
          className="relative hidden overflow-x-auto px-1 pb-1 md:block [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          onMouseLeave={() => setHoveredStepIndex(null)}
        >
          <div className="relative min-w-[760px] pb-2 pt-4">
            <div className="absolute left-5 right-5 top-8 h-2 rounded-full border border-amber-900/10 bg-white/15" />
            <div className="relative z-10 grid grid-cols-12">
              {FULL_FLOW_USER_STEPS.map((step, index) => {
                const isSelected = previewIndex === index;
                const isCompleted = completedSteps.has(index);

                return (
                  <button
                    key={step.id}
                    type="button"
                    onMouseEnter={() => {
                      setHoveredStepIndex(index);
                      setPreviewIndex(index);
                    }}
                    onFocus={() => {
                      setHoveredStepIndex(index);
                      setPreviewIndex(index);
                    }}
                    onBlur={(e) => {
                      if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
                        setHoveredStepIndex(null);
                      }
                    }}
                    onClick={() => goToStep(index)}
                    className="group flex flex-col items-center gap-2 px-1 text-center"
                    aria-label={`${index + 1}/${FULL_FLOW_STEP_COUNT}: ${step.title[lang]}`}
                    aria-current={isSelected ? 'step' : undefined}
                  >
                    {renderStepDot(index, step, 'desktop')}
                    <span
                      className={`line-clamp-2 min-h-[28px] max-w-[74px] font-modern text-[10px] leading-tight group-hover:text-graphite ${
                        isCompleted ? 'text-graphite' : 'text-silver-dark'
                      }`}
                    >
                      {step.title[lang]}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </GlassCard>
    </motion.div>
  );
}
