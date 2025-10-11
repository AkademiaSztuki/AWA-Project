"use client";

import React, { useEffect, useState } from 'react';
import { GlassCard, GlassButton } from '@/components/ui';
import { useRouter } from 'next/navigation';
import { AwaDialogue } from '@/components/awa/AwaDialogue';
import { Palette, Home, Sparkles } from 'lucide-react';
import { stopAllDialogueAudio } from '@/hooks/useAudioManager';
import { useModalAPI } from '@/hooks/useModalAPI';

const LandingScreen: React.FC = () => {
  const router = useRouter();
  const { checkHealth } = useModalAPI();
  const [showAuraSection, setShowAuraSection] = useState(false);
  const [isPrewarming, setIsPrewarming] = useState(false);

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
            <GlassCard className="w-full p-8">
              <h1 className="text-3xl lg:text-4xl xl:text-5xl 2xl:text-6xl font-nasalization text-gray-800 mb-4 lg:mb-6 animate-pulse-slow">
                AURA
              </h1>
              <p className="text-lg lg:text-xl xl:text-2xl 2xl:text-3xl text-gray-700 font-modern mb-3 lg:mb-4 leading-relaxed">
                Poznaj swoją futurystyczną asystentkę projektowania wnętrz
              </p>
              <p className="text-base lg:text-lg xl:text-xl 2xl:text-2xl text-gray-600 font-modern leading-relaxed mb-6 lg:mb-8">
                Razem odkryjemy Twoje preferencje designerskie i stworzymy wizualizacje Twoich marzeń.
                IDA wykorzystuje najnowsze technologie AI, aby pomóc Ci zrozumieć własny gust estetyczny.
              </p>
              <div className="mb-6 lg:mb-8">
                <h2 className="text-xl lg:text-2xl xl:text-3xl font-nasalization text-gold-700 mb-3 lg:mb-4">
                  Czego się dowiesz?
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 lg:gap-4 text-sm lg:text-base xl:text-lg font-modern">
                  <div className="text-center">
                    <div className="flex justify-center mb-2">
                      <Palette className="w-8 h-8 text-black" />
                    </div>
                    <div>Twoje wizualne DNA</div>
                  </div>
                  <div className="text-center">
                    <div className="flex justify-center mb-2">
                      <Home className="w-8 h-8 text-black" />
                    </div>
                    <div>Idealne wnętrze</div>
                  </div>
                  <div className="text-center">
                    <div className="flex justify-center mb-2">
                      <Sparkles className="w-8 h-8 text-black" />
                    </div>
                    <div>Ukryte preferencje</div>
                  </div>
                </div>
              </div>
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
                    router.push('/flow/onboarding');
                  }
                }}
                disabled={isPrewarming}
                className="text-lg lg:text-xl xl:text-2xl px-8 lg:px-12 py-3 lg:py-4 xl:py-5 touch-button animate-float mb-3 lg:mb-4"
              >
                {isPrewarming ? 'Przygotowuję AI...' : 'Rozpocznij Podróż z IDA'}
              </GlassButton>
              <p className="text-xs lg:text-sm xl:text-base text-gray-500 mt-3 lg:mt-4 font-modern">
                Badanie trwa około 15-20 minut
              </p>
            </GlassCard>
          </div>
        </div>
      )}
    </div>
  );
};

export default LandingScreen;