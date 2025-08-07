'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useSessionData } from '@/hooks/useSessionData';
import { useModalAPI } from '@/hooks/useModalAPI';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';
import { GlassSlider } from '@/components/ui/GlassSlider';
import { AwaContainer, AwaDialogue } from '@/components/awa';
import { stopAllDialogueAudio } from '@/hooks/useAudioManager';
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
    is_my_interior: number;
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
  { id: 'warmer_colors', label: 'Cieplejsze kolory', icon: null, category: 'micro' },
  { id: 'cooler_colors', label: 'Chłodniejsze kolory', icon: null, category: 'micro' },
  { id: 'more_lighting', label: 'Więcej oświetlenia', icon: null, category: 'micro' },
  { id: 'darker_mood', label: 'Ciemniejszy nastrój', icon: null, category: 'micro' },
  { id: 'natural_materials', label: 'Naturalne materiały', icon: null, category: 'micro' },
  { id: 'more_plants', label: 'Więcej roślin', icon: null, category: 'micro' },
  { id: 'less_plants', label: 'Mniej roślin', icon: null, category: 'micro' },
  { id: 'textured_walls', label: 'Teksturowane ściany', icon: null, category: 'micro' },
  { id: 'add_decorations', label: 'Dodaj dekoracje', icon: null, category: 'micro' },
  { id: 'change_flooring', label: 'Zmień podłogę', icon: null, category: 'micro' },
];

const MACRO_MODIFICATIONS: ModificationOption[] = [
  { id: 'scandinavian', label: 'Skandynawski', icon: null, category: 'macro' },
  { id: 'minimalist', label: 'Minimalistyczny', icon: null, category: 'macro' },
  { id: 'classic', label: 'Klasyczny', icon: null, category: 'macro' },
  { id: 'industrial', label: 'Industrialny', icon: null, category: 'macro' },
  { id: 'eclectic', label: 'Eklektyczny', icon: null, category: 'macro' },
  { id: 'glamour', label: 'Glamour', icon: null, category: 'macro' },
  { id: 'bohemian', label: 'Boho', icon: null, category: 'macro' },
  { id: 'rustic', label: 'Rustykalny', icon: null, category: 'macro' },
  { id: 'provencal', label: 'Prowansalski', icon: null, category: 'macro' },
  { id: 'shabby_chic', label: 'Shabby Chic', icon: null, category: 'macro' },
];

export default function GeneratePage() {
  const router = useRouter();
  const { sessionData, updateSessionData } = useSessionData();
  const { generateImages, isLoading, error, setError, checkHealth } = useModalAPI();

  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [selectedImage, setSelectedImage] = useState<GeneratedImage | null>(null);
  const [showModifications, setShowModifications] = useState(false);
  const [generationCount, setGenerationCount] = useState(0);
  const [isApiReady, setIsApiReady] = useState(false);
  const [hasAttemptedGeneration, setHasAttemptedGeneration] = useState(false);
  const [statusMessage, setStatusMessage] = useState("Krok 1/3: Inicjalizacja środowiska AI...");
  const [hasAnsweredInteriorQuestion, setHasAnsweredInteriorQuestion] = useState(false);
  const [hasCompletedRatings, setHasCompletedRatings] = useState(false);

  useEffect(() => {
    const waitForApi = async () => {
      console.log("Rozpoczynam sprawdzanie gotowości API...");
      for (let i = 0; i < 30; i++) {
        const isReady = await checkHealth();
        console.log(`[Health Check ${i + 1}] API gotowe: ${isReady}`);
        if (isReady) {
          setIsApiReady(true);
          setStatusMessage("Krok 2/3: API gotowe. Przygotowuję dane...");
          return;
        }
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
      setStatusMessage("Środowisko AI nie odpowiada. Spróbuj odświeżyć stronę.");
      setError("Nie udało się połączyć z serwerem generującym obrazy. Proszę odświeżyć stronę.");
    };
    
    waitForApi();
  }, []);

  useEffect(() => {
    if (isApiReady && generationCount === 0 && !hasAttemptedGeneration) {
      setHasAttemptedGeneration(true);
      handleInitialGeneration();
    }
  }, [isApiReady, generationCount, hasAttemptedGeneration]);

  const buildInitialPrompt = () => {
    const { visualDNA, coreNeed, ladderResults, usagePattern, emotionalPreference } = sessionData as any;

    const promptParts = [];

    promptParts.push("Professional interior design photography");

    const roomType = (sessionData as any).roomType || 'living room';
    const style = visualDNA?.dominantStyle || 'modern';
    promptParts.push(`of a ${roomType} in ${style} architectural style`);

    if (coreNeed && ladderResults?.promptElements) {
      const elements = ladderResults.promptElements;
      
      promptParts.push(`featuring ${elements.atmosphere}`);
      promptParts.push(`with ${elements.materials}`);
      promptParts.push(`using ${elements.colors}`);
      promptParts.push(`illuminated by ${elements.lighting}`);
      promptParts.push(`arranged in ${elements.layout}`);
    }

    if (usagePattern?.timeOfDay) {
      const timePrompts: Record<string, string> = {
        morning: "optimized for morning use with bright, energizing daylight",
        afternoon: "designed for afternoon productivity with balanced natural lighting", 
        evening: "perfect for evening relaxation with warm, ambient lighting",
        night: "created for nighttime comfort with soft, cozy illumination"
      };
      promptParts.push(timePrompts[usagePattern.timeOfDay] || "");
    }

    if (emotionalPreference?.emotion) {
      const moodPrompts: Record<string, string> = {
        peaceful: "evoking deep tranquility and inner peace",
        energetic: "inspiring motivation and dynamic energy", 
        joyful: "radiating happiness and positive vibes",
        focused: "promoting concentration and mental clarity"
      };
      promptParts.push(moodPrompts[emotionalPreference.emotion] || "");
    }

    promptParts.push("shot with professional camera");
    promptParts.push("high resolution, sharp focus");
    promptParts.push("realistic lighting and shadows");
    promptParts.push("interior design magazine quality");

    return promptParts.filter(Boolean).join(', ');
  };

  const getOptimalParameters = (modificationType: 'initial' | 'micro' | 'macro', iterationCount: number = 0) => {
    const qualityAdjustment = Math.max(0.1, 1 - (iterationCount * 0.1));
    
    const baseParams = {
      initial: {
        strength: 0.6,
        steps: 25,
        guidance: 4.5,
        num_images: 1,
        image_size: 512
      },
      micro: {
        strength: 0.25 * qualityAdjustment,
        steps: 18,
        guidance: 3.5,
        num_images: 1,
        image_size: 512
      },
      macro: {
        strength: 0.75,
        steps: 28,
        guidance: 5.5,
        num_images: 1,
        image_size: 512
      }
    };

    return baseParams[modificationType];
  };

  const handleInitialGeneration = async (force = false) => {
    if (!isApiReady) {
      console.log("API not ready, generation cancelled.");
      return;
    }
    if (!force && generationCount > 0) return;
    
    console.log("handleInitialGeneration: Rozpoczynam generowanie obrazów.");
    
    const typedSessionData = sessionData as any;

    if (!typedSessionData || !typedSessionData.roomImage) {
      console.error("KRYTYCZNY BŁĄD: Brak 'roomImage' w danych sesji.");
      setError("Nie można rozpocząć generowania, ponieważ w sesji brakuje zdjęcia Twojego pokoju.");
      setStatusMessage("Błąd danych wejściowych.");
      return;
    }

    setStatusMessage("Krok 3/3: Wysyłanie zadania do AI. To może potrwać kilka minut...");
    
    const prompt = buildInitialPrompt();
    const parameters = getOptimalParameters('initial', generationCount);
    
    console.log("FLUX Kontext Structured Prompt:", prompt);
    console.log("FLUX Kontext Parameters:", parameters);

    try {
      const response = await generateImages({
        prompt,
        base_image: typedSessionData.roomImage,
        style: typedSessionData.visualDNA?.dominantStyle || 'modern',
        modifications: [],
        ...parameters
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
        parameters: { ...response.parameters, modificationType: 'initial' },
        ratings: { aesthetic_match: 0, character: 0, harmony: 0, is_my_interior: 0 },
        isFavorite: false,
        createdAt: Date.now(),
      }));

      setGeneratedImages(newImages);
      setSelectedImage(newImages[0]);
      setGenerationCount((prev) => prev + 1);
      
      setHasAnsweredInteriorQuestion(false);
      setHasCompletedRatings(false);

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

  const handleModification = async (modification: ModificationOption) => {
    if (!selectedImage) return;

    const isMacro = modification.category === 'macro';
    const baseImageSource = selectedImage.base64;

    let modificationPrompt: string;
    
    if (isMacro) {
      modificationPrompt = buildMacroPrompt(modification);
    } else {
      modificationPrompt = buildMicroPrompt(modification);
    }

    const parameters = getOptimalParameters(isMacro ? 'macro' : 'micro', generationCount);

    try {
      const response = await generateImages({
        prompt: modificationPrompt,
        base_image: baseImageSource,
        style: isMacro ? modification.id : (selectedImage.parameters?.style || 'modern'),
        modifications: isMacro ? [modification.label] : [],
        ...parameters
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
        prompt: modificationPrompt,
        parameters: { 
          ...response.parameters, 
          modificationType: isMacro ? 'macro' : 'micro',
          modifications: [modification.label],
          iterationCount: generationCount,
          usedOriginal: false
        },
        ratings: { aesthetic_match: 0, character: 0, harmony: 0, is_my_interior: 0 },
        isFavorite: false,
        createdAt: Date.now(),
      }));

      setGeneratedImages((prev) => [...prev, ...newImages]);
      setSelectedImage(newImages[0]);
      setGenerationCount((prev) => prev + 1);
      setShowModifications(false);
      
      setHasAnsweredInteriorQuestion(false);
      setHasCompletedRatings(false);

      await updateSessionData({
        generations: [
          ...((sessionData as any).generations || []),
          {
            id: `mod-${generationCount}`,
            prompt: modificationPrompt,
            images: newImages.length,
            timestamp: Date.now(),
            type: isMacro ? 'macro' : 'micro',
            modification: modification.label,
            iterationCount: generationCount,
            usedOriginal: false
          },
        ],
      });
    } catch (err) {
      console.error('Modification failed:', err);
      setError(err instanceof Error ? err.message : 'Wystąpił nieznany błąd podczas modyfikacji.');
    }
  };

  const handleRemoveFurniture = async () => {
    if (!selectedImage) return;
    
    const removeFurniturePrompt = "Remove ALL furniture and accessories from the room. Keep only walls, doors, windows, ceiling, stairs, and floor. Empty room with no furniture, no decorations, no rugs, no plants, no lighting fixtures. Clean empty space.";
    
    try {
      const response = await generateImages({
        prompt: removeFurniturePrompt,
        base_image: selectedImage.base64,
        style: 'empty',
        modifications: ['remove_furniture'],
        ...getOptimalParameters('micro', generationCount)
      });

      if (!response || !response.images) {
        setError("Nie udało się usunąć mebli.");
        return;
      }

      const newImage: GeneratedImage = {
        id: `remove-${Date.now()}`,
        url: `data:image/png;base64,${response.images[0]}`,
        base64: response.images[0],
        prompt: removeFurniturePrompt,
        parameters: { 
          ...response.parameters, 
          modificationType: 'remove_furniture',
          modifications: ['remove_furniture'],
          iterationCount: generationCount,
          usedOriginal: false
        },
        ratings: { aesthetic_match: 0, character: 0, harmony: 0, is_my_interior: 0 },
        isFavorite: false,
        createdAt: Date.now(),
      };

      setGeneratedImages((prev) => [...prev, newImage]);
      setSelectedImage(newImage);
      setGenerationCount((prev) => prev + 1);
      setShowModifications(false);
      
      setHasAnsweredInteriorQuestion(false);
      setHasCompletedRatings(false);

      await updateSessionData({
        generations: [
          ...((sessionData as any).generations || []),
          {
            id: `remove-${Date.now()}`,
            prompt: removeFurniturePrompt,
            images: 1,
            timestamp: Date.now(),
            type: 'remove_furniture',
            modifications: ['remove_furniture'],
            iterationCount: generationCount,
            usedOriginal: false
          },
        ],
      });
    } catch (err) {
      console.error('Remove furniture failed:', err);
      setError(err instanceof Error ? err.message : 'Wystąpił błąd podczas usuwania mebli.');
    }
  };

  const handleQualityImprovement = async () => {
    if (!selectedImage) return;
    
    const currentStyle = selectedImage.parameters?.style || 'modern';
    
    const qualityPrompt = `Improve this ${currentStyle} interior: enhance sharpness, remove artifacts, improve lighting quality, add realistic shadows, enhance material textures, perfect composition, professional photography, crisp details, natural lighting, high resolution quality`;
    
    try {
      const response = await generateImages({
        prompt: qualityPrompt,
        base_image: selectedImage.base64,
        style: currentStyle,
        modifications: ['quality_improvement'],
        ...getOptimalParameters('micro', generationCount)
      });

      if (!response || !response.images) {
        setError("Nie udało się poprawić jakości obrazu.");
        return;
      }

      const newImage: GeneratedImage = {
        id: `quality-${Date.now()}`,
        url: `data:image/png;base64,${response.images[0]}`,
        base64: response.images[0],
        prompt: qualityPrompt,
        parameters: { 
          ...response.parameters, 
          modificationType: 'quality_improvement',
          modifications: ['quality_improvement'],
          iterationCount: generationCount,
          usedOriginal: false
        },
        ratings: { aesthetic_match: 0, character: 0, harmony: 0, is_my_interior: 0 },
        isFavorite: false,
        createdAt: Date.now(),
      };

      setGeneratedImages((prev) => [...prev, newImage]);
      setSelectedImage(newImage);
      setGenerationCount((prev) => prev + 1);
      setShowModifications(false);
      
      setHasAnsweredInteriorQuestion(false);
      setHasCompletedRatings(false);

      await updateSessionData({
        generations: [
          ...((sessionData as any).generations || []),
          {
            id: `quality-${Date.now()}`,
            prompt: qualityPrompt,
            images: 1,
            timestamp: Date.now(),
            type: 'quality_improvement',
            modifications: ['quality_improvement'],
            iterationCount: generationCount,
            usedOriginal: false
          },
        ],
      });
    } catch (err) {
      console.error('Quality improvement failed:', err);
      setError(err instanceof Error ? err.message : 'Wystąpił błąd podczas poprawiania jakości.');
    }
  };

  const buildMacroPrompt = (modification: ModificationOption) => {
    const stylePrompts = {
      scandinavian: "Replace ALL furniture and accessories with Scandinavian style: white walls, light oak wooden floors, cozy beige sofa with cream throw pillows, minimalist coffee table, large windows with natural light, hygge atmosphere, neutral color palette of whites and warm grays, simple geometric patterns, potted green plants, clean lines, functional furniture, peaceful and bright space",
      minimalist: "Replace ALL furniture and accessories with minimalist style: clean white walls, polished concrete floors, sleek modern furniture with geometric shapes, neutral color scheme of white, gray and beige, empty space with perfect symmetry, hidden storage solutions, single statement piece of art, floor-to-ceiling windows, natural light flooding the space, uncluttered surfaces, zen-like atmosphere",
      classic: "Replace ALL furniture and accessories with classical style: elegant living room with ornate moldings, rich mahogany furniture, luxurious velvet upholstery in deep burgundy, crystal chandelier, marble fireplace with decorative mantle, Persian rug with intricate patterns, gold accents, symmetrical layout, heavy drapes with tassels, antique decorative objects, warm ambient lighting, traditional European elegance",
      industrial: "Replace ALL furniture and accessories with industrial loft style: exposed brick walls, raw concrete floors, high ceilings with visible steel beams, large factory windows, weathered leather furniture, metal pipe shelving, vintage Edison bulb lighting fixtures, distressed wood dining table, iron staircase, urban atmosphere, muted color palette of grays and browns, raw materials",
      eclectic: "Replace ALL furniture and accessories with eclectic style: mix of vintage and modern furniture, colorful Persian rug over hardwood floors, mid-century modern chair next to baroque mirror, gallery wall with diverse artwork, vibrant throw pillows in various patterns, antique wooden chest, contemporary lighting, bold color combinations, layered textures, curated collection of objects from different eras and cultures",
      glamour: "Replace ALL furniture and accessories with glamorous style: luxurious velvet sofa in deep emerald green, crystal chandelier with sparkling reflections, mirrored coffee table, gold accent details, marble surfaces, plush fur throw, metallic wallpaper with geometric patterns, dramatic lighting, rich jewel tones, glossy finishes, opulent textures, Hollywood regency style, sophisticated and dramatic atmosphere",
      bohemian: "Replace ALL furniture and accessories with bohemian style: colorful tapestries hanging on walls, layered Persian and Moroccan rugs, floor cushions and poufs, macrame wall hangings, hanging plants in woven baskets, vintage wooden furniture, warm earth tones mixed with vibrant jewel colors, ethnic patterns, natural textures, eclectic mix of global artifacts, cozy reading nook with lots of textiles",
      rustic: "Replace ALL furniture and accessories with rustic country style: exposed wooden ceiling beams, stone fireplace, reclaimed wood furniture, checkered upholstery, vintage mason jars, wrought iron fixtures, natural linen curtains, earth tone color palette, handcrafted pottery, woven baskets, dried flowers, cozy farmhouse atmosphere, warm and inviting, natural materials throughout",
      provencal: "Replace ALL furniture and accessories with Provencal French countryside style: whitewashed wooden furniture, lavender and sage green color palette, toile fabric patterns, vintage ceramic dishes, dried lavender bundles, lace curtains, weathered shutters, natural stone floors, rustic wooden dining table, fresh flowers in ceramic vases, soft natural lighting, romantic and pastoral atmosphere",
      shabby_chic: "Replace ALL furniture and accessories with shabby chic style: distressed white painted furniture, vintage floral patterns, pastel pink and mint green accents, lace doilies, antique china display, weathered wood surfaces, soft romantic lighting, ruffled curtains, vintage roses wallpaper, delicate porcelain accessories, feminine and nostalgic atmosphere, deliberately aged and worn textures"
    };

    const styleChange = stylePrompts[modification.id as keyof typeof stylePrompts];
    
    return `${styleChange}. Keep walls, doors, windows, ceiling, stairs exactly in same positions. Transform colors, furniture, decorations, flooring, and accessories to match the style completely.`;
  };

  const buildMicroPrompt = (modification: ModificationOption) => {
    const currentStyle = selectedImage?.parameters?.style || 'modern';
    
    const microPrompts = {
      warmer_colors: `Change color palette to warm beige and cream tones in this ${currentStyle} interior, keep all furniture and layout exactly the same`,
      cooler_colors: `Change color palette to cool blue-gray and silver tones in this ${currentStyle} interior, keep all furniture and layout exactly the same`, 
      more_lighting: `Add more lamps, chandeliers, and brighter lighting fixtures to this ${currentStyle} interior, enhance natural light, keep furniture arrangement`,
      darker_mood: `Create darker, more intimate mood with dim lighting and shadows in this ${currentStyle} interior, keep same furniture placement`,
      natural_materials: `Replace materials with natural wood, stone, and organic textures in this ${currentStyle} interior, keep furniture layout`,
      more_plants: `Add potted plants, hanging greenery, and natural elements throughout this ${currentStyle} interior, keep furniture arrangement`,
      less_plants: `Remove all plants, flowers, and greenery from this ${currentStyle} interior, keep furniture arrangement`,
      textured_walls: `Add wall textures, panels, or wallpaper to this ${currentStyle} interior, maintain furniture layout`,
      add_decorations: `Add artwork, decorative accessories, and styling elements to this ${currentStyle} interior`,
      change_flooring: `Change floor material to different texture or pattern in this ${currentStyle} interior, keep everything else exactly the same`
    };
    
    return microPrompts[modification.id as keyof typeof microPrompts] || `${modification.label} in ${currentStyle} style`;
  };

  const buildOptimizedPrompt = (type: 'initial' | 'micro' | 'macro', modification?: ModificationOption) => {
    const { visualDNA, coreNeed } = sessionData as any;
    
    if (type === 'initial') {
      const style = visualDNA?.dominantStyle || 'modern';
      const mood = coreNeed === 'regeneration' ? 'calm' : 
                   coreNeed === 'creativity' ? 'inspiring' : 'comfortable';
      
      return `${style} ${(sessionData as any).roomType || 'living room'}, ${mood} atmosphere, professional interior photography`;
    }
    
    if (type === 'micro' && modification) {
      return buildMicroPrompt(modification);
    }
    
    if (type === 'macro' && modification) {
      return buildMacroPrompt(modification);
    }
    
    return "";
  };

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

    if (selectedImage?.id === imageId) {
      const updatedRatings = { ...selectedImage.ratings, [rating]: value };
      
      if (rating === 'is_my_interior') {
        setHasAnsweredInteriorQuestion(true);
      }
      
      if (rating !== 'is_my_interior') {
        const allRatingsComplete = ['aesthetic_match', 'character', 'harmony'].every(
          (key) => updatedRatings[key as keyof typeof updatedRatings] > 0
        );
        if (allRatingsComplete) {
          setHasCompletedRatings(true);
        }
      }
    }

    await updateSessionData({
      imageRatings: {
        ...(sessionData as any).imageRatings || {},
        [imageId]: {
          ...((sessionData as any).imageRatings?.[imageId] || {}),
          [rating]: value,
          timestamp: Date.now(),
        },
      },
    } as any);
  };

  const handleFavorite = (imageId: string) => {
    setGeneratedImages((prev) =>
      prev.map((img) => (img.id === imageId ? { ...img, isFavorite: !img.isFavorite } : img)),
    );
    if (selectedImage?.id === imageId) {
      setSelectedImage((prev) => (prev ? { ...prev, isFavorite: !prev.isFavorite } : null));
    }
  };

  const handleImageSelect = (image: GeneratedImage) => {
    setSelectedImage(image);
    
    const hasInteriorRating = image.ratings.is_my_interior > 0;
    const hasAllRatings = image.ratings.aesthetic_match > 0 && 
                         image.ratings.character > 0 && 
                         image.ratings.harmony > 0;
    
    setHasAnsweredInteriorQuestion(hasInteriorRating);
    setHasCompletedRatings(hasAllRatings);
  };

  const handleContinue = () => {
    stopAllDialogueAudio();
    router.push('/flow/survey1');
  };

  return (
    <div className="min-h-screen flex flex-col w-full">
      <div className="flex-1 bg-gradient-radial from-pearl-50 to-platinum-100 p-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="space-y-6"
        >
          <div className="text-center">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-gold to-champagne bg-clip-text text-transparent mb-2">
              Twoje Wymarzone Wnętrza
            </h1>
            <p className="text-lg text-graphite">Generowane przez AI na podstawie Twojego wizualnego DNA</p>
          </div>

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

          {generatedImages.length > 0 && (
            <div className="space-y-6">
              <div>
                <GlassCard className="p-4">
                  {selectedImage && (
                    <div className="space-y-4">
                      <div className="relative aspect-[4/3] rounded-lg overflow-hidden">
                        <Image src={selectedImage.url} alt="Generated interior" fill className="object-cover" />

                        <button
                          onClick={() => handleFavorite(selectedImage.id)}
                          className={`absolute top-4 right-4 p-2 rounded-full backdrop-blur transition-all ${
                            selectedImage.isFavorite ? 'bg-red-100 text-red-500' : 'bg-white/20 text-white hover:bg-white/30'
                          }`}
                        >
                          <Heart size={20} fill={selectedImage.isFavorite ? 'currentColor' : 'none'} />
                        </button>
                      </div>

                      <div className="space-y-4">
                        <AnimatePresence>
                          {!hasAnsweredInteriorQuestion && (
                            <motion.div
                              initial={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -20 }}
                              transition={{ duration: 0.3 }}
                            >
                              <GlassCard variant="highlighted" className="p-6">
                                <h4 className="font-semibold text-graphite mb-3 text-lg">Czy to Twoje wnętrze?</h4>
                                <p className="text-sm text-silver-dark mb-4">
                                  Oceń, czy wygenerowany obraz rzeczywiście przedstawia Twoje wnętrze, czy jest to zupełnie inne pomieszczenie.
                                </p>
                                <div className="flex flex-col sm:flex-row gap-3">
                                  <button
                                    onClick={() => {
                                      handleImageRating(selectedImage.id, 'is_my_interior', 1);
                                      setHasAnsweredInteriorQuestion(true);
                                    }}
                                    className={`px-6 py-3 rounded-2xl text-sm font-medium transition-all duration-300 ${
                                      (selectedImage.ratings as any).is_my_interior === 1
                                        ? 'bg-gold/20 border-2 border-gold/60 text-gold-800 shadow-lg'
                                        : 'bg-white/10 border border-white/30 text-graphite hover:bg-white/20 hover:border-white/40 backdrop-blur-sm'
                                    }`}
                                  >
                                    To nie moje wnętrze
                                  </button>
                                  <button
                                    onClick={() => {
                                      handleImageRating(selectedImage.id, 'is_my_interior', 3);
                                      setHasAnsweredInteriorQuestion(true);
                                    }}
                                    className={`px-6 py-3 rounded-2xl text-sm font-medium transition-all duration-300 ${
                                      (selectedImage.ratings as any).is_my_interior === 3
                                        ? 'bg-gold/20 border-2 border-gold/60 text-gold-800 shadow-lg'
                                        : 'bg-white/10 border border-white/30 text-graphite hover:bg-white/20 hover:border-white/40 backdrop-blur-sm'
                                    }`}
                                  >
                                    Częściowo podobne
                                  </button>
                                  <button
                                    onClick={() => {
                                      handleImageRating(selectedImage.id, 'is_my_interior', 5);
                                      setHasAnsweredInteriorQuestion(true);
                                    }}
                                    className={`px-6 py-3 rounded-2xl text-sm font-medium transition-all duration-300 ${
                                      (selectedImage.ratings as any).is_my_interior === 5
                                        ? 'bg-gold/20 border-2 border-gold/60 text-gold-800 shadow-lg'
                                        : 'bg-white/10 border border-white/30 text-graphite hover:bg-white/20 hover:border-white/40 backdrop-blur-sm'
                                    }`}
                                  >
                                    To moje wnętrze
                                  </button>
                                </div>
                              </GlassCard>
                            </motion.div>
                          )}
                        </AnimatePresence>

                        <AnimatePresence>
                          {hasAnsweredInteriorQuestion && !hasCompletedRatings && (
                            <motion.div
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -20 }}
                              transition={{ duration: 0.5 }}
                              className="space-y-6"
                            >
                              <h4 className="font-semibold text-graphite text-lg">Oceń to wnętrze:</h4>
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
                                <div key={key} className="border-b border-gray-200/50 pb-4 last:border-b-0">
                                  <p className="text-base text-graphite font-modern leading-relaxed mb-3">
                                    {mid}
                                  </p>

                                  <div className="flex items-center justify-between text-xs text-silver-dark mb-3 font-modern">
                                    <span>{left} (1)</span>
                                    <span>{right} (7)</span>
                                  </div>

                                  <GlassSlider
                                    min={1}
                                    max={7}
                                    value={(selectedImage.ratings as any)[key] || 4}
                                    onChange={(value) => handleImageRating(selectedImage.id, key as any, value)}
                                    className="mb-2"
                                  />
                                </div>
                              ))}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                      <AnimatePresence>
                        {hasCompletedRatings && (
                          <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.2 }}
                            className="flex space-x-3"
                          >
                            <GlassButton onClick={() => setShowModifications((m) => !m)} variant="secondary" className="flex-1">
                              <Settings size={16} className="mr-2" />
                              {showModifications ? 'Ukryj opcje' : 'Modyfikuj'}
                            </GlassButton>

                            <GlassButton onClick={handleRemoveFurniture} variant="secondary" className="flex-1">
                              <Home size={16} className="mr-2" />
                              Usuń meble
                            </GlassButton>

                            <GlassButton onClick={handleQualityImprovement} variant="secondary" className="flex-1">
                              <RefreshCw size={16} className="mr-2" />
                              Popraw Jakość
                            </GlassButton>

                            <GlassButton 
                              onClick={() => {
                                const originalImage = generatedImages.find(img => img.parameters?.modificationType === 'initial');
                                if (originalImage) {
                                  handleImageSelect(originalImage);
                                }
                              }} 
                              variant="secondary" 
                              className="flex-1"
                            >
                              <Home size={16} className="mr-2" />
                              Oryginalny
                            </GlassButton>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}
                </GlassCard>
              </div>

              <AnimatePresence>
                {showModifications && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.4 }}
                  >
                    <GlassCard className="p-6">
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <div>
                          <h4 className="font-semibold text-graphite mb-4 flex items-center text-lg">
                            <Wand2 size={20} className="mr-3" />
                            Drobne modyfikacje
                          </h4>
                          <p className="text-sm text-silver-dark mb-4">
                            Subtelne zmiany w kolorach i detalach
                          </p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {MICRO_MODIFICATIONS.map((mod) => (
                              <GlassButton
                                key={mod.id}
                                onClick={() => handleModification(mod)}
                                variant="secondary"
                                size="sm"
                                className="justify-start text-sm h-12 px-4"
                                disabled={isLoading}
                              >
                                {mod.label}
                              </GlassButton>
                            ))}
                          </div>
                        </div>

                        <div>
                          <h4 className="font-semibold text-graphite mb-4 flex items-center text-lg">
                            <RefreshCw size={20} className="mr-3" />
                            Zupełnie inny kierunek
                          </h4>
                          <p className="text-sm text-silver-dark mb-4">
                            Zmiana całego stylu mebli i aranżacji
                          </p>
                          <div className="grid grid-cols-2 gap-3">
                            {MACRO_MODIFICATIONS.map((mod) => (
                              <GlassButton
                                key={mod.id}
                                onClick={() => handleModification(mod)}
                                variant="secondary"
                                size="sm"
                                className="justify-start text-sm h-12 px-4"
                                disabled={isLoading}
                              >
                                {mod.label}
                              </GlassButton>
                            ))}
                          </div>
                        </div>
                      </div>
                    </GlassCard>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="space-y-6">
                <GlassCard className="p-4">
                  <h4 className="font-semibold text-graphite mb-3">Wszystkie warianty ({generatedImages.length}):</h4>
                  <div className="space-y-3">
                    <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-3">
                      {generatedImages.slice(-8).map((image) => (
                        <motion.div
                          key={image.id}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleImageSelect(image)}
                          className={`relative aspect-square rounded-lg overflow-hidden cursor-pointer border-2 ${
                            selectedImage?.id === image.id ? 'border-gold ring-2 ring-gold' : 'border-transparent'
                          }`}
                        >
                          <Image src={image.url} alt="thumbnail" fill className="object-cover" />
                          {image.isFavorite && (
                            <div className="absolute top-1 right-1">
                              <Heart size={12} className="text-red-500" fill="currentColor" />
                            </div>
                          )}
                        </motion.div>
                      ))}
                    </div>
                    
                    {generatedImages.length > 8 && (
                      <div className="flex justify-center">
                        <div className="flex gap-2">
                          {Array.from({ length: Math.ceil(generatedImages.length / 8) }, (_, i) => (
                            <div
                              key={i}
                              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                                i === Math.floor((generatedImages.length - 1) / 8) 
                                  ? 'bg-gold shadow-[0_0_8px_3px_rgba(251,191,36,0.6)]' 
                                  : 'bg-white/20'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </GlassCard>

                <div className="flex justify-center">
                  <AnimatePresence>
                    {hasAnsweredInteriorQuestion && (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4 }}
                      >
                        <GlassButton onClick={handleContinue} className="px-8 py-4 font-semibold">
                          <span className="flex items-center space-x-2">
                            <span>Przejdź do Ankiety</span>
                            <ArrowRight size={20} />
                          </span>
                        </GlassButton>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </div>
      
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