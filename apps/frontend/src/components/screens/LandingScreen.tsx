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
          <div className="w-full text-center z-30 max-w-3xl">
            <GlassCard className="w-full p-8 lg:p-12">
              <h1 className="text-3xl lg:text-4xl xl:text-5xl 2xl:text-6xl font-nasalization bg-gradient-to-r from-gold via-champagne to-platinum bg-clip-text text-transparent mb-4 lg:mb-6 animate-pulse-slow">
                {texts.title}
              </h1>
              <p className="text-lg lg:text-xl xl:text-2xl 2xl:text-3xl text-graphite font-modern mb-3 lg:mb-4 leading-relaxed">
                {texts.subtitle}
              </p>
              <p className="text-base lg:text-lg xl:text-xl 2xl:text-2xl text-silver-dark font-modern leading-relaxed mb-6 lg:mb-8">
                {texts.description}
              </p>
              <div className="mb-6 lg:mb-8">
                <h2 className="text-xl lg:text-2xl xl:text-3xl font-nasalization text-gold mb-3 lg:mb-4">
                  {texts.whatYouLearn}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6 text-sm lg:text-base xl:text-lg font-modern">
                  <div className="glass-panel rounded-xl p-4 text-center hover:scale-105 transition-transform">
                    <div className="flex justify-center mb-3">
                      <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-gold to-champagne flex items-center justify-center">
                        <Palette className="w-6 h-6 text-white" />
                      </div>
                    </div>
                    <div className="text-graphite">{texts.dna}</div>
                  </div>
                  <div className="glass-panel rounded-xl p-4 text-center hover:scale-105 transition-transform">
                    <div className="flex justify-center mb-3">
                      <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-400 to-cyan-500 flex items-center justify-center">
                        <Home className="w-6 h-6 text-white" />
                      </div>
                    </div>
                    <div className="text-graphite">{texts.ideal}</div>
                  </div>
                  <div className="glass-panel rounded-xl p-4 text-center hover:scale-105 transition-transform">
                    <div className="flex justify-center mb-3">
                      <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center">
                        <Sparkles className="w-6 h-6 text-white" />
                      </div>
                    </div>
                    <div className="text-graphite">{texts.hidden}</div>
                  </div>
                </div>
              </div>
              <div>
                <h2 className="text-xl lg:text-2xl xl:text-3xl font-nasalization text-gold mb-3 lg:mb-4">
                  {texts.ready}
                </h2>
                <p className="text-base lg:text-lg xl:text-xl 2xl:text-2xl text-graphite font-modern mb-6 lg:mb-8">
                  {texts.readyText}
                </p>
                <GlassButton
                  size="lg"
                  onClick={async () => {
                    try {
                      await Promise.resolve(stopAllDialogueAudio());
                      
                      // PRE-WARM API (non-blocking) - starts loading models NOW
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
                  className="text-lg lg:text-xl xl:text-2xl px-8 lg:px-12 py-3 lg:py-4 xl:py-5 touch-button animate-float mb-3 lg:mb-4"
                >
                  {isPrewarming 
                    ? (language === 'pl' ? 'Przygotowuję AI...' : 'Preparing AI...')
                    : texts.button
                  }
                </GlassButton>
                <p className="text-xs lg:text-sm xl:text-base text-silver-dark mt-3 lg:mt-4 font-modern">
                  {texts.time}
                </p>
              </div>
            </GlassCard>
          </div>
        </div>
      )}
    </div>
  );
};

export default LandingScreen;