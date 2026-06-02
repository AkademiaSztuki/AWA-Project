'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';
import { LoginModal } from '@/components/auth/LoginModal';
import { BillingPeriod, FREE_PLAN_CREDITS, getPlanCredits, PLAN_PRICES, PlanId } from '@/lib/stripe';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { creditsAuthHeaders } from '@/lib/credits-request-headers';
import { GOOGLE_AUTH_USER_ID_STORAGE_KEY } from '@/lib/auth-storage-keys';
import { fetchFoundersProgramStatus } from '@/lib/founders-program';

interface SubscriptionPlansProps {
  userHash?: string;
  onSelectPlan?: (planId: PlanId, billingPeriod: BillingPeriod) => void;
  className?: string;
}

const PATH_AFTER_FREE_TRY = '/flow/path-selection';
const FOUNDERS_LAUNCH_SLOTS = 1000;

function resolveClientAuthUserId(userId: string | undefined): string | undefined {
  if (userId?.trim()) return userId.trim();
  if (typeof window === 'undefined') return undefined;
  return localStorage.getItem(GOOGLE_AUTH_USER_ID_STORAGE_KEY)?.trim() || undefined;
}

function formatCheckoutErrorMessage(
  status: number,
  apiError: string | undefined,
  t: (pl: string, en: string) => string,
): string {
  if (status === 401) {
    return t(
      'Zaloguj się na konto IDA, aby przejść do płatności.',
      'Sign in to your IDA account to continue to payment.',
    );
  }
  if (apiError?.includes('STRIPE_PRICE_') || apiError?.includes('Price ID')) {
    return t(
      'Płatności są chwilowo niedostępne (konfiguracja Stripe). Spróbuj za chwilę lub napisz do nas.',
      'Payments are temporarily unavailable (Stripe configuration). Try again soon or contact us.',
    );
  }
  if (apiError?.includes('STRIPE_SECRET_KEY')) {
    return t(
      'Płatności nie są jeszcze skonfigurowane w tym środowisku.',
      'Payments are not configured in this environment yet.',
    );
  }
  return (
    apiError ||
    t(
      'Nie udało się otworzyć płatności. Spróbuj ponownie za chwilę.',
      'Could not open checkout. Please try again in a moment.',
    )
  );
}

const PLAN_NAMES: Record<PlanId, string> = {
  basic: 'Basic',
  pro: 'Creator',
  studio: 'Pro',
};

const PLAN_FEATURES: Record<PlanId, { pl: string[]; en: string[] }> = {
  basic: {
    pl: [
      'Pełny flow na zdjęciu Twojego pokoju — od analizy po wizualizacje',
      `${FREE_PLAN_CREDITS.toLocaleString('pl-PL')} kredytów na generowanie i modyfikacje`,
      'Porównywanie wariantów i zapisywanie ulubionych kierunków',
      'Powrót do projektu w dowolnym momencie z panelu',
      'Idealny na start: test stylów, kolorów i nastroju wnętrza',
    ],
    en: [
      'Full flow on your room photo — from analysis to visualizations',
      `${FREE_PLAN_CREDITS.toLocaleString('en-US')} credits for generations and edits`,
      'Compare variants and save directions you like',
      'Return to your project anytime from the dashboard',
      'Perfect to start: test styles, colors, and room mood',
    ],
  },
  pro: {
    pl: [
      'Wszystko z planu Basic, z większą pulą kredytów',
      'Więcej iteracji i modyfikacji jednego wnętrza bez ograniczeń tempa',
      'Wygodna praca nad kilkoma pomieszczeniami w jednym miesiącu',
      'Lepszy wybór, gdy projektujesz cały pokój „na serio”',
      'Priorytetowe tempo generacji w ramach limitu kredytów',
    ],
    en: [
      'Everything in Basic, with a larger credit pool',
      'More iterations and edits for one room without rushing',
      'Comfortable work across several rooms in one month',
      'A better fit when you are seriously shaping a space',
      'Steady generation pace within your credit allowance',
    ],
  },
  studio: {
    pl: [
      'Najwyższa pula kredytów na intensywną pracę projektową',
      'Swobodne testowanie wielu wersji całego mieszkania',
      'Miejsce na eksperymenty, dopracowanie detali i inspiracje',
      'Dla osób, które chcą prowadzić cały proces w IDA bez kompromisów',
      'Najlepszy stosunek kredytów do ceny przy dużym wolumenie',
    ],
    en: [
      'The largest credit pool for intensive design work',
      'Freely test many versions across your home',
      'Room for experiments, detail refinement, and inspirations',
      'For anyone running the full IDA process without compromise',
      'Best credits-to-price ratio at high volume',
    ],
  },
};

export function SubscriptionPlans({ userHash: userHashProp, onSelectPlan, className }: SubscriptionPlansProps) {
  const router = useRouter();
  const { user } = useAuth();
  const { language } = useLanguage();
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>('monthly');
  const [loading, setLoading] = useState<string | null>(null);
  const [configError, setConfigError] = useState<string | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [foundersOpen, setFoundersOpen] = useState(true);
  const [loginOpen, setLoginOpen] = useState(false);
  const [loginRedirectPath, setLoginRedirectPath] = useState(PATH_AFTER_FREE_TRY);
  const [pendingCheckoutPlanId, setPendingCheckoutPlanId] = useState<PlanId | null>(null);
  const [storedUserHash, setStoredUserHash] = useState('');
  const userHash =
    userHashProp?.trim() ||
    storedUserHash ||
    (typeof window !== 'undefined' ? localStorage.getItem('aura_user_hash')?.trim() : '') ||
    '';
  const currency = language === 'pl' ? 'pln' : 'usd';
  const locale = language === 'pl' ? 'pl-PL' : 'en-US';
  const t = (pl: string, en: string) => (language === 'pl' ? pl : en);

  const formatPrice = (price: number) =>
    new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency.toUpperCase(),
      maximumFractionDigits: 0,
    }).format(price);

  const formatCredits = (n: number) => n.toLocaleString(locale);

  React.useEffect(() => {
    setConfigError(null);
    setCheckoutError(null);
  }, [billingPeriod, currency]);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    setStoredUserHash(localStorage.getItem('aura_user_hash')?.trim() || '');
  }, [user]);

  React.useEffect(() => {
    let cancelled = false;
    fetchFoundersProgramStatus().then((status) => {
      if (!cancelled) setFoundersOpen(status.open);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const openLoginForCheckout = (planId: PlanId) => {
    setPendingCheckoutPlanId(planId);
    setLoginRedirectPath('/subscription/plans');
    setLoginOpen(true);
  };

  const openLoginForFreeTry = () => {
    setPendingCheckoutPlanId(null);
    setLoginRedirectPath(PATH_AFTER_FREE_TRY);
    setLoginOpen(true);
  };

  const handleSelectPlan = async (planId: PlanId, options?: { skipLoginGate?: boolean }) => {
    setCheckoutError(null);

    const authUserId = resolveClientAuthUserId(user?.id);
    if (!options?.skipLoginGate && !authUserId) {
      openLoginForCheckout(planId);
      return;
    }

    if (!userHash?.trim()) {
      setCheckoutError(
        t(
          'Brak sesji użytkownika. Zaloguj się lub odśwież stronę.',
          'Missing user session. Sign in or refresh the page.',
        ),
      );
      openLoginForCheckout(planId);
      return;
    }

    onSelectPlan?.(planId, billingPeriod);
    setLoading(`${planId}-${billingPeriod}`);
    try {
      const response = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...creditsAuthHeaders() },
        body: JSON.stringify({
          userHash,
          authUserId,
          planId,
          billingPeriod,
          currency,
          successUrl: `${window.location.origin}/subscription/success`,
          cancelUrl: `${window.location.origin}/subscription/cancel`,
        }),
      });

      const data = (await response.json().catch(() => ({}))) as {
        url?: string;
        error?: string;
      };

      if (!response.ok) {
        const message = formatCheckoutErrorMessage(response.status, data.error, t);
        setCheckoutError(message);
        if (response.status === 401) {
          openLoginForCheckout(planId);
        }
        return;
      }

      if (data.url) {
        window.location.href = data.url;
        return;
      }

      setCheckoutError(
        t(
          'Stripe nie zwrócił linku do płatności. Spróbuj ponownie.',
          'Stripe did not return a checkout link. Please try again.',
        ),
      );
    } catch (error) {
      console.error('Error creating checkout session:', error);
      setCheckoutError(
        t(
          'Błąd połączenia z serwerem płatności. Sprawdź internet i spróbuj ponownie.',
          'Could not reach the payment server. Check your connection and try again.',
        ),
      );

      if (process.env.NODE_ENV === 'development' && userHash) {
        const tryTest = window.confirm(
          `${t('Błąd checkout (dev).', 'Checkout error (dev).')}\n\n` +
            t('Przydzielić limity testowe lokalnie?', 'Allocate test limits locally?'),
        );
        if (tryTest) {
          try {
            const testResponse = await fetch('/api/test/allocate-credits', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ userHash, planId, billingPeriod }),
            });
            const testData = await testResponse.json();
            if (testData.success) {
              setCheckoutError(
                t(
                  'Przydzielono limity testowe (dev). Odśwież stronę.',
                  'Test limits allocated (dev). Refresh the page.',
                ),
              );
            } else {
              setCheckoutError(`${t('Dev:', 'Dev:')} ${testData.error || 'allocate failed'}`);
            }
          } catch (testError) {
            console.error('Error allocating test limits:', testError);
          }
        }
      }
    } finally {
      setLoading(null);
    }
  };

  const handleTryBasicFree = () => {
    if (user?.id || resolveClientAuthUserId(undefined)) {
      router.push(PATH_AFTER_FREE_TRY);
      return;
    }
    openLoginForFreeTry();
  };

  const handleLoginSuccess = () => {
    setLoginOpen(false);
    const planToResume = pendingCheckoutPlanId;
    setPendingCheckoutPlanId(null);
    if (planToResume) {
      void handleSelectPlan(planToResume, { skipLoginGate: true });
      return;
    }
    if (loginRedirectPath) {
      router.push(loginRedirectPath);
    }
  };

  const plans: PlanId[] = ['basic', 'pro', 'studio'];
  const showBasicLaunchOffer = foundersOpen && billingPeriod === 'monthly';

  return (
    <div className={`space-y-6 ${className}`}>
      {checkoutError ? (
        <div
          className="rounded-xl border border-red-300/80 bg-red-50/90 px-4 py-3 text-sm text-red-900 font-modern"
          role="alert"
        >
          {checkoutError}
        </div>
      ) : null}

      <div className="flex justify-center gap-4 mb-2">
        <button
          type="button"
          onClick={() => setBillingPeriod('monthly')}
          className={`px-6 py-3 rounded-xl font-exo2 font-semibold transition-all ${
            billingPeriod === 'monthly'
              ? 'bg-gold-400/20 border-2 border-gold-400 text-gray-900'
              : 'bg-white/10 border-2 border-white/20 text-gray-700 hover:bg-white/20'
          }`}
        >
          {t('Miesięcznie', 'Monthly')}
        </button>
        <button
          type="button"
          onClick={() => setBillingPeriod('yearly')}
          className={`px-6 py-3 rounded-xl font-exo2 font-semibold transition-all ${
            billingPeriod === 'yearly'
              ? 'bg-gold-400/20 border-2 border-gold-400 text-gray-900'
              : 'bg-white/10 border-2 border-white/20 text-gray-700 hover:bg-white/20'
          }`}
        >
          {t('Rocznie', 'Yearly')}
          <span className="ml-2 text-sm text-gold-600">
            {t('(2 miesiące gratis)', '(2 months free)')}
          </span>
        </button>
      </div>

      {configError ? (
        <GlassCard className="p-8">
          <div className="text-center space-y-4">
            <h3 className="text-2xl font-exo2 font-bold text-gray-900">
              {t('Konfiguracja w toku', 'Configuration in progress')}
            </h3>
            <p className="text-gray-600 font-modern">{configError}</p>
          </div>
        </GlassCard>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:items-stretch">
          {plans.map((planId) => {
            const credits = getPlanCredits(planId, billingPeriod);
            const price = PLAN_PRICES[currency][planId][billingPeriod];
            const monthlyPrice = billingPeriod === 'yearly' ? price / 12 : price;
            const isPopular = planId === 'pro';
            const isBasicLaunch = planId === 'basic' && showBasicLaunchOffer;
            const bullets = PLAN_FEATURES[planId][language];
            const creditsLabel =
              billingPeriod === 'monthly'
                ? t('kredytów / miesiąc', 'credits / month')
                : t('kredytów / rok', 'credits / year');

            const cardVariant = isBasicLaunch || isPopular ? 'highlighted' : 'default';
            const cardBorder = isBasicLaunch
              ? 'border-gold-400/70 ring-1 ring-gold-400/30'
              : isPopular
                ? 'border-gold-400/60'
                : '';

            return (
              <GlassCard
                key={planId}
                variant={cardVariant}
                className={`p-6 pt-8 relative flex flex-col h-full min-h-[32rem] ${cardBorder}`}
              >
                {isBasicLaunch && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 z-10">
                    <span className="bg-gold-400 text-gray-900 px-4 py-1 rounded-full text-xs sm:text-sm font-exo2 font-bold whitespace-nowrap">
                      {t('Oferta ograniczona ilościowo', 'Limited quantity offer')}
                    </span>
                  </div>
                )}
                {isPopular && !isBasicLaunch && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <span className="bg-gold-400 text-gray-900 px-4 py-1 rounded-full text-sm font-exo2 font-bold">
                      {t('Najpopularniejszy', 'Most popular')}
                    </span>
                  </div>
                )}

                <div className="flex flex-col flex-1 min-h-0">
                  <div className="min-h-[4.25rem] shrink-0">
                    <h3 className="text-2xl font-exo2 font-bold text-gray-900 mb-1">
                      {PLAN_NAMES[planId]}
                    </h3>
                    {isBasicLaunch ? (
                      <p className="text-xs text-gray-600 font-modern leading-relaxed">
                        {t(
                          'Wczesny dostęp — bez karty, bez auto-odnowienia',
                          'Early access — no card, no auto-renewal',
                        )}
                      </p>
                    ) : (
                      <p className="text-xs text-transparent select-none" aria-hidden="true">
                        —
                      </p>
                    )}
                  </div>

                  <div className="py-4 border-t border-b border-white/20 min-h-[9.5rem] shrink-0 flex flex-col justify-center">
                    {isBasicLaunch ? (
                      <div className="space-y-1.5">
                        <div className="flex items-baseline gap-2 flex-wrap">
                          <span className="text-lg font-modern text-gray-500 line-through">
                            {formatPrice(price)}
                          </span>
                          <span className="text-xs font-modern text-gray-500">
                            /{t('miesiąc', 'month')}
                          </span>
                        </div>
                        <div className="flex items-baseline gap-2">
                          <span className="text-4xl font-exo2 font-bold text-gray-900">
                            {t('Za darmo', 'Free')}
                          </span>
                        </div>
                        <p className="text-sm text-gold-900/95 font-modern font-semibold leading-snug">
                          {t(
                            `Dla pierwszych ${FOUNDERS_LAUNCH_SLOTS} użytkowników`,
                            `For the first ${FOUNDERS_LAUNCH_SLOTS} users`,
                          )}
                        </p>
                        <p className="text-xs text-gray-700 font-modern">
                          {t(
                            'Pakiet powitalny po weryfikacji konta',
                            'Welcome pack after account verification',
                          )}
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <div className="flex items-baseline gap-2">
                          <span className="text-4xl font-exo2 font-bold text-gray-900">
                            {formatPrice(price)}
                          </span>
                          <span className="text-sm text-gray-600 font-modern">
                            /{billingPeriod === 'monthly' ? t('miesiąc', 'month') : t('rok', 'year')}
                          </span>
                        </div>
                        {billingPeriod === 'yearly' ? (
                          <p className="text-xs text-gray-500 font-modern">
                            {formatPrice(monthlyPrice)}/{t('miesiąc', 'month')}
                          </p>
                        ) : (
                          <p className="text-xs text-transparent select-none" aria-hidden="true">
                            —
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex-1 flex flex-col space-y-3 py-4 min-h-0">
                    <div className="flex items-baseline gap-2 flex-wrap shrink-0">
                      <span className="text-lg font-exo2 font-bold text-gray-900">
                        {formatCredits(credits)}
                      </span>
                      <span className="text-sm text-gray-600 font-modern">{creditsLabel}</span>
                    </div>
                    <ul className="space-y-2.5 text-sm text-gray-700 font-modern list-disc pl-5 flex-1">
                      {bullets.map((line) => (
                        <li key={line}>{line}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                <GlassButton
                    onClick={isBasicLaunch ? handleTryBasicFree : () => handleSelectPlan(planId)}
                    disabled={!isBasicLaunch && loading === `${planId}-${billingPeriod}`}
                    className="w-full shrink-0 mt-auto"
                    variant="primary"
                  >
                    {!isBasicLaunch && loading === `${planId}-${billingPeriod}`
                      ? t('Przetwarzanie...', 'Processing...')
                      : isBasicLaunch
                        ? t('Wypróbuj za darmo', 'Try for free')
                        : t('Wybierz plan', 'Choose plan')}
                </GlassButton>
              </GlassCard>
            );
          })}
        </div>
      )}

      <p className="text-center text-xs text-gray-500 font-modern max-w-lg mx-auto">
        {t(
          'Masz kod rabatowy? Wpisz go w standardowym polu przy płatności Stripe — w kolejnym kroku po wyborze planu.',
          'Have a discount code? Enter it in the promo field at Stripe checkout — on the next step after choosing a plan.',
        )}
      </p>

      <LoginModal
        isOpen={loginOpen}
        onClose={() => {
          setLoginOpen(false);
          setPendingCheckoutPlanId(null);
        }}
        onSuccess={handleLoginSuccess}
        redirectPath={loginRedirectPath}
        title={{
          pl: pendingCheckoutPlanId
            ? 'Zaloguj się, aby opłacić plan'
            : 'Załóż konto lub zaloguj się',
          en: pendingCheckoutPlanId
            ? 'Sign in to complete your purchase'
            : 'Create an account or sign in',
        }}
        message={
          pendingCheckoutPlanId
            ? t(
                'Do płatności Stripe potrzebujemy zweryfikowanego konta powiązanego z Twoją sesją.',
                'We need a verified account linked to your session before Stripe checkout.',
              )
            : t(
                'Po rejestracji i weryfikacji e-maila możesz skorzystać z oferty na start i przejść do projektowania.',
                'After sign-up and email verification you can use the launch offer and start designing.',
              )
        }
      />
    </div>
  );
}
