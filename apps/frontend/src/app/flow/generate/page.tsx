'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useSessionData } from '@/hooks/useSessionData';
import { useModalAPI } from '@/hooks/useModalAPI';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';
import {
  Wand2,
  RefreshCw,
  Settings,
  ArrowRight,
  Heart,
  Star,
  Palette,
  Home,
  Lightbulb,
  Sparkles,
} from 'lucide-react';
import Image from 'next/image';

/*************************
 * Types & Constants     *
 *************************/

interface GeneratedImage {
  id: string;
  url: string;        // data url used in <Image>
  base64: string;     // raw base64 for re-use
  prompt: string;
  parameters: any;    // keep loose for now to avoid TS mismatch
  ratings: {
    aesthetic_match: number;
    character: number;
    harmony: number;
  };
  isFavorite: boolean;
  createdAt: number;
}

interface ModificationOption {
  id: string;
  label: string;
  icon: React.ReactNode;
  category: 'micro' | 'macro';
}

const MICRO_MODIFICATIONS: ModificationOption[] = [
  { id: 'warmer_colors', label: 'Cieplejsze kolory', icon: <Palette size={16} />, category: 'micro' },
  { id: 'more_lighting', label: 'Więcej światła', icon: <Lightbulb size={16} />, category: 'micro' },
  { id: 'natural_materials', label: 'Naturalne materiały', icon: <span className="text-sm">🌿</span>, category: 'micro' },
  { id: 'more_plants', label: 'Więcej roślin', icon: <span className="text-sm">🪴</span>, category: 'micro' },
  { id: 'textured_walls', label: 'Teksturowane ściany', icon: <span className="text-sm">🧱</span>, category: 'micro' },
  { id: 'rearrange_furniture', label: 'Przestaw meble', icon: <Home size={16} />, category: 'micro' },
  { id: 'add_decorations', label: 'Dodaj dekoracje', icon: <Star size={16} />, category: 'micro' },
  { id: 'more_spacious', label: 'Bardziej przestronnie', icon: <span className="text-sm">📐</span>, category: 'micro' },
  { id: 'change_flooring', label: 'Zmień podłogę', icon: <span className="text-sm">🟫</span>, category: 'micro' },
  { id: 'bigger_windows', label: 'Większe okna', icon: <span className="text-sm">🪟</span>, category: 'micro' },
];

const MACRO_MODIFICATIONS: ModificationOption[] = [
  { id: 'scandinavian', label: 'Skandynawski', icon: <span className="text-sm">🌲</span>, category: 'macro' },
  { id: 'industrial', label: 'Industrialny', icon: <span className="text-sm">🏭</span>, category: 'macro' },
  { id: 'bohemian', label: 'Boho', icon: <span className="text-sm">🎨</span>, category: 'macro' },
  { id: 'classic', label: 'Klasyczny', icon: <span className="text-sm">🏛️</span>, category: 'macro' },
  { id: 'modern', label: 'Nowoczesny', icon: <span className="text-sm">🔷</span>, category: 'macro' },
  { id: 'rustic', label: 'Rustykalny', icon: <span className="text-sm">🏡</span>, category: 'macro' },
  { id: 'art_deco', label: 'Art Deco', icon: <span className="text-sm">💎</span>, category: 'macro' },
  { id: 'zen', label: 'Zen', icon: <span className="text-sm">🧘</span>, category: 'macro' },
];

/*************************
 * Component             *
 *************************/

export default function GeneratePage() {
  const router = useRouter();
  const { sessionData, updateSessionData } = useSessionData();
  const { generateImages, isLoading, error, setError, checkHealth } = useModalAPI();

  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [selectedImage, setSelectedImage] = useState<GeneratedImage | null>(null);
  const [showModifications, setShowModifications] = useState(false);
  const [generationCount, setGenerationCount] = useState(0);
  const [isApiReady, setIsApiReady] = useState(false);
  const [statusMessage, setStatusMessage] = useState("Krok 1/3: Inicjalizacja środowiska AI...");

  /** Poll for API readiness on mount */
  useEffect(() => {
    const waitForApi = async () => {
      console.log("Rozpoczynam sprawdzanie gotowości API...");
      for (let i = 0; i < 30; i++) { // Wait up to 2.5 minutes
        const isReady = await checkHealth();
        console.log(`[Health Check ${i + 1}] API gotowe: ${isReady}`);
        if (isReady) {
          setIsApiReady(true);
          setStatusMessage("Krok 2/3: API gotowe. Przygotowuję dane...");
          return;
        }
        await new Promise(resolve => setTimeout(resolve, 5000)); // Check every 5s
      }
      setStatusMessage("Środowisko AI nie odpowiada. Spróbuj odświeżyć stronę.");
      setError("Nie udało się połączyć z serwerem generującym obrazy. Proszę odświeżyć stronę.");
    };
    
    waitForApi();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Intentionally run only once on mount

  /** Trigger initial generation when API is ready */
  useEffect(() => {
    // Only run if the API is ready and no images have been generated yet.
    if (isApiReady && generationCount === 0 && !isLoading) {
      handleInitialGeneration();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isApiReady, generationCount, isLoading]); // Depend on all conditions


  /** Build initial prompt based on session data */
  const buildInitialPrompt = () => {
    const { visualDNA, coreNeed } = sessionData as any;

    let prompt = 'Interior design, ';

    if (visualDNA) {
      if (visualDNA.dominantStyle) prompt += `${visualDNA.dominantStyle.toLowerCase()} style, `;
      if (visualDNA.colorPalette) prompt += `${visualDNA.colorPalette.toLowerCase()}, `;
      if (visualDNA.materials) prompt += `${visualDNA.materials.toLowerCase()}, `;
      if (visualDNA.lighting) prompt += `${visualDNA.lighting.toLowerCase()}, `;
      if (visualDNA.mood) prompt += `${visualDNA.mood.toLowerCase()} atmosphere, `;
    }

    if (coreNeed) {
      const needPrompts: Record<string, string> = {
        regeneration: 'peaceful and restorative space for relaxation',
        creativity: 'inspiring and artistic environment for creative work',
        family_bonding: 'warm and welcoming space for family gatherings',
        achievement: 'professional and focused workspace for productivity',
        self_development: 'quiet and contemplative space for learning',
        mental_wellness: 'calming and balanced environment for wellbeing',
        security: 'safe and comfortable sanctuary space',
        authenticity: 'personal and genuine space reflecting individual style',
        connection: 'social and inviting space for entertaining guests',
      };
      prompt += needPrompts[coreNeed] || '';
    }

    return prompt.replace(/, +/g, ', ').replace(/, $/, '').trim();
  };

  /** Generate initial set of images */
  const handleInitialGeneration = async (force = false) => {
    if (!isApiReady) {
      console.log("API not ready, generation cancelled.");
      return;
    }
    if (!force && generationCount > 0) return;
    console.log("handleInitialGeneration: Rozpoczynam generowanie obrazów.");
    
    // --- DEFENSIVE CHECK ---
    console.log("Pełne dane sesji w momencie generowania:", sessionData);
    const typedSessionData = sessionData as any;

    if (!typedSessionData || !typedSessionData.roomImage) {
      console.error("KRYTYCZNY BŁĄD: Brak 'roomImage' w danych sesji. Zatrzymuję generowanie.");
      setError("Nie można rozpocząć generowania, ponieważ w sesji brakuje zdjęcia Twojego pokoju. Spróbuj cofnąć się i dodać je ponownie.");
      setStatusMessage("Błąd danych wejściowych.");
      return;
    }

    if (!typedSessionData.visualDNA) {
      typedSessionData.visualDNA = {
        dominantStyle: 'scandinavian',
        colorPalette: 'warm pastel',
        materials: 'wood, linen',
        lighting: 'natural daylight',
        mood: 'cozy'
      };
    }
    if (!typedSessionData.coreNeed) {
      typedSessionData.coreNeed = 'regeneration';
    }
    // --- END DEFENSIVE CHECK ---
    
    setStatusMessage("Krok 3/3: Wysyłanie zadania do AI. To może potrwać kilka minut...");
    const prompt = buildInitialPrompt();
    console.log("handleInitialGeneration: Zbudowany prompt:", prompt);

    try {
      const response = await generateImages({
        prompt,
        base_image: typedSessionData.roomImage,
        style: typedSessionData.visualDNA?.dominantStyle || 'modern',
        modifications: [],
        strength: 0.5,
        steps: 15,
        guidance: 4.0,
        num_images: 1,
        image_size: 384, // Added for testing
      });

      if (!response || !response.images) {
        console.error("Otrzymano pustą odpowiedź z API po generowaniu.");
        setError("Nie udało się wygenerować obrazów. Otrzymano pustą odpowiedź z serwera.");
        return;
      }

      const newImages: GeneratedImage[] = response.images.map((base64: string, index: number) => ({
        id: `gen-${generationCount}-${index}`,
        url: `data:image/png;base64,${base64}`,
        base64,
        prompt,
        parameters: response.parameters,
        ratings: { aesthetic_match: 0, character: 0, harmony: 0 },
        isFavorite: false,
        createdAt: Date.now(),
      }));

      setGeneratedImages(newImages);
      setSelectedImage(newImages[0]);
      setGenerationCount((prev) => prev + 1);

      await updateSessionData({
        generations: [
          ...((sessionData as any).generations || []),
          {
            id: `gen-${generationCount}`,
            prompt,
            images: newImages.length,
            timestamp: Date.now(),
            type: 'initial',
          },
        ],
      });
    } catch (err) {
      console.error('Generation failed in handleInitialGeneration:', err);
      setError(err instanceof Error ? err.message : 'Wystąpił nieznany błąd podczas generacji.');
    }
  };

  /** Handle micro / macro modification */
  const handleModification = async (modification: ModificationOption) => {
    if (!selectedImage) return;

    const isMacro = modification.category === 'macro';
    const basePrompt = isMacro
      ? `${modification.label} interior design style, ${buildInitialPrompt()}`
      : selectedImage.prompt;

    const modifications = isMacro
      ? [modification.label]
      : [
          ...((selectedImage.parameters && selectedImage.parameters.modifications) || []),
          modification.label,
        ];

    try {
      const response = await generateImages({
        prompt: basePrompt,
        base_image: isMacro ? (sessionData as any).roomImage : selectedImage.base64,
        style: isMacro ? modification.id : selectedImage.parameters.style,
        modifications,
        strength: isMacro ? 0.75 : 0.4,
        steps: isMacro ? 30 : 25,
        guidance: isMacro ? 6.0 : 4.0,
        num_images: 1,
        image_size: 384, // Added for testing
      });

      if (!response || !response.images) {
        console.error("Otrzymano pustą odpowiedź z API po modyfikacji.");
        setError("Nie udało się zmodyfikować obrazu. Otrzymano pustą odpowiedź z serwera.");
        return;
      }

      const newImages: GeneratedImage[] = response.images.map((base64: string, index: number) => ({
        id: `mod-${generationCount}-${index}`,
        url: `data:image/png;base64,${base64}`,
        base64,
        prompt: basePrompt,
        parameters: { ...response.parameters, modifications },
        ratings: { aesthetic_match: 0, character: 0, harmony: 0 },
        isFavorite: false,
        createdAt: Date.now(),
      }));

      setGeneratedImages((prev) => [...prev, ...newImages]);
      setSelectedImage(newImages[0]);
      setGenerationCount((prev) => prev + 1);
      setShowModifications(false);

      await updateSessionData({
        generations: [
          ...((sessionData as any).generations || []),
          {
            id: `mod-${generationCount}`,
            prompt: basePrompt,
            images: newImages.length,
            timestamp: Date.now(),
            type: isMacro ? 'macro' : 'micro',
            modification: modification.label,
          },
        ],
      });
    } catch (err) {
      console.error('Modification failed:', err);
      setError(err instanceof Error ? err.message : 'Wystąpił nieznany błąd podczas modyfikacji.');
    }
  };

  /** Rating handler */
  const handleImageRating = async (
    imageId: string,
    rating: keyof GeneratedImage['ratings'],
    value: number,
  ) => {
    setGeneratedImages((prev) =>
      prev.map((img) =>
        img.id === imageId ? { ...img, ratings: { ...img.ratings, [rating]: value } } : img,
      ),
    );

    if (selectedImage?.id === imageId) {
      setSelectedImage((prev) => (prev ? { ...prev, ratings: { ...prev.ratings, [rating]: value } } : null));
    }

    await updateSessionData({
      // @ts-ignore - runtime property
      imageRatings: {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        ...(sessionData as any).imageRatings || {},
        [imageId]: {
          ...((sessionData as any).imageRatings?.[imageId] || {}),
          [rating]: value,
          timestamp: Date.now(),
        },
      },
    } as any);
  };

  /** Toggle favourite */
  const handleFavorite = (imageId: string) => {
    setGeneratedImages((prev) =>
      prev.map((img) => (img.id === imageId ? { ...img, isFavorite: !img.isFavorite } : img)),
    );
    if (selectedImage?.id === imageId) {
      setSelectedImage((prev) => (prev ? { ...prev, isFavorite: !prev.isFavorite } : null));
    }
  };

  /** Continue to survey */
  const handleContinue = () => {
    router.push('/flow/survey1');
  };

  /*************************
   * Render                *
   *************************/

  return (
    <div className="min-h-screen flex bg-gradient-radial from-pearl-50 to-platinum-100">
      {/* Main content */}
      <div className="w-full p-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="space-y-6"
        >
              {/* Header */}
              <div className="text-center">
                <h1 className="text-4xl font-bold bg-gradient-to-r from-gold to-champagne bg-clip-text text-transparent mb-2">
                  Twoje Wymarzone Wnętrza
                </h1>
                <p className="text-lg text-graphite">Generowane przez AI na podstawie Twojego wizualnego DNA</p>
              </div>

              {/* Loading */}
              {(isLoading || !isApiReady) && (
                <div className="text-center py-12">
                  <GlassCard className="p-8">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                      className="w-16 h-16 mx-auto mb-4 text-gold"
                    >
                      <Sparkles size={64} />
                    </motion.div>
                    <h3 className="text-xl font-semibold text-graphite mb-2">{statusMessage}</h3>
                    <p className="text-silver-dark">To może potrwać kilka minut przy pierwszym uruchomieniu.</p>
                  </GlassCard>
                </div>
              )}

              {/* Error */}
              {error && (
                <GlassCard className="p-6 border-red-200">
                  <div className="text-center text-red-600">
                    <p className="font-semibold">Wystąpił błąd podczas generowania</p>
                    <p className="text-sm mt-2">{error}</p>
                    <GlassButton onClick={() => { void handleInitialGeneration(true); }} className="mt-4">
                      Spróbuj ponownie
                    </GlassButton>
                  </div>
                </GlassCard>
              )}

              {/* Images */}
              {generatedImages.length > 0 && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Selected */}
                  <div className="lg:col-span-2">
                    <GlassCard className="p-4">
                      {selectedImage && (
                        <div className="space-y-4">
                          <div className="relative aspect-[4/3] rounded-lg overflow-hidden">
                            <Image src={selectedImage.url} alt="Generated interior" fill className="object-cover" />

                            {/* fav */}
                            <button
                              onClick={() => handleFavorite(selectedImage.id)}
                              className={`absolute top-4 right-4 p-2 rounded-full backdrop-blur transition-all ${
                                selectedImage.isFavorite ? 'bg-red-100 text-red-500' : 'bg-white/20 text-white hover:bg-white/30'
                              }`}
                            >
                              <Heart size={20} fill={selectedImage.isFavorite ? 'currentColor' : 'none'} />
                            </button>
                          </div>

                          {/* Ratings */}
                          <div className="space-y-4">
                            <h4 className="font-semibold text-graphite">Oceń to wnętrze:</h4>
                            {[
                              {
                                key: 'aesthetic_match',
                                left: 'Nietrafiona',
                                mid: 'Zgodność z gustem',
                                right: 'Idealna',
                              },
                              {
                                key: 'character',
                                left: 'Nijaka',
                                mid: 'Z charakterem',
                                right: 'Pełna charakteru',
                              },
                              {
                                key: 'harmony',
                                left: 'Chaotyczna',
                                mid: 'Harmonijna',
                                right: 'Idealna harmonia',
                              },
                            ].map(({ key, left, mid, right }) => (
                              <div key={key}>
                                <div className="flex justify-between items-center mb-2">
                                  <span className="text-sm text-silver-dark">{left}</span>
                                  <span className="text-sm font-medium text-graphite">{mid}</span>
                                  <span className="text-sm text-silver-dark">{right}</span>
                                </div>
                                <div className="flex space-x-1">
                                  {[1, 2, 3, 4, 5, 6, 7].map((r) => (
                                    <button
                                      key={r}
                                      onClick={() => handleImageRating(selectedImage.id, key as any, r)}
                                      className={`w-8 h-8 rounded-full border-2 text-sm ${
                                        (selectedImage.ratings as any)[key] >= r
                                          ? 'bg-gold border-gold text-white'
                                          : 'border-silver text-silver-dark hover:border-gold'
                                      }`}
                                    >
                                      {r}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* actions */}
                          <div className="flex space-x-3">
                            <GlassButton onClick={() => setShowModifications((m) => !m)} variant="secondary" className="flex-1">
                              <Settings size={16} className="mr-2" />
                              {showModifications ? 'Ukryj opcje' : 'Modyfikuj'}
                            </GlassButton>

                            <GlassButton onClick={() => { void handleInitialGeneration(true); }} variant="secondary">
                              <RefreshCw size={16} />
                            </GlassButton>
                          </div>
                        </div>
                      )}
                    </GlassCard>
                  </div>

                  {/* Thumbnails & modifications */}
                  <div className="space-y-4">
                    <GlassCard className="p-4">
                      <h4 className="font-semibold text-graphite mb-3">Wszystkie warianty:</h4>
                      <div className="grid grid-cols-2 gap-3">
                        {generatedImages.slice(-8).map((image) => (
                          <motion.div
                            key={image.id}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setSelectedImage(image)}
                            className={`relative aspect-square rounded-lg overflow-hidden cursor-pointer ${
                              selectedImage?.id === image.id ? 'ring-2 ring-gold' : ''
                            }`}
                          >
                            <Image src={image.url} alt="thumbnail" fill className="object-cover" />
                            {image.isFavorite && (
                              <div className="absolute top-2 right-2">
                                <Heart size={16} className="text-red-500" fill="currentColor" />
                              </div>
                            )}
                          </motion.div>
                        ))}
                      </div>
                    </GlassCard>

                    {/* modifications panel */}
                    <AnimatePresence>
                      {showModifications && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                        >
                          <GlassCard className="p-4">
                            {/* micro */}
                            <div className="mb-6">
                              <h4 className="font-semibold text-graphite mb-3 flex items-center">
                                <Wand2 size={16} className="mr-2" />
                                Drobne modyfikacje
                              </h4>
                              <div className="grid grid-cols-1 gap-2">
                                {MICRO_MODIFICATIONS.map((mod) => (
                                  <GlassButton
                                    key={mod.id}
                                    onClick={() => handleModification(mod)}
                                    variant="secondary"
                                    size="sm"
                                    className="justify-start text-sm"
                                    disabled={isLoading}
                                  >
                                    <span className="mr-2">{mod.icon}</span>
                                    {mod.label}
                                  </GlassButton>
                                ))}
                              </div>
                            </div>

                            {/* macro */}
                            <div>
                              <h4 className="font-semibold text-graphite mb-3 flex items-center">
                                <RefreshCw size={16} className="mr-2" />
                                Zupełnie inny kierunek
                              </h4>
                              <div className="grid grid-cols-2 gap-2">
                                {MACRO_MODIFICATIONS.map((mod) => (
                                  <GlassButton
                                    key={mod.id}
                                    onClick={() => handleModification(mod)}
                                    variant="secondary"
                                    size="sm"
                                    className="justify-start text-sm"
                                    disabled={isLoading}
                                  >
                                    <span className="mr-2">{mod.icon}</span>
                                    {mod.label}
                                  </GlassButton>
                                ))}
                              </div>
                            </div>
                          </GlassCard>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              )}

              {/* Continue */}
              {generatedImages.length > 0 && (
                <div className="flex justify-center pt-6">
                  <GlassButton onClick={handleContinue} size="lg" className="px-8 py-4 font-semibold">
                    <span className="flex items-center space-x-2">
                      <span>Przejdź do Ankiety</span>
                      <ArrowRight size={20} />
                    </span>
                  </GlassButton>
                </div>
              )}
            </motion.div>
          </div>
    </div>
  );
}