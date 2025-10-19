"use client";

import React, { useState } from 'react';
import { GlassCard, GlassButton } from '@/components/ui';
import { AwaContainer } from '@/components/awa/AwaContainer';
import { AwaDialogue } from '@/components/awa/AwaDialogue';
import { useRouter } from 'next/navigation';
import { useSessionData } from '@/hooks/useSessionData';
import { stopAllDialogueAudio } from '@/hooks/useAudioManager';
import { useLanguage } from '@/contexts/LanguageContext';
import { motion } from 'framer-motion';
import { Zap } from 'lucide-react';

/**
 * Fast Track Onboarding - Minimal consent only (no demographics)
 * Quick path for users who want to test quickly
 */
export default function OnboardingFastPage() {
  const router = useRouter();
  const { language } = useLanguage();
  const [consent, setConsent] = useState({
    dataProcessing: false,
    research: false,
    anonymity: false
  });
  const { updateSessionData } = useSessionData();

  const canProceed = Object.values(consent).every(Boolean);

  const handleSubmit = () => {
    if (canProceed) {
      stopAllDialogueAudio();
      updateSessionData({
        consentTimestamp: new Date().toISOString(),
        pathType: 'fast'
      });
      // Navigate directly to fast-track flow
      router.push('/flow/fast-track');
    }
  };

  const consentTexts = {
    pl: {
      title: 'Szybki Start',
      subtitle: 'Tylko szybka zgoda i jesteśmy gotowi!',
      agree: 'Wyrażam Zgodę Na:',
      consent1: 'Przetwarzanie danych dla celów badawczych',
      consent2: 'Udział w badaniu (opcjonalnie)',
      consent3: 'Dane będą zanonimizowane',
      back: 'Zmień Ścieżkę',
      submit: 'Zacznij Fast Track'
    },
    en: {
      title: 'Quick Start',
      subtitle: 'Just quick consent and we\'re ready!',
      agree: 'I Consent To:',
      consent1: 'Data processing for research purposes',
      consent2: 'Study participation (optional)',
      consent3: 'Data will be anonymized',
      back: 'Change Path',
      submit: 'Start Fast Track'
    }
  };

  const texts = consentTexts[language];

  return (
    <div className="min-h-screen flex flex-col w-full relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-radial from-pearl-50 via-platinum-50 to-silver-100 -z-10" />

      <AwaContainer 
        currentStep="onboarding" 
        showDialogue={false}
        fullWidth={true}
        autoHide={false}
      />

      <div className="flex-1 p-4 lg:p-8">
        <div className="max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            {/* Fast Track Badge */}
            <div className="flex items-center justify-center gap-3 mb-8">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-400 to-cyan-500 flex items-center justify-center">
                <Zap size={24} className="text-white" />
              </div>
              <h1 className="text-3xl lg:text-4xl font-nasalization bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
                {texts.title}
              </h1>
            </div>

            <GlassCard className="p-6 lg:p-8">
              <p className="text-lg text-graphite font-modern mb-6 text-center">
                {texts.subtitle}
              </p>

              <div className="glass-panel rounded-xl p-6 bg-gradient-to-br from-blue-50/50 to-cyan-50/50 border-blue-200/30 mb-6">
                <h3 className="text-lg font-nasalization text-graphite mb-3">
                  {texts.agree}
                </h3>

                <div className="space-y-3">
                  {[
                    { key: 'dataProcessing', text: texts.consent1 },
                    { key: 'research', text: texts.consent2 },
                    { key: 'anonymity', text: texts.consent3 }
                  ].map(({ key, text }) => (
                    <label key={key} className="flex items-start gap-3 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={consent[key as keyof typeof consent]}
                        onChange={(e) => setConsent(prev => ({
                          ...prev,
                          [key]: e.target.checked
                        }))}
                        className="mt-1 w-5 h-5 text-blue-600 bg-pearl-100/20 border-blue-400/50 rounded focus:ring-blue-500 focus:ring-2"
                      />
                      <span className="text-graphite font-modern group-hover:text-blue-600 transition-colors">
                        {text}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex justify-between items-center">
                <GlassButton
                  variant="secondary"
                  onClick={() => {
                    stopAllDialogueAudio();
                    router.push('/flow/path-selection');
                  }}
                >
                  {texts.back}
                </GlassButton>

                <GlassButton
                  disabled={!canProceed}
                  onClick={handleSubmit}
                  size="lg"
                >
                  <Zap size={18} className="mr-2" />
                  {texts.submit}
                </GlassButton>
              </div>
            </GlassCard>

            <div className="mt-4 text-center text-sm text-silver-dark font-modern">
              ⚡ {language === 'pl' 
                ? 'Fast Track: Szybko, prosto, 10 generacji' 
                : 'Fast Track: Quick, simple, 10 generations'}
            </div>
          </motion.div>
        </div>
      </div>

      <div className="w-full">
        <AwaDialogue 
          currentStep="onboarding" 
          fullWidth={true}
          autoHide={true}
        />
      </div>
    </div>
  );
}

