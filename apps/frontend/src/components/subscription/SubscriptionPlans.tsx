'use client';

import React, { useState } from 'react';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';
import { BillingPeriod, CREDITS_PER_IMAGE, FREE_PLAN_CREDITS, getPlanCredits, PLAN_PRICES, PlanId } from '@/lib/stripe';
import { useLanguage } from '@/contexts/LanguageContext';
import { creditsAuthHeaders } from '@/lib/credits-request-headers';

interface SubscriptionPlansProps {
  userHash: string;
  onSelectPlan?: (planId: PlanId, billingPeriod: BillingPeriod) => void;
  className?: string;
}

const PLAN_NAMES: Record<PlanId, string> = {
  basic: 'Starter',
  pro: 'Creator',
  studio: 'Pro',
};

const PLAN_FEATURES: Record<PlanId, { pl: string[]; en: string[] }> = {
  basic: {
    pl: [
      '60 obrazów AI miesięcznie',
      'Dobre do testowania stylów i kolorów',
      'Zapisuj najlepsze pomysły na później',
    ],
    en: [
      '60 AI images per month',
      'Great for testing styles and colors',
      'Save your best ideas for later',
    ],
  },
  pro: {
    pl: [
      '160 obrazów AI miesięcznie',
      'Więcej iteracji i modyfikacji jednego wnętrza',
      'Dobry wybór do kilku pomieszczeń',
    ],
    en: [
      '160 AI images per month',
      'More iterations and edits for one room',
      'A solid fit for several spaces',
    ],
  },
  studio: {
    pl: [
      '320 obrazów AI miesięcznie',
      'Swobodna praca nad całym mieszkaniem',
      'Więcej miejsca na eksperymenty i dopracowanie detali',
    ],
    en: [
      '320 AI images per month',
      'Comfortable pace across a whole home',
      'Room to experiment and refine details',
    ],
  },
};

export function SubscriptionPlans({ userHash, onSelectPlan, className }: SubscriptionPlansProps) {
  const { language } = useLanguage();
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>('monthly');
  const [loading, setLoading] = useState<string | null>(null);
  const [configError, setConfigError] = useState<string | null>(null);
  const currency = language === 'pl' ? 'pln' : 'usd';
  const locale = language === 'pl' ? 'pl-PL' : 'en-US';
  const welcomeImageCount = Math.floor(FREE_PLAN_CREDITS / CREDITS_PER_IMAGE);
  const t = (pl: string, en: string) => (language === 'pl' ? pl : en);

  const formatPrice = (price: number) =>
    new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency.toUpperCase(),
      maximumFractionDigits: 0,
    }).format(price);

  React.useEffect(() => {
    setConfigError(null);
  }, [billingPeriod, currency]);

  const handleSelectPlan = async (planId: PlanId) => {
    if (!userHash) return;

    onSelectPlan?.(planId, billingPeriod);
    setLoading(`${planId}-${billingPeriod}`);
    try {
      const response = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...creditsAuthHeaders() },
        body: JSON.stringify({
          userHash,
          planId,
          billingPeriod,
          currency,
          successUrl: `${window.location.origin}/subscription/success`,
          cancelUrl: `${window.location.origin}/subscription/cancel`,
        }),
      });

      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error('No checkout URL returned');
      }
    } catch (error) {
      console.error('Error creating checkout session:', error);

      if (
        process.env.NODE_ENV === 'development' &&
        window.confirm(
          `${t('Błąd podczas tworzenia sesji płatności.', 'Payment session could not be created.')}\n\n` +
            `${t(
              'W trybie development możesz ręcznie przydzielić limity testowe.',
              'In development mode you can manually allocate test plan limits.',
            )}\n` +
            t('Czy chcesz to zrobić?', 'Do you want to do that?'),
        )
      ) {
        try {
          const testResponse = await fetch('/api/test/allocate-credits', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userHash,
              planId,
              billingPeriod,
            }),
          });
          const testData = await testResponse.json();
          if (testData.success) {
            alert(
              t(
                'Przydzielono limity testowe. Odśwież stronę, aby zobaczyć zmiany.',
                'Test limits allocated. Refresh the page to see changes.',
              ),
            );
            window.location.reload();
          } else {
            alert(
              `${t('Błąd przydziału testowego:', 'Test allocation error:')} ${testData.error}`,
            );
          }
        } catch (testError) {
          console.error('Error allocating test limits:', testError);
        }
      } else {
        alert(
          t(
            'Wystąpił błąd podczas tworzenia sesji płatności. Spróbuj ponownie.',
            'There was an error creating the payment session. Please try again.',
          ),
        );
      }
    } finally {
      setLoading(null);
    }
  };

  const plans: PlanId[] = ['basic', 'pro', 'studio'];

  return (
    <div className={`space-y-6 ${className}`}>
      <div
        className="rounded-2xl border border-gold-400/35 bg-gradient-to-br from-gold-400/10 to-white/40 px-5 py-5 sm:px-6 sm:py-6 shadow-sm"
        role="region"
        aria-label={t('Oferta startowa', 'Launch offer')}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
          <div className="space-y-2">
            <span className="inline-flex items-center rounded-full bg-gold-400/90 px-3 py-1 text-xs font-exo2 font-bold uppercase tracking-wide text-gray-900">
              {t('Tylko na start', 'Launch perk')}
            </span>
            <h2 className="text-xl font-exo2 font-bold text-gray-900 sm:text-2xl">
              {t(
                `${welcomeImageCount} obrazów AI gratis przy rejestracji`,
                `Get ${welcomeImageCount} AI images free when you sign up`,
              )}
            </h2>
            <p className="text-sm text-gray-700 font-modern sm:text-base">
              {t(
                'Jednorazowy pakiet powitalny we wczesnym dostępie. Nie odnawia się automatycznie i nie wymaga karty.',
                'A one-time welcome pack during early access. It does not auto-renew and no card is required.',
              )}
            </p>
            <p className="text-sm font-medium text-gray-800 font-modern">
              {t(
                'Dołącz teraz i przetestuj pełny flow na własnym zdjęciu.',
                'Join now and try the full flow on your own photo.',
              )}
            </p>
          </div>
        </div>
      </div>

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
            <p className="text-sm text-gray-500 font-modern">
              {t(
                'Utwórz produkty w Stripe Dashboard i dodaj Price IDs do .env.local',
                'Create products in Stripe Dashboard and add Price IDs to .env.local',
              )}
            </p>
            <p className="text-xs text-gray-400 font-modern mt-4">
              Szczegóły w pliku:{' '}
              <code className="bg-white/10 px-2 py-1 rounded">STRIPE_LOCAL_TESTING.md</code>
            </p>
          </div>
        </GlassCard>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((planId) => {
            const credits = getPlanCredits(planId, billingPeriod);
            const images = Math.floor(credits / CREDITS_PER_IMAGE);
            const price = PLAN_PRICES[currency][planId][billingPeriod];
            const monthlyPrice = billingPeriod === 'yearly' ? price / 12 : price;
            const isPopular = planId === 'pro';
            const bullets = PLAN_FEATURES[planId][language];

            return (
              <GlassCard
                key={planId}
                variant={isPopular ? 'highlighted' : 'default'}
                className={`p-6 relative ${isPopular ? 'border-gold-400/60' : ''}`}
              >
                {isPopular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <span className="bg-gold-400 text-gray-900 px-4 py-1 rounded-full text-sm font-exo2 font-bold">
                      {t('Najpopularniejszy', 'Most popular')}
                    </span>
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <h3 className="text-2xl font-exo2 font-bold text-gray-900 mb-1">
                      {PLAN_NAMES[planId]}
                    </h3>
                  </div>

                  <div className="py-4 border-t border-b border-white/20">
                    <div className="flex items-baseline gap-2">
                      <span className="text-4xl font-exo2 font-bold text-gray-900">
                        {formatPrice(price)}
                      </span>
                      <span className="text-sm text-gray-600 font-modern">
                        /{billingPeriod === 'monthly' ? t('miesiąc', 'month') : t('rok', 'year')}
                      </span>
                    </div>
                    {billingPeriod === 'yearly' && (
                      <p className="text-xs text-gray-500 mt-1 font-modern">
                        {formatPrice(monthlyPrice)}/{t('miesiąc', 'month')}
                      </p>
                    )}
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <span className="text-lg font-exo2 font-bold text-gray-900">
                        {images.toLocaleString(locale)}
                      </span>
                      <span className="text-sm text-gray-600 font-modern">
                        {billingPeriod === 'monthly'
                          ? t('obrazów AI / miesiąc', 'AI images / month')
                          : t('obrazów AI / rok', 'AI images / year')}
                      </span>
                    </div>
                    <ul className="space-y-2 text-sm text-gray-700 font-modern list-disc pl-5">
                      {bullets.map((line) => (
                        <li key={line}>{line}</li>
                      ))}
                    </ul>
                  </div>

                  <GlassButton
                    onClick={() => handleSelectPlan(planId)}
                    disabled={loading === `${planId}-${billingPeriod}`}
                    className="w-full"
                    variant="primary"
                  >
                    {loading === `${planId}-${billingPeriod}`
                      ? t('Przetwarzanie...', 'Processing...')
                      : t('Wybierz plan', 'Choose plan')}
                  </GlassButton>
                </div>
              </GlassCard>
            );
          })}
        </div>
      )}
    </div>
  );
}
