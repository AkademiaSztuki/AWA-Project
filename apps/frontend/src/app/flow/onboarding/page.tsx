'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { GlassCard, GlassButton } from '@/components/ui';
import { AwaContainer, AwaDialogue } from '@/components/awa';
import { useSession } from '@/hooks';
import GlassSurface from 'src/components/ui/GlassSurface';

export default function OnboardingPage() {
  const router = useRouter();
  const { setCurrentStep } = useSession();
  const [consentGiven, setConsentGiven] = useState(false);

  const handleConsent = async () => {
    if (!consentGiven) return;
    setCurrentStep('upload');
    router.push('/flow/photo');
  };

  return (
    <div className="min-h-screen flex flex-col w-full">
      {/* Formularz zgody */}
      <div className="flex-1 flex items-center justify-center p-4">
        <GlassCard className="w-full p-6 md:p-8 bg-white/10 backdrop-blur-xl border border-white/20 shadow-xl rounded-2xl max-h-[90vh] overflow-auto scrollbar-hide">
          <h1 className="text-2xl md:text-3xl font-exo2 font-bold text-gray-800 mb-3">Zgoda na udział w badaniu</h1>
          <p className="text-base md:text-lg text-gray-700 font-modern mb-3 leading-relaxed">
            Projekt badawczy na Akademii Sztuki w Szczecinie
          </p>
          <div className="space-y-4 mb-4">
            <div>
              <h3 className="text-sm md:text-base font-bold text-gray-700 mb-1 font-exo2">Cel badania</h3>
              <p className="text-xs md:text-sm text-gray-600 font-modern leading-relaxed">
                Badanie ma na celu poznanie sposobów współpracy człowieka z systemami AI w procesie projektowania wnętrz w ramach metodologii Research through Design.
              </p>
            </div>
            <div>
              <h3 className="text-sm md:text-base font-bold text-gray-700 mb-1 font-exo2">Ochrona danych</h3>
              <ul className="text-xs md:text-sm text-gray-600 font-modern space-y-1 text-left mx-auto max-w-lg">
                <li>• Twoje dane będą w pełni <strong>anonimowe</strong></li>
                <li>• Używamy tylko hash identyfikatora, nie danych osobowych</li>
                <li>• Możesz wycofać zgodę w każdym momencie</li>
                <li>• Dane służą wyłącznie celom naukowym</li>
              </ul>
            </div>
            <div>
              <h3 className="text-sm md:text-base font-bold text-gray-700 mb-1 font-exo2">Czas trwania</h3>
              <p className="text-xs md:text-sm text-gray-600 font-modern">
                Badanie trwa około <strong>15 minut</strong> i składa się z 10 interaktywnych etapów.
              </p>
            </div>
          </div>
          <div className="mb-4 flex justify-center">
            <label className="flex items-start space-x-3 cursor-pointer max-w-xl">
              <input
                type="checkbox"
                checked={consentGiven}
                onChange={(e) => setConsentGiven(e.target.checked)}
                className="mt-1 w-5 h-5 text-gold-500 rounded focus:ring-gold-400 bg-white/20 border-gold-500/50"
              />
              <span className="text-gray-700 text-sm font-modern leading-relaxed">
                <strong>Wyrażam świadomą zgodę</strong> na udział w badaniu naukowym dotyczącym współpracy człowiek-AI w projektowaniu wnętrz. Rozumiem, że moje dane będą anonimowe i używane wyłącznie do celów badawczych.
              </span>
            </label>
          </div>
          <div className="flex flex-col md:flex-row gap-6 justify-center">
            <GlassSurface
              width={220}
              height={56}
              borderRadius={32}
              className="cursor-pointer select-none transition-transform duration-200 hover:scale-105 shadow-xl focus:outline-none focus:ring-2 focus:ring-gold-400 flex items-center justify-center text-base font-exo2 font-bold text-white rounded-2xl"
              onClick={() => router.push('/')}
              aria-label="Powrót"
              style={{ opacity: 1 }}
            >
              ← Powrót
            </GlassSurface>
            <GlassSurface
              width={260}
              height={56}
              borderRadius={32}
              className={`cursor-pointer select-none transition-transform duration-200 hover:scale-105 shadow-xl focus:outline-none focus:ring-2 focus:ring-gold-400 flex items-center justify-center text-base md:text-base font-exo2 font-bold text-white rounded-2xl text-nowrap ${!consentGiven ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''}`}
              onClick={handleConsent}
              aria-label="Zgadzam się i kontynuuję"
              style={{ opacity: 1 }}
            >
              Zgadzam się i kontynuuję →
            </GlassSurface>
          </div>
        </GlassCard>
      </div>

      {/* Dialog IDA na dole - cała szerokość */}
      <div className="w-full">
        <AwaDialogue 
          currentStep="onboarding" 
          fullWidth={true}
          autoHide={true}
        />
      </div>
    </div>
  );
}
