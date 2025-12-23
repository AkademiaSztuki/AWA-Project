'use client';

import React, { useEffect, useState } from 'react';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';
import { supabase } from '@/lib/supabase';

interface Subscription {
  id: string;
  plan_id: string;
  billing_period: string;
  status: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
  subscription_credits_remaining: number;
  credits_used: number;
  credits_allocated: number;
  stripe_customer_id: string;
}

interface SubscriptionManagementProps {
  userHash: string;
  className?: string;
}

const PLAN_NAMES: Record<string, string> = {
  basic: 'Basic',
  pro: 'Pro',
  studio: 'Studio',
};

export function SubscriptionManagement({ userHash, className }: SubscriptionManagementProps) {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [portalLoading, setPortalLoading] = useState(false);

  useEffect(() => {
    if (!userHash) return;

    const fetchSubscription = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('user_hash', userHash)
          .eq('status', 'active')
          .maybeSingle();

        if (error) {
          // Jeśli błąd RLS lub brak dostępu, po prostu nie ma subskrypcji
          if (error.code === 'PGRST301' || error.message?.includes('permission') || error.message?.includes('RLS')) {
            console.log('No subscription access or RLS policy issue - this is OK for new users');
            setSubscription(null);
          } else {
            throw error;
          }
        } else {
          setSubscription(data);
        }
      } catch (error) {
        console.error('Error fetching subscription:', error);
        setSubscription(null); // Ustaw null zamiast pozostawić undefined
      } finally {
        setLoading(false);
      }
    };

    fetchSubscription();
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

      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error('No portal URL returned');
      }
    } catch (error) {
      console.error('Error creating portal session:', error);
      alert('Wystąpił błąd podczas otwierania portalu zarządzania. Spróbuj ponownie.');
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

  if (!subscription) {
    return (
      <GlassCard className={`p-6 ${className}`}>
        <div className="text-center space-y-4">
          <p className="text-gray-700 font-modern">
            Nie masz aktywnej subskrypcji.
          </p>
          <GlassButton
            onClick={() => window.location.href = '/subscription/plans'}
            variant="primary"
          >
            Wybierz plan
          </GlassButton>
        </div>
      </GlassCard>
    );
  }

  const periodEnd = new Date(subscription.current_period_end);
  const creditsUsed = subscription.credits_used || 0;
  const creditsRemaining = subscription.subscription_credits_remaining || 0;
  const totalCredits = subscription.credits_allocated || 0;
  const usagePercentage = totalCredits > 0 ? (creditsUsed / totalCredits) * 100 : 0;

  return (
    <GlassCard className={`p-6 ${className}`}>
      <div className="space-y-6">
        <div>
          <h3 className="text-xl font-exo2 font-bold text-gray-900 mb-2">
            Twoja subskrypcja
          </h3>
          <div className="flex items-center gap-2">
            <span className="text-lg font-exo2 font-semibold text-gray-800">
              {PLAN_NAMES[subscription.plan_id] || subscription.plan_id}
            </span>
            <span className="text-sm text-gray-600 font-modern">
              ({subscription.billing_period === 'monthly' ? 'Miesięczna' : 'Roczna'})
            </span>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-sm text-gray-600">
            <span className="font-modern">Wykorzystane kredyty</span>
            <span className="font-exo2 font-semibold">
              {creditsUsed.toLocaleString()} / {totalCredits.toLocaleString()}
            </span>
          </div>
          <div className="w-full h-2 bg-white/20 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-gold-400 to-yellow-400 transition-all duration-300"
              style={{ width: `${Math.min(100, usagePercentage)}%` }}
            />
          </div>
          <div className="text-sm text-gray-600 font-modern">
            Pozostało: <span className="font-exo2 font-semibold">{creditsRemaining.toLocaleString()} kredytów</span>
          </div>
        </div>

        <div className="p-4 bg-white/5 rounded-xl border border-white/10">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600 font-modern">Status:</span>
              <span className={`font-exo2 font-semibold ${
                subscription.status === 'active' ? 'text-white' : 'text-amber-600'
              }`}>
                {subscription.status === 'active' ? 'Aktywna' : subscription.status}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 font-modern">Okres do:</span>
              <span className="font-exo2 font-semibold text-gray-800">
                {periodEnd.toLocaleDateString('pl-PL')}
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
      </div>
    </GlassCard>
  );
}

