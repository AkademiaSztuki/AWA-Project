'use client';

import React, { useEffect, useState } from 'react';
import { GlassCard } from '@/components/ui/GlassCard';
import { getCreditBalance, CreditBalance as CreditBalanceType } from '@/lib/credits';

interface CreditBalanceProps {
  userHash: string;
  className?: string;
}

export function CreditBalance({ userHash, className }: CreditBalanceProps) {
  const [balance, setBalance] = useState<CreditBalanceType | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userHash) {
      setLoading(false);
      return;
    }

    const fetchBalance = async () => {
      try {
        setLoading(true);
        const data = await getCreditBalance(userHash);
        setBalance(data);
      } catch (error) {
        console.error('Error fetching credit balance:', error);
        // W przypadku błędu, ustaw domyślne wartości zamiast null
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

    fetchBalance();
    const interval = setInterval(fetchBalance, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, [userHash]);

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

  const progressPercentage = balance.hasActiveSubscription && balance.subscriptionCreditsRemaining > 0
    ? Math.min(100, (balance.subscriptionCreditsRemaining / (balance.subscriptionCreditsRemaining + balance.balance)) * 100)
    : 0;

  return (
    <GlassCard className={`p-6 ${className}`}>
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-exo2 font-bold text-gray-800 mb-2">Twoje kredyty</h3>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-exo2 font-bold text-gray-900">
              {balance.balance.toLocaleString()}
            </span>
            <span className="text-base text-gray-600 font-modern">
              kredytów ({balance.generationsAvailable} generacji)
            </span>
          </div>
        </div>

        {balance.hasActiveSubscription && balance.subscriptionCreditsRemaining > 0 && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-gray-600">
              <span className="font-modern">Kredyty z subskrypcji</span>
              <span className="font-exo2 font-semibold">
                {balance.subscriptionCreditsRemaining.toLocaleString()} / {balance.subscriptionCreditsRemaining.toLocaleString()}
              </span>
            </div>
            <div className="w-full h-2 bg-white/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-gold-400 to-yellow-400 transition-all duration-300"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          </div>
        )}

        {balance.balance < 10 && (
          <div className="p-3 bg-amber-500/10 border border-amber-400/30 rounded-xl">
            <p className="text-sm text-gray-700 font-modern">
              Masz mniej niż 10 kredytów. Rozważ zakup subskrypcji, aby kontynuować generowanie.
            </p>
          </div>
        )}
      </div>
    </GlassCard>
  );
}

