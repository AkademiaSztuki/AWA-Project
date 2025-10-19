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
        <div className="flex-1 ml-[0px] flex flex-col items-center justify-center h-screen">
          <GlassButton
            size="lg"
            onClick={async () => {
              try {
                await Promise.resolve(stopAllDialogueAudio());
                
                // PRE-WARM API (non-blocking)
                setIsPrewarming(true);
                console.log('🔥 Pre-warming Modal API (FLUX + Gemma)...');
                checkHealth().then(ready => {
                  console.log('🔥 Modal API pre-warm result:', ready ? 'READY' : 'WARMING...');
                }).catch(err => {
                  console.log('Pre-warm check failed (expected on first run):', err);
                });
                
              } catch (e) {
                // ignore audio stop failures
              } finally {
                // Navigate directly to path selection
                router.push('/flow/path-selection');
              }
            }}
            disabled={isPrewarming}
            className="text-lg lg:text-xl xl:text-2xl px-12 lg:px-16 py-4 lg:py-6 touch-button animate-float z-30"
          >
            {isPrewarming 
              ? (language === 'pl' ? 'Przygotowuję AI...' : 'Preparing AI...')
              : texts.button
            }
          </GlassButton>
        </div>
      )}
    </div>
  );
};

export default LandingScreen;