'use client';

import React, { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';
import { CheckCircle } from 'lucide-react';

export default function SubscriptionSuccessPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    // Webhook powinien już przetworzyć subskrypcję
    // Możemy tutaj odświeżyć dane użytkownika jeśli potrzeba
  }, [sessionId]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <GlassCard className="p-8 max-w-md w-full text-center space-y-6">
        <div className="flex justify-center">
          <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
        </div>
        
        <div className="space-y-2">
          <h1 className="text-2xl font-exo2 font-bold text-gray-900">
            Subskrypcja aktywowana!
          </h1>
          <p className="text-gray-600 font-modern">
            Twoja subskrypcja została pomyślnie aktywowana. Kredyty zostały dodane do Twojego konta.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <GlassButton
            onClick={() => router.push('/dashboard')}
            variant="primary"
            className="w-full"
          >
            Przejdź do dashboardu
          </GlassButton>
          <GlassButton
            onClick={() => router.push('/flow/generate')}
            variant="secondary"
            className="w-full"
          >
            Rozpocznij generowanie
          </GlassButton>
        </div>
      </GlassCard>
    </div>
  );
}

