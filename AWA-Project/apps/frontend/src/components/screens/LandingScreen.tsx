import React from 'react';
import { GlassCard, GlassButton } from '@/components/ui';
import { AwaContainer } from '@/components/awa/AwaContainer';
import { useRouter } from 'next/navigation';

const LandingScreen: React.FC = () => {
  const router = useRouter();

  return (
    <div className="min-h-screen flex">
      {/* AWA Panel */}
      <AwaContainer currentStep="landing" />

      {/* Main Content */}
      <div className="flex-1 ml-96 flex items-center justify-center p-8">
        <div className="max-w-2xl text-center">
          <GlassCard className="mb-8">
            <h1 className="text-5xl font-futuristic text-gray-800 mb-6 animate-pulse-slow">
              AURA
            </h1>
            <p className="text-xl text-gray-700 font-modern mb-4 leading-relaxed">
              Poznaj swoją futurystyczną asystentkę projektowania wnętrz
            </p>
            <p className="text-lg text-gray-600 font-modern leading-relaxed">
              Razem odkryjemy Twoje preferencje designerskie i stworzymy wizualizacje Twoich marzeń.
              AWA wykorzystuje najnowsze technologie AI, aby pomóc Ci zrozumieć własny gust estetyczny.
            </p>
          </GlassCard>

          <GlassCard variant="highlighted" className="mb-8">
            <h2 className="text-2xl font-futuristic text-gold-700 mb-4">
              Czego się dowiesz?
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm font-modern">
              <div className="text-center">
                <div className="text-3xl mb-2">🎨</div>
                <div>Twoje wizualne DNA</div>
              </div>
              <div className="text-center">
                <div className="text-3xl mb-2">🏠</div>
                <div>Idealne wnętrze</div>
              </div>
              <div className="text-center">
                <div className="text-3xl mb-2">✨</div>
                <div>Ukryte preferencje</div>
              </div>
            </div>
          </GlassCard>

          <GlassButton
            size="lg"
            onClick={() => router.push('/flow/onboarding')}
            className="text-xl px-12 py-4 animate-float"
          >
            Rozpocznij Podróż z AWA
          </GlassButton>

          <p className="text-sm text-gray-500 mt-4 font-modern">
            Badanie trwa około 15-20 minut
          </p>
        </div>
      </div>
    </div>
  );
};

export default LandingScreen;