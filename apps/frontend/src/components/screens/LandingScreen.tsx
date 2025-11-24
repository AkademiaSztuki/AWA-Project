"use client";

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { GlassCard, GlassButton } from '@/components/ui';
import { useRouter } from 'next/navigation';
import { AwaDialogue } from '@/components/awa/AwaDialogue';
import { Zap, Heart, Palette, Home, Sparkles } from 'lucide-react';
import { stopAllDialogueAudio } from '@/hooks/useAudioManager';
import { useModalAPI } from '@/hooks/useModalAPI';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSessionData } from '@/hooks/useSessionData';
import { useAuth } from '@/contexts/AuthContext';

const LandingScreen: React.FC = () => {
  const router = useRouter();
  const { language } = useLanguage();
  const { checkHealth } = useModalAPI();
  const { updateSessionData } = useSessionData();
  const { user } = useAuth();
  const [showAuraSection, setShowAuraSection] = useState(false);
  const [isPrewarming, setIsPrewarming] = useState(false);

  const landingTexts = {
    pl: {
      title: 'AURA',
      subtitle: 'Poznaj swoją futurystyczną asystentkę projektowania wnętrz',
      description: 'Razem odkryjemy Twoje preferencje designerskie i stworzymy wizualizacje Twoich marzeń. IDA wykorzystuje najnowsze technologie AI, aby pomóc Ci zrozumieć własny gust estetyczny.',
      whatYouLearn: 'Czego się dowiesz?',
      dna: 'Twoje wizualne DNA',
      ideal: 'Idealne wnętrze',
      hidden: 'Ukryte preferencje',
      ready: 'Gotowy/a?',
      readyText: 'Rozpocznij swoją podróż z IDA już teraz!',
      button: 'Rozpocznij Badanie',
      time: 'Czas trwania: ~20 minut'
    },
    en: {
      title: 'AURA',
      subtitle: 'Meet your futuristic interior design assistant',
      description: 'Together we\'ll discover your design preferences and create visualizations of your dreams. IDA uses the latest AI technologies to help you understand your aesthetic taste.',
      whatYouLearn: 'What will you learn?',
      dna: 'Your visual DNA',
      ideal: 'Perfect interior',
      hidden: 'Hidden preferences',
      ready: 'Ready?',
      readyText: 'Start your journey with IDA now!',
      button: 'Begin Study',
      time: 'Duration: ~20 minutes'
    }
  };

  const texts = landingTexts[language];

  const handleDialogueEnd = () => {
    // Dodaj opóźnienie 1 sekundy przed pokazaniem okna AURA
    setTimeout(() => {
      setShowAuraSection(true);
    }, 1500);
  };

  return (
    <div className="min-h-screen flex relative">

      {!showAuraSection && (
        <div className="flex-1 ml-[0px] flex items-center justify-center h-screen">
          <div className="w-full max-w-3xl">
            <AwaDialogue currentStep="landing" onDialogueEnd={handleDialogueEnd} />
          </div>
        </div>
      )}
      {showAuraSection && (
        <div className="flex-1 ml-[0px] flex flex-col items-center justify-center h-screen p-8">
          <div className="w-full max-w-4xl z-30">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-center mb-8"
            >
              <h2 className="text-2xl lg:text-3xl font-nasalization text-graphite mb-3">
                {language === 'pl' ? 'Wybierz Swoją Ścieżkę' : 'Choose Your Path'}
              </h2>
              <p className="text-base lg:text-lg text-silver-dark font-modern">
                {language === 'pl' ? 'Jak chcesz doświadczyć IDA?' : 'How do you want to experience IDA?'}
              </p>
            </motion.div>

            {/* Two path buttons - EQUAL HEIGHT */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* FAST TRACK */}
              <motion.button
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
                whileHover={{ scale: 1.05, y: -5 }}
                className="text-left w-full"
                onClick={async () => {
                  stopAllDialogueAudio();
                  setIsPrewarming(true);
                  checkHealth().catch(() => {});
                  
                  console.log('[Landing] Navigating to FAST TRACK');
                  await updateSessionData({ pathType: 'fast', currentStep: 'onboarding' });
                  router.push('/flow/onboarding');
                }}
              >
                <GlassCard className="p-6 lg:p-8 h-full hover:border-silver/50 transition-all group rounded-2xl">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-silver to-platinum flex items-center justify-center">
                      <Zap size={28} className="text-graphite" />
                    </div>
                    <div>
                      <h3 className="text-xl lg:text-2xl font-nasalization text-graphite group-hover:text-silver-dark transition-colors">
                        {language === 'pl' ? 'Szybka Ścieżka' : 'Fast Track'}
                      </h3>
                      <p className="text-xs text-silver-dark font-modern">3-5 min • 10 {language === 'pl' ? 'generacji' : 'generations'}</p>
                    </div>
                  </div>
                  <p className="text-sm text-graphite font-modern">
                    {language === 'pl' 
                      ? 'Prześlij zdjęcie i generuj od razu!' 
                      : 'Upload photo and generate right away!'}
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
                onClick={async () => {
                  stopAllDialogueAudio();
                  setIsPrewarming(true);
                  checkHealth().catch(() => {});
                  await updateSessionData({ pathType: 'full' });
                  router.push('/setup/profile');
                }}
              >
                <GlassCard 
                  variant="highlighted"
                  className="p-6 lg:p-8 h-full hover:border-gold/50 transition-all group relative overflow-hidden rounded-3xl"
                >
                  <div className="absolute top-3 right-3 bg-gradient-to-r from-gold to-champagne text-white px-3 py-1 rounded-full text-xs font-bold">
                    ✨ {language === 'pl' ? 'Polecane' : 'Recommended'}
                  </div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-gold to-champagne flex items-center justify-center">
                      <Heart size={28} className="text-white" fill="currentColor" />
                    </div>
                    <div>
                      <h3 className="text-xl lg:text-2xl font-nasalization text-graphite group-hover:text-gold-700 transition-colors">
                        {language === 'pl' ? 'Pełne Doświadczenie' : 'Full Experience'}
                      </h3>
                      <p className="text-xs text-silver-dark font-modern">15-20 min • Unlimited</p>
                    </div>
                  </div>
                  <p className="text-sm text-graphite font-modern">
                    {language === 'pl' 
                      ? 'Poznaj siebie głęboko, stwórz wnętrze które jest TWOJE' 
                      : 'Deep dive, create interior that is truly YOURS'}
                  </p>
                </GlassCard>
              </motion.button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LandingScreen;