'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useSessionData } from '@/hooks/useSessionData';
import { getSessionStoreSnapshot } from '@/hooks/useSession';
import { getOrCreateProjectId, saveGenerationSet, saveGeneratedImages, logBehavioralEvent, startParticipantGeneration, endParticipantGeneration, saveImageRatingEvent, startPageView, endPageView, saveGenerationFeedback, saveRegenerationEvent, safeSessionStorage, syncMatrixHistoryToGcp, saveSessionToGcp } from '@/lib/gcp-data';
import { saveSessionWithActiveSpace } from '@/lib/current-space-sync';
import { UpgradePrompt } from '@/components/subscription/UpgradePrompt';
import { useLanguage } from '@/contexts/LanguageContext';
import { LocalizedText } from '@/lib/questions/validated-scales';
import { assessAllSourcesQuality, getViableSources, type DataStatus } from '@/lib/prompt-synthesis/data-quality';
import { calculateImplicitQuality } from '@/lib/prompt-synthesis/implicit-quality';
import { analyzeSourceConflict } from '@/lib/prompt-synthesis/conflict-analysis';
import { countExplicitAnswers, getRegenerationInterpretation, type GenerationFeedback, type RegenerationEvent } from '@/lib/feedback/generation-feedback';
import { useAiApi } from '@/hooks/useAiApi';
import { useGoogleAI, getGenerationParameters, type GoogleGenerationParameters } from '@/hooks/useGoogleAI';
import { prepareGenerationDimensionsFromRoomBase64 } from '@/lib/image-aspect';
import {
  MACRO_STYLE_MODIFICATIONS,
  buildFullFlowMacroModificationPrompt,
} from '@/lib/modifications/macro-style-modifications';
import { GlassCard } from '@/components/ui/GlassCard';
import { AwaScrollArea } from '@/components/ui/AwaScrollArea';
import { GlassButton } from '@/components/ui/GlassButton';
import { GlassScalePicker } from '@/components/ui/GlassScalePicker';
import { LoadingProgress } from '@/components/ui/LoadingProgress';
import { GenerationHistory } from '@/components/ui/GenerationHistory';
import { AwaContainer, AwaDialogue } from '@/components/awa';
import { stopAllDialogueAudio } from '@/hooks/useAudioManager';
import { useAuth } from '@/contexts/AuthContext';
import { LoginModal, type LoginNudgeEvent } from '@/components/auth/LoginModal';
import { initAnonSessionAfterConsent } from '@/lib/anon-session-client';
import { FREE_GRANT_CREDITS } from '@/lib/credits';
import { creditsAuthHeaders } from '@/lib/credits-request-headers';
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
  X,
  Lock,
} from 'lucide-react';
import Image from 'next/image';
import { IntrinsicContainImage } from '@/components/ui/IntrinsicContainImage';
import { 
  synthesizeSixPrompts,
  synthesizeFivePrompts, // Backward compatibility
  synthesizeSelectedPrompts,
  GenerationSource, 
  GENERATION_SOURCE_LABELS,
  PROMPT_SCHEMA_VERSION,
  type SixPromptSynthesisResult,
  type FivePromptSynthesisResult 
} from '@/lib/prompt-synthesis';
import { addGeneratedImageToSpace } from '@/lib/spaces';
import {
  getOrCreateSpaceId,
  saveParticipantImages
} from '@/lib/remote-spaces';
import {
  appendModificationPromptLog,
  buildModificationPromptLogEntry,
} from '@/lib/modification-prompt-log';
import {
  applyRatingsToImage,
  aestheticPickerValue,
  hasTasteRating,
  imageHasAestheticRating,
  normalizeSessionImageRatingsMap,
  resolveSessionImageRatingsMap,
  shouldShowTasteRating,
  writeAestheticRatingToMap,
  type SessionImageRatingsMap,
} from '@/lib/image-aesthetic-rating';
import {
  buildGenerationHistoryFromSession,
  mergeMatrixHistoryRecords,
} from '@/lib/generation-history';

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

/** Macro styles: same list as /flow/style-selection (STYLE_OPTIONS). */
const MACRO_MODIFICATIONS = MACRO_STYLE_MODIFICATIONS;

export default function GeneratePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const isAuthenticated = !!user;
  const { sessionData, updateSessionData, isInitialized: isSessionInitialized } = useSessionData();
  const isAnonSingle = searchParams.get('mode') === 'anon-single' || (!isAuthenticated && (sessionData as { pathType?: 'fast' | 'full' })?.pathType === 'fast');
  const pathTypeForCredits = (sessionData as { pathType?: 'fast' | 'full' })?.pathType === 'fast' ? 'fast' : 'full';
  const isAnonMatrixPreview = !isAuthenticated && pathTypeForCredits === 'full' && searchParams.get('mode') !== 'anon-single';
  /** Progressive matrix save may only populate matrixHistory before generatedImages is written */
  const sessionMatrixHistoryLen =
    ((sessionData as { matrixHistory?: unknown[] } | null)?.matrixHistory || []).length;
  const sessionGeneratedRows =
    ((sessionData as { generatedImages?: { id?: string }[] } | null)?.generatedImages || []) as {
      id?: string;
    }[];
  const sessionHasStoredMatrixImages =
    sessionMatrixHistoryLen > 0 ||
    sessionGeneratedRows.some(
      (g) =>
        typeof g?.id === 'string' &&
        (g.id.startsWith('matrix-google-') ||
          (g.id.startsWith('matrix-') && !g.id.startsWith('mod-') && !g.id.startsWith('remove-'))),
    );
  const { generateSixImagesParallelWithGoogle, upscaleImageWithGoogle, isLoading, error, setError } = useGoogleAI();
  const { generateLLMComment } = useAiApi();

  const [postAnonGenLoginOpen, setPostAnonGenLoginOpen] = useState(false);
  const [preGenLoginOpen, setPreGenLoginOpen] = useState(false);
  const [matrixLoginWallOpen, setMatrixLoginWallOpen] = useState(false); 

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
  const [pageViewId, setPageViewId] = useState<string | null>(null);
  const [idaComment, setIdaComment] = useState<string | null>(null);
  const [isGeneratingComment, setIsGeneratingComment] = useState(false);
  
  // 6-Image Matrix State
  const [isMatrixMode, setIsMatrixMode] = useState(true); // Enabled - 6 different sources (off for anonymous)

  useEffect(() => {
    const m = searchParams.get('mode');
    if (m === 'anon-single') {
      setIsMatrixMode(false);
      return;
    }
    if (!isAuthenticated) {
      const pt = (sessionData as { pathType?: 'fast' | 'full' })?.pathType;
      setIsMatrixMode(pt !== 'fast');
      return;
    }
    setIsMatrixMode(true);
  }, [isAuthenticated, searchParams, sessionData?.pathType]);

  useEffect(() => {
    void initAnonSessionAfterConsent();
  }, []);
  const [matrixImages, setMatrixImages] = useState<GeneratedImage[]>([]);
  const [matrixDisplayOrder, setMatrixDisplayOrder] = useState<GenerationSource[]>([]);
  const [blindSelectionMade, setBlindSelectionMade] = useState(false);
  const [selectedSourceIndex, setSelectedSourceIndex] = useState<number | null>(null);
  const [showSourceReveal, setShowSourceReveal] = useState(false);
  const [matrixGenerationStartTime, setMatrixGenerationStartTime] = useState<number>(0);
  const [carouselIndex, setCarouselIndex] = useState(0); // Current carousel position
  const [abortController, setAbortController] = useState<AbortController | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const navigatingToModifyRef = useRef(false); // Track if intentionally going to modify page
  /** True after user confirms matrix choice — must survive late matrix batch completion */
  const userConfirmedMatrixSelectionRef = useRef(false);
  const [isGenerating, setIsGenerating] = useState(false); // Prevent duplicate generations
  const isGeneratingRef = useRef(false); // Ref to avoid race conditions in rapid calls
  const currentGenerationRunIdRef = useRef<string | null>(null); // Track active generation run ID
  const autoTriggerAlreadyFiredRef = useRef(false); // Track if auto-trigger already fired for this session
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
  const [isLightboxOpen, setIsLightboxOpen] = useState(false); // Lightbox zoom for step 2 image
  const [lightboxPortalReady, setLightboxPortalReady] = useState(false);
  const matrixImageClickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [generationHistory, setGenerationHistory] = useState<Array<{
    id: string;
    type: 'initial' | 'micro' | 'macro';
    label: string;
    timestamp: number;
    imageUrl: string;
  }>>([]);
  const [currentHistoryIndex, setCurrentHistoryIndex] = useState(0);
  const tasteRatingPanelRef = useRef<HTMLDivElement>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [feedbackType, setFeedbackType] = useState<'positive' | 'neutral' | 'negative'>('neutral');
  /** Anonymous full path: server says no free generate left (session/IP) — show inline guidance. */
  const [anonGuestQuotaBlocked, setAnonGuestQuotaBlocked] = useState(false);

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
  const pageViewUserHashRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    (async () => {
      try {
        const uh = (sessionData as any).userHash as string | undefined;
        pageViewUserHashRef.current = uh;
        const projectId = await getOrCreateProjectId(uh);
        if (projectId) {
          const id = await startPageView(projectId, 'generate');
          setPageViewId(id);
          pageViewIdRef.current = id;
        }
      } catch {}
    })();
    
    // Cleanup: end page view but DON'T abort generation if going to modify
    // This allows background generation to continue and update matrixHistory
    return () => { 
      (async () => { 
        if (pageViewIdRef.current) {
          await endPageView(pageViewUserHashRef.current, pageViewIdRef.current);
        }
      })();
      // Check if we're navigating to modify - if so, don't abort (let generation continue)
      // Use the ref which is set BEFORE navigation, more reliable than checking URL
      const goingToModify = navigatingToModifyRef.current || 
        (typeof window !== 'undefined' && 
          (window.location.pathname.includes('/flow/modify') || 
           sessionStorage.getItem('awa-navigating-to-modify') === 'true'));

      // React 18 Strict Mode (dev) runs this cleanup on a *simulated* unmount while the user
      // is still on /flow/generate — aborting here caused "Generation cancelled" on first load.
      // Only abort when we have actually left the generate/modify flow (real navigation).
      const path = typeof window !== 'undefined' ? window.location.pathname : '';
      const stillInGenerateFlow =
        path.includes('/flow/generate') || path.includes('/flow/modify');

      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/18b9349d-1699-4e68-9929-30c79f24c497', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '995889' },
        body: JSON.stringify({
          sessionId: '995889',
          hypothesisId: 'H-STRICT',
          runId: 'post-fix',
          location: 'generate/page.tsx:pageView-cleanup',
          message: 'mount cleanup abort decision',
          data: {
            path,
            stillInGenerateFlow,
            goingToModify,
            hasController: !!abortControllerRef.current,
            willAbort:
              !!(abortControllerRef.current && !goingToModify && !stillInGenerateFlow),
          },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
      // #endregion

      if (abortControllerRef.current && !goingToModify && !stillInGenerateFlow) {
        console.log('[Generate] 🛑 Cleanup: Aborting generation (left generate flow)');
        abortControllerRef.current.abort();
      } else if (goingToModify) {
        console.log('[Generate] ✅ NOT aborting - letting generation continue for modify page');
        sessionStorage.removeItem('awa-navigating-to-modify');
      } else if (stillInGenerateFlow && abortControllerRef.current) {
        console.log('[Generate] ⏭️ Cleanup: still on generate/modify route — skipping abort (Strict Mode or same-page)');
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount/unmount
  
  // Additional cleanup on browser back/forward and SPA navigation
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (abortControllerRef.current) {
        console.log('[Generate] Browser unload - aborting generation');
        abortControllerRef.current.abort();
      }
    };
    
    // Handle browser back/forward buttons (popstate fires AFTER navigation in SPA)
    const handlePopState = () => {
      // Check if we're still on generate page - if not, abort
      const currentPath = window.location.pathname;
      const isOnGeneratePage = currentPath.includes('/flow/generate');
      const goingToModify = currentPath.includes('/flow/modify') || 
        sessionStorage.getItem('awa-navigating-to-modify') === 'true';
      
      if (!isOnGeneratePage && !goingToModify && abortControllerRef.current) {
        console.log('[Generate] 🛑 Browser back/forward detected - aborting generation');
        abortControllerRef.current.abort();
        sessionStorage.removeItem('awa-navigating-to-modify');
      }
    };
    
    // Use both beforeunload (for tab close) and popstate (for browser back/forward)
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('popstate', handlePopState);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  // Restore state from sessionData after page refresh
  useEffect(() => {
    if (!isSessionInitialized || !sessionData) return;
    if (generatedImages.length > 0 || matrixImages.length > 0) return;

    const typedSessionData = sessionData as any;
    const savedGeneratedImages = typedSessionData?.generatedImages || [];
    const matrixHistoryEarly = typedSessionData?.matrixHistory || [];
    const savedGenerations = typedSessionData?.generations || [];
    const imageRatings = typedSessionData?.imageRatings || {};

    // Progressive generation may write matrixHistory before generatedImages is batched to session
    if (savedGeneratedImages.length === 0 && matrixHistoryEarly.length > 0) {
      const displayOrder = typedSessionData?.synthesisResult?.displayOrder as
        | GenerationSource[]
        | undefined;
      const restoredMatrixOnly: GeneratedImage[] = matrixHistoryEarly.map((item: any, index: number) => {
        let imageUrl = item.imageUrl || item.url || '';
        const base64 = item.base64 || '';
        if (!imageUrl && base64) {
          imageUrl = `data:image/png;base64,${base64}`;
        }
        const source = item.source as GenerationSource;
        let displayIndex = index;
        if (source != null && displayOrder?.length) {
          const di = displayOrder.indexOf(source);
          if (di >= 0) displayIndex = di;
        }
        return {
          id: item.id,
          url: imageUrl,
          base64,
          prompt: item.label || 'Restored from history',
          provider: 'google' as const,
          parameters: {
            modificationType: 'initial' as const,
            modifications: [],
            iterationCount: 0,
            usedOriginal: false,
            source,
            sourceLabel: source ? GENERATION_SOURCE_LABELS[source] : undefined,
          },
          ratings: imageRatings[item.id] || {
            aesthetic_match: 0,
            character: 0,
            harmony: 0,
          },
          isFavorite: false,
          createdAt: item.timestamp || Date.now(),
          source,
          displayIndex,
          isBlindSelected: !!item.isSelected,
        };
      });
      restoredMatrixOnly.sort((a, b) => (a.displayIndex || 0) - (b.displayIndex || 0));
      setMatrixImages(restoredMatrixOnly);
      setGeneratedImages(restoredMatrixOnly);

      const persistedSelectedOnly = typedSessionData?.selectedImage;
      const persistedSelectedIdOnly: string | null =
        typeof persistedSelectedOnly === 'string'
          ? persistedSelectedOnly
          : (persistedSelectedOnly?.id || null);

      if (persistedSelectedIdOnly) {
        const sessionBlindMadeEarly = typedSessionData?.blindSelectionMade === true;
        if (sessionBlindMadeEarly) {
          userConfirmedMatrixSelectionRef.current = true;
          setBlindSelectionMade(true);
          setHasAnsweredInteriorQuestion(true);
        } else {
          setBlindSelectionMade(false);
        }
        const selectedFromRestored = restoredMatrixOnly.find((img) => img.id === persistedSelectedIdOnly);
        if (selectedFromRestored) {
          const restoredSelected = applyRatingsToImage(selectedFromRestored, imageRatings);
          setSelectedImage(restoredSelected);
        } else if (persistedSelectedOnly?.url) {
          const restoredSelected = applyRatingsToImage(
            {
              id: persistedSelectedIdOnly,
              url: persistedSelectedOnly.url,
              base64: persistedSelectedOnly.base64 || '',
              prompt: 'Restored selected image from sessionData',
              provider: persistedSelectedOnly.provider || 'google',
              parameters:
                persistedSelectedOnly.parameters || {
                  modificationType: 'initial',
                  modifications: [],
                  iterationCount: 0,
                  usedOriginal: false,
                },
              ratings:
                imageRatings[persistedSelectedIdOnly] || {
                  aesthetic_match: 0,
                  character: 0,
                  harmony: 0,
                },
              isFavorite: false,
              createdAt: Date.now(),
              source: persistedSelectedOnly.source || GenerationSource.Implicit,
              displayIndex: persistedSelectedOnly.displayIndex || 0,
              isBlindSelected: true,
            } as GeneratedImage,
            imageRatings,
          );
          setSelectedImage(restoredSelected);
        }
      }

      const restoredFullHistory = buildGenerationHistoryFromSession({
        matrixHistory: matrixHistoryEarly,
        generations: savedGenerations,
        generatedImages: restoredMatrixOnly,
        selectedImageId: persistedSelectedIdOnly,
      });
      if (restoredFullHistory.length > 0) {
        setGenerationHistory(restoredFullHistory);
        const selectedIdx = restoredFullHistory.findIndex(
          (h) => h.isSelected || h.id === persistedSelectedIdOnly,
        );
        setCurrentHistoryIndex(
          selectedIdx >= 0 ? selectedIdx : restoredFullHistory.length - 1,
        );
      }

      setHasAttemptedGeneration(true);
      setGenerationCount(savedGenerations.length);
      console.log('[Generate] State restored from matrixHistory only (progressive save).');
      return;
    }

    if (savedGeneratedImages.length === 0) return;

    console.log('[Generate] Restoring state from sessionData:', {
        savedImagesCount: savedGeneratedImages.length,
        savedGenerationsCount: savedGenerations.length,
        hasRatings: Object.keys(imageRatings).length > 0
      });

      // Restore generated images from sessionData
      // Note: sessionData only stores lightweight versions (id, url), not full base64
      // We'll need to reconstruct the images from URLs
      const restoredImages: GeneratedImage[] = savedGeneratedImages.map((img: any, index: number) => {
        const ratings = applyRatingsToImage(
          {
            id: img.id,
            ratings: img.ratings || { aesthetic_match: 0, character: 0, harmony: 0 },
          },
          imageRatings,
        ).ratings;

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
        const sessionBlindMade = typedSessionData?.blindSelectionMade === true;
        const hasMatrixHistory = (typedSessionData?.matrixHistory || []).length > 0;
        const hasMatrixCache = restoredImages.filter(img => img.id.startsWith('matrix-')).length > 0;

        if (sessionBlindMade) {
          userConfirmedMatrixSelectionRef.current = true;
          setBlindSelectionMade(true);
          setHasAnsweredInteriorQuestion(true);
        } else if (hasMatrixHistory || hasMatrixCache) {
          // Matrix exists but user has not confirmed a vision yet — show grid for blind pick
          console.log('[Generate] Matrix cached without confirmed selection — showing grid');
          setBlindSelectionMade(false);
        } else {
          setBlindSelectionMade(true);
          setHasAnsweredInteriorQuestion(true);
        }

        const selectedFromRestored = restoredImages.find(img => img.id === persistedSelectedId);
        if (selectedFromRestored) {
          console.log('[Generate] Restoring selected image from restored images:', persistedSelectedId);
          const restoredSelected = applyRatingsToImage(selectedFromRestored, imageRatings);
          setSelectedImage(restoredSelected);
        } else if (persistedSelected?.url) {
          // Fallback: restore minimal selected image even if we don't have the full matrix cache
          console.log('[Generate] Restoring selected image from sessionData.selectedImage.url:', persistedSelectedId);
          const restoredSelected = applyRatingsToImage(
            {
              id: persistedSelectedId,
              url: persistedSelected.url,
              base64: persistedSelected.base64 || '',
              prompt: 'Restored selected image from sessionData',
              provider: persistedSelected.provider || 'google',
              parameters:
                persistedSelected.parameters || {
                  modificationType: 'initial',
                  modifications: [],
                  iterationCount: 0,
                  usedOriginal: false,
                },
              ratings: imageRatings[persistedSelectedId] || {
                aesthetic_match: 0,
                character: 0,
                harmony: 0,
              },
              isFavorite: false,
              createdAt: Date.now(),
              source: persistedSelected.source || GenerationSource.Implicit,
              displayIndex: persistedSelected.displayIndex || 0,
              isBlindSelected: true,
            } as GeneratedImage,
            imageRatings,
          );
          setSelectedImage(restoredSelected);
          if (!hasMatrixHistory && !hasMatrixCache) {
            setHasAnsweredInteriorQuestion(true);
          }
        }

        // Prevent auto-generation on refresh when the user already selected a vision
        setHasAttemptedGeneration(true);
      }

      // Restore matrix images - first try from matrixHistory (has base64), then from restoredImages
      const matrixHistory = typedSessionData?.matrixHistory || [];
      let restoredMatrixImages: GeneratedImage[] = [];
      
      if (matrixHistory.length > 0) {
        // Restore from matrixHistory (better - has base64 and URLs)
        restoredMatrixImages = matrixHistory.map((item: any, index: number) => {
          // Construct URL from base64 if not available
          let imageUrl = item.imageUrl || item.url || '';
          const base64 = item.base64 || '';
          if (!imageUrl && base64) {
            imageUrl = `data:image/png;base64,${base64}`;
          }
          
          return {
            id: item.id,
            url: imageUrl,
            base64: base64,
            prompt: item.label || 'Restored from history',
            provider: 'google' as const,
            parameters: {
              modificationType: 'initial' as const,
              modifications: [],
              iterationCount: 0,
              usedOriginal: false,
              source: item.source,
              sourceLabel: item.source ? GENERATION_SOURCE_LABELS[item.source as GenerationSource] : undefined
            },
            ratings: imageRatings[item.id] || { aesthetic_match: 0, character: 0, harmony: 0 },
            isFavorite: false,
            createdAt: item.timestamp || Date.now(),
            source: item.source as GenerationSource,
            displayIndex: index,
            isBlindSelected: item.isSelected || false
          };
        });
        console.log('[Generate] Restoring matrix images from matrixHistory:', restoredMatrixImages.length, 'items');
      } else {
        // Fallback: restore from restoredImages (lightweight - no base64)
        restoredMatrixImages = restoredImages
          .filter(
            (img) =>
              (img.id.startsWith('matrix-google-') || img.id.startsWith('matrix-')) &&
              !img.id.startsWith('mod-') &&
              !img.id.startsWith('remove-'),
          )
          .sort((a, b) => (a.displayIndex || 0) - (b.displayIndex || 0))
          .slice(0, 6);
        console.log('[Generate] Restoring matrix images from generatedImages:', restoredMatrixImages.length);
      }

      if (restoredMatrixImages.length > 0) {
        setMatrixImages(restoredMatrixImages);
      }

      // Restore generation history: matrix visions first, then modification steps
      const restoredFullHistory = buildGenerationHistoryFromSession({
        matrixHistory,
        generations: savedGenerations,
        generatedImages: restoredImages,
        selectedImageId: persistedSelectedId,
      });
      if (restoredFullHistory.length > 0) {
        setGenerationHistory(restoredFullHistory);
        const selectedIdx = restoredFullHistory.findIndex(
          (h) => h.isSelected || h.id === persistedSelectedId,
        );
        setCurrentHistoryIndex(
          selectedIdx >= 0 ? selectedIdx : restoredFullHistory.length - 1,
        );
      }

      // Mark that we've restored state, so don't trigger new generation
      setHasAttemptedGeneration(true);
      setGenerationCount(savedGenerations.length);
      
      console.log('[Generate] State restored from sessionData. Skipping auto-generation.');
  }, [isSessionInitialized, sessionData, generatedImages.length, matrixImages.length]);

  useEffect(() => {
    if (!isSessionInitialized) {
      console.log('[Generate] Session not initialized yet, delaying auto-generation.');
      return;
    }

    // Never auto-generate when we ALREADY have restored images in state
    // (this happens after restoration runs, not just from session data existing)
    // This prevents regeneration on back navigation while allowing fresh generation for new rooms
    if (matrixImages.length > 0) {
      console.log('[Generate] Skipping auto-generation - already have matrix images in state:', matrixImages.length);
      autoTriggerAlreadyFiredRef.current = false;
      return;
    }

    const noImages = generatedImages.length === 0 && matrixImages.length === 0;
    const isNotGenerating = !isGenerating && !isGeneratingRef.current;
    const canAutoGenerate = noImages && isNotGenerating && generationCount === 0;
    
    // Reset ref if conditions allow auto-generation (enables trigger on fresh page load or after failed generation)
    if (canAutoGenerate) {
      autoTriggerAlreadyFiredRef.current = false;
      console.log('[Generate] Reset auto-trigger ref - conditions allow generation');
    }

    // Prevent duplicate triggers within same render cycle using ref
    if (autoTriggerAlreadyFiredRef.current) {
      console.log('[Generate] Auto-trigger already fired in this cycle, skipping.');
      return;
    }

    const staleAttempt = hasAttemptedGeneration && noImages && isNotGenerating;

    // Only trigger generation if:
    // 1. API is ready
    // 2. Generation count is zero
    // 3. We don't have any images (generated or matrix)
    // 4. User hasn't already selected an image (blindSelectionMade)
    // 5. Not currently generating (check both state and ref)
    // 6. Either we haven't attempted generation OR previous attempt is stale (no images)
    const shouldGenerate = isApiReady &&
                          generationCount === 0 &&
                          noImages &&
                          !blindSelectionMade &&
                          isNotGenerating &&
                          (!hasAttemptedGeneration || staleAttempt);

    console.log('[Generate] Auto-generation check:', { 
      shouldGenerate,
      isApiReady, 
      generationCount, 
      hasAttemptedGeneration, 
      staleAttempt,
      noImages,
      isNotGenerating,
      blindSelectionMade,
      matrixImagesLength: matrixImages.length
    });
    
    if (shouldGenerate) {
      console.log('[Generate] ✅ Auto-triggering initial generation');
      autoTriggerAlreadyFiredRef.current = true; // Mark as fired immediately
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

  useEffect(() => {
    setLightboxPortalReady(true);
  }, []);

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
      let removalParameters: GoogleGenerationParameters = { ...baseParams };
      try {
        const prepared = await prepareGenerationDimensionsFromRoomBase64(cleanBase64);
        removalParameters = {
          ...baseParams,
          width: prepared.normalizedWidth,
          height: prepared.normalizedHeight,
          aspect_ratio: prepared.aspectRatio,
        };
      } catch (dimErr) {
        console.warn('[Furniture Removal] Dimension prep failed, using defaults:', dimErr);
      }

      const response = await generateSixImagesParallelWithGoogle({
        prompts: [{ source: 'implicit' as GenerationSource, prompt: removeFurniturePrompt }],
        base_image: cleanBase64,
        style: 'empty',
        parameters: removalParameters,
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
  const handleMatrixGeneration = async () => {
    // Generate unique run ID immediately
    const generationRunId = typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `run-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    
    console.log("[6-Image Matrix] handleMatrixGeneration called", { 
      isApiReady, 
      isGenerating, 
      isGeneratingRef: isGeneratingRef.current,
      currentRunId: currentGenerationRunIdRef.current,
      newRunId: generationRunId
    });
    
    
    if (!isApiReady) {
      console.log("[6-Image Matrix] API not ready, generation cancelled.");
      return;
    }

    // Prevent duplicate generations - check ref immediately (avoids race conditions)
    if (isGeneratingRef.current) {
      const existingRunId = currentGenerationRunIdRef.current;
      console.log("[6-Image Matrix] Generation already in progress, skipping.", { 
        existingRunId, 
        newRunId: generationRunId,
        isGeneratingState: isGenerating 
      });
      return;
    }

    // Set generating flag immediately using ref (before any async operations)
    isGeneratingRef.current = true;
    currentGenerationRunIdRef.current = generationRunId;
    setIsGenerating(true);
    
    console.log("[6-Image Matrix] ✅ Run started", { runId: generationRunId });

    console.log("[6-Image Matrix] ✅ Starting generation...", { runId: generationRunId });
    
    const typedSessionData = sessionData as any;
    const userHash = typedSessionData?.userHash;
    
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
    if (typeof window !== 'undefined') {
      try {
        roomImageEmptyFromStorage = sessionStorage.getItem('aura_session_room_image_empty');
      } catch (e) {
        console.warn('[generate] Failed to read roomImageEmpty from sessionStorage', e);
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
    
    
    if (finalRoomImageEmpty) {
      console.log("[6-Image Matrix] Using pre-processed empty room image (furniture removed by user)");
      // Remove data URI prefix if present (roomImageEmpty might have it)
      processedRoomImage = finalRoomImageEmpty.includes(',') ? finalRoomImageEmpty.split(',')[1] : finalRoomImageEmpty;
    } else {
      console.log("[6-Image Matrix] Using original room image (furniture not removed)");
      // Remove data URI prefix if present
      processedRoomImage = roomImage.includes(',') ? roomImage.split(',')[1] : roomImage;
    }
    
    
    // Create new AbortController for this generation
    const controller = new AbortController();
    setAbortController(controller);
    abortControllerRef.current = controller;
    setIsGenerating(true);

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
    
    let matrixJobId: string | null = null;
    let matrixJobClosed = false;
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
        hasInspirationImages: !!synthesisResult.inspirationImages,
        resultsCount: Object.keys(synthesisResult.results || {}).length,
        resultsKeys: Object.keys(synthesisResult.results || {})
      });
      
      if (synthesisResult.generatedSources.length === 0) {
        // DEBUG: Log why all sources were skipped
        console.error("[6-Image Matrix] ERROR - All sources skipped! Quality reports:", qualityReports);
        const errorDetails = qualityReports
          .map(r => `${r.source}: ${r.warnings.join(', ')}`)
          .join('; ');
        setError(t({ pl: `Brak wystarczających danych do wygenerowania obrazów. Szczegóły: ${errorDetails}`, en: `Insufficient data to generate images. Details: ${errorDetails}` }));
        setIsGenerating(false);
        return;
      }

      const allMatrixPrompts = synthesisResult.generatedSources.map((source) => ({
        source,
        prompt: synthesisResult.results[source]!.prompt,
      }));

      if (isAnonMatrixPreview) {
        const previewUserHash = typedSessionData?.userHash as string | undefined;
        if (previewUserHash) {
          let cred: Awaited<ReturnType<typeof checkCreditsWithAction>> | null = null;
          try {
            cred = await checkCreditsWithAction(previewUserHash, 10, 'generate');
          } catch (e) {
            console.warn('[Anon 1/6] credit check:', e);
          }
          if (cred && !cred.allowed) {
            if (cred.code === 429) {
              setAnonGuestQuotaBlocked(true);
            } else {
              setError(
                t({
                  pl: 'Nie masz dostępnej darmowej próby na tę ścieżkę. Zaloguj się, aby kontynuować.',
                  en: 'No free try left on this path. Sign in to continue.',
                }),
              );
            }
            setIsGenerating(false);
            isGeneratingRef.current = false;
            return;
          }
        } else {
          setError(
            t({
              pl: 'Brak identyfikatora sesji. Zgódź się na pliki cookie i spróbuj ponownie.',
              en: 'Missing session id. Please accept cookies and try again.',
            }),
          );
          setIsGenerating(false);
          isGeneratingRef.current = false;
          return;
        }
        const rest = allMatrixPrompts.slice(1);
        await updateSessionData({
          matrixAnonPending: rest.map((p) => ({ source: p.source, prompt: p.prompt })),
        } as Record<string, unknown>);
        try {
          await saveSessionToGcp(
            getSessionStoreSnapshot() as unknown as Record<string, unknown>,
          );
        } catch (e) {
          console.warn('[generate] saveSessionToGcp failed:', e);
        }
        void logBehavioralEvent(typedSessionData.userHash, 'login_nudge', {
          page: 'flow-generate',
          nudge: 'anon_one_of_six' as any,
        }).catch(() => {});
      } else {
        const requiredCredits = synthesisResult.generatedSources.length * 10;
        const matrixUserHash = typedSessionData?.userHash;
        if (matrixUserHash) {
          let credit: Awaited<ReturnType<typeof checkCreditsWithAction>> | null = null;
          try {
            credit = await checkCreditsWithAction(matrixUserHash, requiredCredits, 'matrix');
          } catch (creditError) {
            console.warn('[6-Image Matrix] Error checking credits:', creditError);
          }

          if (credit && !credit.allowed) {
            if (credit.code === 429) {
              setMatrixLoginWallOpen(true);
              setError(
                t({
                  pl: 'Brak wystarczających kredytów lub wymagane jest konto. Zaloguj się, aby kontynuować.',
                  en: 'Not enough credits or an account is required. Sign in to continue.',
                }),
              );
              setIsGenerating(false);
              isGeneratingRef.current = false;
              return;
            }
            setError(t({
              pl: `Nie masz wystarczającej liczby kredytów. Potrzebujesz ${requiredCredits} kredytów na ten zestaw obrazów.`,
              en: `You do not have enough credits. You need ${requiredCredits} credits for this image set.`,
            }));
            setStatusMessage({ pl: 'Brak kredytów', en: 'No credits' });
            setIsGenerating(false);
            isGeneratingRef.current = false;
            return;
          }
        }
      }

      // Drop previous matrix only after credit checks — avoids empty "loading at 2%" when quota blocks a new run
      setMatrixImages([]);
      setGeneratedImages([]);
      setImageProgress({});
      setAnonGuestQuotaBlocked(false);

      // Step 2: Prepare prompts for parallel generation
      setLoadingProgress(45);
      if (isAnonMatrixPreview) {
        setStatusMessage({
          pl: `Generuję pierwszą z ${allMatrixPrompts.length} wizji (gość, 1/6)…`,
          en: `Generating 1 of ${allMatrixPrompts.length} vision(s) (guest preview, 1/6)…`,
        });
      } else {
        setStatusMessage({
          pl: `Generuję ${synthesisResult.generatedSources.length} wizji równolegle...`,
          en: `Generating ${synthesisResult.generatedSources.length} visions in parallel...`,
        });
      }
      setEstimatedTime(120);

      const prompts: { source: GenerationSource; prompt: string }[] =
        isAnonMatrixPreview && allMatrixPrompts.length > 0
          ? [allMatrixPrompts[0]!]
          : allMatrixPrompts;

      // Seed per-source progress so placeholders immediately show activity (start at 2%)
      setImageProgress(() => {
        const initialProgress: Record<string, number> = {};
        prompts.forEach(({ source }) => {
          initialProgress[`google-${source}`] = 2;
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
        hasInspirationImages: !!synthesisResult.inspirationImages,
        inspirationImagesCount: synthesisResult.inspirationImages?.length || 0,
        results: Object.keys(synthesisResult.results).map(source => ({
          source,
          hasPrompt: !!synthesisResult.results[source as GenerationSource]?.prompt,
          promptLength: synthesisResult.results[source as GenerationSource]?.prompt?.length || 0,
          isInspirationReference: source === 'inspiration_reference',
          weights: synthesisResult.results[source as GenerationSource]?.weights ? {
            dominantStyle: synthesisResult.results[source as GenerationSource]?.weights.dominantStyle,
            colorPalette: synthesisResult.results[source as GenerationSource]?.weights.colorPalette?.slice(0, 3),
            primaryMaterials: synthesisResult.results[source as GenerationSource]?.weights.primaryMaterials?.slice(0, 2)
          } : null
        }))
      });
      
      // Use preview mode for faster initial generation (1024px long edge; aspect from source pixels)
      const baseParams = getGenerationParameters('preview', generationCount);

      let parameters = {
        ...baseParams,
        image_size: 1024,
        width: 1024,
        height: 1024,
      };
      try {
        const prepared = await prepareGenerationDimensionsFromRoomBase64(processedRoomImage);
        parameters = {
          ...baseParams,
          image_size: 1024,
          width: prepared.normalizedWidth,
          height: prepared.normalizedHeight,
          aspect_ratio: prepared.aspectRatio,
        };
        console.log(
          `[6-Image Matrix] Prepared dimensions: ${prepared.normalizedWidth}x${prepared.normalizedHeight}, aspect_ratio=${prepared.aspectRatio} (source ${prepared.sourceWidth}x${prepared.sourceHeight})`,
        );
      } catch (e) {
        console.warn('[6-Image Matrix] prepareGenerationDimensionsFromRoomBase64 failed, using 1024 square', e);
      }

      console.log('[6-Image Matrix] Initial generation parameters:', { 
        width: parameters.width,
        height: parameters.height,
        steps: parameters.steps, 
        guidance: parameters.guidance,
        strength: parameters.strength 
      });
      
      // One participant_generations row per matrix run (avoid orphan pending rows).
      // Store the FULL structured JSON per source + a snapshot of PromptWeights + schema_version,
      // so research data is comparable field-by-field (no truncation).
      if (userHash && prompts.length > 0) {
        const promptRecords = prompts.map((p) => {
          let promptJson: unknown = p.prompt;
          try {
            promptJson = JSON.parse(p.prompt);
          } catch {
            // Non-JSON (text) prompt — keep raw string
          }
          return {
            source: p.source,
            schema_version: PROMPT_SCHEMA_VERSION,
            prompt_json: promptJson,
            weights: synthesisResult.results[p.source]?.weights ?? null,
          };
        });

        matrixJobId = await startParticipantGeneration(userHash, {
          type: 'initial',
          prompt: JSON.stringify(promptRecords),
          parameters: { ...parameters, num_sources: prompts.length, schema_version: PROMPT_SCHEMA_VERSION },
          has_base_image: true,
        });
      }
      
      // Step 3: Generate all images in parallel with progressive display
      setLoadingProgress(55);
      
      // Track completed images for progress
      let completedCount = 0;
      /** Sources finished in this run — avoids stale `matrixImages` closure in the progress interval */
      const completedMatrixSourcesInRun = new Set<GenerationSource>();

      // Track progress for each image
      const startTime = Date.now();
      let progressInterval: NodeJS.Timeout | null = null;

      // Smooth, slower fallback progress curve (asymptotic to 90% over ~90s)
      const calcFallbackProgress = (elapsedMs: number) => {
        const t = Math.max(0, Math.min(1, elapsedMs / 90000)); // 0..1 over 90s
        const eased = 1 - Math.pow(1 - t, 4); // ease-out quart
        return Math.min(90, Math.round(2 + eased * 88)); // start at 2%, max 90%
      };

      const progressKey = (source: GenerationSource) => `google-${source}`;

      const updateProgress = () => {
        const pendingSources = prompts.map((p) => p.source).filter((src) => !completedMatrixSourcesInRun.has(src));
        const activeSource = pendingSources[0];

        prompts.forEach(({ source }) => {
          if (completedMatrixSourcesInRun.has(source)) return;
          const pk = progressKey(source);
          const offset = progressOffsets[source] ?? 0;
          const speedFactor = source === activeSource ? 1.35 : 1;
          const elapsed = Math.max(0, (Date.now() - startTime - offset) * speedFactor);
          const estimatedProgress = calcFallbackProgress(elapsed);
          setImageProgress((prev) => {
            if (prev[pk] !== 100 && estimatedProgress > (prev[pk] ?? 0)) {
              return {
                ...prev,
                [pk]: estimatedProgress,
              };
            }
            return prev;
          });
        });
      };
      
      // Update progress every 500ms
      progressInterval = setInterval(updateProgress, 500);
      
      // Callback to show images as they complete
      const onImageReady = (result: any) => {
        // If backend sends live progress, reflect it in UI
        if (result && typeof result.progress === 'number' && !Number.isNaN(result.progress)) {
          setImageProgress((prev) => ({
            ...prev,
            [`google-${result.source as GenerationSource}`]: Math.min(100, Math.max(0, Math.round(result.progress))),
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
            ratings: { aesthetic_match: 0, character: 0, harmony: 0 },
            isFavorite: false,
            createdAt: Date.now(),
            source: result.source,
            displayIndex: displayIndex >= 0 ? displayIndex : completedCount - 1,
            isBlindSelected: false,
            provider: 'google' // Now always using Google
          };
          
          // Mark as 100% complete
          setImageProgress((prev) => ({
            ...prev,
            [`google-${result.source as GenerationSource}`]: 100,
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
        
        console.log("[6-Image Matrix] Using processed room image (furniture removed, cleaned):", {
          hasImage: !!baseImage,
          length: baseImage?.length || 0,
          startsWith: baseImage?.substring(0, 50) || 'N/A',
          isBase64: baseImage && !baseImage.startsWith('http') && !baseImage.startsWith('blob:'),
          isProcessed: !!finalRoomImageEmpty || baseImageForGeneration !== roomImage,
        });
        
      } else {
        console.error("[6-Image Matrix] ERROR: processedRoomImage is missing or empty!");
        setError(t({ pl: "Brak zdjęcia pokoju w sesji. Proszę wrócić do kroku uploadu zdjęcia.", en: "No room photo in session. Please return to the photo upload step." }));
        setIsGenerating(false);
        return;
      }
      
      // InspirationReference is driven by VLM tags + text description embedded in the JSON prompt
      // (same transport as other matrix slots: room base image + prompt only). Binary reference
      // images are intentionally omitted to keep payloads smaller and avoid private-URL fetch issues.
      const SEND_INSPIRATION_IMAGES_TO_MODEL = false;

      // Filter out blob URLs from inspiration images - they cannot be used for generation
      // Only use base64 strings or HTTP/HTTPS URLs
      let filteredInspirationImages: string[] | undefined = undefined;
      if (SEND_INSPIRATION_IMAGES_TO_MODEL && synthesisResult.inspirationImages && synthesisResult.inspirationImages.length > 0) {
        filteredInspirationImages = synthesisResult.inspirationImages.filter((img: string) => {
          // Skip blob URLs - they cannot be fetched or used
          if (img.startsWith('blob:')) {
            console.warn("[6-Image Matrix] Skipping blob URL inspiration image:", img.substring(0, 50));
            return false;
          }
          // Keep base64 (with or without data: prefix) and HTTP/HTTPS URLs
          return true;
        });
        
        // Process remaining images: extract base64 from data URIs, convert HTTP URLs to base64
        if (filteredInspirationImages.length > 0) {
          // Convert URLs to base64 if needed
          const convertedImages = await Promise.all(
            filteredInspirationImages.map(async (img: string) => {
              // If it's base64 with data URI prefix, extract just the base64 part
              if (img.startsWith('data:')) {
                return img.split(',')[1];
              }
              // If it's an HTTP/HTTPS URL, fetch and convert to base64
              if (img.startsWith('http://') || img.startsWith('https://')) {
                try {
                  console.log("[6-Image Matrix] Converting URL to base64:", img.substring(0, 80));
                  const response = await fetch(img);
                  if (!response.ok) {
                    console.error(`[6-Image Matrix] Failed to fetch image from URL: ${response.status}`);
                    return null;
                  }
                  const blob = await response.blob();
                  return new Promise<string | null>((resolve) => {
                    const reader = new FileReader();
                    reader.onloadend = () => {
                      const base64 = reader.result as string;
                      // Remove data URI prefix if present
                      const base64Data = base64.includes(',') ? base64.split(',')[1] : base64;
                      resolve(base64Data);
                    };
                    reader.onerror = () => {
                      console.error("[6-Image Matrix] Failed to convert blob to base64");
                      resolve(null);
                    };
                    reader.readAsDataURL(blob);
                  });
                } catch (error) {
                  console.error("[6-Image Matrix] Error converting URL to base64:", error);
                  return null;
                }
              }
              // Otherwise assume it's already base64 without prefix
              return img;
            })
          );
          
          // Filter out null values (failed conversions)
          filteredInspirationImages = convertedImages.filter((img): img is string => img !== null);
          
          console.log("[6-Image Matrix] Filtered and converted inspiration images:", {
            original: synthesisResult.inspirationImages.length,
            filtered: filteredInspirationImages.length,
            removed: synthesisResult.inspirationImages.length - filteredInspirationImages.length
          });
          
          // If all images were filtered out, set to undefined
          if (filteredInspirationImages.length === 0) {
            console.warn("[6-Image Matrix] All inspiration images failed conversion, skipping inspiration images");
            filteredInspirationImages = undefined;
          }
        } else {
          console.warn("[6-Image Matrix] All inspiration images were blob URLs, skipping inspiration images");
          filteredInspirationImages = undefined;
        }
      }
      
      // Use the runId already set at the start of handleMatrixGeneration
      const generationRunId = currentGenerationRunIdRef.current!;
      
      console.log("[6-Image Matrix] Calling generateSixImagesParallel with:", {
        generationRunId,
        promptsCount: prompts.length,
        hasBaseImage: !!baseImage,
        baseImageLength: baseImage?.length || 0,
        hasInspirationImages: !!filteredInspirationImages,
        inspirationImagesCount: filteredInspirationImages?.length || 0,
        sendInspirationImagesToModel: SEND_INSPIRATION_IMAGES_TO_MODEL,
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
          // We do NOT pass inspiration_images; 6/6 is driven by extracted data embedded in the prompt.
          inspiration_images: filteredInspirationImages,
          style: typedSessionData.visualDNA?.dominantStyle || 'modern',
          generation_run_id: generationRunId,
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
            completedMatrixSourcesInRun.add(result.source as GenerationSource);
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
              ratings: { aesthetic_match: 0, character: 0, harmony: 0 },
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
              // #region agent log (debug session 995889 — matrix generation UI)
              {
                const uh = (sessionData as any)?.userHash;
                const userHashShort =
                  typeof uh === 'string' && uh.length > 14 ? `${uh.slice(0, 10)}…${uh.slice(-4)}` : uh ?? null;
                fetch('http://127.0.0.1:7242/ingest/18b9349d-1699-4e68-9929-30c79f24c497', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'X-Debug-Session-Id': '995889',
                  },
                  body: JSON.stringify({
                    sessionId: '995889',
                    hypothesisId: 'G0',
                    location: 'generate/page.tsx:setMatrixImages',
                    message: 'matrix_ui_image_added',
                    data: {
                      userHashShort,
                      source: result.source,
                      matrixUiCount: updated.length,
                      displayIndex: newImage.displayIndex,
                    },
                    timestamp: Date.now(),
                    runId: 'matrix-gen',
                  }),
                }).catch(() => {});
              }
              // #endregion
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
              label: (language === 'pl' ? sourceLabel?.pl : sourceLabel?.en) || sourceLabel?.pl || result.source,
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
            
            // Progressively save to session so images are available even if user navigates away early
            // Use async IIFE with fresh session read to avoid race conditions
            (async () => {
              try {
                // Read fresh from localStorage to get latest state (storage key is 'aura_session')
                const stored = typeof window !== 'undefined' 
                  ? window.localStorage.getItem('aura_session')
                  : null;
                const freshSession = stored ? JSON.parse(stored) : {};
                const currentMatrixHistory = (freshSession?.matrixHistory || []) as any[];
                const existsInSession = currentMatrixHistory.find((h: any) => h.id === newImage.id);
                
                if (!existsInSession) {
                  const newHistoryItem = {
                    id: newImage.id,
                    label: (language === 'pl' ? sourceLabel?.pl : sourceLabel?.en) || sourceLabel?.pl || result.source,
                    timestamp: Date.now(),
                    imageUrl: newImage.url,
                    base64: newImage.base64,
                    source: result.source,
                    isSelected: false
                  };
                  await updateSessionData({
                    matrixHistory: [...currentMatrixHistory, newHistoryItem]
                  } as any);
                  const mergedMatrix = [...currentMatrixHistory, newHistoryItem];
                  const uhSync = (sessionData as any)?.userHash as string | undefined;
                  if (uhSync) {
                    try {
                      await syncMatrixHistoryToGcp(uhSync, mergedMatrix);
                    } catch (syncErr) {
                      console.warn('[6-Image Matrix] syncMatrixHistoryToGcp failed:', syncErr);
                    }
                  }
                  console.log(`[6-Image Matrix] Progressively saved ${result.source} to session`);
                  // #region agent log (debug session 995889 — matrix generation persist)
                  {
                    const uh = (sessionData as any)?.userHash;
                    const userHashShort =
                      typeof uh === 'string' && uh.length > 14 ? `${uh.slice(0, 10)}…${uh.slice(-4)}` : uh ?? null;
                    fetch('http://127.0.0.1:7242/ingest/18b9349d-1699-4e68-9929-30c79f24c497', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        'X-Debug-Session-Id': '995889',
                      },
                      body: JSON.stringify({
                        sessionId: '995889',
                        hypothesisId: 'G1',
                        location: 'generate/page.tsx:matrixProgressiveSave',
                        message: 'matrix_history_append_ok',
                        data: {
                          userHashShort,
                          source: result.source,
                          matrixLenAfter: currentMatrixHistory.length + 1,
                          sessionStorageKeyRead: !!stored,
                        },
                        timestamp: Date.now(),
                        runId: 'matrix-gen',
                      }),
                    }).catch(() => {});
                  }
                  // #endregion
                } else {
                  // #region agent log (debug session 995889 — matrix generation persist)
                  {
                    const uh = (sessionData as any)?.userHash;
                    const userHashShort =
                      typeof uh === 'string' && uh.length > 14 ? `${uh.slice(0, 10)}…${uh.slice(-4)}` : uh ?? null;
                    fetch('http://127.0.0.1:7242/ingest/18b9349d-1699-4e68-9929-30c79f24c497', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        'X-Debug-Session-Id': '995889',
                      },
                      body: JSON.stringify({
                        sessionId: '995889',
                        hypothesisId: 'G2',
                        location: 'generate/page.tsx:matrixProgressiveSave',
                        message: 'matrix_history_skip_duplicate',
                        data: {
                          userHashShort,
                          source: result.source,
                          imageId: newImage.id,
                        },
                        timestamp: Date.now(),
                        runId: 'matrix-gen',
                      }),
                    }).catch(() => {});
                  }
                  // #endregion
                }
              } catch (e) {
                console.warn('[6-Image Matrix] Failed to progressively save to session:', e);
                // #region agent log (debug session 995889 — matrix generation persist)
                {
                  fetch('http://127.0.0.1:7242/ingest/18b9349d-1699-4e68-9929-30c79f24c497', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'X-Debug-Session-Id': '995889',
                    },
                    body: JSON.stringify({
                      sessionId: '995889',
                      hypothesisId: 'G3',
                      location: 'generate/page.tsx:matrixProgressiveSave',
                      message: 'matrix_history_persist_error',
                      data: {
                        errSlice: e instanceof Error ? e.message.slice(0, 220) : String(e).slice(0, 220),
                      },
                      timestamp: Date.now(),
                      runId: 'matrix-gen',
                    }),
                  }).catch(() => {});
                }
                // #endregion
              }
            })();
            
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
        if (matrixJobId) {
          await endParticipantGeneration(matrixJobId, {
            status: 'error',
            latency_ms: Date.now() - matrixGenerationStartTime,
            error_message: 'All generations failed',
          });
          matrixJobClosed = true;
        }
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
            ratings: { aesthetic_match: 0, character: 0, harmony: 0 },
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
      if (!userConfirmedMatrixSelectionRef.current) {
        setSelectedImage(null);
        setBlindSelectionMade(false);
      } else {
        setSelectedImage((current) => {
          if (!current) return null;
          const match =
            newMatrixImages.find((img) => img.id === current.id) ||
            (current.source != null
              ? newMatrixImages.find((img) => img.source === current.source)
              : undefined);
          if (!match) return current;
          const ratingsMap = resolveSessionImageRatingsMap(
            (sessionData as { imageRatings?: SessionImageRatingsMap })?.imageRatings,
          );
          return applyRatingsToImage(match, ratingsMap);
        });
        setBlindSelectionMade(true);
      }
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
          name: (sessionData as any)?.roomName || t({ pl: 'Moja Przestrzeń', en: 'My Space' })
        });

        if (spaceId) {
          
          // Save all generated images to participant_images
          const imagesToSave = newMatrixImages.map(img => ({
            url: img.url,
            type: 'generated' as const,
            is_favorite: img.isFavorite || false,
            source: img.source,
            generation_id: (sessionData as any)?.currentGenerationId || undefined,
            space_id: spaceId
          }));
          const matrixSaveResult = await saveParticipantImages(userHash, imagesToSave);
          if (matrixSaveResult.failed > 0) {
            console.error(
              '[generate] saveParticipantImages partial failure (matrix):',
              matrixSaveResult,
            );
          }

          // Keep local minimal spaces snapshot
          updatedSpaces = addGeneratedImageToSpace(
            (typedSessionData?.spaces || []),
            spaceId,
            newMatrixImages[0]?.url || ''
          );
          await updateSessionData({
            spaces: updatedSpaces,
            currentSpaceId: spaceId,
            currentStep: 'generate',
          } as any);
        }
        
        // NOTE: After radical refactor we do NOT persist "spaces" in Supabase.
        // Persistence across sessions is handled via participant_images + participants snapshot.
        
        if (userHash && matrixJobId) {
          const totalTime = Date.now() - matrixGenerationStartTime;
          await endParticipantGeneration(matrixJobId, {
            status: 'success',
            latency_ms: totalTime,
          });
          matrixJobClosed = true;
        }

        const snapshotAfterMatrix = getSessionStoreSnapshot() as {
          userHash?: string;
          matrixHistory?: unknown[];
        };
        const uhMatrix = snapshotAfterMatrix.userHash ?? userHash;
        const matrixHistory = snapshotAfterMatrix.matrixHistory;
        if (uhMatrix && matrixHistory && matrixHistory.length > 0) {
          try {
            await syncMatrixHistoryToGcp(uhMatrix, matrixHistory as Parameters<typeof syncMatrixHistoryToGcp>[1]);
          } catch (syncErr) {
            console.warn('[6-Image Matrix] syncMatrixHistoryToGcp on complete failed:', syncErr);
          }
        }
        try {
          await saveSessionWithActiveSpace({
            spaces: updatedSpaces,
            currentSpaceId: spaceId ?? undefined,
            currentStep: 'generate',
          });
        } catch (saveErr) {
          console.warn('[6-Image Matrix] saveSessionWithActiveSpace on complete failed:', saveErr);
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
          
          await deductCreditsForImages(userHash, newMatrixImages.map((image) => image.id));
          console.log(`[6-Image Matrix] All credits deducted successfully for ${newMatrixImages.length} images`);
        } catch (creditError) {
          console.warn('[6-Image Matrix] Error deducting credits (tables may not exist yet):', creditError);
          // Nie blokuj aplikacji jeśli odejmowanie kredytów się nie powiodło
        }
      }

      // Do not auto-open login modal here — user can pick a vision and continue; banner and locked tiles open sign-in when needed.

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
      if (matrixJobId && !matrixJobClosed) {
        try {
          await endParticipantGeneration(matrixJobId, {
            status: 'error',
            latency_ms: Math.max(0, Date.now() - matrixGenerationStartTime),
            error_message: 'Generation interrupted',
          });
        } catch (endErr) {
          console.warn('[6-Image Matrix] Failed to close generation job:', endErr);
        }
      }
      // Always cleanup
      isGeneratingRef.current = false;
      currentGenerationRunIdRef.current = null;
      setIsGenerating(false);
      setAbortController(null);
      abortControllerRef.current = null;
      console.log("[6-Image Matrix] ✅ Run completed and cleaned up");
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

    userConfirmedMatrixSelectionRef.current = true;

    const selectionTime = Date.now() - matrixGenerationStartTime;
    console.log(`[6-Image Matrix] User selected image from source: ${image.source} at position ${image.displayIndex}`);

    const ratingsMap = resolveSessionImageRatingsMap(
      (sessionData as { imageRatings?: SessionImageRatingsMap })?.imageRatings,
    );
    const selectedWithRatings = applyRatingsToImage(image, ratingsMap);

    setBlindSelectionMade(true);
    setSelectedImage(selectedWithRatings);
    setHasAnsweredInteriorQuestion(true);
    setShowSourceReveal(false);

    // Union in-memory matrix cache with progressively saved session history
    const sessionMatrixHistory =
      ((sessionData as { matrixHistory?: Array<{ id: string }> } | null)?.matrixHistory ||
        []) as Array<{
        id: string;
        label?: string;
        timestamp?: number;
        imageUrl?: string;
        url?: string;
        base64?: string;
        source?: string;
        isSelected?: boolean;
      }>;
    const matrixById = new Map<string, GeneratedImage>();
    for (const item of sessionMatrixHistory) {
      let imageUrl = item.imageUrl || item.url || '';
      if (!imageUrl && item.base64) {
        imageUrl = `data:image/png;base64,${item.base64}`;
      }
      matrixById.set(item.id, {
        id: item.id,
        url: imageUrl,
        base64: item.base64 || '',
        prompt: item.label || 'Restored from history',
        provider: 'google',
        parameters: {
          modificationType: 'initial',
          modifications: [],
          iterationCount: 0,
          usedOriginal: false,
          source: item.source as GenerationSource | undefined,
        },
        ratings: { aesthetic_match: 0, character: 0, harmony: 0 },
        isFavorite: false,
        createdAt: item.timestamp || Date.now(),
        source: item.source as GenerationSource | undefined,
        displayIndex: 0,
      });
    }
    for (const img of matrixImages) {
      matrixById.set(img.id, img);
    }
    const allMatrixImages = Array.from(matrixById.values()).sort(
      (a, b) => (a.displayIndex || 0) - (b.displayIndex || 0),
    );

    const initialHistory = allMatrixImages.map((img, idx) => ({
      id: img.id,
      type: 'initial' as const,
      label:
        GENERATION_SOURCE_LABELS[img.source!]?.[language] ||
        GENERATION_SOURCE_LABELS[img.source!]?.pl ||
        `Wizja ${idx + 1}`,
      timestamp: img.createdAt || Date.now(),
      imageUrl: img.url,
      base64: img.base64,
      source: img.source,
      isSelected: img.id === image.id,
    }));
    const mergedMatrixHistory = mergeMatrixHistoryRecords(
      sessionMatrixHistory,
      initialHistory,
    );
    setGenerationHistory(initialHistory);
    const selectedHistoryIdx = initialHistory.findIndex((h) => h.id === image.id);
    setCurrentHistoryIndex(selectedHistoryIdx >= 0 ? selectedHistoryIdx : 0);

    // Persist selection including base64 and full history so modify page can use it
    try {
      await updateSessionData({
        selectedImage: {
          id: image.id,
          url: image.url,
          base64: image.base64, // Include base64 for modifications!
          source: image.source,
          provider: image.provider,
          parameters: image.parameters
        },
        blindSelectionMade: true,
        imageRatings: ratingsMap,
        // Merge — do not overwrite progressively saved matrix visions
        matrixHistory: mergedMatrixHistory,
      } as any);
      const uhBlind = (sessionData as any)?.userHash as string | undefined;
      if (uhBlind) {
        try {
          await syncMatrixHistoryToGcp(uhBlind, mergedMatrixHistory);
        } catch (syncErr) {
          console.warn('[Generate] syncMatrixHistoryToGcp on blind selection failed:', syncErr);
        }
        try {
          await saveSessionToGcp(getSessionStoreSnapshot() as unknown as Record<string, unknown>);
        } catch (saveErr) {
          console.warn('[Generate] saveSessionToGcp on blind selection failed:', saveErr);
        }
      }
    } catch (e) {
      console.warn('[Generate] Failed to persist selectedImage/blindSelectionMade to session:', e);
    }
    
    // Collect feedback in background
    (async () => {
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
    })();
  };

  const lightboxNavigableImages = useMemo(() => {
    if (!isMatrixMode || blindSelectionMade) return [];
    const displayOrder = synthesisResult?.displayOrder ?? [];
    return displayOrder
      .map((src) => matrixImages.find((img) => img.source === src && img.provider === 'google'))
      .filter((img): img is GeneratedImage => Boolean(img));
  }, [isMatrixMode, blindSelectionMade, synthesisResult?.displayOrder, matrixImages]);

  const navigateLightboxImage = useCallback(
    (direction: 'prev' | 'next') => {
      if (!selectedImage || lightboxNavigableImages.length <= 1) return;
      const currentIndex = lightboxNavigableImages.findIndex((img) => img.id === selectedImage.id);
      if (currentIndex === -1) return;
      const nextIndex =
        direction === 'next'
          ? (currentIndex + 1) % lightboxNavigableImages.length
          : (currentIndex - 1 + lightboxNavigableImages.length) % lightboxNavigableImages.length;
      setSelectedImage(lightboxNavigableImages[nextIndex]!);
    },
    [selectedImage, lightboxNavigableImages]
  );

  useEffect(() => {
    if (!isLightboxOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsLightboxOpen(false);
        return;
      }
      if (!isMatrixMode || blindSelectionMade || lightboxNavigableImages.length <= 1) return;
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        navigateLightboxImage('prev');
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        navigateLightboxImage('next');
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    isLightboxOpen,
    isMatrixMode,
    blindSelectionMade,
    lightboxNavigableImages.length,
    navigateLightboxImage,
  ]);

  const handleMatrixImageClick = (image: GeneratedImage) => {
    setSelectedImage(image);
    if (matrixImageClickTimerRef.current) {
      clearTimeout(matrixImageClickTimerRef.current);
    }
    matrixImageClickTimerRef.current = setTimeout(() => {
      setIsLightboxOpen(true);
      matrixImageClickTimerRef.current = null;
    }, 250);
  };

  const handleMatrixImageDoubleClick = (image: GeneratedImage) => {
    if (matrixImageClickTimerRef.current) {
      clearTimeout(matrixImageClickTimerRef.current);
      matrixImageClickTimerRef.current = null;
    }
    setIsLightboxOpen(false);
    setSelectedImage(image);
    void handleBlindSelection(image);
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

  const sessionImageRatings = resolveSessionImageRatingsMap(
    (sessionData as { imageRatings?: SessionImageRatingsMap } | null)?.imageRatings,
  );

  const resolveHistoryImageAtIndex = useCallback(
    (index: number): GeneratedImage | null => {
      const node = generationHistory[index];
      if (!node?.id) return null;

      const freshRatingsMap = resolveSessionImageRatingsMap(
        (sessionData as { imageRatings?: SessionImageRatingsMap })?.imageRatings,
      );

      const cached =
        matrixImages.find((img) => img.id === node.id) ||
        generatedImages.find((img) => img.id === node.id) ||
        matrixImages.find((img) => img.url === node.imageUrl) ||
        generatedImages.find((img) => img.url === node.imageUrl);

      let base64Data = (node as { base64?: string }).base64 || cached?.base64 || '';
      if (!base64Data && node.imageUrl?.startsWith('data:')) {
        const parts = node.imageUrl.split(',');
        if (parts.length > 1) base64Data = parts[1] ?? '';
      }

      const resolvedUrl =
        node.imageUrl ||
        cached?.url ||
        (base64Data ? `data:image/png;base64,${base64Data}` : '');
      if (!resolvedUrl) return null;

      return applyRatingsToImage(
        {
          id: node.id,
          url: resolvedUrl,
          base64: base64Data,
          prompt: node.label || cached?.prompt || 'From history',
          provider: cached?.provider || 'google',
          parameters: cached?.parameters ?? {
            modificationType: node.type,
            modifications: [],
            iterationCount: 0,
            usedOriginal: false,
          },
          ratings: { aesthetic_match: 0, character: 0, harmony: 0 },
          isFavorite: cached?.isFavorite ?? false,
          createdAt: node.timestamp || cached?.createdAt || Date.now(),
          source: cached?.source,
          displayIndex: cached?.displayIndex,
          isBlindSelected: cached?.isBlindSelected,
        } as GeneratedImage,
        freshRatingsMap,
      );
    },
    [generationHistory, generatedImages, matrixImages, sessionData],
  );

  const safeHistoryIndex =
    generationHistory.length > 0
      ? Math.min(Math.max(0, currentHistoryIndex), generationHistory.length - 1)
      : 0;
  const activeImageId = selectedImage?.id;
  const tasteRatingPanelVisible =
    (blindSelectionMade || !isMatrixMode) &&
    shouldShowTasteRating(activeImageId, sessionImageRatings);
  const currentImageActionsEnabled =
    activeImageId != null && hasTasteRating(activeImageId, sessionImageRatings);

  const mergeImageRatingsIntoCollections = useCallback(
    (imageWithRatings: GeneratedImage) => {
      setGeneratedImages((prev) => {
        const idx = prev.findIndex((img) => img.id === imageWithRatings.id);
        if (idx >= 0) {
          return prev.map((img) => (img.id === imageWithRatings.id ? imageWithRatings : img));
        }
        return [...prev, imageWithRatings];
      });
      setMatrixImages((prev) => {
        const idx = prev.findIndex((img) => img.id === imageWithRatings.id);
        if (idx < 0) return prev;
        return prev.map((img) => (img.id === imageWithRatings.id ? imageWithRatings : img));
      });
    },
    [],
  );

  // Navigate through generation history
  const handleHistoryNodeClick = (index: number) => {
    if (index < 0 || index >= generationHistory.length) return;

    const historyNode = generationHistory[index];
    const imageWithRatings = resolveHistoryImageAtIndex(index);
    if (!imageWithRatings) return;

    const freshRatingsMap = resolveSessionImageRatingsMap(
      (sessionData as { imageRatings?: SessionImageRatingsMap })?.imageRatings,
    );
    const nodeId = historyNode.id;
    const needsRating = shouldShowTasteRating(nodeId, freshRatingsMap);

    if (showOriginalRoomPhoto) {
      setShowOriginalRoomPhoto(false);
    }

    setCurrentHistoryIndex(index);
    setSelectedImage(imageWithRatings);
    mergeImageRatingsIntoCollections(imageWithRatings);
    setIdaComment(null);
    setHasAnsweredInteriorQuestion(true);
    setShowModifications(false);
    setShowSourceReveal(!needsRating);

    const selectedPayload = {
      id: imageWithRatings.id,
      url: imageWithRatings.url,
      base64: imageWithRatings.base64,
      source: imageWithRatings.source,
      provider: imageWithRatings.provider ?? 'google',
      parameters: imageWithRatings.parameters,
    };

    void updateSessionData({
      selectedImage: selectedPayload,
    } as any);

    if (process.env.NODE_ENV === 'development') {
      console.debug('[Generate] history click', {
        nodeId,
        sessionScore: freshRatingsMap[nodeId]?.aesthetic_match,
        needsRating,
        tasteRatingPanelVisible: needsRating,
      });
    }

    requestAnimationFrame(() => {
      tasteRatingPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  };

  // Use centralized parameters from useGoogleAI
  const getOptimalParameters = getGenerationParameters;

  type CreditAction = 'generate' | 'regenerate' | 'upscale' | 'save' | 'matrix';

  const runGenNudgeTelemetry = (event: LoginNudgeEvent) => {
    const uid = (sessionData as { userHash?: string } | null)?.userHash;
    if (!uid) return;
    void logBehavioralEvent(uid, 'login_nudge', { page: 'flow-generate', nudge: event });
  };

  /** Guest matrix: open unlock modal from banner, locked tiles, or CTAs (easy re-entry to Google sign-in). */
  const openAnonUnlockLoginModal = useCallback(() => {
    const uid = (sessionData as { userHash?: string } | null)?.userHash;
    if (uid) {
      void logBehavioralEvent(uid, 'login_nudge', {
        page: 'flow-generate',
        nudge: 'anon_unlock_manual_open',
      }).catch(() => {});
    }
    setPostAnonGenLoginOpen(true);
  }, [sessionData]);

  // Anonymous 1/6 preview: auto-select the only real tile so the primary CTA is enabled without extra tap.
  useEffect(() => {
    if (!isAnonMatrixPreview || blindSelectionMade || isAuthenticated) return;
    const ready = matrixImages.filter((img) => img.provider === 'google');
    if (ready.length !== 1) return;
    const one = ready[0]!;
    setSelectedImage((prev) => (prev?.id === one.id ? prev : one));
  }, [isAnonMatrixPreview, blindSelectionMade, isAuthenticated, matrixImages]);

  const checkCreditsWithAction = async (userHash: string, amount: number, action: CreditAction) => {
    const response = await fetch('/api/credits/check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...creditsAuthHeaders() },
      credentials: 'include',
      body: JSON.stringify({
        userHash,
        amount,
        action,
        ...(!isAuthenticated ? { pathScope: pathTypeForCredits } : {}),
      }),
    });
    const data = await response.json().catch(() => ({}));
    if (response.status === 429) {
      return {
        allowed: false as const,
        code: 429 as const,
        reason: data.reason as string | undefined,
        scope: data.scope as string | undefined,
      };
    }
    if (!response.ok) {
      throw new Error((data as { error?: string }).error || 'Failed to check credits');
    }
    if (data.available === false) {
      return { allowed: false as const, code: 200, reason: 'quota' as const };
    }
    return { allowed: true as const, code: 200 };
  };

  const deductCreditsViaApi = async (userHash: string, generationId: string) => {
    const response = await fetch('/api/credits/deduct', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...creditsAuthHeaders() },
      credentials: 'include',
      body: JSON.stringify({
        userHash,
        generationId,
        ...(!isAuthenticated ? { pathScope: pathTypeForCredits } : {}),
      }),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to deduct credits');
    }
  };

  const deductCreditsForImages = async (userHash: string, imageIds: string[]) => {
    const validIds = imageIds.filter(Boolean);
    await Promise.all(validIds.map((imageId) => deductCreditsViaApi(userHash, imageId)));
  };

  // Guest full path: surface exhausted free generation before another run ends in a confusing UI state
  useEffect(() => {
    if (!isSessionInitialized || !isAnonMatrixPreview || isAuthenticated) {
      setAnonGuestQuotaBlocked(false);
      return;
    }
    const uh = (sessionData as { userHash?: string } | null)?.userHash;
    if (!uh) return;
    let cancelled = false;
    void (async () => {
      try {
        const cred = await checkCreditsWithAction(uh, 10, 'generate');
        if (cancelled) return;
        if (cred && !cred.allowed && cred.code === 429) {
          setAnonGuestQuotaBlocked(true);
        } else {
          setAnonGuestQuotaBlocked(false);
        }
      } catch {
        if (!cancelled) setAnonGuestQuotaBlocked(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isSessionInitialized, isAnonMatrixPreview, isAuthenticated, sessionData?.userHash, pathTypeForCredits]);

  const matrixAnonResumeOnce = useRef(false);

  useEffect(() => {
    if (!isAuthenticated || !isApiReady) return;
    const snap = getSessionStoreSnapshot() as unknown as Record<string, unknown> & {
      matrixAnonPending?: { source: string; prompt: string }[];
      userHash?: string;
    };
    const pending = snap.matrixAnonPending;
    if (!Array.isArray(pending) || pending.length === 0) return;
    if (matrixAnonResumeOnce.current) return;
    if (isGeneratingRef.current) return;

    void (async () => {
      const userHash = snap.userHash;
      if (!userHash) return;
      let credit: Awaited<ReturnType<typeof checkCreditsWithAction>> | null = null;
      try {
        credit = await checkCreditsWithAction(userHash, pending.length * 10, 'matrix');
      } catch (e) {
        console.warn('[Matrix resume] credit check', e);
        return;
      }
      if (credit && !credit.allowed) {
        if (credit.code === 429) setMatrixLoginWallOpen(true);
        return;
      }
      matrixAnonResumeOnce.current = true;
      isGeneratingRef.current = true;
      setIsGenerating(true);
      setStatusMessage({
        pl: 'Dokańczam pozostałe warianty z zapisanej sesji…',
        en: 'Completing remaining variants from your saved session…',
      });
      try {
        let roomImage = snap.roomImage as string | undefined;
        if (!roomImage) {
          const s = safeSessionStorage.getItem('aura_session_room_image');
          if (s) roomImage = s;
        }
        if (!roomImage) {
          setError(
            t({ pl: 'Brak zdjęcia pomieszczenia — nie można wznowić generacji.', en: 'No room image — cannot resume generation.' }),
          );
          matrixAnonResumeOnce.current = false;
          return;
        }
        const roomEmpty = snap.roomImageEmpty as string | undefined;
        let processedRoomImage = roomEmpty || roomImage;
        processedRoomImage = processedRoomImage.includes(',') ? processedRoomImage.split(',')[1] : processedRoomImage;

        const baseParams = getGenerationParameters('preview', generationCount);
        let parameters = {
          ...baseParams,
          image_size: 1024,
          width: 1024,
          height: 1024,
        };
        try {
          const prepared = await prepareGenerationDimensionsFromRoomBase64(processedRoomImage);
          parameters = {
            ...baseParams,
            image_size: 1024,
            width: prepared.normalizedWidth,
            height: prepared.normalizedHeight,
            aspect_ratio: prepared.aspectRatio,
          };
        } catch (e) {
          console.warn('[Matrix resume] dimension prep failed', e);
        }
        const runId =
          typeof crypto !== 'undefined' && 'randomUUID' in crypto
            ? crypto.randomUUID()
            : `resume-${Date.now()}`;
        const prompts = pending.map((p) => ({
          source: p.source as GenerationSource,
          prompt: p.prompt,
        }));
        const genRes = await generateSixImagesParallelWithGoogle(
          {
            prompts,
            base_image: processedRoomImage,
            inspiration_images: undefined,
            style: (snap as { visualDNA?: { dominantStyle?: string } }).visualDNA?.dominantStyle || 'modern',
            generation_run_id: runId,
            parameters: {
              ...parameters,
              strength: parameters.strength ?? 0.55,
            },
          },
          undefined,
        );
        if (!genRes.successful_count) {
          setError(
            t({ pl: 'Nie udało się wznowić generacji obrazów.', en: 'Failed to resume image generation.' }),
          );
          matrixAnonResumeOnce.current = false;
          return;
        }
        const displayOrder = synthesisResult?.displayOrder || [];
        const newMatrixImages: GeneratedImage[] = genRes.results
          .filter((r) => r.success)
          .map((result) => {
            const displayIndex = displayOrder.indexOf(result.source);
            return {
              id: `matrix-resume-${runId}-${result.source}`,
              url: `data:image/png;base64,${result.image}`,
              base64: result.image,
              prompt: result.prompt,
              parameters: { ...parameters, source: result.source },
              ratings: { aesthetic_match: 0, character: 0, harmony: 0 },
              isFavorite: false,
              createdAt: Date.now(),
              source: result.source,
              displayIndex: displayIndex >= 0 ? displayIndex : 0,
              isBlindSelected: false,
              provider: 'google' as const,
            };
          });
        newMatrixImages.sort((a, b) => (a.displayIndex || 0) - (b.displayIndex || 0));
        setMatrixImages((prev) => {
          const bySource = new Map(prev.map((img) => [img.source, img]));
          for (const img of newMatrixImages) {
            bySource.set(img.source, img);
          }
          return Array.from(bySource.values()).sort(
            (a, b) => (a.displayIndex || 0) - (b.displayIndex || 0),
          );
        });
        setGeneratedImages((prev) => {
          const bySource = new Map(prev.map((img) => [img.source, img]));
          for (const img of newMatrixImages) {
            bySource.set(img.source, img);
          }
          return Array.from(bySource.values());
        });
        await updateSessionData({ matrixAnonPending: [] } as Record<string, unknown>);
        try {
          await saveSessionToGcp(
            getSessionStoreSnapshot() as unknown as Record<string, unknown>,
          );
        } catch (e) {
          console.warn('[generate] saveSessionToGcp failed (matrix resume):', e);
        }
        await deductCreditsForImages(
          userHash,
          newMatrixImages.map((i) => i.id),
        );
        setStatusMessage({
          pl: 'Gotowe! Wybierz swoje ulubione wnętrze.',
          en: 'Ready! Choose your favorite interior.',
        });
        void logBehavioralEvent(userHash, 'matrix_resumed_after_login', {
          page: 'flow-generate',
          resumedVariantCount: newMatrixImages.length,
        }).catch(() => {});
      } catch (e) {
        console.error('[Matrix resume]', e);
        matrixAnonResumeOnce.current = false;
        setError(
          t({ pl: 'Błąd wznawiania generacji obrazów.', en: 'Error resuming image generation.' }),
        );
      } finally {
        isGeneratingRef.current = false;
        setIsGenerating(false);
      }
    })();
  }, [isAuthenticated, isApiReady, sessionData?.matrixAnonPending, sessionData?.userHash]);

  const handleInitialGeneration = async (force = false) => {
    console.log('[Generate] handleInitialGeneration called', { 
      isApiReady, 
      generationCount, 
      force, 
      isMatrixMode, 
      isSessionInitialized,
      isGenerating: isGeneratingRef.current,
      currentRunId: currentGenerationRunIdRef.current
    });
    
    // Check ref to prevent duplicate calls
    if (isGeneratingRef.current) {
      console.log('[Generate] ⚠️ Generation already in progress (ref check), skipping', { 
        currentRunId: currentGenerationRunIdRef.current 
      });
      return;
    }
    
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
    if (userHash && !isMatrixMode) {
      let credit: Awaited<ReturnType<typeof checkCreditsWithAction>> | null = null;
      try {
        credit = await checkCreditsWithAction(userHash, 10, 'generate');
      } catch (creditError) {
        console.warn('Error checking credits (tables may not exist yet):', creditError);
      }

      if (credit && !credit.allowed) {
        if (credit.code === 429) {
          setPreGenLoginOpen(true);
          return;
        }
        setError(
          t({
            pl: 'Nie masz wystarczającej liczby kredytów. Potrzebujesz 10 kredytów na jeden obraz.',
            en: 'You do not have enough credits. You need 10 credits for one image.',
          }),
        );
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
    
    // Use the SAME structured JSON pipeline as the matrix. Single representative source
    // (Mixed blends all available aesthetic data and degrades gracefully on sparse input).
    const legacyRoomType = (typedSessionData.roomType as string) || 'living room';
    const legacySynth = await synthesizeSelectedPrompts(
      sessionData as any,
      legacyRoomType,
      [GenerationSource.Mixed],
    );
    const prompt =
      legacySynth[GenerationSource.Mixed]?.prompt ||
      Object.values(legacySynth)[0]?.prompt ||
      '';

    let cleanForDims = processedRoomImage;
    if (typeof cleanForDims === 'string' && cleanForDims.includes(',')) {
      cleanForDims = cleanForDims.split(',')[1];
    }
    let parameters = {
      ...getOptimalParameters('initial', generationCount),
      image_size: 512,
      width: 512,
      height: 512,
    };
    try {
      const prepared = await prepareGenerationDimensionsFromRoomBase64(cleanForDims, { maxLongEdge: 512 });
      parameters = {
        ...getOptimalParameters('initial', generationCount),
        image_size: 512,
        width: prepared.normalizedWidth,
        height: prepared.normalizedHeight,
        aspect_ratio: prepared.aspectRatio,
      };
      console.log('[Legacy Generation] Prepared dimensions from room:', {
        aspect_ratio: prepared.aspectRatio,
        normalized: `${prepared.normalizedWidth}x${prepared.normalizedHeight}`,
      });
    } catch (e) {
      console.warn('[Legacy Generation] Dimension prep failed, using 512 square', e);
    }
    
    console.log("Google Structured Prompt:", prompt);
    console.log("Google Parameters:", parameters);

    let legacyJobId: string | null = null;
    let legacyJobClosed = false;
    try {
      const userHash = (sessionData as any).userHash;
      if (userHash) {
        legacyJobId = await startParticipantGeneration(userHash, {
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
        if (legacyJobId) {
          await endParticipantGeneration(legacyJobId, {
            status: 'error',
            latency_ms: 0,
            error_message: 'Empty response from server',
          });
          legacyJobClosed = true;
        }
        return;
      }

      let newImages: GeneratedImage[] = response.results.map((result: any, index: number) => ({
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
        ratings: { aesthetic_match: 0, character: 0, harmony: 0 },
        isFavorite: false,
        createdAt: Date.now(),
      }));

      if (isAnonSingle && !isAuthenticated) {
        newImages = newImages.slice(0, 1);
      }

      setGeneratedImages(newImages);
      setSelectedImage(newImages[0]);
      setGenerationCount((prev) => prev + 1);
      
      setHasAnsweredInteriorQuestion(true);

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
        
        // Save all generated images to participant_images
        const imagesToSave = newImages.map(img => ({
          url: img.url,
          type: 'generated' as const,
          is_favorite: img.isFavorite || false,
          generation_id: (sessionData as any)?.currentGenerationId || undefined,
          space_id: spaceId
        }));
        const batchSaveResult = await saveParticipantImages(userHash, imagesToSave);
        if (batchSaveResult.failed > 0) {
          console.error(
            '[generate] saveParticipantImages partial failure (batch):',
            batchSaveResult,
          );
        }

        const updatedSpaces = addGeneratedImageToSpace(
          (sessionData as any)?.spaces || [],
          spaceId,
          newImages[0]?.url || ''
        );
        await updateSessionData({
          spaces: updatedSpaces,
          currentSpaceId: spaceId,
          currentStep: 'generate',
        });
      }
      
      // Complete loading
      setLoadingProgress(100);
      setEstimatedTime(0);
      setStatusMessage({ pl: "Gotowe!", en: "Ready!" });
      
      // Add to history
      const historyNode = {
        id: newImages[0].id,
        type: 'initial' as const,
        label: t({ pl: 'Początkowa generacja', en: 'Initial generation' }),
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
        if (legacyJobId) {
          await endParticipantGeneration(legacyJobId, { status: 'success', latency_ms: 0 });
          legacyJobClosed = true;
          // Odejmij kredyty po udanej generacji (użyj API route - działa po stronie serwera z service_role)
          if (userHash) {
            try {
              if (!isAuthenticated) {
                await deductCreditsViaApi(userHash, newImages[0].id);
                console.log('[Credits] Anon: single deduct for initial generation');
              } else {
                await deductCreditsForImages(userHash, newImages.map((image) => image.id));
                console.log(`[Credits] Credits deducted successfully for ${newImages.length} image(s)`);
              }
            } catch (creditError) {
              console.warn('[Credits] Error deducting credits (tables may not exist yet):', creditError);
              // Nie blokuj aplikacji jeśli odejmowanie kredytów się nie powiodło
            }
            if (!isAuthenticated) {
              setPostAnonGenLoginOpen(true);
            }
          }
        }
      } catch {}
    } catch (err) {
      console.error('Generation failed in handleInitialGeneration:', err);
      setError(err instanceof Error ? err.message : t({ pl: 'Wystąpił nieznany błąd podczas generacji.', en: 'An unknown error occurred during generation.' }));
      if (legacyJobId && !legacyJobClosed) {
        try {
          await endParticipantGeneration(legacyJobId, {
            status: 'error',
            latency_ms: 0,
            error_message: String(err),
          });
          legacyJobClosed = true;
        } catch {}
      }
    } finally {
      if (legacyJobId && !legacyJobClosed) {
        try {
          await endParticipantGeneration(legacyJobId, {
            status: 'error',
            latency_ms: 0,
            error_message: 'Generation interrupted',
          });
        } catch {}
      }
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

    const modUserHash = (sessionData as { userHash?: string } | null)?.userHash;
    if (modUserHash) {
      try {
        const cr = await checkCreditsWithAction(modUserHash, 10, 'regenerate');
        if (!cr.allowed) {
          if (cr.code === 429) {
            setPostAnonGenLoginOpen(true);
            return;
          }
          setError(
            t({
              pl: 'Zaloguj się lub doładuj kredyty, aby modyfikować obraz.',
              en: 'Sign in or add credits to modify the image.',
            }),
          );
          return;
        }
      } catch (e) {
        console.warn('[Modification] credit check:', e);
      }
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

    let googleModificationParameters = {
      ...parameters,
      strength: parameters.strength ?? (isMacro ? 0.75 : 0.25),
    };
    try {
      const cleanMod =
        typeof baseImageSource === 'string' && baseImageSource.includes(',')
          ? baseImageSource.split(',')[1]
          : baseImageSource;
      const prepared = await prepareGenerationDimensionsFromRoomBase64(cleanMod);
      googleModificationParameters = {
        ...parameters,
        width: prepared.normalizedWidth,
        height: prepared.normalizedHeight,
        aspect_ratio: prepared.aspectRatio,
        strength: parameters.strength ?? (isMacro ? 0.75 : 0.25),
      };
    } catch (e) {
      console.warn('[Modification] Dimension prep failed, using default square params', e);
    }
    setIsGenerating(true);
    setIsModifying(true);
    setLoadingStage(2);
    setLoadingProgress(40);
    setStatusMessage({ pl: `Modyfikuję obraz: ${t(modification.label)}...`, en: `Modifying image: ${t(modification.label)}...` });
    setEstimatedTime(30);
    setIdaComment(null); // Reset comment for new generation

    let modJobId: string | null = null;
    let modJobClosed = false;
    const closeModJob = async (status: 'success' | 'error', error_message?: string) => {
      if (!modJobId || modJobClosed) return;
      await endParticipantGeneration(modJobId, {
        status,
        latency_ms: 0,
        ...(error_message ? { error_message } : {}),
      });
      modJobClosed = true;
    };
    try {
      const userHash = (sessionData as any).userHash;
      if (userHash) {
        modJobId = await startParticipantGeneration(userHash, {
          type: isMacro ? 'macro' : 'micro',
          prompt: modificationPrompt,
          parameters: googleModificationParameters,
          has_base_image: true,
          modification_label: t(modification.label),
        });
      }

      // Update progress during API call
      setLoadingProgress(60);
      setStatusMessage({ pl: `Przetwarzam modyfikację: ${t(modification.label)}...`, en: `Processing modification: ${t(modification.label)}...` });
      
      // Use Google API for modifications (instead of Modal/FLUX)
      const response = await generateSixImagesParallelWithGoogle({
        prompts: [{ source: 'implicit' as GenerationSource, prompt: modificationPrompt }],
        base_image: baseImageSource,
        style: isMacro ? modification.id : (selectedImage.parameters?.style || 'modern'),
        parameters: googleModificationParameters,
      });
      
      // Update progress after API response
      setLoadingProgress(85);
      setStatusMessage({ pl: "Finalizuję zmodyfikowany obraz...", en: "Finalizing modified image..." });

      // Check for errors in response
      if (!response) {
        console.error("[Modification] No response from API");
        setIsGenerating(false);
        setIsModifying(false);
        setLastFailedModification(modification);
        setError(t({ pl: "Nie udało się zmodyfikować obrazu. Brak odpowiedzi z serwera.", en: "Failed to modify image. No response from server." }));
        await closeModJob('error', 'No response from server');
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
        await closeModJob('error', String(errorMessage));
        return;
      }

      // Check if we have any successful results
      if (!response.results || response.results.length === 0) {
        console.error("[Modification] Empty results array");
        setIsGenerating(false);
        setIsModifying(false);
        setLastFailedModification(modification);
        setError(t({ pl: "Nie udało się zmodyfikować obrazu. Otrzymano pustą odpowiedź z serwera.", en: "Failed to modify image. Received empty response from server." }));
        await closeModJob('error', 'Empty results');
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
        await closeModJob('error', 'All attempts failed');
        return;
      }

      // Clear failed modification on success
      setLastFailedModification(null);

      const isCustomModification = Boolean(customPrompt) || modification.id === 'custom_text';
      const modLogEntry = buildModificationPromptLogEntry({
        modification,
        modificationPrompt,
        source: isCustomModification ? 'custom' : 'preset',
        userInstruction: isCustomModification ? modification.label.pl : undefined,
      });
      const snap = getSessionStoreSnapshot();
      await updateSessionData({
        modificationPromptLog: appendModificationPromptLog(snap.modificationPromptLog, modLogEntry),
      } as any);

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
        ratings: { aesthetic_match: 0, character: 0, harmony: 0 },
        isFavorite: false,
        createdAt: Date.now(),
      };

      // Add to generatedImages so it can be found in history, but not to matrixImages
      // This way modifications appear in history but not in the 6-image matrix grid
      setGeneratedImages((prev) => [...prev, newImage]);
      setSelectedImage(newImage);
      setGenerationCount((prev) => prev + 1);
      setShowModifications(false);
      setBlindSelectionMade(true);
      setHasAnsweredInteriorQuestion(true);
      setShowSourceReveal(false);
      
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
      
      // Save modified image to spaces (local) and participant_images (Supabase)
      const currentSpaces = (sessionData as any)?.spaces || [];
      let updatedSpaces = currentSpaces;
      const activeSpaceId = (sessionData as any)?.currentSpaceId;
      const activeSpaceName = (sessionData as any)?.roomName;
      const spaceId = userHash
        ? await getOrCreateSpaceId(userHash, {
            spaceId: activeSpaceId,
            name: activeSpaceName || 'Moja Przestrzeń'
          })
        : null;
      if (spaceId) {
        const imagesToSave = [{
          url: newImage.url,
          type: 'generated' as const,
          is_favorite: newImage.isFavorite || false,
          source: selectedImage?.source,
          generation_id: modJobId ?? undefined,
          space_id: spaceId
        }];
        const modSaveResult = await saveParticipantImages(userHash, imagesToSave);
        if (modSaveResult.failed > 0) {
          console.error(
            '[generate] saveParticipantImages partial failure (modification):',
            modSaveResult,
          );
        }
      }
      updatedSpaces = addGeneratedImageToSpace(
        updatedSpaces,
        spaceId ?? activeSpaceId,
        newImage.url,
        activeSpaceName,
        undefined,
        undefined,
        newImage.isFavorite || false
      );
      const sessionUpdates: any = { spaces: updatedSpaces, currentStep: 'generate' };
      if (spaceId) {
        sessionUpdates.currentSpaceId = spaceId;
      } else if (!activeSpaceId && updatedSpaces.length > 0) {
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
      setGenerationHistory((prev) => {
        const next = [...prev, historyNode];
        setCurrentHistoryIndex(next.length - 1);
        return next;
      });

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
        selectedImage: {
          id: newImage.id,
          url: newImage.url,
          source: selectedImage?.source,
          provider: 'google' as const
        },
        blindSelectionMade: true
      } as any);

      try {
        await saveSessionWithActiveSpace(sessionUpdates);
      } catch (e) {
        console.warn('[generate] saveSessionWithActiveSpace failed (modification):', e);
      }

      // Persist generation modification and user choice
      try {
        const projectIdPersist = await getOrCreateProjectId((sessionData as any).userHash);
        if (projectIdPersist) {
          // legacy analytics disabled after refactor
        }
      } catch (e) {
        console.warn('Supabase persist failed (modification):', e);
      }

      try {
        await closeModJob('success');
      } catch {}
      if (userHash) {
        try {
          await deductCreditsViaApi(userHash, newImage.id);
          console.log('[Credits] Credits deducted successfully for modification image');
        } catch (creditError) {
          console.warn('[Credits] Error deducting credits for modification:', creditError);
        }
      }
    } catch (err) {
      console.error('Modification failed:', err);
      setIsGenerating(false);
      setIsModifying(false);
      setError(err instanceof Error ? err.message : t({ pl: 'Wystąpił nieznany błąd podczas modyfikacji.', en: 'An unknown error occurred during modification.' }));
      try {
        await closeModJob('error', String(err));
      } catch {}
    } finally {
      if (modJobId && !modJobClosed) {
        try {
          await endParticipantGeneration(modJobId, {
            status: 'error',
            latency_ms: 0,
            error_message: 'Modification interrupted',
          });
        } catch {}
      }
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
      const baseMicro = getOptimalParameters('micro', generationCount);
      let removeParams = {
        ...baseMicro,
        strength: 0.3,
      };
      try {
        const raw = selectedImage.base64;
        const cleanRm = typeof raw === 'string' && raw.includes(',') ? raw.split(',')[1] : raw;
        const prepared = await prepareGenerationDimensionsFromRoomBase64(cleanRm);
        removeParams = {
          ...baseMicro,
          width: prepared.normalizedWidth,
          height: prepared.normalizedHeight,
          aspect_ratio: prepared.aspectRatio,
          strength: 0.3,
        };
      } catch (e) {
        console.warn('[Remove furniture UI] dimension prep failed', e);
      }

      const response = await generateSixImagesParallelWithGoogle({
        prompts: [{ source: 'implicit' as GenerationSource, prompt: removeFurniturePrompt }],
        base_image: selectedImage.base64,
        style: 'empty',
        parameters: removeParams,
      });

      if (!response || !response.results || response.results.length === 0 || !response.results[0]?.image) {
        setError(t({ pl: "Nie udało się usunąć mebli.", en: "Failed to remove furniture." }));
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
        ratings: { aesthetic_match: 0, character: 0, harmony: 0 },
        isFavorite: false,
        createdAt: Date.now(),
      };

      setGeneratedImages((prev) => [...prev, newImage]);
      setSelectedImage(newImage);
      setGenerationCount((prev) => prev + 1);
      setShowModifications(false);
      setHasAnsweredInteriorQuestion(true);
      setShowSourceReveal(false);

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
      setError(t({ pl: "Nie znaleziono oryginalnego zdjęcia z room setup. Proszę wrócić do kroku uploadu zdjęcia.", en: "Original photo from room setup not found. Please return to the photo upload step." }));
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

  const buildMacroPrompt = (modification: ModificationOption) =>
    buildFullFlowMacroModificationPrompt(modification);

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

  const interiorAdvanceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (interiorAdvanceTimeoutRef.current) clearTimeout(interiorAdvanceTimeoutRef.current);
    };
  }, []);

  // Interior question removed — selection / first generated image already implies ownership.
  useEffect(() => {
    if (!selectedImage || hasAnsweredInteriorQuestion) return;
    if (
      blindSelectionMade ||
      showSourceReveal ||
      (!isMatrixMode && generatedImages.length > 0)
    ) {
      setHasAnsweredInteriorQuestion(true);
    }
  }, [
    blindSelectionMade,
    showSourceReveal,
    selectedImage,
    hasAnsweredInteriorQuestion,
    isMatrixMode,
    generatedImages.length,
  ]);

  useEffect(() => {
    if (generationHistory.length === 0) return;
    if (currentHistoryIndex < 0 || currentHistoryIndex >= generationHistory.length) {
      setCurrentHistoryIndex(
        Math.min(Math.max(0, currentHistoryIndex), generationHistory.length - 1),
      );
    }
  }, [generationHistory.length, currentHistoryIndex]);

  const handleImageRating = async (
    imageId: string,
    rating: keyof GeneratedImage['ratings'],
    value: number,
    options?: { suppressProgress?: boolean },
  ) => {
    const applyRating = (img: GeneratedImage): GeneratedImage => ({
      ...img,
      ratings: { ...img.ratings, [rating]: value },
    });

    setGeneratedImages((prev) =>
      prev.map((img) => (img.id === imageId ? applyRating(img) : img)),
    );
    setMatrixImages((prev) =>
      prev.map((img) => (img.id === imageId ? applyRating(img) : img)),
    );

    setSelectedImage((prev) => (prev?.id === imageId ? applyRating(prev) : prev));

    if (rating === 'aesthetic_match' && value > 0) {
      setShowSourceReveal(true);
    }

    const ratedBase = selectedImage?.id === imageId ? selectedImage : null;
    if (ratedBase && !options?.suppressProgress) {
      const updatedRatings = { ...ratedBase.ratings, [rating]: value };

      const allRatingsComplete = updatedRatings.aesthetic_match > 0;

      if (allRatingsComplete) {
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

    const snapRatings = normalizeSessionImageRatingsMap(
      (getSessionStoreSnapshot() as { imageRatings?: SessionImageRatingsMap }).imageRatings,
    );
    const nextRatings =
      rating === 'aesthetic_match' && value > 0
        ? writeAestheticRatingToMap(snapRatings, imageId, value)
        : {
            ...snapRatings,
            [imageId]: {
              ...(snapRatings[imageId] || {}),
              [rating]: value,
              ratedAt: Date.now(),
              timestamp: Date.now(),
            },
          };
    await updateSessionData({
      imageRatings: nextRatings,
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
    const freshRatingsMap = resolveSessionImageRatingsMap(
      (sessionData as { imageRatings?: SessionImageRatingsMap })?.imageRatings,
    );
    const imageWithRatings = applyRatingsToImage(image, freshRatingsMap);
    setSelectedImage(imageWithRatings);
    mergeImageRatingsIntoCollections(imageWithRatings);
    setHasAnsweredInteriorQuestion(true);
  };

  const handleContinue = () => {
    stopAllDialogueAudio();
    router.push('/flow/survey1');
  };

  /** Guest can still continue the flow even when anonymous generation quota is exhausted. */
  const showAnonNoImageQuotaBlock =
    isAnonMatrixPreview &&
    !isAuthenticated &&
    anonGuestQuotaBlocked &&
    matrixImages.length === 0 &&
    generatedImages.length === 0 &&
    !sessionHasStoredMatrixImages;

  const guestQuotaBlockedWithVision =
    isAnonMatrixPreview &&
    !isAuthenticated &&
    anonGuestQuotaBlocked &&
    (matrixImages.length > 0 || generatedImages.length > 0 || sessionHasStoredMatrixImages);

  useEffect(() => {
    if (guestQuotaBlockedWithVision) {
      setError(null);
    }
  }, [guestQuotaBlockedWithVision]);

  const prevAuthenticatedRef = useRef(false);
  useEffect(() => {
    if (isAuthenticated && !prevAuthenticatedRef.current) {
      matrixAnonResumeOnce.current = false;
    }
    prevAuthenticatedRef.current = isAuthenticated;
  }, [isAuthenticated]);

  return (
    <div className="w-full flex flex-col relative">
      
      <div className="absolute inset-0 bg-gradient-radial from-pearl-50 via-platinum-50 to-silver-100 -z-10" />
      {/* Ensure navigation is always accessible - no blocking overlays */}
      <div className="w-full px-4 sm:px-8 pb-8 pt-2 relative z-10 xl:flex-1 xl:min-h-0">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="space-y-4"
        >
          {/* Only show LoadingProgress if NOT in matrix mode (when placeholders are visible) */}
          {/* Hide LoadingProgress completely when in matrix mode - placeholders show progress instead */}
          {(isLoading || !isApiReady) && !isMatrixMode && !showAnonNoImageQuotaBlock && (
            <div className="flex items-center justify-center py-12">
              <LoadingProgress
                currentStage={loadingStage}
                message={t(statusMessage)}
                progress={loadingProgress}
                estimatedTimeRemaining={estimatedTime}
                onCancel={isLoading ? () => {
                  setError(t({ pl: "Generowanie anulowane przez użytkownika", en: "Generation cancelled by user" }));
                  setLoadingProgress(0);
                } : undefined}
              />
            </div>
          )}

          {showAnonNoImageQuotaBlock ? (
            <div className="flex flex-col items-center justify-center py-12 min-h-[55vh] px-2">
              <GlassCard className="p-8 max-w-lg w-full border-amber-300/60 bg-amber-50/30 shadow-lg">
                <h2 className="text-lg font-semibold text-graphite text-center mb-3 font-modern">
                  {t({ pl: 'Odblokuj pełne doświadczenie z IDA', en: 'Unlock the full experience with IDA' })}
                </h2>
                <p className="text-sm text-graphite/90 text-center leading-relaxed">
                  {t({
                    pl: `Załóż konto, a dostaniesz ${String(FREE_GRANT_CREDITS)} kredytów na kolejne generacje, zobaczysz wszystkie obrazy i zapiszesz sesję, żeby wrócić do projektu w dowolnym momencie. Jeśli chcesz, możesz też przejść dalej bez konta.`,
                    en: `Create an account to get ${String(FREE_GRANT_CREDITS)} credits for more generations, see all images, and save your session so you can return to this project anytime. You can also continue without an account.`,
                  })}
                </p>
                <div className="flex flex-col sm:flex-row justify-center gap-3 mt-8">
                  <GlassButton
                    type="button"
                    onClick={() => {
                      setPreGenLoginOpen(true);
                    }}
                    className="px-8 py-3 text-base whitespace-normal break-words"
                  >
                    {t({ pl: `Odbierz ${String(FREE_GRANT_CREDITS)} kredytów`, en: `Claim ${String(FREE_GRANT_CREDITS)} credits` })}
                  </GlassButton>
                  <GlassButton
                    type="button"
                    variant="secondary"
                    onClick={handleContinue}
                    className="px-8 py-3 text-base whitespace-normal break-words"
                  >
                    {t({ pl: 'Kontynuuj bez konta', en: 'Continue without account' })}
                  </GlassButton>
                </div>
              </GlassCard>
            </div>
          ) : (
            <>
          {error && !guestQuotaBlockedWithVision && (
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
          {(isMatrixMode ||
            isGenerating ||
            matrixImages.length > 0 ||
            (isAnonMatrixPreview && sessionHasStoredMatrixImages)) &&
            !blindSelectionMade && (
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
                <h1 className="text-2xl font-bold text-graphite mb-2">
                  {isGenerating
                    ? t({ pl: 'Generowanie wizji...', en: 'Generating visions...' })
                    : t({ pl: `Porównaj wizje (${matrixImages.length}/${synthesisResult?.generatedSources?.length || 6})`, en: `Compare visions (${matrixImages.length}/${synthesisResult?.generatedSources?.length || 6})` })}
                </h1>
                <p className="text-silver-dark text-sm">
                  {isGenerating 
                    ? t({ pl: 'Twoje wizje są generowane przez AI. Obrazy pojawią się poniżej gdy będą gotowe.', en: 'Your visions are being generated by AI. Images will appear below when ready.' })
                    : t({ pl: 'Wybierz wizję, która najbardziej Ci odpowiada', en: 'Choose the vision that best suits you' })}
                </p>
              </div>

              {isAnonMatrixPreview && !isAuthenticated && (
                <div className="w-full max-w-5xl mx-auto">
                  <button
                    type="button"
                    onClick={openAnonUnlockLoginModal}
                    aria-label={t({
                      pl: 'Załóż konto lub zaloguj się, aby zobaczyć wszystkie obrazy i kredyty',
                      en: 'Create an account or sign in to see all images and credits',
                    })}
                    className="w-full text-left rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60 focus-visible:ring-offset-2"
                  >
                    <GlassCard className="px-4 py-3 sm:px-8 sm:py-4 border-gold/30 bg-gold/5 hover:border-gold/50 hover:bg-gold/10 transition-colors cursor-pointer">
                      <p className="text-sm sm:text-[15px] text-graphite text-center font-medium leading-snug text-balance">
                        {guestQuotaBlockedWithVision
                          ? t({
                              pl: `Masz już pierwszą wizję. Załóż konto lub zaloguj się, żeby wygenerować pozostałe obrazy i odebrać ${String(FREE_GRANT_CREDITS)} kredytów na start.`,
                              en: `You already have your first vision. Sign in or create an account to generate the remaining images and claim ${String(FREE_GRANT_CREDITS)} Basic plan credits.`,
                            })
                          : t({
                              pl: `To pierwsza z 6 wizji Twojego wnętrza. Załóż konto, żeby zobaczyć wszystkie obrazy, odebrać ${String(FREE_GRANT_CREDITS)} kredytów na start i wracać do projektu, kiedy chcesz.`,
                              en: `You're seeing the first of six visions for your space. Create an account to see all images, get ${String(FREE_GRANT_CREDITS)} Basic plan credits, and keep your project on your profile.`,
                            })}
                      </p>
                    </GlassCard>
                  </button>
                </div>
              )}
              
              <div className="space-y-3">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-w-5xl mx-auto">
                  {/* Generate slots for the sources that actually generate */}
                  {Array.from({ length: synthesisResult?.displayOrder?.length || 6 }).map((_, index) => {
                  const expectedSource = synthesisResult?.displayOrder[index] || null;
                  // Only show Google images
                  const image = matrixImages.find(img => img.source === expectedSource && img.provider === 'google');
                  const firstGeneratedSource = synthesisResult?.generatedSources?.[0] ?? null;
                  const isLockedAnon =
                    isAnonMatrixPreview &&
                    !image &&
                    expectedSource != null &&
                    firstGeneratedSource != null &&
                    expectedSource !== firstGeneratedSource;
                  // Always show loading skeleton when there is no image (unless error), except locked anon slots
                  const slotIsLoading =
                    isGenerating && !isLockedAnon && !image && (!error || guestQuotaBlockedWithVision);
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
                    ? t({ pl: 'Brak danych', en: 'No data' })
                    : qualityInfo?.status === 'limited'
                      ? t({ pl: 'Niewystarczające dane', en: 'Insufficient data' })
                      : t({ pl: 'Gotowe', en: 'Ready' });
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
                  const sourceLabel = expectedSource 
                    ? (language === 'pl' ? GENERATION_SOURCE_LABELS[expectedSource]?.pl : GENERATION_SOURCE_LABELS[expectedSource]?.en) || GENERATION_SOURCE_LABELS[expectedSource]?.pl
                    : t({ pl: `Wizja ${index + 1}`, en: `Vision ${index + 1}` });
                  
                  return (
                    <motion.div
                      key={expectedSource || `placeholder-${index}`}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.3, delay: index * 0.1 }}
                      className="relative"
                    >
                      {/* No GlassCard wrapper - image fills the entire placeholder */}
                      <div className="relative aspect-[4/3] w-full rounded-2xl overflow-hidden group shadow-md">
                        {isLockedAnon ? (
                          <button
                            type="button"
                            onClick={openAnonUnlockLoginModal}
                            className="relative aspect-[4/3] w-full rounded-2xl overflow-hidden bg-graphite/30 backdrop-blur-sm border border-white/15 flex flex-col items-center justify-center gap-2 p-3 cursor-pointer hover:border-gold/40 hover:bg-graphite/40 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60 focus-visible:ring-offset-2 text-left"
                            aria-label={t({ pl: 'Załóż konto, aby odblokować', en: 'Create an account to unlock' })}
                          >
                            <Lock className="w-10 h-10 text-gold/80" aria-hidden />
                            <p className="text-center text-xs text-silver-300 leading-tight">
                              {t({
                                pl: 'Załóż konto, aby odblokować',
                                en: 'Create an account to unlock',
                              })}
                            </p>
                          </button>
                        ) : slotIsLoading ? (
                          /* Loading Skeleton - Futuristic transparent glass style */
                          <div 
                            className="relative aspect-[4/3] w-full rounded-2xl overflow-hidden bg-white/5 backdrop-blur-sm border border-white/10"
                            role="status"
                            aria-live="polite"
                            aria-busy="true"
                            aria-label={sourceLabel ? t({ pl: `Generowanie ${sourceLabel}`, en: `Generating ${sourceLabel}` }) : t({ pl: `Generowanie wizji ${index + 1}`, en: `Generating vision ${index + 1}` })}
                          >
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
                                  aria-live="polite"
                                  aria-atomic="true"
                                >
                                  {`${Math.max(2, progressValue)}%`}
                                </motion.p>
                                <p 
                                  className="text-white/70 text-xs mt-1 font-medium"
                                  aria-live="polite"
                                >
                                  {t({ pl: 'Generowanie...', en: 'Generating...' })}
                                </p>
                              </div>
                            </div>

                            {/* Inline quality info for this source while waiting */}
                            {qualityInfo && (
                              <div className="absolute bottom-2 left-2 right-2">
                                <AwaScrollArea
                                  variant="auto"
                                  className="max-h-[120px] rounded-lg border border-white/15 bg-white/15 px-2.5 py-1.5 text-[11px] leading-tight text-white/80 backdrop-blur-md"
                                  autoHide={false}
                                >
                                  <div className="space-y-0.5">
                                  <div className="flex justify-between gap-2">
                                    <span className="font-semibold text-white/90">{t({ pl: `Dane: ${sourceLabel}`, en: `Data: ${sourceLabel}` })}</span>
                                    <span 
                                      className={`font-semibold ${statusColor}`}
                                      aria-live="polite"
                                    >
                                      {statusText}
                                    </span>
                                  </div>
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
                                </AwaScrollArea>
                              </div>
                            )}
                            
                          </div>
                        ) : image ? (
                          /* Generated Image - No border, fills entire space */
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.5 }}
                            role="button"
                            tabIndex={0}
                            className={`relative aspect-[4/3] w-full rounded-2xl overflow-hidden bg-graphite/10 cursor-zoom-in hover:scale-[1.02] transition-transform ${
                              selectedImage?.id === image.id 
                                ? 'ring-2 ring-gold ring-offset-2 ring-offset-transparent shadow-xl' 
                                : ''
                            }`}
                            onClick={() => handleMatrixImageClick(image)}
                            onDoubleClick={() => handleMatrixImageDoubleClick(image)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                handleMatrixImageClick(image);
                              }
                            }}
                            title={t({
                              pl: 'Kliknij, aby powiększyć. Dwuklik wybiera wizję.',
                              en: 'Click to zoom. Double-click to select.',
                            })}
                          >
                            <Image
                              src={image.url}
                              alt={sourceLabel}
                              fill
                              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 16vw"
                              className="object-cover"
                              priority={index < 2}
                            />
                            
                            {/* Hover overlay */}
                            <div className="absolute inset-0 bg-gold/0 group-hover:bg-gold/10 transition-colors" />
                            
                            {/* Selection indicator */}
                            {selectedImage?.id === image.id && !isUpscaling && (
                              <div className="absolute top-2 right-2">
                                <div className="w-6 h-6 bg-gold rounded-full flex items-center justify-center">
                                  <CheckCircle2 size={16} className="text-white" aria-hidden="true" />
                                </div>
                              </div>
                            )}
                            
                            {/* Upscaling overlay */}
                            {isUpscaling && selectedImage?.id === image.id && (
                              <div 
                                className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center gap-3"
                                role="status"
                                aria-live="polite"
                                aria-busy="true"
                              >
                                <RefreshCw size={32} className="animate-spin text-gold" aria-hidden="true" />
                                <div className="text-center">
                                  <p className="text-white font-semibold text-sm">Przetwarzanie...</p>
                                  <p className="text-gold/80 text-xs mt-1">Zwiększanie rozdzielczości</p>
                                </div>
                              </div>
                            )}
                          </motion.div>
                        ) : (
                          /* Fallback: keep showing loader instead of "Brak wizji" */
                          <div className="relative aspect-[4/3] w-full rounded-2xl overflow-hidden bg-white/5 backdrop-blur-sm border border-white/10" />
                        )}
                      </div>
                    </motion.div>
                  );
                })}
                </div>
              </div>

              {/* Primary CTA first (above long “source” copy) + sticky on small viewports so it stays reachable */}
              {(() => {
                const readyCount = matrixImages.filter(img => img.provider === 'google').length;
                const hasAtLeastOneImage = readyCount >= 1;
                return hasAtLeastOneImage;
              })() && (
                <div className="md:static sticky bottom-0 z-20 -mx-2 px-2 pt-2 pb-3 md:pb-0 md:mx-0 md:pt-0 bg-gradient-to-t from-pearl-50 via-pearl-50/98 to-pearl-50/85 md:bg-transparent md:from-transparent border-t border-white/25 md:border-t-0 shadow-[0_-8px_24px_rgba(0,0,0,0.06)] md:shadow-none rounded-t-xl md:rounded-none">
                  {!selectedImage && !isUpscaling && (
                    <p className="text-center text-xs text-silver-dark mb-2 md:mb-3">
                      {t({
                        pl: 'Kliknij wizję, aby powiększyć. Dwuklik wybiera od razu — albo potwierdź przyciskiem poniżej.',
                        en: 'Click a vision to zoom. Double-click selects immediately — or confirm with the button below.',
                      })}
                    </p>
                  )}
                  <div className="flex justify-center">
                    <GlassButton
                      onClick={() => {
                        if (selectedImage && !isUpscaling) {
                          handleBlindSelection(selectedImage);
                        }
                      }}
                      disabled={!selectedImage || isUpscaling}
                      className="px-8 py-3 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed whitespace-normal break-words w-full max-w-md sm:w-auto"
                    >
                      {isUpscaling ? (
                        <>
                          <RefreshCw size={20} className="animate-spin" aria-hidden="true" />
                          <span>{t({ pl: 'Przetwarzanie wybranej wizji...', en: 'Processing selected vision...' })}</span>
                        </>
                      ) : isGenerating ? (
                        <>
                          <CheckCircle2 size={20} aria-hidden="true" />
                          <span>{t({ pl: 'Wybieram i idę dalej', en: 'Select and continue' })}</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 size={20} aria-hidden="true" />
                          <span>{t({ pl: 'Wybieram tę wizję', en: 'I choose this vision' })}</span>
                        </>
                      )}
                    </GlassButton>
                  </div>
                  {guestQuotaBlockedWithVision && (
                    <div className="flex justify-center mt-3">
                      <GlassButton
                        type="button"
                        variant="secondary"
                        onClick={() => openAnonUnlockLoginModal()}
                        className="px-6 py-2.5 text-sm whitespace-normal break-words w-full max-w-md sm:w-auto"
                      >
                        {t({
                          pl: 'Załóż konto i zobacz wszystkie obrazy',
                          en: 'Sign in to see all images',
                        })}
                      </GlassButton>
                    </div>
                  )}
                </div>
              )}

              {/* Upscaling feedback */}
              {isUpscaling && selectedImage && (
                <GlassCard variant="flatOnMobile" className="p-4">
                  <div className="flex items-center gap-3">
                    <RefreshCw size={24} className="animate-spin text-gold" aria-hidden="true" />
                    <div>
                      <p className="font-semibold text-graphite">{t({ pl: "Przetwarzanie wybranej wizji...", en: "Processing selected vision..." })}</p>
                      <p className="text-sm text-silver-dark">{t({ pl: "Zwiększanie rozdzielczości do pełnej jakości", en: "Increasing resolution to full quality" })}</p>
                    </div>
                  </div>
                </GlassCard>
              )}

              {lightboxPortalReady &&
                createPortal(
                  <AnimatePresence>
                    {isLightboxOpen && selectedImage && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="fixed inset-0 z-[300] flex items-center justify-center bg-black/25 backdrop-blur-xl"
                        onClick={() => setIsLightboxOpen(false)}
                        role="dialog"
                        aria-modal="true"
                        aria-label={t({ pl: 'Powiększone zdjęcie', en: 'Zoomed image' })}
                      >
                        <div
                          className="flex max-h-[90vh] max-w-[90vw] flex-col items-center gap-4"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="relative flex items-center justify-center">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={selectedImage.url}
                              alt={t({ pl: 'Powiększona wizja wnętrza', en: 'Zoomed interior vision' })}
                              className="max-h-[calc(90vh-5rem)] w-auto max-w-full rounded-2xl object-contain"
                            />
                            {lightboxNavigableImages.length > 1 && (
                              <>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigateLightboxImage('prev');
                                  }}
                                  className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/20 p-2 text-white transition-colors hover:bg-white/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60"
                                  aria-label={t({ pl: 'Poprzednia wizja', en: 'Previous vision' })}
                                >
                                  <ChevronLeft size={28} aria-hidden="true" />
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigateLightboxImage('next');
                                  }}
                                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/20 p-2 text-white transition-colors hover:bg-white/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60"
                                  aria-label={t({ pl: 'Następna wizja', en: 'Next vision' })}
                                >
                                  <ChevronRight size={28} aria-hidden="true" />
                                </button>
                              </>
                            )}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setIsLightboxOpen(false);
                              }}
                              className="absolute top-4 right-4 rounded-full bg-white/20 p-2 text-white transition-colors hover:bg-white/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60"
                              aria-label={t({ pl: 'Zamknij', en: 'Close' })}
                            >
                              <X size={24} aria-hidden="true" />
                            </button>
                          </div>
                          <GlassButton
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setIsLightboxOpen(false);
                              void handleBlindSelection(selectedImage);
                            }}
                            disabled={isUpscaling}
                            className="flex shrink-0 items-center gap-2 px-8 py-3"
                          >
                            <CheckCircle2 size={20} aria-hidden="true" />
                            <span>{t({ pl: 'Wybieram tę wizję', en: 'I choose this vision' })}</span>
                          </GlassButton>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>,
                  document.body
                )}
            </div>
          )}

          {/* 6-Image Matrix: After Selection - Reveal View */}
          {blindSelectionMade && selectedImage && (
            <div className="space-y-6">
              {/* Selected Image - Main Display */}
              <GlassCard variant="flatOnMobile" className="p-4">
                <div className="space-y-4">
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => !isModifying && setIsLightboxOpen(true)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        if (!isModifying) setIsLightboxOpen(true);
                      }
                    }}
                    className="relative w-full rounded-lg overflow-hidden cursor-zoom-in bg-graphite/10"
                    title={t({ pl: "Kliknij, aby powiększyć", en: "Click to zoom" })}
                  >
                    <IntrinsicContainImage
                      src={(showOriginalRoomPhoto && originalRoomPhotoUrl) ? originalRoomPhotoUrl : selectedImage.url}
                      alt={
                        showOriginalRoomPhoto
                          ? t({ pl: "Oryginalne zdjęcie pokoju", en: "Original room photo" })
                          : t({ pl: "Wybrane wnętrze", en: "Selected interior" })
                      }
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
                                      {isCompleted && <CheckCircle size={20} className="text-white" aria-hidden="true" />}
                                      {isActive && stage === 1 && <Wand2 size={20} className="text-white" aria-hidden="true" />}
                                      {isActive && stage === 2 && <Sparkles size={20} className="text-white" aria-hidden="true" />}
                                      {isActive && stage === 3 && <CheckCircle size={20} className="text-white" aria-hidden="true" />}
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
                        <CheckCircle2 size={16} className="text-white" aria-hidden="true" />
                        <span className="text-sm font-medium text-white">{t({ pl: "Twój wybór", en: "Your choice" })}</span>
                      </motion.div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleFavorite(selectedImage.id);
                      }}
                      className={`absolute top-4 right-4 p-2 rounded-full backdrop-blur transition-all ${
                        selectedImage.isFavorite ? 'bg-red-100 text-red-500' : 'bg-white/20 text-white hover:bg-white/30'
                      }`}
                    >
                      <Heart size={20} fill={selectedImage.isFavorite ? 'currentColor' : 'none'} aria-hidden="true" />
                    </button>
                    {/* Upscale button - DISABLED for now */}
                    {false && !upscaledImage && !blindSelectionMade && selectedImage?.parameters?.mode !== 'upscale' && (
                      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
                        <GlassButton
                          onClick={() => selectedImage && handleUpscale(selectedImage)}
                          disabled={isUpscaling}
                          className="px-6 py-2 flex items-center gap-2 bg-gold/90 hover:bg-gold text-white whitespace-normal break-words"
                        >
                          {isUpscaling ? (
                            <>
                                <RefreshCw size={16} className="animate-spin" aria-hidden="true" />
                              <span>{t({ pl: "Upscalowanie...", en: "Upscaling..." })}</span>
                            </>
                          ) : (
                            <>
                              <ArrowRight size={16} aria-hidden="true" />
                              <span>{t({ pl: "Upscaluj do pełnej rozdzielczości", en: "Upscale to full resolution" })}</span>
                            </>
                          )}
                        </GlassButton>
                      </div>
                    )}
                  </div>
                </div>
              </GlassCard>

              {/* Taste rating — keyed to active history node / display image */}
              <div ref={tasteRatingPanelRef}>
                <AnimatePresence mode="wait">
                  {tasteRatingPanelVisible && selectedImage && (
                    <motion.div
                      key={`taste-rating-${selectedImage.id}`}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -12 }}
                      transition={{ duration: 0.25, ease: 'easeOut' }}
                      className="space-y-6"
                    >
                      <GlassCard variant="flatOnMobile" className="p-4">
                        <h4 className="font-semibold text-graphite text-lg mb-4">
                          {t({ pl: 'Oceń to wnętrze:', en: 'Rate this interior:' })}
                        </h4>
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
                              <span>{t(right)} (5)</span>
                            </div>

                            <GlassScalePicker
                              min={1}
                              max={5}
                              value={aestheticPickerValue(sessionImageRatings[selectedImage.id])}
                              onChange={(value) => {
                                handleImageRating(selectedImage.id, key as any, value, { suppressProgress: true });
                              }}
                              className="mb-2"
                              highlightResetKey={`${selectedImage.id}-${String(key)}`}
                              ariaLabel={t({
                                pl: 'Skala zgodności z gustem (1–5)',
                                en: 'Taste match scale (1–5)',
                              })}
                            />
                          </div>
                        ))}
                      </GlassCard>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              
              {/* Modifications and History - Show after selection and after completing all questions */}
              {selectedImage && blindSelectionMade && currentImageActionsEnabled && (
                <>
                  {/* Modifications Button */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="flex flex-col sm:flex-row justify-center gap-2 sm:gap-3"
                  >
                    <GlassButton onClick={() => setShowModifications((m) => !m)} variant="secondary" className="w-full sm:flex-1 h-12 text-xs sm:text-sm">
                      <Settings size={16} className="mr-2 flex-shrink-0" aria-hidden="true" />
                      <span className="truncate">{showModifications ? t({ pl: 'Ukryj opcje', en: 'Hide options' }) : t({ pl: 'Modyfikuj', en: 'Modify' })}</span>
                    </GlassButton>

                    <GlassButton onClick={handleRemoveFurniture} variant="secondary" className="w-full sm:flex-1 h-12 text-xs sm:text-sm">
                      <Home size={16} className="mr-2 flex-shrink-0" aria-hidden="true" />
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
                      <Eye size={16} className="mr-2 flex-shrink-0" aria-hidden="true" />
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
                        <GlassCard variant="flatOnMobile" className="p-6">
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            <div>
                              <h4 className="font-semibold text-graphite mb-4 flex items-center text-lg">
                                <Wand2 size={20} className="mr-3" aria-hidden="true" />
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
                                <RefreshCw size={20} className="mr-3" aria-hidden="true" />
                                {t({ pl: 'Zupełnie inny kierunek', en: 'Completely different direction' })}
                              </h4>
                              <p className="text-sm text-silver-dark mb-4">
                                {t({ pl: 'Zmiana całego stylu mebli i aranżacji', en: 'Change the entire style of furniture and arrangement' })}
                              </p>
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[min(50vh,480px)] overflow-y-auto overscroll-contain pr-1">
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
                              <MessageSquare size={20} className="mr-3 text-gold" aria-hidden="true" />
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
                </>
              )}

              {/* Generation History — visible after selection, independent of taste rating */}
              {blindSelectionMade && generationHistory.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="mt-8"
                >
                  <GenerationHistory
                    history={generationHistory}
                    currentIndex={safeHistoryIndex}
                    onNodeClick={handleHistoryNodeClick}
                  />
                </motion.div>
              )}

              {/* Continue Button */}
              {showSourceReveal && currentImageActionsEnabled && (
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
                    <ArrowRight size={18} aria-hidden="true" />
                  </GlassButton>
                </motion.div>
              )}

              {/* Lightbox: zoom image in step 2 */}
              {lightboxPortalReady &&
                createPortal(
                  <AnimatePresence>
                    {isLightboxOpen && selectedImage && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="fixed inset-0 z-[300] flex items-center justify-center bg-black/25 backdrop-blur-xl"
                        onClick={() => setIsLightboxOpen(false)}
                        role="dialog"
                        aria-modal="true"
                        aria-label={t({ pl: "Powiększone zdjęcie", en: "Zoomed image" })}
                      >
                        <div
                          className="relative flex max-h-[90vh] max-w-[90vw] items-center justify-center"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={(showOriginalRoomPhoto && originalRoomPhotoUrl) ? originalRoomPhotoUrl : selectedImage.url}
                            alt={showOriginalRoomPhoto ? t({ pl: "Oryginalne zdjęcie pokoju", en: "Original room photo" }) : t({ pl: "Wybrane wnętrze", en: "Selected interior" })}
                            className="max-h-[90vh] w-auto max-w-full object-contain"
                          />
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setIsLightboxOpen(false); }}
                            className="absolute top-4 right-4 rounded-full bg-white/20 p-2 text-white transition-colors hover:bg-white/30"
                            aria-label={t({ pl: "Zamknij", en: "Close" })}
                          >
                            <X size={24} aria-hidden="true" />
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>,
                  document.body
                )}
            </div>
          )}

          {/* Legacy single-image view (when matrix mode is off) */}
          {!isMatrixMode && generatedImages.length > 0 && (
            <>
              <div className="space-y-4">
                <GlassCard variant="flatOnMobile" className="p-4">
                  {selectedImage && (
                    <div className="space-y-4">
                      <div className="relative w-full rounded-lg overflow-hidden bg-graphite/10">
                        <IntrinsicContainImage
                          src={(showOriginalRoomPhoto && originalRoomPhotoUrl) ? originalRoomPhotoUrl : selectedImage.url}
                          alt="Generated interior"
                        />

                        <button
                          onClick={() => handleFavorite(selectedImage.id)}
                          className={`absolute top-4 right-4 p-2 rounded-full backdrop-blur transition-all ${
                            selectedImage.isFavorite ? 'bg-red-100 text-red-500' : 'bg-white/20 text-white hover:bg-white/30'
                          }`}
                        >
                          <Heart size={20} fill={selectedImage.isFavorite ? 'currentColor' : 'none'} aria-hidden="true" />
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

                        <AnimatePresence mode="wait">
                          {tasteRatingPanelVisible && selectedImage && (
                            <motion.div
                              key={`taste-rating-${selectedImage.id}`}
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -12 }}
                              transition={{ duration: 0.25, ease: 'easeOut' }}
                              className="space-y-6"
                            >
                              <h4 className="font-semibold text-graphite text-lg">{t({ pl: "Oceń to wnętrze:", en: "Rate this interior:" })}</h4>
                              {[
                                {
                                  key: 'aesthetic_match',
                                  left: t({ pl: 'Nietrafiona', en: 'Missed' }),
                                  mid: t({ pl: 'Zgodność z gustem', en: 'Taste match' }),
                                  right: t({ pl: 'Idealna', en: 'Perfect' }),
                                },
                              ].map(({ key, left, mid, right }) => (
                                <div key={key} className="border-b border-gray-200/50 pb-4 last:border-b-0">
                                  <p className="text-base text-graphite font-modern leading-relaxed mb-3">
                                    {mid}
                                  </p>

                                  <div className="flex items-center justify-between text-xs text-silver-dark mb-3 font-modern">
                                    <span>{left} (1)</span>
                                    <span>{right} (5)</span>
                                  </div>

                                  <GlassScalePicker
                                    min={1}
                                    max={5}
                                    value={aestheticPickerValue(sessionImageRatings[selectedImage.id])}
                                    onChange={(value) => {
                                      handleImageRating(selectedImage.id, key as any, value, { suppressProgress: true });
                                    }}
                                    className="mb-2"
                                    highlightResetKey={`${selectedImage.id}-${String(key)}`}
                                    ariaLabel={t({
                                      pl: 'Skala zgodności z gustem (1–5)',
                                      en: 'Taste match scale (1–5)',
                                    })}
                                  />
                                </div>
                              ))}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                      <AnimatePresence>
                        {(imageHasAestheticRating(selectedImage, sessionImageRatings) || selectedImage?.id === 'original-uploaded-image') && hasAnsweredInteriorQuestion && (
                          <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.2 }}
                            className="flex flex-col sm:flex-row justify-center gap-2 sm:gap-3"
                          >
                            <GlassButton onClick={() => setShowModifications((m) => !m)} variant="secondary" className="w-full sm:flex-1 h-12 text-xs sm:text-sm">
                              <Settings size={16} className="mr-2 flex-shrink-0" aria-hidden="true" />
                              <span className="truncate">{showModifications ? t({ pl: 'Ukryj opcje', en: 'Hide options' }) : t({ pl: 'Modyfikuj', en: 'Modify' })}</span>
                            </GlassButton>

                            <GlassButton onClick={handleRemoveFurniture} variant="secondary" className="w-full sm:flex-1 h-12 text-xs sm:text-sm">
                              <Home size={16} className="mr-2 flex-shrink-0" aria-hidden="true" />
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
                              <Eye size={16} className="mr-2 flex-shrink-0" aria-hidden="true" />
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
                    <GlassCard variant="flatOnMobile" className="p-6">
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <div>
                          <h4 className="font-semibold text-graphite mb-4 flex items-center text-lg">
                            <Wand2 size={20} className="mr-3" aria-hidden="true" />
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
                            <RefreshCw size={20} className="mr-3" aria-hidden="true" />
                            Zupełnie inny kierunek
                          </h4>
                          <p className="text-sm text-silver-dark mb-4">
                            Zmiana całego stylu mebli i aranżacji
                          </p>
                          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 max-h-[min(50vh,480px)] overflow-y-auto overscroll-contain pr-1">
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
                          <MessageSquare size={20} className="mr-3 text-gold" aria-hidden="true" />
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
                            <span>{t({ pl: 'Kontynuuj dalej', en: 'Continue' })}</span>
                            <ArrowRight size={20} aria-hidden="true" />
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
                      currentIndex={safeHistoryIndex}
                      onNodeClick={handleHistoryNodeClick}
                    />
                  </div>
                )}
            </>
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
          customMessage={idaComment || (isGeneratingComment ? t({ pl: "Analizuję wygenerowany obraz...", en: "Analyzing generated image..." }) : undefined)}
        />
      </div>

      <LoginModal
        isOpen={preGenLoginOpen}
        onClose={() => setPreGenLoginOpen(false)}
        onSuccess={() => {
          setError(null);
          setAnonGuestQuotaBlocked(false);
          matrixAnonResumeOnce.current = false;
        }}
        gateMode="hard"
        nudgeLocation="flow_generate_pre_gen"
        nudgeReason="login_required"
        onNudgeEvent={runGenNudgeTelemetry}
        title={{ pl: 'Kontynuuj z kontem', en: 'Continue with your account' }}
        message={t({
          pl: 'Darmowa anonimowa generacja nie jest już dostępna. Zaloguj się, aby kontynuować (konto i kredyty).',
          en: 'Your free anonymous generation is not available. Sign in to continue (account and credits).',
        })}
        redirectPath="/flow/generate"
      />
      <LoginModal
        isOpen={postAnonGenLoginOpen}
        onClose={() => setPostAnonGenLoginOpen(false)}
        gateMode="soft"
        onMaybeLater={() => {}}
        softMaybeLaterLabel={{
          pl: 'Kontynuuj bez konta',
          en: 'Continue without account',
        }}
        nudgeLocation="flow_generate_nudge_d"
        nudgeReason="login_required"
        onNudgeEvent={runGenNudgeTelemetry}
        title={{ pl: 'Załóż konto i zobacz więcej', en: 'Create an account and unlock more' }}
        message={t({
          pl: `Z kontem zobaczysz wszystkie obrazy, odbierzesz ${String(FREE_GRANT_CREDITS)} kredytów powitalnych i zapiszesz projekt, żeby móc do niego wrócić w dowolnym momencie.`,
          en: `An account shows all images, more generation credits, ${String(FREE_GRANT_CREDITS)} welcome credits when you register, and ongoing access to your project.`,
        })}
        redirectPath="/flow/generate"
      />
      <LoginModal
        isOpen={matrixLoginWallOpen}
        onClose={() => setMatrixLoginWallOpen(false)}
        gateMode="hard"
        nudgeLocation="flow_generate_matrix"
        nudgeReason="login_required"
        onNudgeEvent={runGenNudgeTelemetry}
        title={{ pl: 'Wszystkie obrazy', en: 'All images' }}
        message={t({
          pl: 'Wygenerowanie wszystkich 6 obrazów wymaga konta i wystarczającej liczby kredytów.',
          en: 'Generating all six images requires an account and enough credits.',
        })}
        redirectPath="/flow/generate"
      />
    </div>
  );
}