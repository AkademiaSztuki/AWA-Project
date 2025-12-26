'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useSessionData } from '@/hooks/useSessionData';
import { useLanguage } from '@/contexts/LanguageContext';
import { getOrCreateProjectId, saveGenerationSet, saveGeneratedImages, logBehavioralEvent, startParticipantGeneration, endParticipantGeneration, saveImageRatingEvent, startPageView, endPageView, safeSessionStorage } from '@/lib/supabase';
import { useGoogleAI, getGenerationParameters } from '@/hooks/useGoogleAI';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';
import { GlassSlider } from '@/components/ui/GlassSlider';
import { LoadingProgress } from '@/components/ui/LoadingProgress';
import { GenerationHistory } from '@/components/ui/GenerationHistory';
import { AwaDialogue } from '@/components/awa';
import { stopAllDialogueAudio } from '@/hooks/useAudioManager';
import {
  Wand2,
  RefreshCw,
  Settings,
  ArrowRight,
  Heart,
  Palette,
  Home,
  CheckCircle2,
  Eye,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import Image from 'next/image';
import { GenerationSource } from '@/lib/prompt-synthesis/modes';
import { addGeneratedImageToSpace } from '@/lib/spaces';
import {
  getOrCreateSpaceId,
  uploadSpaceImage,
  saveSpaceImagesMetadata
} from '@/lib/remote-spaces';

interface GeneratedImage {
  id: string;
  url: string;
  base64: string;
  prompt: string;
  parameters: any;
  ratings: {
    aesthetic_match: number;
    character: number;
    harmony: number;
    is_my_interior: number;
  };
  isFavorite: boolean;
  createdAt: number;
  provider?: 'modal' | 'google';
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
  { id: 'change_furniture', label: 'Zmień meble', icon: null, category: 'micro' },
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

// Helper to get image dimensions
const getImageDimensions = (base64: string): Promise<{ width: number; height: number }> => {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => resolve({ width: img.width, height: img.height });
    img.onerror = reject;
    img.src = base64.startsWith('data:') ? base64 : `data:image/png;base64,${base64}`;
  });
};

export default function FastGeneratePage() {
  const router = useRouter();
  const { language } = useLanguage();
  const { sessionData, updateSessionData, isInitialized: isSessionInitialized } = useSessionData();
  const { generateSixImagesParallelWithGoogle, upscaleImageWithGoogle, isLoading, error, setError } = useGoogleAI();

  const [generatedImage, setGeneratedImage] = useState<GeneratedImage | null>(null);
  const [showModifications, setShowModifications] = useState(false);
  const [generationCount, setGenerationCount] = useState(0);
  const [statusMessage, setStatusMessage] = useState("Krok 1/3: Inicjalizacja środowiska AI...");
  const [loadingStage, setLoadingStage] = useState<1 | 2 | 3>(1);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [estimatedTime, setEstimatedTime] = useState<number | undefined>(undefined);
  const [hasAnsweredInteriorQuestion, setHasAnsweredInteriorQuestion] = useState(false);
  const [hasCompletedRatings, setHasCompletedRatings] = useState(false);
  const [pageViewId, setPageViewId] = useState<string | null>(null);
  const [abortController, setAbortController] = useState<AbortController | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isUpscaling, setIsUpscaling] = useState(false);
  const [upscaledImage, setUpscaledImage] = useState<GeneratedImage | null>(null);
  const [generationHistory, setGenerationHistory] = useState<Array<{
    id: string;
    type: 'initial' | 'micro' | 'macro';
    label: string;
    timestamp: number;
    imageUrl: string;
  }>>([]);
  const [currentHistoryIndex, setCurrentHistoryIndex] = useState(0);

  // Build prompt for fast track - simple style-based prompt
  const buildFastTrackPrompt = (): string => {
    const typedSessionData = sessionData as any;
    const style = typedSessionData?.visualDNA?.dominantStyle || 'modern';
    const roomType = typedSessionData?.roomType || 'living room';
    
    // Simple JSON prompt for fast track
    return JSON.stringify({
      style: style,
      room_type: roomType,
      description: `A ${style} style ${roomType} interior design`,
      elements: [
        `Furniture in ${style} style`,
        'High quality materials',
        'Good lighting',
        'Cozy atmosphere'
      ],
      quality: 'high quality, realistic, detailed'
    });
  };

  // Initial generation
  const handleInitialGeneration = async () => {
    if (isGenerating) return;
    
    const typedSessionData = sessionData as any;
    const roomImage = typedSessionData?.roomImage;
    const roomImageEmpty = typedSessionData?.roomImageEmpty;
    const processedRoomImage = roomImageEmpty || roomImage;

    if (!processedRoomImage) {
      setError('Brak zdjęcia pomieszczenia. Wróć do poprzedniego kroku i dodaj zdjęcie.');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setLoadingStage(1);
    setLoadingProgress(10);
    setStatusMessage("Przygotowuję generację...");
    setEstimatedTime(120);

    const controller = new AbortController();
    setAbortController(controller);

    try {
      // Start page view tracking
      const projectId = await getOrCreateProjectId(typedSessionData.userHash);
      let viewId: string | null = null;
      if (projectId) {
        viewId = await startPageView(projectId, 'fast-generate');
        setPageViewId(viewId);
      }

      // Start generation job to participant_generations
      const userHash = (sessionData as any).userHash;
      let jobId: string | null = null;
      if (userHash) {
        const prompt = buildFastTrackPrompt();
        const baseParams = getGenerationParameters('initial', generationCount);
        jobId = await startParticipantGeneration(userHash, {
          type: 'initial',
          prompt: prompt,
          parameters: {
            ...baseParams,
            path_type: 'fast' // Mark as fast track
          },
          has_base_image: true
        });
      }

      // Build prompt
      const prompt = buildFastTrackPrompt();
      setLoadingProgress(30);
      setStatusMessage("Generuję obrazek...");
      setEstimatedTime(90);

      // Get image dimensions for proportional sizing
      let finalWidth = 1024;
      let finalHeight = 1024;
      try {
        const dims = await getImageDimensions(processedRoomImage);
        const ratio = dims.width / dims.height;
        if (dims.width >= dims.height) {
          finalWidth = 1024;
          finalHeight = Math.round(1024 / ratio);
        } else {
          finalHeight = 1024;
          finalWidth = Math.round(1024 * ratio);
        }
      } catch (e) {
        console.warn("Failed to calculate image dimensions, using 1024x1024", e);
      }

      const parameters = {
        ...getGenerationParameters('initial', generationCount),
        width: finalWidth,
        height: finalHeight,
        image_size: 1024
      };

      // Extract base64 from data URL if needed
      let baseImage = processedRoomImage;
      if (baseImage.includes(',')) {
        baseImage = baseImage.split(',')[1];
      }

      // Generate single image using Google AI
      setLoadingProgress(50);
      setStatusMessage("Generuję obrazek z AI...");
      setEstimatedTime(60);

      const style = typedSessionData?.visualDNA?.dominantStyle || 'modern';
      
      const response = await generateSixImagesParallelWithGoogle({
        prompts: [{ source: GenerationSource.Explicit, prompt }],
        base_image: baseImage,
        style: style,
        parameters: {
          ...parameters,
          strength: parameters.strength ?? 0.6,
        }
      }, undefined, controller.signal);

      if (controller.signal.aborted) {
        return;
      }

      if (response.successful_count === 0) {
        setError("Nie udało się wygenerować obrazu.");
        if (jobId) await endParticipantGeneration(jobId, { status: 'error', latency_ms: 0, error_message: 'Generation failed' });
        return;
      }

      const result = response.results[0];
      if (!result.success) {
        setError(result.error || "Nie udało się wygenerować obrazu.");
        if (jobId) await endParticipantGeneration(jobId, { status: 'error', latency_ms: 0, error_message: result.error || 'Generation failed' });
        return;
      }

      const newImage: GeneratedImage = {
        id: `fast-${generationCount}-0`,
        url: `data:image/png;base64,${result.image}`,
        base64: result.image,
        prompt: prompt,
        parameters: parameters,
        ratings: { aesthetic_match: 0, character: 0, harmony: 0, is_my_interior: 0 },
        isFavorite: false,
        createdAt: Date.now(),
        provider: 'google'
      };

      setGeneratedImage(newImage);
      setGenerationCount(prev => prev + 1);
      setLoadingProgress(100);
      setStatusMessage("Gotowe!");
      setEstimatedTime(0);

      // Save to session
      await updateSessionData({
        generatedImages: [{
          id: newImage.id,
          url: newImage.url
        }],
        generations: [{
          id: `fast-gen-${generationCount}`,
          prompt: prompt,
          images: 1,
          timestamp: Date.now(),
          type: 'initial',
        }],
      } as any);

      // Save to spaces (używamy już zdefiniowanego userHash z linii 183)
      const spaceId = await getOrCreateSpaceId(userHash, {
        spaceId: typedSessionData?.currentSpaceId,
        name: typedSessionData?.roomName || 'Moja Przestrzeń'
      });

      if (spaceId) {
        const uploadedResult = await uploadSpaceImage(userHash, spaceId, newImage.id, newImage.url);
        const finalUrl = uploadedResult?.publicUrl || newImage.url;
        await saveSpaceImagesMetadata(userHash, spaceId, [{
          url: finalUrl,
          type: 'generated',
          is_favorite: false
        }]);

        const updatedSpaces = addGeneratedImageToSpace(
          typedSessionData?.spaces || [],
          spaceId,
          finalUrl
        );
        await updateSessionData({ spaces: updatedSpaces, currentSpaceId: spaceId });
      }

      // Add to history
      const historyNode = {
        id: newImage.id,
        type: 'initial' as const,
        label: 'Początkowa generacja',
        timestamp: Date.now(),
        imageUrl: newImage.url,
      };
      setGenerationHistory([historyNode]);
      setCurrentHistoryIndex(0);

      // Persist to Supabase
      try {
        if (projectId) {
          const genSet = await saveGenerationSet(projectId, prompt);
          // Note: saveGenerationSet returns null (legacy table removed), so we skip saveGeneratedImages
          // if (genSet?.id) {
          //   await saveGeneratedImages(genSet.id, [{ url: newImage.url, prompt: newImage.prompt }]);
          // }
          await logBehavioralEvent(projectId, 'generation_initial', { 
            prompt, 
            parameters,
            path_type: 'fast' // Mark as fast track
          });
        }
      } catch (e) {
        console.warn('Supabase persist failed:', e);
      }

      if (jobId) await endParticipantGeneration(jobId, { status: 'success', latency_ms: 0 });
      if (viewId) await endPageView(viewId);

    } catch (err) {
      console.error('Generation failed:', err);
      setError(err instanceof Error ? err.message : 'Wystąpił nieznany błąd podczas generacji.');
      setIsGenerating(false);
    } finally {
      setIsGenerating(false);
    }
  };

  // Auto-generate on mount if no image exists
  useEffect(() => {
    if (!isSessionInitialized || !sessionData) return;
    
    const typedSessionData = sessionData as any;
    const savedGeneratedImages = typedSessionData?.generatedImages || [];
    const hasGeneratedImages = savedGeneratedImages.length > 0;
    
    if (!hasGeneratedImages && !isGenerating && !generatedImage) {
      handleInitialGeneration();
    } else if (hasGeneratedImages && !generatedImage) {
      // Restore from session
      const savedImage = savedGeneratedImages[0];
      if (savedImage && savedImage.url) {
        // Try to extract base64 from URL if it's a data URL
        let base64 = '';
        if (savedImage.url.startsWith('data:')) {
          base64 = savedImage.url.split(',')[1] || '';
        } else if (savedImage.base64) {
          base64 = savedImage.base64;
        }
        
        setGeneratedImage({
          id: savedImage.id || `restored-${Date.now()}`,
          url: savedImage.url,
          base64: base64,
          prompt: savedImage.prompt || 'Restored from session',
          parameters: savedImage.parameters || {},
          ratings: savedImage.ratings || { aesthetic_match: 0, character: 0, harmony: 0, is_my_interior: 0 },
          isFavorite: savedImage.isFavorite || false,
          createdAt: savedImage.createdAt || Date.now(),
        });
        
        // Restore ratings state if ratings exist
        if (savedImage.ratings) {
          if (savedImage.ratings.is_my_interior > 0) {
            setHasAnsweredInteriorQuestion(true);
          }
          if (savedImage.ratings.harmony > 0) {
            setHasCompletedRatings(true);
          }
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSessionInitialized, sessionData, isGenerating, generatedImage]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortController) {
        abortController.abort();
      }
    };
  }, [abortController]);

  // Handle modification
  const handleModification = async (modification: ModificationOption) => {
    if (!generatedImage || isGenerating) return;

    setIsGenerating(true);
    setError(null);
    setLoadingStage(2);
    setLoadingProgress(30);
    setStatusMessage(`Modyfikuję: ${modification.label}...`);
    setEstimatedTime(60);

    const isMacro = modification.category === 'macro';
    const parameters = getGenerationParameters(isMacro ? 'macro' : 'micro', generationCount);

    try {
      const currentStyle = (sessionData as any)?.visualDNA?.dominantStyle || 'modern';
      
      // Special handling for change_furniture
      let modificationPrompt: string;
      if (modification.id === 'change_furniture') {
        modificationPrompt = `SYSTEM INSTRUCTION: Image-to-image furniture replacement. KEEP: walls, windows, doors, floor, ceiling, lighting, decorations, camera angle, room layout - IDENTICAL. CHANGE: REPLACE all furniture with new furniture pieces that perfectly match the ${currentStyle} style. The new furniture must be stylistically appropriate, harmonize with the existing color palette and materials, maintain similar scale and proportions, and be placed in the same positions. Only furniture changes - everything else remains exactly the same.`;
      } else {
        modificationPrompt = JSON.stringify({
          instruction: `Apply ${modification.label} modification to the interior`,
          style: modification.category === 'macro' ? modification.id : currentStyle,
          modification_type: modification.category,
          preserve: [
            'room structure',
            'camera perspective',
            'overall layout'
          ],
          modify: [modification.label]
        });
      }

      const baseImage = generatedImage.base64.includes(',') 
        ? generatedImage.base64.split(',')[1] 
        : generatedImage.base64;

      const response = await generateSixImagesParallelWithGoogle({
        prompts: [{ source: GenerationSource.Explicit, prompt: modificationPrompt }],
        base_image: baseImage,
        style: (sessionData as any)?.visualDNA?.dominantStyle || 'modern',
        parameters: {
          ...parameters,
          strength: parameters.strength ?? (isMacro ? 0.75 : 0.25),
        }
      });

      if (response.successful_count === 0) {
        setError("Nie udało się zmodyfikować obrazu.");
        return;
      }

      const result = response.results[0];
      const newImage: GeneratedImage = {
        id: `mod-fast-${generationCount}-0`,
        url: `data:image/png;base64,${result.image}`,
        base64: result.image,
        prompt: modificationPrompt,
        parameters: {
          modificationType: isMacro ? 'macro' : 'micro',
          modifications: [modification.label],
          iterationCount: generationCount,
        },
        ratings: { aesthetic_match: 0, character: 0, harmony: 0, is_my_interior: 0 },
        isFavorite: false,
        createdAt: Date.now(),
        provider: 'google'
      };

      setGeneratedImage(newImage);
      setGenerationCount(prev => prev + 1);
      setShowModifications(false);
      // Don't reset ratings after modification - user already answered
      // setHasAnsweredInteriorQuestion(false);
      // setHasCompletedRatings(false);
      setLoadingProgress(100);
      setStatusMessage("Modyfikacja zakończona!");
      setEstimatedTime(0);

      // Add to history
      const historyNode = {
        id: newImage.id,
        type: isMacro ? ('macro' as const) : ('micro' as const),
        label: modification.label,
        timestamp: Date.now(),
        imageUrl: newImage.url,
      };
      setGenerationHistory(prev => [...prev, historyNode]);
      setCurrentHistoryIndex(generationHistory.length);

      // Save to Supabase
      try {
        const projectId = await getOrCreateProjectId((sessionData as any).userHash);
        if (projectId) {
          const genSet = await saveGenerationSet(projectId, modificationPrompt);
          // Note: saveGenerationSet returns null (legacy table removed), so we skip saveGeneratedImages
          // if (genSet?.id) {
          //   await saveGeneratedImages(genSet.id, [{ url: newImage.url, prompt: newImage.prompt }]);
          // }
          await logBehavioralEvent(projectId, 'generation_modification', {
            type: isMacro ? 'macro' : 'micro',
            modification: modification.label,
            parameters,
            path_type: 'fast'
          });
        }
      } catch (e) {
        console.warn('Supabase persist failed:', e);
      }

    } catch (err) {
      console.error('Modification failed:', err);
      setError(err instanceof Error ? err.message : 'Wystąpił nieznany błąd podczas modyfikacji.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Handle image rating
  const handleImageRating = async (imageId: string, ratingType: string, value: number) => {
    if (!generatedImage) return;

    const newRatings = {
      ...generatedImage.ratings,
      [ratingType]: value
    };

    const updatedImage = {
      ...generatedImage,
      ratings: newRatings
    };

    setGeneratedImage(updatedImage);

    // Save rating to Supabase
    try {
      const projectId = await getOrCreateProjectId((sessionData as any)?.userHash);
      if (projectId) {
        await saveImageRatingEvent(projectId, {
          local_image_id: imageId,
          rating_key: ratingType,
          value: value
        });
        // Log path_type separately
        await logBehavioralEvent(projectId, 'image_rating', {
          image_id: imageId,
          rating_type: ratingType,
          rating_value: value,
          path_type: 'fast'
        });
      }
    } catch (e) {
      console.warn('Failed to save rating:', e);
    }

    // Check if aesthetic_match rating is completed (main rating in fast track)
    if (ratingType === 'aesthetic_match' && value > 0) {
      setHasCompletedRatings(true);
    }
  };

  // Handle favorite toggle
  const handleFavorite = async (imageId: string) => {
    if (!generatedImage) return;

    const updatedImage = {
      ...generatedImage,
      isFavorite: !generatedImage.isFavorite
    };

    setGeneratedImage(updatedImage);
  };

  // Handle continue to next step - redirect to path selection with message about full experience
  const handleContinue = () => {
    stopAllDialogueAudio();
    router.push('/flow/path-selection?fast_completed=true');
  };

  if (!isSessionInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-graphite font-modern">Ładowanie...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col w-full">
      <div className="flex-1 p-4 lg:p-8 pb-32">
        <div className="w-full max-w-6xl mx-auto pt-8 space-y-6">
          {/* Loading State */}
          {isGenerating && (
            <LoadingProgress
              progress={loadingProgress}
              currentStage={loadingStage}
              message={statusMessage}
              estimatedTimeRemaining={estimatedTime}
            />
          )}

          {/* Generated Image */}
          {generatedImage && !isGenerating && (
            <>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
              >
                <GlassCard className="p-6">
                  <div className="space-y-4">
                    <div className="relative aspect-[4/3] rounded-lg overflow-hidden">
                      <Image
                        src={generatedImage.url}
                        alt="Generated interior"
                        fill
                        sizes="100vw"
                        className="object-cover"
                      />
                      <button
                        onClick={() => handleFavorite(generatedImage.id)}
                        className={`absolute top-4 right-4 p-2 rounded-full backdrop-blur transition-all ${
                          generatedImage.isFavorite ? 'bg-red-100 text-red-500' : 'bg-white/20 text-white hover:bg-white/30'
                        }`}
                      >
                        <Heart size={20} fill={generatedImage.isFavorite ? 'currentColor' : 'none'} />
                      </button>
                    </div>

                    {/* Interior Question - exactly like main generate */}
                    <AnimatePresence>
                      {!hasAnsweredInteriorQuestion && (
                        <motion.div
                          initial={{ opacity: 0, y: 20, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ 
                            opacity: 0, 
                            y: -20, 
                            scale: 0.95,
                            transition: { duration: 0.5, ease: "easeIn" }
                          }}
                          transition={{ duration: 0.5, ease: "easeOut" }}
                        >
                          <div className="space-y-6">
                            <h4 className="font-semibold text-graphite text-lg">Czy to Twoje wnętrze?</h4>
                            <div className="border-b border-gray-200/50 pb-4 last:border-b-0">
                              <div className="flex items-center justify-between text-xs text-silver-dark mb-3 font-modern">
                                <span>To nie moje wnętrze (1)</span>
                                <span>To moje wnętrze (5)</span>
                              </div>

                              <GlassSlider
                                min={1}
                                max={5}
                                value={(generatedImage.ratings as any).is_my_interior || 3}
                                onChange={(value) => {
                                  handleImageRating(generatedImage.id, 'is_my_interior', value);
                                  // Delay hiding the bar to allow smooth exit animation
                                  setTimeout(() => {
                                    setHasAnsweredInteriorQuestion(true);
                                  }, 800);
                                }}
                                className="mb-2"
                              />
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Ratings - exactly like main generate */}
                    <AnimatePresence>
                      {hasAnsweredInteriorQuestion && !hasCompletedRatings && (
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -20 }}
                          transition={{ duration: 0.8, ease: "easeInOut" }}
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
                                value={(generatedImage.ratings as any)[key] || 4}
                                onChange={(value) => handleImageRating(generatedImage.id, key as any, value)}
                                className="mb-2"
                              />
                            </div>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Modification Button */}
                    {hasCompletedRatings && (
                      <GlassButton
                        onClick={() => setShowModifications(!showModifications)}
                        className="w-full"
                      >
                        <Settings size={20} className="mr-2" />
                        {showModifications ? 'Ukryj modyfikacje' : 'Modyfikuj obrazek'}
                      </GlassButton>
                    )}

                    {/* Modifications Panel */}
                    <AnimatePresence>
                      {showModifications && hasCompletedRatings && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                        >
                          <GlassCard className="p-6">
                            <div className="space-y-6">
                              <div>
                                <h4 className="font-semibold text-graphite mb-4 flex items-center text-lg">
                                  <Settings size={20} className="mr-3" />
                                  Drobne zmiany
                                </h4>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                  {MICRO_MODIFICATIONS.map((mod) => (
                                    <GlassButton
                                      key={mod.id}
                                      onClick={() => handleModification(mod)}
                                      variant="secondary"
                                      size="sm"
                                      disabled={isGenerating}
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
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                  {MACRO_MODIFICATIONS.map((mod) => (
                                    <GlassButton
                                      key={mod.id}
                                      onClick={() => handleModification(mod)}
                                      variant="secondary"
                                      size="sm"
                                      disabled={isGenerating}
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

                    {/* Generation History */}
                    {generationHistory.length > 0 && (
                      <GenerationHistory
                        history={generationHistory}
                        currentIndex={currentHistoryIndex}
                        onNodeClick={(index) => {
                          const historyItem = generationHistory[index];
                          if (historyItem) {
                            setCurrentHistoryIndex(index);
                            // In a real implementation, you'd load the image from history
                          }
                        }}
                      />
                    )}

                    {/* Continue Button with Full Experience Info - only show after modifications */}
                    {hasCompletedRatings && generationHistory.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="space-y-4"
                      >
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.5 }}
                        >
                          <GlassCard className="p-6 bg-gradient-to-r from-gold/10 to-champagne/10 border-gold/30">
                            <div className="text-center space-y-3">
                              <h4 className="font-semibold text-graphite text-lg">
                                {language === 'pl' 
                                  ? 'Ukończyłeś szybką ścieżkę!' 
                                  : 'You completed the fast track!'}
                              </h4>
                              <p className="text-sm text-silver-dark font-modern">
                                {language === 'pl'
                                  ? 'Chcesz głębsze doświadczenie? Wypróbuj pełną ścieżkę, która bierze pod uwagę Twoje preferencje, styl życia i potrzeby, aby stworzyć jeszcze bardziej spersonalizowane wnętrze.'
                                  : 'Want a deeper experience? Try the full path, which uses your personality, preferences, and lifestyle to create an even more personalized interior.'}
                              </p>
                            </div>
                          </GlassCard>
                        </motion.div>
                        <GlassButton
                          onClick={handleContinue}
                          className="w-full"
                          size="lg"
                        >
                          {language === 'pl' ? 'Wybierz ścieżkę' : 'Choose path'}
                          <ArrowRight size={18} className="ml-2" />
                        </GlassButton>
                      </motion.div>
                    )}
                  </div>
                </GlassCard>
              </motion.div>
            </>
          )}

          {/* Error Display */}
          {error && (
            <GlassCard className="p-6 bg-red-500/10 border-red-400/30">
              <p className="text-red-600 font-modern">{error}</p>
            </GlassCard>
          )}
        </div>
      </div>

      {/* Awa Dialogue */}
      <div className="w-full">
        <AwaDialogue 
          currentStep="generate" 
          fullWidth={true}
          autoHide={true}
        />
      </div>
    </div>
  );
}

