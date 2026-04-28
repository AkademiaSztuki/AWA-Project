'use client';

import { useEffect, useState } from 'react';
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

type DashboardJourneyStepsProps = {
  primarySpaceId?: string | null;
  completedStepIndices?: number[];
  onNeedSpace: () => void;
};

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

  const t = (pl: string, en: string) => (lang === 'pl' ? pl : en);
  const completedSteps = new Set(completedStepIndices);
  const completedCount = completedSteps.size;
  useEffect(() => {
    setHoveredStepIndex(null);
  }, [primarySpaceId]);

  const activePreviewIndex = hoveredStepIndex ?? previewIndex;
  const activePreviewStep = FULL_FLOW_USER_STEPS[activePreviewIndex] ?? FULL_FLOW_USER_STEPS[0];
  const activePreviewGroupLabel = getFullFlowGroupLabel(activePreviewStep.groupId, lang);
  const isActivePreviewCompleted = completedSteps.has(activePreviewIndex);

  const goToStep = (index: number) => {
    const needsSpaceFirst = index >= 7 && index <= 9 && !primarySpaceId;
    if (needsSpaceFirst) {
      onNeedSpace();
      return;
    }
    const href = getFullFlowDashboardStepHref(index, primarySpaceId ?? null);
    router.push(href);
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
          <div className="relative min-h-[92px] min-w-0 sm:min-h-[84px]">
            <AnimatePresence mode="wait" initial={false}>
              {hoveredStepIndex === null ? (
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

        <div
          className="relative overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          onMouseLeave={() => setHoveredStepIndex(null)}
        >
          <div className="relative min-w-[760px] pb-2 pt-4">
            <div className="absolute left-5 right-5 top-8 h-2 rounded-full border border-amber-900/10 bg-white/15" />
            <div className="relative z-10 grid grid-cols-12">
              {FULL_FLOW_USER_STEPS.map((step, index) => {
                const isSelected = previewIndex === index;
                const isCompleted = completedSteps.has(index);
                const needsSpaceFirst = index >= 7 && index <= 9 && !primarySpaceId;

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
                  >
                    <span
                      className={`flex h-9 w-9 items-center justify-center rounded-full transition ${
                        isSelected
                          ? 'bg-gold text-white shadow-[0_0_0_5px_rgba(255,205,70,0.14)]'
                          : isCompleted
                          ? 'bg-gold/70 text-white shadow-[0_0_0_1px_rgba(170,110,0,0.08)]'
                          : needsSpaceFirst
                          ? 'bg-white/25 text-silver-dark group-hover:bg-gold/35'
                          : 'bg-white/25 text-silver-dark group-hover:bg-gold/35'
                      }`}
                    >
                      {isCompleted ? (
                        <Check className="h-4 w-4" aria-hidden />
                      ) : (
                        <span className="font-modern text-[11px] font-semibold">{index + 1}</span>
                      )}
                    </span>
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
