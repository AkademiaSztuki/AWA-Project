"use client";

import React from 'react';
import { GlassCard } from '../ui/GlassCard';
import GlassSurface from '../ui/GlassSurface';
import { useSessionData } from '@/hooks/useSessionData';
import { AwaDialogue } from '@/components/awa';

export function ThanksScreen() {
  const { sessionData, exportSessionData } = useSessionData();

  const handleDownloadData = () => {
    const dataStr = exportSessionData();
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);

    const exportFileDefaultName = `aura-session-${sessionData?.userHash?.split('_')[1]}.json`;

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  return (
    <div className="min-h-screen flex flex-col w-full">
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-4xl mx-auto">
        <GlassCard variant="flatOnMobile" className="w-full p-6 md:p-8 lg:bg-white/10 lg:backdrop-blur-xl lg:border lg:border-white/20 lg:shadow-xl rounded-2xl max-h-[90vh] overflow-auto">
          <div className="text-center">
            <h1 className="text-2xl lg:text-3xl xl:text-4xl 2xl:text-5xl font-exo2 font-bold text-gray-800 mb-3 lg:mb-4">
              Dziękuję za Twoją podróż!
            </h1>

            <p className="text-base lg:text-lg xl:text-xl 2xl:text-2xl text-gray-700 font-modern mb-4 lg:mb-6 leading-relaxed">
              Twój udział w badaniu nad współpracą człowieka z AI jest nieoceniony 
              dla rozwoju naukowego w dziedzinie projektowania wnętrz.
            </p>

            {/* Informacja o badaniu */}
            <div className="text-sm text-gray-500 mb-8 font-modern">
              <p>
                Twoje dane zostały anonimowo zebrane dla celów badania doktorskiego 
                na Akademii Sztuki w Szczecinie o współpracy człowieka z AI w projektowaniu.
              </p>
              <p className="mt-2">
                ID sesji: <code className="bg-gray-100 px-1 rounded">{sessionData?.userHash}</code>
              </p>
            </div>

            {/* Eksport danych */}
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <GlassSurface
                  width={300}
                  height={56}
                  borderRadius={32}
                  className="cursor-pointer select-none transition-transform duration-200 hover:scale-105 shadow-xl focus:outline-none focus:ring-2 focus:ring-gold-400 flex items-center justify-center text-base font-exo2 font-bold text-white rounded-2xl"
                  onClick={handleDownloadData}
                  aria-label="Pobierz dane"
                  style={{ opacity: 1 }}
                >
                  Pobierz swoje dane (JSON)
                </GlassSurface>

                {sessionData?.coreProfileComplete && (
                  <GlassSurface
                    width={200}
                    height={56}
                    borderRadius={32}
                    className="cursor-pointer select-none transition-transform duration-200 hover:scale-105 shadow-xl focus:outline-none focus:ring-2 focus:ring-gold-400 flex items-center justify-center text-base font-exo2 font-bold text-white rounded-2xl"
                    onClick={() => window.location.href = '/dashboard'}
                    aria-label="Przejdź do dashboard"
                    style={{ opacity: 1 }}
                  >
                    Przejdź do Dashboard
                  </GlassSurface>
                )}
              </div>

              <p className="text-xs text-gray-400 font-modern">
                Dziękujemy za udział w badaniu Research through Design. 
                Twoja przygoda z IDA zakończyła się, ale nauka trwa dalej!
              </p>
            </div>
          </div>
        </GlassCard>
        </div>
      </div>

      {/* Dialog AWA na dole - cała szerokość */}
      <div className="w-full">
        <AwaDialogue 
          currentStep="thanks" 
          fullWidth={true}
          autoHide={true}
        />
      </div>
    </div>
  );
}