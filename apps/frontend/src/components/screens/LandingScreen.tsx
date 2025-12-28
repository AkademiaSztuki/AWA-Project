"use client";

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { GlassCard, GlassButton } from '@/components/ui';
import { useRouter, useSearchParams } from 'next/navigation';
import { AwaDialogue } from '@/components/awa/AwaDialogue';
import { FlowStep } from '@/types';
import { Zap, Heart, Palette, Home, Sparkles } from 'lucide-react';
import { stopAllDialogueAudio } from '@/hooks/useAudioManager';
import { useModalAPI } from '@/hooks/useModalAPI';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSessionData } from '@/hooks/useSessionData';
import { useAuth } from '@/contexts/AuthContext';
import { useLayout } from '@/contexts/LayoutContext';
import { LoginModal } from '@/components/auth/LoginModal';

const LandingScreen: React.FC = () => {
  const router = useRouter();
  const { language } = useLanguage();
  const { checkHealth } = useModalAPI();
  const { updateSessionData } = useSessionData();
  const { user, isLoading: authLoading } = useAuth();
  const { setHeaderVisible } = useLayout();
  const [showAuraSection, setShowAuraSection] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [pendingPath, setPendingPath] = useState<'fast' | 'full' | null>(null);

  useEffect(() => {
    // Hide header on landing mount - it should only appear after dialogue
    setHeaderVisible(false);
  }, [setHeaderVisible]);

  const handleDialogueEnd = () => {
    // #region agent log
    void fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'audio-debug',hypothesisId:'L1',location:'LandingScreen.tsx:handleDialogueEnd',message:'handleDialogueEnd called',data:{showAuraSection},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    // 500ms delay for quick transition
    setTimeout(() => {
      // #region agent log
      void fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'audio-debug',hypothesisId:'L2',location:'LandingScreen.tsx:handleDialogueEnd-setShow',message:'Setting showAuraSection to true',data:{},timestamp:Date.now()})}).catch(()=>{});
      // #endregion
      setShowAuraSection(true);
      setHeaderVisible(true);
    }, 500);
  };

  return (
    <div className="min-h-screen flex flex-col relative overflow-x-hidden">
      {/* Dialogue Area - Always Mounted */}
      <div 
        className={`z-50 transition-all duration-1000 ${
          showAuraSection 
            ? 'fixed bottom-0 left-0 right-0 w-full h-[180px] sm:h-[220px] lg:h-[260px]' 
            : 'fixed inset-0 flex items-center justify-center pointer-events-none'
        }`}
      >
        <div className={`w-full max-w-4xl mx-auto ${showAuraSection ? 'p-4' : ''}`}>
          <div className="pointer-events-auto w-full">
            <AwaDialogue 
              key="landing-dialogue"
              currentStep={showAuraSection ? "path_selection" : "landing"}
              onDialogueEnd={!showAuraSection ? handleDialogueEnd : undefined}
              fullWidth={showAuraSection}
              autoHide={showAuraSection}
            />
          </div>
        </div>
      </div>

      {/* Path Selection Buttons */}
      <div className={`flex-1 transition-opacity duration-1000 ${showAuraSection ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        {showAuraSection && (
          <div className="flex flex-col items-center justify-center min-h-screen p-4 pb-48 sm:pb-64 lg:pb-[280px]">
            <div className="w-full max-w-4xl z-30">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="space-y-4 sm:space-y-6 md:space-y-8"
              >
                {/* Header */}
                <div className="text-center mb-4 sm:mb-6 md:mb-8">
                  <h2 className="text-xl sm:text-2xl lg:text-3xl font-nasalization text-graphite mb-2 sm:mb-3">
                    {language === 'pl' ? 'Wybierz Swoją Ścieżkę' : 'Choose Your Path'}
                  </h2>
                  <p className="text-sm sm:text-base lg:text-lg text-silver-dark font-modern">
                    {language === 'pl' ? 'Zdecyduj jak chcesz doświadczyć ' : 'Decide how you want to experience '}
                    <span className="font-semibold text-gold">IDA</span>
                    {language === 'pl' ? ' - szybko czy dogłębnie' : ' - quick or deep'}
                  </p>
                </div>

                {/* Two path buttons - EQUAL HEIGHT like PathSelectionScreen */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5 md:gap-6">
                  
                  {/* FAST TRACK */}
                  <motion.button
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.6, delay: 0.4 }}
                    whileHover={{ scale: 1.05, y: -5 }}
                    className="text-left w-full"
                    onClick={async () => {
                      stopAllDialogueAudio();
                      if (!user) { 
                        setPendingPath('fast'); 
                        // Just show the modal - LoginModal will handle the redirect via redirectPath prop
                        setShowLoginModal(true); 
                        return; 
                      }
                      await updateSessionData({ pathType: 'fast', currentStep: 'onboarding' });
                      router.push('/flow/onboarding');
                    }}
                  >
                    <GlassCard variant="interactive" className="p-4 sm:p-5 md:p-6 lg:p-8 h-full hover:border-silver/50 transition-all group rounded-xl sm:rounded-2xl">
                      <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                        <div className="w-10 h-10 sm:w-12 sm:h-14 rounded-lg sm:rounded-xl bg-gradient-to-br from-silver to-platinum flex items-center justify-center flex-shrink-0">
                          <Zap size={20} className="sm:w-7 sm:h-7 text-graphite" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="text-lg sm:text-xl lg:text-2xl font-nasalization text-graphite group-hover:text-silver-dark transition-colors">
                            {language === 'pl' ? 'Szybka Ścieżka' : 'Fast Track'}
                          </h3>
                          <p className="text-xs text-silver-dark font-modern">3-5 min • 10 {language === 'pl' ? 'generacji' : 'generations'}</p>
                        </div>
                      </div>
                      <p className="text-xs sm:text-sm text-graphite font-modern">
                        {language === 'pl' ? 'Wypróbuj IDA szybko - prześlij zdjęcie, przesuń kilka inspiracji i generuj!' : 'Try IDA quickly - upload photo, swipe a few inspirations and generate!'}
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
                      if (!user) { 
                        setPendingPath('full'); 
                        // Just show the modal
                        setShowLoginModal(true); 
                        return; 
                      }
                      await updateSessionData({ pathType: 'full' });
                      router.push('/setup/profile');
                    }}
                  >
                    <GlassCard 
                      variant="highlighted"
                      className="p-4 sm:p-5 md:p-6 lg:p-8 h-full hover:border-gold/50 transition-all group rounded-xl sm:rounded-2xl relative overflow-hidden"
                    >
                      <div className="absolute top-2 right-2 sm:top-3 sm:right-3 bg-gradient-to-r from-gold to-champagne text-white px-2 py-0.5 sm:px-3 sm:py-1 rounded-full text-xs font-bold whitespace-nowrap z-10">
                        ✨ {language === 'pl' ? 'Polecane' : 'Recommended'}
                      </div>
                      <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4 pr-16 sm:pr-20">
                        <div className="w-10 h-10 sm:w-12 sm:h-14 rounded-lg sm:rounded-xl bg-gradient-to-br from-gold to-champagne flex items-center justify-center flex-shrink-0">
                          <Heart size={20} className="sm:w-7 sm:h-7 text-white" fill="currentColor" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="text-lg sm:text-xl lg:text-2xl font-nasalization text-graphite group-hover:text-silver-dark transition-colors">
                            {language === 'pl' ? 'Pełne Doświadczenie' : 'Full Experience'}
                          </h3>
                          <p className="text-xs text-silver-dark font-modern">20-30 min • 50 {language === 'pl' ? 'generacji' : 'generations'}</p>
                        </div>
                      </div>
                      <p className="text-xs sm:text-sm text-graphite font-modern">
                        {language === 'pl' ? 'Poznaj siebie głęboko, stwórz wnętrze które jest TWOJE' : 'Let IDA get to know you deeply - create an interior that truly reflects WHO you are'}
                      </p>
                    </GlassCard>
                  </motion.button>
                </div>
              </motion.div>
            </div>
          </div>
        )}
      </div>

      <LoginModal
        isOpen={showLoginModal}
        redirectPath={pendingPath === 'fast' ? '/flow/onboarding' : pendingPath === 'full' ? '/setup/profile' : undefined}
        onClose={() => setShowLoginModal(false)}
      />
    </div>
  );
};

export default LandingScreen;
