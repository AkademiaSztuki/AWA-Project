"use client";

import React, { useCallback, useLayoutEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, useReducedMotion } from 'framer-motion';
import { GlassCard } from '@/components/ui/GlassCard';
import { useSessionData } from '@/hooks/useSessionData';
import { useLanguage } from '@/contexts/LanguageContext';
import { usePreferHardNavigation, useLiveSlowConnection } from '@/hooks/useSlowNetwork';
import { stopAllDialogueAudio } from '@/hooks/useAudioManager';
import { prefetchRoutes } from '@/lib/navigation/chunk-safe-navigation';
import { FLOW_PATH_HREFS, navigateToFlowPath } from '@/lib/flow/path-navigation';
import { AwaDialogue } from '@/components/awa/AwaDialogue';
import { Zap, Heart } from 'lucide-react';

/**
 * PathSelectionScreen - Choose between Fast Track and Full Experience
 *
 * Fast Track: Quick photo → minimal swipes → generate (10x limit)
 * Full Experience: Complete deep personalization journey
 */
export default function PathSelectionScreen() {
  const router = useRouter();
  const { language } = useLanguage();
  const { updateSessionData } = useSessionData();
  const preferHardNavigation = usePreferHardNavigation();
  const liveSlowConnection = useLiveSlowConnection();
  const preferReducedMotion = useReducedMotion();

  useLayoutEffect(() => {
    if (preferHardNavigation) return;
    prefetchRoutes(router, [FLOW_PATH_HREFS.fast, FLOW_PATH_HREFS.full]);
  }, [router, preferHardNavigation]);

  const pathTexts = {
    pl: {
      title: 'Wybierz Swoją Ścieżkę',
      subtitle: 'Jak chcesz współpracować z',
      ida: 'IDA',
      subtext: ' – ekspresowo czy szczegółowo?',
      fastCompletedTitle: 'Ukończyłeś szybką ścieżkę! 🎉',
      fastCompletedMessage:
        'Chcesz głębsze doświadczenie? Wypróbuj pełną ścieżkę, która bierze pod uwagę Twoje preferencje, styl życia i potrzeby, aby stworzyć jeszcze bardziej spersonalizowane wnętrze.',
      fastTrack: 'Szybka Ścieżka',
      fastTrackEn: 'Fast Track',
      fastDesc: 'Wypróbuj IDA szybko - prześlij zdjęcie, wybierz styl i generuj!',
      minutes35: '~3-5 minut',
      minQuestions: 'Minimalna ilość pytań',
      gen10: '10 obrazów',
      expMods: 'Eksperymentuj z modyfikacjami',
      basicPers: 'Bazowa personalizacja',
      styleSwipes: 'Styl wizualny z szybkich swipes',
      idealFor: 'Idealne dla:',
      fastIdeal: 'Szybkiego testu, ciekawości, pierwszego kontaktu z AI design',
      startFast: 'Zacznij Szybko',
      fullExp: 'Pełne Doświadczenie',
      fullExpEn: 'Full Experience',
      recommended: 'Polecane',
      fullDesc: 'Poznaj siebie głęboko, stwórz wnętrze które jest TWOJE',
      whoYouAre: 'KIM jesteś',
      minutes1520: '~15-20 minut',
      deepInterview: 'Pogłębiony wywiad z IDA',
      unlimitedGen: 'Nieograniczone generacje',
      createUnlimited: 'Twórz i modyfikuj bez limitów',
      deepPers: 'Głęboka personalizacja',
      psychPrefs: 'Psychologia + preferencje + styl życia',
      fullIdeal:
        'Prawdziwej personalizacji, projektowania wnętrza które jest TWOJE, wkładu w badania naukowe',
      whatYouGet: 'Co zyskujesz:',
      features: [
        'Tinder swipes',
        'Mapa nastroju',
        'Test zmysłów',
        'Analiza pokoju',
        'Drabina potrzeb',
        'Multi-room',
      ],
      startFull: 'Zacznij Pełne Doświadczenie',
      footnote: 'Zawsze możesz wrócić i spróbować drugiej ścieżki później',
    },
    en: {
      title: 'Choose Your Path',
      subtitle: 'Decide how you want to experience',
      ida: 'IDA',
      subtext: '- quick or deep',
      fastCompletedTitle: 'You completed the fast track! 🎉',
      fastCompletedMessage:
        'Want a deeper experience? Try the full path, which uses your personality, preferences, and lifestyle to create an even more personalized interior.',
      fastTrack: 'Fast Track',
      fastTrackEn: 'Fast Track',
      fastDesc: 'Try IDA quickly - upload photo, choose style and generate!',
      minutes35: '~3-5 minutes',
      minQuestions: 'Minimal questions',
      gen10: '10 images',
      expMods: 'Experiment with modifications',
      basicPers: 'Basic personalization',
      styleSwipes: 'Visual style from quick swipes',
      idealFor: 'Perfect for:',
      fastIdeal: 'Quick test, curiosity, first contact with AI design',
      startFast: 'Start Quick',
      fullExp: 'Full Experience',
      fullExpEn: 'Full Experience',
      recommended: 'Recommended',
      fullDesc: 'Let IDA get to know you deeply - create an interior that truly reflects',
      whoYouAre: 'WHO you are',
      minutes1520: '~15-20 minutes',
      deepInterview: 'In-depth interview with IDA',
      unlimitedGen: 'Unlimited generations',
      createUnlimited: 'Create and modify without limits',
      deepPers: 'Deep personalization',
      psychPrefs: 'Psychology + preferences + lifestyle',
      fullIdeal:
        'True personalization, designing interior that is YOURS, contributing to research',
      whatYouGet: 'What you get:',
      features: [
        'Tinder swipes',
        'Mood map',
        'Sensory test',
        'Room analysis',
        'Needs ladder',
        'Multi-room',
      ],
      startFull: 'Start Full Experience',
      footnote: 'You can always come back and try the other path later',
    },
  };

  const texts = pathTexts[language];

  const handlePathSelection = useCallback(
    (pathType: 'fast' | 'full') => {
      stopAllDialogueAudio();
      navigateToFlowPath(router, pathType, updateSessionData);
    },
    [router, updateSessionData],
  );

  return (
    <div className="min-h-screen flex relative">
      <div className="relative z-30 flex-1 ml-[0px] flex flex-col items-center justify-center min-h-screen p-4 sm:p-6 md:p-8 pb-48 sm:pb-64 lg:pb-8">
        <div className="w-full max-w-4xl z-30 mb-4 sm:mb-8 md:mb-16 lg:mb-32">
          <div className="space-y-4 sm:space-y-6 md:space-y-8">
            <div className="text-center mb-4 sm:mb-6 md:mb-8">
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-nasalization text-graphite mb-2 sm:mb-3">
                {texts.title}
              </h1>
              <p className="text-sm sm:text-base lg:text-lg text-silver-dark font-modern">
                {texts.subtitle}{' '}
                <span className="font-semibold text-gold">{texts.ida}</span>
                {texts.subtext}
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5 md:gap-6">
              <motion.button
                type="button"
                initial={false}
                whileHover={preferReducedMotion ? undefined : { scale: 1.02, y: -3 }}
                whileTap={preferReducedMotion ? undefined : { scale: 0.99 }}
                className="w-full cursor-pointer text-left"
                onClick={() => handlePathSelection('fast')}
              >
                <GlassCard
                  variant="interactive"
                  className="p-4 sm:p-5 md:p-6 lg:p-8 h-full hover:border-silver/50 transition-all group"
                >
                  <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                    <div className="w-10 h-10 sm:w-12 sm:h-14 rounded-lg sm:rounded-xl bg-gradient-to-br from-silver to-platinum flex items-center justify-center flex-shrink-0">
                      <Zap size={20} className="sm:w-7 sm:h-7 text-graphite" aria-hidden="true" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h2 className="text-lg sm:text-xl lg:text-2xl font-nasalization text-graphite group-hover:text-silver-dark transition-colors">
                        {texts.fastTrack}
                      </h2>
                      <p className="text-xs text-silver-dark font-modern">3-5 min</p>
                    </div>
                  </div>
                  <p className="text-xs sm:text-sm text-graphite font-modern">{texts.fastDesc}</p>
                </GlassCard>
              </motion.button>

              <motion.button
                type="button"
                initial={false}
                whileHover={preferReducedMotion ? undefined : { scale: 1.02, y: -3 }}
                whileTap={preferReducedMotion ? undefined : { scale: 0.99 }}
                className="w-full cursor-pointer text-left"
                onClick={() => handlePathSelection('full')}
              >
                <GlassCard
                  variant="highlighted"
                  className="p-4 sm:p-5 md:p-6 lg:p-8 h-full transition-all group relative isolate"
                >
                  <div className="absolute top-2 right-2 sm:top-3 sm:right-3 bg-gradient-to-r from-gold to-champagne text-white px-2 py-0.5 sm:px-3 sm:py-1 rounded-full text-xs font-bold whitespace-nowrap z-10">
                    ✨ {texts.recommended}
                  </div>
                  <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4 pr-16 sm:pr-20">
                    <div className="w-10 h-10 sm:w-12 sm:h-14 rounded-lg sm:rounded-xl bg-gradient-to-br from-gold to-champagne flex items-center justify-center flex-shrink-0">
                      <Heart
                        size={20}
                        className="sm:w-7 sm:h-7 text-white"
                        fill="currentColor"
                        aria-hidden="true"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h2 className="text-lg sm:text-xl lg:text-2xl font-nasalization text-graphite group-hover:text-silver-dark transition-colors">
                        {texts.fullExp}
                      </h2>
                      <p className="text-xs text-silver-dark font-modern">20-30 min</p>
                    </div>
                  </div>
                  <p className="text-xs sm:text-sm text-graphite font-modern">{texts.fullDesc}</p>
                </GlassCard>
              </motion.button>
            </div>
          </div>
        </div>
      </div>

      {!liveSlowConnection && (
        <div className="fixed inset-x-0 bottom-0 z-20 w-full pointer-events-none">
          <AwaDialogue
            currentStep="path_selection"
            fullWidth={true}
            autoHide={true}
            skipModelAnimation={true}
          />
        </div>
      )}
    </div>
  );
}
