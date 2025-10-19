"use client";

import React, { useEffect, useState } from 'react';
import { GlassCard, GlassButton } from '@/components/ui';
import { useRouter } from 'next/navigation';
import { AwaDialogue } from '@/components/awa/AwaDialogue';
import { Palette, Home, Sparkles } from 'lucide-react';
import { stopAllDialogueAudio } from '@/hooks/useAudioManager';
import { useModalAPI } from '@/hooks/useModalAPI';
import { useLanguage } from '@/contexts/LanguageContext';

const LandingScreen: React.FC = () => {
  const router = useRouter();
  const { language } = useLanguage();
  const { checkHealth } = useModalAPI();
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

  // Fallback: jeśli przeglądarka zablokuje autoplay i onDialogueEnd nie wywoła się,
  // pokaż sekcję akcji po krótkim czasie, by nie wymagać odświeżenia strony.
  useEffect(() => {
    const fallback = setTimeout(() => {
      setShowAuraSection((prev) => prev || false ? prev : true);
    }, 8000);
    return () => clearTimeout(fallback);
  }, []);

  return (
    <div className="min-h-screen flex">
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

            {/* Two path buttons */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* FAST TRACK */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
                whileHover={{ scale: 1.05, y: -5 }}
              >
                <GlassCard 
                  className="p-6 lg:p-8 cursor-pointer hover:border-blue-400/50 transition-all group"
                  onClick={async () => {
                    stopAllDialogueAudio();
                    setIsPrewarming(true);
                    checkHealth().catch(() => {});
                    await updateSessionData({ pathType: 'fast' });
                    router.push('/flow/onboarding-fast');
                  }}
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-400 to-cyan-500 flex items-center justify-center">
                      <Zap size={28} className="text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl lg:text-2xl font-nasalization text-graphite group-hover:text-blue-600 transition-colors">
                        {language === 'pl' ? 'Szybka Ścieżka' : 'Fast Track'}
                      </h3>
                      <p className="text-xs text-silver-dark">3-5 min • 10 generacji</p>
                    </div>
                  </div>
                  <p className="text-sm text-graphite font-modern">
                    {language === 'pl' 
                      ? 'Prześlij zdjęcie i generuj od razu!' 
                      : 'Upload photo and generate right away!'}
                  </p>
                </GlassCard>
              </motion.div>

              {/* FULL EXPERIENCE */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.6 }}
                whileHover={{ scale: 1.05, y: -5 }}
              >
                <GlassCard 
                  variant="highlighted"
                  className="p-6 lg:p-8 cursor-pointer hover:border-gold/50 transition-all group relative overflow-hidden"
                  onClick={async () => {
                    stopAllDialogueAudio();
                    setIsPrewarming(true);
                    checkHealth().catch(() => {});
                    await updateSessionData({ pathType: 'full' });
                    router.push('/flow/onboarding');
                  }}
                >
                  <div className="absolute top-3 right-3 bg-gradient-to-r from-gold to-champagne text-white px-3 py-1 rounded-full text-xs font-bold">
                    ✨ {language === 'pl' ? 'Polecane' : 'Recommended'}
                  </div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-gold via-champagne to-gold flex items-center justify-center">
                      <Heart size={28} className="text-white" fill="currentColor" />
                    </div>
                    <div>
                      <h3 className="text-xl lg:text-2xl font-nasalization bg-gradient-to-r from-gold to-champagne bg-clip-text text-transparent">
                        {language === 'pl' ? 'Pełne Doświadczenie' : 'Full Experience'}
                      </h3>
                      <p className="text-xs text-silver-dark">15-20 min • Unlimited</p>
                    </div>
                  </div>
                  <p className="text-sm text-graphite font-modern">
                    {language === 'pl' 
                      ? 'Poznaj siebie głęboko, stwórz wnętrze które jest TWOJE' 
                      : 'Deep dive, create interior that is truly YOURS'}
                  </p>
                </GlassCard>
              </motion.div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LandingScreen;