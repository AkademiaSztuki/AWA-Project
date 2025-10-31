"use client";

import React, { useEffect, useState } from 'react';
import { useSessionData } from '@/hooks/useSessionData';
import { BigFiveDetailed } from '@/components/dashboard/BigFiveDetailed';
import { useRouter } from 'next/navigation';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';
import { useLanguage } from '@/contexts/LanguageContext';

export default function PersonalityDetailPage() {
  const { sessionData } = useSessionData();
  const router = useRouter();
  const { language } = useLanguage();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(false);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-12 h-12 border-4 border-gold border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-silver-dark font-modern">{language === 'pl' ? 'Ładowanie...' : 'Loading...'}</p>
        </div>
      </div>
    );
  }

  if (!sessionData?.bigFive?.scores) {
    return (
      <div className="min-h-screen flex flex-col w-full relative">
        <div className="absolute inset-0 bg-gradient-radial from-pearl-50 via-platinum-50 to-silver-100 -z-10" />
        <div className="flex-1 p-4 sm:p-6 lg:p-8">
          <div className="max-w-4xl mx-auto">
            <GlassCard className="p-8 text-center">
              <h1 className="text-3xl font-nasalization bg-gradient-to-r from-gold via-champagne to-platinum bg-clip-text text-transparent mb-3">
                {language === 'pl' ? 'Big Five' : 'Big Five'}
              </h1>
              <p className="text-graphite font-modern mb-6">
                {language === 'pl' ? 'Nie znaleziono wyników. Wykonaj test, aby zobaczyć szczegółową analizę.' : 'No results found. Take the test to see detailed analysis.'}
              </p>
              <GlassButton onClick={() => router.push('/flow/big-five')}>
                {language === 'pl' ? 'Rozpocznij test Big Five' : 'Start Big Five Test'}
              </GlassButton>
            </GlassCard>
          </div>
        </div>
      </div>
    );
  }

  return (
    <BigFiveDetailed
      scores={sessionData.bigFive.scores}
      responses={sessionData.bigFive.responses}
      completedAt={sessionData.bigFive.completedAt}
    />
  );
}
