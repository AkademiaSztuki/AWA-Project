import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { GlassCard } from '../ui/GlassCard';
import { GlassButton } from '../ui/GlassButton';
import { AwaContainer } from '../awa/AwaContainer';
import { AwaDialogue } from '../awa/AwaDialogue';
import { useSessionData } from '@/hooks/useSessionData';
import { useModalAPI } from '@/hooks/useModalAPI';
import { stopAllDialogueAudio } from '@/hooks/useAudioManager';

export function GenerationScreen() {
  const router = useRouter();
  const { sessionData, updateSessionData } = useSessionData();
  const { generateImages, isGenerating } = useModalAPI();
  const [generatedImages, setGeneratedImages] = useState<string[]>([]);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [ratings, setRatings] = useState<Record<string, any>>({});

  useEffect(() => {
    // Automatyczne generowanie na podstawie zebranych danych
    const generateInitialImages = async () => {
      if (sessionData?.visualDNA && sessionData?.coreNeed) {
        const prompt = buildPrompt(sessionData.visualDNA, sessionData.coreNeed);
        const images = await generateImages(prompt);
        setGeneratedImages(images);
      }
    };

    generateInitialImages();
  }, [sessionData, generateImages]);

  const buildPrompt = (visualDNA: any, coreNeed: string) => {
    return `Interior design, ${visualDNA.dominantStyle} style, ${visualDNA.colorPalette} colors, 
            ${visualDNA.materials} materials, ${visualDNA.lighting} lighting, 
            focusing on ${coreNeed}, high quality, architectural photography`;
  };

  const handleImageSelect = (imageUrl: string) => {
    setSelectedImage(imageUrl);
  };

  const handleRating = (imageUrl: string, category: string, value: number) => {
    setRatings(prev => ({
      ...prev,
      [imageUrl]: {
        ...prev[imageUrl],
        [category]: value
      }
    }));
  };

  const handleMicroModification = async () => {
    // Drobne modyfikacje
    const modifications = [
      "Zmień kolorystykę na cieplejszą",
      "Dodaj więcej oświetlenia",
      "Zamień materiały na naturalniejsze",
      "Zwiększ ilość roślin"
    ];

    // Tu byłaby integracja z FLUX dla modyfikacji
    alert(`Możliwe modyfikacje: ${modifications.join(', ')}`);
  };

  const handleMacroModification = async () => {
    // Zupełnie inny kierunek
    const newDirections = [
      "Skandynawski - jasny, minimalistyczny",
      "Industrialny - surowe materiały",
      "Boho - kolorowy, eklektyczny",
      "Klasyczny - elegancki, tradycyjny"
    ];

    alert(`Nowe kierunki: ${newDirections.join(', ')}`);
  };

  const handleContinue = () => {
    stopAllDialogueAudio(); // Zatrzymaj dźwięk przed nawigacją
    updateSessionData({
      generatedImages,
      selectedImage,
      imageRatings: ratings
    });
    router.push('/flow/survey1');
  };

  return (
    <div className="min-h-screen flex flex-col w-full">
      <AwaContainer 
        currentStep="generation"
        showDialogue={false}
        fullWidth={true}
        autoHide={false}
      />

      <div className="flex-1 p-8">
        <GlassCard className="w-full">
          <h2 className="text-3xl font-bold text-gray-800 mb-6 text-center">
            Twoje Wizualizacje
          </h2>

          {isGenerating ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4 animate-pulse">🎨</div>
              <p className="text-gray-600">Generuję wizualizacje na podstawie Twoich preferencji...</p>
            </div>
          ) : (
            <>
              {/* Grid obrazów */}
              <div className="grid grid-cols-2 gap-6 mb-8">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    onClick={() => handleImageSelect(`image-${i}`)}
                    className={`relative cursor-pointer rounded-lg overflow-hidden border-2 transition-all ${
                      selectedImage === `image-${i}` 
                        ? 'border-gold shadow-lg scale-105' 
                        : 'border-transparent hover:border-gold/50'
                    }`}
                  >
                    <div className="aspect-square bg-gray-200 flex items-center justify-center">
                      <span className="text-gray-500">Obraz {i}</span>
                    </div>

                    {selectedImage === `image-${i}` && (
                      <div className="absolute inset-0 bg-gold/20 flex items-center justify-center">
                        <span className="bg-gold text-white px-3 py-1 rounded">Wybrane</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Oceny semantyczne */}
              {selectedImage && (
                <GlassCard className="mb-8">
                  <h3 className="text-xl font-semibold mb-4">Oceń wybrany obraz:</h3>
                  <div className="space-y-6">
                    {[
                      { label: 'Nietrafiona ↔ Idealna', key: 'match' },
                      { label: 'Nijaka ↔ Z charakterem', key: 'character' },
                      { label: 'Chaotyczna ↔ Harmonijna', key: 'harmony' }
                    ].map(({ label, key }) => (
                      <div key={key}>
                        <div className="flex justify-between text-sm text-gray-600 mb-2">
                          <span>{label.split(' ↔ ')[0]}</span>
                          <span>{label.split(' ↔ ')[1]}</span>
                        </div>
                        <input
                          type="range"
                          min="1"
                          max="7"
                          value={ratings[selectedImage]?.[key] || 4}
                          onChange={(e) => handleRating(selectedImage, key, parseInt(e.target.value))}
                          className="w-full"
                        />
                      </div>
                    ))}
                  </div>
                </GlassCard>
              )}

              {/* Przyciski modyfikacji */}
              <div className="flex justify-center space-x-4 mb-8">
                <GlassButton
                  onClick={handleMicroModification}
                  variant="secondary"
                >
                  Drobne modyfikacje
                </GlassButton>
                <GlassButton
                  onClick={handleMacroModification}
                  variant="secondary"
                >
                  Zupełnie inny kierunek
                </GlassButton>
              </div>

              <div className="flex justify-center">
                <GlassButton onClick={handleContinue}>
                  Przejdź do ankiety →
                </GlassButton>
              </div>
            </>
          )}
        </GlassCard>
      </div>

      {/* Dialog IDA na dole - cała szerokość */}
      <div className="w-full">
        <AwaDialogue 
          currentStep="generation" 
          fullWidth={true}
          autoHide={true}
        />
      </div>
    </div>
  );
}