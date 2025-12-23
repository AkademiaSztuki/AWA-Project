'use client';

import React, { useState } from 'react';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';
import { getPlanCredits, PlanId, BillingPeriod } from '@/lib/stripe';

interface SubscriptionPlansProps {
  userHash: string;
  onSelectPlan?: (planId: PlanId, billingPeriod: BillingPeriod) => void;
  className?: string;
}

const PLAN_NAMES: Record<PlanId, string> = {
  basic: 'Basic',
  pro: 'Pro',
  studio: 'Studio',
};

const PLAN_DESCRIPTIONS: Record<PlanId, string> = {
  basic: 'Idealny dla początkujących',
  pro: 'Dla profesjonalistów',
  studio: 'Najlepszy wybór dla studiów',
};

const PLAN_PRICES: Record<PlanId, { monthly: number; yearly: number }> = {
  basic: { monthly: 20, yearly: 200 },
  pro: { monthly: 45, yearly: 450 },
  studio: { monthly: 69, yearly: 690 },
};

export function SubscriptionPlans({ userHash, onSelectPlan, className }: SubscriptionPlansProps) {
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>('monthly');
  const [loading, setLoading] = useState<string | null>(null);
  const [configError, setConfigError] = useState<string | null>(null);

  // Price IDs są sprawdzane po stronie serwera (w API route)
  // Po stronie klienta używamy tylko kredytów
  React.useEffect(() => {
    setConfigError(null);
  }, [billingPeriod]);

  const handleSelectPlan = async (planId: PlanId) => {
    if (!userHash) return;

    setLoading(`${planId}-${billingPeriod}`);
    try {
      const response = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userHash,
          planId,
          billingPeriod,
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
      
      // W development: pokaż opcję ręcznego przydzielenia kredytów
      if (process.env.NODE_ENV === 'development' && window.confirm(
        'Błąd podczas tworzenia sesji płatności.\n\n' +
        'W trybie development możesz ręcznie przydzielić kredyty do testów.\n' +
        'Czy chcesz przydzielić kredyty testowe?'
      )) {
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
            alert(`Przydzielono ${testData.credits} kredytów testowych!\nOdśwież stronę aby zobaczyć zmiany.`);
            window.location.reload();
          } else {
            alert('Błąd podczas przydzielania kredytów testowych: ' + testData.error);
          }
        } catch (testError) {
          console.error('Error allocating test credits:', testError);
        }
      } else {
        alert('Wystąpił błąd podczas tworzenia sesji płatności. Spróbuj ponownie.');
      }
    } finally {
      setLoading(null);
    }
  };

  const plans: PlanId[] = ['basic', 'pro', 'studio'];

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="flex justify-center gap-4 mb-8">
        <button
          onClick={() => setBillingPeriod('monthly')}
          className={`px-6 py-3 rounded-xl font-exo2 font-semibold transition-all ${
            billingPeriod === 'monthly'
              ? 'bg-gold-400/20 border-2 border-gold-400 text-gray-900'
              : 'bg-white/10 border-2 border-white/20 text-gray-700 hover:bg-white/20'
          }`}
        >
          Miesięcznie
        </button>
        <button
          onClick={() => setBillingPeriod('yearly')}
          className={`px-6 py-3 rounded-xl font-exo2 font-semibold transition-all ${
            billingPeriod === 'yearly'
              ? 'bg-gold-400/20 border-2 border-gold-400 text-gray-900'
              : 'bg-white/10 border-2 border-white/20 text-gray-700 hover:bg-white/20'
          }`}
        >
          Rocznie
          <span className="ml-2 text-sm text-gold-600">(2 miesiące gratis)</span>
        </button>
      </div>

      {configError ? (
        <GlassCard className="p-8">
          <div className="text-center space-y-4">
            <h3 className="text-2xl font-exo2 font-bold text-gray-900">
              Konfiguracja w toku
            </h3>
            <p className="text-gray-600 font-modern">
              {configError}
            </p>
            <p className="text-sm text-gray-500 font-modern">
              Utwórz produkty w Stripe Dashboard i dodaj Price IDs do .env.local
            </p>
            <p className="text-xs text-gray-400 font-modern mt-4">
              Szczegóły w pliku: <code className="bg-white/10 px-2 py-1 rounded">STRIPE_LOCAL_TESTING.md</code>
            </p>
          </div>
        </GlassCard>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((planId) => {
            const credits = getPlanCredits(planId, billingPeriod);
            const price = PLAN_PRICES[planId][billingPeriod];
          const monthlyPrice = billingPeriod === 'yearly' ? price / 12 : price;
          const isPopular = planId === 'pro';

          return (
            <GlassCard
              key={planId}
              variant={isPopular ? 'highlighted' : 'default'}
              className={`p-6 relative ${isPopular ? 'border-gold-400/60' : ''}`}
            >
              {isPopular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <span className="bg-gold-400 text-gray-900 px-4 py-1 rounded-full text-sm font-exo2 font-bold">
                    Najpopularniejszy
                  </span>
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <h3 className="text-2xl font-exo2 font-bold text-gray-900 mb-1">
                    {PLAN_NAMES[planId]}
                  </h3>
                  <p className="text-sm text-gray-600 font-modern">
                    {PLAN_DESCRIPTIONS[planId]}
                  </p>
                </div>

                <div className="py-4 border-t border-b border-white/20">
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-exo2 font-bold text-gray-900">
                      ${price}
                    </span>
                    <span className="text-sm text-gray-600 font-modern">
                      /{billingPeriod === 'monthly' ? 'miesiąc' : 'rok'}
                    </span>
                  </div>
                  {billingPeriod === 'yearly' && (
                    <p className="text-xs text-gray-500 mt-1 font-modern">
                      ${monthlyPrice.toFixed(2)}/miesiąc
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-exo2 font-bold text-gray-900">
                      {credits.toLocaleString()}
                    </span>
                    <span className="text-sm text-gray-600 font-modern">kredytów</span>
                  </div>
                  <div className="text-sm text-gray-600 font-modern">
                    = {Math.floor(credits / 10).toLocaleString()} generacji
                  </div>
                </div>

                <GlassButton
                  onClick={() => handleSelectPlan(planId)}
                  disabled={loading === `${planId}-${billingPeriod}`}
                  className="w-full"
                  variant="primary"
                >
                  {loading === `${planId}-${billingPeriod}` ? 'Przetwarzanie...' : 'Wybierz plan'}
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

