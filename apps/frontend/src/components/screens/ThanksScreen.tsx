"use client";

import { useEffect, useState } from 'react';
import { GlassCard } from '../ui/GlassCard';
import GlassSurface from '../ui/GlassSurface';
import { useSessionData } from '@/hooks/useSessionData';

export function ThanksScreen() {
  const { sessionData, exportSessionData } = useSessionData();
  const [sessionDuration, setSessionDuration] = useState<number>(0);

  useEffect(() => {
    if (sessionData?.consentTimestamp) {
      const duration = (Date.now() - new Date(sessionData.consentTimestamp).getTime()) / 1000 / 60; // minuty
      setSessionDuration(Math.round(duration));
    }
  }, [sessionData]);

  const handleDownloadData = () => {
    const dataStr = exportSessionData();
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);

    const exportFileDefaultName = `aura-session-${sessionData?.userHash?.split('_')[1]}.json`;

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const stats = {
    imagesLiked: sessionData?.tinderResults?.filter(swipe => swipe.direction === 'right').length || 0,
    totalImages: 30, // z Tinder testu
    dnaAccuracy: sessionData?.dnaAccuracyScore || 0,
    ladderSteps: sessionData?.ladderResults?.length || 0,
    agencyScore: sessionData?.surveyData?.agencyScore || 0,
    satisfactionScore: sessionData?.surveyData?.satisfactionScore || 0,
    clarityScore: sessionData?.surveyData?.clarityScore || 0,
  };

  return (
    <div className="min-h-screen flex items-center justify-center w-full">


      <div className="w-full max-w-4xl mx-auto">
        <GlassCard className="w-full p-6 md:p-8 bg-white/10 backdrop-blur-xl border border-white/20 shadow-xl rounded-2xl max-h-[90vh] overflow-auto">
          <div className="text-center">
            <h1 className="text-2xl md:text-3xl font-exo2 font-bold text-gray-800 mb-3">
              Dziękuję za Twoją podróż!
            </h1>

            <p className="text-base md:text-lg text-gray-700 font-modern mb-6 leading-relaxed">
              Twój udział w badaniu nad współpracą człowieka z AI jest nieoceniony 
              dla rozwoju naukowego w dziedzinie projektowania wnętrz.
            </p>

            {/* Statystyki sesji */}
            <div className="mb-8">
              <h3 className="text-xl font-semibold mb-6 text-center font-exo2">Podsumowanie Twojej Sesji</h3>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-6">
                <div className="bg-gold/10 p-4 rounded-lg text-center">
                  <div className="font-semibold font-exo2 text-sm mb-1">Czas sesji</div>
                  <div className="font-modern text-lg font-bold">{sessionDuration} min</div>
                </div>

                <div className="bg-silver/10 p-4 rounded-lg text-center">
                  <div className="font-semibold font-exo2 text-sm mb-1">Polubione obrazy</div>
                  <div className="font-modern text-lg font-bold">{stats.imagesLiked}/{stats.totalImages}</div>
                </div>

                <div className="bg-champagne/10 p-4 rounded-lg text-center">
                  <div className="font-semibold font-exo2 text-sm mb-1">Trafność DNA</div>
                  <div className="font-modern text-lg font-bold">{stats.dnaAccuracy}/7</div>
                </div>

                <div className="bg-platinum/10 p-4 rounded-lg text-center">
                  <div className="font-semibold font-exo2 text-sm mb-1">Kroki potrzeb</div>
                  <div className="font-modern text-lg font-bold">{stats.ladderSteps}</div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="text-center p-4 bg-gold/5 rounded-lg border border-gold/20">
                  <div className="font-semibold font-exo2 text-sm mb-2">Sprawczość</div>
                  <div className="text-2xl font-bold text-gold font-exo2">
                    {stats.agencyScore.toFixed(1)}/7
                  </div>
                </div>

                <div className="text-center p-4 bg-silver/5 rounded-lg border border-silver/20">
                  <div className="font-semibold font-exo2 text-sm mb-2">Satysfakcja</div>
                  <div className="text-2xl font-bold text-gray-600 font-exo2">
                    {stats.satisfactionScore.toFixed(1)}/7
                  </div>
                </div>

                <div className="text-center p-4 bg-champagne/5 rounded-lg border border-champagne/20">
                  <div className="font-semibold font-exo2 text-sm mb-2">Jasność</div>
                  <div className="text-2xl font-bold text-gold font-exo2">
                    {stats.clarityScore.toFixed(1)}/7
                  </div>
                </div>
              </div>
            </div>

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

                <GlassSurface
                  width={200}
                  height={56}
                  borderRadius={32}
                  className="cursor-pointer select-none transition-transform duration-200 hover:scale-105 shadow-xl focus:outline-none focus:ring-2 focus:ring-gold-400 flex items-center justify-center text-base font-exo2 font-bold text-white rounded-2xl"
                  onClick={() => window.location.href = '/'}
                  aria-label="Zacznij od nowa"
                  style={{ opacity: 1 }}
                >
                  Zacznij od nowa
                </GlassSurface>
              </div>

              <p className="text-xs text-gray-400 font-modern">
                Dziękujemy za udział w badaniu Research through Design. 
                Twoja przygoda z AWA zakończyła się, ale nauka trwa dalej!
              </p>
            </div>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}