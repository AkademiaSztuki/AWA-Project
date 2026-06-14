"use client";

import { motion } from 'framer-motion';
import { GlassAccordion } from '@/components/ui';

export interface OnboardingConsentLearnMoreProps {
  texts: {
    accordion1Title: string;
    accordion1Content: string;
    accordion2Title: string;
    accordion2Content: string;
    accordion3Title: string;
    accordion3Content: string;
    accordion4Title: string;
    accordion4Content: string;
    accordion5Title: string;
    accordion5Content: string;
  };
}

export default function OnboardingConsentLearnMore({ texts }: OnboardingConsentLearnMoreProps) {
  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-3 mb-6 overflow-hidden"
    >
      <GlassAccordion title={texts.accordion1Title}>
        <p>{texts.accordion1Content}</p>
      </GlassAccordion>

      <GlassAccordion title={texts.accordion2Title}>
        <p>{texts.accordion2Content}</p>
      </GlassAccordion>

      <GlassAccordion title={texts.accordion3Title}>
        <p>{texts.accordion3Content}</p>
      </GlassAccordion>

      <GlassAccordion title={texts.accordion4Title}>
        <p>{texts.accordion4Content}</p>
      </GlassAccordion>

      <GlassAccordion title={texts.accordion5Title}>
        <p>{texts.accordion5Content}</p>
      </GlassAccordion>
    </motion.div>
  );
}
