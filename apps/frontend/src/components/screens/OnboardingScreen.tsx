"use client";

import React, { useState } from 'react';
import { GlassCard, GlassButton } from '@/components/ui';
import { AwaContainer } from '@/components/awa/AwaContainer';
import { useRouter } from 'next/navigation';

const OnboardingScreen: React.FC = () => {
  const router = useRouter();
  const [consent, setConsent] = useState({
    dataProcessing: false,
    research: false,
    anonymity: false
  });

  const canProceed = Object.values(consent).every(Boolean);

  const handleSubmit = () => {
    if (canProceed) {
      // Save consent timestamp
      sessionStorage.setItem('aura_consent', new Date().toISOString());
      sessionStorage.setItem('aura_user_hash', Math.random().toString(36).substring(7));
      router.push('/flow/photo');
    }
  };

  return (
    <div className="min-h-screen flex">
      <AwaContainer currentStep="onboarding" />

      <div className="flex-1 ml-96 flex items-center justify-center p-8">
        <div className="max-w-3xl">
          <GlassCard className="mb-8">
            <h1 className="text-3xl font-futuristic text-gray-800 mb-6">
              Zgoda na Udział w Badaniu
            </h1>

            <div className="space-y-6 text-gray-700 font-modern">
              <div>
                <h3 className="text-lg font-semibold text-gold-700 mb-2">
                  Cel Badania
                </h3>
                <p>
                  Badanie prowadzone przez Akademię Sztuk Pięknych ma na celu zbadanie, 
                  w jaki sposób interaktywny system AI wpływa na proces twórczy 
                  w projektowaniu wnętrz.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gold-700 mb-2">
                  Twoje Dane
                </h3>
                <p>
                  Wszystkie dane będą przetwarzane anonimowo. Zamiast danych osobowych 
                  używamy unikalnego, losowego identyfikatora. Dane będą wykorzystane 
                  wyłącznie do celów naukowych i nie będą udostępniane osobom trzecim.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gold-700 mb-2">
                  Co Będzie Zbierane?
                </h3>
                <ul className="list-disc list-inside space-y-1">
                  <li>Twoje wybory i preferencje wizualne</li>
                  <li>Czasy reakcji i wzorce interakcji</li>
                  <li>Oceny i odpowiedzi na pytania</li>
                  <li>Informacje o procesie projektowym</li>
                </ul>
              </div>
            </div>
          </GlassCard>

          <GlassCard variant="highlighted">
            <h3 className="text-xl font-futuristic text-gold-700 mb-4">
              Wyrażam Zgodę Na:
            </h3>

            <div className="space-y-4">
              {[
                {
                  key: 'dataProcessing',
                  text: 'Przetwarzanie moich danych w sposób anonimowy dla celów badawczych'
                },
                {
                  key: 'research', 
                  text: 'Udział w badaniu naukowym Akademii Sztuk Pięknych'
                },
                {
                  key: 'anonymity',
                  text: 'Rozumiem, że moje dane będą w pełni zanonimizowane'
                }
              ].map(({ key, text }) => (
                <label key={key} className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={consent[key as keyof typeof consent]}
                    onChange={(e) => setConsent(prev => ({
                      ...prev,
                      [key]: e.target.checked
                    }))}
                    className="mt-1 w-5 h-5 text-gold-600 bg-pearl-100/20 border-gold-400/50 rounded focus:ring-gold-500 focus:ring-2"
                  />
                  <span className="text-gray-700 font-modern">{text}</span>
                </label>
              ))}
            </div>

            <div className="flex justify-between items-center mt-8">
              <GlassButton
                variant="subtle"
                onClick={() => router.push('/')}
              >
                Wstecz
              </GlassButton>

              <GlassButton
                disabled={!canProceed}
                onClick={handleSubmit}
                size="lg"
              >
                Zgadzam się i Rozpoczynam
              </GlassButton>
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
};

export default OnboardingScreen;