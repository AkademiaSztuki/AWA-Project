'use client';

import React from 'react';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';
import { useRouter } from 'next/navigation';

interface UpgradePromptProps {
  userHash: string;
  className?: string;
}

export function UpgradePrompt({ userHash, className }: UpgradePromptProps) {
  const router = useRouter();

  return (
    <GlassCard variant="highlighted" className={`p-6 ${className}`}>
      <div className="space-y-4">
        <div>
          <h3 className="text-xl font-exo2 font-bold text-gray-900 mb-2">
            Wyczerpałeś darmowe kredyty
          </h3>
          <p className="text-gray-700 font-modern">
            Aby kontynuować generowanie obrazów, wybierz plan subskrypcji. Otrzymasz więcej kredytów i dostęp do wszystkich funkcji.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <GlassButton
            onClick={() => router.push('/subscription/plans')}
            variant="primary"
            className="flex-1"
          >
            Zobacz plany
          </GlassButton>
          <GlassButton
            onClick={() => router.push('/dashboard')}
            variant="secondary"
            className="flex-1"
          >
            Przejdź do dashboardu
          </GlassButton>
        </div>
      </div>
    </GlassCard>
  );
}

