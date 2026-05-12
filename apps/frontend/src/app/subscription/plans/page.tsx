'use client';

import React from 'react';
import { SubscriptionPlans } from '@/components/subscription/SubscriptionPlans';
import { useSessionData } from '@/hooks/useSessionData';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';

export default function SubscriptionPlansPage() {
  const { sessionData } = useSessionData();
  const { user } = useAuth();
  const { language } = useLanguage();
  const t = (pl: string, en: string) => (language === 'pl' ? pl : en);
  
  // Pobierz userHash z sessionData lub z localStorage
  const userHash = (sessionData as any)?.userHash || 
    (typeof window !== 'undefined' ? localStorage.getItem('aura_user_hash') : null);

  if (!userHash) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-700 font-modern mb-4">
            {t('Musisz być zalogowany, aby zobaczyć plany subskrypcji.', 'You need to be signed in to view subscription plans.')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-exo2 font-bold text-gray-900">
          {t('Wybierz plan subskrypcji', 'Choose your subscription plan')}
        </h1>
        <p className="text-lg text-gray-600 font-modern">
          {t(
            'Skorzystaj z oferty startowej, a gdy chcesz projektować dalej, wybierz miesięczny pakiet obrazów AI.',
            'Use the launch welcome pack first; when you want to keep going, pick a monthly AI image plan.',
          )}
        </p>
      </div>

      <SubscriptionPlans userHash={userHash} />
    </div>
  );
}

