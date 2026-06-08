'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useSessionData } from '@/hooks/useSessionData';
import { useLanguage } from '@/contexts/LanguageContext';
import { LocalizedText } from '@/lib/questions/validated-scales';
import { getOrCreateProjectId, startParticipantGeneration, endParticipantGeneration, safeSessionStorage } from '@/lib/gcp-data';
import { useGoogleAI, getGenerationParameters } from '@/hooks/useGoogleAI';
import { prepareGenerationDimensionsFromRoomBase64, type PreparedGenerationDimensions } from '@/lib/image-aspect';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';
import { GlassScalePicker } from '@/components/ui/GlassScalePicker';
import { GenerationHistory } from '@/components/ui/GenerationHistory';
import { AwaDialogue } from '@/components/awa';
import { LoginModal } from '@/components/auth/LoginModal';
import { stopAllDialogueAudio } from '@/hooks/useAudioManager';
import { useAuth } from '@/contexts/AuthContext';
import { creditsAuthHeaders } from '@/lib/credits-request-headers';
import {
  Wand2,
  RefreshCw,
  Settings,
  ArrowRight,
  Heart,
  Home,
  CheckCircle2,
  CheckCircle,
  Sparkles,
  Eye,
  MessageSquare,
  X,
} from 'lucide-react';
import { IntrinsicContainImage } from '@/components/ui/IntrinsicContainImage';
import {
  MACRO_STYLE_MODIFICATIONS,
  buildFullFlowMacroModificationPrompt,
} from '@/lib/modifications/macro-style-modifications';
import { GenerationSource } from '@/lib/prompt-synthesis/modes';
import { addGeneratedImageToSpace } from '@/lib/spaces';
import {
  getOrCreateSpaceId,
  saveParticipantImages
} from '@/lib/remote-spaces';
import { saveSessionWithActiveSpace } from '@/lib/current-space-sync';
import { buildGenerationHistoryFromSession } from '@/lib/generation-history';
import { getSessionStoreSnapshot } from '@/hooks/useSession';
import {
  applyRatingsToImage,
  aestheticPickerValue,
  hasTasteRating,
  normalizeSessionImageRatingsMap,
  resolveSessionImageRatingsMap,
  shouldShowTasteRating,
  writeAestheticRatingToMap,
  type SessionImageRatingsMap,
} from '@/lib/image-aesthetic-rating';

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
  };
  isFavorite: boolean;
  createdAt: number;
  source?: GenerationSource;
  displayIndex?: number;
  isBlindSelected?: boolean;
  provider?: 'modal' | 'google';
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

const MACRO_MODIFICATIONS: ModificationOption[] = MACRO_STYLE_MODIFICATIONS;

export default function ModifyPage() {
  const router = useRouter();
  const { t, language } = useLanguage();
  const { sessionData, updateSessionData, isInitialized: isSessionInitialized } = useSessionData();
  const { user } = useAuth();
  const isAuthenticated = !!user;
  const pathTypeForCredits =
    (sessionData as { pathType?: 'fast' | 'full' } | null)?.pathType === 'fast' ? 'fast' : 'full';
  const isGuestFullPath = !isAuthenticated && pathTypeForCredits === 'full';
  const [guestModsQuotaBlocked, setGuestModsQuotaBlocked] = useState(false);
  const [modifyLoginOpen, setModifyLoginOpen] = useState(false);
  const { generateSixImagesParallelWithGoogle, isLoading, error, setError } = useGoogleAI();

  type CreditAction = 'generate' | 'regenerate' | 'upscale' | 'save' | 'matrix';
  const checkCreditsWithAction = useCallback(
    async (userHash: string, amount: number, action: CreditAction) => {
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
        };
      }
      if (!response.ok) {
        throw new Error((data as { error?: string }).error || 'Failed to check credits');
      }
      if (data.available === false) {
        return { allowed: false as const, code: 200 as const, reason: 'quota' as const };
      }
      return { allowed: true as const, code: 200 as const };
    },
    [isAuthenticated, pathTypeForCredits],
  );

  useEffect(() => {
    if (!isSessionInitialized || !isGuestFullPath) {
      setGuestModsQuotaBlocked(false);
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
          setGuestModsQuotaBlocked(true);
        } else {
          setGuestModsQuotaBlocked(false);
        }
      } catch {
        if (!cancelled) setGuestModsQuotaBlocked(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isSessionInitialized, isGuestFullPath, sessionData?.userHash, checkCreditsWithAction]);

  const [selectedImage, setSelectedImage] = useState<GeneratedImage | null>(null);
  const [showModifications, setShowModifications] = useState(false);
  const [generationCount, setGenerationCount] = useState(0);
  const [statusMessage, setStatusMessage] = useState<LocalizedText>({ pl: "Modyfikuję obraz...", en: "Modifying image..." });
  const [loadingStage, setLoadingStage] = useState<1 | 2 | 3>(1);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [estimatedTime, setEstimatedTime] = useState<number | undefined>(undefined);
  const [hasAnsweredInteriorQuestion, setHasAnsweredInteriorQuestion] = useState(false);
  const [isModifying, setIsModifying] = useState(false);
  const [originalRoomPhotoUrl, setOriginalRoomPhotoUrl] = useState<string | null>(null);
  const [showOriginalRoomPhoto, setShowOriginalRoomPhoto] = useState(false);
  const [customModificationText, setCustomModificationText] = useState('');
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [generationHistory, setGenerationHistory] = useState<Array<{
    id: string;
    type: 'initial' | 'micro' | 'macro';
    label: string;
    timestamp: number;
    imageUrl: string;
    base64?: string;
    source?: string;
    isSelected?: boolean;
  }>>([]);
  const [currentHistoryIndex, setCurrentHistoryIndex] = useState(0);
  const tasteRatingPanelRef = useRef<HTMLDivElement>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [feedbackType, setFeedbackType] = useState<'positive' | 'neutral' | 'negative'>('neutral');
  const [showSourceReveal, setShowSourceReveal] = useState(true); // Always show for modify page

  const interiorAdvanceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasInitializedFromSession = useRef(false);
  /** Vertex sizing from session room upload — not recomputed from last AI PNG (avoids aspect drift). */
  const modifyFlowRoomGenerationDimsRef = useRef<PreparedGenerationDimensions | null>(null);

  useEffect(() => {
    return () => {
      if (interiorAdvanceTimeoutRef.current) clearTimeout(interiorAdvanceTimeoutRef.current);
    };
  }, []);

  // The "is this your interior?" question was removed: selecting an image already implies it.
  // Auto-advance straight to the aesthetic rating.
  useEffect(() => {
    if (showSourceReveal && selectedImage && !hasAnsweredInteriorQuestion) {
      setHasAnsweredInteriorQuestion(true);
    }
  }, [showSourceReveal, selectedImage, hasAnsweredInteriorQuestion]);

  // Restore selected image from session on mount (only once)
  useEffect(() => {
    if (!isSessionInitialized || !sessionData) return;
    
    // Only restore once on initial mount - don't re-run when sessionData changes after modifications
    if (hasInitializedFromSession.current) return;
    hasInitializedFromSession.current = true;

    const typedSessionData = sessionData as any;
    const persistedSelected = typedSessionData?.selectedImage;
    
    if (!persistedSelected) {
      // No selected image - redirect to generate page
      console.log('[Modify] No selected image found, redirecting to generate');
      router.push('/flow/generate');
      return;
    }

    // Restore selected image
    const persistedSelectedId = typeof persistedSelected === 'string'
      ? persistedSelected
      : (persistedSelected?.id || null);

    if (persistedSelectedId) {
      // Try to find in generatedImages first
      const savedGeneratedImages = typedSessionData?.generatedImages || [];
      const imageRatings = typedSessionData?.imageRatings || {};
      
      const selectedFromSaved = savedGeneratedImages.find((img: any) => img.id === persistedSelectedId);
      
      if (selectedFromSaved) {
        // Extract base64 from data URL if not directly available
        let base64Data = selectedFromSaved.base64 || persistedSelected.base64 || '';
        const imageUrl = selectedFromSaved.url || persistedSelected.url;
        if (!base64Data && imageUrl && imageUrl.startsWith('data:')) {
          const parts = imageUrl.split(',');
          if (parts.length > 1) {
            base64Data = parts[1];
          }
        }
        
        const restoredImage: GeneratedImage = {
          id: selectedFromSaved.id,
          url: imageUrl,
          base64: base64Data,
          prompt: 'Restored from session',
          provider: persistedSelected.provider || 'google',
          parameters: persistedSelected.parameters || { modificationType: 'initial', modifications: [], iterationCount: 0, usedOriginal: false },
          ratings: imageRatings[persistedSelectedId] || { aesthetic_match: 0, character: 0, harmony: 0 },
          isFavorite: false,
          createdAt: Date.now(),
          source: persistedSelected.source || GenerationSource.Implicit,
          displayIndex: persistedSelected.displayIndex || 0,
          isBlindSelected: true
        };
        
        const restoredSelected = applyRatingsToImage(restoredImage, imageRatings);
        setSelectedImage(restoredSelected);
        
        // Interior question removed — selection implies ownership.
        setHasAnsweredInteriorQuestion(true);
      } else if (persistedSelected?.url) {
        // Fallback: create minimal image from session data
        // Extract base64 from data URL if not directly available
        let base64Data = persistedSelected.base64 || '';
        if (!base64Data && persistedSelected.url && persistedSelected.url.startsWith('data:')) {
          const parts = persistedSelected.url.split(',');
          if (parts.length > 1) {
            base64Data = parts[1];
          }
        }
        
        const restoredImage: GeneratedImage = {
          id: persistedSelectedId,
          url: persistedSelected.url,
          base64: base64Data,
          prompt: 'Restored selected image from sessionData',
          provider: persistedSelected.provider || 'google',
          parameters: persistedSelected.parameters || { modificationType: 'initial', modifications: [], iterationCount: 0, usedOriginal: false },
          ratings: imageRatings[persistedSelectedId] || { aesthetic_match: 0, character: 0, harmony: 0 },
          isFavorite: false,
          createdAt: Date.now(),
          source: persistedSelected.source || GenerationSource.Implicit,
          displayIndex: persistedSelected.displayIndex || 0,
          isBlindSelected: true
        };
        
        const restoredSelected = applyRatingsToImage(restoredImage, imageRatings);
        setSelectedImage(restoredSelected);
        
        // Interior question removed — selection implies ownership.
        setHasAnsweredInteriorQuestion(true);
      }

      const matrixHistory = typedSessionData?.matrixHistory || [];
      const savedGenerations = typedSessionData?.generations || [];
      const fullHistory = buildGenerationHistoryFromSession({
        matrixHistory,
        generations: savedGenerations,
        generatedImages: savedGeneratedImages,
        selectedImageId: persistedSelectedId,
      });

      if (fullHistory.length > 0) {
        console.log('[Modify] Restored generation history:', fullHistory.length, 'items');
        setGenerationHistory(fullHistory);
        const selectedIdx = fullHistory.findIndex(
          (h) => h.isSelected || h.id === persistedSelectedId,
        );
        setCurrentHistoryIndex(
          selectedIdx >= 0 ? selectedIdx : fullHistory.length - 1,
        );
      }

      // Restore generation count
      setGenerationCount(savedGenerations.length);
    }

    const roomRaw = typedSessionData?.roomImageEmpty || typedSessionData?.roomImage;
    if (roomRaw) {
      void (async () => {
        try {
          const clean = String(roomRaw).includes(',') ? String(roomRaw).split(',')[1] : String(roomRaw);
          modifyFlowRoomGenerationDimsRef.current = await prepareGenerationDimensionsFromRoomBase64(clean);
        } catch (e) {
          console.warn('[Modify] Could not load generation dimensions from original room photo', e);
        }
      })();
    }
  }, [isSessionInitialized, sessionData, router]);

  // Poll for new images in matrixHistory (from background generation)
  useEffect(() => {
    if (!isSessionInitialized || !sessionData) return;
    
    const typedSessionData = sessionData as any;
    const matrixHistory = typedSessionData?.matrixHistory || [];
    
    // Check if there are new images in matrixHistory that aren't in generationHistory
    if (matrixHistory.length > 0) {
      const currentHistoryIds = new Set(generationHistory.map(h => h.id));
      const newItems = matrixHistory.filter((item: any) => !currentHistoryIds.has(item.id));
      
      if (newItems.length > 0) {
        console.log('[Modify] Found new images in matrixHistory:', newItems.length);
        
        const newHistoryItems = newItems.map((item: any) => {
          // Construct URL from base64 if not available
          let imageUrl = item.imageUrl || item.url || '';
          const base64 = item.base64 || '';
          if (!imageUrl && base64) {
            imageUrl = `data:image/png;base64,${base64}`;
          }
          
          return {
            id: item.id,
            type: 'initial' as const,
            label: item.label || 'Wizja',
            timestamp: item.timestamp || Date.now(),
            imageUrl: imageUrl,
            base64: base64,
            source: item.source,
            isSelected: false
          };
        });
        
        setGenerationHistory(prev => {
          // Merge new items, avoiding duplicates
          const existingIds = new Set(prev.map(h => h.id));
          const trulyNew = newHistoryItems.filter((h: any) => !existingIds.has(h.id));
          if (trulyNew.length === 0) return prev;
          
          console.log('[Modify] Adding', trulyNew.length, 'new images to history');
          return [...prev, ...trulyNew];
        });
      }
    }
  }, [isSessionInitialized, sessionData, generationHistory]);

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

    setSelectedImage((prev) => (prev?.id === imageId ? applyRating(prev) : prev));

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
    const updatedRatings = {
      aesthetic_match: nextRatings[imageId]?.aesthetic_match ?? 0,
      character: nextRatings[imageId]?.character ?? 0,
      harmony: nextRatings[imageId]?.harmony ?? 0,
    } as GeneratedImage['ratings'];

    await updateSessionData({
      imageRatings: nextRatings,
    } as any);

    if (rating === 'aesthetic_match' && value > 0) {
      setShowSourceReveal(true);
    }

    if (!options?.suppressProgress) {
      const allRatingsComplete = updatedRatings.aesthetic_match > 0;

      if (allRatingsComplete) {
        const avgRating = updatedRatings.aesthetic_match;

        if (avgRating >= 6) {
          setFeedbackMessage(t({ pl: "Świetny wybór! Ten obraz ma doskonałe oceny. Możesz go zapisać lub spróbować drobnych modyfikacji.", en: "Great choice! This image has excellent ratings. You can save it or try minor modifications." }));
          setFeedbackType('positive');
        } else if (avgRating >= 4) {
          setFeedbackMessage(t({ pl: "Dobry wybór! Możemy jeszcze dopracować szczegóły.", en: "Good choice! We can still refine the details." }));
          setFeedbackType('neutral');
        } else {
          setFeedbackMessage(t({ pl: "Spróbujmy zmodyfikować obraz, aby lepiej pasował do Twoich preferencji.", en: "Let's try to modify the image to better match your preferences." }));
          setFeedbackType('negative');
        }

        setTimeout(() => setFeedbackMessage(null), 5000);
      }
    }
  };

  const handleModification = async (modification: ModificationOption, customPrompt?: string) => {
    if (!selectedImage) return;

    if (isGuestFullPath && guestModsQuotaBlocked) {
      setModifyLoginOpen(true);
      return;
    }

    if (isLoading || isModifying) {
      console.warn('[Modification] Already generating, ignoring duplicate request');
      return;
    }

    const isMacro = modification.category === 'macro';
    
    // Get base64 from selectedImage, or extract from URL if needed
    let baseImageSource = selectedImage.base64;
    if (!baseImageSource && selectedImage.url && selectedImage.url.startsWith('data:')) {
      const parts = selectedImage.url.split(',');
      if (parts.length > 1) {
        baseImageSource = parts[1];
        console.log('[Modification] Extracted base64 from data URL');
      }
    }
    
    if (!baseImageSource) {
      console.error('[Modification] No base64 image available for modification');
      setError(t({ pl: "Brak danych obrazu do modyfikacji. Proszę wybrać obraz ponownie.", en: "No image data available for modification. Please select an image again." }));
      return;
    }

    let modificationPrompt: string;
    
    if (customPrompt) {
      modificationPrompt = customPrompt;
    } else if (isMacro) {
      modificationPrompt = buildMacroPrompt(modification);
    } else {
      modificationPrompt = buildMicroPrompt(modification);
    }

    const parameters = getGenerationParameters(isMacro ? 'macro' : 'micro', generationCount);

    let googleModificationParameters = {
      ...parameters,
      strength: parameters.strength ?? (isMacro ? 0.75 : 0.25),
    };
    const roomDims = modifyFlowRoomGenerationDimsRef.current;
    if (roomDims) {
      googleModificationParameters = {
        ...parameters,
        width: roomDims.normalizedWidth,
        height: roomDims.normalizedHeight,
        aspect_ratio: roomDims.aspectRatio,
        strength: parameters.strength ?? (isMacro ? 0.75 : 0.25),
      };
    } else {
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
        console.warn('[modify] Dimension prep failed', e);
      }
    }

    setIsModifying(true);
    setLoadingStage(2);
    setLoadingProgress(40);
    setStatusMessage({ pl: `Modyfikuję obraz: ${t(modification.label)}...`, en: `Modifying image: ${t(modification.label)}...` });
    setEstimatedTime(30);

    let jobId: string | null = null;
    let jobClosed = false;
    const closeJob = async (status: 'success' | 'error', error_message?: string) => {
      if (!jobId || jobClosed) return;
      await endParticipantGeneration(jobId, {
        status,
        latency_ms: 0,
        ...(error_message ? { error_message } : {}),
      });
      jobClosed = true;
    };
    try {
      const userHash = (sessionData as any).userHash;
      if (userHash) {
        jobId = await startParticipantGeneration(userHash, {
          type: isMacro ? 'macro' : 'micro',
          prompt: modificationPrompt,
          parameters: googleModificationParameters,
          has_base_image: true,
          modification_label: t(modification.label),
        });
      }

      setLoadingProgress(60);
      setStatusMessage({ pl: `Przetwarzam modyfikację: ${t(modification.label)}...`, en: `Processing modification: ${t(modification.label)}...` });
      
      // Generate unique run ID for each modification to avoid deduplication blocking
      const modificationRunId = `mod-${Date.now()}-${Math.random().toString(36).substring(7)}`;
      
      const response = await generateSixImagesParallelWithGoogle({
        prompts: [{ source: 'implicit' as GenerationSource, prompt: modificationPrompt }],
        base_image: baseImageSource,
        style: isMacro ? modification.id : (selectedImage.parameters?.style || 'modern'),
        parameters: googleModificationParameters,
        generation_run_id: modificationRunId
      });
      
      setLoadingProgress(85);
      setStatusMessage({ pl: "Finalizuję zmodyfikowany obraz...", en: "Finalizing modified image..." });

      if (!response || (response.failed_count > 0 && response.successful_count === 0)) {
        const errorMessage = response?.results?.find(r => r.error)?.error || '';
        const isRateLimit = errorMessage.includes('429') || errorMessage.includes('RESOURCE_EXHAUSTED') || errorMessage.includes('rate limit');
        console.error('[Modification] Failed:', errorMessage);
        setIsModifying(false);
        
        if (isRateLimit) {
          setError(t({ 
            pl: "Limit API - poczekaj minutę i spróbuj ponownie.", 
            en: "API limit - wait a minute and try again." 
          }));
        } else {
          setError(t({ 
            pl: `Błąd modyfikacji: ${errorMessage || 'Spróbuj ponownie'}`, 
            en: `Modification error: ${errorMessage || 'Try again'}` 
          }));
        }
        await closeJob('error', errorMessage || 'Modification failed');
        return;
      }

      const successfulResult = response.results.find(r => r.success && r.image);
      if (!successfulResult || !successfulResult.image) {
        console.error('[Modification] No successful result in response');
        setIsModifying(false);
        setError(t({ 
          pl: "Modyfikacja nie powiodła się. Spróbuj ponownie.", 
          en: "Modification failed. Please try again." 
        }));
        await closeJob('error', 'No successful result');
        return;
      }

      const newImage: GeneratedImage = {
        id: `mod-${generationCount}-0`,
        url: `data:image/png;base64,${successfulResult.image}`,
        base64: successfulResult.image,
        prompt: modificationPrompt,
        provider: 'google' as const,
        parameters: { 
          modificationType: isMacro ? 'macro' : 'micro',
          modifications: [t(modification.label)],
          iterationCount: generationCount,
          usedOriginal: false,
          parentImageId: selectedImage.id
        },
        ratings: { aesthetic_match: 0, character: 0, harmony: 0 },
        isFavorite: false,
        createdAt: Date.now(),
      };

      setSelectedImage(newImage);
      setGenerationCount((prev) => prev + 1);
      setShowModifications(false);
      setHasAnsweredInteriorQuestion(true);
      setShowSourceReveal(false);
      
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
      
      const currentSpaces = (sessionData as any)?.spaces || [];
      const activeSpaceId = (sessionData as any)?.currentSpaceId;
      const activeSpaceName = (sessionData as any)?.roomName;
      const spaceId = userHash
        ? await getOrCreateSpaceId(userHash, {
            spaceId: activeSpaceId,
            name: activeSpaceName || 'Moja Przestrzeń',
            reuseExistingDefault: true,
          })
        : null;
      if (spaceId) {
        const imagesToSave = [{
          url: newImage.url,
          type: 'generated' as const,
          is_favorite: newImage.isFavorite || false,
          source: selectedImage?.source,
          generation_id: jobId ?? undefined,
          space_id: spaceId
        }];
        const modSaveResult = await saveParticipantImages(userHash, imagesToSave);
        if (modSaveResult.failed > 0) {
          console.error(
            '[modify] saveParticipantImages partial failure:',
            modSaveResult,
          );
        }
      }

      setLoadingProgress(100);
      setLoadingStage(3);
      setStatusMessage({ pl: "Modyfikacja zakończona!", en: "Modification completed!" });
      setEstimatedTime(0);
      setIsModifying(false);
      
      const historyNode = {
        id: newImage.id,
        type: isMacro ? ('macro' as const) : ('micro' as const),
        label: t(modification.label),
        timestamp: Date.now(),
        imageUrl: newImage.url,
        base64: newImage.base64, // Include base64 for history navigation
      };
      setGenerationHistory((prev) => {
        const next = [...prev, historyNode];
        setCurrentHistoryIndex(next.length - 1);
        return next;
      });
      
      const modSessionPatch = {
        currentStep: 'generate' as const,
        ...(spaceId ? { currentSpaceId: spaceId } : {}),
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
          base64: newImage.base64,
          source: selectedImage?.source,
          provider: 'google' as const,
          parameters: newImage.parameters
        },
        blindSelectionMade: true
      };
      await updateSessionData(modSessionPatch as any);
      try {
        await saveSessionWithActiveSpace(modSessionPatch as any);
      } catch (e) {
        console.warn('[modify] saveSessionWithActiveSpace failed:', e);
      }

      try {
        await closeJob('success');
      } catch {}
    } catch (err) {
      console.error('Modification failed:', err);
      setIsModifying(false);
      setError(err instanceof Error ? err.message : t({ pl: 'Wystąpił nieznany błąd podczas modyfikacji.', en: 'An unknown error occurred during modification.' }));
      try {
        await closeJob('error', err instanceof Error ? err.message : 'Modification failed');
      } catch {}
    } finally {
      if (jobId && !jobClosed) {
        try {
          await endParticipantGeneration(jobId, {
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

    if (isGuestFullPath && guestModsQuotaBlocked) {
      setModifyLoginOpen(true);
      return;
    }

    // Get base64 from selectedImage, or extract from URL if needed
    let baseImageForRemoval = selectedImage.base64;
    if (!baseImageForRemoval && selectedImage.url && selectedImage.url.startsWith('data:')) {
      const parts = selectedImage.url.split(',');
      if (parts.length > 1) {
        baseImageForRemoval = parts[1];
        console.log('[RemoveFurniture] Extracted base64 from data URL');
      }
    }
    
    if (!baseImageForRemoval) {
      console.error('[RemoveFurniture] No base64 image available');
      setError(t({ pl: "Brak danych obrazu. Proszę wybrać obraz ponownie.", en: "No image data available. Please select an image again." }));
      return;
    }
    
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
    
    setLoadingStage(2);
    setLoadingProgress(30);
    setStatusMessage({ pl: "Usuwam meble (AI)...", en: "Removing furniture (AI)..." });
    setEstimatedTime(25);
    setIsModifying(true);

    try {
      const baseMicro = getGenerationParameters('micro', generationCount);
      let removeParams = {
        ...baseMicro,
        strength: 0.3,
      };
      const roomDimsRm = modifyFlowRoomGenerationDimsRef.current;
      if (roomDimsRm) {
        removeParams = {
          ...baseMicro,
          width: roomDimsRm.normalizedWidth,
          height: roomDimsRm.normalizedHeight,
          aspect_ratio: roomDimsRm.aspectRatio,
          strength: 0.3,
        };
      } else {
        try {
          const cleanRm =
            typeof baseImageForRemoval === 'string' && baseImageForRemoval.includes(',')
              ? baseImageForRemoval.split(',')[1]
              : baseImageForRemoval;
          const prepared = await prepareGenerationDimensionsFromRoomBase64(cleanRm);
          removeParams = {
            ...baseMicro,
            width: prepared.normalizedWidth,
            height: prepared.normalizedHeight,
            aspect_ratio: prepared.aspectRatio,
            strength: 0.3,
          };
        } catch (e) {
          console.warn('[modify/remove] dimension prep failed', e);
        }
      }

      // Generate unique run ID to avoid deduplication blocking
      const removeRunId = `remove-${Date.now()}-${Math.random().toString(36).substring(7)}`;
      
      const response = await generateSixImagesParallelWithGoogle({
        prompts: [{ source: 'implicit' as GenerationSource, prompt: removeFurniturePrompt }],
        base_image: baseImageForRemoval,
        style: 'empty',
        parameters: removeParams,
        generation_run_id: removeRunId
      });

      if (!response || !response.results || response.results.length === 0 || !response.results[0]?.image) {
        const errorMessage = response?.results?.[0]?.error || '';
        const isRateLimit = errorMessage.includes('429') || errorMessage.includes('RESOURCE_EXHAUSTED') || errorMessage.includes('rate limit');
        
        if (isRateLimit) {
          setError(t({ 
            pl: "Osiągnięto limit API Google. Poczekaj 1-2 minuty i spróbuj ponownie.", 
            en: "Google API rate limit reached. Please wait 1-2 minutes and try again." 
          }));
        } else {
          setError(t({ pl: "Nie udało się usunąć mebli. Spróbuj ponownie.", en: "Failed to remove furniture. Please try again." }));
        }
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

      setSelectedImage(newImage);
      setGenerationCount((prev) => prev + 1);
      setShowModifications(false);
      setHasAnsweredInteriorQuestion(true);
      setShowSourceReveal(false);

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

      setLoadingProgress(100);
      setStatusMessage({ pl: "Meble zostały usunięte!", en: "Furniture has been removed!" });
    } catch (err: any) {
      console.error('Remove furniture failed:', err);
      const errorMsg = err?.message || String(err);
      const isRateLimit = errorMsg.includes('429') || errorMsg.includes('RESOURCE_EXHAUSTED') || errorMsg.includes('rate limit');
      
      if (isRateLimit) {
        setError(t({ 
          pl: "Osiągnięto limit API Google. Poczekaj 1-2 minuty i spróbuj ponownie.", 
          en: "Google API rate limit reached. Please wait 1-2 minutes and try again." 
        }));
      } else {
        setError(err instanceof Error ? err.message : t({ pl: 'Wystąpił błąd podczas usuwania mebli.', en: 'An error occurred while removing furniture.' }));
      }
    } finally {
      setIsModifying(false);
    }
  };

  const handleShowOriginal = () => {
    let roomImage = (sessionData as any)?.roomImage;
    
    if (!roomImage && typeof window !== 'undefined') {
      try {
        const sessionRoomImage = safeSessionStorage.getItem('aura_session_room_image');
        if (sessionRoomImage) {
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

    let base64Image = roomImage;
    if (roomImage.includes(',')) {
      base64Image = roomImage.split(',')[1];
    }
    
    const dataUrl = `data:image/jpeg;base64,${base64Image}`;
    setOriginalRoomPhotoUrl(dataUrl);
    setShowOriginalRoomPhoto(true);
    setShowModifications(false);
  };

  const handleCustomModification = async () => {
    if (!customModificationText.trim() || !selectedImage) return;

    if (isGuestFullPath && guestModsQuotaBlocked) {
      setModifyLoginOpen(true);
      return;
    }

    const customMod: ModificationOption = {
      id: 'custom_text',
      label: { pl: customModificationText.trim(), en: customModificationText.trim() },
      icon: null,
      category: 'micro'
    };

    const currentStyle = selectedImage?.parameters?.style || 'modern';
    const modificationPrompt = `SYSTEM INSTRUCTION: Image-to-image modification. KEEP: walls, windows, doors, furniture layout, camera angle - IDENTICAL. CHANGE: ${customModificationText.trim()}. Apply this change while maintaining exact furniture positions and room structure where possible. Make sure the change looks natural in ${currentStyle} style.`;

    await handleModification(customMod, modificationPrompt);
    setCustomModificationText('');
  };

  const buildMacroPrompt = (modification: ModificationOption) =>
    buildFullFlowMacroModificationPrompt(modification);

  const buildMicroPrompt = (modification: ModificationOption) => {
    const currentStyle = selectedImage?.parameters?.style || 'modern';
    
    const microPrompts: Record<string, string> = {
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
    
    return microPrompts[modification.id] || `${t(modification.label)} in ${currentStyle} style`;
  };

  const handleFavorite = (imageId: string) => {
    if (!selectedImage || selectedImage.id !== imageId) return;
    setSelectedImage({ ...selectedImage, isFavorite: !selectedImage.isFavorite });
  };

  const sessionImageRatings = resolveSessionImageRatingsMap(
    (sessionData as { imageRatings?: SessionImageRatingsMap } | null)?.imageRatings,
  );

  const resolveHistoryImageAtIndex = useCallback(
    (index: number): GeneratedImage | null => {
      const historyItem = generationHistory[index];
      if (!historyItem?.id || !historyItem.imageUrl) return null;

      const freshRatingsMap = resolveSessionImageRatingsMap(
        (sessionData as { imageRatings?: SessionImageRatingsMap })?.imageRatings,
      );

      let base64Data = historyItem.base64 || '';
      if (!base64Data && historyItem.imageUrl.startsWith('data:')) {
        const parts = historyItem.imageUrl.split(',');
        if (parts.length > 1) base64Data = parts[1] ?? '';
      }

      const resolvedUrl =
        historyItem.imageUrl ||
        (base64Data ? `data:image/png;base64,${base64Data}` : '');
      if (!resolvedUrl) return null;

      return applyRatingsToImage(
        {
          id: historyItem.id,
          url: resolvedUrl,
          base64: base64Data,
          prompt: historyItem.label || 'From history',
          provider: 'google',
          parameters: {
            modificationType: historyItem.type,
            modifications: [],
            iterationCount: 0,
            usedOriginal: false,
          },
          ratings: { aesthetic_match: 0, character: 0, harmony: 0 },
          isFavorite: false,
          createdAt: historyItem.timestamp || Date.now(),
          source: (historyItem.source as GenerationSource) || GenerationSource.Implicit,
          displayIndex: index,
          isBlindSelected: true,
        } as GeneratedImage,
        freshRatingsMap,
      );
    },
    [generationHistory, sessionData],
  );

  const safeHistoryIndex =
    generationHistory.length > 0
      ? Math.min(Math.max(0, currentHistoryIndex), generationHistory.length - 1)
      : 0;
  const activeImageId = selectedImage?.id;
  const tasteRatingPanelVisible = shouldShowTasteRating(activeImageId, sessionImageRatings);
  const currentImageActionsEnabled =
    activeImageId != null && hasTasteRating(activeImageId, sessionImageRatings);

  const handleHistoryNodeClick = (index: number) => {
    if (index < 0 || index >= generationHistory.length) return;

    const historyItem = generationHistory[index];
    const newSelectedImage = resolveHistoryImageAtIndex(index);
    if (!newSelectedImage) return;

    const freshRatingsMap = resolveSessionImageRatingsMap(
      (sessionData as { imageRatings?: SessionImageRatingsMap })?.imageRatings,
    );
    const nodeId = historyItem.id;
    const needsRating = shouldShowTasteRating(nodeId, freshRatingsMap);

    setCurrentHistoryIndex(index);
    setSelectedImage(newSelectedImage);
    setHasAnsweredInteriorQuestion(true);
    setShowModifications(false);
    setShowSourceReveal(!needsRating);

    updateSessionData({
      selectedImage: {
        id: newSelectedImage.id,
        url: newSelectedImage.url,
        base64: newSelectedImage.base64,
        source: newSelectedImage.source,
        provider: 'google' as const,
        parameters: newSelectedImage.parameters,
      },
    } as any);

    requestAnimationFrame(() => {
      tasteRatingPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  };

  const handleContinue = () => {
    stopAllDialogueAudio();
    router.push('/flow/survey1');
  };

  if (!selectedImage) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-graphite">{t({ pl: "Ładowanie...", en: "Loading..." })}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col relative">
      <div className="absolute inset-0 bg-gradient-radial from-pearl-50 via-platinum-50 to-silver-100 -z-10" />
      <div className="w-full px-4 sm:px-8 pb-8 pt-2 relative z-10 xl:flex-1 xl:min-h-0">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-6xl mx-auto space-y-6"
        >
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
                  src={(showOriginalRoomPhoto && originalRoomPhotoUrl) ? originalRoomPhotoUrl : selectedImage!.url}
                  alt={
                    showOriginalRoomPhoto
                      ? t({ pl: "Oryginalne zdjęcie pokoju", en: "Original room photo" })
                      : t({ pl: "Wybrane wnętrze", en: "Selected interior" })
                  }
                />
                {/* Loading Overlay for Modifications */}
                <AnimatePresence>
                  {isModifying && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-10"
                    >
                      <div className="text-center space-y-4 px-6">
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

                        <motion.p
                          key={`${statusMessage.pl}-${statusMessage.en}`}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="text-white font-modern text-lg font-semibold"
                        >
                          {t(statusMessage)}
                        </motion.p>

                        <div className="relative w-64 h-2 bg-white/20 rounded-full overflow-hidden mx-auto">
                          <motion.div
                            className="absolute inset-y-0 left-0 bg-gradient-to-r from-gold-400 to-champagne rounded-full"
                            initial={{ width: 0 }}
                            animate={{ width: `${loadingProgress}%` }}
                            transition={{ duration: 0.5 }}
                          />
                        </div>

                        <div className="flex justify-center items-center gap-4 text-sm text-white/90">
                          <span className="font-modern">{Math.round(loadingProgress)}%</span>
                          {estimatedTime !== undefined && estimatedTime > 0 && (
                            <span className="font-modern">
                              {t({ pl: `~${estimatedTime}s pozostało`, en: `~${estimatedTime}s remaining` })}
                            </span>
                          )}
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
                    handleFavorite(selectedImage!.id);
                  }}
                  className={`absolute top-4 right-4 p-2 rounded-full backdrop-blur transition-all ${
                    selectedImage!.isFavorite ? 'bg-red-100 text-red-500' : 'bg-white/20 text-white hover:bg-white/30'
                  }`}
                >
                  <Heart size={20} fill={selectedImage!.isFavorite ? 'currentColor' : 'none'} aria-hidden="true" />
                </button>
              </div>
            </div>
          </GlassCard>

          <div ref={tasteRatingPanelRef}>
            <AnimatePresence>
              {tasteRatingPanelVisible && selectedImage && (
                <motion.div
                  key={`taste-rating-${selectedImage.id}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.8, ease: 'easeInOut' }}
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
          {selectedImage && currentImageActionsEnabled && (
            <>
              {isGuestFullPath && guestModsQuotaBlocked && (
                <GlassCard variant="flatOnMobile" className="p-4 mb-4 border-gold/30 bg-gold/5">
                  <p className="text-sm text-graphite text-center mb-3 leading-snug">
                    {t({
                      pl: 'Kolejne generacje i modyfikacje wymagają konta. Możesz iść dalej z wybraną wizją.',
                      en: 'More generations and edits need an account. You can continue with your chosen vision.',
                    })}
                  </p>
                  <div className="flex justify-center">
                    <GlassButton type="button" onClick={() => setModifyLoginOpen(true)} className="px-6">
                      {t({ pl: 'Zaloguj się lub załóż konto', en: 'Sign in or create account' })}
                    </GlassButton>
                  </div>
                </GlassCard>
              )}
              {/* Modifications Button */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="flex flex-col sm:flex-row justify-center gap-2 sm:gap-3"
              >
                <GlassButton
                  onClick={() => {
                    if (isGuestFullPath && guestModsQuotaBlocked) {
                      setModifyLoginOpen(true);
                      return;
                    }
                    setShowModifications((m) => !m);
                  }}
                  variant="secondary"
                  className="w-full sm:flex-1 h-12 text-xs sm:text-sm"
                >
                  <Settings size={16} className="mr-2 flex-shrink-0" aria-hidden="true" />
                  <span className="truncate">{showModifications ? t({ pl: 'Ukryj opcje', en: 'Hide options' }) : t({ pl: 'Modyfikuj', en: 'Modify' })}</span>
                </GlassButton>

                <GlassButton
                  onClick={() => {
                    if (isGuestFullPath && guestModsQuotaBlocked) {
                      setModifyLoginOpen(true);
                      return;
                    }
                    void handleRemoveFurniture();
                  }}
                  variant="secondary"
                  className="w-full sm:flex-1 h-12 text-xs sm:text-sm"
                >
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
                                disabled={isLoading || isModifying || (isGuestFullPath && guestModsQuotaBlocked)}
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
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[min(50vh,480px)] overflow-y-auto overscroll-contain scrollbar-hide">
                            {MACRO_MODIFICATIONS.map((mod) => (
                              <GlassButton
                                key={mod.id}
                                onClick={() => handleModification(mod)}
                                variant="secondary"
                                size="sm"
                                className="justify-start text-xs sm:text-sm h-12 px-3 overflow-hidden"
                                disabled={isLoading || isModifying || (isGuestFullPath && guestModsQuotaBlocked)}
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
                            disabled={isLoading || isModifying || (isGuestFullPath && guestModsQuotaBlocked)}
                          />
                          <GlassButton 
                            onClick={handleCustomModification}
                            disabled={
                              isLoading ||
                              isModifying ||
                              !customModificationText.trim() ||
                              (isGuestFullPath && guestModsQuotaBlocked)
                            }
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

          {/* Generation History - Always visible when there's history */}
          {generationHistory.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="mt-6"
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

          {/* Lightbox: zoom image */}
          <AnimatePresence>
            {isLightboxOpen && selectedImage && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
                onClick={() => setIsLightboxOpen(false)}
                role="dialog"
                aria-modal="true"
                aria-label={t({ pl: "Powiększone zdjęcie", en: "Zoomed image" })}
              >
                <div
                  className="relative max-w-[90vw] max-h-[90vh] flex items-center justify-center"
                  onClick={(e) => e.stopPropagation()}
                >
                  <img
                    src={(showOriginalRoomPhoto && originalRoomPhotoUrl) ? originalRoomPhotoUrl : selectedImage.url}
                    alt={showOriginalRoomPhoto ? t({ pl: "Oryginalne zdjęcie pokoju", en: "Original room photo" }) : t({ pl: "Wybrane wnętrze", en: "Selected interior" })}
                    className="max-w-full max-h-[90vh] w-auto object-contain"
                  />
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setIsLightboxOpen(false); }}
                    className="absolute top-4 right-4 p-2 rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors"
                    aria-label={t({ pl: "Zamknij", en: "Close" })}
                  >
                    <X size={24} aria-hidden="true" />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Error Display */}
          {error && (
            <GlassCard variant="flatOnMobile" className="p-4 bg-red-50/50 border-red-200">
              <p className="text-red-600 text-sm">{error}</p>
              <GlassButton
                onClick={() => setError(null)}
                variant="secondary"
                className="mt-2"
              >
                {t({ pl: "Zamknij", en: "Close" })}
              </GlassButton>
            </GlassCard>
          )}

          {/* Feedback Message */}
          {feedbackMessage && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className={`p-4 rounded-lg ${
                feedbackType === 'positive' ? 'bg-green-50/50 border-green-200' :
                feedbackType === 'negative' ? 'bg-red-50/50 border-red-200' :
                'bg-blue-50/50 border-blue-200'
              }`}
            >
              <p className={`text-sm ${
                feedbackType === 'positive' ? 'text-green-700' :
                feedbackType === 'negative' ? 'text-red-700' :
                'text-blue-700'
              }`}>
                {feedbackMessage}
              </p>
            </motion.div>
          )}
        </motion.div>
      </div>

      {/* IDA na dole — `modification` w DIALOGUE_MAP jest na razie puste (nic się nie renderuje).
          Później: uzupełnij pl/en w AwaDialogue.tsx albo przekaż customMessage. */}
      <div className="w-full">
        <AwaDialogue currentStep="modification" fullWidth autoHide />
      </div>

      <LoginModal
        isOpen={modifyLoginOpen}
        onClose={() => setModifyLoginOpen(false)}
        gateMode="hard"
        nudgeLocation="flow_modify_guest"
        nudgeReason="login_required"
        title={{ pl: 'Konto potrzebne do modyfikacji', en: 'Account required for edits' }}
        message={t({
          pl: 'Aby generować kolejne obrazy i modyfikować wizję, zaloguj się lub załóż konto.',
          en: 'Sign in or create an account to generate more images and edit your vision.',
        })}
        redirectPath="/flow/modify"
        onSuccess={() => {
          setModifyLoginOpen(false);
          setGuestModsQuotaBlocked(false);
        }}
      />
    </div>
  );
}
