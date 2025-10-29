"use client";

import React, { useEffect, useState } from 'react';
import { useSessionData } from '@/hooks/useSessionData';
import { BigFiveDetailed } from '@/components/dashboard/BigFiveDetailed';
import { useRouter } from 'next/navigation';

export default function PersonalityDetailPage() {
  const { sessionData } = useSessionData();
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!sessionData?.bigFive?.scores) {
      // Redirect to dashboard if no Big Five data
      router.push('/dashboard');
    } else {
      setLoading(false);
    }
  }, [sessionData, router]);

  if (loading || !sessionData?.bigFive) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-12 h-12 border-4 border-gold border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-silver-dark font-modern">Ładowanie...</p>
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
