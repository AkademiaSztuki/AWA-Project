"use client";

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { GlassCard } from '@/components/ui/GlassCard';
import { useSessionData } from '@/hooks/useSessionData';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { LoginModal } from '@/components/auth/LoginModal';
import { stopAllDialogueAudio } from '@/hooks/useAudioManager';
import { AwaDialogue } from '@/components/awa/AwaDialogue';
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
  const searchParams = useSearchParams();
  const { language } = useLanguage();
  const { updateSessionData } = useSessionData();
  const { user, isLoading: authLoading } = useAuth();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [pendingPath, setPendingPath] = useState<'fast' | 'full' | null>(null);

  // #region agent log
  React.useEffect(() => {
    void fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: 'debug-session',
        runId: 'auth-check',
        hypothesisId: 'A0',
        location: 'PathSelectionScreen.tsx:component-render',
        message: 'PathSelectionScreen rendered',
        data: {
          hasUser: !!user,
          userId: user?.id || null,
          authLoading,
          showLoginModal,
          pendingPath
        },
        timestamp: Date.now()
      })
    }).catch(() => {});
  }, [user, authLoading, showLoginModal, pendingPath]);
  // #endregion

  const fastCompleted = searchParams.get('fast_completed') === 'true';
  
  const pathTexts = {
    pl: {
      title: 'Wybierz Swoją Ścieżkę',
      subtitle: 'Zdecyduj jak chcesz doświadczyć',
      ida: 'IDA',
      subtext: '- szybko czy dogłębnie',
      fastCompletedTitle: 'Ukończyłeś szybką ścieżkę! 🎉',
      fastCompletedMessage: 'Chcesz głębsze doświadczenie? Wypróbuj pełną ścieżkę, która bierze pod uwagę Twoje preferencje, styl życia i potrzeby, aby stworzyć jeszcze bardziej spersonalizowane wnętrze.',
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
      fastCompletedTitle: 'You completed the fast track! 🎉',
      fastCompletedMessage: 'Want a deeper experience? Try the full path, which uses your personality, preferences, and lifestyle to create an even more personalized interior.',
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

    // #region agent log
    void fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: 'debug-session',
        runId: 'auth-check',
        hypothesisId: 'A1',
        location: 'PathSelectionScreen.tsx:handlePathSelection',
        message: 'Path selection attempted',
        data: {
          pathType,
          isAuthenticated: !!user,
          authLoading,
          userObject: user ? { id: user.id, email: user.email } : null
        },
        timestamp: Date.now()
      })
    }).catch(() => {});
    // #endregion

    // Wait for auth to finish loading
    if (authLoading) {
      // #region agent log
      void fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: 'debug-session',
          runId: 'auth-check',
          hypothesisId: 'A1a',
          location: 'PathSelectionScreen.tsx:handlePathSelection',
          message: 'Auth still loading - waiting',
          data: {
            pathType
          },
          timestamp: Date.now()
        })
      }).catch(() => {});
      // #endregion
      return; // Wait for auth to finish
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
          hypothesisId: 'A2',
          location: 'PathSelectionScreen.tsx:handlePathSelection',
          message: 'User not authenticated - showing login modal',
          data: {
            pathType
          },
          timestamp: Date.now()
        })
      }).catch(() => {});
      // #endregion

      // Store the selected path and determine destination
      setPendingPath(pathType);
      
      // Determine destination path based on selection
      const destinationPath = pathType === 'fast' ? '/flow/onboarding' : '/setup/profile';
      
      // Update URL with redirect parameter so ProtectedRoute knows where to go after login
      // Use router to update URL so searchParams updates properly
      router.push(`${window.location.pathname}?redirect=${encodeURIComponent(destinationPath)}&auth=required`);
      
      // Show login modal - this will handle the redirect after login
      setShowLoginModal(true);
      return;
    }

    // User is authenticated, proceed with path selection
    // #region agent log
    void fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: 'debug-session',
        runId: 'auth-check',
        hypothesisId: 'A3',
        location: 'PathSelectionScreen.tsx:handlePathSelection',
        message: 'User authenticated - proceeding with path selection',
        data: {
          pathType,
          userId: user?.id
        },
        timestamp: Date.now()
      })
    }).catch(() => {});
    // #endregion

    if (pathType === 'fast') {
      await updateSessionData({ pathType: 'fast', currentStep: 'onboarding' });
      console.log('[PathSelection] Fast track selected');
      router.push('/flow/onboarding');
    } else {
      await updateSessionData({ pathType: 'full' });
      console.log('[PathSelection] Full experience selected');
      router.push('/setup/profile');
    }
  };

  // Handle successful login - continue with pending path
  const handleLoginSuccess = async () => {
    // #region agent log
    void fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: 'debug-session',
        runId: 'auth-check',
        hypothesisId: 'A4',
        location: 'PathSelectionScreen.tsx:handleLoginSuccess',
        message: 'Login successful - continuing with pending path',
        data: {
          pendingPath,
          redirectFromUrl: searchParams.get('redirect')
        },
        timestamp: Date.now()
      })
    }).catch(() => {});
    // #endregion

    setShowLoginModal(false);
    
    // Check if redirect is in URL (set by handlePathSelection or middleware)
    // Also check window.location.search in case searchParams hasn't updated yet
    const urlParams = new URLSearchParams(window.location.search);
    const redirectPath = urlParams.get('redirect') || searchParams.get('redirect');
    
    if (redirectPath) {
      // Use redirect from URL (set when path was selected)
      setTimeout(async () => {
        // Determine pathType from redirect path
        const pathType = redirectPath.includes('/flow/onboarding') ? 'fast' : 'full';
        if (pathType === 'fast') {
          await updateSessionData({ pathType: 'fast', currentStep: 'onboarding' });
        } else {
          await updateSessionData({ pathType: 'full' });
        }
        console.log('[PathSelection] Redirecting to:', redirectPath);
        router.push(redirectPath);
        setPendingPath(null);
      }, 500);
    } else if (pendingPath) {
      // Fallback to pendingPath if no redirect in URL
      setTimeout(async () => {
        if (pendingPath === 'fast') {
          await updateSessionData({ pathType: 'fast', currentStep: 'onboarding' });
          console.log('[PathSelection] Fast track selected after login');
          router.push('/flow/onboarding');
        } else {
          await updateSessionData({ pathType: 'full' });
          console.log('[PathSelection] Full experience selected after login');
          router.push('/setup/profile');
        }
        setPendingPath(null);
      }, 500);
    }
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
          hypothesisId: 'A5',
          location: 'PathSelectionScreen.tsx:useEffect-auth-change',
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
      setTimeout(async () => {
        if (pathToContinue === 'fast') {
          await updateSessionData({ pathType: 'fast', currentStep: 'onboarding' });
          console.log('[PathSelection] Fast track selected after login');
          router.push('/flow/onboarding');
        } else {
          await updateSessionData({ pathType: 'full' });
          console.log('[PathSelection] Full experience selected after login');
          router.push('/setup/profile');
        }
        setPendingPath(null);
      }, 500);
    }
  }, [user, showLoginModal, pendingPath, updateSessionData, router]);

  // #region agent log
  // Log render
  React.useEffect(() => {
    void fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: 'debug-session',
        runId: 'auth-check',
        hypothesisId: 'A0',
        location: 'PathSelectionScreen.tsx:render',
        message: 'PathSelectionScreen rendering',
        data: {
          hasUser: !!user,
          userId: user?.id || null,
          authLoading,
          showLoginModal,
          pendingPath
        },
        timestamp: Date.now()
      })
    }).catch(() => {});
  }, []);
  // #endregion

  return (
    <div className="min-h-screen flex relative">
      {/* Main content area - centered like landing page */}
      <div className="flex-1 ml-[0px] flex flex-col items-center justify-center h-screen p-8">
        <div className="w-full max-w-4xl z-30 mb-32"> {/* Added margin bottom for dialogue */}
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
                  className="p-6 lg:p-8 h-full hover:border-gold/50 transition-all group rounded-2xl"
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
                      <p className="text-xs text-silver-dark font-modern">20-30 min • 50 {language === 'pl' ? 'generacji' : 'generations'}</p>
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

      {/* Dialog IDA na dole - cała szerokość */}
      <div className="fixed bottom-0 left-0 right-0 w-full z-50">
        <AwaDialogue 
          currentStep="path_selection"
          fullWidth={true}
          autoHide={true}
        />
      </div>

      {/* Login Modal */}
      <LoginModal
        isOpen={showLoginModal}
        onClose={() => {
          setShowLoginModal(false);
          setPendingPath(null);
        }}
        onSuccess={handleLoginSuccess}
        message={language === 'pl' 
          ? 'Aby kontynuować, musisz się zalogować.' 
          : 'Please sign in to continue.'}
      />
    </div>
  );
}
