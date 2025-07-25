import { useEffect, useState } from 'react';
import { GlassCard } from '../ui/GlassCard';
import { GlassButton } from '../ui/GlassButton';
import { AwaContainer } from '../awa/AwaContainer';
import { useSessionData } from '@/hooks/useSessionData';

export function ThanksScreen() {
  const { sessionData, exportSessionData } = useSessionData();
  const [sessionDuration, setSessionDuration] = useState<number>(0);

  useEffect(() => {
    if (sessionData?.consentTimestamp) {
      const duration = (Date.now() - sessionData.consentTimestamp) / 1000 / 60; // minuty
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
    imagesLiked: sessionData?.likedImages?.length || 0,
    totalImages: 30, // z Tinder testu
    dnaAccuracy: sessionData?.dnaAccuracy || 0,
    ladderSteps: sessionData?.ladderPath?.length || 0,
    agencyScore: sessionData?.surveyData?.agencyScore || 0,
    satisfactionScore: sessionData?.surveyData?.satisfactionScore || 0,
    clarityScore: sessionData?.surveyData?.clarityScore || 0,
  };

  return (
    <div className="min-h-screen flex">
      <AwaContainer currentScreen="thanks" />

      <div className="flex-1 ml-[400px] p-8 flex items-center justify-center">
        <div className="w-full max-w-3xl mx-auto">
          <GlassCard className="w-full text-center">
            <div className="text-6xl mb-6">🎉</div>

            <h2 className="text-3xl font-bold text-gray-800 mb-4">
              Dziękuję za Twoją podróż!
            </h2>

            <p className="text-lg text-gray-600 mb-8">
              Twój udział w badaniu nad współpracą człowieka z AI jest nieoceniony 
              dla rozwoju naukowego w dziedzinie projektowania wnętrz.
            </p>

            {/* Statystyki sesji */}
            <GlassCard className="mb-8 text-left">
              <h3 className="text-xl font-semibold mb-4 text-center">Podsumowanie Twojej Sesji</h3>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="bg-gold/10 p-3 rounded">
                  <div className="font-semibold">Czas sesji:</div>
                  <div>{sessionDuration} minut</div>
                </div>

                <div className="bg-silver/10 p-3 rounded">
                  <div className="font-semibold">Polubione obrazy:</div>
                  <div>{stats.imagesLiked}/{stats.totalImages}</div>
                </div>

                <div className="bg-champagne/10 p-3 rounded">
                  <div className="font-semibold">Trafność DNA:</div>
                  <div>{stats.dnaAccuracy}/7</div>
                </div>

                <div className="bg-platinum/10 p-3 rounded">
                  <div className="font-semibold">Kroki potrzeb:</div>
                  <div>{stats.ladderSteps}</div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 text-sm mt-4">
                <div className="text-center p-3 bg-gold/5 rounded">
                  <div className="font-semibold">Sprawczość</div>
                  <div className="text-xl font-bold text-gold">
                    {stats.agencyScore.toFixed(1)}/7
                  </div>
                </div>

                <div className="text-center p-3 bg-silver/5 rounded">
                  <div className="font-semibold">Satysfakcja</div>
                  <div className="text-xl font-bold text-gray-600">
                    {stats.satisfactionScore.toFixed(1)}/7
                  </div>
                </div>

                <div className="text-center p-3 bg-champagne/5 rounded">
                  <div className="font-semibold">Jasność</div>
                  <div className="text-xl font-bold text-gold">
                    {stats.clarityScore.toFixed(1)}/7
                  </div>
                </div>
              </div>
            </GlassCard>

            {/* Informacja o badaniu */}
            <div className="text-sm text-gray-500 mb-8">
              <p>
                Twoje dane zostały anonimowo zebrane dla celów badania doktorskiego 
                na Akademii Sztuk Pięknych o współpracy człowieka z AI w projektowaniu.
              </p>
              <p className="mt-2">
                ID sesji: <code className="bg-gray-100 px-1 rounded">{sessionData?.userHash}</code>
              </p>
            </div>

            {/* Eksport danych */}
            <div className="space-y-4">
              <GlassButton 
                onClick={handleDownloadData}
                variant="secondary"
                className="mb-4"
              >
                📥 Pobierz swoje dane (JSON)
              </GlassButton>

              <p className="text-xs text-gray-400">
                Dziękujemy za udział w badaniu Research through Design. 
                Twoja przygoda z AWA zakończyła się, ale nauka trwa dalej!
              </p>
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}