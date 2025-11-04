'use client';

import { usePathname } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import { motion } from 'framer-motion';

// Map of route paths to their step numbers in the Part 1 flow
const PART_1_FLOW_STEPS: Record<string, number> = {
  '/flow/onboarding': 1,
  '/setup/profile': 2,
  '/flow/inspirations': 3,
  '/flow/big-five': 4,
  '/flow/ladder': 5,
};

const PART_1_TOTAL_STEPS = Object.keys(PART_1_FLOW_STEPS).length;

export default function FlowLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { language } = useLanguage();
  
  const currentStep = PART_1_FLOW_STEPS[pathname] || 0;
  const progress = currentStep > 0 ? (currentStep / PART_1_TOTAL_STEPS) * 100 : 0;

  // Only show progress bar for Part 1 flows
  const showProgress = currentStep > 0;

  return (
    <>
      {showProgress && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 w-full max-w-2xl px-4 z-40 pointer-events-none">
          <div className="glass-panel rounded-full h-3 overflow-hidden pointer-events-auto">
            <div className="flex items-center justify-between text-xs text-silver-dark mb-2 font-modern px-2">
              <span>
                {language === 'pl' ? 'Krok' : 'Step'} {currentStep} / {PART_1_TOTAL_STEPS}
              </span>
              <span>{Math.round(progress)}%</span>
            </div>
            <motion.div 
              className="h-full bg-gradient-to-r from-gold via-champagne to-gold"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </div>
      )}
      <div className={showProgress ? 'pt-20' : ''}>
        {children}
      </div>
    </>
  );
}

