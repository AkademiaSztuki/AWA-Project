'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useSessionData } from '@/hooks/useSessionData';
import { getOrCreateProjectId, saveGenerationSet, saveGeneratedImages, logBehavioralEvent, startGenerationJob, endGenerationJob, saveImageRatingEvent, startPageView, endPageView, saveGenerationFeedback, saveRegenerationEvent, safeSessionStorage } from '@/lib/supabase';
import { supabase } from '@/lib/supabase';
import { assessAllSourcesQuality, getViableSources, type DataStatus } from '@/lib/prompt-synthesis/data-quality';
import { calculateImplicitQuality } from '@/lib/prompt-synthesis/implicit-quality';
import { analyzeSourceConflict } from '@/lib/prompt-synthesis/conflict-analysis';
import { countExplicitAnswers, getRegenerationInterpretation, type GenerationFeedback, type RegenerationEvent } from '@/lib/feedback/generation-feedback';
import { useModalAPI, getGenerationParameters } from '@/hooks/useModalAPI';
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
  Eye,
  ChevronLeft,
  ChevronRight,
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
  uploadSpaceImage,
  saveSpaceImagesMetadata
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
  { id: 'textured_walls', label: 'Ściany z fakturą', icon: null, category: 'micro' },
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
  const { sessionData, updateSessionData, isInitialized: isSessionInitialized } = useSessionData();
  const { generateImages, generatePreviews, upscaleImage, generateFiveImagesParallel, generateSixImagesParallel, isLoading, error, setError, checkHealth, generateLLMComment } = useModalAPI();

  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [selectedImage, setSelectedImage] = useState<GeneratedImage | null>(null);
  const [showModifications, setShowModifications] = useState(false);
  const [generationCount, setGenerationCount] = useState(0);
  const [isApiReady, setIsApiReady] = useState(false);
  const [hasAttemptedGeneration, setHasAttemptedGeneration] = useState(false);
  const [statusMessage, setStatusMessage] = useState("Krok 1/3: Inicjalizacja środowiska AI...");
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
  const [isUpscaling, setIsUpscaling] = useState(false); // Track upscale in progress
  const [upscaledImage, setUpscaledImage] = useState<GeneratedImage | null>(null); // Store upscaled version
  const [regenerateCount, setRegenerateCount] = useState(0); // Track regeneration count
  const [lastGenerationTime, setLastGenerationTime] = useState<number>(0); // For regeneration tracking
  const [qualityReport, setQualityReport] = useState<any>(null); // Store quality report for feedback
  const [synthesisResult, setSynthesisResult] = useState<SixPromptSynthesisResult | null>(null); // Store synthesis result for skipped sources info
  const [imageProgress, setImageProgress] = useState<Record<string, number>>({}); // Track progress for each image source
  const [progressOffsets, setProgressOffsets] = useState<Record<string, number>>({}); // Per-source stagger for loading anims
  
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
      console.log("Rozpoczynam sprawdzanie gotowości API...");
      setLoadingStage(1);
      setLoadingProgress(5);
      
      for (let i = 0; i < 30; i++) {
        const progress = Math.min(30, 5 + (i * 1.5));
        setLoadingProgress(progress);
        setEstimatedTime(Math.max(5, 150 - (i * 5)));
        
        const isReady = await checkHealth();
        console.log(`[Health Check ${i + 1}] API gotowe: ${isReady}`);
        if (isReady) {
          setIsApiReady(true);
          setLoadingProgress(30);
          setStatusMessage("Krok 2/3: API gotowe. Przygotowuję dane...");
          setLoadingStage(2);
          setEstimatedTime(undefined);
          return;
        }
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
      setStatusMessage("Środowisko AI nie odpowiada. Spróbuj odświeżyć stronę.");
      setError("Nie udało się połączyć z serwerem generującym obrazy. Proszę odświeżyć stronę.");
    };
    
    waitForApi();
  }, []);

  // Track pageViewId in a ref to avoid cleanup on every change
  const pageViewIdRef = useRef<number | null>(null);
  
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

  useEffect(() => {
    if (!isSessionInitialized) {
      console.log('[Generate] Session not initialized yet, delaying auto-generation.');
      return;
    }

    if (isApiReady && generationCount === 0 && !hasAttemptedGeneration) {
      console.log('[Generate] Auto-triggering initial generation:', { isApiReady, generationCount, hasAttemptedGeneration, isMatrixMode, isSessionInitialized });
      setHasAttemptedGeneration(true);
      handleInitialGeneration();
    }
  }, [isApiReady, generationCount, hasAttemptedGeneration, isSessionInitialized]);

  // Generate IDA comment when image is selected
  useEffect(() => {
    if (selectedImage && generatedImages.length > 0 && !idaComment && !isGeneratingComment) {
      generateIdaComment();
    }
  }, [selectedImage]);

  const buildInitialPrompt = () => buildOptimizedFluxPrompt(sessionData as any);

  /**
   * Generates 6 images using different data sources for blind comparison.
   * This is the new 6-image matrix generation flow with multi-reference support.
   */
  const handleMatrixGeneration = async () => {
    console.log("[6-Image Matrix] handleMatrixGeneration called", { isApiReady, isGenerating });
    if (!isApiReady) {
      console.log("[6-Image Matrix] API not ready, generation cancelled.");
      return;
    }
    
    // Prevent duplicate generations
    if (isGenerating) {
      console.log("[6-Image Matrix] Generation already in progress, skipping.");
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
      setError("Nie można rozpocząć generowania - brak zdjęcia pokoju w sesji. Proszę wrócić do kroku uploadu zdjęcia.");
      return;
    }
    
    console.log("[6-Image Matrix] Using roomImage:", {
      hasImage: !!roomImage,
      length: roomImage?.length || 0,
      startsWith: roomImage?.substring(0, 50) || 'N/A',
      source: typedSessionData?.roomImage ? 'sessionData' : 'sessionStorage'
    });
    
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
    setStatusMessage("Przygotowuję 6 różnych wizji dla Twojego wnętrza...");
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
        setError(`Brak wystarczających danych do wygenerowania obrazów. Szczegóły: ${errorDetails}`);
        return;
      }
      
      // Step 2: Prepare prompts for parallel generation
      setLoadingProgress(45);
      setStatusMessage(`Generuję ${synthesisResult.generatedSources.length} wizji równolegle...`);
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
      
      // Use preview mode for faster initial generation (512x512, 20 steps)
      const parameters = getGenerationParameters('preview', generationCount);
      console.log('[6-Image Matrix] Preview parameters:', { 
        image_size: parameters.image_size, 
        steps: parameters.steps, 
        guidance: parameters.guidance,
        strength: parameters.strength 
      });
      
      // Log generation job
      const projectId = await getOrCreateProjectId(typedSessionData.userHash);
      let jobId: string | null = null;
      if (projectId) {
        jobId = await startGenerationJob(projectId, {
          type: 'initial', // Use 'initial' to match constraint (initial/micro/macro)
          prompt: JSON.stringify(prompts.map(p => ({ source: p.source, prompt: p.prompt.substring(0, 200) }))),
          parameters: { ...parameters, num_sources: prompts.length },
          has_base_image: true,
        });
      }
      
      // Step 3: Generate all images in parallel with progressive display
      setLoadingProgress(55);
      
      // Track completed images for progress
      let completedCount = 0;
      
      // Track progress for each image
      const startTime = Date.now();
      let progressInterval: NodeJS.Timeout | null = null;

      // Smooth, slower fallback progress curve (asymptotic to 60% over ~90s)
      const calcFallbackProgress = (elapsedMs: number) => {
        const t = Math.max(0, Math.min(1, elapsedMs / 90000)); // 0..1 over 90s
        const eased = 1 - Math.pow(1 - t, 4); // ease-out quart
        return Math.min(60, Math.round(2 + eased * 58)); // start at 2%, max 60%
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
            isBlindSelected: false
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
          setStatusMessage(`Wygenerowano ${completedCount}/${prompts.length} wizji...`);
          
          // Cleanup interval when all images are done
          if (completedCount >= prompts.length && progressInterval) {
            clearInterval(progressInterval);
            progressInterval = null;
          }
        }
      };
      
      // Use the restored roomImage from above
      const baseImageForGeneration = roomImage || typedSessionData.roomImage;
      
      // Ensure roomImage is in correct format (base64 without data URI prefix)
      let baseImage = baseImageForGeneration;
      if (baseImage) {
        // Remove data URI prefix if present
        if (baseImage.includes(',')) {
          baseImage = baseImage.split(',')[1];
        }
        console.log("[6-Image Matrix] Using roomImage (cleaned):", {
          hasImage: !!baseImage,
          length: baseImage?.length || 0,
          startsWith: baseImage?.substring(0, 50) || 'N/A',
          isBase64: baseImage && !baseImage.startsWith('http') && !baseImage.startsWith('blob:')
        });
      } else {
        console.error("[6-Image Matrix] ERROR: roomImage is missing or empty after restoration!");
        setError("Brak zdjęcia pokoju w sesji. Proszę wrócić do kroku uploadu zdjęcia.");
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
      
      const generationResponse = await generateSixImagesParallel(
        {
          prompts,
          base_image: baseImage,  // Use cleaned base64
          inspiration_images: filteredInspirationImages, // Use filtered inspiration images (no blob URLs)
          style: typedSessionData.visualDNA?.dominantStyle || 'modern',
          parameters: {
            strength: parameters.strength,
            steps: parameters.steps,
            guidance: parameters.guidance,
            image_size: parameters.image_size
          }
        },
        onImageReady,
        controller.signal
      );
      
      console.log("[6-Image Matrix] generateSixImagesParallel returned:", {
        successful_count: generationResponse?.successful_count,
        failed_count: generationResponse?.failed_count,
        results_count: generationResponse?.results?.length || 0
      });
      
      // Step 4: Process results
      setLoadingProgress(85);
      setStatusMessage("Finalizuję obrazy...");
      setEstimatedTime(10);
      
      console.log("[6-Image Matrix] Generation response:", {
        successful_count: generationResponse.successful_count,
        failed_count: generationResponse.failed_count,
        results: generationResponse.results.map(r => ({ source: r.source, success: r.success, hasImage: !!r.image }))
      });
      
      if (generationResponse.successful_count === 0) {
        setError("Wszystkie generacje zakończyły się niepowodzeniem.");
        if (jobId) await endGenerationJob(jobId, { status: 'error', latency_ms: Date.now() - matrixGenerationStartTime, error_message: 'All generations failed' });
        return;
      }
      
      // Final update: create complete list from generationResponse
      // (Images should already be in matrixImages from onImageReady callback, but this ensures completeness)
      const displayOrder = synthesisResult.displayOrder;
      const newMatrixImages: GeneratedImage[] = generationResponse.results
        .filter(r => r.success)
        .map((result, idx) => {
          const displayIndex = displayOrder.indexOf(result.source);
          const sourceLabel = GENERATION_SOURCE_LABELS[result.source];
          
          return {
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
            displayIndex: displayIndex >= 0 ? displayIndex : idx,
            isBlindSelected: false
          };
        });
      
      // Sort by display index for blind comparison
      newMatrixImages.sort((a, b) => (a.displayIndex || 0) - (b.displayIndex || 0));
      
      console.log("[6-Image Matrix] Final images to display:", newMatrixImages.length, newMatrixImages.map(i => ({ source: i.source, displayIndex: i.displayIndex, hasUrl: !!i.url })));
      
      if (newMatrixImages.length === 0) {
        console.error("[6-Image Matrix] ERROR: No images to display!");
        setError("Nie udało się wygenerować żadnych obrazów.");
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
      setStatusMessage("Gotowe! Wybierz swoje ulubione wnętrze.");
      
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
          const uploaded: Array<{ url: string; thumbnail_url?: string; type: 'generated' | 'inspiration'; is_favorite?: boolean; source?: string; generation_set_id?: string }> = [];
        for (const img of newMatrixImages) {
            const uploadedResult = await uploadSpaceImage(userHash, spaceId, img.id, img.url);
            const finalUrl = uploadedResult?.publicUrl || img.url;
            uploaded.push({
              url: finalUrl,
              type: 'generated',
              is_favorite: img.isFavorite || false,
              source: img.source
            });
          }
          await saveSpaceImagesMetadata(userHash, spaceId, uploaded);

          // Keep local minimal spaces snapshot
          updatedSpaces = addGeneratedImageToSpace(
            (typedSessionData?.spaces || []),
            spaceId,
            uploaded[0]?.url || newMatrixImages[0].url
          );
          await updateSessionData({ spaces: updatedSpaces, currentSpaceId: spaceId } as any);
        }
        
        // Save spaces to Supabase for persistence across sessions
        // This ensures data is available after logout/login
        try {
          const userHash = (sessionData as any).userHash;
          if (userHash && updatedSpaces.length > 0) {
            // Store spaces in user profile metadata or as a separate table
            // For now, we'll ensure localStorage is synced and Supabase RPC can access it
            // The get_user_complete_profile RPC should return spaces from user_profiles.metadata or a spaces table
            console.log('[Generate] Spaces saved locally, syncing to Supabase...');
            
            // Try to save to user profile metadata
            const { ensureUserProfileExists } = await import('@/lib/supabase-deep-personalization');
            const profileExists = await ensureUserProfileExists(userHash);
            if (profileExists) {
              // Update user profile with spaces metadata
              const { data, error } = await supabase
                .from('user_profiles')
                .update({
                  metadata: {
                    spaces: updatedSpaces,
                    last_updated: new Date().toISOString()
                  }
                })
                .eq('user_hash', userHash);
              
              if (error) {
                console.warn('[Generate] Failed to save spaces to user profile:', error);
              } else {
                console.log('[Generate] Spaces saved to Supabase user profile');
              }
            }
          }
        } catch (e) {
          console.warn('[Generate] Failed to save spaces to Supabase:', e);
          // Non-critical - spaces are saved locally and will be available in localStorage
        }
        
        if (projectId && jobId) {
          const totalTime = Date.now() - matrixGenerationStartTime;
          await endGenerationJob(jobId, { 
            status: 'success', 
            latency_ms: totalTime
          });
          
          // Save each generated image to Supabase
          for (const img of newMatrixImages) {
            const genSet = await saveGenerationSet(projectId, img.prompt);
            if (genSet?.id) {
              await saveGeneratedImages(genSet.id, [{ 
                url: img.url, 
                prompt: img.prompt,
                parameters: { source: img.source }
              }]);
            }
          }
          
          await logBehavioralEvent(projectId, 'matrix_generation_complete', {
            sources: newMatrixImages.map(i => i.source),
            displayOrder,
            successCount: generationResponse.successful_count,
            failedCount: generationResponse.failed_count,
            totalTime
          });
        }
      } catch (e) {
        console.warn('[6-Image Matrix] Supabase persist failed:', e);
      }
      
      console.log("[6-Image Matrix] Generation complete!", {
        imagesGenerated: newMatrixImages.length,
        displayOrder: displayOrder
      });
      
    } catch (err: any) {
      // Check if it was an abort
      if (err.name === 'AbortError' || err.message === 'Generation cancelled') {
        console.log('[6-Image Matrix] Generation was cancelled by user');
        setStatusMessage("Generacja została anulowana.");
      } else {
        console.error('[6-Image Matrix] Generation failed:', err);
        setError(err instanceof Error ? err.message : 'Wystąpił nieznany błąd podczas generacji.');
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
      
      // Get inspiration images if available
      const typedSessionData = sessionData as any;
      const inspirationImages = synthesisResult?.inspirationImages;
      
      // Upscale the image
      const upscaledBase64 = await upscaleImage(
        image.base64,
        seed,
        prompt,
        targetSize,
        inspirationImages
      );
      
      // Create upscaled image object
      const upscaled: GeneratedImage = {
        ...image,
        id: `${image.id}-upscaled`,
        url: `data:image/png;base64,${upscaledBase64}`,
        base64: upscaledBase64,
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
      setError(err.message || 'Nie udało się upscalować obrazu.');
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
    
    // Update the image as selected
    setMatrixImages(prev => prev.map(img => ({
      ...img,
      isBlindSelected: img.id === image.id
    })));
    
    // Start upscaling the selected image automatically
    setIsUpscaling(true);
    setError(null);
    
    try {
      console.log('[Upscale] Starting upscale for selected image...');
      
      // Get upscale parameters
      const upscaleParams = getGenerationParameters('upscale');
      
      // DO NOT pass inspiration images during upscaling - style is already baked into the generated image
      // Passing 6 inspiration images at 1536x1536 causes CUDA OOM (7 total images = 1 base + 6 inspiration)
      // The prompt already contains style/material cues from the inspiration analysis
      const inspirationImages = undefined;
      
      // Get seed from image parameters
      const seed = image.parameters?.seed || image.parameters?.generation_info?.seed || 42;
      const targetSize = upscaleParams.image_size || 1536; // Use upscale size (1536 for upscale mode)
      
      console.log('[Upscale] Starting upscale for selected image with params:', {
        target_size: targetSize,
        seed,
        has_inspiration_images: !!inspirationImages,
        image_id: image.id
      });
      
      // Use the dedicated upscale endpoint (not generate - this upscales the existing image)
      // Clean image base64 (remove data: prefix if present)
      let imageBase64 = image.base64;
      if (imageBase64.includes(',')) {
        imageBase64 = imageBase64.split(',')[1];
      }
      
      const upscaledBase64 = await upscaleImage(
        imageBase64,
        seed,
        image.prompt,
        targetSize,
        inspirationImages
      );
      
      // Create upscaled image object
      const upscaled: GeneratedImage = {
        ...image,
        id: `${image.id}-upscaled`,
        url: `data:image/png;base64,${upscaledBase64}`,
        base64: upscaledBase64,
        parameters: {
          ...image.parameters,
          mode: 'upscale',
          target_size: upscaleParams.image_size,
          steps: upscaleParams.steps
        }
      };
      
      setUpscaledImage(upscaled);
      setSelectedImage(upscaled); // Update selected image to upscaled version
      
      // Add upscaled image to generatedImages and history
      setGeneratedImages(prev => {
        const exists = prev.find(img => img.id === upscaled.id);
        if (exists) return prev;
        return [...prev, upscaled];
      });
      
      // Add to generation history
      const historyNode = {
        id: upscaled.id,
        type: 'initial' as const, // Upscale is treated as initial type
        label: 'Upscalowane',
        timestamp: Date.now(),
        imageUrl: upscaled.url,
      };
      setGenerationHistory(prev => {
        const exists = prev.find(h => h.id === historyNode.id);
        if (exists) return prev;
        return [...prev, historyNode];
      });
      
      console.log('[Upscale] Image upscaled successfully and added to history');
    } catch (err: any) {
      console.error('[Upscale] Error upscaling image:', err);
      setError(err.message || 'Nie udało się upscalować obrazu.');
      // Continue with original image if upscale fails
    } finally {
      setIsUpscaling(false);
    }
    
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
      setIdaComment('Świetnie! To wygenerowane wnętrze wygląda naprawdę fantastycznie!');
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
      setError("Nie można rozpocząć generowania, ponieważ w sesji brakuje zdjęcia Twojego pokoju.");
      setStatusMessage("Błąd danych wejściowych.");
      return;
    }

    setStatusMessage("Krok 3/3: Wysyłanie zadania do AI. To może potrwać kilka minut...");
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
    
    console.log("FLUX Kontext Structured Prompt:", prompt);
    console.log("FLUX Kontext Parameters:", parameters);

    try {
      const projectId = await getOrCreateProjectId((sessionData as any).userHash);
      let jobId: string | null = null;
      if (projectId) {
        jobId = await startGenerationJob(projectId, {
          type: 'initial',
          prompt,
          parameters,
          has_base_image: Boolean(typedSessionData.roomImage),
        });
      }
      
      // Update progress during generation
      setLoadingProgress(50);
      setStatusMessage("Generowanie w toku...");
      setEstimatedTime(45);
      
      const response = await generateImages({
        prompt,
        base_image: typedSessionData.roomImage,
        style: typedSessionData.visualDNA?.dominantStyle || 'modern',
        modifications: [],
        ...parameters
      });
      
      // Generation completed
      setLoadingProgress(80);
      setLoadingStage(3);
      setStatusMessage("Finalizuję obrazy...");
      setEstimatedTime(10);

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
      
      // Save generated images to spaces (Supabase)
      const userHash = (sessionData as any)?.userHash;
      const spaceId = await getOrCreateSpaceId(userHash, {
        spaceId: (sessionData as any)?.currentSpaceId,
        name: (sessionData as any)?.roomName || 'Moja Przestrzeń'
      });

      if (spaceId) {
        const uploaded: Array<{ url: string; type: 'generated' | 'inspiration'; is_favorite?: boolean }> = [];
      for (const img of newImages) {
          const uploadedResult = await uploadSpaceImage(userHash, spaceId, img.id, img.url);
          const finalUrl = uploadedResult?.publicUrl || img.url;
          uploaded.push({
            url: finalUrl,
            type: 'generated',
            is_favorite: img.isFavorite || false
          });
        }
        await saveSpaceImagesMetadata(userHash, spaceId, uploaded);

        const updatedSpaces = addGeneratedImageToSpace(
          (sessionData as any)?.spaces || [],
          spaceId,
          uploaded[0]?.url || newImages[0].url
        );
        await updateSessionData({ spaces: updatedSpaces, currentSpaceId: spaceId });
      }
      
      // Complete loading
      setLoadingProgress(100);
      setEstimatedTime(0);
      setStatusMessage("Gotowe!");
      
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
          const genSet = await saveGenerationSet(projectIdPersist, prompt);
          if (genSet?.id) {
            await saveGeneratedImages(genSet.id, newImages.map((i) => ({ url: i.url, prompt: i.prompt })));
          }
          await logBehavioralEvent(projectIdPersist, 'generation_initial', { prompt, parameters });
        }
      } catch (e) {
        console.warn('Supabase persist failed (initial generation):', e);
      }

      // Close job with timing (approx, since we don't have precise start time here)
      try {
        if (jobId) await endGenerationJob(jobId, { status: 'success', latency_ms: 0 });
      } catch {}
    } catch (err) {
      console.error('Generation failed in handleInitialGeneration:', err);
      setError(err instanceof Error ? err.message : 'Wystąpił nieznany błąd podczas generacji.');
      try {
        const projectId = await getOrCreateProjectId((sessionData as any).userHash);
        if (projectId) {
          const jobId = await startGenerationJob(projectId, {
            type: 'initial',
            prompt: buildInitialPrompt(),
            parameters: getOptimalParameters('initial', generationCount),
            has_base_image: Boolean((sessionData as any).roomImage),
          });
          if (jobId) await endGenerationJob(jobId, { status: 'error', latency_ms: 0, error_message: String(err) });
        }
      } catch {}
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

    // Update loading state for modifications
    setLoadingStage(2);
    setLoadingProgress(40);
    setStatusMessage(`Modyfikuję obraz: ${modification.label}...`);
    setEstimatedTime(30);
    setIdaComment(null); // Reset comment for new generation

    try {
      const projectId = await getOrCreateProjectId((sessionData as any).userHash);
      let jobId: string | null = null;
      if (projectId) {
        jobId = await startGenerationJob(projectId, {
          type: isMacro ? 'macro' : 'micro',
          prompt: modificationPrompt,
          parameters,
          has_base_image: true,
          modification_label: modification.label,
        });
      }
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
      
      // Save generated images to sessionData (like inspirations)
      const generatedImagesPayload = newImages.map(img => ({
        id: img.id,
        url: img.url,
        base64: img.base64,
        prompt: img.prompt,
        parameters: img.parameters,
        createdAt: new Date(img.createdAt).toISOString(),
        isFavorite: img.isFavorite || false,
        ratings: img.ratings
      }));
      
      const currentGenerated = ((sessionData as any)?.generatedImages || []).map((g: any) => ({ id: g.id, url: g.url }));
      const lightweight = generatedImagesPayload.map(g => ({ id: g.id, url: g.url }));
      await updateSessionData({ 
        generatedImages: [...currentGenerated, ...lightweight]
      } as any);
      
      // Save generated images to spaces
      const currentSpaces = (sessionData as any)?.spaces || [];
      let updatedSpaces = currentSpaces;
      const activeSpaceId = (sessionData as any)?.currentSpaceId;
      const activeSpaceName = (sessionData as any)?.roomName;
      for (const img of newImages) {
        updatedSpaces = addGeneratedImageToSpace(
          updatedSpaces,
          activeSpaceId,
          img.url,
          activeSpaceName,
          undefined,
          undefined,
          img.isFavorite || false
        );
      }
      const sessionUpdates: any = { spaces: updatedSpaces };
      if (!activeSpaceId && updatedSpaces.length > 0) {
        sessionUpdates.currentSpaceId = updatedSpaces[updatedSpaces.length - 1].id;
      }
      await updateSessionData(sessionUpdates);
      
      // Complete modification
      setLoadingProgress(100);
      setLoadingStage(3);
      setStatusMessage("Modyfikacja zakończona!");
      setEstimatedTime(0);
      
      // Add to history
      const historyNode = {
        id: newImages[0].id,
        type: isMacro ? ('macro' as const) : ('micro' as const),
        label: modification.label,
        timestamp: Date.now(),
        imageUrl: newImages[0].url,
      };
      setGenerationHistory((prev) => [...prev, historyNode]);
      setCurrentHistoryIndex(generationHistory.length);

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

      // Persist generation modification and user choice
      try {
        const projectIdPersist = await getOrCreateProjectId((sessionData as any).userHash);
        if (projectIdPersist) {
          const genSet = await saveGenerationSet(projectIdPersist, modificationPrompt);
          if (genSet?.id) {
            await saveGeneratedImages(genSet.id, newImages.map((i) => ({ url: i.url, prompt: i.prompt })));
          }
          await logBehavioralEvent(projectIdPersist, 'generation_modification', {
            type: isMacro ? 'macro' : 'micro',
            modification: modification.label,
            parameters,
          });
        }
      } catch (e) {
        console.warn('Supabase persist failed (modification):', e);
      }

      try { if (jobId) await endGenerationJob(jobId, { status: 'success', latency_ms: 0 }); } catch {}
    } catch (err) {
      console.error('Modification failed:', err);
      setError(err instanceof Error ? err.message : 'Wystąpił nieznany błąd podczas modyfikacji.');
      try {
        const projectId = await getOrCreateProjectId((sessionData as any).userHash);
        if (projectId) {
          const jobId = await startGenerationJob(projectId, {
            type: modification.category,
            prompt: 'n/a',
            parameters: getOptimalParameters(modification.category === 'macro' ? 'macro' : 'micro', generationCount),
            has_base_image: true,
            modification_label: modification.label,
          });
          if (jobId) await endGenerationJob(jobId, { status: 'error', latency_ms: 0, error_message: String(err) });
        }
      } catch {}
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
      } as any);
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
        
        // Show feedback based on rating
        if (value === 1) {
          setFeedbackMessage("Rozumiem, to zupełnie inne pomieszczenie. Spróbujmy zmodyfikować obraz aby był bliższy Twojemu wnętrzu.");
          setFeedbackType('negative');
        } else if (value === 3) {
          setFeedbackMessage("Świetnie! Widzę podobieństwa. Możemy to jeszcze dopracować.");
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
            setFeedbackMessage("Świetny wybór! Ten obraz ma doskonałe oceny. Możesz go zapisać lub spróbować drobnych modyfikacji.");
            setFeedbackType('positive');
          } else if (avgRating >= 4) {
            setFeedbackMessage("Dobra ocena! Możemy jeszcze popracować nad szczegółami.");
            setFeedbackType('neutral');
          } else {
            setFeedbackMessage("Rozumiem, spróbujmy czegoś innego. Wybierz modyfikację makro dla zupełnie nowego kierunku.");
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
                message={statusMessage}
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
                  setRegenerateCount(prev => prev + 1);
                  void handleInitialGeneration(true); 
                }} className="mt-4 whitespace-normal break-words">
                  Spróbuj ponownie
                </GlassButton>
              </div>
            </GlassCard>
          )}

          {/* 6-Image Matrix - Grid 2x3 with Loading Placeholders */}
          {/* Show grid if: matrix mode enabled OR generation in progress OR we have images */}
          {(isMatrixMode || isGenerating || matrixImages.length > 0) && !blindSelectionMade && (
            <div className="space-y-6">
              {/* Header */}
              <div className="text-center">
                <h2 className="text-2xl font-bold text-graphite mb-2">
                  {isGenerating ? 'Generowanie wizji...' : `Porównaj wizje (${matrixImages.length}/6)`}
                </h2>
                <p className="text-silver-dark text-sm">
                  {isGenerating 
                    ? 'Twoje wizje są generowane. Obrazy pojawią się poniżej gdy będą gotowe.' 
                    : 'Wybierz wizję, która najbardziej Ci odpowiada'}
                </p>
              </div>
              
              {/* Grid 3x2 with Loading Placeholders - 3 columns for better fit */}
              <div className="grid grid-cols-3 gap-3 max-w-5xl mx-auto">
                {/* Generate 6 slots - show placeholders for missing images */}
                {Array.from({ length: 6 }).map((_, index) => {
                  const expectedSource = synthesisResult?.displayOrder[index] || null;
                  const image = matrixImages.find(img => img.source === expectedSource);
                  // Always show loading skeleton when there is no image (unless error)
                  const slotIsLoading = !image && !error;
                  const offset = progressOffsets[expectedSource || ''] ?? index * 3000;
                  const elapsedForFallback = Math.max(0, Date.now() - ((matrixGenerationStartTime || Date.now()) + offset));
                  const pendingSources = synthesisResult?.displayOrder.filter(src => !matrixImages.some(img => img.source === src)) || [];
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
                  const progressValue = expectedSource && imageProgress[expectedSource] !== undefined 
                    ? Math.round(imageProgress[expectedSource])
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
                            
                            {/* Source Label */}
                            <div className="absolute bottom-2 left-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <div className="px-3 py-1.5 bg-black/70 backdrop-blur-sm rounded-lg">
                                <p className="text-white text-xs font-medium opacity-70">Źródło danych:</p>
                                <p className="text-gold font-bold text-sm">{sourceLabel}</p>
                              </div>
                            </div>
                            
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
              
              {/* Select Button - Only show when images are ready */}
              {matrixImages.length > 0 && !isGenerating && (
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
                        <span>Przetwarzanie wybranej wizji...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 size={20} />
                        <span>Wybieram tę wizję</span>
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
                      <p className="font-semibold text-graphite">Przetwarzanie wybranej wizji...</p>
                      <p className="text-sm text-silver-dark">Zwiększanie rozdzielczości do pełnej jakości</p>
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
                      src={selectedImage.url} 
                      alt="Wybrane wnętrze" 
                      fill 
                      className="object-cover" 
                    />
                    <div className="absolute top-4 left-4">
                      <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.3 }}
                        className="flex items-center gap-2 px-3 py-1.5 bg-gold/90 backdrop-blur-sm rounded-full"
                      >
                        <CheckCircle2 size={16} className="text-white" />
                        <span className="text-sm font-medium text-white">Twój wybór</span>
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
                    {/* Upscale button - only show if not already upscaled */}
                    {!upscaledImage && selectedImage.parameters?.mode !== 'upscale' && (
                      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
                        <GlassButton
                          onClick={() => handleUpscale(selectedImage)}
                          disabled={isUpscaling}
                          className="px-6 py-2 flex items-center gap-2 bg-gold/90 hover:bg-gold text-white whitespace-normal break-words"
                        >
                          {isUpscaling ? (
                            <>
                              <RefreshCw size={16} className="animate-spin" />
                              <span>Upscalowanie...</span>
                            </>
                          ) : (
                            <>
                              <ArrowRight size={16} />
                              <span>Upscaluj do pełnej rozdzielczości</span>
                            </>
                          )}
                        </GlassButton>
                      </div>
                    )}
                    {/* Show indicator if already upscaled */}
                    {upscaledImage && (
                      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
                        <motion.div
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="px-4 py-2 bg-green-500/90 backdrop-blur-sm rounded-full flex items-center gap-2"
                        >
                          <CheckCircle2 size={16} className="text-white" />
                          <span className="text-sm font-medium text-white">Upscalowane do 1024x1024</span>
                        </motion.div>
                      </div>
                    )}
                  </div>
                  
                  {/* Quick Interior Question */}
                  <AnimatePresence>
                    {showSourceReveal && selectedImage && !hasAnsweredInteriorQuestion && (
                      <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ duration: 0.5, ease: "easeOut" }}
                      >
                        <GlassCard variant="highlighted" className="p-5">
                          <div className="space-y-4">
                            <h3 className="font-semibold text-graphite text-lg text-center mb-3">
                              Czy to moje wnętrze?
                            </h3>
                            
                            <div className="flex items-center justify-between text-xs text-silver-dark mb-3 font-modern">
                              <span>To nie moje wnętrze (1)</span>
                              <span>To moje wnętrze (5)</span>
                            </div>

                            <GlassSlider
                              min={1}
                              max={5}
                              value={(selectedImage.ratings as any).is_my_interior || 3}
                              onChange={(value) => {
                                handleImageRating(selectedImage.id, 'is_my_interior', value);
                                setHasAnsweredInteriorQuestion(true);
                              }}
                              className="mb-2"
                            />
                          </div>
                        </GlassCard>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </GlassCard>
              
              {/* Modifications and History - Show after upscale */}
              {upscaledImage && !isUpscaling && (
                <>
                  {/* Modifications Button */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="flex justify-center space-x-3"
                  >
                    <GlassButton onClick={() => setShowModifications((m) => !m)} variant="secondary" className="flex-1 h-12 text-xs sm:text-sm">
                      <Settings size={16} className="mr-2 flex-shrink-0" />
                      <span className="truncate">{showModifications ? 'Ukryj opcje' : 'Modyfikuj'}</span>
                    </GlassButton>

                    <GlassButton onClick={handleRemoveFurniture} variant="secondary" className="flex-1 h-12 text-xs sm:text-sm">
                      <Home size={16} className="mr-2 flex-shrink-0" />
                      <span className="truncate">Usuń meble</span>
                    </GlassButton>

                    <GlassButton onClick={handleQualityImprovement} variant="secondary" className="flex-1 h-12 text-xs sm:text-sm">
                      <RefreshCw size={16} className="mr-2 flex-shrink-0" />
                      <span className="truncate">Popraw Jakość</span>
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
                                    className="justify-start text-xs sm:text-sm h-12 px-3 overflow-hidden"
                                    disabled={isLoading}
                                  >
                                    <span className="line-clamp-2 text-center w-full">{mod.label}</span>
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
                                    <span className="line-clamp-2 text-center w-full">{mod.label}</span>
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
                        onNavigate={setCurrentHistoryIndex}
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
                    <span>Kontynuuj</span>
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
                          src={selectedImage.url}
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
                        {(hasCompletedRatings || selectedImage?.id === 'original-uploaded-image') && (
                          <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.2 }}
                            className="flex space-x-3"
                          >
                            <GlassButton onClick={() => setShowModifications((m) => !m)} variant="secondary" className="flex-1 h-12 text-xs sm:text-sm">
                              <Settings size={16} className="mr-2 flex-shrink-0" />
                              <span className="truncate">{showModifications ? 'Ukryj opcje' : 'Modyfikuj'}</span>
                            </GlassButton>

                            <GlassButton onClick={handleRemoveFurniture} variant="secondary" className="flex-1 h-12 text-xs sm:text-sm">
                              <Home size={16} className="mr-2 flex-shrink-0" />
                              <span className="truncate">Usuń meble</span>
                            </GlassButton>

                            <GlassButton onClick={handleQualityImprovement} variant="secondary" className="flex-1 h-12 text-xs sm:text-sm">
                              <RefreshCw size={16} className="mr-2 flex-shrink-0" />
                              <span className="truncate">Popraw Jakość</span>
                            </GlassButton>

                            <GlassButton 
                              onClick={() => {
                                const roomImage = (sessionData as any)?.roomImage;
                                if (roomImage) {
                                  const originalImg: GeneratedImage = {
                                    id: 'original-uploaded-image',
                                    url: roomImage.startsWith('data:') ? roomImage : `data:image/jpeg;base64,${roomImage}`,
                                    base64: roomImage,
                                    prompt: 'Oryginalne zdjęcie',
                                    parameters: { modificationType: 'original' },
                                    ratings: { aesthetic_match: 0, character: 0, harmony: 0, is_my_interior: 5 },
                                    isFavorite: false,
                                    createdAt: 0
                                  };
                                  handleImageSelect(originalImg);
                                }
                              }} 
                              variant="secondary" 
                              className="flex-1 h-12 text-xs sm:text-sm"
                            >
                              <Home size={16} className="mr-2 flex-shrink-0" />
                              <span className="truncate">Oryginalny</span>
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
                            <span>Przejdź do Ankiety</span>
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