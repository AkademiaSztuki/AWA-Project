'use client';

import React from 'react';
import { SubscriptionPlans } from '@/components/subscription/SubscriptionPlans';
import { useSessionData } from '@/hooks/useSessionData';
import { useAuth } from '@/contexts/AuthContext';

export default function SubscriptionPlansPage() {
  const { sessionData } = useSessionData();
  const { user } = useAuth();
  
  // Pobierz userHash z sessionData lub z localStorage
  const userHash = (sessionData as any)?.userHash || 
    (typeof window !== 'undefined' ? localStorage.getItem('aura_user_hash') : null);

  if (!userHash) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-700 font-modern mb-4">
            Musisz być zalogowany, aby zobaczyć plany subskrypcji.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-exo2 font-bold text-gray-900">
          Wybierz plan subskrypcji
        </h1>
        <p className="text-lg text-gray-600 font-modern">
          Otrzymaj więcej kredytów i kontynuuj generowanie obrazów
        </p>
      </div>

      <SubscriptionPlans userHash={userHash} />
    </div>
  );
}

