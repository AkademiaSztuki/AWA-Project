"use client";

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { GlassCard, GlassButton } from '@/components/ui';
import { useRouter, useSearchParams } from 'next/navigation';
import { AwaDialogue } from '@/components/awa/AwaDialogue';
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
  const searchParams = useSearchParams();
  const { language } = useLanguage();
  const { checkHealth } = useModalAPI();
  const { updateSessionData } = useSessionData();
  const { user, isLoading: authLoading } = useAuth();
  const { setHeaderVisible } = useLayout();
  const [showAuraSection, setShowAuraSection] = useState(false);
  const [isPrewarming, setIsPrewarming] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [pendingPath, setPendingPath] = useState<'fast' | 'full' | null>(null);
  const [redirectPath, setRedirectPath] = useState<string | null>(null);

  // Store function references in refs to prevent effect re-runs when they change
  const updateSessionDataRef = React.useRef(updateSessionData);
  const routerRef = React.useRef(router);
  const checkHealthRef = React.useRef(checkHealth);

  // Keep refs up to date
  React.useEffect(() => {
    updateSessionDataRef.current = updateSessionData;
    routerRef.current = router;
    checkHealthRef.current = checkHealth;
  }, [updateSessionData, router, checkHealth]);

  useEffect(() => {
    // Hide header initially
    setHeaderVisible(false);
    return () => setHeaderVisible(true);
  }, [setHeaderVisible]);

  // Check for auth redirect from middleware
  useEffect(() => {
    const authRequired = searchParams.get('auth') === 'required';
    const redirect = searchParams.get('redirect');
    
    if (authRequired && redirect) {
      setRedirectPath(redirect);
      // If user is already logged in, redirect immediately
      if (!authLoading && user) {
        router.push(redirect);
      } else if (!authLoading && !user) {
        // Show login modal
        setShowLoginModal(true);
      }
    }
  }, [searchParams, authLoading, user, router]);

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
      setHeaderVisible(true);
    }, 1500);
  };

  // Watch for auth state changes - if user logs in while modal is open, continue
  useEffect(() => {
    if (user && showLoginModal && pendingPath) {
      // #region agent log
      void fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: 'debug-session',
          runId: 'auth-check',
          hypothesisId: 'L5',
          location: 'LandingScreen.tsx:useEffect-auth-change',
          message: 'User authenticated while modal open - auto-continuing',
          data: {
            pendingPath
          },
          timestamp: Date.now()
        })
      }).catch(() => {});
      // #endregion

      setShowLoginModal(false);
      
      // Small delay to ensure auth state is updated
      const pathToContinue = pendingPath;
      const timeoutId = setTimeout(async () => {
        if (pathToContinue === 'fast') {
          setIsPrewarming(true);
          checkHealthRef.current().catch(() => {});
          await updateSessionDataRef.current({ pathType: 'fast', currentStep: 'onboarding' });
          console.log('[Landing] Fast track selected after login');
          routerRef.current.push('/flow/onboarding');
        } else {
          setIsPrewarming(true);
          checkHealthRef.current().catch(() => {});
          await updateSessionDataRef.current({ pathType: 'full' });
          console.log('[Landing] Full experience selected after login');
          routerRef.current.push('/setup/profile');
        }
        setPendingPath(null);
      }, 500);

      // Cleanup: clear timeout if effect re-runs before timeout completes
      return () => {
        clearTimeout(timeoutId);
      };
    }
  }, [user, showLoginModal, pendingPath]); // Only include state dependencies - function refs stored in refs to prevent unnecessary re-runs

  return (
    <div className="min-h-screen flex relative">

      {!showAuraSection && (
        <div className="flex-1 ml-[0px] flex items-center justify-center h-screen">
          <div className="w-full min-h-[380px] flex items-center justify-center">
            <AwaDialogue currentStep="landing" onDialogueEnd={handleDialogueEnd} />
          </div>
        </div>
      )}
      {showAuraSection && (
        <div className="flex-1 ml-[0px] flex flex-col items-center justify-center h-screen p-8 pt-0">
          <div className="w-full max-w-4xl z-30 -mt-80">
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
                  
                  // #region agent log
                  void fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      sessionId: 'debug-session',
                      runId: 'auth-check',
                      hypothesisId: 'L1',
                      location: 'LandingScreen.tsx:fast-track-click',
                      message: 'Fast track clicked',
                      data: {
                        isAuthenticated: !!user,
                        authLoading
                      },
                      timestamp: Date.now()
                    })
                  }).catch(() => {});
                  // #endregion

                  // Wait for auth to finish loading
                  if (authLoading) {
                    return;
                  }

                  // Check if user is authenticated
                  if (!user) {
                    // #region agent log
                    void fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        sessionId: 'debug-session',
                        runId: 'auth-check',
                        hypothesisId: 'L2',
                        location: 'LandingScreen.tsx:fast-track-click',
                        message: 'User not authenticated - showing login modal',
                        data: {},
                        timestamp: Date.now()
                      })
                    }).catch(() => {});
                    // #endregion

                    setPendingPath('fast');
                    setShowLoginModal(true);
                    return;
                  }

                  // User is authenticated, proceed
                  setIsPrewarming(true);
                  checkHealth().catch(() => {});
                  
                  console.log('[Landing] Navigating to FAST TRACK');
                  await updateSessionData({ pathType: 'fast', currentStep: 'onboarding' });
                  router.push('/flow/onboarding');
                }}
              >
                <GlassCard className="p-6 lg:p-8 h-full hover:border-silver/50 transition-all group rounded-2xl flex flex-col">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-silver to-platinum flex items-center justify-center flex-shrink-0">
                      <Zap size={28} className="text-graphite" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-xl lg:text-2xl font-nasalization text-graphite group-hover:text-silver-dark transition-colors">
                        {language === 'pl' ? 'Szybka Ścieżka' : 'Fast Track'}
                      </h3>
                      <p className="text-xs text-silver-dark font-modern">3-5 min • 5 {language === 'pl' ? 'generacji' : 'generations'}</p>
                    </div>
                  </div>
                  <p className="text-sm text-graphite font-modern leading-relaxed flex-1">
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
                  
                  // #region agent log
                  void fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      sessionId: 'debug-session',
                      runId: 'auth-check',
                      hypothesisId: 'L3',
                      location: 'LandingScreen.tsx:full-experience-click',
                      message: 'Full experience clicked',
                      data: {
                        isAuthenticated: !!user,
                        authLoading
                      },
                      timestamp: Date.now()
                    })
                  }).catch(() => {});
                  // #endregion

                  // Wait for auth to finish loading
                  if (authLoading) {
                    return;
                  }

                  // Check if user is authenticated
                  if (!user) {
                    // #region agent log
                    void fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        sessionId: 'debug-session',
                        runId: 'auth-check',
                        hypothesisId: 'L4',
                        location: 'LandingScreen.tsx:full-experience-click',
                        message: 'User not authenticated - showing login modal',
                        data: {},
                        timestamp: Date.now()
                      })
                    }).catch(() => {});
                    // #endregion

                    setPendingPath('full');
                    setShowLoginModal(true);
                    return;
                  }

                  // User is authenticated, proceed
                  setIsPrewarming(true);
                  checkHealth().catch(() => {});
                  await updateSessionData({ pathType: 'full' });
                  router.push('/setup/profile');
                }}
              >
                <GlassCard 
                  variant="highlighted"
                  className="p-6 lg:p-8 h-full hover:border-gold/50 transition-all group relative overflow-hidden flex flex-col"
                >
                  <div className="absolute top-3 right-3 bg-gradient-to-r from-gold to-champagne text-white px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap z-10">
                    ✨ {language === 'pl' ? 'Polecane' : 'Recommended'}
                  </div>
                  <div className="flex items-center gap-3 mb-4 pr-20">
                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-gold to-champagne flex items-center justify-center flex-shrink-0">
                      <Heart size={28} className="text-white" fill="currentColor" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-xl lg:text-2xl font-nasalization text-graphite group-hover:text-gold-700 transition-colors">
                        {language === 'pl' ? 'Pełne Doświadczenie' : 'Full Experience'}
                      </h3>
                      <p className="text-xs text-silver-dark font-modern">20-30 min • {language === 'pl' ? 'Nieograniczone' : 'Unlimited'}</p>
                    </div>
                  </div>
                  <p className="text-sm text-graphite font-modern leading-relaxed flex-1">
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

      {/* Login Modal */}
      <LoginModal
        isOpen={showLoginModal}
        onClose={() => {
          setShowLoginModal(false);
          setPendingPath(null);
        }}
        onSuccess={async () => {
          setShowLoginModal(false);
          
          // If there's a redirect path from middleware, use it
          if (redirectPath) {
            setTimeout(() => {
              router.push(redirectPath);
              setRedirectPath(null);
            }, 500);
            return;
          }
          
          if (pendingPath) {
            // Small delay to ensure auth state is updated
            setTimeout(async () => {
              if (pendingPath === 'fast') {
                setIsPrewarming(true);
                checkHealth().catch(() => {});
                await updateSessionData({ pathType: 'fast', currentStep: 'onboarding' });
                console.log('[Landing] Fast track selected after login');
                router.push('/flow/onboarding');
              } else {
                setIsPrewarming(true);
                checkHealth().catch(() => {});
                await updateSessionData({ pathType: 'full' });
                console.log('[Landing] Full experience selected after login');
                router.push('/setup/profile');
              }
              setPendingPath(null);
            }, 500);
          }
        }}
        message={language === 'pl' 
          ? 'Aby kontynuować, musisz się zalogować.' 
          : 'Please sign in to continue.'}
      />
    </div>
  );
};

export default LandingScreen;