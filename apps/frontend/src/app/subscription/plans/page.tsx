'use client';

import React, { useEffect, useState } from 'react';
import { SubscriptionPlans } from '@/components/subscription/SubscriptionPlans';
import { useSessionData } from '@/hooks/useSessionData';
import { useLanguage } from '@/contexts/LanguageContext';

export default function SubscriptionPlansPage() {
  const { sessionData } = useSessionData();
  const { language } = useLanguage();
  const t = (pl: string, en: string) => (language === 'pl' ? pl : en);
  const [storedHash, setStoredHash] = useState('');

  useEffect(() => {
    setStoredHash(localStorage.getItem('aura_user_hash')?.trim() || '');
  }, []);

  const userHash =
    ((sessionData as { userHash?: string } | null)?.userHash || storedHash || '').trim();

  return (
    <div className="space-y-8">
      <div className="text-center space-y-5">
        <h1 className="text-4xl font-exo2 font-bold text-gray-900">
          {t('Wybierz plan subskrypcji', 'Choose your subscription plan')}
        </h1>

        <div
          className="mx-auto max-w-3xl rounded-2xl border border-gold-400/45 bg-gradient-to-br from-gold-400/20 via-gold-400/10 to-white/35 px-6 py-5 shadow-sm text-left sm:text-center"
          role="note"
        >
          <p className="text-xs font-exo2 font-bold uppercase tracking-widest text-gold-900/90">
            {t('Wczesny dostęp — oferta ograniczona ilościowo', 'Early access — limited quantity offer')}
          </p>
          <p className="mt-2 text-xl sm:text-2xl font-exo2 font-bold text-gray-900 leading-snug">
            {t(
              'Plan Basic możesz zacząć bezpłatnie — dla pierwszych 1000 użytkowników',
              'Start Basic for free — for the first 1000 users',
            )}
          </p>
          <p className="mt-2 text-sm sm:text-base text-gray-800 font-modern">
            {t(
              '6000 kredytów po rejestracji i weryfikacji e-maila. Bez karty i bez automatycznego przedłużenia.',
              '6000 credits after sign-up and email verification. No card and no auto-renewal.',
            )}
          </p>
        </div>

        <p className="text-base text-gray-600 font-modern max-w-2xl mx-auto">
          {t(
            'Gdy będziesz chciał projektować dalej — wybierz Creator lub Pro.',
            'When you want to keep going, choose Creator or Pro.',
          )}
        </p>
      </div>

      <SubscriptionPlans userHash={userHash || undefined} />
    </div>
  );
}
