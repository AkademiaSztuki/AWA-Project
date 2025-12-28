'use client';

import React, { useEffect, useState } from 'react';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';
import { getCreditBalance, CreditBalance as CreditBalanceType } from '@/lib/credits';
import { supabase } from '@/lib/supabase';
import { useLanguage } from '@/contexts/LanguageContext';

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
  const { t } = useLanguage();
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
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle(),
        ]);

        // Log subscription fetch result for debugging
        if (subscriptionResponse.error) {
          // PGRST116 means multiple rows or no rows - handle gracefully
          if (subscriptionResponse.error.code === 'PGRST116') {
            console.log('[CreditBalance] Multiple or no subscriptions found, fetching first active one:', {
              userHash: userHash.substring(0, 8) + '...',
            });
            // Try to get the first active subscription
            const { data: subscriptions, error: listError } = await supabase
              .from('subscriptions')
              .select('*')
              .eq('user_hash', userHash)
              .eq('status', 'active')
              .order('created_at', { ascending: false })
              .limit(1);
            
            if (!listError && subscriptions && subscriptions.length > 0) {
              setSubscription(subscriptions[0]);
              console.log('[CreditBalance] Using first active subscription:', {
                planId: subscriptions[0].plan_id,
                status: subscriptions[0].status,
              });
            } else {
              setSubscription(null);
              console.log('[CreditBalance] No active subscription found');
            }
          } else {
            console.log('[CreditBalance] Subscription fetch error:', {
              error: subscriptionResponse.error.message,
              code: subscriptionResponse.error.code,
              userHash: userHash.substring(0, 8) + '...',
            });
            setSubscription(null);
          }
        } else {
          console.log('[CreditBalance] Subscription fetch result:', {
            hasSubscription: !!subscriptionResponse.data,
            status: subscriptionResponse.data?.status,
            planId: subscriptionResponse.data?.plan_id,
          });
          setSubscription(subscriptionResponse.data);
        }

        setBalance(balanceData);
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
      alert(t({ pl: `Wystąpił błąd podczas otwierania portalu zarządzania: ${error.message || 'Spróbuj ponownie.'}`, en: `An error occurred while opening the management portal: ${error.message || 'Please try again.'}` }));
    } finally {
      setPortalLoading(false);
    }
  };

  if (loading) {
    return (
      <GlassCard className={`p-6 ${className}`}>
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 border-2 border-white/40 border-t-white rounded-full animate-spin"></div>
          <span className="text-gray-700 font-exo2">{t({ pl: 'Ładowanie...', en: 'Loading...' })}</span>
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
          <h3 className="text-lg font-exo2 font-bold text-gray-800 mb-2">{t({ pl: 'Twoje kredyty', en: 'Your credits' })}</h3>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-exo2 font-bold text-gray-900">
              {totalCredits.toLocaleString()}
            </span>
            <span className="text-base text-gray-600 font-modern">
              {t({ pl: `kredytów (${balance.generationsAvailable} generacji)`, en: `credits (${balance.generationsAvailable} generations)` })}
            </span>
          </div>
        </div>

        {hasActiveSubscription && (
          <>
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-gray-600">
                <span className="font-modern">{t({ pl: 'Wykorzystane kredyty', en: 'Credits used' })}</span>
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
                {t({ pl: 'Pozostało:', en: 'Remaining:' })} <span className="font-exo2 font-semibold">{subscriptionCredits.toLocaleString()} {t({ pl: 'kredytów', en: 'credits' })}</span>
              </div>
            </div>

            <div className="p-4 bg-white/5 rounded-xl border border-white/10">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600 font-modern">{t({ pl: 'Plan:', en: 'Plan:' })}</span>
                  <span className="font-exo2 font-semibold text-gray-800">
                    {PLAN_NAMES[subscription.plan_id] || subscription.plan_id} ({subscription.billing_period === 'monthly' ? t({ pl: 'Miesięczna', en: 'Monthly' }) : t({ pl: 'Roczna', en: 'Annual' })})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 font-modern">{t({ pl: 'Status:', en: 'Status:' })}</span>
                  <span className="font-exo2 font-semibold text-white">
                    {subscription.status === 'active' ? t({ pl: 'Aktywna', en: 'Active' }) : subscription.status}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 font-modern">{t({ pl: 'Okres do:', en: 'Period until:' })}</span>
                  <span className="font-exo2 font-semibold text-gray-800">
                    {new Date(subscription.current_period_end).toLocaleDateString('pl-PL')}
                  </span>
                </div>
                {subscription.cancel_at_period_end && (
                  <div className="p-2 bg-amber-500/10 border border-amber-400/30 rounded-lg">
                    <p className="text-xs text-gray-700 font-modern">
                      {t({ pl: 'Subskrypcja zostanie anulowana na koniec okresu rozliczeniowego.', en: 'Subscription will be cancelled at the end of the billing period.' })}
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
              {portalLoading ? t({ pl: 'Otwieranie...', en: 'Opening...' }) : t({ pl: 'Zarządzaj subskrypcją', en: 'Manage subscription' })}
            </GlassButton>
          </>
        )}

        {!hasActiveSubscription && (
          <>
            {totalCredits < 10 && (
              <div className="p-3 bg-amber-500/10 border border-amber-400/30 rounded-xl">
                <p className="text-sm text-gray-700 font-modern">
                  {t({ pl: 'Masz mniej niż 10 kredytów. Rozważ zakup subskrypcji, aby kontynuować generowanie.', en: 'You have less than 10 credits. Consider purchasing a subscription to continue generating.' })}
                </p>
              </div>
            )}
            <GlassButton
              onClick={() => window.location.href = '/subscription/plans'}
              variant="primary"
              className="w-full"
            >
              {t({ pl: 'Wybierz plan', en: 'Choose plan' })}
            </GlassButton>
          </>
        )}
      </div>
    </GlassCard>
  );
}

