'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useSessionData } from '@/hooks/useSessionData';
import { getOrCreateProjectId, saveGenerationSet, saveGeneratedImages, logBehavioralEvent, startParticipantGeneration, endParticipantGeneration, saveImageRatingEvent, startPageView, endPageView, saveGenerationFeedback, saveRegenerationEvent, safeSessionStorage } from '@/lib/supabase';
import { checkCreditsAvailable } from '@/lib/credits';
import { UpgradePrompt } from '@/components/subscription/UpgradePrompt';
import { supabase } from '@/lib/supabase';
import { useLanguage } from '@/contexts/LanguageContext';
import { LocalizedText } from '@/lib/questions/validated-scales';
import { assessAllSourcesQuality, getViableSources, type DataStatus } from '@/lib/prompt-synthesis/data-quality';
import { calculateImplicitQuality } from '@/lib/prompt-synthesis/implicit-quality';
import { analyzeSourceConflict } from '@/lib/prompt-synthesis/conflict-analysis';
import { countExplicitAnswers, getRegenerationInterpretation, type GenerationFeedback, type RegenerationEvent } from '@/lib/feedback/generation-feedback';
import { useModalAPI } from '@/hooks/useModalAPI';
import { useGoogleAI, getGenerationParameters } from '@/hooks/useGoogleAI';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';
import { GlassSlider } from '@/components/ui/GlassSlider';
import { LoadingProgress } from '@/components/ui/LoadingProgress';
import { GenerationHistory } from '@/components/ui/GenerationHistory';
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
  CheckCircle2,
  CheckCircle,
  Sparkles,
  Eye,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
} from 'lucide-react';
import Image from 'next/image';
import { buildOptimizedFluxPrompt } from '@/lib/dna';
import { 
  synthesizeSixPrompts,
  synthesizeFivePrompts, // Backward compatibility
  GenerationSource, 
  GENERATION_SOURCE_LABELS,
  type SixPromptSynthesisResult,
  type FivePromptSynthesisResult 
} from '@/lib/prompt-synthesis';
import { addGeneratedImageToSpace } from '@/lib/spaces';
import {
  getOrCreateSpaceId,
  saveParticipantImages
} from '@/lib/remote-spaces';

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
  // 5-image matrix specific fields
  source?: GenerationSource;       // Which data source generated this
  displayIndex?: number;           // Position in blind display (0-4)
  isBlindSelected?: boolean;       // Was this selected in blind comparison?
  provider?: 'modal' | 'google';   // Which provider generated this (Modal/FLUX or Google)
}

interface ModificationOption {
  id: string;
  label: LocalizedText;
  icon: React.ReactNode;
  category: 'micro' | 'macro';
}

const MICRO_MODIFICATIONS: ModificationOption[] = [
  { id: 'warmer_colors', label: { pl: 'Cieplejsze kolory', en: 'Warmer colors' }, icon: null, category: 'micro' },
  { id: 'cooler_colors', label: { pl: 'Chłodniejsze kolory', en: 'Cooler colors' }, icon: null, category: 'micro' },
  { id: 'more_lighting', label: { pl: 'Więcej oświetlenia', en: 'More lighting' }, icon: null, category: 'micro' },
  { id: 'darker_mood', label: { pl: 'Ciemniejszy nastrój', en: 'Darker mood' }, icon: null, category: 'micro' },
  { id: 'natural_materials', label: { pl: 'Naturalne materiały', en: 'Natural materials' }, icon: null, category: 'micro' },
  { id: 'more_plants', label: { pl: 'Więcej roślin', en: 'More plants' }, icon: null, category: 'micro' },
  { id: 'less_plants', label: { pl: 'Mniej roślin', en: 'Less plants' }, icon: null, category: 'micro' },
  { id: 'change_furniture', label: { pl: 'Zmień meble', en: 'Change furniture' }, icon: null, category: 'micro' },
  { id: 'add_decorations', label: { pl: 'Dodaj dekoracje', en: 'Add decorations' }, icon: null, category: 'micro' },
  { id: 'change_flooring', label: { pl: 'Zmień podłogę', en: 'Change flooring' }, icon: null, category: 'micro' },
];

const MACRO_MODIFICATIONS: ModificationOption[] = [
  { id: 'scandinavian', label: { pl: 'Skandynawski', en: 'Scandinavian' }, icon: null, category: 'macro' },
  { id: 'minimalist', label: { pl: 'Minimalistyczny', en: 'Minimalist' }, icon: null, category: 'macro' },
  { id: 'classic', label: { pl: 'Klasyczny', en: 'Classic' }, icon: null, category: 'macro' },
  { id: 'industrial', label: { pl: 'Industrialny', en: 'Industrial' }, icon: null, category: 'macro' },
  { id: 'eclectic', label: { pl: 'Eklektyczny', en: 'Eclectic' }, icon: null, category: 'macro' },
  { id: 'glamour', label: { pl: 'Glamour', en: 'Glamour' }, icon: null, category: 'macro' },
  { id: 'bohemian', label: { pl: 'Boho', en: 'Bohemian' }, icon: null, category: 'macro' },
  { id: 'rustic', label: { pl: 'Rustykalny', en: 'Rustic' }, icon: null, category: 'macro' },
  { id: 'provencal', label: { pl: 'Prowansalski', en: 'Provençal' }, icon: null, category: 'macro' },
  { id: 'shabby_chic', label: { pl: 'Shabby Chic', en: 'Shabby Chic' }, icon: null, category: 'macro' },
];

export default function GeneratePage() {
  const router = useRouter();
  const { t } = useLanguage();
  const { sessionData, updateSessionData, isInitialized: isSessionInitialized } = useSessionData();
  const { generateSixImagesParallelWithGoogle, upscaleImageWithGoogle, isLoading, error, setError } = useGoogleAI();
  const { generateLLMComment } = useModalAPI(); 

  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [selectedImage, setSelectedImage] = useState<GeneratedImage | null>(null);
  const [showModifications, setShowModifications] = useState(false);
  const [generationCount, setGenerationCount] = useState(0);
  const [isApiReady, setIsApiReady] = useState(false);
  const [hasAttemptedGeneration, setHasAttemptedGeneration] = useState(false);
  const [statusMessage, setStatusMessage] = useState<LocalizedText>({ pl: "Krok 1/3: Inicjalizacja środowiska AI...", en: "Step 1/3: Initializing AI environment..." });
  const [loadingStage, setLoadingStage] = useState<1 | 2 | 3>(1);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [estimatedTime, setEstimatedTime] = useState<number | undefined>(undefined);
  const [hasAnsweredInteriorQuestion, setHasAnsweredInteriorQuestion] = useState(false);
  const [hasCompletedRatings, setHasCompletedRatings] = useState(false);
  const [pageViewId, setPageViewId] = useState<string | null>(null);
  const [idaComment, setIdaComment] = useState<string | null>(null);
  const [isGeneratingComment, setIsGeneratingComment] = useState(false);
  
  // 6-Image Matrix State
  const [isMatrixMode, setIsMatrixMode] = useState(true); // Enabled - 6 different sources
  const [matrixImages, setMatrixImages] = useState<GeneratedImage[]>([]);
  const [matrixDisplayOrder, setMatrixDisplayOrder] = useState<GenerationSource[]>([]);
  const [blindSelectionMade, setBlindSelectionMade] = useState(false);
  const [selectedSourceIndex, setSelectedSourceIndex] = useState<number | null>(null);
  const [showSourceReveal, setShowSourceReveal] = useState(false);
  const [matrixGenerationStartTime, setMatrixGenerationStartTime] = useState<number>(0);
  const [carouselIndex, setCarouselIndex] = useState(0); // Current carousel position
  const [abortController, setAbortController] = useState<AbortController | null>(null);
  const [isGenerating, setIsGenerating] = useState(false); // Prevent duplicate generations
  const [isModifying, setIsModifying] = useState(false); // Track if modification is in progress
  const [isUpscaling, setIsUpscaling] = useState(false); // Track upscale in progress
  const [upscaledImage, setUpscaledImage] = useState<GeneratedImage | null>(null); // Store upscaled version
  const [originalRoomPhotoUrl, setOriginalRoomPhotoUrl] = useState<string | null>(null);
  const [showOriginalRoomPhoto, setShowOriginalRoomPhoto] = useState(false);
  const [regenerateCount, setRegenerateCount] = useState(0); // Track regeneration count
  const [lastGenerationTime, setLastGenerationTime] = useState<number>(0); // For regeneration tracking
  const [qualityReport, setQualityReport] = useState<any>(null); // Store quality report for feedback
  const [synthesisResult, setSynthesisResult] = useState<SixPromptSynthesisResult | null>(null); // Store synthesis result for skipped sources info
  const [imageProgress, setImageProgress] = useState<Record<string, number>>({}); // Track progress for each image source
  const [progressOffsets, setProgressOffsets] = useState<Record<string, number>>({}); // Per-source stagger for loading anims
  const [lastFailedModification, setLastFailedModification] = useState<ModificationOption | null>(null); // Track last failed modification for retry
  const [customModificationText, setCustomModificationText] = useState(''); // Custom modification text input
  
  const [generationHistory, setGenerationHistory] = useState<Array<{
    id: string;
    type: 'initial' | 'micro' | 'macro';
    label: string;
    timestamp: number;
    imageUrl: string;
  }>>([]);
  const [currentHistoryIndex, setCurrentHistoryIndex] = useState(0);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [feedbackType, setFeedbackType] = useState<'positive' | 'neutral' | 'negative'>('neutral');

  useEffect(() => {
    const waitForApi = async () => {
      console.log("Rozpoczynam przygotowywanie środowiska AI...");
      setLoadingStage(1);
      setLoadingProgress(10);
      
      // Since we use Google (Vertex AI), there is no "cold start" wait time like in Modal
      setIsApiReady(true);
      setLoadingProgress(30);
      setStatusMessage({ pl: "Krok 2/3: Środowisko AI gotowe. Przygotowuję dane...", en: "Step 2/3: AI environment ready. Preparing data..." });
      setLoadingStage(2);
      setEstimatedTime(undefined);
    };
    
    waitForApi();
  }, []);

  // Track pageViewId in a ref to avoid cleanup on every change
  const pageViewIdRef = useRef<string | null>(null);
  
  useEffect(() => {
    (async () => {
      try {
        const projectId = await getOrCreateProjectId((sessionData as any).userHash);
        if (projectId) {
          const id = await startPageView(projectId, 'generate');
          setPageViewId(id);
          pageViewIdRef.current = id;
        }
      } catch {}
    })();
    
    // Cleanup: abort any ongoing generation when leaving the page
    return () => { 
      // console.log('[Generate] Page unmounting - cleaning up...');
      (async () => { 
        if (pageViewIdRef.current) await endPageView(pageViewIdRef.current); 
      })();
      // Abort any ongoing generation - use ref to get latest abortController
      // Note: We can't use abortController in dependencies as it changes on each generation
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount/unmount
  
  // Separate effect to handle abortController cleanup
  useEffect(() => {
    return () => {
      if (abortController) {
        // console.log('[Generate] Aborting ongoing generation');
        abortController.abort();
      }
      setIsGenerating(false);
      setIsUpscaling(false);
    };
  }, [abortController]);
  
  // Additional cleanup on browser back/forward
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (abortController) {
        console.log('[Generate] Browser navigation - aborting generation');
        abortController.abort();
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [abortController]);

  // Restore state from sessionData after page refresh
  useEffect(() => {
    if (!isSessionInitialized || !sessionData) return;

    const typedSessionData = sessionData as any;
    const savedGeneratedImages = typedSessionData?.generatedImages || [];
    const savedGenerations = typedSessionData?.generations || [];
    const imageRatings = typedSessionData?.imageRatings || {};

    // Check if we have generated images in sessionData
    if (savedGeneratedImages.length > 0 && generatedImages.length === 0) {
      // #region agent log
      void fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'generate/page.tsx:restore-generatedImages',message:'Restoring generatedImages from sessionData into state',data:{savedCount:savedGeneratedImages.length,savedFirst:savedGeneratedImages[0]?.url?.substring(0,80)||null,hadStateGenerated:generatedImages.length>0,currentSpaceId:(typedSessionData?.currentSpaceId||null),pathname:(typeof window!=='undefined'?window.location.pathname:'ssr')},timestamp:Date.now(),sessionId:'debug-session',runId:'gen-'+Date.now(),hypothesisId:'G1'})}).catch(()=>{});
      // #endregion
      console.log('[Generate] Restoring state from sessionData:', {
        savedImagesCount: savedGeneratedImages.length,
        savedGenerationsCount: savedGenerations.length,
        hasRatings: Object.keys(imageRatings).length > 0
      });

      // Restore generated images from sessionData
      // Note: sessionData only stores lightweight versions (id, url), not full base64
      // We'll need to reconstruct the images from URLs
      const restoredImages: GeneratedImage[] = savedGeneratedImages.map((img: any, index: number) => {
        const ratings = imageRatings[img.id] || { aesthetic_match: 0, character: 0, harmony: 0, is_my_interior: 0 };
        
        // Extract source from ID if it's a matrix image (format: matrix-google-{count}-{source})
        let source: GenerationSource = GenerationSource.Implicit;
        let displayIndex = index;
        
        if (img.id.startsWith('matrix-google-')) {
          // Extract source from ID: matrix-google-{count}-{source}
          const parts = img.id.split('-');
          if (parts.length >= 4) {
            const sourcePart = parts.slice(3).join('-'); // Handle sources with dashes
            source = sourcePart as GenerationSource;
            // Try to find display index from synthesis result if available
            const synthesisResult = typedSessionData?.synthesisResult;
            if (synthesisResult?.displayOrder) {
              displayIndex = synthesisResult.displayOrder.indexOf(source);
              if (displayIndex < 0) displayIndex = index;
            }
          }
        } else if (img.id.startsWith('matrix-')) {
          // Legacy format: matrix-{count}-{source}
          const parts = img.id.split('-');
          if (parts.length >= 3) {
            source = parts.slice(2).join('-') as GenerationSource;
          }
        }
        
        // Determine modification type from ID
        let modificationType: 'initial' | 'micro' | 'macro' = 'initial';
        if (img.id.startsWith('mod-')) {
          modificationType = img.id.includes('macro') ? 'macro' : 'micro';
        } else if (img.id.startsWith('remove-')) {
          modificationType = 'initial'; // Furniture removal is not a modification type
        }
        
        return {
          id: img.id,
          url: img.url,
          base64: img.base64 || '', // May have base64 if stored, otherwise empty
          prompt: savedGenerations.find((g: any) => {
            // Try to match generation by ID pattern
            if (img.id.startsWith('matrix-')) {
              return g.type === 'initial' || !g.type;
            }
            if (img.id.startsWith('mod-')) {
              return g.modification && img.id.includes(g.modification.toLowerCase().replace(/\s+/g, '_'));
            }
            return false;
          })?.prompt || 'Restored from session',
          provider: 'google' as const,
          parameters: {
            modificationType: modificationType,
            modifications: [],
            iterationCount: 0,
            usedOriginal: false,
            source: source !== 'implicit' ? source : undefined,
            sourceLabel: source !== 'implicit' ? GENERATION_SOURCE_LABELS[source] : undefined
          },
          ratings: ratings,
          isFavorite: false,
          createdAt: Date.now() - (savedGeneratedImages.length - index) * 1000, // Stagger timestamps
          source: source,
          displayIndex: displayIndex,
          isBlindSelected: false
        };
      });

      setGeneratedImages(restoredImages);

      // Restore selection state ONLY if explicitly present in sessionData.
      // Do NOT infer "selection made" from any ratings, because that skips the 1-of-6 step.
      const persistedSelected = typedSessionData?.selectedImage;
      const persistedSelectedId: string | null =
        typeof persistedSelected === 'string'
          ? persistedSelected
          : (persistedSelected?.id || null);

      if (persistedSelectedId) {
        // If selectedImage exists at all, it means user already finished the 1-of-6 step
        setBlindSelectionMade(true);

        const selectedFromRestored = restoredImages.find(img => img.id === persistedSelectedId);
        if (selectedFromRestored) {
          console.log('[Generate] Restoring selected image from restored images:', persistedSelectedId);
          setSelectedImage(selectedFromRestored);
        } else if (persistedSelected?.url) {
          // Fallback: restore minimal selected image even if we don't have the full matrix cache
          console.log('[Generate] Restoring selected image from sessionData.selectedImage.url:', persistedSelectedId);
          setSelectedImage({
            id: persistedSelectedId,
            url: persistedSelected.url,
            base64: persistedSelected.base64 || '',
            prompt: 'Restored selected image from sessionData',
            provider: persistedSelected.provider || 'google',
            parameters: persistedSelected.parameters || { modificationType: 'initial', modifications: [], iterationCount: 0, usedOriginal: false },
            ratings: imageRatings[persistedSelectedId] || { aesthetic_match: 0, character: 0, harmony: 0, is_my_interior: 0 },
            isFavorite: false,
            createdAt: Date.now(),
            source: persistedSelected.source || GenerationSource.Implicit,
            displayIndex: persistedSelected.displayIndex || 0,
            isBlindSelected: true
          } as any);
        }

        // Prevent auto-generation on refresh when the user already selected a vision
        setHasAttemptedGeneration(true);
      }

      // Restore matrix images (first 6 images that are matrix images, sorted by displayIndex)
      const matrixImages = restoredImages
        .filter(img => 
          img.id.startsWith('matrix-') &&
          !img.id.startsWith('mod-') && 
          !img.id.startsWith('remove-') &&
          img.source !== GenerationSource.Implicit // Only matrix images with actual source
        )
        .sort((a, b) => (a.displayIndex || 0) - (b.displayIndex || 0))
        .slice(0, 6);

      if (matrixImages.length > 0) {
        console.log('[Generate] Restoring matrix images from sessionData:', matrixImages.length);
        setMatrixImages(matrixImages);
      }

      // Restore generation history
      if (savedGenerations.length > 0) {
        const history: Array<{ id: string; type: 'initial' | 'micro' | 'macro'; label: string; timestamp: number; imageUrl: string }> = savedGenerations.map((gen: any) => {
          const image = restoredImages.find(img => img.id.startsWith(gen.id.split('-')[0] + '-'));
          return {
            id: gen.id,
            type: gen.type || 'initial',
            label: gen.modification || gen.prompt?.substring(0, 30) || 'Generacja',
            timestamp: gen.timestamp || Date.now(),
            imageUrl: image?.url || ''
          };
        });
        
        if (history.length > 0) {
          setGenerationHistory(history);
          const currentIndex = history.length - 1;
          setCurrentHistoryIndex(currentIndex);
        }
      }

      // Mark that we've restored state, so don't trigger new generation
      setHasAttemptedGeneration(true);
      setGenerationCount(savedGenerations.length);
      
      console.log('[Generate] State restored from sessionData. Skipping auto-generation.');
    }
  }, [isSessionInitialized, sessionData]);

  useEffect(() => {
    if (!isSessionInitialized) {
      console.log('[Generate] Session not initialized yet, delaying auto-generation.');
      return;
    }

    // Only trigger generation if:
    // 1. We haven't restored state from sessionData
    // 2. We haven't attempted generation
    // 3. We don't have any images (generated or matrix)
    // 4. User hasn't already selected an image (blindSelectionMade)
    const shouldGenerate = isApiReady && 
                          generationCount === 0 && 
                          !hasAttemptedGeneration && 
                          generatedImages.length === 0 && 
                          matrixImages.length === 0 &&
                          !blindSelectionMade;

    if (shouldGenerate) {
      console.log('[Generate] Auto-triggering initial generation:', { 
        isApiReady, 
        generationCount, 
        hasAttemptedGeneration, 
        isMatrixMode, 
        isSessionInitialized,
        hasGeneratedImages: generatedImages.length > 0,
        hasMatrixImages: matrixImages.length > 0,
        blindSelectionMade
      });
      setHasAttemptedGeneration(true);
      handleInitialGeneration();
    }
  }, [isApiReady, generationCount, hasAttemptedGeneration, isSessionInitialized, generatedImages.length, matrixImages.length, blindSelectionMade]);

  // Generate IDA comment when image is selected
  useEffect(() => {
    if (selectedImage && generatedImages.length > 0 && !idaComment && !isGeneratingComment) {
      generateIdaComment();
    }
  }, [selectedImage]);

  const buildInitialPrompt = () => buildOptimizedFluxPrompt(sessionData as any);

  /**
   * Helper function to remove furniture from room image using AI
   * This creates an empty architectural shell (walls, windows, doors, ceiling, floor only)
   * Returns the processed image base64 string
   */
  const removeFurnitureFromImage = async (imageBase64: string): Promise<string> => {
    console.log('[Furniture Removal] Starting automatic furniture removal from room image...');
    
    // Direct text prompt for removal - more explicit and direct
    // Improved to better fill empty spaces after removal
    const removeFurniturePrompt = `EMPTY ARCHITECTURAL SHELL: Remove ALL furniture and objects, then seamlessly fill the empty spaces.

PRESERVE EXACTLY (DO NOT CHANGE):
- Walls - keep exactly the same material, color, and texture
- Windows - keep glass panes visible, remove all curtains, blinds, frames, and window treatments
- Doors - keep exactly the same
- Ceiling - keep exactly the same material and color
- Floor - keep exactly the same material, color, and texture
- Camera perspective and framing - DO NOT CHANGE

REMOVE COMPLETELY (MUST DISAPPEAR):
- ALL furniture: sofas, chairs, tables, cabinets, shelves, beds, desks, etc.
- ALL rugs and carpets
- ALL curtains, blinds, window treatments, and window frames
- ALL decorations: pictures, vases, sculptures, wall art, etc.
- ALL lighting fixtures: lamps, chandeliers, ceiling lights, etc.
- ALL plants and greenery
- ALL textiles: cushions, throws, blankets, curtains, etc.
- ALL electronics and appliances
- ALL personal items and objects
- ALL mirrors (except if built into architecture)
- Everything else that is not part of the permanent architectural structure

FILLING INSTRUCTIONS (CRITICAL):
- After removing objects, seamlessly fill the empty spaces with the SAME wall/floor/ceiling material that was behind them
- Extend wall surfaces naturally where furniture was removed
- Extend floor surfaces naturally where rugs/furniture was removed
- Maintain consistent lighting and shadows on the empty surfaces
- Do NOT leave holes, black areas, or distorted surfaces
- The result should look like a naturally empty room, not like objects were cut out

RESULT: A completely empty, bare room with only architectural structure visible. All removed areas must be seamlessly filled with appropriate wall/floor/ceiling surfaces. DO NOT add any new furniture, decorations, or objects.`;

    try {
      // Clean base64 - remove data URI prefix if present
      let cleanBase64 = imageBase64;
      if (cleanBase64.includes(',')) {
        cleanBase64 = cleanBase64.split(',')[1];
      }

      // Use Google API for furniture removal
      // Google Gemini 2.5 Flash Image only supports temperature in generation_config
      // The prompt and system instruction control the behavior, not strength/steps/guidance
      // These parameters are kept for type compatibility but not actually used by Google API
      const baseParams = getGenerationParameters('micro', generationCount);
      const response = await generateSixImagesParallelWithGoogle({
        prompts: [{ source: 'implicit' as GenerationSource, prompt: removeFurniturePrompt }],
        base_image: cleanBase64,
        style: 'empty',
        parameters: {
          strength: baseParams.strength || 0.5, // Not used by Google, kept for type compatibility
          steps: baseParams.steps || 25, // Not used by Google, kept for type compatibility
          guidance: baseParams.guidance || 2.5, // Not used by Google, kept for type compatibility
          image_size: baseParams.image_size,
          width: baseParams.width,
          height: baseParams.height
        }
      });

      if (!response || !response.results || response.results.length === 0 || !response.results[0]?.image) {
        throw new Error("Failed to remove furniture from image");
      }

      const processedImage = response.results[0].image;
      console.log('[Furniture Removal] Successfully removed furniture from room image');
      
      return processedImage;
    } catch (error) {
      console.error('[Furniture Removal] Error removing furniture:', error);
      // Return original image if removal fails
      console.warn('[Furniture Removal] Falling back to original image');
      return imageBase64;
    }
  };

  /**
   * Generates 6 images using different data sources for blind comparison.
   * This is the new 6-image matrix generation flow with multi-reference support.
   */
  // Helper to get image dimensions from base64
  const getImageDimensions = (base64: string): Promise<{ width: number; height: number }> => {
    return new Promise((resolve) => {
      const img = new globalThis.Image();
      img.onload = () => {
        resolve({ width: img.width, height: img.height });
      };
      img.onerror = () => {
        console.warn("[6-Image Matrix] Failed to load image for dimensions, using fallback 1024x1024");
        resolve({ width: 1024, height: 1024 });
      };
      img.src = base64.startsWith('data:') ? base64 : `data:image/jpeg;base64,${base64}`;
    });
  };

  const handleMatrixGeneration = async () => {
    console.log("[6-Image Matrix] handleMatrixGeneration called", { isApiReady, isGenerating });
    // #region agent log
    void fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'generate/page.tsx:handleMatrixGeneration-entry',message:'Entered handleMatrixGeneration',data:{isApiReady,wasGenerating:isGenerating,sessionHasRoomImage:!!(sessionData as any)?.roomImage,sessionHasRoomImageEmpty:!!(sessionData as any)?.roomImageEmpty,sessionInspirationsCount:((sessionData as any)?.inspirations||[]).length,sessionGeneratedImagesCount:((sessionData as any)?.generatedImages||[]).length,currentSpaceId:(sessionData as any)?.currentSpaceId||null,pathname:(typeof window!=='undefined'?window.location.pathname:'ssr')},timestamp:Date.now(),sessionId:'debug-session',runId:'gen-'+Date.now(),hypothesisId:'G2'})}).catch(()=>{});
    // #endregion
    if (!isApiReady) {
      console.log("[6-Image Matrix] API not ready, generation cancelled.");
      // #region agent log
      void fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'generate/page.tsx:handleMatrixGeneration-not-ready',message:'Generation cancelled because API not ready',data:{isApiReady},timestamp:Date.now(),sessionId:'debug-session',runId:'gen-'+Date.now(),hypothesisId:'G3'})}).catch(()=>{});
      // #endregion
      return;
    }
    
    // Prevent duplicate generations
    if (isGenerating) {
      console.log("[6-Image Matrix] Generation already in progress, skipping.");
      // #region agent log
      void fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'generate/page.tsx:handleMatrixGeneration-already-generating',message:'Generation skipped because already in progress',data:{isGenerating},timestamp:Date.now(),sessionId:'debug-session',runId:'gen-'+Date.now(),hypothesisId:'G4'})}).catch(()=>{});
      // #endregion
      return;
    }
    
    console.log("[6-Image Matrix] Starting generation...");
    
    const typedSessionData = sessionData as any;
    
    // Try to get roomImage from sessionStorage if not in sessionData (Supabase might be disconnected)
    let roomImage = typedSessionData?.roomImage;
    if (!roomImage) {
      const sessionRoomImage = safeSessionStorage.getItem('aura_session_room_image');
      if (sessionRoomImage) {
        console.log("[6-Image Matrix] Found roomImage in sessionStorage, restoring to sessionData");
        roomImage = sessionRoomImage;
        // Update sessionData with the restored image
        updateSessionData({ roomImage: sessionRoomImage });
      }
    }
    
    if (!roomImage) {
      console.error("[6-Image Matrix] Missing roomImage in session data and sessionStorage");
      console.error("[6-Image Matrix] Session data keys:", Object.keys(typedSessionData || {}));
      const storedRoomImage = safeSessionStorage.getItem('aura_session_room_image');
      console.error("[6-Image Matrix] sessionStorage roomImage:", storedRoomImage?.substring(0, 50) || 'N/A');
      setError(t({ pl: "Nie można rozpocząć generowania - brak zdjęcia pokoju w sesji. Proszę wrócić do kroku uploadu zdjęcia.", en: "Cannot start generation - no room photo in session. Please return to the photo upload step." }));
      return;
    }
    
    console.log("[6-Image Matrix] Using roomImage:", {
      hasImage: !!roomImage,
      length: roomImage?.length || 0,
      startsWith: roomImage?.substring(0, 50) || 'N/A',
      source: typedSessionData?.roomImage ? 'sessionData' : 'sessionStorage'
    });
    
    // Step 0: Use pre-processed empty room image if available, otherwise use original
    // User can optionally remove furniture in room setup - if they did, use that version
    let processedRoomImage = roomImage;
    const roomImageEmpty = typedSessionData?.roomImageEmpty;
    
    // CRITICAL: Also check sessionStorage directly as fallback
    let roomImageEmptyFromStorage: string | null = null;
    let storageReadError: string | null = null;
    let allStorageKeys: string[] = [];
    if (typeof window !== 'undefined') {
      try {
        // #region agent log - check all sessionStorage keys
        allStorageKeys = Object.keys(sessionStorage);
        const hasKey = sessionStorage.getItem('aura_session_room_image_empty') !== null;
        fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'generate/page.tsx:room-image-selection:storage-check',message:'Checking sessionStorage before read',data:{allStorageKeysCount:allStorageKeys.length,allStorageKeys:allStorageKeys.filter(k=>k.includes('room')||k.includes('image')),hasKey,key:'aura_session_room_image_empty'},timestamp:Date.now(),sessionId:'debug-session',runId:'room-image-debug',hypothesisId:'H1'})}).catch(()=>{});
        // #endregion
        
        roomImageEmptyFromStorage = sessionStorage.getItem('aura_session_room_image_empty');
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'generate/page.tsx:room-image-selection:storage-read',message:'Read roomImageEmpty from sessionStorage',data:{hasRoomImageEmptyFromStorage:!!roomImageEmptyFromStorage,roomImageEmptyFromStorageLength:roomImageEmptyFromStorage?.length||0,key:'aura_session_room_image_empty',firstChars:roomImageEmptyFromStorage?.substring(0,50)||'null'},timestamp:Date.now(),sessionId:'debug-session',runId:'room-image-debug',hypothesisId:'H1'})}).catch(()=>{});
        // #endregion
      } catch (e) {
        storageReadError = String(e);
        console.warn('[generate] Failed to read roomImageEmpty from sessionStorage', e);
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'generate/page.tsx:room-image-selection:storage-read-error',message:'Failed to read roomImageEmpty from sessionStorage',data:{error:storageReadError,allStorageKeysCount:allStorageKeys.length,allStorageKeys:allStorageKeys.filter(k=>k.includes('room')||k.includes('image'))},timestamp:Date.now(),sessionId:'debug-session',runId:'room-image-debug',hypothesisId:'H1'})}).catch(()=>{});
        // #endregion
      }
    }
    
    // Use roomImageEmpty from sessionData if available, otherwise try sessionStorage
    const makeImageSig = (img?: string | null): string => {
      if (!img) return 'none';
      const len = img.length;
      const head = img.slice(0, 64);
      const tail = len > 64 ? img.slice(-64) : '';
      return `${len}:${head}:${tail}`;
    };

    const emptySourceSigKey = 'aura_session_room_image_empty_source_sig';
    const emptySourceSig = typeof window !== 'undefined' ? sessionStorage.getItem(emptySourceSigKey) : null;
    const currentRoomSig = makeImageSig(roomImage);
    const sigMatches = !!emptySourceSig && emptySourceSig === currentRoomSig;

    // Use roomImageEmpty from sessionData if available.
    // Only use sessionStorage fallback if it matches the current roomImage signature (prevents stale wrong-room usage).
    const finalRoomImageEmpty = roomImageEmpty || (sigMatches ? roomImageEmptyFromStorage : null);
    
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecbb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'generate/page.tsx:room-image-selection',message:'Checking which room image to use',data:{hasRoomImageEmpty:!!roomImageEmpty,roomImageEmptyLength:roomImageEmpty?.length||0,hasRoomImageEmptyFromStorage:!!roomImageEmptyFromStorage,roomImageEmptyFromStorageLength:roomImageEmptyFromStorage?.length||0,hasFinalRoomImageEmpty:!!finalRoomImageEmpty,finalRoomImageEmptyLength:finalRoomImageEmpty?.length||0,roomImageLength:roomImage?.length||0,willUseEmpty:!!finalRoomImageEmpty,source:finalRoomImageEmpty?(roomImageEmpty===finalRoomImageEmpty?'sessionData':'sessionStorage'):'none',storageReadError,hasEmptySourceSig:!!emptySourceSig,sigMatches},timestamp:Date.now(),sessionId:'debug-session',runId:'room-image-debug',hypothesisId:'H1'})}).catch(()=>{});
    // #endregion
    
    if (finalRoomImageEmpty) {
      console.log("[6-Image Matrix] Using pre-processed empty room image (furniture removed by user)");
      // Remove data URI prefix if present (roomImageEmpty might have it)
      processedRoomImage = finalRoomImageEmpty.includes(',') ? finalRoomImageEmpty.split(',')[1] : finalRoomImageEmpty;
    } else {
      console.log("[6-Image Matrix] Using original room image (furniture not removed)");
      // Remove data URI prefix if present
      processedRoomImage = roomImage.includes(',') ? roomImage.split(',')[1] : roomImage;
    }
    
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'generate/page.tsx:processedRoomImage-set',message:'processedRoomImage set after selection',data:{hasProcessedRoomImage:!!processedRoomImage,processedRoomImageLength:processedRoomImage?.length||0,hasFinalRoomImageEmpty:!!finalRoomImageEmpty,finalRoomImageEmptyLength:finalRoomImageEmpty?.length||0,hasRoomImage:!!roomImage,roomImageLength:roomImage?.length||0,isUsingEmpty:!!finalRoomImageEmpty,processedRoomImageFirstChars:processedRoomImage?.substring(0,50)||'null'},timestamp:Date.now(),sessionId:'debug-session',runId:'room-image-debug',hypothesisId:'H1'})}).catch(()=>{});
    // #endregion
    
    // Create new AbortController for this generation
    const controller = new AbortController();
    setAbortController(controller);
    setIsGenerating(true);
    
    // Reset images for new generation
    setMatrixImages([]);
    setGeneratedImages([]);
    setImageProgress({}); // Reset progress for new generation
    
    console.log("[6-Image Matrix] Starting 6-image matrix generation...");
    const generationStartTime = Date.now();
    setMatrixGenerationStartTime(generationStartTime);
    setLastGenerationTime(generationStartTime);
    setStatusMessage({ pl: "Przygotowuję 6 różnych wizji dla Twojego wnętrza (AI)...", en: "Preparing 6 different visions for your interior (AI)..." });
    setLoadingStage(2);
    setLoadingProgress(30);
    setEstimatedTime(150);
    setIsGenerating(true); // Ensure isGenerating is set to true for placeholders
    
    // Track regeneration if this is not the first generation
    if (regenerateCount > 0) {
      try {
        const projectId = await getOrCreateProjectId((sessionData as any).userHash);
        if (projectId) {
          const typedSessionData = sessionData as any;
          const tinderSwipes = typedSessionData.tinderData?.swipes || [];
          const implicitQuality = tinderSwipes.length > 0 
            ? calculateImplicitQuality(tinderSwipes)
            : undefined;
          
          const { buildPromptInputsFromSession } = await import('@/lib/prompt-synthesis/input-builder');
          const inputs = buildPromptInputsFromSession(typedSessionData);
          const qualityReports = assessAllSourcesQuality(inputs, tinderSwipes);
          const sourceQualityMap: Record<string, string | DataStatus> = {};
          qualityReports.forEach(r => {
            sourceQualityMap[r.source] = r.status;
          });
          
          const regenerationEvent: RegenerationEvent = {
            sessionId: typedSessionData.userHash || 'unknown',
            projectId: projectId || undefined,
            timestamp: new Date().toISOString(),
            previousSources: matrixImages.map(img => img.source!).filter(Boolean),
            previousSelected: selectedImage?.source || null,
            regenerationCount: regenerateCount,
            timeSinceLastGen: generationStartTime - lastGenerationTime,
            interpretation: getRegenerationInterpretation(regenerateCount),
            sourceQuality: sourceQualityMap,
            implicitQuality
          };
          
          await saveRegenerationEvent({
            sessionId: regenerationEvent.sessionId,
            projectId: regenerationEvent.projectId,
            previousSources: regenerationEvent.previousSources,
            previousSelected: regenerationEvent.previousSelected,
            regenerationCount: regenerationEvent.regenerationCount,
            timeSinceLastGen: regenerationEvent.timeSinceLastGen,
            interpretation: regenerationEvent.interpretation,
            sourceQuality: sourceQualityMap,
            implicitQuality: regenerationEvent.implicitQuality
          });
        }
      } catch (e) {
        console.warn('[6-Image Matrix] Failed to track regeneration:', e);
      }
    }
    
    try {
      // Step 1: Assess data quality before synthesis
      console.log("[6-Image Matrix] Step 1: Assessing data quality...");
      const { buildPromptInputsFromSession } = await import('@/lib/prompt-synthesis/input-builder');
      const inputs = buildPromptInputsFromSession(typedSessionData);
      const tinderSwipes = typedSessionData.tinderData?.swipes || [];
      
      // DEBUG: Log what data we have
      console.log("[6-Image Matrix] DEBUG - Session data summary:", {
        hasTinderSwipes: tinderSwipes.length > 0,
        tinderSwipesCount: tinderSwipes.length,
        hasImplicitStyles: inputs.aestheticDNA.implicit.dominantStyles.length > 0,
        implicitStyles: inputs.aestheticDNA.implicit.dominantStyles,
        hasExplicitStyle: !!inputs.aestheticDNA.explicit.selectedStyle,
        explicitStyle: inputs.aestheticDNA.explicit.selectedStyle,
        hasExplicitPalette: !!inputs.aestheticDNA.explicit.selectedPalette,
        explicitPalette: inputs.aestheticDNA.explicit.selectedPalette,
        hasPersonality: !!inputs.personality,
        hasInspirations: !!(inputs.inspirations && inputs.inspirations.length > 0),
        inspirationsCount: inputs.inspirations?.length || 0,
        hasBiophiliaScore: inputs.psychologicalBaseline.biophiliaScore !== undefined,
        biophiliaScore: inputs.psychologicalBaseline.biophiliaScore
      });
      
      const qualityReports = assessAllSourcesQuality(inputs, tinderSwipes);
      setQualityReport(qualityReports);
      
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'generate/page.tsx:quality-reports',message:'Quality reports for all sources',data:{reportsCount:qualityReports.length,reports:qualityReports.map(r=>({source:r.source,shouldGenerate:r.shouldGenerate,status:r.status,dataPoints:r.dataPoints,confidence:r.confidence,warningsCount:r.warnings.length,warnings:r.warnings})),shouldGenerateCount:qualityReports.filter(r=>r.shouldGenerate).length,skippedCount:qualityReports.filter(r=>!r.shouldGenerate).length},timestamp:Date.now(),sessionId:'debug-session',runId:'description-flow',hypothesisId:'H6'})}).catch(()=>{});
      // #endregion
      
      // DEBUG: Log quality reports with full details
      console.log("[6-Image Matrix] DEBUG - Quality reports:");
      qualityReports.forEach(r => {
        console.log(`[6-Image Matrix] ${r.source}:`, {
          shouldGenerate: r.shouldGenerate,
          status: r.status,
          dataPoints: r.dataPoints,
          confidence: r.confidence,
          warnings: r.warnings,
          warningsCount: r.warnings.length,
          warningsDetails: r.warnings.join(' | ')
        });
      });
      
      // Step 2: Synthesize 6 prompts from different data sources
      console.log("[6-Image Matrix] Step 2: Synthesizing prompts...");
      const roomType = typedSessionData.roomType || 'living room';
      
      const synthesisResult = await synthesizeSixPrompts(
        typedSessionData,
        roomType,
        { verbose: true }
      );
      
      // Store synthesis result for UI display
      setSynthesisResult(synthesisResult);
      
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'generate/page.tsx:synthesis-result',message:'Synthesis result after synthesizeSixPrompts',data:{generatedSourcesCount:synthesisResult.generatedSources.length,generatedSources:synthesisResult.generatedSources,skippedSourcesCount:synthesisResult.skippedSources.length,skippedSources:synthesisResult.skippedSources,displayOrder:synthesisResult.displayOrder,hasInspirationImages:!!synthesisResult.inspirationImages,resultsKeys:Object.keys(synthesisResult.results||{})},timestamp:Date.now(),sessionId:'debug-session',runId:'description-flow',hypothesisId:'H6'})}).catch(()=>{});
      // #endregion
      
      console.log("[6-Image Matrix] Synthesis complete:", {
        generatedSources: synthesisResult.generatedSources,
        skippedSources: synthesisResult.skippedSources,
        displayOrder: synthesisResult.displayOrder,
        hasInspirationImages: !!synthesisResult.inspirationImages
      });
      
      if (synthesisResult.generatedSources.length === 0) {
        // DEBUG: Log why all sources were skipped
        console.error("[6-Image Matrix] ERROR - All sources skipped! Quality reports:", qualityReports);
        const errorDetails = qualityReports
          .map(r => `${r.source}: ${r.warnings.join(', ')}`)
          .join('; ');
        setError(t({ pl: `Brak wystarczających danych do wygenerowania obrazów. Szczegóły: ${errorDetails}`, en: `Insufficient data to generate images. Details: ${errorDetails}` }));
        return;
      }
      
      // Step 2: Prepare prompts for parallel generation
      setLoadingProgress(45);
      setStatusMessage({ pl: `Generuję ${synthesisResult.generatedSources.length} wizji równolegle...`, en: `Generating ${synthesisResult.generatedSources.length} visions in parallel...` });
      setEstimatedTime(120);
      
      const prompts = synthesisResult.generatedSources.map(source => ({
        source,
        prompt: synthesisResult.results[source]!.prompt
      }));

      // Seed per-source progress so placeholders immediately show activity (start at 2%)
      setImageProgress(() => {
        const initialProgress: Record<string, number> = {};
        prompts.forEach(({ source }) => {
          initialProgress[source] = 2;
        });
        return initialProgress;
      });
      // Stagger per-source fallback start times to desync animations
      setProgressOffsets(() => {
        const offsets: Record<string, number> = {};
        prompts.forEach(({ source }, idx) => {
          // Base stagger 3s per slot + random 0-2s jitter
          offsets[source] = idx * 3000 + Math.floor(Math.random() * 2000);
        });
        return offsets;
      });
      
      // DEV: Log all prompts for debugging
      console.log("=".repeat(80));
      console.log("🔍 [DEV] PROMPTS FOR ALL SOURCES:");
      console.log("=".repeat(80));
      prompts.forEach(({ source, prompt }) => {
        const sourceLabel = GENERATION_SOURCE_LABELS[source];
        console.log(`\n📝 [${source}] ${sourceLabel?.pl || source}:`);
        console.log("-".repeat(80));
        try {
          // Try to parse as JSON for pretty printing
          const parsed = JSON.parse(prompt);
          console.log(JSON.stringify(parsed, null, 2));
        } catch {
          // If not JSON, print as-is
          console.log(prompt);
        }
        console.log("-".repeat(80));
      });
      console.log("=".repeat(80));
      
      // Also log synthesis result details
      console.log("[DEV] Synthesis Result Details:", {
        generatedSources: synthesisResult.generatedSources,
        skippedSources: synthesisResult.skippedSources,
        displayOrder: synthesisResult.displayOrder,
        results: Object.keys(synthesisResult.results).map(source => ({
          source,
          hasPrompt: !!synthesisResult.results[source as GenerationSource]?.prompt,
          promptLength: synthesisResult.results[source as GenerationSource]?.prompt?.length || 0,
          weights: synthesisResult.results[source as GenerationSource]?.weights ? {
            dominantStyle: synthesisResult.results[source as GenerationSource]?.weights.dominantStyle,
            colorPalette: synthesisResult.results[source as GenerationSource]?.weights.colorPalette?.slice(0, 3),
            primaryMaterials: synthesisResult.results[source as GenerationSource]?.weights.primaryMaterials?.slice(0, 2)
          } : null
        }))
      });
      
      // Use preview mode for faster initial generation (now upgraded to 1024px proportional)
      const baseParams = getGenerationParameters('preview', generationCount);
      
      // Calculate proportional dimensions based on processed (empty) input image
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
        console.log(`[6-Image Matrix] Calculated proportional dimensions: ${finalWidth}x${finalHeight} (Ratio: ${ratio.toFixed(2)})`);
      } catch (e) {
        console.warn("[6-Image Matrix] Failed to calculate image dimensions, using 1024x1024 fallback", e);
      }

      const parameters = {
        ...baseParams,
        image_size: 1024,
        width: finalWidth,
        height: finalHeight
      };

      console.log('[6-Image Matrix] Initial generation parameters:', { 
        width: parameters.width,
        height: parameters.height,
        steps: parameters.steps, 
        guidance: parameters.guidance,
        strength: parameters.strength 
      });
      
      // Log generation job to participant_generations
      const userHash = typedSessionData.userHash;
      let jobId: string | null = null;
      if (userHash) {
        // Save each prompt separately
        for (const prompt of prompts) {
          jobId = await startParticipantGeneration(userHash, {
            type: 'initial',
            prompt: prompt.prompt,
            parameters: { ...parameters, num_sources: prompts.length, source: prompt.source },
            has_base_image: true,
            source: prompt.source
          });
        }
        // Use first jobId for tracking
        if (prompts.length > 0) {
          jobId = await startParticipantGeneration(userHash, {
            type: 'initial',
            prompt: JSON.stringify(prompts.map(p => ({ source: p.source, prompt: p.prompt.substring(0, 200) }))),
            parameters: { ...parameters, num_sources: prompts.length },
            has_base_image: true,
          });
        }
      }
      
      // Step 3: Generate all images in parallel with progressive display
      setLoadingProgress(55);
      
      // Track completed images for progress
      let completedCount = 0;
      
      // Track progress for each image
      const startTime = Date.now();
      let progressInterval: NodeJS.Timeout | null = null;

      // Smooth, slower fallback progress curve (asymptotic to 90% over ~90s)
      const calcFallbackProgress = (elapsedMs: number) => {
        const t = Math.max(0, Math.min(1, elapsedMs / 90000)); // 0..1 over 90s
        const eased = 1 - Math.pow(1 - t, 4); // ease-out quart
        return Math.min(90, Math.round(2 + eased * 88)); // start at 2%, max 90%
      };
      
      const updateProgress = () => {
        const pendingSources = prompts
          .map(p => p.source)
          .filter(src => !matrixImages.some(img => img.source === src));
        const activeSource = pendingSources[0];

        prompts.forEach(({ source }) => {
          // Check if image already exists
          const existingImage = matrixImages.find(img => img.source === source);
          if (!existingImage) {
            const offset = progressOffsets[source] ?? 0;
            const speedFactor = source === activeSource ? 1.35 : 1; // active slot animates faster
            const elapsed = Math.max(0, (Date.now() - startTime - offset) * speedFactor);
            const estimatedProgress = calcFallbackProgress(elapsed);
            setImageProgress(prev => {
              // Only update if not already at 100%
              if (prev[source] !== 100 && estimatedProgress > (prev[source] ?? 0)) {
                return {
                  ...prev,
                  [source]: estimatedProgress
                };
              }
              return prev;
            });
          }
        });
      };
      
      // Update progress every 500ms
      progressInterval = setInterval(updateProgress, 500);
      
      // Callback to show images as they complete
      const onImageReady = (result: any) => {
        // If backend sends live progress, reflect it in UI
        if (result && typeof result.progress === 'number' && !Number.isNaN(result.progress)) {
          setImageProgress(prev => ({
            ...prev,
            [result.source]: Math.min(100, Math.max(0, Math.round(result.progress)))
          }));
        }

        if (result.success) {
          completedCount++;
          const sourceLabel = GENERATION_SOURCE_LABELS[result.source as GenerationSource];
          const displayIndex = synthesisResult.displayOrder.indexOf(result.source);
          const newImage: GeneratedImage = {
            id: `matrix-${generationCount}-${result.source}`,
            url: `data:image/png;base64,${result.image}`,
            base64: result.image,
            prompt: result.prompt,
            parameters: {
              ...parameters,
              source: result.source,
              sourceLabel: sourceLabel,
              processingTime: result.processing_time
            },
            ratings: { aesthetic_match: 0, character: 0, harmony: 0, is_my_interior: 0 },
            isFavorite: false,
            createdAt: Date.now(),
            source: result.source,
            displayIndex: displayIndex >= 0 ? displayIndex : completedCount - 1,
            isBlindSelected: false,
            provider: 'google' // Now always using Google
          };
          
          // Mark as 100% complete
          setImageProgress(prev => ({
            ...prev,
            [result.source]: 100
          }));
          
          // Add to matrix images progressively
          setMatrixImages(prev => {
            // Remove any existing image with same source to avoid duplicates
            const filtered = prev.filter(img => img.source !== result.source);
            const updated = [...filtered, newImage].sort((a, b) => (a.displayIndex || 0) - (b.displayIndex || 0));
            console.log(`[6-Image Matrix] Progressive update: ${updated.length} images (added ${result.source})`);
            return updated;
          });
          setGeneratedImages(prev => {
            // Remove any existing image with same source to avoid duplicates
            const filtered = prev.filter(img => img.source !== result.source);
            const updated = [...filtered, newImage].sort((a, b) => (a.displayIndex || 0) - (b.displayIndex || 0));
            return updated;
          });
          
          // Update progress
          const progressPercent = 55 + (completedCount / prompts.length) * 30;
          setLoadingProgress(progressPercent);
          setStatusMessage({ pl: `Wygenerowano ${completedCount}/${prompts.length} wizji...`, en: `Generated ${completedCount}/${prompts.length} visions...` });
          
          // Cleanup interval when all images are done
          if (completedCount >= prompts.length && progressInterval) {
            clearInterval(progressInterval);
            progressInterval = null;
          }
        }
      };
      
      // Use the processed room image (with furniture removed) for generation
      // This ensures generated images don't stick too closely to existing furniture layout
      // processedRoomImage is already cleaned (no data URI prefix) from the selection above
      const baseImageForGeneration = processedRoomImage;
      
      // Ensure processedRoomImage is in correct format (base64 without data URI prefix)
      // It should already be clean, but double-check
      let baseImage = baseImageForGeneration;
      if (baseImage) {
        // Remove data URI prefix if present (shouldn't be, but just in case)
        if (baseImage.includes(',')) {
          baseImage = baseImage.split(',')[1];
        }
        
        // #region agent log - verify baseImage matches expected
        const isUsingEmpty = !!finalRoomImageEmpty;
        const isSameAsOriginal = baseImageForGeneration === roomImage;
        const baseImageFirstChars = baseImage?.substring(0, 50) || 'null';
        const roomImageFirstChars = roomImage?.substring(0, 50) || 'null';
        const finalRoomImageEmptyFirstChars = finalRoomImageEmpty?.substring(0, 50) || 'null';
        const baseImageMatchesEmpty = finalRoomImageEmpty ? baseImage === finalRoomImageEmpty.split(',')[1] || baseImage === finalRoomImageEmpty : false;
        const baseImageMatchesOriginal = baseImage === (roomImage.includes(',') ? roomImage.split(',')[1] : roomImage);
        fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'generate/page.tsx:base-image-verification',message:'Verifying baseImage before API call',data:{hasBaseImage:!!baseImage,baseImageLength:baseImage?.length||0,isUsingEmpty,isSameAsOriginal,baseImageMatchesEmpty,baseImageMatchesOriginal,baseImageFirstChars,roomImageFirstChars,finalRoomImageEmptyFirstChars,processedRoomImageLength:processedRoomImage?.length||0,roomImageLength:roomImage?.length||0,finalRoomImageEmptyLength:finalRoomImageEmpty?.length||0},timestamp:Date.now(),sessionId:'debug-session',runId:'room-image-debug',hypothesisId:'H1'})}).catch(()=>{});
        // #endregion
        
        console.log("[6-Image Matrix] Using processed room image (furniture removed, cleaned):", {
          hasImage: !!baseImage,
          length: baseImage?.length || 0,
          startsWith: baseImage?.substring(0, 50) || 'N/A',
          isBase64: baseImage && !baseImage.startsWith('http') && !baseImage.startsWith('blob:'),
          isProcessed: !!finalRoomImageEmpty || baseImageForGeneration !== roomImage,
          isUsingEmpty,
          baseImageMatchesEmpty,
          baseImageMatchesOriginal
        });
        
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'generate/page.tsx:base-image-final',message:'Final base image being sent to generation',data:{hasBaseImage:!!baseImage,baseImageLength:baseImage?.length||0,isProcessed:!!finalRoomImageEmpty,isSameAsOriginal:baseImageForGeneration===roomImage,hasRoomImageEmpty:!!finalRoomImageEmpty,isUsingEmpty,baseImageMatchesEmpty,baseImageMatchesOriginal},timestamp:Date.now(),sessionId:'debug-session',runId:'room-image-debug',hypothesisId:'H1'})}).catch(()=>{});
        // #endregion
      } else {
        console.error("[6-Image Matrix] ERROR: processedRoomImage is missing or empty!");
        setError(t({ pl: "Brak zdjęcia pokoju w sesji. Proszę wrócić do kroku uploadu zdjęcia.", en: "No room photo in session. Please return to the photo upload step." }));
        setIsGenerating(false);
        return;
      }
      
      // Filter out blob URLs from inspiration images - they cannot be used for generation
      // Only use base64 strings or HTTP/HTTPS URLs
      let filteredInspirationImages: string[] | undefined = undefined;
      if (synthesisResult.inspirationImages && synthesisResult.inspirationImages.length > 0) {
        filteredInspirationImages = synthesisResult.inspirationImages.filter((img: string) => {
          // Skip blob URLs - they cannot be fetched or used
          if (img.startsWith('blob:')) {
            console.warn("[6-Image Matrix] Skipping blob URL inspiration image:", img.substring(0, 50));
            return false;
          }
          // Keep base64 (with or without data: prefix) and HTTP/HTTPS URLs
          return true;
        });
        
        // Process remaining images: extract base64 from data URIs, keep HTTP URLs as-is
        if (filteredInspirationImages.length > 0) {
          filteredInspirationImages = filteredInspirationImages.map((img: string) => {
            // If it's base64 with data URI prefix, extract just the base64 part
            if (img.startsWith('data:')) {
              return img.split(',')[1];
            }
            // Otherwise keep as-is (base64 without prefix or HTTP/HTTPS URL)
            return img;
          });
          console.log("[6-Image Matrix] Filtered inspiration images:", {
            original: synthesisResult.inspirationImages.length,
            filtered: filteredInspirationImages.length,
            removed: synthesisResult.inspirationImages.length - filteredInspirationImages.length
          });
        } else {
          console.warn("[6-Image Matrix] All inspiration images were blob URLs, skipping inspiration images");
          filteredInspirationImages = undefined;
        }
      }
      
      console.log("[6-Image Matrix] Calling generateSixImagesParallel with:", {
        promptsCount: prompts.length,
        hasBaseImage: !!baseImage,
        baseImageLength: baseImage?.length || 0,
        hasInspirationImages: !!filteredInspirationImages,
        inspirationImagesCount: filteredInspirationImages?.length || 0,
        style: typedSessionData.visualDNA?.dominantStyle || 'modern',
        parameters
      });
      
      // DEV: Log prompts being sent to API
      console.log("=".repeat(80));
      console.log("🚀 [DEV] PROMPTS BEING SENT TO API:");
      console.log("=".repeat(80));
      prompts.forEach(({ source, prompt }, index) => {
        const sourceLabel = GENERATION_SOURCE_LABELS[source];
        console.log(`\n📤 [${index + 1}/${prompts.length}] ${sourceLabel?.pl || source}:`);
        console.log("-".repeat(80));
        try {
          const parsed = JSON.parse(prompt);
          console.log(JSON.stringify(parsed, null, 2));
        } catch {
          console.log(prompt.substring(0, 500) + (prompt.length > 500 ? '...' : ''));
        }
        console.log("-".repeat(80));
      });
      console.log("=".repeat(80));
      
      // Generate same 6 prompts with Google (Vertex AI)
      const googleGenerationResponse = await generateSixImagesParallelWithGoogle(
        {
          prompts,
          base_image: baseImage,
          // Note: inspiration_images not supported in MultiSourceGenerationRequest type
          // filteredInspirationImages would need to be passed differently if needed
          style: typedSessionData.visualDNA?.dominantStyle || 'modern',
          parameters: {
            ...parameters,
            strength: parameters.strength ?? 0.55,
          }
        },
        (result) => {
          // Mark as Google provider and adjust display index
          const displayIndex = synthesisResult.displayOrder.indexOf(result.source);
          const googleResult = {
            ...result,
            provider: 'google',
            displayIndex: displayIndex >= 0 ? displayIndex : undefined
          };
          
          // Update the onImageReady callback to handle Google images
          if (result.success) {
            completedCount++;
            const sourceLabel = GENERATION_SOURCE_LABELS[result.source as GenerationSource];
            const newImage: GeneratedImage = {
              id: `matrix-google-${generationCount}-${result.source}`,
              url: `data:image/png;base64,${result.image}`,
              base64: result.image,
              prompt: result.prompt,
              parameters: {
                ...parameters,
                source: result.source,
                sourceLabel: sourceLabel,
                processingTime: result.processing_time
              },
              ratings: { aesthetic_match: 0, character: 0, harmony: 0, is_my_interior: 0 },
              isFavorite: false,
              createdAt: Date.now(),
              source: result.source,
              displayIndex: googleResult.displayIndex,
              isBlindSelected: false,
              provider: 'google'
            };
            
            setImageProgress(prev => ({
              ...prev,
              [`google-${result.source}`]: 100
            }));
            
            setMatrixImages(prev => {
              const filtered = prev.filter(img => !(img.source === result.source && img.provider === 'google'));
              const updated = [...filtered, newImage].sort((a, b) => (a.displayIndex || 0) - (b.displayIndex || 0));
              console.log(`[6-Image Matrix] Progressive update (Google): ${updated.length} images (added ${result.source})`);
              return updated;
            });
            
            setGeneratedImages(prev => {
              const filtered = prev.filter(img => !(img.source === result.source && img.provider === 'google'));
              return [...filtered, newImage].sort((a, b) => (a.displayIndex || 0) - (b.displayIndex || 0));
            });
            
            // Add all matrix images to generation history so user can switch between them
            const historyNode = {
              id: newImage.id,
              type: 'initial' as const,
              label: sourceLabel?.pl || result.source,
              timestamp: Date.now(),
              imageUrl: newImage.url,
            };
            setGenerationHistory(prev => {
              // Avoid duplicates
              const exists = prev.find(h => h.id === historyNode.id);
              if (exists) return prev;
              const newHistory = [...prev, historyNode];
              return newHistory;
            });
            
            const totalExpected = prompts.length;
            const progressPercent = 55 + (completedCount / totalExpected) * 30;
            setLoadingProgress(progressPercent);
            setStatusMessage({ pl: `Wygenerowano ${completedCount}/${totalExpected} wizji...`, en: `Generated ${completedCount}/${totalExpected} visions...` });
          }
        },
        controller.signal
      );

      console.log("[12-Image Matrix] Google generation returned:", {
        successful_count: googleGenerationResponse?.successful_count,
        failed_count: googleGenerationResponse?.failed_count,
        results_count: googleGenerationResponse?.results?.length || 0
      });

      // Process Google results
      const googleResults = googleGenerationResponse.results.map(r => Object.assign({}, r, { provider: 'google' as const }));
      const generationResponse = {
        results: googleResults as any[],
        total_processing_time: googleGenerationResponse.total_processing_time,
        successful_count: googleGenerationResponse.successful_count,
        failed_count: googleGenerationResponse.failed_count
      };
      
      console.log("[6-Image Matrix] Google generation response:", {
        successful_count: generationResponse?.successful_count,
        failed_count: generationResponse?.failed_count,
        results_count: generationResponse?.results?.length || 0
      });
      
      // Step 4: Process results
      setLoadingProgress(85);
      setStatusMessage({ pl: "Finalizuję obrazy...", en: "Finalizing images..." });
      setEstimatedTime(10);
      
      console.log("[6-Image Matrix] Generation response:", {
        successful_count: generationResponse.successful_count,
        failed_count: generationResponse.failed_count,
        results: generationResponse.results.map(r => ({ source: r.source, success: r.success, hasImage: !!r.image }))
      });
      
      if (generationResponse.successful_count === 0) {
        setError(t({ pl: "Wszystkie generacje zakończyły się niepowodzeniem.", en: "All generations failed." }));
        if (jobId) await endParticipantGeneration(jobId, { status: 'error', latency_ms: Date.now() - matrixGenerationStartTime, error_message: 'All generations failed' });
        return;
      }
      
      // Final update: create complete list from generationResponse
      // (Images should already be in matrixImages from onImageReady callback, but this ensures completeness)
      const displayOrder = synthesisResult.displayOrder;
      const newMatrixImages: GeneratedImage[] = generationResponse.results
        .filter(r => r.success)
        .map((result, idx) => {
          const displayIndex = displayOrder.indexOf(result.source);
          const sourceLabel = GENERATION_SOURCE_LABELS[result.source as GenerationSource];
          const provider = (result as any).provider || 'google';
          const baseId = provider === 'google' ? `matrix-google-${generationCount}-${result.source}` : `matrix-${generationCount}-${result.source}`;
          const finalDisplayIndex = provider === 'google' 
            ? (displayIndex >= 0 ? displayIndex + 6 : idx + 6)
            : (displayIndex >= 0 ? displayIndex : idx);
          
          return {
            id: baseId,
            url: `data:image/png;base64,${result.image}`,
            base64: result.image,
            prompt: result.prompt,
            parameters: {
              ...parameters,
              source: result.source,
              sourceLabel: sourceLabel,
              processingTime: result.processing_time
            },
            ratings: { aesthetic_match: 0, character: 0, harmony: 0, is_my_interior: 0 },
            isFavorite: false,
            createdAt: Date.now(),
            source: result.source,
            displayIndex: finalDisplayIndex,
            isBlindSelected: false,
            provider: provider as 'modal' | 'google'
          };
        });
      
      // Sort by display index for blind comparison
      newMatrixImages.sort((a, b) => (a.displayIndex || 0) - (b.displayIndex || 0));
      
      console.log("[6-Image Matrix] Final images to display:", newMatrixImages.length, newMatrixImages.map(i => ({ source: i.source, displayIndex: i.displayIndex, hasUrl: !!i.url })));
      
      if (newMatrixImages.length === 0) {
        console.error("[6-Image Matrix] ERROR: No images to display!");
        setError(t({ pl: "Nie udało się wygenerować żadnych obrazów.", en: "Failed to generate any images." }));
        return;
      }
      
      if (newMatrixImages.length < generationResponse.successful_count) {
        console.warn(`[6-Image Matrix] WARNING: Expected ${generationResponse.successful_count} images, got ${newMatrixImages.length}`);
      }
      
      // Update state with all images
      setMatrixImages(newMatrixImages);
      setMatrixDisplayOrder(displayOrder.filter(s => 
        newMatrixImages.some(img => img.source === s)
      ));
      setGeneratedImages(newMatrixImages);
      
      // Reset carousel to first image
      setCarouselIndex(0);
      
      console.log("[6-Image Matrix] State updated:", {
        matrixImagesCount: newMatrixImages.length,
        displayOrderLength: displayOrder.filter(s => newMatrixImages.some(img => img.source === s)).length,
        carouselIndex: 0
      });
      setSelectedImage(null); // No selection yet - blind comparison mode
      setBlindSelectionMade(false);
      setShowSourceReveal(false);
      setGenerationCount(prev => prev + 1);
      
      // Complete loading
      setLoadingProgress(100);
      setEstimatedTime(0);
      setStatusMessage({ pl: "Gotowe! Wybierz swoje ulubione wnętrze.", en: "Ready! Choose your favorite interior." });
      
      // Save to session and Supabase
      try {
        // Save generated images to sessionData (like inspirations)
        const generatedImagesPayload = newMatrixImages.map(img => ({
          id: img.id,
          url: img.url,
          // base64 intentionally omitted to keep session light
          prompt: img.prompt,
          source: img.source,
          sourceLabel: img.parameters?.sourceLabel,
          parameters: img.parameters,
          createdAt: new Date(img.createdAt).toISOString(),
          isFavorite: img.isFavorite || false,
          ratings: img.ratings
        }));
        
        // Update sessionData with generated images (local)
        const currentGenerated = (typedSessionData?.generatedImages || []);
        await updateSessionData({ 
          generatedImages: [...currentGenerated, ...generatedImagesPayload]
        } as any);
        
        // Persist to spaces (Supabase)
        const userHash = (sessionData as any)?.userHash;
        // Track updated spaces locally; keep defined even if no Supabase write occurs
        let updatedSpaces: any[] = [];
        const spaceId = await getOrCreateSpaceId(userHash, {
          spaceId: (sessionData as any)?.currentSpaceId,
          name: (sessionData as any)?.roomName || 'Moja Przestrzeń'
        });

        if (spaceId) {
          // #region agent log
          void fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'generate/page.tsx:save-matrix-images',message:'Saving matrix images to participant_images',data:{userHash,imageCount:newMatrixImages.length,spaceId},timestamp:Date.now(),sessionId:'debug-session',runId:'flow-debug',hypothesisId:'H7'})}).catch(()=>{});
          // #endregion
          
          // Save all generated images to participant_images
          const imagesToSave = newMatrixImages.map(img => ({
            url: img.url,
            type: 'generated' as const,
            is_favorite: img.isFavorite || false,
            source: img.source,
            generation_id: (sessionData as any)?.currentGenerationId || undefined,
            space_id: spaceId
          }));
          await saveParticipantImages(userHash, imagesToSave);
          
          // #region agent log
          void fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'generate/page.tsx:save-matrix-images-complete',message:'Finished saving matrix images',data:{userHash,imageCount:imagesToSave.length},timestamp:Date.now(),sessionId:'debug-session',runId:'flow-debug',hypothesisId:'H7'})}).catch(()=>{});
          // #endregion

          // Keep local minimal spaces snapshot
          updatedSpaces = addGeneratedImageToSpace(
            (typedSessionData?.spaces || []),
            spaceId,
            newMatrixImages[0]?.url || ''
          );
          await updateSessionData({ spaces: updatedSpaces, currentSpaceId: spaceId } as any);
        }
        
        // NOTE: After radical refactor we do NOT persist "spaces" in Supabase.
        // Persistence across sessions is handled via participant_images + participants snapshot.
        
        if (userHash && jobId) {
          const totalTime = Date.now() - matrixGenerationStartTime;
          await endParticipantGeneration(jobId, { 
            status: 'success', 
            latency_ms: totalTime
          });
        }
      } catch (e) {
        console.warn('[6-Image Matrix] Supabase persist failed:', e);
      }
      
      console.log("[6-Image Matrix] Generation complete!", {
        imagesGenerated: newMatrixImages.length,
        displayOrder: displayOrder
      });
      
      // Odejmij kredyty za wszystkie wygenerowane obrazy (6 obrazków × 10 kredytów = 60 kredytów)
      if (userHash && newMatrixImages.length > 0) {
        try {
          const totalCreditsToDeduct = newMatrixImages.length * 10; // 10 kredytów na obrazek
          console.log(`[6-Image Matrix] Deducting ${totalCreditsToDeduct} credits for ${newMatrixImages.length} images`);
          
          // Odejmij kredyty dla każdego obrazka osobno (każdy ma swój generationId)
          const deductPromises = newMatrixImages.map(async (image) => {
            if (image.id) {
              const response = await fetch('/api/credits/deduct', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userHash, generationId: image.id }),
              });
              
              if (!response.ok) {
                const errorData = await response.json();
                console.warn(`[Credits] Failed to deduct credits for image ${image.id}:`, errorData.error || 'Unknown error');
              } else {
                console.log(`[Credits] Credits deducted successfully for image ${image.id}`);
              }
            }
          });
          
          await Promise.all(deductPromises);
          console.log(`[6-Image Matrix] All credits deducted successfully for ${newMatrixImages.length} images`);
        } catch (creditError) {
          console.warn('[6-Image Matrix] Error deducting credits (tables may not exist yet):', creditError);
          // Nie blokuj aplikacji jeśli odejmowanie kredytów się nie powiodło
        }
      }
      
    } catch (err: any) {
      // Check if it was an abort
      if (err.name === 'AbortError' || err.message === 'Generation cancelled') {
        console.log('[6-Image Matrix] Generation was cancelled by user');
        setStatusMessage({ pl: "Generacja została anulowana.", en: "Generation was cancelled." });
      } else {
        console.error('[6-Image Matrix] Generation failed:', err);
        setError(err instanceof Error ? err.message : t({ pl: 'Wystąpił nieznany błąd podczas generacji.', en: 'An unknown error occurred during generation.' }));
      }
    } finally {
      // Always cleanup
      setIsGenerating(false);
      setAbortController(null);
    }
  };
  
  /**
   * Handles selection in blind comparison mode.
   * Now with full feedback collection including quality metrics.
   */
  /**
   * Upscale a selected preview image to full resolution
   */
  const handleUpscale = async (image: GeneratedImage) => {
    if (isUpscaling || !image) return;
    
    setIsUpscaling(true);
    setError(null);
    
    try {
      console.log('Upscaling image:', image.id);
      
      // Get the prompt and seed from the image
      const prompt = image.prompt || '';
      const seed = image.parameters?.seed || image.parameters?.generation_info?.seed || 42;
      const targetSize = 1024; // Full resolution
      
      // Check if image is from Google or Modal
      const isGoogleImage = image.provider === 'google';
      
      // Get inspiration images if available (only for Modal)
      const typedSessionData = sessionData as any;
      const inspirationImages = isGoogleImage ? undefined : synthesisResult?.inspirationImages;
      
      // Clean image base64 (remove data: prefix if present)
      let imageBase64 = image.base64;
      if (imageBase64.includes(',')) {
        imageBase64 = imageBase64.split(',')[1];
      }
      
      // Upscale the image using Google (Vertex AI) (FORCED)
      console.log('[Upscale] Using Google (forced)');
      const upscaledBase64 = await upscaleImageWithGoogle(
        imageBase64,
        seed,
        prompt,
        targetSize
      );
      
      // Create upscaled image object
      const upscaled: GeneratedImage = {
        ...image,
        id: `${image.id}-upscaled`,
        url: `data:image/png;base64,${upscaledBase64}`,
        base64: upscaledBase64,
        provider: 'google' as const, // Force provider to google
        parameters: {
          ...image.parameters,
          mode: 'upscale',
          target_size: targetSize,
        }
      };
      
      setUpscaledImage(upscaled);
      setSelectedImage(upscaled); // Update selected image to upscaled version
      
      console.log('Image upscaled successfully');
    } catch (err: any) {
      console.error('Error upscaling image:', err);
      setError(err.message || t({ pl: 'Nie udało się upscalować obrazu.', en: 'Failed to upscale image.' }));
    } finally {
      setIsUpscaling(false);
    }
  };

  const handleBlindSelection = async (image: GeneratedImage) => {
    if (blindSelectionMade) return;
    
    const selectionTime = Date.now() - matrixGenerationStartTime;
    console.log(`[6-Image Matrix] User selected image from source: ${image.source} at position ${image.displayIndex}`);
    
    setSelectedImage(image);
    setBlindSelectionMade(true);
    setSelectedSourceIndex(image.displayIndex || 0);

    // Persist minimal selection so refresh doesn't skip/regen unexpectedly
    try {
      await updateSessionData({
        selectedImage: {
          id: image.id,
          url: image.url,
          source: image.source,
          provider: image.provider
        },
        blindSelectionMade: true
      } as any);
    } catch (e) {
      console.warn('[Generate] Failed to persist selectedImage/blindSelectionMade to session:', e);
    }
    
    // Update the image as selected
    setMatrixImages(prev => prev.map(img => ({
      ...img,
      isBlindSelected: img.id === image.id
    })));
    
    // Skip automatic upscaling - we now generate in high quality from the start
    console.log('[6-Image Matrix] Skipping upscaling step - using original high-quality generation');
    
    // Collect full feedback with quality metrics
    try {
      const projectId = await getOrCreateProjectId((sessionData as any).userHash);
      const typedSessionData = sessionData as any;
      
      // Get Tinder swipes for implicit quality
      const tinderSwipes = typedSessionData.tinderData?.swipes || [];
      const implicitQuality = tinderSwipes.length > 0 
        ? calculateImplicitQuality(tinderSwipes)
        : undefined;
      
      // Build quality report
      const { buildPromptInputsFromSession } = await import('@/lib/prompt-synthesis/input-builder');
      const inputs = buildPromptInputsFromSession(typedSessionData);
      const qualityReports = assessAllSourcesQuality(inputs, tinderSwipes);
      const sourceQualityMap: Record<string, string> = {};
      qualityReports.forEach(r => {
        sourceQualityMap[r.source] = r.status;
      });
      
      // Conflict analysis
      const conflictAnalysis = analyzeSourceConflict(inputs);
      
      const feedback: GenerationFeedback = {
        sessionId: typedSessionData.userHash || 'unknown',
        projectId: projectId || undefined,
        timestamp: new Date().toISOString(),
        generatedSources: matrixImages.map(img => img.source!).filter(Boolean),
        sourceQuality: sourceQualityMap,
        selectedSource: image.source || null,
        selectionTime,
        hasCompleteBigFive: !!(typedSessionData.bigFive?.scores && 
          typedSessionData.bigFive.scores.openness !== 50 &&
          typedSessionData.bigFive.scores.conscientiousness !== 50),
        tinderSwipeCount: tinderSwipes.length,
        explicitAnswerCount: countExplicitAnswers(typedSessionData),
        implicitQuality,
        conflictAnalysis: conflictAnalysis.hasConflict ? conflictAnalysis : undefined
      };
      
      // Save to Supabase
      if (projectId) {
        await saveGenerationFeedback({
          sessionId: feedback.sessionId,
          projectId: feedback.projectId,
          generatedSources: feedback.generatedSources,
          selectedSource: feedback.selectedSource,
          selectionTime: feedback.selectionTime,
          hasCompleteBigFive: feedback.hasCompleteBigFive,
          tinderSwipeCount: feedback.tinderSwipeCount,
          explicitAnswerCount: feedback.explicitAnswerCount,
          sourceQuality: sourceQualityMap,
          implicitQuality: feedback.implicitQuality,
          conflictAnalysis: feedback.conflictAnalysis
        });
        
        // Also log legacy event for backward compatibility
        await logBehavioralEvent(projectId, 'matrix_blind_selection', {
          selectedSource: image.source,
          selectedPosition: image.displayIndex,
          allSources: matrixImages.map(i => i.source),
          displayOrder: matrixDisplayOrder,
          selectionTimeMs: selectionTime
        });
      }
    } catch (e) {
      console.warn('[6-Image Matrix] Failed to save feedback:', e);
    }
    
    // Show reveal after short delay
    setTimeout(() => {
      setShowSourceReveal(true);
    }, 1000);
  };

  // Generate IDA comment for generated images
  const generateIdaComment = async () => {
    if (!selectedImage || isGeneratingComment) return;
    
    setIsGeneratingComment(true);
    try {
      const roomType = (sessionData as any)?.roomType || 'living room';
      const roomDescription = selectedImage.prompt.substring(0, 200);
      
      const result = await generateLLMComment(roomType, roomDescription, 'generated_image');
      
      if (result && result.comment) {
        setIdaComment(result.comment);
      }
    } catch (error) {
      console.error('Failed to generate IDA comment:', error);
      // Fallback comment
      setIdaComment(t({ pl: 'Świetnie! To wygenerowane wnętrze wygląda naprawdę fantastycznie!', en: 'Great! This generated interior looks really fantastic!' }));
    } finally {
      setIsGeneratingComment(false);
    }
  };

  // Navigate through generation history
  const handleHistoryNodeClick = (index: number) => {
    if (index >= 0 && index < generationHistory.length) {
      const historyNode = generationHistory[index];
      const image = generatedImages.find(img => img.id === historyNode.id);
      if (image) {
        // If user is previewing original room photo, switch back to the generated image when navigating history
        if (showOriginalRoomPhoto) {
          setShowOriginalRoomPhoto(false);
        }
        setSelectedImage(image);
        setCurrentHistoryIndex(index);
        setIdaComment(null); // Reset comment for historical image
      }
    }
  };

  // Use centralized parameters from useModalAPI
  const getOptimalParameters = getGenerationParameters;

  const handleInitialGeneration = async (force = false) => {
    console.log('[Generate] handleInitialGeneration called', { isApiReady, generationCount, force, isMatrixMode, isSessionInitialized });
    if (!isSessionInitialized) {
      console.log('[Generate] Session data not ready yet, skipping initial generation.');
      return;
    }
    if (!isApiReady) {
      console.log("API not ready, generation cancelled.");
      return;
    }
    if (!force && generationCount > 0) {
      console.log('[Generate] Generation already done, skipping');
      return;
    }

    // Sprawdź dostępność kredytów przed generacją
    const userHash = (sessionData as any)?.userHash;
    if (userHash) {
      // Sprawdź kredyty (z try-catch aby nie blokować aplikacji jeśli tabela nie istnieje)
      let hasCredits = true;
      try {
        hasCredits = await checkCreditsAvailable(userHash, 10);
      } catch (creditError) {
        console.warn('Error checking credits (tables may not exist yet):', creditError);
        // Kontynuuj bez sprawdzania kredytów jeśli tabela nie istnieje
      }
      
      if (!hasCredits) {
        setError(t({ pl: 'Nie masz wystarczającej liczby kredytów. Potrzebujesz 10 kredytów na jedną generację.', en: 'You do not have enough credits. You need 10 credits for one generation.' }));
        setStatusMessage({ pl: 'Brak kredytów', en: 'No credits' });
        return;
      }
    }
    
    // Use matrix generation mode (6 images from different sources)
    if (isMatrixMode) {
      console.log('[Generate] Using matrix mode, calling handleMatrixGeneration');
      return handleMatrixGeneration();
    }
    
    console.log("handleInitialGeneration: Rozpoczynam generowanie obrazów (legacy mode).");
    console.log("SessionData pełne dane:", JSON.stringify(sessionData, null, 2));
    
    const typedSessionData = sessionData as any;

    if (!typedSessionData || !typedSessionData.roomImage) {
      console.error("KRYTYCZNY BŁĄD: Brak 'roomImage' w danych sesji.");
      console.error("Dostępne klucze w sessionData:", Object.keys(typedSessionData || {}));
      console.error("Typ roomImage:", typeof typedSessionData?.roomImage);
      console.error("Wartość roomImage (pierwsze 100 znaków):", typedSessionData?.roomImage?.substring(0, 100));
      setError(t({ pl: "Nie można rozpocząć generowania, ponieważ w sesji brakuje zdjęcia Twojego pokoju.", en: "Cannot start generation because your room photo is missing from the session." }));
      setStatusMessage({ pl: "Błąd danych wejściowych.", en: "Input data error." });
      return;
    }

    // Use processed room image (with furniture removed) if available, otherwise process it
    let processedRoomImage = typedSessionData.roomImage;
    if (!typedSessionData.roomImageEmpty) {
      console.log("[Legacy Generation] No empty room image found, processing original image to remove furniture...");
      setStatusMessage({ pl: "Przygotowuję puste pomieszczenie (usuwam meble)...", en: "Preparing empty room (removing furniture)..." });
      try {
        const emptyRoomBase64 = await removeFurnitureFromImage(typedSessionData.roomImage);
        await updateSessionData({ roomImageEmpty: emptyRoomBase64 } as any);
        processedRoomImage = emptyRoomBase64;
        console.log("[Legacy Generation] Successfully processed room image - furniture removed");
      } catch (error) {
        console.error("[Legacy Generation] Failed to remove furniture, using original image:", error);
        processedRoomImage = typedSessionData.roomImage;
      }
    } else {
      console.log("[Legacy Generation] Using pre-processed empty room image");
      processedRoomImage = typedSessionData.roomImageEmpty;
    }

    setStatusMessage({ pl: "Krok 3/3: Wysyłanie zadania do AI. To może potrwać kilka minut...", en: "Step 3/3: Sending task to AI. This may take a few minutes..." });
    setLoadingStage(2);
    setLoadingProgress(35);
    setEstimatedTime(60);
    
    const prompt = buildInitialPrompt();
    const parameters = {
      ...getOptimalParameters('initial', generationCount),
      image_size: 512,  // First 6 images should be generated at 512 instead of 1024
      width: 512,
      height: 512,
    };
    
    console.log("Google Structured Prompt:", prompt);
    console.log("Google Parameters:", parameters);

    try {
      const userHash = (sessionData as any).userHash;
      let jobId: string | null = null;
      if (userHash) {
        jobId = await startParticipantGeneration(userHash, {
          type: 'initial',
          prompt,
          parameters,
          has_base_image: Boolean(processedRoomImage),
        });
      }
      
      // Update progress during generation
      setLoadingProgress(50);
      setStatusMessage({ pl: "Generowanie w toku...", en: "Generation in progress..." });
      setEstimatedTime(45);
      
      // Use Google for initial generation with processed (empty) room image
      console.log("[Generation] Using Google for initial generation (with furniture removed)");
      const response = await generateSixImagesParallelWithGoogle({
        prompts: [{ source: 'implicit' as GenerationSource, prompt }],
        base_image: processedRoomImage,
        style: typedSessionData.visualDNA?.dominantStyle || 'modern',
        parameters: {
          ...parameters,
          strength: parameters.strength ?? 0.6
        }
      });
      
      // Generation completed
      setLoadingProgress(80);
      setLoadingStage(3);
      setStatusMessage({ pl: "Finalizuję obrazy...", en: "Finalizing images..." });
      setEstimatedTime(10);

      if (!response || !response.results || response.results.length === 0 || !response.results[0]?.image) {
        console.error("Otrzymano pustą odpowiedź z API po generowaniu.");
        setError(t({ pl: "Nie udało się wygenerować obrazów. Otrzymano pustą odpowiedź z serwera.", en: "Failed to generate images. Received empty response from server." }));
        return;
      }

      const newImages: GeneratedImage[] = response.results.map((result: any, index: number) => ({
        id: `gen-${generationCount}-${index}`,
        url: `data:image/png;base64,${result.image}`,
        base64: result.image,
        prompt,
        provider: 'google' as const,
        parameters: { 
          style: typedSessionData.visualDNA?.dominantStyle || 'modern',
          modificationType: 'initial',
          iterationCount: generationCount,
          usedOriginal: true
        },
        ratings: { aesthetic_match: 0, character: 0, harmony: 0, is_my_interior: 0 },
        isFavorite: false,
        createdAt: Date.now(),
      }));

      setGeneratedImages(newImages);
      setSelectedImage(newImages[0]);
      setGenerationCount((prev) => prev + 1);
      
      setHasAnsweredInteriorQuestion(false);
      setHasCompletedRatings(false);
      
      // Save generated images to sessionData (lightweight, no base64)
      const generatedImagesPayload = newImages.map(img => ({
        id: img.id,
        url: img.url,
        prompt: img.prompt,
        parameters: img.parameters,
        createdAt: new Date(img.createdAt).toISOString(),
        isFavorite: img.isFavorite || false,
        ratings: img.ratings
      }));
      
        // Do not keep base64-heavy generatedImages in session; rely on Supabase
        // Keep a lightweight record if needed (URLs only)
        const currentGenerated = ((sessionData as any)?.generatedImages || []).map((g: any) => ({ url: g.url, id: g.id }));
        const lightweight = generatedImagesPayload.map(g => ({ url: g.url, id: g.id }));
        await updateSessionData({ generatedImages: [...currentGenerated, ...lightweight] } as any);
      
      // Save generated images to spaces (Supabase) - używamy już zdefiniowanego userHash z linii 1745
      const spaceId = await getOrCreateSpaceId(userHash, {
        spaceId: (sessionData as any)?.currentSpaceId,
        name: (sessionData as any)?.roomName || 'Moja Przestrzeń'
      });

      if (spaceId) {
        // #region agent log
        void fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'generate/page.tsx:save-initial-images',message:'Saving initial images to participant_images',data:{userHash,imageCount:newImages.length},timestamp:Date.now(),sessionId:'debug-session',runId:'flow-debug',hypothesisId:'H7'})}).catch(()=>{});
        // #endregion
        
        // Save all generated images to participant_images
        const imagesToSave = newImages.map(img => ({
          url: img.url,
          type: 'generated' as const,
          is_favorite: img.isFavorite || false,
          generation_id: (sessionData as any)?.currentGenerationId || undefined,
          space_id: spaceId
        }));
        await saveParticipantImages(userHash, imagesToSave);
        
        // #region agent log
        void fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'generate/page.tsx:save-initial-images-complete',message:'Finished saving initial images',data:{userHash,imageCount:imagesToSave.length},timestamp:Date.now(),sessionId:'debug-session',runId:'flow-debug',hypothesisId:'H7'})}).catch(()=>{});
        // #endregion

        const updatedSpaces = addGeneratedImageToSpace(
          (sessionData as any)?.spaces || [],
          spaceId,
          newImages[0]?.url || ''
        );
        await updateSessionData({ spaces: updatedSpaces, currentSpaceId: spaceId });
      }
      
      // Complete loading
      setLoadingProgress(100);
      setEstimatedTime(0);
      setStatusMessage({ pl: "Gotowe!", en: "Ready!" });
      
      // Add to history
      const historyNode = {
        id: newImages[0].id,
        type: 'initial' as const,
        label: 'Początkowa generacja',
        timestamp: Date.now(),
        imageUrl: newImages[0].url,
      };
      setGenerationHistory([historyNode]);
      setCurrentHistoryIndex(0);

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

      // Persist generation to Supabase
      try {
        const projectIdPersist = await getOrCreateProjectId((sessionData as any).userHash);
        if (projectIdPersist) {
          // legacy analytics disabled after refactor
        }
      } catch (e) {
        console.warn('Supabase persist failed (initial generation):', e);
      }

      // Close job with timing (approx, since we don't have precise start time here)
      try {
        if (jobId) {
          await endParticipantGeneration(jobId, { status: 'success', latency_ms: 0 });
          // Odejmij kredyty po udanej generacji (użyj API route - działa po stronie serwera z service_role)
          if (userHash) {
            try {
              const response = await fetch('/api/credits/deduct', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userHash, generationId: jobId }),
              });
              
              if (!response.ok) {
                const errorData = await response.json();
                console.warn('[Credits] Failed to deduct credits:', errorData.error || 'Unknown error');
              } else {
                console.log('[Credits] Credits deducted successfully via API');
              }
            } catch (creditError) {
              console.warn('[Credits] Error deducting credits (tables may not exist yet):', creditError);
              // Nie blokuj aplikacji jeśli odejmowanie kredytów się nie powiodło
            }
          }
        }
      } catch {}
    } catch (err) {
      console.error('Generation failed in handleInitialGeneration:', err);
      setError(err instanceof Error ? err.message : 'Wystąpił nieznany błąd podczas generacji.');
      try {
        const userHash = (sessionData as any).userHash;
        if (userHash) {
          const jobId = await startParticipantGeneration(userHash, {
            type: 'initial',
            prompt: buildInitialPrompt(),
            parameters: getOptimalParameters('initial', generationCount),
            has_base_image: Boolean((sessionData as any).roomImage),
          });
          if (jobId) await endParticipantGeneration(jobId, { status: 'error', latency_ms: 0, error_message: String(err) });
        }
      } catch {}
    }
  };

  const handleModification = async (modification: ModificationOption, customPrompt?: string) => {
    if (!selectedImage) return;
    
    // Prevent multiple simultaneous modifications
    if (isLoading || isGenerating) {
      console.warn('[Modification] Already generating, ignoring duplicate request');
      return;
    }
    
    // Require user to answer interior question before allowing modifications
    if (!hasAnsweredInteriorQuestion) {
      setError(t({ pl: "Najpierw odpowiedz na pytanie 'Czy to moje wnętrze?' przed modyfikacją obrazu.", en: "Please answer the question 'Is this my interior?' before modifying the image." }));
      return;
    }

    const isMacro = modification.category === 'macro';
    const baseImageSource = selectedImage.base64;

    let modificationPrompt: string;
    
    // If custom prompt provided, use it. Otherwise build standard prompt.
    if (customPrompt) {
      modificationPrompt = customPrompt;
    } else if (isMacro) {
      modificationPrompt = buildMacroPrompt(modification);
    } else {
      modificationPrompt = buildMicroPrompt(modification);
    }

    const parameters = getOptimalParameters(isMacro ? 'macro' : 'micro', generationCount);

    // Update loading state for modifications
    setIsGenerating(true);
    setIsModifying(true);
    setLoadingStage(2);
    setLoadingProgress(40);
    setStatusMessage({ pl: `Modyfikuję obraz: ${t(modification.label)}...`, en: `Modifying image: ${t(modification.label)}...` });
    setEstimatedTime(30);
    setIdaComment(null); // Reset comment for new generation

    try {
      const userHash = (sessionData as any).userHash;
      let jobId: string | null = null;
      if (userHash) {
        jobId = await startParticipantGeneration(userHash, {
          type: isMacro ? 'macro' : 'micro',
          prompt: modificationPrompt,
          parameters,
          has_base_image: true,
          modification_label: t(modification.label),
        });
      }
      // #region prompt debug
      fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'flow/generate/page.tsx:handleModification:start',message:'Starting modification with Google API',data:{modificationLabel:t(modification.label),isMacro,modificationPrompt,hasBaseImage:!!baseImageSource,baseImageLength:baseImageSource?.length||0},timestamp:Date.now(),sessionId:'debug-session',runId:'prompt-debug'})}).catch(()=>{});
      // #endregion

      // Update progress during API call
      setLoadingProgress(60);
      setStatusMessage({ pl: `Przetwarzam modyfikację: ${t(modification.label)}...`, en: `Processing modification: ${t(modification.label)}...` });
      
      // Use Google API for modifications (instead of Modal/FLUX)
      const response = await generateSixImagesParallelWithGoogle({
        prompts: [{ source: 'implicit' as GenerationSource, prompt: modificationPrompt }],
        base_image: baseImageSource,
        style: isMacro ? modification.id : (selectedImage.parameters?.style || 'modern'),
        parameters: {
          ...parameters,
          strength: parameters.strength ?? (isMacro ? 0.75 : 0.25)
        }
      });
      
      // Update progress after API response
      setLoadingProgress(85);
      setStatusMessage({ pl: "Finalizuję zmodyfikowany obraz...", en: "Finalizing modified image..." });

      // #region prompt debug
      fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'flow/generate/page.tsx:handleModification:response',message:'Modification response received',data:{hasResponse:!!response,hasImages:!!response?.results,imagesCount:response?.results?.length||0,successfulCount:response?.successful_count,failedCount:response?.failed_count},timestamp:Date.now(),sessionId:'debug-session',runId:'prompt-debug'})}).catch(()=>{});
      // #endregion

      // Check for errors in response
      if (!response) {
        console.error("[Modification] No response from API");
        setIsGenerating(false);
        setIsModifying(false);
        setLastFailedModification(modification);
        setError(t({ pl: "Nie udało się zmodyfikować obrazu. Brak odpowiedzi z serwera.", en: "Failed to modify image. No response from server." }));
        return;
      }

      // Check if all results failed
      if (response.failed_count > 0 && response.successful_count === 0) {
        console.error("[Modification] All generation attempts failed:", response.results);
        const errorMessage = response.results.find(r => r.error)?.error || t({ pl: "Nieznany błąd", en: "Unknown error" });
        setIsGenerating(false);
        setIsModifying(false);
        setLastFailedModification(modification);
        setError(t({ pl: `Nie udało się zmodyfikować obrazu: ${errorMessage}`, en: `Failed to modify image: ${errorMessage}` }));
        return;
      }

      // Check if we have any successful results
      if (!response.results || response.results.length === 0) {
        console.error("[Modification] Empty results array");
        setIsGenerating(false);
        setIsModifying(false);
        setLastFailedModification(modification);
        setError(t({ pl: "Nie udało się zmodyfikować obrazu. Otrzymano pustą odpowiedź z serwera.", en: "Failed to modify image. Received empty response from server." }));
        return;
      }

      // Find first successful result
      const successfulResult = response.results.find(r => r.success && r.image);
      if (!successfulResult || !successfulResult.image) {
        console.error("[Modification] No successful results with image:", response.results);
        setIsGenerating(false);
        setIsModifying(false);
        setLastFailedModification(modification);
        setError(t({ pl: "Nie udało się zmodyfikować obrazu. Wszystkie próby zakończyły się niepowodzeniem.", en: "Failed to modify image. All attempts failed." }));
        return;
      }

      // Clear failed modification on success
      setLastFailedModification(null);

      // Log how many results we received (should be 1 for modifications)
      console.log(`[Modification] Received ${response.results.length} result(s) from API. Using first successful result.`);
      if (response.results.length > 1) {
        console.warn(`[Modification] WARNING: Received ${response.results.length} results but expected 1. This may cause multiple images to be generated.`);
      }

      // Use the successful result we found above
      const result = successfulResult;
      const newImage: GeneratedImage = {
        id: `mod-${generationCount}-0`,
        url: `data:image/png;base64,${result.image}`,
        base64: result.image,
        prompt: modificationPrompt,
        provider: 'google' as const,
        parameters: { 
          modificationType: isMacro ? 'macro' : 'micro',
          modifications: [t(modification.label)],
          iterationCount: generationCount,
          usedOriginal: false,
          parentImageId: selectedImage.id // Track which image this modification is based on
        },
        ratings: { aesthetic_match: 0, character: 0, harmony: 0, is_my_interior: 0 },
        isFavorite: false,
        createdAt: Date.now(),
      };

      // Add to generatedImages so it can be found in history, but not to matrixImages
      // This way modifications appear in history but not in the 6-image matrix grid
      setGeneratedImages((prev) => [...prev, newImage]);
      setSelectedImage(newImage);
      setGenerationCount((prev) => prev + 1);
      setShowModifications(false);
      
      setHasAnsweredInteriorQuestion(false);
      setHasCompletedRatings(false);
      setShowSourceReveal(true);
      
      // Save modified image to sessionData (but not to generatedImages array to avoid showing in matrix)
      const generatedImagePayload = {
        id: newImage.id,
        url: newImage.url,
        base64: newImage.base64,
        prompt: newImage.prompt,
        parameters: newImage.parameters,
        createdAt: new Date(newImage.createdAt).toISOString(),
        isFavorite: newImage.isFavorite || false,
        ratings: newImage.ratings
      };
      
      const currentGenerated = ((sessionData as any)?.generatedImages || []).map((g: any) => ({ id: g.id, url: g.url }));
      const lightweight = { id: generatedImagePayload.id, url: generatedImagePayload.url };
      await updateSessionData({ 
        generatedImages: [...currentGenerated, lightweight]
      } as any);
      
      // Save modified image to spaces
      const currentSpaces = (sessionData as any)?.spaces || [];
      let updatedSpaces = currentSpaces;
      const activeSpaceId = (sessionData as any)?.currentSpaceId;
      const activeSpaceName = (sessionData as any)?.roomName;
      updatedSpaces = addGeneratedImageToSpace(
        updatedSpaces,
        activeSpaceId,
        newImage.url,
        activeSpaceName,
        undefined,
        undefined,
        newImage.isFavorite || false
      );
      const sessionUpdates: any = { spaces: updatedSpaces };
      if (!activeSpaceId && updatedSpaces.length > 0) {
        sessionUpdates.currentSpaceId = updatedSpaces[updatedSpaces.length - 1].id;
      }
      await updateSessionData(sessionUpdates);
      
      // Complete modification
      setLoadingProgress(100);
      setLoadingStage(3);
      setStatusMessage({ pl: "Modyfikacja zakończona!", en: "Modification completed!" });
      setEstimatedTime(0);
      setIsGenerating(false);
      setIsModifying(false);
      
      // Add to history
      const historyNode = {
        id: newImage.id,
        type: isMacro ? ('macro' as const) : ('micro' as const),
        label: t(modification.label),
        timestamp: Date.now(),
        imageUrl: newImage.url,
      };
      setGenerationHistory((prev) => [...prev, historyNode]);
      setCurrentHistoryIndex(generationHistory.length);

      await updateSessionData({
        generations: [
          ...((sessionData as any).generations || []),
          {
            id: `mod-${generationCount}`,
            prompt: modificationPrompt,
            images: 1,
            timestamp: Date.now(),
            type: isMacro ? 'macro' : 'micro',
            modification: t(modification.label),
            iterationCount: generationCount,
            usedOriginal: false
          },
        ],
      });

      // Persist generation modification and user choice
      try {
        const projectIdPersist = await getOrCreateProjectId((sessionData as any).userHash);
        if (projectIdPersist) {
          // legacy analytics disabled after refactor
        }
      } catch (e) {
        console.warn('Supabase persist failed (modification):', e);
      }

      try { if (jobId) await endParticipantGeneration(jobId, { status: 'success', latency_ms: 0 }); } catch {}
    } catch (err) {
      console.error('Modification failed:', err);
      setIsGenerating(false);
      setIsModifying(false);
      setError(err instanceof Error ? err.message : t({ pl: 'Wystąpił nieznany błąd podczas modyfikacji.', en: 'An unknown error occurred during modification.' }));
      try {
        const userHash = (sessionData as any).userHash;
        if (userHash) {
          const jobId = await startParticipantGeneration(userHash, {
            type: modification.category,
            prompt: 'n/a',
            parameters: getOptimalParameters(modification.category === 'macro' ? 'macro' : 'micro', generationCount),
            has_base_image: true,
            modification_label: t(modification.label),
          });
          if (jobId) await endParticipantGeneration(jobId, { status: 'error', latency_ms: 0, error_message: String(err) });
        }
      } catch {}
    }
  };

  const handleRemoveFurniture = async () => {
    if (!selectedImage) return;
    
    // Require user to answer interior question before allowing furniture removal
    if (!hasAnsweredInteriorQuestion) {
      setError(t({ pl: "Najpierw odpowiedz na pytanie 'Czy to moje wnętrze?' przed usunięciem mebli.", en: "Please answer the question 'Is this my interior?' before removing furniture." }));
      return;
    }
    
    // JSON prompt for removal
    const removeFurniturePrompt = JSON.stringify({
      instruction: "EMPTY ARCHITECTURAL SHELL: Remove ALL furniture, rugs, curtains, and decorations. Keep only the structural elements of the room.",
      preserve: [
        "walls - EXACTLY the same",
        "windows - EXACTLY the same",
        "doors - EXACTLY the same",
        "ceiling - EXACTLY the same",
        "floor - EXACTLY the same",
        "camera perspective and framing - DO NOT CHANGE"
      ],
      remove: [
        "ALL furniture and seating",
        "ALL rugs and carpets",
        "ALL curtains and window treatments",
        "ALL decorations and accessories",
        "ALL lighting fixtures"
      ],
      style: "Clean empty room",
      redesign_process: "STEP 1: Keep room structure 100% unchanged. STEP 2: Erase everything else to create an empty space."
    });
    
    // Set loading state for removal
    setLoadingStage(2);
    setLoadingProgress(30);
    setStatusMessage({ pl: "Usuwam meble (AI)...", en: "Removing furniture (AI)..." });
    setEstimatedTime(25);
    setIsModifying(true);

    try {
      // Use Google API for furniture removal
      const response = await generateSixImagesParallelWithGoogle({
        prompts: [{ source: 'implicit' as GenerationSource, prompt: removeFurniturePrompt }],
        base_image: selectedImage.base64,
        style: 'empty',
        parameters: {
          ...getOptimalParameters('micro', generationCount),
          strength: 0.3 // Slightly higher strength for better removal
        }
      });

      if (!response || !response.results || response.results.length === 0 || !response.results[0]?.image) {
        setError("Nie udało się usunąć mebli.");
        return;
      }

      const result = response.results[0];
      const newImage: GeneratedImage = {
        id: `remove-${Date.now()}`,
        url: `data:image/png;base64,${result.image}`,
        base64: result.image,
        prompt: removeFurniturePrompt,
        provider: 'google' as const,
        parameters: { 
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

      // Save generated image to sessionData (like inspirations)
      const generatedImagePayload = {
        id: newImage.id,
        url: newImage.url,
        base64: newImage.base64,
        prompt: newImage.prompt,
        parameters: newImage.parameters,
        createdAt: new Date(newImage.createdAt).toISOString(),
        isFavorite: newImage.isFavorite || false,
        ratings: newImage.ratings
      };
      
      const currentGenerated = ((sessionData as any)?.generatedImages || []);
      await updateSessionData({
        generatedImages: [...currentGenerated, generatedImagePayload],
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
      } as any);

      // Complete removal
      setLoadingProgress(100);
      setStatusMessage({ pl: "Meble zostały usunięte!", en: "Furniture has been removed!" });
    } catch (err) {
      console.error('Remove furniture failed:', err);
      setError(err instanceof Error ? err.message : t({ pl: 'Wystąpił błąd podczas usuwania mebli.', en: 'An error occurred while removing furniture.' }));
    } finally {
      setIsModifying(false);
    }
  };

  const handleShowOriginal = () => {
    // Try to get roomImage from sessionData first
    let roomImage = (sessionData as any)?.roomImage;
    
    // Fallback to sessionStorage if not in sessionData (like in generation)
    if (!roomImage && typeof window !== 'undefined') {
      try {
        const sessionRoomImage = safeSessionStorage.getItem('aura_session_room_image');
        if (sessionRoomImage) {
          console.log("[Show Original] Found roomImage in sessionStorage, using it");
          roomImage = sessionRoomImage;
        }
      } catch (e) {
        console.warn('[Show Original] Failed to read roomImage from sessionStorage', e);
      }
    }
    
    if (!roomImage) {
      setError("Nie znaleziono oryginalnego zdjęcia z room setup. Proszę wrócić do kroku uploadu zdjęcia.");
      return;
    }

    // Ensure we have the base64 part (remove data URI prefix if present)
    let base64Image = roomImage;
    if (roomImage.includes(',')) {
      base64Image = roomImage.split(',')[1];
    }
    
    // Create data URL for display
    const dataUrl = `data:image/jpeg;base64,${base64Image}`;

    console.log("[Show Original] Showing original user-uploaded image:", {
      hasImage: !!roomImage,
      length: roomImage.length,
      base64Length: base64Image.length,
      urlLength: dataUrl.length
    });

    // Do NOT overwrite selectedImage (it breaks the 1/6 flow + UI conditions).
    // Just toggle the display to show original room photo.
    setOriginalRoomPhotoUrl(dataUrl);
    setShowOriginalRoomPhoto(true);
    setShowModifications(false);
  };

  const handleCustomModification = async () => {
    if (!customModificationText.trim() || !selectedImage) return;
    
    // Create a temporary modification object for custom text
    const customMod: ModificationOption = {
      id: 'custom_text',
      label: { pl: customModificationText.trim(), en: customModificationText.trim() },
      icon: null,
      category: 'micro' // Use 'micro' parameters for better fidelity to original
    };

    const currentStyle = selectedImage?.parameters?.style || 'modern';
    
    // Construct prompt with system instruction to preserve room structure
    const modificationPrompt = `SYSTEM INSTRUCTION: Image-to-image modification. KEEP: walls, windows, doors, furniture layout, camera angle - IDENTICAL. CHANGE: ${customModificationText.trim()}. Apply this change while maintaining exact furniture positions and room structure where possible. Make sure the change looks natural in ${currentStyle} style.`;

    await handleModification(customMod, modificationPrompt);
    
    // Clear input after submission
    setCustomModificationText('');
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
      warmer_colors: `SYSTEM INSTRUCTION: Image-to-image color modification. KEEP: walls, windows, doors, furniture, layout, camera angle - IDENTICAL. CHANGE: REPAINT color palette to warm beige, cream, and golden tones throughout this ${currentStyle} interior. Apply warm colors to walls, furniture upholstery, and accessories while maintaining exact furniture positions and room structure.`,
      cooler_colors: `SYSTEM INSTRUCTION: Image-to-image color modification. KEEP: walls, windows, doors, furniture, layout, camera angle - IDENTICAL. CHANGE: REPAINT color palette to cool blue-gray, silver, and icy tones throughout this ${currentStyle} interior. Apply cool colors to walls, furniture upholstery, and accessories while maintaining exact furniture positions and room structure.`, 
      more_lighting: `SYSTEM INSTRUCTION: Image-to-image lighting enhancement. KEEP: walls, windows, doors, furniture, layout, camera angle - IDENTICAL. CHANGE: ADD more lamps, chandeliers, and brighter lighting fixtures. Enhance natural light through windows. Increase overall brightness and add warm ambient lighting while maintaining exact furniture positions and room structure.`,
      darker_mood: `SYSTEM INSTRUCTION: Image-to-image mood modification. KEEP: walls, windows, doors, furniture, layout, camera angle - IDENTICAL. CHANGE: Create darker, more intimate mood with dim lighting and deeper shadows. Reduce overall brightness, add dramatic shadows, and adjust lighting to create cozy atmosphere while maintaining exact furniture positions and room structure.`,
      natural_materials: `SYSTEM INSTRUCTION: Image-to-image material replacement. KEEP: walls, windows, doors, furniture layout, camera angle - IDENTICAL. CHANGE: REPAINT materials to natural wood, stone, and organic textures. Replace synthetic materials with natural ones (wood furniture, stone surfaces, organic fabrics) while maintaining exact furniture positions and room structure.`,
      more_plants: `SYSTEM INSTRUCTION: Image-to-image plant addition. KEEP: walls, windows, doors, furniture, layout, camera angle - IDENTICAL. CHANGE: ADD potted plants, hanging greenery, and natural elements throughout this ${currentStyle} interior. Place plants strategically around furniture and in empty spaces while maintaining exact furniture positions and room structure.`,
      less_plants: `SYSTEM INSTRUCTION: Image-to-image plant removal. KEEP: walls, windows, doors, furniture, layout, camera angle - IDENTICAL. CHANGE: ERASE all plants, flowers, and greenery. Remove all botanical elements and inpaint the surfaces behind them seamlessly while maintaining exact furniture positions and room structure.`,
      change_furniture: `SYSTEM INSTRUCTION: Image-to-image furniture replacement. KEEP: walls, windows, doors, floor, ceiling, lighting, decorations, camera angle, room layout - IDENTICAL. CHANGE: REPLACE all furniture with new furniture pieces that perfectly match the ${currentStyle} style. The new furniture must be stylistically appropriate, harmonize with the existing color palette and materials, maintain similar scale and proportions, and be placed in the same positions. Only furniture changes - everything else remains exactly the same.`,
      add_decorations: `SYSTEM INSTRUCTION: Image-to-image decoration addition. KEEP: walls, windows, doors, furniture, layout, camera angle - IDENTICAL. CHANGE: ADD artwork, decorative accessories, and styling elements to this ${currentStyle} interior. Place decorative items on walls, surfaces, and shelves while maintaining exact furniture positions and room structure.`,
      change_flooring: `SYSTEM INSTRUCTION: Image-to-image floor modification. KEEP: walls, windows, doors, furniture, layout, camera angle - IDENTICAL. CHANGE: REPAINT floor material to different texture or pattern. Replace existing flooring with new material (wood, tile, carpet, etc.) while keeping everything else exactly the same. Maintain exact furniture positions and room structure.`
    };
    
    return microPrompts[modification.id as keyof typeof microPrompts] || `${t(modification.label)} in ${currentStyle} style`;
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
        
        // Show feedback based on rating
        if (value === 1) {
          setFeedbackMessage(t({ pl: "Rozumiem, to zupełnie inne pomieszczenie. Spróbujmy zmodyfikować obraz aby był bliższy Twojemu wnętrzu.", en: "I understand, this is a completely different room. Let's try to modify the image to be closer to your interior." }));
          setFeedbackType('negative');
        } else if (value === 3) {
          setFeedbackMessage(t({ pl: "Świetnie! Widzę podobieństwa. Możemy to jeszcze dopracować.", en: "Great! I see similarities. We can still refine this." }));
          setFeedbackType('neutral');
        } else if (value === 5) {
          setFeedbackMessage("Doskonale! Udało nam się odtworzyć Twoje wnętrze. Teraz oceń szczegóły.");
          setFeedbackType('positive');
        }
        
        // Auto-hide feedback after 5 seconds
        setTimeout(() => setFeedbackMessage(null), 5000);
      }
      
      if (rating !== 'is_my_interior') {
        const allRatingsComplete = updatedRatings.aesthetic_match > 0;
        
        if (allRatingsComplete) {
          setHasCompletedRatings(true);
          
          // Calculate rating for feedback
          const avgRating = updatedRatings.aesthetic_match;
          
          if (avgRating >= 6) {
            setFeedbackMessage(t({ pl: "Świetny wybór! Ten obraz ma doskonałe oceny. Możesz go zapisać lub spróbować drobnych modyfikacji.", en: "Great choice! This image has excellent ratings. You can save it or try minor modifications." }));
            setFeedbackType('positive');
          } else if (avgRating >= 4) {
            setFeedbackMessage(t({ pl: "Dobra ocena! Możemy jeszcze popracować nad szczegółami.", en: "Good rating! We can still work on the details." }));
            setFeedbackType('neutral');
          } else {
            setFeedbackMessage(t({ pl: "Rozumiem, spróbujmy czegoś innego. Wybierz modyfikację makro dla zupełnie nowego kierunku.", en: "I understand, let's try something else. Choose a macro modification for a completely new direction." }));
            setFeedbackType('negative');
          }
          
          setTimeout(() => setFeedbackMessage(null), 5000);
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

    // ratings history event
    try {
      const projectId = await getOrCreateProjectId((sessionData as any).userHash);
      if (projectId) {
        await saveImageRatingEvent(projectId, { local_image_id: imageId, rating_key: rating, value });
      }
    } catch {}
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
    const hasAllRatings = image.ratings.aesthetic_match > 0;
    
    setHasAnsweredInteriorQuestion(hasInteriorRating);
    setHasCompletedRatings(hasAllRatings);
  };

  const handleContinue = () => {
    stopAllDialogueAudio();
    router.push('/flow/survey1');
  };

  return (
    <div className="min-h-screen flex flex-col w-full relative">
      
      <div className="absolute inset-0 bg-gradient-radial from-pearl-50 via-platinum-50 to-silver-100 -z-10" />
      {/* Ensure navigation is always accessible - no blocking overlays */}
      <div className="flex-1 px-8 pb-8 pt-2 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="space-y-4"
        >
          {/* Only show LoadingProgress if NOT in matrix mode (when placeholders are visible) */}
          {/* Hide LoadingProgress completely when in matrix mode - placeholders show progress instead */}
          {(isLoading || !isApiReady) && !isMatrixMode && (
            <div className="flex items-center justify-center py-12">
              <LoadingProgress
                currentStage={loadingStage}
                message={t(statusMessage)}
                progress={loadingProgress}
                estimatedTimeRemaining={estimatedTime}
                onCancel={isLoading ? () => {
                  setError("Generowanie anulowane przez użytkownika");
                  setLoadingProgress(0);
                } : undefined}
              />
            </div>
          )}

          {error && (
            <GlassCard className="p-6 border-red-200">
              <div className="text-center text-red-600">
                <p className="font-semibold">Wystąpił błąd podczas generowania</p>
                <p className="text-sm mt-2">{error}</p>
                <GlassButton onClick={() => { 
                  setError(null); // Clear error first
                  if (lastFailedModification) {
                    // Retry the failed modification
                    console.log('[Retry] Retrying last failed modification:', lastFailedModification.label);
                    void handleModification(lastFailedModification);
                  } else {
                    // Retry initial generation
                    setRegenerateCount(prev => prev + 1);
                    void handleInitialGeneration(true);
                  }
                }} className="mt-4 whitespace-normal break-words">
                  Spróbuj ponownie
                </GlassButton>
              </div>
            </GlassCard>
          )}

          {/* 6-Image Matrix with Loading Placeholders */}
          {/* Show grid if: matrix mode enabled OR generation in progress OR we have images */}
          {(isMatrixMode || isGenerating || matrixImages.length > 0) && !blindSelectionMade && (
            <div className="space-y-8">
              {/*
                If some sources are skipped due to insufficient data (e.g. no inspirations),
                we should require completeness only for the sources that actually generate.
              */}
              {(() => {
                const targetCount = synthesisResult?.generatedSources?.length || 6;
                const readyCount = matrixImages.filter(img => img.provider === 'google').length;
                const isCompleteForGeneratedSources =
                  !!synthesisResult?.generatedSources &&
                  synthesisResult.generatedSources.every(src =>
                    matrixImages.some(img => img.provider === 'google' && img.source === src)
                  );
                // Expose as locals via closure-returned null; used below via duplicated expressions to avoid refactor.
                return null;
              })()}
              {/* Header */}
              <div className="text-center">
                <h2 className="text-2xl font-bold text-graphite mb-2">
                  {isGenerating
                    ? 'Generowanie wizji...'
                    : `Porównaj wizje (${matrixImages.length}/${synthesisResult?.generatedSources?.length || 6})`}
                </h2>
                <p className="text-silver-dark text-sm">
                  {isGenerating 
                    ? 'Twoje wizje są generowane przez AI. Obrazy pojawią się poniżej gdy będą gotowe.'
                    : 'Wybierz wizję, która najbardziej Ci odpowiada'}
                </p>

                {/* (removed) explicit regeneration button */}
              </div>
              
              <div className="space-y-3">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-w-5xl mx-auto">
                  {/* Generate slots for the sources that actually generate */}
                  {Array.from({ length: synthesisResult?.displayOrder?.length || 6 }).map((_, index) => {
                  const expectedSource = synthesisResult?.displayOrder[index] || null;
                  // Only show Google images
                  const image = matrixImages.find(img => img.source === expectedSource && img.provider === 'google');
                  // Always show loading skeleton when there is no image (unless error)
                  const slotIsLoading = !image && !error;
                  const offset = progressOffsets[expectedSource || ''] ?? index * 3000;
                  const elapsedForFallback = Math.max(0, Date.now() - ((matrixGenerationStartTime || Date.now()) + offset));
                  const pendingSources = synthesisResult?.displayOrder.filter(src => !matrixImages.some(img => img.source === src && img.provider === 'google')) || [];
                  const activeSource = pendingSources[0];
                  const qualityInfo = synthesisResult?.qualityReports?.find(r => r.source === expectedSource);
                  const statusColor = qualityInfo?.status === 'insufficient'
                    ? 'text-red-400'
                    : qualityInfo?.status === 'limited'
                      ? 'text-amber-400'
                      : 'text-green-400';
                  const statusText = qualityInfo?.status === 'insufficient'
                    ? 'Brak danych'
                    : qualityInfo?.status === 'limited'
                      ? 'Niewystarczające dane'
                      : 'Gotowe';
                  const fallbackProgress = (() => {
                    const t = Math.max(0, Math.min(1, elapsedForFallback / 90000));
                    const eased = 1 - Math.pow(1 - t, 4);
                    const base = Math.min(60, Math.round(2 + eased * 58));
                    return expectedSource && activeSource === expectedSource
                      ? Math.min(60, Math.round(base * 1.2)) // active slot slightly faster
                      : base;
                  })();
                  const progressValue = expectedSource && imageProgress[`google-${expectedSource}`] !== undefined 
                    ? Math.round(imageProgress[`google-${expectedSource}`])
                    : fallbackProgress;
                  const sourceLabel = expectedSource ? GENERATION_SOURCE_LABELS[expectedSource]?.pl : `Wizja ${index + 1}`;
                  
                  return (
                    <motion.div
                      key={expectedSource || `placeholder-${index}`}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.3, delay: index * 0.1 }}
                      className="relative"
                    >
                      {/* No GlassCard wrapper - image fills the entire placeholder */}
                      <div className="relative aspect-square w-full rounded-lg overflow-hidden group">
                        {slotIsLoading ? (
                          /* Loading Skeleton - Futuristic transparent glass style */
                          <div className="relative aspect-square w-full rounded-lg overflow-hidden bg-white/5 backdrop-blur-sm border border-white/10">
                            {/* Animated gradient shimmer */}
                            <motion.div 
                              className="absolute inset-0 bg-gradient-to-r from-transparent via-gold/20 to-transparent"
                              animate={{ 
                                x: ['-100%', '200%'],
                                opacity: [0.3, 0.6, 0.3]
                              }}
                              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                              style={{ width: '50%', height: '100%' }}
                            />
                            
                            {/* Pulsing grid pattern overlay */}
                            <div className="absolute inset-0 opacity-10">
                              <div className="absolute inset-0" style={{
                                backgroundImage: `linear-gradient(rgba(255,215,0,0.1) 1px, transparent 1px),
                                                  linear-gradient(90deg, rgba(255,215,0,0.1) 1px, transparent 1px)`,
                                backgroundSize: '20px 20px'
                              }} />
                            </div>
                            
                            {/* Futuristic loading indicator */}
                            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                              {/* Animated ring loader with particles */}
                              <div className="relative w-14 h-14">
                                {/* Outer rotating ring */}
                                <motion.div
                                  className="absolute inset-0 border-2 border-gold/40 rounded-full"
                                  animate={{ rotate: 360 }}
                                  transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                                />
                                {/* Inner pulsing ring */}
                                <motion.div
                                  className="absolute inset-2 border-2 border-gold rounded-full"
                                  animate={{ 
                                    scale: [1, 1.2, 1],
                                    opacity: [0.6, 1, 0.6]
                                  }}
                                  transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                                />
                                {/* Center dot */}
                                <motion.div
                                  className="absolute top-1/2 left-1/2 w-2 h-2 bg-gold rounded-full -translate-x-1/2 -translate-y-1/2"
                                  animate={{ 
                                    scale: [1, 1.5, 1],
                                    opacity: [0.8, 1, 0.8]
                                  }}
                                  transition={{ duration: 1, repeat: Infinity, ease: "easeInOut" }}
                                />
                                {/* Orbiting particles - 3 particles at 120° intervals */}
                                {[0, 1, 2].map((i) => {
                                  const angle = (i * 120) * (Math.PI / 180); // 120 degrees apart
                                  const radius = 20;
                                  return (
                                    <motion.div
                                      key={i}
                                      className="absolute w-1.5 h-1.5 bg-champagne rounded-full"
                                      style={{
                                        top: '50%',
                                        left: '50%',
                                        transformOrigin: '0 0',
                                      }}
                                      animate={{
                                        rotate: [0, 360],
                                        x: [0, Math.cos(angle) * radius],
                                        y: [0, Math.sin(angle) * radius],
                                      }}
                                      transition={{
                                        duration: 2,
                                        repeat: Infinity,
                                        ease: "linear",
                                        delay: i * 0.3,
                                      }}
                                    />
                                  );
                                })}
                              </div>
                              
                              {/* Progress percentage with glow effect */}
                              <div className="text-center">
                                <motion.p 
                                  className="text-gold font-bold text-xl drop-shadow-[0_0_8px_rgba(255,215,0,0.5)]"
                                  animate={{ opacity: [0.8, 1, 0.8] }}
                                  transition={{ duration: 1.5, repeat: Infinity }}
                                >
                                  {`${Math.max(2, progressValue)}%`}
                                </motion.p>
                                <p className="text-white/70 text-xs mt-1 font-medium">Generowanie...</p>
                              </div>
                            </div>

                            {/* Inline quality info for this source while waiting */}
                            {qualityInfo && (
                              <div className="absolute bottom-2 left-2 right-2">
                                <div className="px-2.5 py-1.5 bg-white/15 backdrop-blur-md rounded-lg border border-white/15 text-[11px] leading-tight text-white/80 space-y-0.5 max-h-[120px] overflow-y-auto">
                                  <div className="flex justify-between gap-2">
                                    <span className="font-semibold text-white/90">Dane: {sourceLabel}</span>
                                    <span className={`font-semibold ${statusColor}`}>{statusText}</span>
                                  </div>
                                  {qualityInfo.confidence !== undefined && qualityInfo.confidence !== null && (
                                    <div className="flex justify-between gap-2">
                                      <span>Pewność</span>
                                      <span className="font-semibold text-white/90">{qualityInfo.confidence}%</span>
                                    </div>
                                  )}
                                  {qualityInfo.dataPoints !== undefined && qualityInfo.dataPoints !== null && (
                                    <div className="flex justify-between gap-2">
                                      <span>Punkty danych</span>
                                      <span className="font-semibold text-white/90">{qualityInfo.dataPoints}</span>
                                    </div>
                                  )}
                                  {qualityInfo.warnings && qualityInfo.warnings.length > 0 && qualityInfo.status !== 'sufficient' && (
                                    <div className="mt-1 pt-1 border-t border-white/10">
                                      <div className="text-[10px] text-white/70 space-y-0.5">
                                        {qualityInfo.warnings.map((warning, idx) => (
                                          <div key={idx} className="leading-relaxed">
                                            {warning}
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                            
                          </div>
                        ) : image ? (
                          /* Generated Image - No border, fills entire space */
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.5 }}
                            className={`relative aspect-square w-full rounded-lg overflow-hidden cursor-pointer hover:scale-[1.02] transition-transform ${
                              selectedImage?.id === image.id 
                                ? 'ring-2 ring-gold ring-offset-2 ring-offset-transparent shadow-xl' 
                                : ''
                            }`}
                            onClick={() => setSelectedImage(image)}
                          >
                            <Image
                              src={image.url}
                              alt={sourceLabel}
                              fill
                              className="object-cover"
                              priority={index < 2}
                            />
                            
                            {/* Hover overlay */}
                            <div className="absolute inset-0 bg-gold/0 group-hover:bg-gold/10 transition-colors" />
                            
                            {/* Selection indicator */}
                            {selectedImage?.id === image.id && !isUpscaling && (
                              <div className="absolute top-2 right-2">
                                <div className="w-6 h-6 bg-gold rounded-full flex items-center justify-center">
                                  <CheckCircle2 size={16} className="text-white" />
                                </div>
                              </div>
                            )}
                            
                            {/* Upscaling overlay */}
                            {isUpscaling && selectedImage?.id === image.id && (
                              <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center gap-3">
                                <RefreshCw size={32} className="animate-spin text-gold" />
                                <div className="text-center">
                                  <p className="text-white font-semibold text-sm">Przetwarzanie...</p>
                                  <p className="text-gold/80 text-xs mt-1">Zwiększanie rozdzielczości</p>
                                </div>
                              </div>
                            )}
                          </motion.div>
                        ) : (
                          /* Fallback: keep showing loader instead of "Brak wizji" */
                          <div className="relative aspect-square w-full rounded-lg overflow-hidden bg-white/5 backdrop-blur-sm border border-white/10" />
                        )}
                      </div>
                    </motion.div>
                  );
                })}
                </div>
              </div>

              {/* Selected Image Info - Show when image is selected */}
              {selectedImage && (
                <GlassCard className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-gold/10 rounded-lg">
                      <Eye size={20} className="text-gold" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-graphite">
                        Wybrana wizja: {GENERATION_SOURCE_LABELS[selectedImage.source!]?.pl}
                      </h3>
                      <p className="text-sm text-silver-dark mt-1">
                        {selectedImage.source === GenerationSource.Implicit && 
                          "Wygenerowane na podstawie Twoich intuicyjnych wyborów z Tindera i inspiracji."}
                        {selectedImage.source === GenerationSource.Explicit && 
                          "Wygenerowane na podstawie Twoich świadomych deklaracji preferencji."}
                        {selectedImage.source === GenerationSource.Personality && 
                          "Wygenerowane na podstawie Twojego profilu osobowości Big Five."}
                        {selectedImage.source === GenerationSource.Mixed && 
                          "Mix wszystkich danych estetycznych (40% implicit, 30% explicit, 30% personality)."}
                        {selectedImage.source === GenerationSource.MixedFunctional && 
                          "Pełny mix + dane funkcjonalne (aktywności, problemy, nastrój PRS)."}
                        {selectedImage.source === GenerationSource.InspirationReference && 
                          "Multi-reference z polubionych inspiracji - style i kolory z obrazów referencyjnych."}
                      </p>
                    </div>
                  </div>
                </GlassCard>
              )}
              
              {/* Select Button - Allow when all generated sources are ready (may be <6 if some sources are skipped) */}
              {(() => {
                const targetCount = synthesisResult?.generatedSources?.length || 6;
                const isCompleteForGeneratedSources =
                  !!synthesisResult?.generatedSources &&
                  synthesisResult.generatedSources.every(src =>
                    matrixImages.some(img => img.provider === 'google' && img.source === src)
                  );
                const readyCount = matrixImages.filter(img => img.provider === 'google').length;
                return readyCount >= targetCount && isCompleteForGeneratedSources && !isGenerating;
              })() && (
                <div className="flex justify-center">
                  <GlassButton
                    onClick={() => {
                      if (selectedImage && !isUpscaling) {
                        handleBlindSelection(selectedImage);
                      }
                    }}
                    disabled={!selectedImage || isUpscaling}
                    className="px-8 py-3 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed whitespace-normal break-words"
                  >
                    {isUpscaling ? (
                      <>
                        <RefreshCw size={20} className="animate-spin" />
                        <span>{t({ pl: "Przetwarzanie wybranej wizji...", en: "Processing selected vision..." })}</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 size={20} />
                        <span>{t({ pl: "Wybieram tę wizję", en: "I choose this vision" })}</span>
                      </>
                    )}
                  </GlassButton>
                </div>
              )}
              
              {/* Upscaling feedback */}
              {isUpscaling && selectedImage && (
                <GlassCard className="p-4">
                  <div className="flex items-center gap-3">
                    <RefreshCw size={24} className="animate-spin text-gold" />
                    <div>
                      <p className="font-semibold text-graphite">{t({ pl: "Przetwarzanie wybranej wizji...", en: "Processing selected vision..." })}</p>
                      <p className="text-sm text-silver-dark">{t({ pl: "Zwiększanie rozdzielczości do pełnej jakości", en: "Increasing resolution to full quality" })}</p>
                    </div>
                  </div>
                </GlassCard>
              )}
            </div>
          )}

          {/* 6-Image Matrix: After Selection - Reveal View */}
          {isMatrixMode && blindSelectionMade && selectedImage && (
            <div className="space-y-6">
              {/* Selected Image - Main Display */}
              <GlassCard className="p-4">
                <div className="space-y-4">
                  <div className="relative aspect-[4/3] rounded-lg overflow-hidden">
                    <Image 
                      src={(showOriginalRoomPhoto && originalRoomPhotoUrl) ? originalRoomPhotoUrl : selectedImage.url} 
                      alt={showOriginalRoomPhoto ? t({ pl: "Oryginalne zdjęcie pokoju", en: "Original room photo" }) : t({ pl: "Wybrane wnętrze", en: "Selected interior" })} 
                      fill 
                      className="object-cover" 
                    />
                    {/* Loading Overlay for Modifications */}
                    <AnimatePresence>
                      {isModifying && blindSelectionMade && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-10"
                        >
                          <div className="text-center space-y-4 px-6">
                            {/* Stage indicator */}
                            <div className="flex justify-center items-center gap-3">
                              {[1, 2, 3].map((stage) => {
                                const isActive = stage === loadingStage;
                                const isCompleted = stage < loadingStage;
                                
                                return (
                                  <div key={stage} className="flex items-center">
                                    <motion.div
                                      animate={{
                                        scale: isActive ? [1, 1.1, 1] : 1,
                                      }}
                                      transition={{
                                        duration: 1.5,
                                        repeat: isActive ? Infinity : 0,
                                      }}
                                      className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                        isCompleted 
                                          ? 'bg-gradient-to-r from-gold-500 to-gold-600' 
                                          : isActive
                                          ? 'bg-gradient-to-r from-gold-500/20 to-champagne/20'
                                          : 'bg-white/10'
                                      }`}
                                    >
                                      {isCompleted && <CheckCircle size={20} className="text-white" />}
                                      {isActive && stage === 1 && <Wand2 size={20} className="text-white" />}
                                      {isActive && stage === 2 && <Sparkles size={20} className="text-white" />}
                                      {isActive && stage === 3 && <CheckCircle size={20} className="text-white" />}
                                      {!isActive && !isCompleted && <div className="w-4 h-4 rounded-full bg-white/40" />}
                                    </motion.div>
                                    
                                    {stage < 3 && (
                                      <div className={`w-12 h-1 mx-2 rounded-full ${
                                        isCompleted ? 'bg-gold-500' : 'bg-white/20'
                                      }`} />
                                    )}
                                  </div>
                                );
                              })}
                            </div>

                            {/* Message */}
                            <motion.p
                              key={`${statusMessage.pl}-${statusMessage.en}`}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="text-white font-modern text-lg font-semibold"
                            >
                              {t(statusMessage)}
                            </motion.p>

                            {/* Progress bar */}
                            <div className="relative w-64 h-2 bg-white/20 rounded-full overflow-hidden mx-auto">
                              <motion.div
                                className="absolute inset-y-0 left-0 bg-gradient-to-r from-gold-400 to-champagne rounded-full"
                                initial={{ width: 0 }}
                                animate={{ width: `${loadingProgress}%` }}
                                transition={{ duration: 0.5 }}
                              />
                              
                              {/* Animated shimmer effect */}
                              <motion.div
                                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                                animate={{
                                  x: ['-100%', '200%'],
                                }}
                                transition={{
                                  duration: 2,
                                  repeat: Infinity,
                                  ease: "linear",
                                }}
                                style={{ width: '50%' }}
                              />
                            </div>

                            {/* Progress percentage */}
                            <div className="flex justify-center items-center gap-4 text-sm text-white/90">
                              <span className="font-modern">{Math.round(loadingProgress)}%</span>
                              {estimatedTime !== undefined && estimatedTime > 0 && (
                                <span className="font-modern">
                                  {t({ pl: `~${estimatedTime}s pozostało`, en: `~${estimatedTime}s remaining` })}
                                </span>
                              )}
                            </div>

                            {/* Particles animation */}
                            <div className="flex justify-center gap-2">
                              {[...Array(5)].map((_, i) => (
                                <motion.div
                                  key={i}
                                  animate={{
                                    y: [0, -8, 0],
                                    opacity: [0.3, 1, 0.3],
                                  }}
                                  transition={{
                                    duration: 1.5,
                                    repeat: Infinity,
                                    delay: i * 0.2,
                                  }}
                                  className="w-2 h-2 rounded-full bg-gold-500"
                                />
                              ))}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                    <div className="absolute top-4 left-4">
                      <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.3 }}
                        className="flex items-center gap-2 px-3 py-1.5 bg-gold/90 backdrop-blur-sm rounded-full"
                      >
                        <CheckCircle2 size={16} className="text-white" />
                        <span className="text-sm font-medium text-white">{t({ pl: "Twój wybór", en: "Your choice" })}</span>
                      </motion.div>
                    </div>
                    <button
                      onClick={() => handleFavorite(selectedImage.id)}
                      className={`absolute top-4 right-4 p-2 rounded-full backdrop-blur transition-all ${
                        selectedImage.isFavorite ? 'bg-red-100 text-red-500' : 'bg-white/20 text-white hover:bg-white/30'
                      }`}
                    >
                      <Heart size={20} fill={selectedImage.isFavorite ? 'currentColor' : 'none'} />
                    </button>
                    {/* Upscale button - only show if not already upscaled and not from matrix (since matrix is now high quality) */}
                    {!upscaledImage && !blindSelectionMade && selectedImage.parameters?.mode !== 'upscale' && (
                      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
                        <GlassButton
                          onClick={() => handleUpscale(selectedImage)}
                          disabled={isUpscaling}
                          className="px-6 py-2 flex items-center gap-2 bg-gold/90 hover:bg-gold text-white whitespace-normal break-words"
                        >
                          {isUpscaling ? (
                            <>
                              <RefreshCw size={16} className="animate-spin" />
                              <span>{t({ pl: "Upscalowanie...", en: "Upscaling..." })}</span>
                            </>
                          ) : (
                            <>
                              <ArrowRight size={16} />
                              <span>{t({ pl: "Upscaluj do pełnej rozdzielczości", en: "Upscale to full resolution" })}</span>
                            </>
                          )}
                        </GlassButton>
                      </div>
                    )}
                  </div>
                  
                  {/* Quick Interior Question */}
                  <AnimatePresence>
                    {showSourceReveal && selectedImage && !hasAnsweredInteriorQuestion && (
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
                          <h4 className="font-semibold text-graphite text-lg">{t({ pl: "Czy to Twoje wnętrze?", en: "Is this your interior?" })}</h4>
                          <div className="border-b border-gray-200/50 pb-4 last:border-b-0">
                            <div className="flex items-center justify-between text-xs text-silver-dark mb-3 font-modern">
                              <span>{t({ pl: "To nie moje wnętrze (1)", en: "Not my interior (1)" })}</span>
                              <span>{t({ pl: "To moje wnętrze (5)", en: "My interior (5)" })}</span>
                            </div>

                            <GlassSlider
                              min={1}
                              max={5}
                              value={(selectedImage.ratings as any).is_my_interior || 3}
                              onChange={(value) => {
                                handleImageRating(selectedImage.id, 'is_my_interior', value);
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

                  {/* Second Rating Question */}
                  <AnimatePresence>
                    {hasAnsweredInteriorQuestion && !hasCompletedRatings && selectedImage?.id !== 'original-uploaded-image' && (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.8, ease: "easeInOut" }}
                        className="space-y-6"
                      >
                        <h4 className="font-semibold text-graphite text-lg">{t({ pl: "Oceń to wnętrze:", en: "Rate this interior:" })}</h4>
                        {[
                          {
                            key: 'aesthetic_match',
                            left: { pl: 'Nietrafiona', en: 'Missed' },
                            mid: { pl: 'Zgodność z gustem', en: 'Taste match' },
                            right: { pl: 'Idealna', en: 'Perfect' },
                          },
                        ].map(({ key, left, mid, right }) => (
                          <div key={key} className="border-b border-gray-200/50 pb-4 last:border-b-0">
                            <p className="text-base text-graphite font-modern leading-relaxed mb-3">
                              {t(mid)}
                            </p>

                            <div className="flex items-center justify-between text-xs text-silver-dark mb-3 font-modern">
                              <span>{t(left)} (1)</span>
                              <span>{t(right)} (7)</span>
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
              </GlassCard>
              
              {/* Modifications and History - Show after selection and after completing all questions */}
              {selectedImage && blindSelectionMade && hasCompletedRatings && (
                <>
                  {/* Modifications Button */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="flex flex-col sm:flex-row justify-center gap-2 sm:gap-3"
                  >
                    <GlassButton onClick={() => setShowModifications((m) => !m)} variant="secondary" className="w-full sm:flex-1 h-12 text-xs sm:text-sm">
                      <Settings size={16} className="mr-2 flex-shrink-0" />
                      <span className="truncate">{showModifications ? t({ pl: 'Ukryj opcje', en: 'Hide options' }) : t({ pl: 'Modyfikuj', en: 'Modify' })}</span>
                    </GlassButton>

                    <GlassButton onClick={handleRemoveFurniture} variant="secondary" className="w-full sm:flex-1 h-12 text-xs sm:text-sm">
                      <Home size={16} className="mr-2 flex-shrink-0" />
                      <span className="truncate">{t({ pl: 'Usuń meble', en: 'Remove furniture' })}</span>
                    </GlassButton>

                    <GlassButton
                      onClick={() => {
                        if (showOriginalRoomPhoto) {
                          setShowOriginalRoomPhoto(false);
                        } else {
                          handleShowOriginal();
                        }
                      }}
                      variant="secondary"
                      className="w-full sm:flex-1 h-12 text-xs sm:text-sm"
                    >
                      <Eye size={16} className="mr-2 flex-shrink-0" />
                      <span className="truncate">{showOriginalRoomPhoto ? t({ pl: 'Pokaż wybraną wizję', en: 'Show selected vision' }) : t({ pl: 'Pokaż oryginalne', en: 'Show original' })}</span>
                    </GlassButton>
                  </motion.div>

                  {/* Modifications Panel */}
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
                                {t({ pl: 'Drobne modyfikacje', en: 'Minor modifications' })}
                              </h4>
                              <p className="text-sm text-silver-dark mb-4">
                                {t({ pl: 'Subtelne zmiany w kolorach i detalach', en: 'Subtle changes in colors and details' })}
                              </p>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {MICRO_MODIFICATIONS.map((mod) => (
                                  <GlassButton
                                    key={mod.id}
                                    onClick={() => handleModification(mod)}
                                    variant="secondary"
                                    size="sm"
                                    className="justify-start text-xs sm:text-sm h-12 px-3 overflow-hidden"
                                    disabled={isLoading}
                                  >
                                    <span className="line-clamp-2 text-center w-full">{t(mod.label)}</span>
                                  </GlassButton>
                                ))}
                              </div>
                            </div>

                            <div>
                              <h4 className="font-semibold text-graphite mb-4 flex items-center text-lg">
                                <RefreshCw size={20} className="mr-3" />
                                {t({ pl: 'Zupełnie inny kierunek', en: 'Completely different direction' })}
                              </h4>
                              <p className="text-sm text-silver-dark mb-4">
                                {t({ pl: 'Zmiana całego stylu mebli i aranżacji', en: 'Change the entire style of furniture and arrangement' })}
                              </p>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {MACRO_MODIFICATIONS.map((mod) => (
                                  <GlassButton
                                    key={mod.id}
                                    onClick={() => handleModification(mod)}
                                    variant="secondary"
                                    size="sm"
                                    className="justify-start text-xs sm:text-sm h-12 px-3 overflow-hidden"
                                    disabled={isLoading}
                                  >
                                    <span className="line-clamp-2 text-center w-full">{t(mod.label)}</span>
                                  </GlassButton>
                                ))}
                              </div>
                            </div>
                          </div>
                          
                          {/* Custom Modification Section */}
                          <div className="mt-8 pt-8 border-t border-silver/30">
                            <h4 className="font-semibold text-graphite mb-4 flex items-center text-lg">
                              <MessageSquare size={20} className="mr-3 text-gold" />
                              {t({ pl: 'Własna modyfikacja', en: 'Custom modification' })}
                            </h4>
                            <p className="text-sm text-silver-dark mb-4">
                              {t({ pl: 'Opisz co dokładnie chciałbyś zmienić na obrazku', en: 'Describe exactly what you would like to change in the image' })}
                            </p>
                            <div className="flex flex-col sm:flex-row gap-3">
                              <input
                                type="text"
                                value={customModificationText}
                                onChange={(e) => setCustomModificationText(e.target.value)}
                                placeholder={t({ pl: "np. dodaj rośliny doniczkowe, zmień kolor zasłon na granatowy...", en: "e.g. add potted plants, change curtain color to navy blue..." })}
                                className="flex-1 bg-white/40 backdrop-blur-md border border-white/60 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-gold/40 placeholder:text-silver-dark/50 text-graphite transition-all hover:bg-white/50"
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' && customModificationText.trim()) {
                                    handleCustomModification();
                                  }
                                }}
                                disabled={isLoading || isGenerating}
                              />
                              <GlassButton 
                                onClick={handleCustomModification}
                                disabled={isLoading || isGenerating || !customModificationText.trim()}
                                className="px-8"
                              >
                                {t({ pl: 'Zmień', en: 'Change' })}
                              </GlassButton>
                            </div>
                          </div>
                        </GlassCard>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Generation History */}
                  {generationHistory.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.5 }}
                      className="mt-8"
                    >
                      <GenerationHistory
                        history={generationHistory}
                        currentIndex={currentHistoryIndex}
                        onNodeClick={handleHistoryNodeClick}
                      />
                    </motion.div>
                  )}
                </>
              )}

              {/* Continue Button */}
              {showSourceReveal && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1 }}
                  className="flex justify-center"
                >
                  <GlassButton
                    onClick={handleContinue}
                    className="px-8 py-3 flex items-center gap-2 whitespace-normal break-words"
                  >
                    <span>{t({ pl: "Kontynuuj", en: "Continue" })}</span>
                    <ArrowRight size={18} />
                  </GlassButton>
                </motion.div>
              )}
            </div>
          )}

          {/* Legacy single-image view (when matrix mode is off) */}
          {!isMatrixMode && generatedImages.length > 0 && (
            <>
              <div className="space-y-4">
                <GlassCard className="p-4">
                  {selectedImage && (
                    <div className="space-y-4">
                      <div className="relative aspect-[4/3] rounded-lg overflow-hidden">
                        <Image
                          src={(showOriginalRoomPhoto && originalRoomPhotoUrl) ? originalRoomPhotoUrl : selectedImage.url}
                          alt="Generated interior"
                          fill
                          sizes="100vw"
                          className="object-cover"
                        />

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
                        {/* Feedback Message */}
                        <AnimatePresence>
                          {feedbackMessage && (
                            <motion.div
                              initial={{ opacity: 0, scale: 0.95, y: -10 }}
                              animate={{ opacity: 1, scale: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.95, y: -10 }}
                              transition={{ duration: 0.3 }}
                            >
                              <GlassCard className={`p-4 ${
                                feedbackType === 'positive' 
                                  ? 'bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-green-400/30'
                                  : feedbackType === 'negative'
                                  ? 'bg-gradient-to-r from-orange-500/10 to-red-500/10 border-orange-400/30'
                                  : 'bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border-blue-400/30'
                              }`}>
                                <div className="flex items-center gap-3">
                                  <div className={`w-2 h-2 rounded-full ${
                                    feedbackType === 'positive' 
                                      ? 'bg-green-400' 
                                      : feedbackType === 'negative'
                                      ? 'bg-orange-400'
                                      : 'bg-blue-400'
                                  } animate-pulse`} />
                                  <p className="text-gray-800 font-modern text-sm">
                                    {feedbackMessage}
                                  </p>
                                </div>
                              </GlassCard>
                            </motion.div>
                          )}
                        </AnimatePresence>


                        <AnimatePresence>
                          {!hasAnsweredInteriorQuestion && (
                            <motion.div
                              initial={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -20 }}
                              transition={{ duration: 0.3 }}
                            >
                              <GlassCard variant="highlighted" className="p-6">
                                <h4 className="font-semibold text-graphite mb-3 text-lg">{t({ pl: "Czy to Twoje wnętrze?", en: "Is this your interior?" })}</h4>
                                <p className="text-sm text-silver-dark mb-4">
                                  {t({ pl: "Oceń, czy wygenerowany obraz rzeczywiście przedstawia Twoje wnętrze, czy jest to zupełnie inne pomieszczenie.", en: "Rate whether the generated image actually represents your interior, or if it is a completely different room." })}
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
                                    {t({ pl: "To nie moje wnętrze", en: "Not my interior" })}
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
                                    {t({ pl: "Częściowo podobne", en: "Partially similar" })}
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
                                    {t({ pl: "To moje wnętrze", en: "My interior" })}
                                  </button>
                                </div>
                              </GlassCard>
                            </motion.div>
                          )}
                        </AnimatePresence>

                        <AnimatePresence>
                          {hasAnsweredInteriorQuestion && !hasCompletedRatings && selectedImage?.id !== 'original-uploaded-image' && (
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
                        {(hasCompletedRatings || selectedImage?.id === 'original-uploaded-image') && hasAnsweredInteriorQuestion && (
                          <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.2 }}
                            className="flex flex-col sm:flex-row justify-center gap-2 sm:gap-3"
                          >
                            <GlassButton onClick={() => setShowModifications((m) => !m)} variant="secondary" className="w-full sm:flex-1 h-12 text-xs sm:text-sm">
                              <Settings size={16} className="mr-2 flex-shrink-0" />
                              <span className="truncate">{showModifications ? t({ pl: 'Ukryj opcje', en: 'Hide options' }) : t({ pl: 'Modyfikuj', en: 'Modify' })}</span>
                            </GlassButton>

                            <GlassButton onClick={handleRemoveFurniture} variant="secondary" className="w-full sm:flex-1 h-12 text-xs sm:text-sm">
                              <Home size={16} className="mr-2 flex-shrink-0" />
                              <span className="truncate">{t({ pl: 'Usuń meble', en: 'Remove furniture' })}</span>
                            </GlassButton>

                            <GlassButton
                              onClick={() => {
                                if (showOriginalRoomPhoto) {
                                  setShowOriginalRoomPhoto(false);
                                } else {
                                  handleShowOriginal();
                                }
                              }}
                              variant="secondary"
                              className="w-full sm:flex-1 h-12 text-xs sm:text-sm"
                            >
                              <Eye size={16} className="mr-2 flex-shrink-0" />
                              <span className="truncate">{showOriginalRoomPhoto ? t({ pl: 'Pokaż wybraną wizję', en: 'Show selected vision' }) : t({ pl: 'Pokaż oryginalne', en: 'Show original' })}</span>
                            </GlassButton>

                            {/* (removed) old "Oryginalny" button that overwrote selectedImage and broke UI */}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}
                </GlassCard>
              </div>

              <AnimatePresence>
                {showModifications && hasAnsweredInteriorQuestion && (
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
                                {t(mod.label)}
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
                                {t(mod.label)}
                              </GlassButton>
                            ))}
                          </div>
                        </div>
                      </div>
                      
                      {/* Custom Modification Section */}
                      <div className="mt-8 pt-8 border-t border-silver/30">
                        <h4 className="font-semibold text-graphite mb-4 flex items-center text-lg">
                          <MessageSquare size={20} className="mr-3 text-gold" />
                          Własna modyfikacja
                        </h4>
                        <p className="text-sm text-silver-dark mb-4">
                          Opisz co dokładnie chciałbyś zmienić na obrazku
                        </p>
                        <div className="flex flex-col sm:flex-row gap-3">
                          <input
                            type="text"
                            value={customModificationText}
                            onChange={(e) => setCustomModificationText(e.target.value)}
                            placeholder="np. dodaj rośliny doniczkowe, zmień kolor zasłon na granatowy..."
                            className="flex-1 bg-white/40 backdrop-blur-md border border-white/60 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-gold/40 placeholder:text-silver-dark/50 text-graphite transition-all hover:bg-white/50"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && customModificationText.trim()) {
                                handleCustomModification();
                              }
                            }}
                            disabled={isLoading || isGenerating}
                          />
                          <GlassButton 
                            onClick={handleCustomModification}
                            disabled={isLoading || isGenerating || !customModificationText.trim()}
                            className="px-8"
                          >
                            Zmień
                          </GlassButton>
                        </div>
                      </div>
                    </GlassCard>
                  </motion.div>
                )}
              </AnimatePresence>


                <div className="flex justify-center">
                  <AnimatePresence>
                    {hasAnsweredInteriorQuestion && (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4 }}
                      >
                        <GlassButton onClick={handleContinue} className="px-8 py-4 font-semibold whitespace-normal break-words">
                          <span className="flex items-center space-x-2">
                            <span>{t({ pl: "Przejdź do Ankiety", en: "Go to Survey" })}</span>
                            <ArrowRight size={20} />
                          </span>
                        </GlassButton>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Generation History - Moved to bottom */}
                {generationHistory.length > 0 && (
                  <div className="mt-12 mb-8">
                    <GenerationHistory
                      history={generationHistory}
                      currentIndex={currentHistoryIndex}
                      onNodeClick={handleHistoryNodeClick}
                    />
                  </div>
                )}
            </>
          )}
        </motion.div>
      </div>
      
      <div className="w-full">
        <AwaDialogue 
          currentStep="generation" 
          fullWidth={true}
          autoHide={true}
          customMessage={idaComment || (isGeneratingComment ? "Analizuję wygenerowany obraz..." : undefined)}
        />
      </div>
    </div>
  );
}