"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { GlassCard } from '@/components/ui/GlassCard';
import { useSessionData } from '@/hooks/useSessionData';
import { useLanguage } from '@/contexts/LanguageContext';
import { stopAllDialogueAudio } from '@/hooks/useAudioManager';
import { 
  Zap, 
  Heart
} from 'lucide-react';

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

  const pathTexts = {
    pl: {
      title: 'Wybierz Swoją Ścieżkę',
      subtitle: 'Zdecyduj jak chcesz doświadczyć',
      ida: 'IDA',
      subtext: '- szybko czy dogłębnie',
      fastTrack: 'Szybka Ścieżka',
      fastTrackEn: 'Fast Track',
      fastDesc: 'Wypróbuj IDA szybko - prześlij zdjęcie, przesuń kilka inspiracji i generuj!',
      minutes35: '~3-5 minut',
      minQuestions: 'Minimalna ilość pytań',
      gen10: '10 generacji',
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
      fullIdeal: 'Prawdziwej personalizacji, projektowania wnętrza które jest TWOJE, wkładu w badania naukowe',
      whatYouGet: 'Co zyskujesz:',
      features: ['Tinder swipes', 'Mapa nastroju', 'Test zmysłów', 'Analiza pokoju', 'Drabina potrzeb', 'Multi-room'],
      startFull: 'Zacznij Pełne Doświadczenie',
      footnote: 'Zawsze możesz wrócić i spróbować drugiej ścieżki później'
    },
    en: {
      title: 'Choose Your Path',
      subtitle: 'Decide how you want to experience',
      ida: 'IDA',
      subtext: '- quick or deep',
      fastTrack: 'Fast Track',
      fastTrackEn: 'Fast Track',
      fastDesc: 'Try IDA quickly - upload photo, swipe a few inspirations and generate!',
      minutes35: '~3-5 minutes',
      minQuestions: 'Minimal questions',
      gen10: '10 generations',
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
      fullIdeal: 'True personalization, designing interior that is YOURS, contributing to research',
      whatYouGet: 'What you get:',
      features: ['Tinder swipes', 'Mood map', 'Sensory test', 'Room analysis', 'Needs ladder', 'Multi-room'],
      startFull: 'Start Full Experience',
      footnote: 'You can always come back and try the other path later'
    }
  };

  const texts = pathTexts[language];

  const handlePathSelection = async (pathType: 'fast' | 'full') => {
    stopAllDialogueAudio();
    
    // Save path type to session for routing logic
    await updateSessionData({ pathType });
    
    if (pathType === 'fast') {
      // Fast track: photo → onboarding → style selection → generate
      console.log('[PathSelection] Fast track selected');
      router.push('/flow/fast-track');
    } else {
      // Full experience: onboarding → profile setup → ... → photo → tinder → dna → ladder → generate
      console.log('[PathSelection] Full experience selected');
      await updateSessionData({ currentStep: 'onboarding' });
      router.push('/flow/onboarding');
    }
  };

  return (
    <div className="min-h-screen flex relative">
      {/* Main content area - centered like landing page */}
      <div className="flex-1 ml-[0px] flex flex-col items-center justify-center h-screen p-8">
        <div className="w-full max-w-4xl z-30">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="space-y-8"
          >
            {/* Header */}
            <div className="text-center mb-8">
              <h2 className="text-2xl lg:text-3xl font-nasalization text-graphite mb-3">
                {texts.title}
              </h2>
              <p className="text-base lg:text-lg text-silver-dark font-modern">
                {texts.subtitle} <span className="font-semibold text-gold">{texts.ida}</span>{texts.subtext}
              </p>
            </div>

            {/* Two path buttons - EQUAL HEIGHT like landing page */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* FAST TRACK */}
              <motion.button
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
                whileHover={{ scale: 1.05, y: -5 }}
                className="text-left w-full"
                onClick={() => handlePathSelection('fast')}
              >
                <GlassCard className="p-6 lg:p-8 h-full hover:border-silver/50 transition-all group rounded-2xl">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-silver to-platinum flex items-center justify-center">
                      <Zap size={28} className="text-graphite" />
                    </div>
                    <div>
                      <h3 className="text-xl lg:text-2xl font-nasalization text-graphite group-hover:text-silver-dark transition-colors">
                        {texts.fastTrack}
                      </h3>
                      <p className="text-xs text-silver-dark font-modern">3-5 min • 10 {language === 'pl' ? 'generacji' : 'generations'}</p>
                    </div>
                  </div>
                  <p className="text-sm text-graphite font-modern">
                    {texts.fastDesc}
                  </p>
                </GlassCard>
              </motion.button>

              {/* FULL EXPERIENCE */}
              <motion.button
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.6 }}
                whileHover={{ scale: 1.05, y: -5 }}
                className="text-left w-full"
                onClick={() => handlePathSelection('full')}
              >
                <GlassCard 
                  variant="highlighted"
                  className="p-6 lg:p-8 h-full hover:border-gold/50 transition-all group rounded-3xl"
                >
                  <div className="absolute top-3 right-3 bg-gradient-to-r from-gold to-champagne text-white px-3 py-1 rounded-full text-xs font-bold">
                    ✨ {texts.recommended}
                  </div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-gold to-champagne flex items-center justify-center">
                      <Heart size={28} className="text-white" fill="currentColor" />
                    </div>
                    <div>
                      <h3 className="text-xl lg:text-2xl font-nasalization text-graphite group-hover:text-silver-dark transition-colors">
                        {texts.fullExp}
                      </h3>
                      <p className="text-xs text-silver-dark font-modern">15-20 min • {language === 'pl' ? 'Nieograniczone' : 'Unlimited'}</p>
                    </div>
                  </div>
                  <p className="text-sm text-graphite font-modern">
                    {texts.fullDesc}
                  </p>
                </GlassCard>
              </motion.button>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

