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

  const hasActiveSubscription = !!subscription && subscription.status === 'active';
  
  // Jeśli użytkownik ma aktywną subskrypcję, użyj kredytów z subskrypcji jako główny bilans
  // W przeciwnym razie użyj bilansu z transakcji
  const totalCredits = hasActiveSubscription 
    ? (subscription?.subscription_credits_remaining || 0)
    : balance.balance;
  
  // Oblicz dostępne generacje na podstawie wybranego źródła kredytów
  const totalGenerationsAvailable = hasActiveSubscription
    ? Math.floor(totalCredits / 10)
    : balance.generationsAvailable;
  
  const subscriptionCredits = subscription?.subscription_credits_remaining || 0;
  const creditsUsed = subscription?.credits_used || 0;
  const creditsAllocated = subscription?.credits_allocated || 0;

  // Oblicz wykorzystane kredyty z subskrypcji
  const usagePercentage = creditsAllocated > 0 ? (creditsUsed / creditsAllocated) * 100 : 0;

  return (
    <GlassCard variant="flatOnMobile" className={`p-4 sm:p-5 ${className}`}>
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-xs font-modern font-semibold uppercase tracking-wider text-silver-dark mb-1">
              {t({ pl: 'Twój Balans', en: 'Your Balance' })}
            </h3>
            <div className="flex items-baseline gap-2">
              <span className="text-xl sm:text-2xl font-nasalization text-graphite">
                {totalCredits.toLocaleString()}
              </span>
              <span className="text-[10px] sm:text-xs text-silver-dark font-modern">
                {t({ pl: `kredytów (${totalGenerationsAvailable} gen.)`, en: `credits (${totalGenerationsAvailable} gen.)` })}
              </span>
            </div>
          </div>

          {hasActiveSubscription && (
            <div className="flex items-center gap-4 text-[10px] sm:text-xs text-silver-dark font-modern bg-white/5 px-3 py-1.5 rounded-full border border-white/10">
              <div className="flex gap-1.5">
                <span>{t({ pl: 'Plan:', en: 'Plan:' })}</span>
                <span className="text-graphite font-semibold">
                  {PLAN_NAMES[subscription.plan_id] || subscription.plan_id}
                </span>
              </div>
              <div className="w-px h-3 bg-white/20" />
              <div className="flex gap-1.5">
                <span>{t({ pl: 'Ważny do:', en: 'Until:' })}</span>
                <span className="text-graphite font-semibold">
                  {new Date(subscription.current_period_end).toLocaleDateString('pl-PL')}
                </span>
              </div>
            </div>
          )}
        </div>

        {hasActiveSubscription && (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <div className="flex justify-between text-[10px] sm:text-xs text-silver-dark">
                <span className="font-modern">
                  {t({ pl: 'Wykorzystano:', en: 'Used:' })} {creditsUsed.toLocaleString()} / {creditsAllocated.toLocaleString()}
                </span>
                <span className="font-modern">
                  {t({ pl: 'Pozostało:', en: 'Remaining:' })} {subscriptionCredits.toLocaleString()}
                </span>
              </div>
              <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-gold/60 to-gold transition-all duration-300 shadow-[0_0_8px_rgba(212,175,55,0.3)]"
                  style={{ width: `${Math.min(100, usagePercentage)}%` }}
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              {subscription.cancel_at_period_end && (
                <p className="text-[9px] sm:text-[10px] text-amber-500 font-modern italic">
                  {t({ pl: 'Anulowano - ważne do końca okresu', en: 'Cancelled - active until end of period' })}
                </p>
              )}
              
              <button
                onClick={handleManageSubscription}
                disabled={portalLoading}
                className="text-[10px] sm:text-xs text-silver-dark hover:text-gold font-modern underline underline-offset-4 transition-colors disabled:opacity-50"
              >
                {portalLoading ? t({ pl: 'Otwieranie...', en: 'Opening...' }) : t({ pl: 'Zarządzaj subskrypcją', en: 'Manage subscription' })}
              </button>
            </div>
          </div>
        )}

        {!hasActiveSubscription && (
          <div className="flex items-center justify-between gap-4 pt-2 border-t border-white/5">
            {totalCredits < 10 && (
              <p className="text-[10px] text-amber-500/80 font-modern italic">
                {t({ pl: 'Niski stan kredytów', en: 'Low credits' })}
              </p>
            )}
            <GlassButton
              onClick={() => window.location.href = '/subscription/plans'}
              variant="secondary"
              className="py-1.5 px-4 text-xs h-auto min-h-0"
            >
              {t({ pl: 'Wybierz plan', en: 'Choose plan' })}
            </GlassButton>
          </div>
        )}
      </div>
    </GlassCard>
  );
}

