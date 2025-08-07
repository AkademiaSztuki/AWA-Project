"use client";

import React, { useState } from 'react';
import { GlassCard, GlassButton } from '@/components/ui';
import { useRouter } from 'next/navigation';
import { AwaDialogue } from '@/components/awa/AwaDialogue';
import { usePathname } from 'next/navigation';
import { Palette, Home, Sparkles } from 'lucide-react';
import { stopAllDialogueAudio } from '@/hooks/useAudioManager';

const LandingScreen: React.FC = () => {
  const router = useRouter();
  const [showAuraSection, setShowAuraSection] = useState(false);

  const handleDialogueEnd = () => {
    // Dodaj opóźnienie 1 sekundy przed pokazaniem okna AURA
    setTimeout(() => {
      setShowAuraSection(true);
    }, 1500);
  };

  const pathname = typeof window !== "undefined" ? window.location.pathname : "";
  const isLanding = pathname === '/';

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
              <h1 className="text-5xl font-nasalization text-gray-800 mb-6 animate-pulse-slow">
                AURA
              </h1>
              <p className="text-xl text-gray-700 font-modern mb-4 leading-relaxed">
                Poznaj swoją futurystyczną asystentkę projektowania wnętrz
              </p>
              <p className="text-lg text-gray-600 font-modern leading-relaxed mb-8">
                Razem odkryjemy Twoje preferencje designerskie i stworzymy wizualizacje Twoich marzeń.
                AWA wykorzystuje najnowsze technologie AI, aby pomóc Ci zrozumieć własny gust estetyczny.
              </p>
              <div className="mb-8">
                <h2 className="text-2xl font-nasalization text-gold-700 mb-4">
                  Czego się dowiesz?
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm font-modern">
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
                onClick={() => {
                  stopAllDialogueAudio(); // Zatrzymaj dźwięk przed nawigacją
                  router.push('/flow/onboarding');
                }}
                className="text-xl px-12 py-4 animate-float mb-4"
              >
                Rozpocznij Podróż z AWA
              </GlassButton>
              <p className="text-sm text-gray-500 mt-4 font-modern">
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