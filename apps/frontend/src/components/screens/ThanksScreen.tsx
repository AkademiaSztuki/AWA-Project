"use client";

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { GlassCard } from '../ui/GlassCard';
import { GlassButton } from '../ui/GlassButton';
import GlassSurface from '../ui/GlassSurface';
import { useSessionData } from '@/hooks/useSessionData';
import { AwaDialogue } from '@/components/awa';
import { gcpApi } from '@/lib/gcp-api-client';
import { pruneLargeStringsForSessionExport } from '@/lib/prune-session-export';
import { useAuth } from '@/contexts/AuthContext';
import { LoginModal } from '@/components/auth/LoginModal';
import { useLanguage } from '@/contexts/LanguageContext';
import { ArrowLeft } from 'lucide-react';

function pushSessionExportToServer(userHash: string, sessionObject: unknown, approxRawChars: number): void {
  const pruned = pruneLargeStringsForSessionExport(sessionObject);
  try {
    void gcpApi.participants.saveSessionExport(userHash, pruned).then((res) => {
      const prunedChars = JSON.stringify(pruned).length;
      if (!res.ok && res.status !== 503) {
        console.warn('[ThanksScreen] session_export_json save failed:', res.error);
      }
    });
  } catch {
    console.warn('[ThanksScreen] Could not send session export to server');
  }
}

export function ThanksScreen() {
  const router = useRouter();
  const { language } = useLanguage();
  const t = (pl: string, en: string) => (language === 'pl' ? pl : en);
  const { user } = useAuth();
  const { sessionData, isInitialized } = useSessionData();
  const lastAutoSentPayloadRef = useRef<string | null>(null);
  const [loginOpen, setLoginOpen] = useState(false);

  const serializedSession =
    isInitialized && sessionData?.userHash ? JSON.stringify(sessionData, null, 2) : '';

  useEffect(() => {
    if (!isInitialized || !serializedSession) return;
    let hash: string;
    let parsed: unknown;
    try {
      parsed = JSON.parse(serializedSession) as unknown;
      const o = parsed as { userHash?: string };
      hash = typeof o.userHash === 'string' ? o.userHash : '';
    } catch {
      return;
    }
    if (!hash) return;
    if (lastAutoSentPayloadRef.current === serializedSession) return;
    lastAutoSentPayloadRef.current = serializedSession;
    pushSessionExportToServer(hash, parsed, serializedSession.length);
  }, [isInitialized, serializedSession]);

  const goDashboard = () => {
    router.push('/dashboard');
  };

  const goBack = () => {
    router.back();
  };

  const onDashboardClick = () => {
    if (user) {
      goDashboard();
      return;
    }
    setLoginOpen(true);
  };

  const primaryCtaLabel = user
    ? t('Przejdź do panelu', 'Go to dashboard')
    : t('Zaloguj i zapisz profil', 'Log in and save your profile');

  return (
    <div className="flex min-h-[min(72vh,620px)] w-full flex-col">
      <div className="flex flex-1 items-start justify-center px-4 pb-6 pt-4 sm:px-6 sm:pt-6 lg:px-8 lg:pt-8">
        <div className="mx-auto w-full max-w-3xl">
          <GlassCard variant="flatOnMobile" className="w-full rounded-2xl p-5 sm:p-6 md:p-7 lg:border lg:border-white/20 lg:bg-white/10 lg:shadow-xl lg:backdrop-blur-xl">
            <div className="text-center">
              <h1 className="mb-3 font-exo2 text-2xl font-bold leading-tight text-gray-800 sm:text-3xl xl:text-4xl">
                Dziękujemy za wspólną podróż z IDA
              </h1>

              <p className="mx-auto mb-4 max-w-2xl font-modern text-base leading-relaxed text-gray-700 sm:text-lg xl:text-xl">
                Twoje wybory, inspiracje i nastrój stworzyły unikalny profil wnętrza. Dzięki temu
                IDA może podpowiadać rozwiązania bliższe Tobie, Twojemu stylowi i temu, jak chcesz
                czuć się w swojej przestrzeni.
              </p>

              <div className="mx-auto mb-7 max-w-xl font-modern text-sm leading-relaxed text-gray-500 sm:text-base">
                {user ? (
                  <p>
                    {t(
                      'W swoim panelu znajdziesz profil, zapisane dane, projekty i wygenerowane pomysły — możesz do nich wracać w dowolnym momencie.',
                      'In your dashboard you will find your profile, saved data, projects, and generated ideas — you can return to them anytime.'
                    )}
                  </p>
                ) : (
                  <p>
                    {t(
                      'Zaloguj się, aby zapisać swój profil, dane i wygenerowane pomysły. Po zalogowaniu uzyskasz dostęp do swojego panelu i wrócisz do projektu, kiedy tylko zechcesz.',
                      'Sign in to save your profile, data, and generated ideas. After signing in you will get access to your dashboard and can pick up your project whenever you like.'
                    )}
                  </p>
                )}
              </div>

              <div className="mx-auto mt-2 w-full max-w-2xl pt-2 text-left sm:mt-4 sm:pt-4">
                <div className="flex w-full min-w-0 flex-col gap-3 sm:flex-row sm:items-stretch sm:justify-between sm:gap-4">
                  <GlassButton
                    type="button"
                    onClick={goBack}
                    variant="secondary"
                    size="md"
                    className="min-h-[52px] w-full shrink-0 justify-center px-4 py-2.5 text-sm sm:w-auto sm:min-h-0 sm:px-6 sm:py-3 sm:text-base"
                  >
                    <ArrowLeft
                      size={16}
                      className="mr-1.5 shrink-0 sm:mr-2 sm:h-[18px] sm:w-[18px]"
                      aria-hidden="true"
                    />
                    {t('Wstecz', 'Back')}
                  </GlassButton>
                  <div className="flex w-full min-w-0 justify-stretch sm:w-auto sm:shrink-0 sm:justify-end">
                    <GlassSurface
                      width={280}
                      height={52}
                      borderRadius={30}
                      className="flex min-h-[52px] w-full min-w-0 cursor-pointer select-none items-center justify-center rounded-2xl px-3 font-exo2 text-sm font-bold leading-snug text-white shadow-xl transition-transform duration-200 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-gold-400 !w-full max-w-full sm:!w-[280px] sm:px-2 sm:text-base"
                      onClick={onDashboardClick}
                      aria-label={primaryCtaLabel}
                      style={{ opacity: 1 }}
                    >
                      {primaryCtaLabel}
                    </GlassSurface>
                  </div>
                </div>
              </div>
            </div>
          </GlassCard>
        </div>
      </div>

      <div className="w-full">
        <AwaDialogue
          currentStep="thanks"
          fullWidth={true}
          autoHide={true}
        />
      </div>

      <LoginModal
        isOpen={loginOpen}
        onClose={() => setLoginOpen(false)}
        redirectPath="/dashboard"
        onSuccess={() => {
          setLoginOpen(false);
          goDashboard();
        }}
        message={t(
          'Zaloguj się, aby zapisać swój profil, dane i projekty oraz wrócić do nich później w swoim panelu.',
          'Sign in to save your profile, data, and projects and return to them later in your dashboard.'
        )}
      />
    </div>
  );
}
