'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';
import { XCircle } from 'lucide-react';

export default function SubscriptionCancelPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen flex items-center justify-center">
      <GlassCard className="p-8 max-w-md w-full text-center space-y-6">
        <div className="flex justify-center">
          <div className="w-16 h-16 bg-amber-500/20 rounded-full flex items-center justify-center">
            <XCircle className="w-10 h-10 text-amber-600" />
          </div>
        </div>
        
        <div className="space-y-2">
          <h1 className="text-2xl font-exo2 font-bold text-gray-900">
            Płatność anulowana
          </h1>
          <p className="text-gray-600 font-modern">
            Subskrypcja nie została aktywowana. Możesz spróbować ponownie w dowolnym momencie.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <GlassButton
            onClick={() => router.push('/subscription/plans')}
            variant="primary"
            className="w-full"
          >
            Spróbuj ponownie
          </GlassButton>
          <GlassButton
            onClick={() => router.push('/dashboard')}
            variant="secondary"
            className="w-full"
          >
            Przejdź do dashboardu
          </GlassButton>
        </div>
      </GlassCard>
    </div>
  );
}

