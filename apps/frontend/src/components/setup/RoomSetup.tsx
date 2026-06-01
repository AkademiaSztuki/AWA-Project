"use client";

import React, { useState, useEffect, useLayoutEffect, useCallback, useMemo, useRef } from 'react';
import { flushSync } from 'react-dom';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';
import { GlassSlider } from '@/components/ui/GlassSlider';
import { AwaDialogue } from '@/components/awa/AwaDialogue';
import { MoodGrid } from '@/components/research';
import { PAIN_POINTS, getQuestionsForRoom } from '@/lib/questions/adaptive-questions';
import { ArrowRight, ArrowLeft, Camera, X, Sparkles } from 'lucide-react';
import Image from 'next/image';
import { useModalAPI } from '@/hooks/useModalAPI';
import { useDialogueVoice } from '@/hooks/useDialogueVoice';
import { stopAllDialogueAudio } from '@/hooks/useAudioManager';
import DialogueAudioPlayer from '@/components/ui/DialogueAudioPlayer';
import { saveRoom } from '@/lib/gcp-participant-profile';
import { saveSessionToGcp } from '@/lib/gcp-data';
import { useSession, useSessionData } from '@/hooks';
import { getSessionStoreSnapshot } from '@/hooks/useSession';
import { saveParticipantImages } from '@/lib/remote-spaces';
import { useGoogleAI, getGenerationParameters, type GoogleGenerationParameters } from '@/hooks/useGoogleAI';
import { prepareGenerationDimensionsFromRoomBase64 } from '@/lib/image-aspect';
import { GenerationSource } from '@/lib/prompt-synthesis/modes';
import { SessionData } from '@/types';
import { RoomPreferencePayload, RoomActivity } from '@/types/deep-personalization';
import { fileToNormalizedBase64 } from '@/lib/utils';
import { COLOR_PALETTE_OPTIONS, getPaletteLabel } from '@/components/setup/paletteOptions';
import { STYLE_OPTIONS, getStyleLabel } from '@/lib/questions/style-options';
import { SensoryTestSuite, type SensoryTestSuiteHandle } from '@/components/research/SensoryTests';
import {
  SEMANTIC_DIFFERENTIAL_DIMENSIONS,
  MUSIC_PREFERENCES,
  TEXTURE_PREFERENCES,
  LIGHT_PREFERENCES
} from '@/lib/questions/validated-scales';
import { FULL_FLOW_GLASS_SHELL, GLASS_CARD_SCROLL_STEP } from '@/lib/flow/glass-step-layout';
import { useFullFlowProgress } from '@/contexts/FullFlowProgressContext';
import {
  FULL_FLOW_MAX_JOURNEY_INDEX_STORAGE_KEY,
  FULL_FLOW_PROFILE_STEP_QUERY_KEY,
  fullFlowIndexFromRoomStep,
  type RoomSetupStepId,
} from '@/lib/flow/full-flow-progress';
import { mapActivitiesToRecommendations } from '@/lib/preferences/activity-mapping';
import { normalizeSemanticTo01 } from '@/lib/semantic-scale';

// Helper function to generate a room name based on its type

type SetupStep = 
  | 'photo_upload'
  | 'preference_source'
  | 'preference_questions'
  | 'prs_current'
  | 'usage_context'
  | 'activities'
  | 'pain_points'
  | 'social_dynamics'
  | 'prs_target'
  | 'summary';

// Map room setup steps to AwaDialogue flow steps
const STEP_TO_DIALOGUE: Record<SetupStep, string> = {
  photo_upload: 'upload',
  preference_source: 'room_preference_source',
  preference_questions: 'wizard_semantic', // Uses semantic for preference questions
  prs_current: 'room_prs_current',
  usage_context: 'room_usage',
  activities: 'room_activities',
  pain_points: 'room_pain_points',
  social_dynamics: 'room_usage', // Fallback
  prs_target: 'room_prs_target',
  summary: 'room_summary'
};

const BASE_STEPS: SetupStep[] = [
  'photo_upload',
  'preference_source',
  'preference_questions',
  'prs_current',
  'activities',
  'usage_context',
  'pain_points',
  'prs_target',
  'summary'
];

/** Visual A/B count in PreferenceQuestionsStep; index === length means sensory suite. */
const PREFERENCE_VISUAL_QUESTION_COUNT = 3;

const buildRoomStepStorageKey = (roomId: string) => `awa-room-setup-step:${roomId}`;

const getValidStep = (steps: SetupStep[], candidate?: string | null) => {
  if (!candidate) return null;
  return steps.includes(candidate as SetupStep) ? (candidate as SetupStep) : null;
};

type PreferenceSource = 'profile' | 'complete';
type SemanticDimensionId = 'warmth' | 'brightness' | 'complexity' | 'texture';

interface RoomData {
  name: string;
  roomType: string;
  usageType: 'solo' | 'shared';
  sharedWith?: string[];
  photos?: string[];
  prsCurrent?: { x: number; y: number };
  moodPreference?: { x: number; y: number };
  painPoints: string[];
  activities: RoomActivity[];
  socialDynamics?: any;
  prsTarget?: { x: number; y: number };
  preferenceSource?: PreferenceSource;
  explicitPreferences?: RoomPreferencePayload;
}

/**
 * RoomSetup - Tier 3 setup (per room)
 * 
 * Adaptive flow based on:
 * - Room type (bedroom, living room, etc)
 * - Social context (solo vs shared)
 * 
 * Collects:
 * - Room basics (name, type, who uses it)
 * - Photos with AI analysis
 * - PRS current state
 * - Pain points
 * - Activities
 * - Social dynamics (if shared)
 * - Room-specific visual DNA (swipes)
 * - PRS target state
 * 
 * Takes ~8-10 minutes
 */
export function RoomSetup({ householdId }: { householdId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { language, tp, joinCopy } = useLanguage();
  const { sessionData, updateSessionData } = useSessionData();
  const { setRoomStep } = useFullFlowProgress();
  const { volume: voiceVolume, isEnabled: voiceEnabled } = useDialogueVoice();
  
  const [currentStep, setCurrentStep] = useState<SetupStep>('photo_upload');
  const hasRestoredStepRef = useRef(false);
  const [roomData, setRoomData] = useState<RoomData>({
    name: '',
    roomType: '',
    usageType: 'solo',
    painPoints: [],
    activities: []
  });
  const [isSaving, setIsSaving] = useState(false);
  const [ttsAudioUrl, setTtsAudioUrl] = useState<string | null>(null);
  const [ttsError, setTtsError] = useState<string | null>(null);
  const [isTtsPlaying, setIsTtsPlaying] = useState(false);
  const [showInitialAnalysisDialog, setShowInitialAnalysisDialog] = useState(false);
  const [analysisDialogActive, setAnalysisDialogActive] = useState(false);
  const [analysisDialogId, setAnalysisDialogId] = useState<string | null>(null);
  const [analysisDialogMessages, setAnalysisDialogMessages] = useState<string[] | null>(null);
  const [furnitureSuggestionDialogActive, setFurnitureSuggestionDialogActive] = useState(false);
  const [analysisCompleted, setAnalysisCompleted] = useState(false);
  const lastSpokenTextRef = useRef<string | null>(null);
  const ttsAbortRef = useRef<AbortController | null>(null);
  const pendingTtsTextRef = useRef<string | null>(null);
  const ttsInFlightRef = useRef(false);
  const ttsStartedForCommentRef = useRef<string | null>(null);
  const analysisActivatedForRef = useRef<string | null>(null);
  const analysisDialogEndedRef = useRef<string | null>(null);
  const ttsStartedForDialogRef = useRef<string | null>(null);
  const initialDialogShownRef = useRef<boolean>(false);
  const [pendingGeminiAfterInitial, setPendingGeminiAfterInitial] = useState(false);
  const waitingForTtsToShowFurnitureSuggestionRef = useRef<boolean>(false);
  const geminiTextPendingSeenRef = useRef<string | null>(null);
  /** Survives unmount of PreferenceQuestionsStep so Back from e.g. prs_current reopens last phase, not visual Q1. */
  const [preferenceQuestionsProgress, setPreferenceQuestionsProgress] = useState(0);
  const prevRoomStepRef = useRef<SetupStep | null>(null);

  const shouldShowPreferenceQuestions = roomData.preferenceSource === 'complete';
  const steps = useMemo(
    () =>
      shouldShowPreferenceQuestions
        ? BASE_STEPS
        : BASE_STEPS.filter((step) => step !== 'preference_questions'),
    [shouldShowPreferenceQuestions]
  );
  const stepStorageKey = useMemo(() => buildRoomStepStorageKey(householdId), [householdId]);

  useEffect(() => {
    const stepFromUrl = searchParams.get(FULL_FLOW_PROFILE_STEP_QUERY_KEY);
    const urlStep = getValidStep(steps, stepFromUrl);
    if (urlStep && typeof window !== 'undefined') {
      const maxRaw = sessionStorage.getItem(FULL_FLOW_MAX_JOURNEY_INDEX_STORAGE_KEY);
      const maxParsed = parseInt(maxRaw || '0', 10);
      const safeMax = Number.isFinite(maxParsed) && maxParsed >= 0 ? maxParsed : 0;
      const minIndex = fullFlowIndexFromRoomStep(urlStep as RoomSetupStepId);
      if (safeMax >= minIndex) {
        setCurrentStep(urlStep);
        sessionStorage.setItem(stepStorageKey, urlStep);
        hasRestoredStepRef.current = true;
        router.replace(`/setup/room/${householdId}`, { scroll: false });
        return;
      }
    }

    if (hasRestoredStepRef.current) return;
    hasRestoredStepRef.current = true;
    if (typeof window === 'undefined') return;
    const storedStep = sessionStorage.getItem(stepStorageKey);
    const restored = getValidStep(steps, storedStep);
    if (restored) {
      setCurrentStep(restored);
    }
  }, [searchParams, steps, stepStorageKey, householdId, router]);

  useEffect(() => {
    if (!steps.includes(currentStep)) {
      setCurrentStep(steps[0] ?? 'photo_upload');
    }
  }, [steps, currentStep]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    sessionStorage.setItem(stepStorageKey, currentStep);
  }, [stepStorageKey, currentStep]);

  useEffect(() => {
    setRoomStep(currentStep as RoomSetupStepId);
    return () => {
      setRoomStep(null);
    };
  }, [currentStep, setRoomStep]);

  useLayoutEffect(() => {
    const prev = prevRoomStepRef.current;
    if (currentStep === 'preference_questions' && prev === 'prs_current') {
      setPreferenceQuestionsProgress(PREFERENCE_VISUAL_QUESTION_COUNT);
    }
    prevRoomStepRef.current = currentStep;
  }, [currentStep]);

  const currentStepIndex = Math.max(0, steps.indexOf(currentStep));

  const stopDialogsAndAudio = useCallback(() => {
    stopAllDialogueAudio();
    if (ttsAbortRef.current) {
      ttsAbortRef.current.abort();
      ttsAbortRef.current = null;
    }
    pendingTtsTextRef.current = null;
    ttsStartedForDialogRef.current = null;
    ttsStartedForCommentRef.current = null;
    ttsInFlightRef.current = false;
    waitingForTtsToShowFurnitureSuggestionRef.current = false;
    geminiTextPendingSeenRef.current = null;
    setTtsAudioUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setIsTtsPlaying(false);
    setShowInitialAnalysisDialog(false);
    setAnalysisDialogActive(false);
    setAnalysisDialogId(null);
    setAnalysisDialogMessages(null);
    setFurnitureSuggestionDialogActive(false);
  }, []);

  const handleNext = () => {
    stopDialogsAndAudio();
    if (currentStep === 'prs_current' && roomData.prsCurrent) {
      void updateSessionData({ prsCurrent: roomData.prsCurrent });
    }
    if (currentStep === 'prs_target' && roomData.prsTarget) {
      void updateSessionData({
        ...(roomData.prsCurrent ? { prsCurrent: roomData.prsCurrent } : {}),
        prsTarget: roomData.prsTarget,
      });
    }
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < steps.length) {
      setCurrentStep(steps[nextIndex]);
    }
  };

  const handleBack = () => {
    stopDialogsAndAudio();
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setCurrentStep(steps[prevIndex]);
    } else {
      // Leave room setup: use history so /setup/household → room returns to household,
      // dashboard → room returns to dashboard. Pushing /dashboard broke anon onboarding (home redirect).
      router.back();
    }
  };

  const handleComplete = async () => {
    stopDialogsAndAudio();
    setIsSaving(true);
    try {
      console.log('[RoomSetup] Saving room:', roomData);
      console.log('[RoomSetup] Household ID:', householdId);

      const activityContext =
        roomData.preferenceSource === 'complete' && (roomData.activities?.length || 0) > 0
          ? mapActivitiesToRecommendations(roomData.activities)
          : undefined;
      
      // Try to save to Supabase, but don't block navigation if it takes too long
      const saveRoomPayload = {
        householdId,
        name: roomData.name,
        roomType: roomData.roomType,
        usageType: roomData.usageType,
        sharedWith: roomData.sharedWith || [],
        preferenceSource: roomData.preferenceSource === 'complete' ? 'questions' : roomData.preferenceSource,
        roomPreferencePayload: roomData.explicitPreferences,
        currentPhotos: (roomData.photos || []).map(url => ({ 
          url, 
          analysis: {
            clutter: 0,
            dominantColors: [],
            detectedObjects: [],
            lightQuality: 'bright',
            aiComment: '',
            humanComment: ''
          },
          uploadedAt: new Date().toISOString()
        })),
        prsCurrent: roomData.prsCurrent || { x: 0, y: 0 },
        prsTarget: roomData.prsTarget || { x: 0, y: 0 },
        painPoints: roomData.painPoints,
        activities: (roomData.activities || []).map((activity) => ({
          type: activity.type,
          frequency: activity.frequency,
          satisfaction: activity.satisfaction,
          timeOfDay: activity.timeOfDay,
          withWhom: activity.withWhom
        })),
        activityContext
      } as Parameters<typeof saveRoom>[0];
      try {
        const savedRoom = await Promise.race([
          saveRoom(saveRoomPayload),
          new Promise<null>((resolve) => setTimeout(() => resolve(null), 4000))
        ]);
        
        if (savedRoom) {
          console.log('[RoomSetup] Room saved with ID:', savedRoom.id);
        } else {
          console.warn('[RoomSetup] Room save timed out, continuing to generate');
        }
      } catch (dbError) {
        console.warn('[RoomSetup] Could not save to DB (migrations not applied?), continuing anyway:', dbError);
        // Continue to generate even if DB save fails
      }
      
      console.log('[RoomSetup] Navigating to generate flow');
      
      // CRITICAL: Use base64 photos, not blob URLs
      // roomData.photos contains blob URLs for display, but we need base64 for generation
      // We need to get base64 from PhotoUploadStep - check if we can access it from roomData
      // If roomData.photos exists but is blob URLs, we need to convert them
      let roomImageBase64: string | undefined = undefined;
      
      if (roomData.photos && roomData.photos.length > 0) {
        const firstPhoto = roomData.photos[0];
        // Check if it's a blob URL
        if (firstPhoto.startsWith('blob:')) {
          console.log('[RoomSetup] Converting blob URL to base64 for roomImage');
          try {
            const response = await fetch(firstPhoto);
            const blob = await response.blob();
            const file = new File([blob], 'room_photo.jpg', { type: blob.type });
            roomImageBase64 = await fileToNormalizedBase64(file);
            console.log('[RoomSetup] Converted blob URL to base64, length:', roomImageBase64.length);
          } catch (error) {
            console.error('[RoomSetup] Error converting blob URL to base64:', error);
            // Fallback to sessionData.roomImage if conversion fails
            roomImageBase64 = sessionData.roomImage;
          }
        } else if (firstPhoto.startsWith('data:')) {
          // Already base64 with data URI prefix
          roomImageBase64 = firstPhoto.split(',')[1];
        } else {
          // Assume it's already base64 without prefix
          roomImageBase64 = firstPhoto;
        }
      } else {
        roomImageBase64 = sessionData.roomImage;
      }
      
      console.log('[RoomSetup] Saving roomImage to sessionData:', {
        hasRoomImage: !!roomImageBase64,
        length: roomImageBase64?.length || 0,
        isBase64: roomImageBase64 && !roomImageBase64.startsWith('blob:') && !roomImageBase64.startsWith('http'),
        firstChars: roomImageBase64?.substring(0, 50) || 'N/A'
      });
      
      // Ensure the new space exists and becomes active for future generations
      const existingSpaces = ((sessionData as any)?.spaces || []) as Array<{
        id: string;
        name: string;
        type: string;
        images: any[];
        createdAt: string;
        updatedAt: string;
      }>;
      const targetSpaceId = `space_${householdId || Date.now()}`;
      const maybeExistingSpace = existingSpaces.find((s) => s.id === targetSpaceId);
      const spaceName =
        roomData.name?.trim() ||
        (tp("Nowa przestrzeń", "New Space"));

      const spacePayload = {
        id: targetSpaceId,
        name: spaceName,
        type: roomData.roomType || 'personal',
        images: maybeExistingSpace?.images || [],
        createdAt: maybeExistingSpace?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const updatedSpaces =
        maybeExistingSpace
          ? existingSpaces.map((s) => (s.id === targetSpaceId ? spacePayload : s))
          : [...existingSpaces, spacePayload];

      const rp = roomData.explicitPreferences;
      const roomExplicitToRoot: Record<string, unknown> = {};
      if (rp?.semanticDifferential) {
        roomExplicitToRoot.semanticDifferential = rp.semanticDifferential;
      }
      if (rp?.colorsAndMaterials) {
        roomExplicitToRoot.colorsAndMaterials = {
          selectedPalette: rp.colorsAndMaterials.selectedPalette || '',
          topMaterials: rp.colorsAndMaterials.topMaterials || [],
          selectedStyle: rp.colorsAndMaterials.selectedStyle,
        };
      }
      if (rp?.sensoryPreferences) {
        roomExplicitToRoot.sensoryPreferences = rp.sensoryPreferences;
      }
      if (rp?.biophiliaScore !== undefined) {
        roomExplicitToRoot.biophiliaScore = rp.biophiliaScore;
      }
      if (rp?.natureMetaphor !== undefined) {
        roomExplicitToRoot.natureMetaphor = rp.natureMetaphor;
      }

      await updateSessionData({
        roomType: roomData.roomType,
        roomName: roomData.name,
        roomUsageType: roomData.usageType,
        roomSharedWith: roomData.sharedWith || [],
        roomPainPoints: roomData.painPoints,
        roomActivities: roomData.activities,
        roomPreferenceSource: roomData.preferenceSource,
        roomPreferences: roomData.explicitPreferences,
        roomActivityContext: activityContext,
        roomImage: roomImageBase64, // Use converted base64, not blob URL
        prsCurrent: roomData.prsCurrent,
        prsTarget: roomData.prsTarget,
        currentSpaceId: targetSpaceId,
        spaces: updatedSpaces,
        // Clear old generation data for new room
        matrixHistory: [],
        selectedImage: null,
        blindSelectionMade: false,
        generatedImages: [],
        generations: [],
        ...roomExplicitToRoot,
      } as any);

      await saveSessionToGcp(getSessionStoreSnapshot() as unknown as Record<string, unknown>);

      console.log('[RoomSetup] Session updated, navigating to generate flow');
      router.push(`/flow/generate`);

      // Save room photos to participant_images in background (do not block navigation)
      try {
        const userHash = (sessionData as any)?.userHash;
        if (userHash && roomImageBase64) {
          // Convert base64 to data URL for saveParticipantImages
          const dataUrl = `data:image/jpeg;base64,${roomImageBase64}`;
          void saveParticipantImages(userHash, [
            {
              url: dataUrl,
              type: 'room_photo',
              is_favorite: false,
            },
          ])
            .then((res) => {
              if (res.ok && res.imageIds[0]) {
                void updateSessionData({ roomPhotoImageId: res.imageIds[0] } as Partial<SessionData>);
              }
              if (!res.ok) {
                console.warn('[RoomSetup] Room photo cloud save incomplete:', res);
                if (typeof window !== 'undefined') {
                  window.alert(
                    tp(
                      'Nie udało się zapisać zdjęcia pokoju w chmurze. Sprawdź połączenie lub spróbuj ponownie później.',
                      'Could not save your room photo to cloud storage. Check your connection or try again later.',
                    ),
                  );
                }
              }
            })
            .catch((e) => {
              console.warn('[RoomSetup] Failed to save room photo to participant_images:', e);
            });
        }
      } catch (e) {
        console.warn('[RoomSetup] Failed to start room photo save:', e);
      }
      
    } catch (error) {
      console.error('[RoomSetup] Error in handleComplete:', error);
      alert('Błąd podczas zapisywania pokoju. Spróbuj ponownie.');
    } finally {
      setIsSaving(false);
    }
  };

  const roomAnalysis = (sessionData as any)?.roomAnalysis;
  const roomCommentRaw =
    language === 'pl'
      ? (roomAnalysis?.comment_pl ?? roomAnalysis?.human_comment ?? roomAnalysis?.comment)
      : (roomAnalysis?.comment_en ?? roomAnalysis?.comment);
  const roomComment =
    roomCommentRaw == null || roomCommentRaw === ''
      ? undefined
      : joinCopy(String(roomCommentRaw));
  const hasPhotos = roomData.photos && roomData.photos.length > 0;
  const isAlreadySeen = (sessionData as any)?.roomAnalysisCommentSeen === roomComment;
  const shouldShowAnalysis = currentStep === 'photo_upload' && hasPhotos && roomComment && !isAlreadySeen;
  const shouldShowInitialDialog = currentStep === 'photo_upload' && hasPhotos && !initialDialogShownRef.current;
  const analysisExtraInfo = joinCopy(
    language === 'pl'
      ? 'Sugestia: Jeśli chcesz, możesz usunąć meble ze zdjęcia przyciskiem poniżej. Pomoże to stworzyć zupełnie nową aranżację bez sugerowania się obecnym układem.'
      : 'Pro Tip: You can remove furniture using the button below. This helps create a completely new arrangement without being influenced by the current layout.',
  );

  const requestTts = useCallback((text: string, force = false) => {
    if (!text || !voiceEnabled) return;
    if (!force && lastSpokenTextRef.current === text) return;
    if (isTtsPlaying || ttsInFlightRef.current) {
      pendingTtsTextRef.current = text;
      return;
    }

    lastSpokenTextRef.current = text;
    setTtsError(null);
    setTtsAudioUrl(null);
    stopAllDialogueAudio();
    ttsInFlightRef.current = true;

    if (ttsAbortRef.current) {
      ttsAbortRef.current.abort();
    }
    const controller = new AbortController();
    ttsAbortRef.current = controller;

    (async () => {
      try {
        const response = await fetch('/api/elevenlabs/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text }),
          signal: controller.signal
        });

        if (!response.ok) {
          const errorText = await response.text().catch(() => '');
          const message = errorText || `HTTP ${response.status}`;
          console.error('ElevenLabs TTS error:', response.status, message);
          setTtsError(message);
          setIsTtsPlaying(false);
          ttsInFlightRef.current = false;
          return;
        }

        const audioBlob = await response.blob();
        if (controller.signal.aborted) return;
        const url = URL.createObjectURL(audioBlob);
        setTtsAudioUrl(url);
        setIsTtsPlaying(true);
        ttsInFlightRef.current = false;
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          console.error('Failed to fetch ElevenLabs audio:', error);
          setTtsError((error as Error).message || 'TTS request failed');
          setIsTtsPlaying(false);
          ttsInFlightRef.current = false;
        }
      }
    })();

    return () => {
      controller.abort();
    };
  }, [voiceEnabled, isTtsPlaying]);

  useEffect(() => {
    if (!hasPhotos) {
      initialDialogShownRef.current = false;
      setAnalysisCompleted(false);
      setFurnitureSuggestionDialogActive(false);
      waitingForTtsToShowFurnitureSuggestionRef.current = false;
      geminiTextPendingSeenRef.current = null;
    }
  }, [hasPhotos]);

  useEffect(() => {
    if (showInitialAnalysisDialog || analysisDialogActive) return;
    if (!shouldShowInitialDialog) return;

    initialDialogShownRef.current = true;
    analysisDialogEndedRef.current = null;
    ttsStartedForDialogRef.current = null;
    setShowInitialAnalysisDialog(true);
  }, [showInitialAnalysisDialog, analysisDialogActive, shouldShowInitialDialog]);

  useEffect(() => {
    if (!pendingGeminiAfterInitial || !roomComment || isAlreadySeen || analysisDialogActive) return;
    analysisActivatedForRef.current = roomComment;
    analysisDialogEndedRef.current = null;
    ttsStartedForDialogRef.current = null;
    const id = `analysis-${roomComment.slice(0, 40)}-${Date.now()}`;
    setAnalysisDialogId(id);
    setAnalysisDialogMessages([roomComment]); // Tylko roomComment, bez analysisExtraInfo
    setAnalysisDialogActive(true);
    setPendingGeminiAfterInitial(false);
  }, [pendingGeminiAfterInitial, roomComment, isAlreadySeen, analysisDialogActive]);

  useEffect(() => {
    return () => {
      if (ttsAudioUrl) {
        URL.revokeObjectURL(ttsAudioUrl);
      }
    };
  }, [ttsAudioUrl]);

  return (
    <div className="relative flex min-h-screen w-full min-w-0 flex-col">
      <div className="absolute inset-0 bg-gradient-radial from-pearl-50 via-platinum-50 to-silver-100 -z-10" />
      
      {/* Dialog IDA na dole - dynamiczny dla każdego kroku, pokazuje komentarz IDA jeśli dostępny */}
      {showInitialAnalysisDialog ? (
        <div className="fixed bottom-0 left-0 right-0 w-full z-50">
          <AwaDialogue 
            key="initial-analysis"
            currentStep="room_analysis" 
            fullWidth={true}
            autoHide={false}
            onDialogueEnd={() => {
              console.log('[RoomSetup] Initial analysis dialogue finished');
              setShowInitialAnalysisDialog(false);
              if (roomComment && !isAlreadySeen) {
                analysisActivatedForRef.current = roomComment;
                analysisDialogEndedRef.current = null;
                ttsStartedForDialogRef.current = null;
                const id = `analysis-${roomComment.slice(0, 40)}-${Date.now()}`;
                setAnalysisDialogId(id);
                setAnalysisDialogMessages([roomComment]); // Tylko roomComment, bez analysisExtraInfo
                setAnalysisDialogActive(true);
              } else if (!roomComment) {
                setPendingGeminiAfterInitial(true);
              }
            }}
          />
        </div>
      ) : analysisDialogActive && analysisDialogId && analysisDialogMessages ? (
        <div className="fixed bottom-0 left-0 right-0 w-full z-50">
          <AwaDialogue 
            key={analysisDialogId}
            currentStep="room_analysis_ready" 
            fullWidth={true}
            autoHide={false}
            disableAudio={true}
            customMessage={analysisDialogMessages}
            onSentenceStart={(text) => {
              const geminiText = analysisDialogMessages[0];
              if (!geminiText || text !== geminiText) return;
              if (ttsStartedForDialogRef.current === geminiText) return;
              ttsStartedForDialogRef.current = geminiText;
              requestTts(geminiText, true);
            }}
            onDialogueEnd={() => {
              const geminiText = analysisDialogMessages[0];
              if (!geminiText) return;
              if (analysisDialogEndedRef.current === geminiText) return;
              analysisDialogEndedRef.current = geminiText;
              // Dialog ma być widoczny tak długo, jak gra TTS – zamykamy dopiero po zakończeniu TTS
              if (isTtsPlaying || ttsInFlightRef.current) {
                waitingForTtsToShowFurnitureSuggestionRef.current = true;
                geminiTextPendingSeenRef.current = geminiText;
                return;
              }
              console.log('[RoomSetup] Analysis dialogue finished, marking as seen');
              updateSessionData({ roomAnalysisCommentSeen: geminiText } as any);
              setAnalysisDialogActive(false);
              setAnalysisDialogId(null);
              setAnalysisDialogMessages(null);
              setAnalysisCompleted(true);
              setFurnitureSuggestionDialogActive(true);
            }}
          />
        </div>
      ) : furnitureSuggestionDialogActive ? (
        <div className="fixed bottom-0 left-0 right-0 w-full z-50">
          <AwaDialogue 
            key="furniture-suggestion"
            currentStep="room_furniture_suggestion" 
            fullWidth={true}
            autoHide={false}
            customMessage={[analysisExtraInfo]}
            onDialogueEnd={() => {
              console.log('[RoomSetup] Furniture suggestion dialogue finished');
              setFurnitureSuggestionDialogActive(false);
            }}
          />
        </div>
      ) : (
        // Nie pokazuj dialogu "upload" jeśli już pokazaliśmy analizę (użytkownik już dodał zdjęcie)
        !(currentStep === 'photo_upload' && hasPhotos && (analysisCompleted || initialDialogShownRef.current)) && (
          <div className="fixed bottom-0 left-0 right-0 w-full z-50">
            <AwaDialogue 
              key={`step-${currentStep}`}
              currentStep={STEP_TO_DIALOGUE[currentStep]} 
              fullWidth={true}
              autoHide={true}
            />
          </div>
        )
      )}
      {ttsAudioUrl && (
        <DialogueAudioPlayer
          src={ttsAudioUrl}
          volume={voiceVolume}
          enabled={voiceEnabled}
          autoPlay={true}
          onEnded={() => {
            setIsTtsPlaying(false);
            const nextText = pendingTtsTextRef.current;
            if (nextText) {
              pendingTtsTextRef.current = null;
              requestTts(nextText, true);
            } else if (waitingForTtsToShowFurnitureSuggestionRef.current) {
              // TTS dla komentarza Gemini się skończyło – zamknij dialog Gemini i uruchom dialog z sugestią
              waitingForTtsToShowFurnitureSuggestionRef.current = false;
              const geminiText = geminiTextPendingSeenRef.current;
              geminiTextPendingSeenRef.current = null;
              if (geminiText) {
                console.log('[RoomSetup] Analysis dialogue finished (after TTS), marking as seen');
                updateSessionData({ roomAnalysisCommentSeen: geminiText } as any);
              }
              setAnalysisDialogActive(false);
              setAnalysisDialogId(null);
              setAnalysisDialogMessages(null);
              setAnalysisCompleted(true);
              setFurnitureSuggestionDialogActive(true);
            }
          }}
        />
      )}

      <div className="flex min-w-0 w-full flex-1 flex-col px-0 pb-32 pt-6 sm:pt-8 lg:pt-10">
        <div className={FULL_FLOW_GLASS_SHELL}>
          <AnimatePresence mode="wait">
            {currentStep === 'photo_upload' && (
              <PhotoUploadStep
                key="photo_upload"
                photos={roomData.photos}
                roomType={roomData.roomType}
                onUpdate={(photos: string[], roomType: string, roomName: string) => 
                  setRoomData({ ...roomData, photos, roomType, name: roomName })
                }
                onNext={handleNext}
                onBack={handleBack}
              />
            )}

            {currentStep === 'preference_source' && (
              <PreferenceSourceStep
                key="preference_source"
                sessionData={sessionData}
                preferenceSource={roomData.preferenceSource}
                onBack={handleBack}
                onSelectProfile={() => {
                  setRoomData({
                    ...roomData,
                    preferenceSource: 'profile',
                    explicitPreferences: undefined
                  });
                  setCurrentStep('prs_current');
                }}
                onSelectQuestions={() => {
                  setRoomData({
                    ...roomData,
                    preferenceSource: 'complete'
                  });
                  setPreferenceQuestionsProgress(0);
                  setCurrentStep('preference_questions');
                }}
              />
            )}

            {currentStep === 'preference_questions' && (
              <PreferenceQuestionsStep
                key="preference_questions"
                visualQuestionIndex={preferenceQuestionsProgress}
                onVisualQuestionIndexChange={setPreferenceQuestionsProgress}
                explicitPreferences={roomData.explicitPreferences}
                onBack={handleBack}
                onSubmit={(payload) => {
                  setRoomData({
                    ...roomData,
                    preferenceSource: 'complete',
                    explicitPreferences: payload
                  });
                  handleNext();
                }}
              />
            )}

            {currentStep === 'prs_current' && (
              <motion.div
                key="prs_current"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <GlassCard className={`flex min-h-0 flex-col p-6 lg:p-8 ${GLASS_CARD_SCROLL_STEP}`}>
                  <h1 className="mb-6 text-center text-2xl font-nasalization text-graphite lg:text-3xl">
                    {tp("Jak czujesz się obecnie w tym pomieszczeniu?", "How do you feel right now in this space?")}
                  </h1>
                  <p className="mx-auto max-w-2xl text-center text-graphite font-modern mb-6 leading-relaxed">
                    {tp("Zaznacz na mapie punkt zgodny z tym, jak teraz odczuwasz tę przestrzeń, będąc w niej.", "Mark the point on the map that matches how you experience this space right now, while you’re in it.")}
                  </p>

                  <MoodGrid
                    initialPosition={roomData.prsCurrent}
                    onPositionChange={(pos) => setRoomData({ ...roomData, prsCurrent: pos })}
                    mode="current"
                    variant="embedded"
                  />

                  <div className="flex flex-col sm:flex-row justify-between gap-3 sm:gap-4 mt-8">
                    <GlassButton onClick={handleBack} variant="secondary" className="w-full sm:w-auto">
                      <ArrowLeft size={18} />
                      {tp("Wstecz", "Back")}
                    </GlassButton>
                    <GlassButton 
                      onClick={handleNext}
                      disabled={!roomData.prsCurrent}
                      className="w-full sm:w-auto"
                    >
                      {tp("Dalej", "Next")}
                      <ArrowRight size={18} />
                    </GlassButton>
                  </div>
                </GlassCard>
              </motion.div>
            )}

            {currentStep === 'usage_context' && (
              <UsageContextStep
                key="usage_context"
                usageType={roomData.usageType}
                onUpdate={(type: 'solo' | 'shared') => setRoomData({ ...roomData, usageType: type })}
                onNext={handleNext}
                onBack={handleBack}
              />
            )}

            {currentStep === 'activities' && (
              <ActivitiesStep
                key="activities"
                roomType={roomData.roomType}
                activities={roomData.activities}
                onUpdate={(activities: RoomActivity[]) => 
                  setRoomData({ ...roomData, activities })
                }
                onNext={handleNext}
                onBack={handleBack}
              />
            )}

            {currentStep === 'pain_points' && (
              <PainPointsStep
                key="pain_points"
                selected={roomData.painPoints}
                onUpdate={(points: string[]) => setRoomData({ ...roomData, painPoints: points })}
                onNext={handleNext}
                onBack={handleBack}
              />
            )}

            {currentStep === 'prs_target' && (
              <motion.div
                key="prs_target"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <GlassCard className={`flex min-h-0 flex-col p-6 lg:p-8 ${GLASS_CARD_SCROLL_STEP}`}>
                  <h1 className="mb-6 text-center text-2xl font-nasalization text-graphite lg:text-3xl">
                    {tp("Jak chcesz się czuć w tym pomieszczeniu po zmianach?", "How do you want this space to feel after the redesign?")}
                  </h1>
                  <p className="mx-auto max-w-2xl text-center text-graphite font-modern mb-6 leading-relaxed">
                    {tp("Wskaż docelowy nastrój tej przestrzeni po zmianach (odczucie, nie układ mebli).", "Mark the mood you want in this room after the redesign—atmosphere, not furniture layout.")}
                  </p>

                  <MoodGrid
                    initialPosition={roomData.prsTarget}
                    onPositionChange={(pos) => setRoomData({ ...roomData, prsTarget: pos })}
                    mode="target"
                    variant="embedded"
                  />

                  <div className="flex flex-col sm:flex-row justify-between gap-3 sm:gap-4 mt-8">
                    <GlassButton onClick={handleBack} variant="secondary" className="w-full sm:w-auto">
                      <ArrowLeft size={18} />
                      {tp("Wstecz", "Back")}
                    </GlassButton>
                    <GlassButton 
                      onClick={handleNext}
                      disabled={!roomData.prsTarget}
                      className="w-full sm:w-auto"
                    >
                      {tp("Dalej", "Next")}
                      <ArrowRight size={18} />
                    </GlassButton>
                  </div>
                </GlassCard>
              </motion.div>
            )}

            {currentStep === 'summary' && (
              <RoomSummaryStep
                key="summary"
                data={roomData}
                onComplete={handleComplete}
                onBack={handleBack}
                isSaving={isSaving}
              />
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

// ========== STEP COMPONENTS ==========

function UsageContextStep({ usageType, onUpdate, onNext, onBack }: any) {
  const { language, tp } = useLanguage();
  const [selectedUsage, setSelectedUsage] = useState('solo');

  const usageOptions = [
    { 
      id: 'solo', 
      label: tp("Tylko ja", "Just me"),
    },
    { 
      id: 'couple', 
      label: tp("Ja i partner/ka", "Me and partner"),
    },
    { 
      id: 'family', 
      label: tp("Rodzina z dziećmi", "Family with children"),
    },
    { 
      id: 'roommates', 
      label: tp("Współlokatorzy", "Roommates"),
    },
    { 
      id: 'multigenerational', 
      label: tp("Wielopokoleniowa rodzina", "Multigenerational family"),
    },
    { 
      id: 'shared', 
      label: tp("Dzielone z innymi", "Shared with others"),
    },
  ];

  const handleSelect = (optionId: string) => {
    setSelectedUsage(optionId);
    onUpdate(optionId === 'solo' ? 'solo' : 'shared');
  };

  return (
    <motion.div
      key="usage_context"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
    >
      <GlassCard className={`flex min-h-0 flex-col p-6 lg:p-8 ${GLASS_CARD_SCROLL_STEP}`}>
        <h1 className="mb-6 text-center text-2xl font-nasalization text-graphite lg:text-3xl">
          {tp("Kto korzysta z tego pomieszczenia?", "Who uses this space?")}
        </h1>

        <p className="mx-auto mb-6 max-w-2xl text-center font-modern leading-relaxed text-graphite">
          {tp("Wskaż, kto na co dzień przebywa w tej przestrzeni — np. tylko Ty, Ty z partnerem, rodzina czy współlokatorzy.", "Pick who’s here day to day—just you, you and a partner, family, roommates, and so on.")}
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8">
          {usageOptions.map((option) => (
              <button
              key={option.id}
              onClick={() => handleSelect(option.id)}
              className={`rounded-xl p-4 text-sm font-modern font-semibold transition-all duration-300 cursor-pointer group ${
                selectedUsage === option.id
                  ? 'bg-gold/30 border-2 border-gold text-graphite shadow-lg'
                  : 'bg-white/10 border border-white/30 text-graphite transition-all duration-200 ease-out hover:scale-[1.03] hover:bg-gold-400/22 hover:border-gold-400/50 hover:shadow-[0_0_30px_-8px_rgba(255,229,92,0.45)]'
              }`}
            >
              <p className="text-center leading-tight">{option.label}</p>
              </button>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row justify-between gap-3 sm:gap-4">
          <GlassButton onClick={onBack} variant="secondary" className="w-full sm:w-auto">
            <ArrowLeft size={18} />
            {tp("Wstecz", "Back")}
          </GlassButton>
          <GlassButton onClick={onNext} className="w-full sm:w-auto">
            {tp("Dalej", "Next")}
            <ArrowRight size={18} />
          </GlassButton>
        </div>
      </GlassCard>
    </motion.div>
  );
}

export function PhotoUploadStep({ photos, roomType, onUpdate, onNext, onBack }: any) {
  const { language, tp, joinCopy } = useLanguage();
  const { analyzeRoom, generateLLMComment } = useModalAPI();
  const { sessionData, updateSessionData } = useSessionData();
  const [uploadedPhotos, setUploadedPhotos] = useState<string[]>(photos || []);
  const [uploadedPhotosBase64, setUploadedPhotosBase64] = useState<string[]>([]); // Store base64 for API
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGeneratingHumanComment, setIsGeneratingHumanComment] = useState(false);
  const [roomAnalysis, setRoomAnalysis] = useState<any>(null);
  const [detectedRoomType, setDetectedRoomType] = useState<string | null>(null);
  const [llmComment, setLlmComment] = useState<{ comment: string; suggestions: string[]; } | null>(null);
  const [humanComment, setHumanComment] = useState<string | null>(null);
  const [showRoomTypeSelection, setShowRoomTypeSelection] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [processedImage, setProcessedImage] = useState<string | null>(null); // Image with furniture removed
  const [isRemovingFurniture, setIsRemovingFurniture] = useState(false);
  const [pendingAnalysisFile, setPendingAnalysisFile] = useState<File | null>(null);
  const [pendingAnalysisLabel, setPendingAnalysisLabel] = useState<string | null>(null);
  const { generateSixImagesParallelWithGoogle } = useGoogleAI();
  const lastUploadIdRef = useRef<string | null>(null);
  
  // Basic room data
  const [roomName, setRoomName] = useState('');

  // Room type translations
  const ROOM_TYPE_TRANSLATIONS: { [key: string]: string } = {
    'kitchen': 'Kuchnia',
    'bedroom': 'Sypialnia',
    'living_room': 'Pokój dzienny',
    'bathroom': 'Łazienka',
    'dining_room': 'Jadalnia',
    'office': 'Biuro',
    'empty_room': 'Puste pomieszczenie'
  };

  // Generate room name from detected type
  const generateRoomName = (type: string): string => {
    const names: { [key: string]: string } = {
      'kitchen': 'Kuchnia',
      'bedroom': 'Sypialnia',
      'living_room': 'Salon',
      'bathroom': 'Łazienka',
      'dining_room': 'Jadalnia',
      'office': 'Biuro',
      'empty_room': 'Pomieszczenie'
    };
    return names[type] || 'Pomieszczenie';
  };

  const requestHumanComment = useCallback(
    async (type: string, description?: string) => {
      if (!type || !description) return;
      try {
        setIsGeneratingHumanComment(true);
        const response = await generateLLMComment(type, description, 'room_analysis');
        const trimmed = response.comment?.trim();
        if (trimmed) {
          setHumanComment(trimmed);
          // Update sessionData with human_comment
          if (roomAnalysis) {
            updateSessionData({ roomAnalysis: { ...roomAnalysis, human_comment: trimmed } } as any);
          }
        }
      } catch (error) {
        console.error('Nie udało się wygenerować komentarza IDA (LLM):', error);
      } finally {
        setIsGeneratingHumanComment(false);
      }
    },
    [generateLLMComment, roomAnalysis, updateSessionData]
  );

  const analyzeImage = async (file: File) => {
    setIsAnalyzing(true);
    try {
      console.log('Starting room analysis for file:', file.name);
      
      // Convert file to base64
      const base64 = await fileToNormalizedBase64(file);
      console.log(`File converted to base64, length: ${base64.length} chars`);
      
      // Analyze room using Google Gemini 2.0 Flash (replaced Gemma 3)
      const analysis = await analyzeRoom({ image: base64, metadata: { source: 'setup-room-step' }, language });
      
      console.log('Room analysis result:', analysis);
      
      setRoomAnalysis(analysis);
      setDetectedRoomType(analysis.detected_room_type);
      
      // Save roomAnalysis to sessionData so it's available for dialogue
      console.log('[PhotoUploadStep] Saving roomAnalysis to sessionData:', {
        hasHumanComment: !!analysis.human_comment,
        humanComment: analysis.human_comment,
        hasComment: !!analysis.comment,
        comment: analysis.comment
      });
      updateSessionData({ roomAnalysis: analysis } as any);
      
      // Auto-generate room name from detected type
      if (analysis.detected_room_type && !roomName) {
        setRoomName(generateRoomName(analysis.detected_room_type));
      }
      
      // Set LLM comment if available
      if (analysis.comment) {
        setLlmComment({
          comment: analysis.comment,
          suggestions: analysis.suggestions || []
        });
      }
      
      // Set human Polish comment if available, otherwise request lightweight LLM comment
      if (analysis.human_comment) {
        setHumanComment(analysis.human_comment);
        // Update sessionData with human_comment
        updateSessionData({ roomAnalysis: { ...analysis, human_comment: analysis.human_comment } } as any);
      } else if (analysis.room_description) {
        void requestHumanComment(analysis.detected_room_type, analysis.room_description);
      }
      
    } catch (error) {
      console.error('Error analyzing room:', error);
      
      // Check if it's a timeout error (cold start)
      if (error instanceof Error && error.message.includes('408')) {
        alert('Model AI jest jeszcze ładowany (pierwsze uruchomienie). Spróbuj ponownie za chwilę.');
      } else if (error instanceof Error && error.message.includes('Limit analiz')) {
        // If limit reached, allow user to continue anyway (they can manually select room type)
        console.warn('[PhotoUploadStep] Analysis limit reached, but allowing user to continue');
        // Don't block the flow - user can manually select room type
      } else {
        // For other errors, show a warning but don't block
        console.warn('[PhotoUploadStep] Analysis failed, but allowing user to continue:', error);
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleRemoveFurniture = async () => {
    if (!uploadedPhotosBase64 || uploadedPhotosBase64.length === 0) {
      alert(tp("Najpierw dodaj zdjęcie", "Please add a photo first"));
      return;
    }

    setIsRemovingFurniture(true);
    try {
      const originalBase64 = uploadedPhotosBase64[0];
      
      // Direct text prompt for furniture removal - more explicit and direct
      // Improved to better fill empty spaces after removal
      const removeFurniturePrompt = `TOTAL INTERIOR WIPE: Erase ALL furniture, objects, and decorative elements from this room.

1. ERASE AND DELETE COMPLETELY:
   - Furniture: sofas, chairs, tables, coffee tables, side tables, desks, beds, wardrobes, cabinets, shelves, bookcases
   - Decorative items: rugs, carpets, curtains, drapes, blinds, window treatments, pillows, cushions, throws, blankets
   - Lighting: lamps, ceiling lights, chandeliers, wall sconces, floor lamps, table lamps, all lighting fixtures
   - Plants: potted plants, vases with flowers, planters, all vegetation and greenery
   - Art and decor: paintings, pictures, frames, mirrors, sculptures, decorative objects, knick-knacks, ornaments
   - Electronics: TVs, speakers, devices, cables, wires
   - Textiles: curtains, drapes, fabric hangings, tapestries
   - All other objects, accessories, and clutter

2. PAINT OVER: Reconstruct the wall and floor surfaces behind removed items to look like a clean, seamless, empty room. Fill all gaps and holes where items were removed.

3. PRESERVE EXACTLY: Keep ONLY the architectural elements:
   - Walls (with their original texture and color)
   - Windows (frames, glass, sills - but NO curtains, drapes, or blinds)
   - Doors (frames, panels - but NO door handles or decorative elements if they are removable)
   - Floor (original surface)
   - Ceiling (original surface)
   - Maintain the EXACT camera angle and perspective

4. RESULT: A completely EMPTY bare architectural shell with NO furniture, objects, decorations, plants, lighting fixtures, or any other items. Only clean walls, floor, ceiling, windows, and doors remain.`;

      // Clean base64 - remove data URI prefix if present
      let cleanBase64 = originalBase64;
      if (cleanBase64.includes(',')) {
        cleanBase64 = cleanBase64.split(',')[1];
      }

      // Use Google API for furniture removal
      // Google Gemini 2.5 Flash Image only supports temperature in generation_config
      // The prompt and system instruction control the behavior, not strength/steps/guidance
      // These parameters are kept for type compatibility but not actually used by Google API
      

      const baseParams = getGenerationParameters('micro', 0);
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
        console.warn('[PhotoUploadStep] Dimension prep failed, using defaults:', dimErr);
      }

      const response = await generateSixImagesParallelWithGoogle({
        prompts: [{ source: 'implicit' as GenerationSource, prompt: removeFurniturePrompt }],
        base_image: cleanBase64,
        style: 'empty',
        modifications: ['remove furniture'],
        parameters: removalParameters,
      });

      if (!response || !response.results || response.results.length === 0 || !response.results[0]?.image) {
        throw new Error("Failed to remove furniture from image");
      }

      const processedBase64 = response.results[0].image;
      
      
      // Create data URL for display
      const processedDataUrl = `data:image/jpeg;base64,${processedBase64}`;
      setProcessedImage(processedDataUrl);
      
      
      // Save to sessionData for use in generation
      await updateSessionData({ 
        roomImageEmpty: processedBase64 
      } as any);
      
      
      console.log('[PhotoUploadStep] Successfully removed furniture from image');
    } catch (error) {
      console.error('[PhotoUploadStep] Error removing furniture:', error);
      alert(tp("Nie udało się usunąć mebli. Spróbuj ponownie lub przejdź dalej z oryginalnym zdjęciem.", "Failed to remove furniture. Try again or continue with the original image."));
    } finally {
      setIsRemovingFurniture(false);
    }
  };

  const handleExampleSelect = async (imageUrl: string) => {
    try {
      lastUploadIdRef.current = `example_${Date.now()}_${Math.random().toString(16).slice(2)}`;
      // Pre-computed metadata for example images - NO ANALYSIS NEEDED!
      // comment_pl / comment_en ensure correct language for display and TTS.
      const exampleMetadata: { [key: string]: any } = {
        '/images/tinder/Living Room (1).jpg': {
          roomType: 'living_room',
          roomName: 'Salon',
          confidence: 0.95,
          roomDescription: 'Modern living room with comfortable seating',
          comment: 'This is a bright, modern living space with excellent natural light.',
          comment_pl: 'Nowoczesny salon z dużą ilością światła naturalnego i wygodnymi meblami.',
          comment_en: 'This is a bright, modern living space with excellent natural light.',
          humanComment: 'Nowoczesny salon z dużą ilością światła naturalnego i wygodnymi meblami.'
        },
        '/images/tinder/Living Room (2).jpg': {
          roomType: 'living_room',
          roomName: 'Salon',
          confidence: 0.93,
          roomDescription: 'Modern minimalist living room with neutral tones, natural wood furniture, and abundant greenery',
          comment: 'A serene Scandinavian-inspired living room with light wood, cream tones, and natural plants.',
          comment_pl: 'Minimalistyczny salon w stylu skandynawskim z jasnym drewnem, kremowymi tonami i naturalnymi roślinami.',
          comment_en: 'A serene Scandinavian-inspired living room with light wood, cream tones, and natural plants.',
          humanComment: 'Minimalistyczny salon w stylu skandynawskim z jasnym drewnem, kremowymi tonami i naturalnymi roślinami.'
        },
        '/images/tinder/Living Room (3).jpg': {
          roomType: 'living_room',
          roomName: 'Salon',
          confidence: 0.92,
          roomDescription: 'Cozy living room with warm atmosphere',
          comment: 'A cozy, inviting living room with warm tones.',
          comment_pl: 'Przytulny salon z ciepłymi tonami i przyjazną atmosferą.',
          comment_en: 'A cozy, inviting living room with warm tones.',
          humanComment: 'Przytulny salon z ciepłymi tonami i przyjazną atmosferą.'
        }
      };

      const metadata = exampleMetadata[imageUrl];
      
      if (metadata) {
        // Use pre-computed metadata - NO GEMMA CALL!
        console.log('Using pre-computed metadata for example image:', metadata);
        
        const response = await fetch(imageUrl);
        const blob = await response.blob();
        const file = new File([blob], imageUrl.split('/').pop() || 'image.jpg', { type: blob.type });
        
        // Convert to base64
        const base64 = await fileToNormalizedBase64(file);
        
        // Blob URL for display
        const imageObjectUrl = URL.createObjectURL(blob);
        
        const newPhotos = [...uploadedPhotos, imageObjectUrl];
        const newPhotosBase64 = [...uploadedPhotosBase64, base64];
        
        setUploadedPhotos(newPhotos);
        setUploadedPhotosBase64(newPhotosBase64);
        setSelectedImage(imageObjectUrl);
        setProcessedImage(null); // Clear processed image when new photo is added
        updateSessionData({ roomImageEmpty: undefined } as any); // Clear roomImageEmpty when new photo is added
        onUpdate(newPhotosBase64, metadata.roomType, metadata.roomName);
        
        // Set pre-computed data instantly
        setDetectedRoomType(metadata.roomType);
        setRoomName(metadata.roomName);
        const roomAnalysisData = {
          detected_room_type: metadata.roomType,
          confidence: metadata.confidence,
          room_description: metadata.roomDescription,
          comment: metadata.comment,
          comment_pl: metadata.comment_pl,
          comment_en: metadata.comment_en,
          human_comment: metadata.humanComment,
          suggestions: [] as string[]
        };
        setRoomAnalysis(roomAnalysisData);
        const commentRaw =
          language === 'pl'
            ? (metadata.comment_pl ?? metadata.humanComment)
            : (metadata.comment_en ?? metadata.comment);
        const commentForLang =
          commentRaw == null || commentRaw === '' ? '' : joinCopy(String(commentRaw));
        setLlmComment({ comment: commentForLang, suggestions: [] });
        setHumanComment(commentForLang || null);

        // Save to sessionData so dialogue can access it
        console.log('[PhotoUploadStep] Saving example image roomAnalysis to sessionData:', {
          language,
          hasCommentForLang: !!commentForLang,
          commentForLang: commentForLang?.slice(0, 60)
        });
        updateSessionData({ roomAnalysis: roomAnalysisData } as any);
      } else {
        // Custom image - prepare for analysis (manual trigger)
        const response = await fetch(imageUrl);
        const blob = await response.blob();
        const file = new File([blob], imageUrl.split('/').pop() || 'image.jpg', { type: blob.type });
        
        // Convert to base64
        const base64 = await fileToNormalizedBase64(file);
        
        // Blob URL for display
        const imageObjectUrl = URL.createObjectURL(file);
        const newPhotos = [...uploadedPhotos, imageObjectUrl];
        const newPhotosBase64 = [...uploadedPhotosBase64, base64];
        
        setUploadedPhotos(newPhotos);
        setUploadedPhotosBase64(newPhotosBase64);
        setSelectedImage(imageObjectUrl);
        setProcessedImage(null); // Clear processed image when new photo is added
        updateSessionData({ roomImageEmpty: undefined } as any); // Clear roomImageEmpty when new photo is added
        onUpdate(newPhotosBase64, detectedRoomType || '', roomName || '');
        
        // Automatically analyze the example image
        await analyzeImage(file);
      }
    } catch (error) {
      console.error("Error fetching example image", error);
      alert("Błąd podczas ładowania przykładowego zdjęcia");
    }
  };

  const handleAnalyzePending = async () => {
    if (!pendingAnalysisFile || isAnalyzing) return;
    await analyzeImage(pendingAnalysisFile);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    
    // Check for unsupported formats
    const unsupportedFormats = ['image/avif', 'image/webp', 'image/gif'];
    if (unsupportedFormats.includes(file.type)) {
      alert(`Format ${file.type} nie jest obsługiwany. Proszę użyć formatów: JPG, PNG, TIFF, HEIC.`);
      return;
    }
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert(`Nieprawidłowy typ pliku: ${file.type}. Proszę wybrać obraz (JPG, PNG, TIFF, HEIC).`);
      return;
    }

    try {
      console.log(`Przetwarzam plik: ${file.name}, typ: ${file.type}, rozmiar: ${file.size} bytes`);
      lastUploadIdRef.current = `upload_${Date.now()}_${Math.random().toString(16).slice(2)}`;
      
      // Convert to base64 for API
      const base64 = await fileToNormalizedBase64(file);
      
      // Add to uploaded photos (blob URL for display)
      const imageUrl = URL.createObjectURL(file);
      const newPhotos = [...uploadedPhotos, imageUrl];
      const newPhotosBase64 = [...uploadedPhotosBase64, base64];
      
      setUploadedPhotos(newPhotos);
      setUploadedPhotosBase64(newPhotosBase64);
      setSelectedImage(imageUrl);
      setProcessedImage(null); // Clear processed image when new photo is added
      updateSessionData({ roomImageEmpty: undefined } as any); // Clear roomImageEmpty when new photo is added
      
      // Pass base64 to parent (for API usage)
      onUpdate(newPhotosBase64, detectedRoomType || '', roomName || '');
      
      // Automatically analyze the uploaded image
      await analyzeImage(file);
      
    } catch (error) {
      console.error("Error processing file", error);
      alert(error instanceof Error ? error.message : "Błąd podczas przetwarzania pliku");
    }
  };

  return (
    <motion.div
      key="photo_upload"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
    >
      <GlassCard className={`flex min-h-0 flex-col p-6 lg:p-8 ${GLASS_CARD_SCROLL_STEP}`}>
        {!selectedImage && (
          <>
            <h1 className="mb-6 text-center text-2xl font-nasalization text-graphite lg:text-3xl">
              {tp("Prześlij zdjęcie swojego wnętrza", "Upload a photo of your interior")}
            </h1>

            <p className="mx-auto mb-6 max-w-2xl text-center font-modern leading-relaxed text-graphite">
              {tp(
                "To zdjęcie będzie punktem wyjścia do stworzenia nowych koncepcji Twojego wnętrza. IDA odczyta charakter przestrzeni, światło i układ, a następnie wygeneruje propozycje dopasowane do Ciebie oraz miejsca, które chcesz odmienić.",
                "This photo will be the starting point for creating new concepts for your interior. IDA will read the space, lighting, and layout, then generate ideas tailored to you and the place you want to transform.",
              )}
            </p>
          </>
        )}

        {/* Room Analysis Results */}
        {isAnalyzing && (
          <div className="mb-6 rounded-xl border border-white/20 bg-white/5 p-6 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="w-6 h-6 border-2 border-gold/40 border-t-gold rounded-full animate-spin"></div>
              <div>
                <p className="text-graphite font-modern font-semibold text-lg">
                  {tp("IDA analizuje pomieszczenie...", "IDA is analyzing the room...")}
                </p>
                <p className="text-silver-dark text-sm font-modern">
                  {tp("To może potrwać chwilę", "This may take a moment")}
                </p>
              </div>
            </div>
          </div>
        )}
        
        {/* Room type display and selection - always show if image is uploaded */}
        {selectedImage && !isAnalyzing && (
          <div className="relative mb-6 overflow-hidden rounded-xl border border-white/20 bg-white/5 p-6 shadow-sm">
            {!processedImage && detectedRoomType !== 'empty_room' && (
              <div className="absolute top-0 right-0 w-64 h-64 bg-gold/5 blur-3xl -z-10 animate-pulse" />
            )}
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 bg-gradient-to-r from-gold/20 to-champagne/20 rounded-full flex items-center justify-center flex-shrink-0">
                <div className="w-4 h-4 bg-gradient-to-r from-gold to-champagne rounded-full"></div>
              </div>
              <div className="flex-1">
                {detectedRoomType ? (
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <p className="text-graphite font-modern font-bold text-lg">
                        {tp("IDA wykryła: ", "IDA detected: ")}
                        <span className="text-gold">
                          {ROOM_TYPE_TRANSLATIONS[detectedRoomType] || detectedRoomType}
                        </span>
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setShowRoomTypeSelection(true)}
                        className="px-4 py-2 bg-white/10 hover:bg-white/20 text-graphite text-xs font-modern font-semibold rounded-xl transition-all duration-200 border border-white/20"
                      >
                        {tp("Zmień typ pomieszczenia", "Change room type")}
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-graphite font-modern font-bold text-lg mb-3">
                    {tp("Wybierz typ pomieszczenia:", "Select room type:")}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Room type selection - hidden until "Zmień" is clicked */}
        {showRoomTypeSelection && (
          <div className="mb-6 rounded-xl border border-white/20 bg-white/5 p-6 shadow-sm">
            <h3 className="text-sm font-bold text-graphite mb-3 font-modern">
              {tp("Typ pomieszczenia", "Room type")}
            </h3>
            <div className="flex flex-wrap gap-2">
              {[
                { id: 'living_room', label: tp("Pokój dzienny", "Living Room") },
                { id: 'bedroom', label: tp("Sypialnia", "Bedroom") },
                { id: 'kitchen', label: tp("Kuchnia", "Kitchen") },
                { id: 'dining_room', label: tp("Jadalnia", "Dining Room") },
                { id: 'bathroom', label: tp("Łazienka", "Bathroom") },
                { id: 'office', label: tp("Biuro", "Office") },
                { id: 'empty_room', label: tp("Puste pomieszczenie", "Empty Room") },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    setDetectedRoomType(opt.id);
                    setRoomName(generateRoomName(opt.id));
                    setShowRoomTypeSelection(false);
                  }}
                  className={`px-3 py-2 rounded-xl text-sm border transition-all duration-200 ${
                    detectedRoomType === opt.id 
                      ? 'bg-gold/20 border-gold text-graphite' 
                      : 'bg-white/10 border-white/30 text-graphite hover:bg-white/20'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Upload Area - hide after image is uploaded */}
        {!selectedImage && (
          <>
        <div className="mb-6 rounded-xl border-2 border-dashed border-gold/30 bg-white/5 p-8 transition-colors hover:border-gold/50">
          <label className="cursor-pointer flex flex-col items-center">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-gold to-champagne flex items-center justify-center mb-4">
              <Camera size={32} className="text-white" aria-hidden="true" />
            </div>
            <p className="text-graphite font-semibold mb-2">
                  {tp("Kliknij aby dodać zdjęcie", "Click to add photo")}
            </p>
            <p className="text-sm text-silver-dark">
              {tp("Lub przeciągnij i upuść", "Or drag and drop")}
            </p>
            <input
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/tiff,image/heic,image/heif"
              onChange={handleFileUpload}
              className="hidden"
              disabled={isAnalyzing}
              aria-label={tp("Wybierz zdjęcie wnętrza", "Choose interior photo")}
            />
          </label>
        </div>

            {/* Example images — full width under upload box, three equal tiles */}
            <div className="mb-6 w-full">
              <h3 className="text-sm font-bold text-graphite mb-3 font-modern">
                {tp("Przykładowe zdjęcia", "Example photos")}
              </h3>
              <div className="grid w-full grid-cols-3 gap-2 sm:gap-3 md:gap-4">
                {[
                  '/images/tinder/Living Room (1).jpg',
                  '/images/tinder/Living Room (2).jpg',
                  '/images/tinder/Living Room (3).jpg',
                ].map((img, idx) => (
                  <button
                    key={img}
                    type="button"
                    onClick={() => handleExampleSelect(img)}
                    className="relative aspect-[4/3] min-h-0 w-full min-w-0 overflow-hidden rounded-2xl border-2 border-transparent shadow-md ring-1 ring-black/5 transition-all hover:border-gold hover:shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold disabled:opacity-50"
                    disabled={isAnalyzing}
                  >
                    <img
                      src={img}
                      alt={`Przykład ${idx + 1}`}
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Photo preview */}
        {selectedImage && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-graphite font-modern">
                {tp(
                  processedImage ? 'Zdjęcie bez mebli' : 'Wybrane zdjęcie',
                  processedImage ? 'Image without furniture' : 'Selected photo',
                )}
              </h3>
              <div className="flex gap-3">
                {processedImage && (
                  <>
                    <GlassButton
                      onClick={handleRemoveFurniture}
                      disabled={isRemovingFurniture}
                      variant="secondary"
                      className="text-[10px] px-2 h-8 min-h-0 rounded-lg"
                    >
                      {isRemovingFurniture 
                        ? (tp("Ponowne usuwanie...", "Retrying..."))
                        : (tp("Spróbuj ponownie", "Try again"))}
                    </GlassButton>
                    <button
                      onClick={() => {
                        setProcessedImage(null);
                        updateSessionData({ roomImageEmpty: undefined } as any);
                      }}
                      className="text-[10px] px-3 h-8 bg-white/10 hover:bg-white/20 text-graphite font-modern rounded-lg transition-all border border-white/20"
                    >
                      {tp("Przywróć meble", "Restore furniture")}
                    </button>
                  </>
                )}
                <button
                  onClick={() => {
                    setSelectedImage(null);
                    setProcessedImage(null);
                    setDetectedRoomType(null);
                    setRoomAnalysis(null);
                    setLlmComment(null);
                    setHumanComment(null);
                    setRoomName('');
                    updateSessionData({ roomImageEmpty: undefined } as any);
                  }}
                  className="text-xs text-silver-dark hover:text-gold transition-colors font-modern underline underline-offset-4"
                >
                  {tp("Zmień zdjęcie", "Change photo")}
                </button>
              </div>
            </div>
            <div className="relative">
              <img 
                src={processedImage || selectedImage} 
                alt={tp("Wybrane zdjęcie", "Selected photo")} 
                className="w-full max-w-md mx-auto rounded-xl shadow-lg"
              />
              {processedImage && (
                <div className="mt-2 text-xs text-silver-dark text-center font-modern">
                  {tp("✓ Meble zostały usunięte. To zdjęcie będzie używane podczas generowania.", "✓ Furniture removed. This image will be used during generation.")}
                </div>
              )}
            </div>
          </div>
        )}

        <div className="flex flex-col items-stretch justify-between gap-3 sm:flex-row sm:items-center sm:gap-4">
          <GlassButton onClick={onBack} variant="secondary" className="w-full sm:w-auto">
            <ArrowLeft size={18} />
            {tp("Wstecz", "Back")}
          </GlassButton>

          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-stretch sm:items-center w-full sm:w-auto">
            {selectedImage && !processedImage && !isAnalyzing && detectedRoomType !== 'empty_room' && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
                className="w-full sm:w-auto"
              >
                <GlassButton
                  onClick={handleRemoveFurniture}
                  disabled={isRemovingFurniture}
                  variant="primary"
                  className="group w-full sm:w-auto"
                >
                  <Sparkles size={18} className="text-gold-700 group-hover:animate-pulse" />
                  <span className="hidden sm:inline">
                    {isRemovingFurniture 
                      ? (tp("Usuwanie...", "Removing..."))
                      : (tp("Usuń meble (Zalecane)", "Remove furniture (Recommended)"))}
                  </span>
                  <span className="sm:hidden">
                    {isRemovingFurniture 
                      ? (tp("Usuwanie...", "Removing..."))
                      : (tp("Usuń meble", "Remove furniture"))}
                  </span>
                </GlassButton>
              </motion.div>
            )}

            <GlassButton 
              onClick={() => {
                // Use detected room type or allow manual selection
                const finalRoomType = detectedRoomType || roomType || 'empty_room';
                const finalRoomName = roomName || (tp("Pomieszczenie", "Room"));
                onUpdate(uploadedPhotosBase64, finalRoomType, finalRoomName);
                onNext();
              }}
              disabled={isAnalyzing || uploadedPhotosBase64.length === 0}
              variant={processedImage || !selectedImage || detectedRoomType === 'empty_room' ? 'primary' : 'secondary'}
              className="w-full sm:w-auto"
            >
              {isAnalyzing 
                ? (tp("Analizuje...", "Analyzing..."))
                : (tp("Dalej", "Next"))
              }
              <ArrowRight size={18} />
            </GlassButton>
          </div>
        </div>
      </GlassCard>
    </motion.div>
  );
}

interface PreferenceSourceStepProps {
  sessionData?: SessionData;
  preferenceSource?: PreferenceSource | null;
  onBack: () => void;
  onSelectProfile: () => void;
  onSelectQuestions: () => void;
}

interface PreferenceQuestionsStepProps {
  explicitPreferences?: RoomPreferencePayload;
  /** 0..visualQuestions.length-1 = visual A/B; length = sensory suite (persists across step unmount). */
  visualQuestionIndex: number;
  onVisualQuestionIndexChange: (index: number) => void;
  onBack: () => void;
  onSubmit: (payload: RoomPreferencePayload) => void;
}

const DEFAULT_SEMANTIC_VALUE = 0.5;

const buildDefaultPreferences = (source?: RoomPreferencePayload): RoomPreferencePayload => ({
  semanticDifferential: {
    warmth: normalizeSemanticTo01(source?.semanticDifferential?.warmth) ?? DEFAULT_SEMANTIC_VALUE,
    brightness: normalizeSemanticTo01(source?.semanticDifferential?.brightness) ?? DEFAULT_SEMANTIC_VALUE,
    complexity: normalizeSemanticTo01(source?.semanticDifferential?.complexity) ?? DEFAULT_SEMANTIC_VALUE,
    texture: normalizeSemanticTo01(source?.semanticDifferential?.texture) ?? DEFAULT_SEMANTIC_VALUE,
  },
  colorsAndMaterials: {
    selectedPalette: source?.colorsAndMaterials?.selectedPalette ?? '',
    topMaterials: source?.colorsAndMaterials?.topMaterials ?? []
  },
  sensoryPreferences: {
    music: source?.sensoryPreferences?.music ?? '',
    texture: source?.sensoryPreferences?.texture ?? '',
    light: source?.sensoryPreferences?.light ?? ''
  },
  natureMetaphor: source?.natureMetaphor,
  biophiliaScore: source?.biophiliaScore
});

function PreferenceSourceStep({
  sessionData,
  preferenceSource,
  onBack,
  onSelectProfile,
  onSelectQuestions
}: PreferenceSourceStepProps) {
  const { language, tp } = useLanguage();

  const hasProfileData = Boolean(
    sessionData?.colorsAndMaterials?.selectedPalette ||
      sessionData?.colorsAndMaterials?.selectedStyle ||
      sessionData?.semanticDifferential ||
      (sessionData?.sensoryPreferences &&
        (sessionData.sensoryPreferences.music ||
          sessionData.sensoryPreferences.texture ||
          sessionData.sensoryPreferences.light))
  );

  const profilePaletteLabel = getPaletteLabel(sessionData?.colorsAndMaterials?.selectedPalette, language);
  const profileStyleLabel = sessionData?.colorsAndMaterials?.selectedStyle
    ? getStyleLabel(sessionData.colorsAndMaterials.selectedStyle, language)
    : undefined;
  const profileSemantic = sessionData?.semanticDifferential;
  const profileSensory = sessionData?.sensoryPreferences;
  const profilePreview = [
    profilePaletteLabel
      ? `${tp("Paleta", "Palette")}: ${profilePaletteLabel}`
      : null,
    profileStyleLabel
      ? `${tp("Styl", "Style")}: ${profileStyleLabel}`
      : null,
    profileSemantic && profileSemantic.warmth !== undefined && profileSemantic.warmth !== null
      ? `${tp("Ciepło", "Warmth")} ${Math.round(
          (profileSemantic.warmth > 1 ? profileSemantic.warmth / 100 : profileSemantic.warmth) * 100,
        )}%`
      : null,
    profileSensory?.music
      ? `${tp("Muzyka", "Music")}: ${profileSensory.music}`
      : null
  ].filter(Boolean);

  return (
    <motion.div
      key="preference_source"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
    >
      <GlassCard className={`flex min-h-0 flex-col p-6 lg:p-8 ${GLASS_CARD_SCROLL_STEP}`}>
        <h1 className="mb-6 text-center text-2xl font-nasalization text-graphite lg:text-3xl">
          {tp("Skąd weźmiemy preferencje do tego pomieszczenia?", "Where should preferences for this space come from?")}
        </h1>

        <p className="mx-auto mb-6 max-w-2xl text-center font-modern leading-relaxed text-graphite">
          {tp("Możesz szybko zastosować zapisany profil albo odpowiedzieć na krótką ankietę dopasowaną do tego pomieszczenia.", "Reuse your saved profile, or answer a short questionnaire tailored to this room.")}
        </p>

        <div className="mb-8 grid gap-6 lg:grid-cols-2 lg:items-stretch">
          <div
            className={`flex h-full min-h-0 flex-col rounded-xl border p-6 transition-all duration-300 ${
              preferenceSource === 'complete'
                ? 'border-2 border-gold bg-gold/30 text-graphite shadow-lg'
                : 'border border-white/30 bg-white/10 text-graphite hover:scale-[1.01] hover:border-gold-400/50 hover:bg-gold-400/10'
            }`}
          >
            <p className="uppercase text-xs tracking-[0.3em] text-silver-dark mb-2">
              {tp("Dokładniejsze", "Complete mode")}
            </p>
            <h3 className="text-xl font-nasalization text-graphite mb-4">
              {tp("Odpowiem na pytania", "Answer quick room questions")}
            </h3>
            <p className="text-sm text-silver-dark font-modern mb-4">
              {tp("Trzy krótkie sekcje (~2 min) dadzą IDA pełny kontekst właśnie dla tego pomieszczenia.", "Three short sections (~2 min) give IDA full context for this specific space.")}
            </p>
            <div className="mt-auto border-t border-white/10 pt-4">
              <GlassButton variant="secondary" onClick={onSelectQuestions} className="w-full sm:w-auto">
                {tp("Przejdź do pytań", "Go to questions")}
                <ArrowRight size={16} />
              </GlassButton>
            </div>
          </div>

          <div
            className={`flex h-full min-h-0 flex-col rounded-xl border p-6 transition-all duration-300 ${
              preferenceSource === 'profile'
                ? 'border-2 border-gold bg-gold/30 text-graphite shadow-lg'
                : 'border border-white/30 bg-white/10 text-graphite hover:scale-[1.01] hover:border-gold-400/50 hover:bg-gold-400/10'
            }`}
          >
            <p className="uppercase text-xs tracking-[0.3em] text-silver-dark mb-2">
              {tp("Szybka opcja", "Fast path")}
            </p>
            <h3 className="text-xl font-nasalization text-graphite mb-3">
              {tp("Użyj mojego profilu", "Use my profile preferences")}
            </h3>
            <div className="min-h-0 flex-1">
              {hasProfileData ? (
                <ul className="space-y-2 text-sm text-graphite font-modern">
                  {profilePreview.map((item, idx) => (
                    <li key={idx} className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-gold" />
                      {item}
                    </li>
                  ))}
                  {profilePreview.length === 0 && (
                    <li className="text-silver-dark">
                      {tp("Twoje globalne dane preferencji są zapisane i gotowe do użycia.", "Your global preference data is saved and ready to reuse.")}
                    </li>
                  )}
                </ul>
              ) : (
                <p className="text-sm text-silver-dark font-modern">
                  {tp("Uzupełnij najpierw profil główny, aby skorzystać z tej opcji.", "Complete the core profile first to unlock this option.")}
                </p>
              )}
            </div>
            <div className="mt-auto border-t border-white/10 pt-4">
              <GlassButton
                onClick={onSelectProfile}
                disabled={!hasProfileData}
                className="w-full sm:w-auto"
              >
                {tp("Zastosuj profil", "Apply my profile")}
                <ArrowRight size={16} />
              </GlassButton>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-start">
          <GlassButton onClick={onBack} variant="secondary" className="w-full sm:w-auto">
            <ArrowLeft size={18} />
            {tp("Wstecz", "Back")}
          </GlassButton>
        </div>
      </GlassCard>
    </motion.div>
  );
}

function PreferenceQuestionsStep({
  explicitPreferences,
  visualQuestionIndex,
  onVisualQuestionIndexChange,
  onBack,
  onSubmit
}: PreferenceQuestionsStepProps) {
  const { language, tp, joinCopy } = useLanguage();
  const [localPrefs, setLocalPrefs] = useState<RoomPreferencePayload>(() => buildDefaultPreferences(explicitPreferences));
  const [natureMetaphor, setNatureMetaphor] = useState<string | undefined>(explicitPreferences?.natureMetaphor);
  const [biophiliaScore, setBiophiliaScore] = useState<number | undefined>(explicitPreferences?.biophiliaScore);
  const [visualAnswers, setVisualAnswers] = useState<Record<string, number>>(() => {
    const sem = explicitPreferences?.semanticDifferential;
    return {
      warmth: normalizeSemanticTo01(sem?.warmth) ?? 0.5,
      brightness: normalizeSemanticTo01(sem?.brightness) ?? 0.5,
      complexity: normalizeSemanticTo01(sem?.complexity) ?? 0.5,
    };
  });

  useEffect(() => {
    setLocalPrefs(buildDefaultPreferences(explicitPreferences));
  }, [explicitPreferences]);

  const visualQuestions = [
    {
      id: 'warmth',
      question: { pl: 'Które wnętrze bardziej do Ciebie pasuje?', en: 'Which interior suits you better?' },
      leftLabel: { pl: 'Zimne', en: 'Cool' },
      rightLabel: { pl: 'Ciepłe', en: 'Warm' },
      leftImage: '/research/semantic/Cool.png',
      rightImage: '/research/semantic/Warm.png'
    },
    {
      id: 'brightness',
      question: { pl: 'Które wnętrze bardziej do Ciebie pasuje?', en: 'Which interior suits you better?' },
      leftLabel: { pl: 'Ciemne', en: 'Dark' },
      rightLabel: { pl: 'Jasne', en: 'Bright' },
      leftImage: '/research/semantic/Dark.jpeg',
      rightImage: '/research/semantic/Bright.jpeg'
    },
    {
      id: 'complexity',
      question: { pl: 'Które wnętrze bardziej do Ciebie pasuje?', en: 'Which interior suits you better?' },
      leftLabel: { pl: 'Proste', en: 'Simple' },
      rightLabel: { pl: 'Złożone', en: 'Complex' },
      leftImage: '/research/semantic/Simple.png',
      rightImage: '/research/semantic/Complex.png'
    }
  ];

  const handleVisualChoice = (side: 'left' | 'right') => {
    const currentQ = visualQuestions[visualQuestionIndex];
    const value = side === 'left' ? 0.2 : 0.8; // skala 0–1 (jak CoreProfileWizard)
    const newAnswers = { ...visualAnswers, [currentQ.id]: value };
    setVisualAnswers(newAnswers);
    
    // Update localPrefs
    setLocalPrefs(curr => ({
      ...curr,
      semanticDifferential: {
        warmth: currentQ.id === 'warmth' ? value : (curr.semanticDifferential?.warmth ?? 0.5),
        brightness: currentQ.id === 'brightness' ? value : (curr.semanticDifferential?.brightness ?? 0.5),
        complexity: currentQ.id === 'complexity' ? value : (curr.semanticDifferential?.complexity ?? 0.5),
        texture: curr.semanticDifferential?.texture ?? 0.5
      }
    }));
    
    if (visualQuestionIndex + 1 < visualQuestions.length) {
      onVisualQuestionIndexChange(visualQuestionIndex + 1);
    } else {
      // All visual questions completed, show sensory tests
      onVisualQuestionIndexChange(visualQuestions.length);
    }
  };

  const handlePaletteSelect = (paletteId: string) => {
    setLocalPrefs((prev) => ({
      ...prev,
      colorsAndMaterials: {
        ...(prev.colorsAndMaterials || {}),
        selectedPalette: paletteId,
        topMaterials: prev.colorsAndMaterials?.topMaterials || []
      }
    }));
  };

  const [selectedStyle, setSelectedStyle] = useState<string | undefined>(explicitPreferences?.colorsAndMaterials?.selectedStyle);
  const sensorySuiteRef = useRef<SensoryTestSuiteHandle>(null);

  const handleStyleSelect = (styleId: string) => {
    setSelectedStyle(styleId);
    setLocalPrefs((prev) => ({
      ...prev,
      colorsAndMaterials: {
        ...(prev.colorsAndMaterials || {}),
        selectedStyle: styleId
      }
    }));
  };

  const canSubmitComplete = Boolean(
    localPrefs.sensoryPreferences?.music &&
      localPrefs.sensoryPreferences?.texture &&
      localPrefs.sensoryPreferences?.light &&
      natureMetaphor &&
      typeof biophiliaScore === 'number'
  );

  return (
    <motion.div
      key="preference_questions"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
    >
      <GlassCard
        className={`flex min-h-0 w-full flex-col overflow-hidden p-6 lg:p-8 ${GLASS_CARD_SCROLL_STEP}`}
      >
        <div className="flex min-h-0 min-w-0 w-full flex-1 flex-col overflow-hidden">
          {/* Single scroll: SensoryTestSuite scrolls internally — avoid nested overflow-y-auto (double scrollbar on card edge). */}
          <AnimatePresence mode="wait">
            {visualQuestionIndex < visualQuestions.length ? (
            // Step 1: Visual Questions
            <motion.div
              key="visual_questions"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden"
            >
              <h3 className="mb-2 w-full max-w-3xl self-center text-center font-nasalization text-xl text-graphite md:text-2xl">
                {joinCopy(visualQuestions[visualQuestionIndex].question[language])}
              </h3>
              
              <div className="mb-6">
                <div className="text-xs text-silver-dark text-center mb-2 font-modern">
                  {tp("Pytanie", "Question")} {visualQuestionIndex + 1} / {visualQuestions.length}
                </div>
              </div>

              <div className="mx-auto mb-6 grid w-full max-w-3xl grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2">
                <button
                  type="button"
                  onClick={() => handleVisualChoice('left')}
                  className="group relative aspect-[4/3] rounded-xl overflow-hidden border-2 border-white/30 hover:border-gold/50 transition-all hover:scale-[1.02] cursor-pointer"
                >
                  <Image
                    src={visualQuestions[visualQuestionIndex].leftImage}
                    alt={joinCopy(visualQuestions[visualQuestionIndex].leftLabel[language])}
                    fill
                    className="object-cover"
                    style={{ objectPosition: 'center 30%' }}
                    onLoad={() => {
                    }}
                    onError={() => {
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-4">
                    <p className="text-white font-modern text-sm font-semibold">
                      {joinCopy(visualQuestions[visualQuestionIndex].leftLabel[language])}
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleVisualChoice('right')}
                  className="group relative aspect-[4/3] rounded-xl overflow-hidden border-2 border-white/30 hover:border-gold/50 transition-all hover:scale-[1.02] cursor-pointer"
                >
                  <Image
                    src={visualQuestions[visualQuestionIndex].rightImage}
                    alt={joinCopy(visualQuestions[visualQuestionIndex].rightLabel[language])}
                    fill
                    className="object-cover"
                    style={{ objectPosition: 'center 30%' }}
                    onLoad={() => {
                    }}
                    onError={() => {
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-4">
                    <p className="text-white font-modern text-sm font-semibold">
                      {visualQuestions[visualQuestionIndex].rightLabel[language]}
                    </p>
                  </div>
                </button>
              </div>
            </motion.div>
          ) : (
            // Step 2: Sensory Tests
            <motion.div
              key="sensory_tests"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex min-h-0 min-w-0 w-full max-w-full flex-1 flex-col overflow-hidden"
            >
              <SensoryTestSuite
                ref={sensorySuiteRef}
                className="flex min-h-0 w-full min-w-0 max-w-full flex-1 flex-col"
                paletteOptions={COLOR_PALETTE_OPTIONS}
                selectedPalette={localPrefs.colorsAndMaterials?.selectedPalette}
                onPaletteSelect={(paletteId) => handlePaletteSelect(paletteId)}
                styleOptions={STYLE_OPTIONS}
                selectedStyle={selectedStyle}
                onStyleSelect={(styleId) => handleStyleSelect(styleId)}
                onComplete={(results) => {
                  const palette = (results as { palette?: string }).palette;
                  const mergedRef = { current: null as RoomPreferencePayload | null };
                  flushSync(() => {
                    setLocalPrefs((prev) => {
                      const prevCm = prev.colorsAndMaterials || {};
                      const tex = results.texture?.trim();
                      const prevMats = (prevCm.topMaterials ?? []).filter(Boolean);
                      const topMats =
                        prevMats.length > 0 ? prevMats : tex ? [tex] : [];
                      const next: RoomPreferencePayload = {
                        ...prev,
                        sensoryPreferences: {
                          music: results.music,
                          texture: results.texture,
                          light: results.light,
                        },
                        colorsAndMaterials: {
                          ...prevCm,
                          ...(palette && { selectedPalette: palette }),
                          ...(results.style && { selectedStyle: results.style }),
                          topMaterials: topMats,
                        },
                      };
                      mergedRef.current = next;
                      return next;
                    });
                    setNatureMetaphor(results.natureMetaphor);
                    setBiophiliaScore(results.biophiliaScore);
                    if (results.style) {
                      setSelectedStyle(results.style);
                    }
                  });
                  const snapshot = mergedRef.current;
                  if (snapshot) {
                    onSubmit({
                      ...snapshot,
                      natureMetaphor: results.natureMetaphor,
                      biophiliaScore: results.biophiliaScore,
                    });
                  }
                }}
              />
            </motion.div>
          )}
          </AnimatePresence>

          <div className="mt-auto flex shrink-0 flex-col gap-3 border-t border-white/10 pt-6 sm:flex-row sm:justify-between sm:gap-4">
          <GlassButton 
            onClick={() => {
              if (visualQuestionIndex > 0 && visualQuestionIndex < visualQuestions.length) {
                onVisualQuestionIndexChange(visualQuestionIndex - 1);
              } else if (visualQuestionIndex >= visualQuestions.length) {
                if (sensorySuiteRef.current?.tryGoBackSubStep()) {
                  return;
                }
                onVisualQuestionIndexChange(visualQuestions.length - 1);
              } else {
                onBack();
              }
            }} 
            variant="secondary"
            className="w-full sm:w-auto"
          >
            <ArrowLeft size={18} />
            {tp("Wstecz", "Back")}
          </GlassButton>
          {visualQuestionIndex >= visualQuestions.length && (
            <GlassButton
              onClick={() => {
                onSubmit({
                  ...localPrefs,
                  natureMetaphor,
                  biophiliaScore
                });
              }}
              disabled={!canSubmitComplete}
              className="w-full sm:w-auto"
            >
              {tp("Zapisz preferencje", "Apply preferences")}
              <ArrowRight size={18} />
            </GlassButton>
          )}
          </div>
        </div>
      </GlassCard>
    </motion.div>
  );
}

const MATERIAL_OPTIONS = [
  { id: 'smooth_wood', label: { pl: 'Drewno', en: 'Wood' } },
  { id: 'warm_leather', label: { pl: 'Skóra', en: 'Leather' } },
  { id: 'rough_stone', label: { pl: 'Kamień', en: 'Stone' } },
  { id: 'soft_fabric', label: { pl: 'Tkanina', en: 'Fabric' } },
  { id: 'glass', label: { pl: 'Szkło', en: 'Glass' } },
  { id: 'polished_metal', label: { pl: 'Metal', en: 'Metal' } }
];

const FREQUENCY_OPTIONS = [
  { id: 'daily', label: { pl: 'Codziennie', en: 'Daily' } },
  { id: 'few_times_week', label: { pl: 'Kilka razy w tygodniu', en: 'Few times per week' } },
  { id: 'weekly', label: { pl: 'Raz w tygodniu', en: 'Weekly' } },
  { id: 'occasionally', label: { pl: 'Od czasu do czasu', en: 'Occasionally' } },
  { id: 'rarely', label: { pl: 'Rzadko', en: 'Rarely' } }
];

const SATISFACTION_OPTIONS = [
  {
    id: 'great',
    label: { pl: 'Działa idealnie', en: 'Great support' },
    description: {
      pl: 'Tutaj wszystko działa jak trzeba i nic Cię nie spowalnia.',
      en: 'Everything works smoothly here and nothing gets in the way.'
    }
  },
  {
    id: 'ok',
    label: { pl: 'Jest okej', en: 'It works' },
    description: {
      pl: 'Da się korzystać, choć warto byłoby je dopieścić.',
      en: 'Usable as is, but it could definitely feel better.'
    }
  },
  {
    id: 'difficult',
    label: { pl: 'Utrudnia', en: 'Needs help' },
    description: {
      pl: 'Przestrzeń męczy i trzeba ją poukładać od nowa.',
      en: 'The room gets in the way—you need a reset.'
    }
  }
];

function PainPointsStep({ selected, onUpdate, onNext, onBack }: any) {
  const { t, language, tp } = useLanguage();

  const togglePainPoint = (id: string) => {
    const updated = selected.includes(id)
      ? selected.filter((p: string) => p !== id)
      : [...selected, id];
    onUpdate(updated);
  };

  return (
    <motion.div
      key="pain_points"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
    >
      <GlassCard className={`flex min-h-0 flex-col p-6 lg:p-8 ${GLASS_CARD_SCROLL_STEP}`}>
        <h1 className="mb-6 text-center text-2xl font-nasalization text-graphite lg:text-3xl">
          {tp("Co w tym pomieszczeniu Ci przeszkadza?", "What’s getting in your way in this space?")}
        </h1>

        <p className="mx-auto mb-6 max-w-2xl text-center font-modern leading-relaxed text-graphite">
          {tp("Zaznacz wszystko, co chciałbyś poprawić właśnie tutaj — chodzi o realne utrudnienia w tej przestrzeni.", "Select everything you’d like to fix in this room—real friction you feel in this space.")}
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-8">
          {PAIN_POINTS.map((point) => {
            const isSelected = selected.includes(point.id);
            return (
              <button
                key={point.id}
                onClick={() => togglePainPoint(point.id)}
                className={`rounded-xl p-4 text-sm font-modern font-semibold transition-all duration-300 cursor-pointer group ${
                  isSelected
                    ? 'bg-gold/30 border-2 border-gold text-graphite shadow-lg'
                    : 'bg-white/10 border border-white/30 text-graphite transition-all duration-200 ease-out hover:scale-[1.03] hover:bg-gold-400/22 hover:border-gold-400/50 hover:shadow-[0_0_30px_-8px_rgba(255,229,92,0.45)]'
                }`}
              >
                <p className="text-center leading-tight">{t(point.label)}</p>
              </button>
            );
          })}
        </div>

        <div className="flex flex-col sm:flex-row justify-between gap-3 sm:gap-4">
          <GlassButton onClick={onBack} variant="secondary" className="w-full sm:w-auto">
            <ArrowLeft size={18} />
            {tp("Wstecz", "Back")}
          </GlassButton>
          <GlassButton onClick={onNext} className="w-full sm:w-auto">
            {tp("Dalej", "Next")}
            <ArrowRight size={18} />
          </GlassButton>
        </div>
      </GlassCard>
    </motion.div>
  );
}

function ActivitiesStep({
  roomType,
  activities,
  onUpdate,
  onNext,
  onBack
}: {
  roomType: string;
  activities: RoomActivity[];
  onUpdate: (nextActivities: RoomActivity[]) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const { t, language, tp } = useLanguage();
  /** Same normalization as research helpers — empty_room/other map to a full list, not 4-item default. */
  const activityDefinitions = getQuestionsForRoom(roomType, 'solo');

  const buildActivityMap = (list?: RoomActivity[]) =>
    (list || []).reduce<Record<string, RoomActivity>>((acc, activity) => {
      if (activity?.type) {
        acc[activity.type] = activity;
      }
      return acc;
    }, {});

  const [activityMap, setActivityMap] = useState<Record<string, RoomActivity>>(() => buildActivityMap(activities));
  const [selectionOrder, setSelectionOrder] = useState<string[]>(() => (activities || []).map((activity) => activity.type));

  useEffect(() => {
    setActivityMap(buildActivityMap(activities));
    setSelectionOrder((activities || []).map((activity) => activity.type));
  }, [activities]);

  const toggleActivity = (activityId: string) => {
    setActivityMap((prev) => {
      if (prev[activityId]) {
        const { [activityId]: _removed, ...rest } = prev;
        return rest;
      }

      return {
        ...prev,
        [activityId]: {
          type: activityId,
          frequency: 'daily',
          satisfaction: 'ok',
          timeOfDay: 'varies',
          withWhom: 'alone'
        }
      };
    });

    setSelectionOrder((prev) =>
      prev.includes(activityId) ? prev.filter((id) => id !== activityId) : [...prev, activityId]
    );
  };

  const updateActivity = (activityId: string, updates: Partial<RoomActivity>) => {
    setActivityMap((prev) => ({
      ...prev,
      [activityId]: {
        ...prev[activityId],
        ...updates
      }
    }));
  };

  const selectedActivities = selectionOrder.filter((id) => activityMap[id]).map((id) => activityMap[id]);
  const hasSelectedActivities = selectedActivities.length > 0;

  const handleNextStep = () => {
    onUpdate(selectedActivities);
    onNext();
  };

  return (
    <motion.div
      key="activities"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
    >
      <GlassCard className={`flex min-h-0 flex-col p-6 lg:p-8 ${GLASS_CARD_SCROLL_STEP}`}>
        <h1 className="mb-6 text-center text-2xl font-nasalization text-graphite lg:text-3xl">
          {tp("Co robisz w tym pomieszczeniu?", "What do you do in this space?")}
        </h1>

        <p className="mx-auto mb-6 max-w-2xl text-center font-modern leading-relaxed text-graphite">
          {tp("Zaznacz, co robisz w tym pomieszczeniu na co dzień, i opisz, jak obecna przestrzeń wspiera (albo utrudnia) te czynności.", "Select what you actually do in this space day to day, and note how the room helps or gets in the way.")}
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-8">
          {activityDefinitions.map((activity) => {
            const isSelected = Boolean(activityMap[activity.id]);
            return (
              <button
                key={activity.id}
                type="button"
                onClick={() => toggleActivity(activity.id)}
                aria-pressed={isSelected}
                className={`rounded-xl p-4 text-sm font-modern font-semibold transition-all duration-300 cursor-pointer group ${
                  isSelected
                    ? 'bg-gold/30 border-2 border-gold text-graphite shadow-lg'
                    : 'bg-white/10 border border-white/30 text-graphite transition-all duration-200 ease-out hover:scale-[1.03] hover:bg-gold-400/22 hover:border-gold-400/50 hover:shadow-[0_0_30px_-8px_rgba(255,229,92,0.45)]'
                }`}
              >
                <p className="text-center leading-tight">{t(activity.label)}</p>
              </button>
            );
          })}
        </div>

        {hasSelectedActivities ? (
          <div className="space-y-4 mb-8">
            {selectedActivities.map((activity) => {
              const definition = activityDefinitions.find((item: any) => item.id === activity.type);
              return (
                <div
                  key={activity.type}
                  className="rounded-xl border border-white/20 bg-white/5 p-5 shadow-sm"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-sm uppercase tracking-[0.2em] text-silver-dark">
                        {tp("Aktywność", "Activity")}
                      </p>
                      <p className="text-lg font-nasalization text-graphite">
                        {definition ? t(definition.label) : activity.type}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleActivity(activity.type)}
                      className="text-sm text-silver-dark hover:text-gold transition-colors"
                    >
                      {tp("Usuń", "Remove")}
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-silver-dark">
                        {tp("Częstotliwość", "Frequency")}
                      </p>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {FREQUENCY_OPTIONS.map((option) => {
                          const isActive = activity.frequency === option.id;
                          return (
                            <button
                              key={option.id}
                              type="button"
                              onClick={() => updateActivity(activity.type, { frequency: option.id })}
                              className={`px-3 py-2 rounded-2xl border text-sm font-modern transition-all ${
                                isActive
                                  ? 'border-gold bg-gold/10 text-graphite'
                                  : 'border-white/20 text-silver-dark hover:border-gold/30'
                              }`}
                            >
                              {option.label[language]}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-silver-dark">
                        {tp("Jak to pomieszczenie sprawdza się przy tej czynności?", "How well does this space work for that activity?")}
                      </p>
                      <div className="grid sm:grid-cols-3 gap-2 mt-2">
                        {SATISFACTION_OPTIONS.map((option) => {
                          const isActive = activity.satisfaction === option.id;
                          return (
                            <button
                              key={option.id}
                              type="button"
                              onClick={() => updateActivity(activity.type, { satisfaction: option.id })}
                              className={`rounded-2xl border px-4 py-3 text-sm text-left transition-all ${
                                isActive
                                  ? 'border-gold bg-gold/10 text-graphite'
                                  : 'border-white/20 text-silver-dark hover:border-gold/30'
                              }`}
                            >
                              <p className="font-semibold">{option.label[language]}</p>
                              <p className="text-xs text-silver-dark">{option.description[language]}</p>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-white/25 bg-white/5 p-6 text-center text-graphite font-modern mb-8">
            {tp("Zaznacz co najmniej jedną czynność, którą wykonujesz w tym pomieszczeniu, aby przejść dalej.", "Select at least one thing you do in this space to continue.")}
          </div>
        )}

        <div className="flex flex-col sm:flex-row justify-between gap-3 sm:gap-4">
          <GlassButton onClick={onBack} variant="secondary" className="w-full sm:w-auto">
            <ArrowLeft size={18} />
            {tp("Wstecz", "Back")}
          </GlassButton>
          <GlassButton onClick={handleNextStep} disabled={!hasSelectedActivities} className="w-full sm:w-auto">
            {tp("Dalej", "Next")}
            <ArrowRight size={18} />
          </GlassButton>
        </div>
      </GlassCard>
    </motion.div>
  );
}

function RoomSummaryStep({ data, onComplete, onBack, isSaving }: any) {
  const { tp } = useLanguage();
  const roomLabel =
    typeof data?.name === 'string' && data.name.trim().length > 0 ? data.name.trim() : '';

  const summaryLead = roomLabel
    ? tp(
        `Świetnie — „${roomLabel}” ma już komplet danych. IDA może projektować to wnętrze tak, by naprawdę pasowało do Ciebie i do tego pomieszczenia.`,
        `Great—“${roomLabel}” is fully set up. IDA can design this interior so it truly fits you and this specific space.`,
      )
    : tp(
        'Świetnie — to pomieszczenie ma już komplet danych. IDA może projektować to wnętrze tak, by naprawdę pasowało do Ciebie i do tego pomieszczenia.',
        'Great—this space is fully set up. IDA can design this interior so it truly fits you and this specific space.',
      );

  return (
    <motion.div
      key="summary"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
    >
      <GlassCard className={`flex min-h-0 flex-col items-center p-6 text-center lg:p-8 ${GLASS_CARD_SCROLL_STEP}`}>
        <h1 className="mb-6 text-2xl font-nasalization text-graphite lg:text-3xl">
          {tp("To pomieszczenie jest gotowe!", "This space is ready!")}
        </h1>

        <p className="mx-auto mb-8 max-w-xl text-graphite font-modern">
          {summaryLead}
        </p>

        <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4">
          <GlassButton onClick={onBack} variant="secondary" className="w-full sm:w-auto">
            <ArrowLeft size={18} />
            {tp("Wstecz", "Back")}
          </GlassButton>
          <GlassButton onClick={onComplete} className="w-full sm:w-auto sm:px-8" disabled={isSaving}>
            {isSaving
              ? (tp("Zapisuję...", "Saving..."))
              : (tp("Zacznij Projektowanie", "Start Designing"))
            }
            <ArrowRight size={18} />
          </GlassButton>
        </div>
      </GlassCard>
    </motion.div>
  );
}

