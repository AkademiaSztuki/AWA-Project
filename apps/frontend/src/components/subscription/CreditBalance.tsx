'use client';

import React, { useEffect, useState } from 'react';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';
import { getCreditBalance, CreditBalance as CreditBalanceType } from '@/lib/credits';
import { supabase } from '@/lib/supabase';

interface CreditBalanceProps {
  userHash: string;
  className?: string;
}

interface Subscription {
  credits_used: number;
  credits_allocated: number;
  subscription_credits_remaining: number;
  stripe_customer_id: string;
  plan_id: string;
  billing_period: string;
  status: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
}

const PLAN_NAMES: Record<string, string> = {
  basic: 'Basic',
  pro: 'Pro',
  studio: 'Studio',
};

export function CreditBalance({ userHash, className }: CreditBalanceProps) {
  const [balance, setBalance] = useState<CreditBalanceType | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [portalLoading, setPortalLoading] = useState(false);

  useEffect(() => {
    if (!userHash) {
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        const [balanceData, subscriptionResponse] = await Promise.all([
          getCreditBalance(userHash),
          supabase
            .from('subscriptions')
            .select('*')
            .eq('user_hash', userHash)
            .eq('status', 'active')
            .maybeSingle(),
        ]);

        // Log subscription fetch result for debugging
        if (subscriptionResponse.error) {
          console.log('[CreditBalance] Subscription fetch error:', {
            error: subscriptionResponse.error.message,
            code: subscriptionResponse.error.code,
            userHash: userHash.substring(0, 8) + '...',
          });
        } else {
          console.log('[CreditBalance] Subscription fetch result:', {
            hasSubscription: !!subscriptionResponse.data,
            status: subscriptionResponse.data?.status,
            planId: subscriptionResponse.data?.plan_id,
          });
        }

        setBalance(balanceData);
        setSubscription(subscriptionResponse.data);
      } catch (error) {
        console.error('Error fetching credit balance:', error);
        setBalance({
          balance: 0,
          generationsAvailable: 0,
          hasActiveSubscription: false,
          subscriptionCreditsRemaining: 0,
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, [userHash]);

  const handleManageSubscription = async () => {
    if (!subscription?.stripe_customer_id) return;

    setPortalLoading(true);
    try {
      const response = await fetch('/api/stripe/create-portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: subscription.stripe_customer_id,
          returnUrl: `${window.location.origin}/dashboard`,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create portal session');
      }

      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error('No portal URL returned');
      }
    } catch (error: any) {
      console.error('Error creating portal session:', error);
      alert(`Wystąpił błąd podczas otwierania portalu zarządzania: ${error.message || 'Spróbuj ponownie.'}`);
    } finally {
      setPortalLoading(false);
    }
  };

  if (loading) {
    return (
      <GlassCard className={`p-6 ${className}`}>
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 border-2 border-white/40 border-t-white rounded-full animate-spin"></div>
          <span className="text-gray-700 font-exo2">Ładowanie...</span>
        </div>
      </GlassCard>
    );
  }

  if (!balance) {
    return null;
  }

  const totalCredits = balance.balance;
  const subscriptionCredits = subscription?.subscription_credits_remaining || 0;
  const creditsUsed = subscription?.credits_used || 0;
  const creditsAllocated = subscription?.credits_allocated || 0;
  const hasActiveSubscription = !!subscription && subscription.status === 'active';

  // Oblicz wykorzystane kredyty z subskrypcji
  const usagePercentage = creditsAllocated > 0 ? (creditsUsed / creditsAllocated) * 100 : 0;

  return (
    <GlassCard className={`p-6 ${className}`}>
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-exo2 font-bold text-gray-800 mb-2">Twoje kredyty</h3>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-exo2 font-bold text-gray-900">
              {totalCredits.toLocaleString()}
            </span>
            <span className="text-base text-gray-600 font-modern">
              kredytów ({balance.generationsAvailable} generacji)
            </span>
          </div>
        </div>

        {hasActiveSubscription && (
          <>
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-gray-600">
                <span className="font-modern">Wykorzystane kredyty</span>
                <span className="font-exo2 font-semibold">
                  {creditsUsed.toLocaleString()} / {creditsAllocated.toLocaleString()}
                </span>
              </div>
              <div className="w-full h-2 bg-white/20 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-gold-400 to-yellow-400 transition-all duration-300"
                  style={{ width: `${Math.min(100, usagePercentage)}%` }}
                />
              </div>
              <div className="text-sm text-gray-600 font-modern">
                Pozostało: <span className="font-exo2 font-semibold">{subscriptionCredits.toLocaleString()} kredytów</span>
              </div>
            </div>

            <div className="p-4 bg-white/5 rounded-xl border border-white/10">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600 font-modern">Plan:</span>
                  <span className="font-exo2 font-semibold text-gray-800">
                    {PLAN_NAMES[subscription.plan_id] || subscription.plan_id} ({subscription.billing_period === 'monthly' ? 'Miesięczna' : 'Roczna'})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 font-modern">Status:</span>
                  <span className="font-exo2 font-semibold text-white">
                    {subscription.status === 'active' ? 'Aktywna' : subscription.status}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 font-modern">Okres do:</span>
                  <span className="font-exo2 font-semibold text-gray-800">
                    {new Date(subscription.current_period_end).toLocaleDateString('pl-PL')}
                  </span>
                </div>
                {subscription.cancel_at_period_end && (
                  <div className="p-2 bg-amber-500/10 border border-amber-400/30 rounded-lg">
                    <p className="text-xs text-gray-700 font-modern">
                      Subskrypcja zostanie anulowana na koniec okresu rozliczeniowego.
                    </p>
                  </div>
                )}
              </div>
            </div>

            <GlassButton
              onClick={handleManageSubscription}
              disabled={portalLoading}
              variant="primary"
              className="w-full"
            >
              {portalLoading ? 'Otwieranie...' : 'Zarządzaj subskrypcją'}
            </GlassButton>
          </>
        )}

        {!hasActiveSubscription && (
          <>
            {totalCredits < 10 && (
              <div className="p-3 bg-amber-500/10 border border-amber-400/30 rounded-xl">
                <p className="text-sm text-gray-700 font-modern">
                  Masz mniej niż 10 kredytów. Rozważ zakup subskrypcji, aby kontynuować generowanie.
                </p>
              </div>
            )}
            <GlassButton
              onClick={() => window.location.href = '/subscription/plans'}
              variant="primary"
              className="w-full"
            >
              Wybierz plan
            </GlassButton>
          </>
        )}
      </div>
    </GlassCard>
  );
}

