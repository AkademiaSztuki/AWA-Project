'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useSessionData } from '@/hooks/useSessionData';
import { useLanguage } from '@/contexts/LanguageContext';
import { LocalizedText } from '@/lib/questions/validated-scales';
import { getOrCreateProjectId, startParticipantGeneration, endParticipantGeneration, safeSessionStorage } from '@/lib/supabase';
import { useGoogleAI, getGenerationParameters } from '@/hooks/useGoogleAI';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';
import { GlassSlider } from '@/components/ui/GlassSlider';
import { GenerationHistory } from '@/components/ui/GenerationHistory';
import { AwaDialogue } from '@/components/awa';
import { stopAllDialogueAudio } from '@/hooks/useAudioManager';
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
import Image from 'next/image';
import { GenerationSource } from '@/lib/prompt-synthesis/modes';
import { addGeneratedImageToSpace } from '@/lib/spaces';
import {
  getOrCreateSpaceId,
  saveParticipantImages
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

export default function ModifyPage() {
  const router = useRouter();
  const { t, language } = useLanguage();
  const { sessionData, updateSessionData, isInitialized: isSessionInitialized } = useSessionData();
  const { generateSixImagesParallelWithGoogle, isLoading, error, setError } = useGoogleAI();

  const [selectedImage, setSelectedImage] = useState<GeneratedImage | null>(null);
  const [showModifications, setShowModifications] = useState(false);
  const [generationCount, setGenerationCount] = useState(0);
  const [statusMessage, setStatusMessage] = useState<LocalizedText>({ pl: "Modyfikuję obraz...", en: "Modifying image..." });
  const [loadingStage, setLoadingStage] = useState<1 | 2 | 3>(1);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [estimatedTime, setEstimatedTime] = useState<number | undefined>(undefined);
  const [hasAnsweredInteriorQuestion, setHasAnsweredInteriorQuestion] = useState(false);
  const [hasCompletedRatings, setHasCompletedRatings] = useState(false);
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
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [feedbackType, setFeedbackType] = useState<'positive' | 'neutral' | 'negative'>('neutral');
  const [showSourceReveal, setShowSourceReveal] = useState(true); // Always show for modify page

  const interiorAdvanceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ratingsAdvanceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasInitializedFromSession = useRef(false);

  useEffect(() => {
    return () => {
      if (interiorAdvanceTimeoutRef.current) clearTimeout(interiorAdvanceTimeoutRef.current);
      if (ratingsAdvanceTimeoutRef.current) clearTimeout(ratingsAdvanceTimeoutRef.current);
    };
  }, []);

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
          ratings: imageRatings[persistedSelectedId] || { aesthetic_match: 0, character: 0, harmony: 0, is_my_interior: 0 },
          isFavorite: false,
          createdAt: Date.now(),
          source: persistedSelected.source || GenerationSource.Implicit,
          displayIndex: persistedSelected.displayIndex || 0,
          isBlindSelected: true
        };
        
        setSelectedImage(restoredImage);
        
        // Restore questionnaire state if ratings exist
        if (restoredImage.ratings.is_my_interior > 0) {
          setHasAnsweredInteriorQuestion(true);
        }
        if (restoredImage.ratings.aesthetic_match > 0) {
          setHasCompletedRatings(true);
        }
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
          ratings: imageRatings[persistedSelectedId] || { aesthetic_match: 0, character: 0, harmony: 0, is_my_interior: 0 },
          isFavorite: false,
          createdAt: Date.now(),
          source: persistedSelected.source || GenerationSource.Implicit,
          displayIndex: persistedSelected.displayIndex || 0,
          isBlindSelected: true
        };
        
        setSelectedImage(restoredImage);
        
        // Restore questionnaire state if ratings exist
        if (restoredImage.ratings.is_my_interior > 0) {
          setHasAnsweredInteriorQuestion(true);
        }
        if (restoredImage.ratings.aesthetic_match > 0) {
          setHasCompletedRatings(true);
        }
      }

      // Restore generation history - first from matrixHistory (all 6 initial images), then modifications
      const matrixHistory = typedSessionData?.matrixHistory || [];
      const savedGenerations = typedSessionData?.generations || [];
      
      let fullHistory: Array<{
        id: string;
        type: 'initial' | 'micro' | 'macro';
        label: string;
        timestamp: number;
        imageUrl: string;
        base64?: string;
        source?: string;
        isSelected?: boolean;
      }> = [];
      
      // First: Add all initial matrix images (the 6 generated images)
      if (matrixHistory.length > 0) {
        fullHistory = matrixHistory.map((item: any) => ({
          id: item.id,
          type: 'initial' as const,
          label: item.label || 'Wizja',
          timestamp: item.timestamp || Date.now(),
          imageUrl: item.imageUrl || item.url || '',
          base64: item.base64 || '',
          source: item.source,
          isSelected: item.isSelected || item.id === persistedSelectedId
        }));
        console.log('[Modify] Restored matrix history:', fullHistory.length, 'items');
      }
      
      // Then: Add any modifications from generations
      if (savedGenerations.length > 0) {
        const modificationHistory = savedGenerations
          .filter((gen: any) => gen.type === 'micro' || gen.type === 'macro' || gen.type === 'remove_furniture')
          .map((gen: any) => {
            // Try to find matching image URL from generatedImages
            const matchingImage = savedGeneratedImages.find((img: any) => 
              img.id === gen.id || 
              img.id?.includes(gen.id) || 
              gen.id?.includes(img.id?.split('-').slice(0, -1).join('-'))
            );
            
            return {
              id: gen.id,
              type: (gen.type === 'remove_furniture' ? 'micro' : gen.type) as 'initial' | 'micro' | 'macro',
              label: gen.modification || gen.prompt?.substring(0, 30) || 'Modyfikacja',
              timestamp: gen.timestamp || Date.now(),
              imageUrl: matchingImage?.url || ''
            };
          });
        
        fullHistory = [...fullHistory, ...modificationHistory];
      }
      
      if (fullHistory.length > 0) {
        setGenerationHistory(fullHistory);
        // Set current index to the selected image or last item
        const selectedIdx = fullHistory.findIndex(h => h.isSelected || h.id === persistedSelectedId);
        setCurrentHistoryIndex(selectedIdx >= 0 ? selectedIdx : fullHistory.length - 1);
      }

      // Restore generation count
      setGenerationCount(savedGenerations.length);
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
    if (!selectedImage || selectedImage.id !== imageId) return;

    const updatedRatings = { ...selectedImage.ratings, [rating]: value };
    setSelectedImage({ ...selectedImage, ratings: updatedRatings });

    // Save rating to session
    const typedSessionData = sessionData as any;
    const imageRatings = typedSessionData?.imageRatings || {};
    imageRatings[imageId] = updatedRatings;
    await updateSessionData({ imageRatings } as any);

    if (!options?.suppressProgress) {
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
          setFeedbackMessage(t({ pl: "Doskonale! Udało nam się odtworzyć Twoje wnętrze. Teraz oceń szczegóły.", en: "Perfect! We managed to recreate your interior. Now rate the details." }));
          setFeedbackType('positive');
        }
        
        setTimeout(() => setFeedbackMessage(null), 5000);
      }
      
      if (rating !== 'is_my_interior') {
        const allRatingsComplete = updatedRatings.aesthetic_match > 0;
        
        if (allRatingsComplete) {
          setHasCompletedRatings(true);
          
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
    }
  };

  const handleModification = async (modification: ModificationOption, customPrompt?: string) => {
    if (!selectedImage) return;
    
    if (isLoading || isModifying) {
      console.warn('[Modification] Already generating, ignoring duplicate request');
      return;
    }
    
    if (!hasAnsweredInteriorQuestion) {
      setError(t({ pl: "Najpierw odpowiedz na pytanie 'Czy to moje wnętrze?' przed modyfikacją obrazu.", en: "Please answer the question 'Is this my interior?' before modifying the image." }));
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

    setIsModifying(true);
    setLoadingStage(2);
    setLoadingProgress(40);
    setStatusMessage({ pl: `Modyfikuję obraz: ${t(modification.label)}...`, en: `Modifying image: ${t(modification.label)}...` });
    setEstimatedTime(30);

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

      setLoadingProgress(60);
      setStatusMessage({ pl: `Przetwarzam modyfikację: ${t(modification.label)}...`, en: `Processing modification: ${t(modification.label)}...` });
      
      // Generate unique run ID for each modification to avoid deduplication blocking
      const modificationRunId = `mod-${Date.now()}-${Math.random().toString(36).substring(7)}`;
      
      const response = await generateSixImagesParallelWithGoogle({
        prompts: [{ source: 'implicit' as GenerationSource, prompt: modificationPrompt }],
        base_image: baseImageSource,
        style: isMacro ? modification.id : (selectedImage.parameters?.style || 'modern'),
        parameters: {
          ...parameters,
          strength: parameters.strength ?? (isMacro ? 0.75 : 0.25)
        },
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
        ratings: { aesthetic_match: 0, character: 0, harmony: 0, is_my_interior: 0 },
        isFavorite: false,
        createdAt: Date.now(),
      };

      setSelectedImage(newImage);
      setGenerationCount((prev) => prev + 1);
      setShowModifications(false);
      
      setHasAnsweredInteriorQuestion(false);
      setHasCompletedRatings(false);
      setShowSourceReveal(true);
      
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
            name: activeSpaceName || 'Moja Przestrzeń'
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
        await saveParticipantImages(userHash, imagesToSave);
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
      setGenerationHistory((prev) => [...prev, historyNode]);
      setCurrentHistoryIndex(generationHistory.length);
      
      // Update session with new image and generation info (single call to avoid race conditions)
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
          base64: newImage.base64, // Include base64 for future modifications!
          source: selectedImage?.source,
          provider: 'google' as const,
          parameters: newImage.parameters
        },
        blindSelectionMade: true
      } as any);

      try { if (jobId) await endParticipantGeneration(jobId, { status: 'success', latency_ms: 0 }); } catch {}
    } catch (err) {
      console.error('Modification failed:', err);
      setIsModifying(false);
      setError(err instanceof Error ? err.message : t({ pl: 'Wystąpił nieznany błąd podczas modyfikacji.', en: 'An unknown error occurred during modification.' }));
    }
  };

  const handleRemoveFurniture = async () => {
    if (!selectedImage) return;
    
    if (!hasAnsweredInteriorQuestion) {
      setError(t({ pl: "Najpierw odpowiedz na pytanie 'Czy to moje wnętrze?' przed usunięciem mebli.", en: "Please answer the question 'Is this my interior?' before removing furniture." }));
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
      // Generate unique run ID to avoid deduplication blocking
      const removeRunId = `remove-${Date.now()}-${Math.random().toString(36).substring(7)}`;
      
      const response = await generateSixImagesParallelWithGoogle({
        prompts: [{ source: 'implicit' as GenerationSource, prompt: removeFurniturePrompt }],
        base_image: baseImageForRemoval,
        style: 'empty',
        parameters: {
          ...getGenerationParameters('micro', generationCount),
          strength: 0.3
        },
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
        ratings: { aesthetic_match: 0, character: 0, harmony: 0, is_my_interior: 0 },
        isFavorite: false,
        createdAt: Date.now(),
      };

      setSelectedImage(newImage);
      setGenerationCount((prev) => prev + 1);
      setShowModifications(false);
      
      setHasAnsweredInteriorQuestion(false);
      setHasCompletedRatings(false);

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

  const buildMacroPrompt = (modification: ModificationOption) => {
    const stylePrompts: Record<string, string> = {
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

    const styleChange = stylePrompts[modification.id];
    
    return `${styleChange}. Keep walls, doors, windows, ceiling, stairs exactly in same positions. Transform colors, furniture, decorations, flooring, and accessories to match the style completely.`;
  };

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

  const handleHistoryNodeClick = (index: number) => {
    if (index < 0 || index >= generationHistory.length) return;
    
    const historyItem = generationHistory[index];
    setCurrentHistoryIndex(index);
    
    // Switch to the clicked image
    if (historyItem.imageUrl) {
      // Extract base64 from data URL if needed
      let base64Data = (historyItem as any).base64 || '';
      if (!base64Data && historyItem.imageUrl.startsWith('data:')) {
        const parts = historyItem.imageUrl.split(',');
        if (parts.length > 1) {
          base64Data = parts[1];
        }
      }
      
      const newSelectedImage: GeneratedImage = {
        id: historyItem.id,
        url: historyItem.imageUrl,
        base64: base64Data,
        prompt: historyItem.label || 'From history',
        provider: 'google',
        parameters: { modificationType: historyItem.type, modifications: [], iterationCount: 0, usedOriginal: false },
        ratings: { aesthetic_match: 0, character: 0, harmony: 0, is_my_interior: 0 },
        isFavorite: false,
        createdAt: historyItem.timestamp || Date.now(),
        source: (historyItem as any).source || GenerationSource.Implicit,
        displayIndex: index,
        isBlindSelected: true
      };
      
      setSelectedImage(newSelectedImage);
      // Reset questionnaire state when switching images
      setHasAnsweredInteriorQuestion(false);
      setHasCompletedRatings(false);
      setShowSourceReveal(true);
      
      // Also update session so base64 is preserved for modifications
      updateSessionData({
        selectedImage: {
          id: newSelectedImage.id,
          url: newSelectedImage.url,
          base64: base64Data,
          source: newSelectedImage.source,
          provider: 'google' as const,
          parameters: newSelectedImage.parameters
        }
      } as any);
      
      console.log('[Modify] Switched to history item:', historyItem.id, historyItem.label);
    }
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
    <div className="min-h-screen flex flex-col w-full relative">
      <div className="absolute inset-0 bg-gradient-radial from-pearl-50 via-platinum-50 to-silver-100 -z-10" />
      <div className="flex-1 px-8 pb-8 pt-2 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-6xl mx-auto space-y-6"
        >
          <AwaDialogue currentStep="modification" />

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
                className="relative aspect-[4/3] rounded-lg overflow-hidden cursor-zoom-in"
                title={t({ pl: "Kliknij, aby powiększyć", en: "Click to zoom" })}
              >
                <Image 
                  src={(showOriginalRoomPhoto && originalRoomPhotoUrl) ? originalRoomPhotoUrl : selectedImage.url} 
                  alt={showOriginalRoomPhoto ? t({ pl: "Oryginalne zdjęcie pokoju", en: "Original room photo" }) : t({ pl: "Wybrane wnętrze", en: "Selected interior" })} 
                  fill 
                  className="object-cover" 
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
                    handleFavorite(selectedImage.id);
                  }}
                  className={`absolute top-4 right-4 p-2 rounded-full backdrop-blur transition-all ${
                    selectedImage.isFavorite ? 'bg-red-100 text-red-500' : 'bg-white/20 text-white hover:bg-white/30'
                  }`}
                >
                  <Heart size={20} fill={selectedImage.isFavorite ? 'currentColor' : 'none'} aria-hidden="true" />
                </button>
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
                          value={selectedImage.ratings.is_my_interior || 3}
                          onChange={(value) => {
                            handleImageRating(selectedImage.id, 'is_my_interior', value, { suppressProgress: true });
                            if (interiorAdvanceTimeoutRef.current) clearTimeout(interiorAdvanceTimeoutRef.current);
                            interiorAdvanceTimeoutRef.current = setTimeout(() => {
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
                          value={selectedImage.ratings[key as keyof typeof selectedImage.ratings] || 4}
                          onChange={(value) => {
                            handleImageRating(selectedImage.id, key as any, value, { suppressProgress: true });
                            if (ratingsAdvanceTimeoutRef.current) clearTimeout(ratingsAdvanceTimeoutRef.current);
                            ratingsAdvanceTimeoutRef.current = setTimeout(() => {
                              setHasCompletedRatings(true);
                            }, 800);
                          }}
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
          {selectedImage && hasCompletedRatings && (
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
                                disabled={isLoading || isModifying}
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
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {MACRO_MODIFICATIONS.map((mod) => (
                              <GlassButton
                                key={mod.id}
                                onClick={() => handleModification(mod)}
                                variant="secondary"
                                size="sm"
                                className="justify-start text-xs sm:text-sm h-12 px-3 overflow-hidden"
                                disabled={isLoading || isModifying}
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
                            disabled={isLoading || isModifying}
                          />
                          <GlassButton 
                            onClick={handleCustomModification}
                            disabled={isLoading || isModifying || !customModificationText.trim()}
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
                currentIndex={currentHistoryIndex}
                onNodeClick={handleHistoryNodeClick}
              />
            </motion.div>
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
    </div>
  );
}
