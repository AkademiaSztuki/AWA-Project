"use client";

import { motion } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import { 
  PART_ONE_FLOW_STEPS,
  PART_ONE_TOTAL_STEPS,
  getPartOneStepInfo
} from '@/lib/flow/part-one-flow';

interface PartOneProgressBarProps {
  currentPath: string;
  className?: string;
}

export function PartOneProgressBar({ currentPath, className = '' }: PartOneProgressBarProps) {
  const { language } = useLanguage();
  const stepInfo = getPartOneStepInfo(currentPath);

  if (!stepInfo) {
    return null;
  }

  const progress = ((stepInfo.index + 1) / PART_ONE_TOTAL_STEPS) * 100;

  return (
    <div className={`w-full ${className}`}>
      {/* Mobile Slim Version (Sticky) */}
      <div className="block sm:hidden sticky top-0 z-[60] -mx-2 px-2 pb-2 bg-transparent">
        <div className="rounded-xl p-2">
          <div className="flex items-center justify-between mb-1.5 px-1">
            <span className="text-[10px] font-semibold tracking-wider uppercase text-silver-dark">
              {stepInfo.index + 1} / {PART_ONE_TOTAL_STEPS}: {stepInfo.title[language]}
            </span>
            <span className="text-[10px] font-nasalization text-gold">{Math.round(progress)}%</span>
          </div>
          <div className="h-1 w-full rounded-full bg-white/10 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.4 }}
              className="h-full bg-gradient-to-r from-gold to-platinum"
            />
          </div>
        </div>
      </div>

      {/* Desktop Version */}
      <div className="hidden sm:block glass-panel rounded-2xl border border-white/20 bg-white/5 backdrop-blur-xl p-5 md:p-6 shadow-2xl">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-semibold tracking-[0.2em] uppercase text-silver-dark">
              {language === 'pl' ? 'Etap' : 'Stage'} {stepInfo.index + 1} / {PART_ONE_TOTAL_STEPS}
            </p>
            <h2 className="text-2xl md:text-3xl font-nasalization text-graphite">
              {stepInfo.title[language]}
            </h2>
            <p className="text-sm text-silver-dark font-modern max-w-xl">
              {stepInfo.description[language]}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs uppercase tracking-[0.3em] text-silver-dark mb-1">
              {language === 'pl' ? 'Postęp' : 'Progress'}
            </p>
            <p className="text-3xl font-nasalization text-graphite">{Math.round(progress)}%</p>
          </div>
        </div>

        <div className="mt-4">
          <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.4 }}
              className="h-full bg-gradient-to-r from-gold via-champagne to-platinum"
            />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {PART_ONE_FLOW_STEPS.map((step, index) => {
            const isActive = step.path === currentPath;
            const isCompleted = index < stepInfo.index;

            return (
              <span
                key={step.path}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                  isActive
                    ? 'bg-gold/30 border border-gold/40 text-graphite'
                    : isCompleted
                    ? 'bg-platinum/30 border border-platinum/40 text-graphite'
                    : 'bg-white/5 border border-white/10 text-silver-dark'
                }`}
              >
                {index + 1}. {step.title[language]}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}

