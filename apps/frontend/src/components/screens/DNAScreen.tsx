"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { GlassCard } from '../ui/GlassCard';
import { GlassButton } from '../ui/GlassButton';
import { AwaContainer } from '../awa/AwaContainer';
import { useSessionData } from '@/hooks/useSessionData';

export function DNAScreen() {
  const router = useRouter();
  const { sessionData, updateSessionData } = useSessionData();
  const [accuracy, setAccuracy] = useState(4);
  const [isAnalyzing, setIsAnalyzing] = useState(true);

  // Symulacja analizy preferencji
  const [visualDNA, setVisualDNA] = useState<any>(null);

  useEffect(() => {
    // Analiza polubień z Tinder testu
    setTimeout(() => {
      const mockDNA = {
        dominantStyle: 'Nowoczesny',
        colorPalette: 'Ciepłe, ziemiste',
        materials: 'Naturalne drewno',
        lighting: 'Miękkie, rozproszone',
        patterns: 'Geometryczne, minimalistyczne'
      };
      setVisualDNA(mockDNA);
      setIsAnalyzing(false);
    }, 3000);
  }, []);

  const handleContinue = () => {
    updateSessionData({
      visualDNA,
      dnaAccuracy: accuracy
    });
    router.push('/flow/ladder');
  };

  if (isAnalyzing) {
    return (
      <div className="min-h-screen flex">
        {/* Development Skip Button */}
        {process.env.NODE_ENV === 'development' && (
          <div className="fixed top-4 right-4 z-50">
            <GlassButton
              onClick={() => router.push('/flow/ladder')}
              variant="secondary"
              size="sm"
              className="bg-red-500/20 border-red-400/40 text-red-700 hover:bg-red-400/30"
            >
              🚀 Pomiń (DEV)
            </GlassButton>
          </div>
        )}

        <AwaContainer currentStep="dna" showDialogue={false} />
        <div className="flex-1 ml-[400px] flex items-center justify-center">
          <GlassCard className="text-center">
            <div className="text-6xl mb-4 animate-pulse">🧬</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-4">
              Analizuję Twoje Wizualne DNA
            </h2>
            <p className="text-gray-600">
              Przetwarzam Twoje preferencje z testu wizualnego...
            </p>
            <div className="mt-6">
              <div className="w-64 bg-white/20 rounded-full h-2 mx-auto">
                <div className="bg-gold rounded-full h-2 animate-pulse" style={{ width: '70%' }} />
              </div>
            </div>
          </GlassCard>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      {/* Development Skip Button */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed top-4 right-4 z-50">
          <GlassButton
            onClick={() => router.push('/flow/ladder')}
            variant="secondary"
            size="sm"
            className="bg-red-500/20 border-red-400/40 text-red-700 hover:bg-red-400/30"
          >
            🚀 Pomiń (DEV)
          </GlassButton>
        </div>
      )}

      <AwaContainer currentStep="dna" showDialogue={false} />

      <div className="flex-1 ml-[400px] flex items-center justify-center p-8">
        <div className="w-full max-w-3xl mx-auto">
          <GlassCard className="w-full">
            <div className="text-center mb-8">
              <div className="text-6xl mb-4">✨</div>
              <h2 className="text-3xl font-bold text-gray-800 mb-4">
                Twoje Wizualne DNA
              </h2>
              <p className="text-gray-600">
                Oto co odkryłam o Twoich preferencjach estetycznych
              </p>
            </div>

            {visualDNA && (
              <div className="space-y-4 mb-8">
                <div className="bg-gradient-to-r from-gold/10 to-champagne/10 p-4 rounded-lg">
                  <h3 className="font-semibold text-gold mb-2">Dominujący styl:</h3>
                  <p>{visualDNA.dominantStyle}</p>
                </div>

                <div className="bg-gradient-to-r from-silver/10 to-pearl/10 p-4 rounded-lg">
                  <h3 className="font-semibold text-gray-700 mb-2">Paleta kolorów:</h3>
                  <p>{visualDNA.colorPalette}</p>
                </div>

                <div className="bg-gradient-to-r from-champagne/10 to-gold/10 p-4 rounded-lg">
                  <h3 className="font-semibold text-gold mb-2">Materiały:</h3>
                  <p>{visualDNA.materials}</p>
                </div>

                <div className="bg-gradient-to-r from-pearl/10 to-silver/10 p-4 rounded-lg">
                  <h3 className="font-semibold text-gray-700 mb-2">Oświetlenie:</h3>
                  <p>{visualDNA.lighting}</p>
                </div>
              </div>
            )}

            <div className="mb-8">
              <p className="text-sm text-gray-600 mb-4 text-center">
                Czy czujesz, że to trafny opis Twojej estetyki?
              </p>
              <div className="flex items-center justify-between text-sm text-gray-500 mb-2">
                <span>Zupełnie nie (1)</span>
                <span>W stu procentach tak (7)</span>
              </div>
              <input
                type="range"
                min="1"
                max="7"
                value={accuracy}
                onChange={(e) => setAccuracy(parseInt(e.target.value))}
                className="w-full"
              />
              <div className="text-center mt-2">
                <span className="text-gold font-semibold">Ocena: {accuracy}/7</span>
              </div>
            </div>

            <div className="flex justify-center">
              <GlassButton onClick={handleContinue}>
                Przejdź do Drabiny Potrzeb →
              </GlassButton>
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}