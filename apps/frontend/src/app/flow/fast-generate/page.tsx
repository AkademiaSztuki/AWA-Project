'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useSessionData } from '@/hooks/useSessionData';
import { getSessionStoreSnapshot } from '@/hooks/useSession';
import { useLanguage } from '@/contexts/LanguageContext';
import { getOrCreateProjectId, saveGenerationSet, saveGeneratedImages, logBehavioralEvent, startParticipantGeneration, endParticipantGeneration, saveImageRatingEvent, startPageView, endPageView, safeSessionStorage, saveSessionToGcp } from '@/lib/gcp-data';
import { useGoogleAI, getGenerationParameters } from '@/hooks/useGoogleAI';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';
import { GlassScalePicker } from '@/components/ui/GlassScalePicker';
import { LoadingProgress } from '@/components/ui/LoadingProgress';
import { GenerationHistory } from '@/components/ui/GenerationHistory';
import { AwaDialogue } from '@/components/awa';
import { stopAllDialogueAudio } from '@/hooks/useAudioManager';
import { useAuth } from '@/contexts/AuthContext';
import { LoginModal, type LoginNudgeEvent } from '@/components/auth/LoginModal';
import { FREE_GRANT_CREDITS } from '@/lib/credits';
import { creditsAuthHeaders } from '@/lib/credits-request-headers';
import { initAnonSessionAfterConsent } from '@/lib/anon-session-client';
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
  MessageSquare,
} from 'lucide-react';
import { IntrinsicContainImage } from '@/components/ui/IntrinsicContainImage';
import { GenerationSource } from '@/lib/prompt-synthesis/modes';
import { addGeneratedImageToSpace } from '@/lib/spaces';
import {
  getOrCreateSpaceId,
  uploadSpaceImage,
  saveParticipantImages,
  saveSpaceImagesMetadata,
} from '@/lib/remote-spaces';
import {
  appendModificationPromptLog,
  buildModificationPromptLogEntry,
} from '@/lib/modification-prompt-log';
import {
  prepareGenerationDimensionsFromRoomBase64,
  parseGoogleAspectRatioLabel,
  type GoogleAspectRatio,
  type PreparedGenerationDimensions,
} from '@/lib/image-aspect';
import {
  MACRO_STYLE_MODIFICATIONS,
  buildFastMacroModificationPrompt,
} from '@/lib/modifications/macro-style-modifications';

const IDA_FAST_TRACK_REQUIRE_FRESH_GEN_KEY = 'awa_fast_track_require_fresh_gen';
/** Session-only: do not re-show soft “save profile” nudge after dismiss or refresh. */
const IDA_FAST_TRACK_SAVE_PROFILE_NUDGE_DISMISSED_KEY = 'awa_fast_track_save_profile_nudge_dismissed';

/** Serializable snapshot for session restore (same shape as PreparedGenerationDimensions). */
type FastTrackSourceGenerationDimensionsSnapshot = {
  sourceWidth: number;
  sourceHeight: number;
  normalizedWidth: number;
  normalizedHeight: number;
  aspectRatio: GoogleAspectRatio;
};

function parseFastTrackSourceGenerationDimensionsSnapshot(
  raw: unknown,
): PreparedGenerationDimensions | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const aspectRatio = parseGoogleAspectRatioLabel(String(o.aspectRatio ?? ''));
  const nw = Number(o.normalizedWidth);
  const nh = Number(o.normalizedHeight);
  const sw = Number(o.sourceWidth);
  const sh = Number(o.sourceHeight);
  if (!aspectRatio || !Number.isFinite(nw) || !Number.isFinite(nh) || nw < 1 || nh < 1) {
    return null;
  }
  return {
    sourceWidth: Number.isFinite(sw) && sw > 0 ? sw : nw,
    sourceHeight: Number.isFinite(sh) && sh > 0 ? sh : nh,
    normalizedWidth: nw,
    normalizedHeight: nh,
    aspectRatio,
  };
}

function modernFurnishChecklist(roomTypeRaw: string): string {
  const t = String(roomTypeRaw || 'living room').toLowerCase();
  if (t.includes('kitchen')) {
    return 'Cabinetry or base units, countertop workspace, sink, refrigerator zone, cooktop and oven wall, optional island or peninsula, dining stools or compact table, pendant or under-cabinet lighting.';
  }
  if (t.includes('bath')) {
    return 'Vanity with storage, mirror, towel storage, shower or tub zone, quality wall and floor finishes, layered ambient and task lighting.';
  }
  if (t.includes('bed')) {
    return 'Bed with headboard, nightstands, dresser or wardrobe, layered lighting (bedside + ceiling), seating or bench, textiles layered on bed.';
  }
  if (t.includes('office') || t.includes('study') || t.includes('desk')) {
    return 'Desk, ergonomic chair, shelving or storage, task lamp, cable-aware layout, minimal wall decor.';
  }
  if (t.includes('dining')) {
    return 'Dining table sized to room, chairs, statement or linear lighting above table, sideboard or console if space allows.';
  }
  return 'Sectional or sofa plus armchairs, coffee table, media or storage unit, floor and table lighting, area rug where the style benefits from it, large wall art or mirror to balance wide walls, plants or sculptural decor for scale.';
}

function buildFastTrackPrompt(
  session: any,
  opts: {
    aspectRatio: GoogleAspectRatio;
    sourceWidth: number;
    sourceHeight: number;
    emptyRoomInput: boolean;
  },
): string {
  const style = session?.visualDNA?.dominantStyle || 'modern';
  const roomType = session?.roomType || 'living room';
  const wide = opts.aspectRatio === '21:9' || opts.aspectRatio === '16:9';
  const layout_requirements = wide
    ? 'Panorama / ultrawide frame: arrange seating, tables, lighting, and decor across LEFT, CENTER, and RIGHT thirds. Avoid a huge empty center band of wall and floor; use foreground and midground pieces with clear focal points readable at a glance.'
    : 'Complete, believable furniture layout appropriate to the camera angle and room type.';

  const modern_furniture_checklist =
    style === 'modern' ? modernFurnishChecklist(roomType) : undefined;

  return JSON.stringify({
    generation_mode: 'furnish_empty_or_uploaded_room',
    must_furnish: true,
    furniture_density: 'high',
    layout_requirements,
    google_aspect_ratio_hint: opts.aspectRatio,
    source_dimensions: `${opts.sourceWidth}x${opts.sourceHeight}`,
    empty_room_input: opts.emptyRoomInput,
    style,
    room_type: roomType,
    description: `A fully furnished ${style} style ${roomType} interior — high furniture coverage, not an empty shell.`,
    elements: [
      `Primary furniture set in ${style} style`,
      'Layered lighting (ambient + task + accent)',
      'Cohesive materials and finishes',
      'Decor, textiles, and wall treatment depth',
    ],
    ...(modern_furniture_checklist ? { modern_furniture_checklist } : {}),
    quality: 'high quality, realistic, detailed, magazine editorial photography',
  });
}

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

interface LocalizedText {
  pl: string;
  en: string;
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

/** Same style list as /flow/style-selection (STYLE_OPTIONS). */
const MACRO_MODIFICATIONS: ModificationOption[] = MACRO_STYLE_MODIFICATIONS;

const buildFastMicroModificationPrompt = (modification: ModificationOption, currentStyle: string) => {
  const microPrompts: Record<string, string> = {
    warmer_colors: `SYSTEM INSTRUCTION: Image-to-image color modification. KEEP: walls, windows, doors, furniture shapes, furniture positions, layout, camera angle - IDENTICAL. CHANGE ONLY: shift the color palette toward warm beige, cream, terracotta, and soft golden tones throughout this ${currentStyle} interior. Recolor existing surfaces, upholstery, textiles, and accessories without replacing furniture or changing object shapes.`,
    cooler_colors: `SYSTEM INSTRUCTION: Image-to-image color modification. KEEP: walls, windows, doors, furniture shapes, furniture positions, layout, camera angle - IDENTICAL. CHANGE ONLY: shift the color palette toward cool blue-gray, silver, slate, and icy neutral tones throughout this ${currentStyle} interior. Recolor existing surfaces, upholstery, textiles, and accessories without replacing furniture or changing object shapes.`,
    more_lighting: `SYSTEM INSTRUCTION: Image-to-image lighting enhancement. KEEP: walls, windows, doors, all furniture, furniture positions, layout, camera angle - IDENTICAL. CHANGE ONLY: increase the amount of visible lighting and brightness. Add or enhance lamps, sconces, ceiling fixtures, natural window light, and warm ambient glow. Do not replace furniture, do not change furniture shapes, and do not rearrange the room.`,
    darker_mood: `SYSTEM INSTRUCTION: Image-to-image mood modification. KEEP: walls, windows, doors, all furniture, furniture positions, layout, camera angle - IDENTICAL. CHANGE ONLY: create a darker, more intimate mood with dimmer lighting, deeper shadows, and a cozy evening atmosphere. Do not replace furniture or change the room layout.`,
    natural_materials: `SYSTEM INSTRUCTION: Image-to-image material refinement. KEEP: walls, windows, doors, furniture shapes, furniture positions, layout, camera angle - IDENTICAL. CHANGE ONLY: make visible finishes and textures feel more natural: wood, stone, linen, wool, rattan, clay, and organic fabrics. Preserve all furniture silhouettes and positions.`,
    more_plants: `SYSTEM INSTRUCTION: Image-to-image plant addition. KEEP: walls, windows, doors, all furniture, furniture positions, layout, camera angle - IDENTICAL. CHANGE ONLY: add potted plants, hanging greenery, and botanical accents in realistic empty spaces around the existing furniture. Do not replace or move furniture.`,
    less_plants: `SYSTEM INSTRUCTION: Image-to-image plant removal. KEEP: walls, windows, doors, all furniture, furniture positions, layout, camera angle - IDENTICAL. CHANGE ONLY: remove plants, flowers, and greenery, then seamlessly inpaint the surfaces behind them. Do not replace or move furniture.`,
    change_furniture: `SYSTEM INSTRUCTION: Image-to-image furniture replacement. KEEP: walls, windows, doors, floor, ceiling, lighting, decorations, camera angle, room layout - IDENTICAL. CHANGE ONLY: replace all furniture with new furniture pieces that match the ${currentStyle} style. New furniture must keep similar scale, proportions, and positions. Only furniture changes - everything else remains exactly the same.`,
    add_decorations: `SYSTEM INSTRUCTION: Image-to-image decoration addition. KEEP: walls, windows, doors, all furniture, furniture positions, layout, camera angle - IDENTICAL. CHANGE ONLY: add artwork, decorative accessories, cushions, vases, and styling elements that match this ${currentStyle} interior. Do not replace or move furniture.`,
    change_flooring: `SYSTEM INSTRUCTION: Image-to-image floor modification. KEEP: walls, windows, doors, all furniture, furniture positions, layout, camera angle - IDENTICAL. CHANGE ONLY: replace the visible floor material or pattern with a new realistic flooring finish. Keep every other element exactly the same.`,
  };

  return microPrompts[modification.id] || `SYSTEM INSTRUCTION: Image-to-image micro modification. KEEP: walls, windows, doors, furniture positions, layout, camera angle - IDENTICAL. CHANGE ONLY: ${modification.label.en} in this ${currentStyle} interior.`;
};

/**
 * React 18 Strict Mode (dev) mounts twice and runs effects twice before `setIsGenerating` flips.
 * A synchronous module-level guard prevents two parallel Vertex requests + double credit deduct.
 */
let fastGenerateInitialGenerationInFlight = false;
let fastStaleSessionClearInFlight = false;
let fastFreshGenClearInFlight = false;

function isFastTrackStyleStale(session: any): boolean {
  const dom = session?.visualDNA?.dominantStyle;
  if (!dom) return false;
  const last = session?.fastTrackLastGeneratedStyle;
  if (last) return last !== dom;
  const fastGen = (session?.generations || []).find((g: any) => g?.id?.startsWith('fast-gen'));
  if (!fastGen?.prompt) return false;
  try {
    const j = JSON.parse(fastGen.prompt);
    return typeof j.style === 'string' && j.style !== dom;
  } catch {
    return false;
  }
}

/** Data URL for room upload thumbnail / preview — same sources as `handleShowOriginal`. */
function buildRoomUploadDataUrlFromSession(session: any): string | null {
  if (!session) return null;
  let roomImage = session.roomImageEmpty || session.roomImage;
  if (!roomImage && typeof window !== 'undefined') {
    try {
      roomImage = safeSessionStorage.getItem('aura_session_room_image') || undefined;
    } catch {
      /* ignore */
    }
  }
  if (!roomImage || typeof roomImage !== 'string') return null;
  if (roomImage.startsWith('data:')) return roomImage;
  const base64 = roomImage.includes(',') ? roomImage.split(',')[1] : roomImage;
  if (!base64?.trim()) return null;
  return `data:image/jpeg;base64,${base64}`;
}

function extractBase64FromGenerated(img: GeneratedImage): string | null {
  if (img.base64) return img.base64;
  if (img.url?.startsWith('data:')) {
    const parts = img.url.split(',');
    return parts.length > 1 ? parts[1] : null;
  }
  return null;
}

export default function FastGeneratePage() {
  const router = useRouter();
  const { language } = useLanguage();
  const { user } = useAuth();
  const authUserRef = useRef(user);
  authUserRef.current = user;
  const { sessionData, updateSessionData, isInitialized: isSessionInitialized } = useSessionData();
  const { generateSixImagesParallelWithGoogle, upscaleImageWithGoogle, isLoading, error, setError } = useGoogleAI();
  const isAuthenticated = !!user;

  const [loginWallOpen, setLoginWallOpen] = useState(false);
  const [loginGateMode, setLoginGateMode] = useState<'soft' | 'hard'>('hard');
  const [saveProfileNudgeOpen, setSaveProfileNudgeOpen] = useState(false);

  const [generatedImage, setGeneratedImage] = useState<GeneratedImage | null>(null);
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]); // Store all generated images
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
  /** Keeps the latest controller for unmount cleanup (avoid Strict Mode abort via [abortController] effect). */
  const abortControllerRef = useRef<AbortController | null>(null);
  /** Sizing from the user's room upload — reused for every modification (not derived from last AI output). */
  const fastTrackSourceGenerationDimsRef = useRef<PreparedGenerationDimensions | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  /** Compare with user upload — same pattern as full-flow generate page */
  const [originalRoomPhotoUrl, setOriginalRoomPhotoUrl] = useState<string | null>(null);
  const [showOriginalRoomPhoto, setShowOriginalRoomPhoto] = useState(false);
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
  const [customModificationText, setCustomModificationText] = useState('');

  const roomUploadPreviewUrl = useMemo(
    () => buildRoomUploadDataUrlFromSession(sessionData),
    [sessionData],
  );

  const historyForDisplay = useMemo(() => {
    const uploadUrl = roomUploadPreviewUrl;
    if (!uploadUrl) return generationHistory;
    return [
      {
        id: 'fast-track-upload-original',
        type: 'upload' as const,
        label:
          language === 'pl' ? 'Zdjęcie z uploadu' : 'Uploaded photo',
        timestamp: 0,
        imageUrl: uploadUrl,
      },
      ...generationHistory,
    ];
  }, [generationHistory, roomUploadPreviewUrl, language]);

  /** Thumbnail selection in history: base image for all modifications (micro, macro, custom). */
  const resolveSelectedGeneratedImageForModification = useCallback((): GeneratedImage | null => {
    const uploadFirst = !!roomUploadPreviewUrl;
    const idx = currentHistoryIndex;
    if (uploadFirst && idx === 0) return null;
    const ghIndex = uploadFirst ? idx - 1 : idx;
    if (ghIndex < 0 || ghIndex >= generationHistory.length) return null;
    const item = generationHistory[ghIndex];
    if (!item?.id) return null;
    return generatedImages.find((img) => img.id === item.id) ?? null;
  }, [roomUploadPreviewUrl, currentHistoryIndex, generationHistory, generatedImages]);

  type CreditAction = 'generate' | 'regenerate' | 'upscale' | 'save' | 'matrix';

  const runCreditsFunnelEvent = (event: LoginNudgeEvent) => {
    const uid = (sessionData as { userHash?: string } | null)?.userHash;
    if (!uid) return;
    void logBehavioralEvent(uid, 'login_nudge', { path: 'fast-generate', nudge: event });
  };

  const checkCreditsWithAction = async (userHash: string, amount: number, action: CreditAction) => {
    const response = await fetch('/api/credits/check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...creditsAuthHeaders() },
      credentials: 'include',
      body: JSON.stringify({
        userHash,
        amount,
        action,
        ...(!isAuthenticated ? { pathScope: 'fast' as const } : {}),
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
        ...(!isAuthenticated ? { pathScope: 'fast' as const } : {}),
      }),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to deduct credits');
    }
  };

  useEffect(() => {
    void initAnonSessionAfterConsent();
  }, []);

  // Initial generation
  const handleInitialGeneration = async () => {
    if (fastGenerateInitialGenerationInFlight) {
      console.log('[Fast Generate] Skipping duplicate initial generation (already in flight)');
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/18b9349d-1699-4e68-9929-30c79f24c497', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '995889' },
        body: JSON.stringify({
          sessionId: '995889',
          hypothesisId: 'H-DUP-STRICT',
          runId: 'verify',
          location: 'fast-generate/page.tsx:handleInitialGeneration',
          message: 'duplicate suppressed',
          data: { isGeneratingState: isGenerating },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
      // #endregion
      return;
    }
    fastGenerateInitialGenerationInFlight = true;

    try {
      if (isGenerating) return;

      const typedSessionData = getSessionStoreSnapshot() as any;
      const roomImage = typedSessionData?.roomImage;
      const roomImageEmpty = typedSessionData?.roomImageEmpty;
      const processedRoomImage = roomImageEmpty || roomImage;

      if (!processedRoomImage) {
        setError('Brak zdjęcia pomieszczenia. Wróć do poprzedniego kroku i dodaj zdjęcie.');
        return;
      }

      if (typedSessionData?.userHash) {
        let credit: Awaited<ReturnType<typeof checkCreditsWithAction>> | null = null;
        try {
          credit = await checkCreditsWithAction(typedSessionData.userHash, 10, 'generate');
        } catch (creditError) {
          console.warn('[Fast Generate] Error checking credits:', creditError);
        }

        if (credit && !credit.allowed) {
          if (credit.code === 429) {
            const h = typedSessionData.userHash;
            if (h) {
              void logBehavioralEvent(h, 'quota_exceeded', {
                path: 'fast-generate',
                reason: credit.scope === 'ip' ? 'ip' : credit.reason,
              });
            }
            setLoginGateMode('hard');
            setLoginWallOpen(true);
            return;
          }
          setError(
            isAuthenticated
              ? 'Nie masz wystarczającej liczby kredytów. Potrzebujesz 10 kredytów na jeden obraz.'
              : 'Darmowa anonimowa generacja jest niedostępna. Zaloguj się, aby kontynuować.',
          );
          return;
        }
      }

      setIsGenerating(true);
    setError(null);
    setLoadingStage(1);
    setLoadingProgress(10);
    setStatusMessage("Przygotowuję generację...");
    setEstimatedTime(120);

    const controller = new AbortController();
    abortControllerRef.current = controller;
    setAbortController(controller);

    let jobId: string | null = null;
    let jobClosed = false;
    try {
      // Start page view tracking
      const projectId = await getOrCreateProjectId(typedSessionData.userHash);
      let viewId: string | null = null;
      if (projectId) {
        viewId = await startPageView(projectId, 'fast-generate');
        setPageViewId(viewId);
      }

      let prepared: PreparedGenerationDimensions;
      try {
        prepared = await prepareGenerationDimensionsFromRoomBase64(processedRoomImage);
      } catch (e) {
        console.warn('[Fast Generate] prepareGenerationDimensionsFromRoomBase64 failed, using 1:1', e);
        prepared = {
          sourceWidth: 1024,
          sourceHeight: 1024,
          normalizedWidth: 1024,
          normalizedHeight: 1024,
          aspectRatio: '1:1',
        };
      }

      const emptyRoomInput = String(typedSessionData?.roomType || '') === 'empty_room';

      console.log('[Fast Generate] Generation sizing:', {
        baseImage: roomImageEmpty ? 'roomImageEmpty' : 'roomImage',
        source: `${prepared.sourceWidth}x${prepared.sourceHeight}`,
        normalized: `${prepared.normalizedWidth}x${prepared.normalizedHeight}`,
        aspectRatio: prepared.aspectRatio,
        emptyRoomInput,
      });

      fastTrackSourceGenerationDimsRef.current = prepared;

      const prompt = buildFastTrackPrompt(typedSessionData, {
        aspectRatio: prepared.aspectRatio,
        sourceWidth: prepared.sourceWidth,
        sourceHeight: prepared.sourceHeight,
        emptyRoomInput,
      });

      // Start generation job to participant_generations
      const userHash = typedSessionData.userHash;
      if (userHash) {
        const baseParams = getGenerationParameters('initial', generationCount);
        jobId = await startParticipantGeneration(userHash, {
          type: 'initial',
          prompt: prompt,
          parameters: {
            ...baseParams,
            path_type: 'fast', // Mark as fast track
            width: prepared.normalizedWidth,
            height: prepared.normalizedHeight,
            aspect_ratio: prepared.aspectRatio,
          },
          has_base_image: true
        });
      }

      setLoadingProgress(30);
      setStatusMessage("Generuję obrazek...");
      setEstimatedTime(90);

      const style = typedSessionData?.visualDNA?.dominantStyle || 'modern';

      const parameters = {
        ...getGenerationParameters('initial', generationCount),
        width: prepared.normalizedWidth,
        height: prepared.normalizedHeight,
        image_size: 1024,
        aspect_ratio: prepared.aspectRatio,
        style,
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
        if (jobId) {
          await endParticipantGeneration(jobId, {
            status: 'error',
            latency_ms: 0,
            error_message: 'Generation cancelled',
          });
          jobClosed = true;
        }
        return;
      }

      if (response.successful_count === 0) {
        setError("Nie udało się wygenerować obrazu.");
        if (jobId) {
          await endParticipantGeneration(jobId, { status: 'error', latency_ms: 0, error_message: 'Generation failed' });
          jobClosed = true;
        }
        return;
      }

      const result = response.results[0];
      if (!result.success) {
        setError(result.error || "Nie udało się wygenerować obrazu.");
        if (jobId) {
          await endParticipantGeneration(jobId, {
            status: 'error',
            latency_ms: 0,
            error_message: result.error || 'Generation failed',
          });
          jobClosed = true;
        }
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
      setGeneratedImages([newImage]); // Store in array
      setShowOriginalRoomPhoto(false);
      setGenerationCount(prev => prev + 1);
      setLoadingProgress(100);
      setStatusMessage("Gotowe!");
      setEstimatedTime(0);

      // Save to session (merge — do not wipe unrelated generations / images from other flows)
      const prevImgs = Array.isArray(typedSessionData?.generatedImages) ? typedSessionData.generatedImages : [];
      const prevGens = Array.isArray(typedSessionData?.generations) ? typedSessionData.generations : [];
      const imagesWithoutFast = prevImgs.filter((img: any) => !(img?.id && String(img.id).startsWith('fast-')));
      const gensWithoutFast = prevGens.filter((g: any) => !(g?.id && String(g.id).startsWith('fast-gen')));
      const sourceGenDimsSnapshot: FastTrackSourceGenerationDimensionsSnapshot = {
        sourceWidth: prepared.sourceWidth,
        sourceHeight: prepared.sourceHeight,
        normalizedWidth: prepared.normalizedWidth,
        normalizedHeight: prepared.normalizedHeight,
        aspectRatio: prepared.aspectRatio,
      };

      await updateSessionData({
        generatedImages: [...imagesWithoutFast, { id: newImage.id, url: newImage.url }],
        generations: [
          ...gensWithoutFast,
          {
            id: `fast-gen-${generationCount}`,
            prompt: prompt,
            images: 1,
            timestamp: Date.now(),
            type: 'initial',
          },
        ],
        fastTrackLastGeneratedStyle: typedSessionData?.visualDNA?.dominantStyle,
        fastTrackSourceGenerationDimensions: sourceGenDimsSnapshot,
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
      {
        const uploadUrl = buildRoomUploadDataUrlFromSession(
          getSessionStoreSnapshot() as any,
        );
        setCurrentHistoryIndex(uploadUrl ? 1 : 0);
      }

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

      if (jobId) {
        await endParticipantGeneration(jobId, { status: 'success', latency_ms: 0 });
        jobClosed = true;
      }
      if (userHash) {
        try {
          await deductCreditsViaApi(userHash, newImage.id);
        } catch (creditError) {
          console.warn('[Fast Generate] Error deducting credits:', creditError);
        }
      }
      if (viewId && typedSessionData?.userHash) {
        await endPageView(typedSessionData.userHash, viewId);
      }

      if (
        typeof window !== 'undefined' &&
        !authUserRef.current &&
        !sessionStorage.getItem(IDA_FAST_TRACK_SAVE_PROFILE_NUDGE_DISMISSED_KEY)
      ) {
        requestAnimationFrame(() => setSaveProfileNudgeOpen(true));
      }

    } catch (err) {
      console.error('Generation failed:', err);
      setError(err instanceof Error ? err.message : 'Wystąpił nieznany błąd podczas generacji.');
      setIsGenerating(false);
      if (jobId && !jobClosed) {
        try {
          await endParticipantGeneration(jobId, {
            status: 'error',
            latency_ms: 0,
            error_message: err instanceof Error ? err.message : 'Generation failed',
          });
          jobClosed = true;
        } catch {}
      }
    } finally {
      if (jobId && !jobClosed) {
        try {
          await endParticipantGeneration(jobId, {
            status: 'error',
            latency_ms: 0,
            error_message: 'Generation interrupted',
          });
        } catch {}
      }
      setIsGenerating(false);
    }
    } finally {
      fastGenerateInitialGenerationInFlight = false;
    }
  };

  // Auto-generate on mount if no image exists
  useEffect(() => {
    if (!isSessionInitialized || !sessionData) return;

    const typedSessionData = sessionData as any;

    const restoredDims = parseFastTrackSourceGenerationDimensionsSnapshot(
      typedSessionData?.fastTrackSourceGenerationDimensions,
    );
    if (restoredDims) {
      fastTrackSourceGenerationDimsRef.current = restoredDims;
    } else {
      const roomRaw = typedSessionData?.roomImageEmpty || typedSessionData?.roomImage;
      if (roomRaw) {
        void (async () => {
          try {
            const clean = String(roomRaw).includes(',') ? String(roomRaw).split(',')[1] : String(roomRaw);
            fastTrackSourceGenerationDimsRef.current = await prepareGenerationDimensionsFromRoomBase64(clean);
          } catch (e) {
            console.warn('[Fast Generate] Could not hydrate generation dimensions from room image', e);
          }
        })();
      }
    }

    const savedGeneratedImages = typedSessionData?.generatedImages || [];
    const fastSavedOnly = savedGeneratedImages.filter(
      (img: any) => img?.id && String(img.id).startsWith('fast-'),
    );
    const hasFastPreview = fastSavedOnly.length > 0;
    const styleStale = isFastTrackStyleStale(typedSessionData) && hasFastPreview;

    const requireFreshGen =
      typeof window !== 'undefined' &&
      safeSessionStorage.getItem(IDA_FAST_TRACK_REQUIRE_FRESH_GEN_KEY) === '1';

    if (requireFreshGen && !isGenerating && !generatedImage) {
      if (fastFreshGenClearInFlight) return;
      fastFreshGenClearInFlight = true;
      void (async () => {
        try {
          const imgs = savedGeneratedImages.filter(
            (img: any) => !(img?.id && String(img.id).startsWith('fast-')),
          );
          const gens = (typedSessionData.generations || []).filter(
            (g: any) => !(g?.id && String(g.id).startsWith('fast-gen')),
          );
          await updateSessionData({
            generatedImages: imgs,
            generations: gens,
            fastTrackLastGeneratedStyle: undefined,
          } as any);
        } finally {
          safeSessionStorage.removeItem(IDA_FAST_TRACK_REQUIRE_FRESH_GEN_KEY);
          fastFreshGenClearInFlight = false;
        }
        queueMicrotask(() => {
          void handleInitialGeneration();
        });
      })();
      return;
    }

    if (styleStale && !isGenerating && !generatedImage) {
      if (fastStaleSessionClearInFlight) return;
      fastStaleSessionClearInFlight = true;
      void (async () => {
        try {
          const imgs = savedGeneratedImages.filter((img: any) => !(img?.id && String(img.id).startsWith('fast-')));
          const gens = (typedSessionData.generations || []).filter((g: any) => !(g?.id && String(g.id).startsWith('fast-gen')));
          await updateSessionData({
            generatedImages: imgs,
            generations: gens,
            fastTrackLastGeneratedStyle: undefined,
          } as any);
        } finally {
          fastStaleSessionClearInFlight = false;
        }
        queueMicrotask(() => {
          void handleInitialGeneration();
        });
      })();
      return;
    }

    const hasGeneratedImages = savedGeneratedImages.length > 0;
    
    if (!hasGeneratedImages && !isGenerating && !generatedImage) {
      handleInitialGeneration();
    } else if (hasGeneratedImages && !hasFastPreview && !generatedImage && !isGenerating) {
      // Session has e.g. matrix/gen previews but no fast-track row — still need a new fast render on this page
      handleInitialGeneration();
    } else if (hasFastPreview && !generatedImage && !isGenerating) {
      // Restore only fast-track previews (never use matrix-* / gen-* as the main fast image)
      const restoredImages: GeneratedImage[] = fastSavedOnly.map((savedImage: any) => {
        // Try to extract base64 from URL if it's a data URL
        let base64 = '';
        if (savedImage.url && savedImage.url.startsWith('data:')) {
          base64 = savedImage.url.split(',')[1] || '';
        } else if (savedImage.base64) {
          base64 = savedImage.base64;
        }
        
        return {
          id: savedImage.id || `restored-${Date.now()}`,
          url: savedImage.url,
          base64: base64,
          prompt: savedImage.prompt || 'Restored from session',
          parameters: savedImage.parameters || {},
          ratings: savedImage.ratings || { aesthetic_match: 0, character: 0, harmony: 0, is_my_interior: 0 },
          isFavorite: savedImage.isFavorite || false,
          createdAt: savedImage.createdAt || Date.now(),
        };
      });
      
      // Restore all images to array
      setGeneratedImages(restoredImages);
      
      // Set the first image as current
      const savedImage = fastSavedOnly[0];
      if (savedImage && savedImage.url) {
        setGeneratedImage(restoredImages[0]);
        
        // Restore ratings state if ratings exist
        if (savedImage.ratings) {
          if (savedImage.ratings.is_my_interior > 0) {
            setHasAnsweredInteriorQuestion(true);
          }
          if (savedImage.ratings.harmony > 0) {
            setHasCompletedRatings(true);
          }
        }
        
        // Restore generation history if available (align with fast-gen rows only)
        const savedGenerations = (typedSessionData?.generations || []).filter((g: any) =>
          g?.id?.startsWith('fast-gen'),
        );
        if (savedGenerations.length > 0) {
          const history = restoredImages.map((img, idx) => {
            const gen = savedGenerations[idx];
            return {
              id: img.id,
              type: (gen?.type || 'initial') as 'initial' | 'micro' | 'macro',
              label: gen?.type === 'initial' ? 'Początkowa generacja' : gen?.modification || 'Modyfikacja',
              timestamp: img.createdAt,
              imageUrl: img.url,
            };
          });
          setGenerationHistory(history);
          const uploadUrl = buildRoomUploadDataUrlFromSession(typedSessionData);
          setCurrentHistoryIndex(
            uploadUrl ? history.length : Math.max(0, history.length - 1),
          );
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSessionInitialized, sessionData, isGenerating, generatedImage]);

  // Abort only when truly leaving fast-generate (not React Strict Mode fake unmount on same route)
  useEffect(() => {
    return () => {
      const path = typeof window !== 'undefined' ? window.location.pathname : '';
      const stillOnFastGenerate = path.includes('/flow/fast-generate');
      if (stillOnFastGenerate) return;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    };
  }, []);

  const handleCustomModification = async () => {
    const trimmed = customModificationText.trim();
    if (!trimmed || !generatedImage || isGenerating) return;

    const customMod: ModificationOption = {
      id: 'custom_text',
      label: { pl: trimmed, en: trimmed },
      icon: null,
      category: 'micro',
    };
    const currentStyle =
      (sessionData as any)?.visualDNA?.dominantStyle || 'modern';
    const modificationPrompt = `SYSTEM INSTRUCTION: Image-to-image modification. KEEP: walls, windows, doors, furniture layout, camera angle - IDENTICAL. CHANGE: ${trimmed}. Apply this change while maintaining exact furniture positions and room structure where possible. Make sure the change looks natural in ${currentStyle} style.`;

    await handleModification(customMod, modificationPrompt, trimmed);
    setCustomModificationText('');
  };

  // Handle modification
  const handleModification = async (
    modification: ModificationOption,
    customPrompt?: string,
    userInstructionForLog?: string,
  ) => {
    if (isGenerating) return;

    const isMacro = modification.category === 'macro';
    const isCustomModification =
      Boolean(customPrompt) || modification.id === 'custom_text';

    let baseForModification: GeneratedImage | null = null;
    const resolved = resolveSelectedGeneratedImageForModification();
    if (resolved) {
      baseForModification = resolved;
    } else if (roomUploadPreviewUrl && currentHistoryIndex === 0) {
      setError(
        language === 'pl'
          ? 'Wybierz w historii wygenerowany obraz (nie zdjęcie z uploadu), aby go zmodyfikować.'
          : 'Pick a generated thumbnail in history (not the uploaded photo) to modify it.',
      );
      return;
    } else {
      baseForModification = generatedImage;
      if (!baseForModification) {
        setError(
          language === 'pl'
            ? 'Brak obrazu do modyfikacji.'
            : 'No image available to modify.',
        );
        return;
      }
    }

    const uh = (sessionData as { userHash?: string } | null)?.userHash;
    if (uh) {
      try {
        const credit = await checkCreditsWithAction(uh, 10, 'regenerate');
        if (!credit.allowed) {
          if (credit.code === 429) {
            setLoginGateMode('hard');
            setLoginWallOpen(true);
          } else {
            setError(
              isAuthenticated
                ? 'Nie masz wystarczającej liczby kredytów na modyfikację.'
                : 'Zaloguj się, aby modyfikować obraz (wymagane konto).',
            );
          }
          return;
        }
      } catch (e) {
        console.warn('[Fast Generate] credit check (regenerate):', e);
      }
    }

    setIsGenerating(true);
    setError(null);
    setLoadingStage(2);
    setLoadingProgress(30);
    setStatusMessage(
      language === 'pl'
        ? `Modyfikuję: ${modification.label.pl}...`
        : `Modifying: ${modification.label.en}...`,
    );
    setEstimatedTime(60);

    const baseParams = getGenerationParameters(isMacro ? 'macro' : 'micro', generationCount);
    const srcDims = fastTrackSourceGenerationDimsRef.current;
    const prev = baseForModification.parameters as {
      width?: number;
      height?: number;
      aspect_ratio?: string;
      style?: string;
    };
    const dimPack =
      srcDims != null
        ? {
            width: srcDims.normalizedWidth,
            height: srcDims.normalizedHeight,
            aspect_ratio: srcDims.aspectRatio,
          }
        : typeof prev?.width === 'number' && typeof prev?.height === 'number'
          ? {
              width: prev.width,
              height: prev.height,
              ...(prev.aspect_ratio ? { aspect_ratio: prev.aspect_ratio } : {}),
            }
          : {};

    const currentStyle = (sessionData as any)?.visualDNA?.dominantStyle || 'modern';
    const parameters = {
      ...baseParams,
      ...dimPack,
      strength: baseParams.strength ?? (isMacro ? 0.75 : 0.25),
      style: isMacro ? modification.id : (prev?.style || currentStyle),
    };

    try {
      const modificationPrompt = customPrompt
        ? customPrompt
        : isMacro
          ? buildFastMacroModificationPrompt(modification)
          : buildFastMicroModificationPrompt(modification, currentStyle);

      const baseImageSource = extractBase64FromGenerated(baseForModification);
      if (!baseImageSource) {
        setError(
          language === 'pl'
            ? 'Brak danych obrazu. Wybierz ponownie miniaturę w historii.'
            : 'Missing image data. Select a thumbnail in history again.',
        );
        return;
      }

      const response = await generateSixImagesParallelWithGoogle({
        prompts: [{ source: 'implicit' as GenerationSource, prompt: modificationPrompt }],
        base_image: baseImageSource,
        style: isMacro ? modification.id : (baseForModification.parameters?.style || currentStyle),
        parameters,
      });

      if (!response || !response.results || response.results.length === 0) {
        console.error('[FastGenerate] Empty response for modification:', response);
        setError(
          language === 'pl'
            ? 'Nie udało się zmodyfikować obrazu. Spróbuj inną modyfikację lub wygeneruj nowy obraz.'
            : 'Failed to modify the image. Try another modification or generate a new image.',
        );
        return;
      }

      const successfulResult = response.results.find((r: any) => r.success && r.image) ?? response.results[0];
      if (!successfulResult?.image) {
        console.error('[FastGenerate] No successful image in modification response:', response.results);
        setError(
          language === 'pl'
            ? 'Nie udało się zmodyfikować obrazu. Wszystkie próby zakończyły się niepowodzeniem.'
            : 'Failed to modify the image. All attempts failed.',
        );
        return;
      }

      const result = successfulResult;
      const newImage: GeneratedImage = {
        id: `mod-fast-${generationCount}-0`,
        url: `data:image/png;base64,${result.image}`,
        base64: result.image,
        prompt: modificationPrompt,
        parameters: {
          ...parameters,
          modificationType: isMacro ? 'macro' : 'micro',
          modifications: [language === 'pl' ? modification.label.pl : modification.label.en],
          iterationCount: generationCount,
        },
        ratings: { aesthetic_match: 0, character: 0, harmony: 0, is_my_interior: 0 },
        isFavorite: false,
        createdAt: Date.now(),
        provider: 'google'
      };

      setGeneratedImage(newImage);
      setGeneratedImages((prev) => [...prev, newImage]); // Add to array
      setShowOriginalRoomPhoto(false);
      setGenerationCount((prev) => prev + 1);
      setShowModifications(false);
      // Don't reset ratings after modification - user already answered
      // setHasAnsweredInteriorQuestion(false);
      // setHasCompletedRatings(false);
      setLoadingProgress(100);
      setStatusMessage(
        language === 'pl' ? 'Modyfikacja zakończona!' : 'Modification completed!',
      );
      setEstimatedTime(0);

      // Add to history
      const historyNode = {
        id: newImage.id,
        type: isMacro ? ('macro' as const) : ('micro' as const),
        label: language === 'pl' ? modification.label.pl : modification.label.en,
        timestamp: Date.now(),
        imageUrl: newImage.url,
      };
      setGenerationHistory((prev) => {
        const next = [...prev, historyNode];
        const uploadUrl = buildRoomUploadDataUrlFromSession(
          getSessionStoreSnapshot() as any,
        );
        const slot = uploadUrl ? 1 : 0;
        setCurrentHistoryIndex(slot + next.length - 1);
        return next;
      });

      const fastModLog = buildModificationPromptLogEntry({
        modification,
        modificationPrompt,
        source: isCustomModification ? 'custom' : 'preset',
        userInstruction: userInstructionForLog?.trim() || undefined,
      });
      const snap = getSessionStoreSnapshot();
      const typedSessionData = sessionData as any;
      const persistUserHash = typedSessionData?.userHash as string | undefined;

      let sessionPatch: Record<string, unknown> = {
        modificationPromptLog: appendModificationPromptLog(snap.modificationPromptLog, fastModLog),
      };

      if (persistUserHash) {
        try {
          const modSpaceId = await getOrCreateSpaceId(persistUserHash, {
            spaceId: typedSessionData?.currentSpaceId,
            name: typedSessionData?.roomName || 'Moja Przestrzeń',
          });
          if (modSpaceId) {
            const saveModResult = await saveParticipantImages(persistUserHash, [
              {
                url: newImage.url,
                type: 'generated',
                is_favorite: false,
                space_id: modSpaceId,
              },
            ]);
            const persistedUrl =
              saveModResult.details[0]?.publicUrl || newImage.url;
            sessionPatch = {
              ...sessionPatch,
              spaces: addGeneratedImageToSpace(
                typedSessionData?.spaces || [],
                modSpaceId,
                persistedUrl,
              ),
              currentSpaceId: modSpaceId,
            };
          }
        } catch (persistErr) {
          console.warn(
            '[Fast Generate] Failed to persist modification to participant spaces:',
            persistErr,
          );
        }
      }

      await updateSessionData(sessionPatch as any);

      void saveSessionToGcp(getSessionStoreSnapshot());

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
            modification: language === 'pl' ? modification.label.pl : modification.label.en,
            parameters,
            path_type: 'fast',
            ...(isCustomModification ? { source: 'custom' as const } : {}),
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

  const handleRemoveFurniture = async () => {
    if (isGenerating) return;

    if (!hasAnsweredInteriorQuestion) {
      setError(
        language === 'pl'
          ? "Najpierw odpowiedz na pytanie 'Czy to moje wnętrze?' przed usunięciem mebli."
          : "Please answer the question 'Is this my interior?' before removing furniture.",
      );
      return;
    }

    let baseForRemoval: GeneratedImage | null =
      resolveSelectedGeneratedImageForModification();
    if (!baseForRemoval) {
      if (roomUploadPreviewUrl && currentHistoryIndex === 0) {
        setError(
          language === 'pl'
            ? 'Wybierz w historii wygenerowany obraz (nie zdjęcie z uploadu).'
            : 'Pick a generated thumbnail in history (not the uploaded photo).',
        );
        return;
      }
      baseForRemoval = generatedImage;
    }
    if (!baseForRemoval) {
      setError(
        language === 'pl'
          ? 'Brak obrazu do przetworzenia.'
          : 'No image to process.',
      );
      return;
    }

    const baseImageForRemoval = extractBase64FromGenerated(baseForRemoval);
    if (!baseImageForRemoval) {
      setError(
        language === 'pl'
          ? 'Brak danych obrazu. Wybierz ponownie miniaturę w historii.'
          : 'No image data. Select a thumbnail in history again.',
      );
      return;
    }

    const uh = (sessionData as { userHash?: string } | null)?.userHash;
    if (uh) {
      try {
        const credit = await checkCreditsWithAction(uh, 10, 'regenerate');
        if (!credit.allowed) {
          if (credit.code === 429) {
            setLoginGateMode('hard');
            setLoginWallOpen(true);
          } else {
            setError(
              isAuthenticated
                ? 'Nie masz wystarczającej liczby kredytów na tę operację.'
                : 'Zaloguj się, aby kontynuować (wymagane konto).',
            );
          }
          return;
        }
      } catch (e) {
        console.warn('[Fast Generate] credit check (remove furniture):', e);
      }
    }

    const removeFurniturePrompt = JSON.stringify({
      instruction:
        'EMPTY ARCHITECTURAL SHELL: Remove ALL furniture, rugs, curtains, and decorations. Keep only the structural elements of the room.',
      preserve: [
        'walls - EXACTLY the same',
        'windows - EXACTLY the same',
        'doors - EXACTLY the same',
        'ceiling - EXACTLY the same',
        'floor - EXACTLY the same',
        'camera perspective and framing - DO NOT CHANGE',
      ],
      remove: [
        'ALL furniture and seating',
        'ALL rugs and carpets',
        'ALL curtains and window treatments',
        'ALL decorations and accessories',
        'ALL lighting fixtures',
      ],
      style: 'Clean empty room',
      redesign_process:
        'STEP 1: Keep room structure 100% unchanged. STEP 2: Erase everything else to create an empty space.',
    });

    setIsGenerating(true);
    setError(null);
    setLoadingStage(2);
    setLoadingProgress(30);
    setStatusMessage(
      language === 'pl' ? 'Usuwam meble (AI)...' : 'Removing furniture (AI)...',
    );
    setEstimatedTime(25);
    setShowModifications(false);

    try {
      const baseMicro = getGenerationParameters('micro', generationCount);
      let removeParams = {
        ...baseMicro,
        strength: 0.3,
      };
      const srcDims = fastTrackSourceGenerationDimsRef.current;
      if (srcDims) {
        removeParams = {
          ...baseMicro,
          width: srcDims.normalizedWidth,
          height: srcDims.normalizedHeight,
          aspect_ratio: srcDims.aspectRatio,
          strength: 0.3,
        };
      } else {
        try {
          const cleanRm =
            typeof baseImageForRemoval === 'string' &&
            baseImageForRemoval.includes(',')
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
          console.warn('[Fast Generate/remove] dimension prep failed', e);
        }
      }

      const removeRunId = `remove-fast-${Date.now()}-${Math.random().toString(36).substring(7)}`;

      const response = await generateSixImagesParallelWithGoogle({
        prompts: [
          { source: 'implicit' as GenerationSource, prompt: removeFurniturePrompt },
        ],
        base_image: baseImageForRemoval,
        style: 'empty',
        parameters: removeParams,
        generation_run_id: removeRunId,
      });

      if (
        !response ||
        !response.results ||
        response.results.length === 0 ||
        !response.results[0]?.image
      ) {
        const errorMessage = response?.results?.[0]?.error || '';
        const isRateLimit =
          errorMessage.includes('429') ||
          errorMessage.includes('RESOURCE_EXHAUSTED') ||
          errorMessage.includes('rate limit');
        if (isRateLimit) {
          setError(
            language === 'pl'
              ? 'Osiągnięto limit API. Poczekaj 1–2 minuty i spróbuj ponownie.'
              : 'API rate limit reached. Wait 1–2 minutes and try again.',
          );
        } else {
          setError(
            language === 'pl'
              ? 'Nie udało się usunąć mebli. Spróbuj ponownie.'
              : 'Failed to remove furniture. Please try again.',
          );
        }
        return;
      }

      const result = response.results[0];
      const newId = `remove-fast-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      const newImage: GeneratedImage = {
        id: newId,
        url: `data:image/png;base64,${result.image}`,
        base64: result.image,
        prompt: removeFurniturePrompt,
        provider: 'google',
        parameters: {
          modificationType: 'remove_furniture',
          modifications: ['remove_furniture'],
          iterationCount: generationCount,
          usedOriginal: false,
        },
        ratings: {
          aesthetic_match: 0,
          character: 0,
          harmony: 0,
          is_my_interior: 0,
        },
        isFavorite: false,
        createdAt: Date.now(),
      };

      setGeneratedImage(newImage);
      setGeneratedImages((prev) => [...prev, newImage]);
      setGenerationCount((prev) => prev + 1);
      setShowOriginalRoomPhoto(false);

      setHasAnsweredInteriorQuestion(false);
      setHasCompletedRatings(false);

      setLoadingProgress(100);
      setStatusMessage(
        language === 'pl' ? 'Meble zostały usunięte!' : 'Furniture has been removed!',
      );
      setEstimatedTime(0);

      const historyNode = {
        id: newImage.id,
        type: 'micro' as const,
        label:
          language === 'pl' ? 'Usunięto meble' : 'Furniture removed',
        timestamp: Date.now(),
        imageUrl: newImage.url,
      };
      setGenerationHistory((prev) => {
        const next = [...prev, historyNode];
        const uploadUrl = buildRoomUploadDataUrlFromSession(
          getSessionStoreSnapshot() as any,
        );
        const slot = uploadUrl ? 1 : 0;
        setCurrentHistoryIndex(slot + next.length - 1);
        return next;
      });

      const removeModOption: ModificationOption = {
        id: 'remove_furniture',
        label: {
          pl: 'Usunięto meble',
          en: 'Furniture removed',
        },
        icon: null,
        category: 'micro',
      };
      const snap = getSessionStoreSnapshot();
      const typedSessionData = sessionData as any;
      const persistUserHash = typedSessionData?.userHash as string | undefined;

      const prevImgs = Array.isArray(snap.generatedImages)
        ? snap.generatedImages
        : [];
      const prevGens = Array.isArray(snap.generations)
        ? snap.generations
        : [];

      let sessionPatch: Record<string, unknown> = {
        modificationPromptLog: appendModificationPromptLog(
          snap.modificationPromptLog,
          buildModificationPromptLogEntry({
            modification: removeModOption,
            modificationPrompt: removeFurniturePrompt,
            source: 'preset',
          }),
        ),
        generatedImages: [
          ...prevImgs,
          { id: newImage.id, url: newImage.url },
        ],
        generations: [
          ...prevGens,
          {
            id: newImage.id,
            prompt: removeFurniturePrompt,
            images: 1,
            timestamp: Date.now(),
            type: 'remove_furniture',
            modification:
              language === 'pl' ? 'Usunięto meble' : 'Furniture removed',
          },
        ],
      };

      if (persistUserHash) {
        try {
          const modSpaceId = await getOrCreateSpaceId(persistUserHash, {
            spaceId: typedSessionData?.currentSpaceId,
            name: typedSessionData?.roomName || 'Moja Przestrzeń',
          });
          if (modSpaceId) {
            const saveModResult = await saveParticipantImages(persistUserHash, [
              {
                url: newImage.url,
                type: 'generated',
                is_favorite: false,
                space_id: modSpaceId,
              },
            ]);
            const persistedUrl =
              saveModResult.details[0]?.publicUrl || newImage.url;
            sessionPatch = {
              ...sessionPatch,
              spaces: addGeneratedImageToSpace(
                typedSessionData?.spaces || [],
                modSpaceId,
                persistedUrl,
              ),
              currentSpaceId: modSpaceId,
            };
          }
        } catch (persistErr) {
          console.warn(
            '[Fast Generate] Failed to persist remove-furniture image:',
            persistErr,
          );
        }
      }

      await updateSessionData(sessionPatch as any);
      void saveSessionToGcp(getSessionStoreSnapshot());

      try {
        const projectId = await getOrCreateProjectId(
          (sessionData as any).userHash,
        );
        if (projectId) {
          await logBehavioralEvent(projectId, 'generation_modification', {
            type: 'remove_furniture',
            modification:
              language === 'pl' ? 'Usunięto meble' : 'Furniture removed',
            parameters: removeParams,
            path_type: 'fast',
          });
        }
      } catch (e) {
        console.warn('Supabase persist failed:', e);
      }
    } catch (err: unknown) {
      console.error('Remove furniture failed:', err);
      const msg = err instanceof Error ? err.message : String(err);
      const isRateLimit =
        msg.includes('429') ||
        msg.includes('RESOURCE_EXHAUSTED') ||
        msg.includes('rate limit');
      if (isRateLimit) {
        setError(
          language === 'pl'
            ? 'Osiągnięto limit API. Poczekaj 1–2 minuty i spróbuj ponownie.'
            : 'API rate limit reached. Wait 1–2 minutes and try again.',
        );
      } else {
        setError(
          language === 'pl'
            ? 'Wystąpił błąd podczas usuwania mebli.'
            : 'An error occurred while removing furniture.',
        );
      }
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

  const handleShowOriginal = () => {
    let roomImage = (sessionData as { roomImage?: string })?.roomImage;

    if (!roomImage && typeof window !== 'undefined') {
      try {
        const sessionRoomImage = safeSessionStorage.getItem('aura_session_room_image');
        if (sessionRoomImage) {
          roomImage = sessionRoomImage;
        }
      } catch (e) {
        console.warn('[Fast Generate][Show Original] sessionStorage read failed', e);
      }
    }

    if (!roomImage) {
      setError(
        language === 'pl'
          ? 'Nie znaleziono oryginalnego zdjęcia z uploadu. Wróć do kroku ze zdjęciem pokoju.'
          : 'Original photo from room setup not found. Please return to the photo upload step.',
      );
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
    setError(null);
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
          {/* Error — top + sticky so user always sees it (not buried below image/history) */}
          {error && (
            <div className="sticky top-2 z-[70]" role="alert" aria-live="polite">
              <GlassCard className="p-4 sm:p-6 bg-red-500/15 border-red-400/40 shadow-lg ring-1 ring-red-400/20">
                <p className="text-red-700 dark:text-red-400 font-modern text-sm sm:text-base leading-snug">
                  {error}
                </p>
              </GlassCard>
            </div>
          )}

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
                <GlassCard variant="flatOnMobile" className="p-6">
                  <div className="space-y-4">
                    <div className="relative w-full rounded-lg overflow-hidden bg-graphite/10">
                      <IntrinsicContainImage
                        src={
                          showOriginalRoomPhoto && originalRoomPhotoUrl
                            ? originalRoomPhotoUrl
                            : generatedImage.url
                        }
                        alt={
                          showOriginalRoomPhoto && originalRoomPhotoUrl
                            ? language === 'pl'
                              ? 'Oryginalne zdjęcie pokoju'
                              : 'Original room photo'
                            : language === 'pl'
                              ? 'Wygenerowane wnętrze'
                              : 'Generated interior'
                        }
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
                            <h4 className="font-semibold text-graphite text-lg">
                              {language === 'pl' ? 'Czy to Twoje wnętrze?' : 'Is this your interior?'}
                            </h4>
                            <div className="border-b border-gray-200/50 pb-4 last:border-b-0">
                              <div className="flex items-center justify-between text-xs text-silver-dark mb-3 font-modern">
                                <span>{language === 'pl' ? 'To nie moje wnętrze (1)' : 'Not my interior (1)'}</span>
                                <span>{language === 'pl' ? 'To moje wnętrze (5)' : 'This is my interior (5)'}</span>
                              </div>

                              <GlassScalePicker
                                min={1}
                                max={5}
                                value={(generatedImage.ratings as any).is_my_interior || 3}
                                onChange={(value) => {
                                  handleImageRating(generatedImage.id, 'is_my_interior', value);
                                  setTimeout(() => {
                                    setHasAnsweredInteriorQuestion(true);
                                  }, 800);
                                }}
                                className="mb-2"
                                highlightResetKey={generatedImage.id}
                                ariaLabel={
                                  language === 'pl'
                                    ? 'Skala: czy to Twoje wnętrze (1–5)'
                                    : 'Scale: is this your interior (1–5)'
                                }
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
                                <span>{right} (5)</span>
                              </div>

                              <GlassScalePicker
                                min={1}
                                max={5}
                                value={(generatedImage.ratings as any)[key] || 3}
                                onChange={(value) => handleImageRating(generatedImage.id, key as any, value)}
                                className="mb-2"
                                highlightResetKey={`${generatedImage.id}-${String(key)}`}
                                ariaLabel={
                                  language === 'pl'
                                    ? 'Skala zgodności z gustem (1–5)'
                                    : 'Taste match scale (1–5)'
                                }
                              />
                            </div>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Modification + remove furniture + original photo — parity with full flow */}
                    {hasCompletedRatings && (
                      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                        <GlassButton
                          type="button"
                          onClick={() => setShowModifications(!showModifications)}
                          variant="secondary"
                          className="w-full sm:flex-1 h-12 text-xs sm:text-sm"
                          disabled={isGenerating}
                        >
                          <Settings size={16} className="mr-2 flex-shrink-0" aria-hidden="true" />
                          <span className="truncate">
                            {showModifications
                              ? language === 'pl'
                                ? 'Ukryj modyfikacje'
                                : 'Hide modifications'
                              : language === 'pl'
                                ? 'Modyfikuj obrazek'
                                : 'Modify image'}
                          </span>
                        </GlassButton>

                        <GlassButton
                          type="button"
                          variant="secondary"
                          className="w-full sm:flex-1 h-12 text-xs sm:text-sm"
                          disabled={isGenerating}
                          onClick={() => void handleRemoveFurniture()}
                        >
                          <Home size={16} className="mr-2 flex-shrink-0" aria-hidden="true" />
                          <span className="truncate">
                            {language === 'pl' ? 'Usuń meble' : 'Remove furniture'}
                          </span>
                        </GlassButton>

                        <GlassButton
                          type="button"
                          variant="secondary"
                          className="w-full sm:flex-1 h-12 text-xs sm:text-sm"
                          disabled={isGenerating}
                          onClick={() => {
                            if (showOriginalRoomPhoto) {
                              setShowOriginalRoomPhoto(false);
                            } else {
                              handleShowOriginal();
                            }
                          }}
                        >
                          <Eye size={16} className="mr-2 flex-shrink-0" aria-hidden="true" />
                          <span className="truncate">
                            {showOriginalRoomPhoto
                              ? language === 'pl'
                                ? 'Pokaż wygenerowane'
                                : 'Show generated'
                              : language === 'pl'
                                ? 'Pokaż oryginalne'
                                : 'Show original'}
                          </span>
                        </GlassButton>
                      </div>
                    )}

                    {/* Modifications Panel */}
                    <AnimatePresence>
                      {showModifications && hasCompletedRatings && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                        >
                          <GlassCard variant="flatOnMobile" className="p-6">
                            <div className="space-y-6">
                              <div>
                                <h4 className="font-semibold text-graphite mb-4 flex items-center text-lg">
                                  <Settings size={20} className="mr-3" />
                                  {language === 'pl' ? 'Drobne modyfikacje' : 'Minor modifications'}
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
                                      {language === 'pl' ? mod.label.pl : mod.label.en}
                                    </GlassButton>
                                  ))}
                                </div>
                              </div>

                              <div>
                                <h4 className="font-semibold text-graphite mb-4 flex items-center text-lg">
                                  <RefreshCw size={20} className="mr-3" />
                                  {language === 'pl' ? 'Zupełnie inny kierunek' : 'Completely new direction'}
                                </h4>
                                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 max-h-[min(60vh,560px)] overflow-y-auto overscroll-contain pr-1">
                                  {MACRO_MODIFICATIONS.map((mod) => (
                                    <GlassButton
                                      key={mod.id}
                                      onClick={() => handleModification(mod)}
                                      variant="secondary"
                                      size="sm"
                                      disabled={isGenerating}
                                    >
                                      {language === 'pl' ? mod.label.pl : mod.label.en}
                                    </GlassButton>
                                  ))}
                                </div>
                              </div>

                              <div className="mt-8 pt-8 border-t border-white/20">
                                <h4 className="font-semibold text-graphite mb-4 flex items-center text-lg">
                                  <MessageSquare
                                    size={20}
                                    className="mr-3 text-gold flex-shrink-0"
                                    aria-hidden="true"
                                  />
                                  {language === 'pl'
                                    ? 'Własna modyfikacja'
                                    : 'Custom modification'}
                                </h4>
                                <p className="text-sm text-silver-dark mb-4 font-modern">
                                  {language === 'pl'
                                    ? 'Opisz, co dokładnie chcesz zmienić na obrazie'
                                    : 'Describe exactly what you want to change in the image'}
                                </p>
                                <div className="flex flex-col sm:flex-row gap-3">
                                  <input
                                    type="text"
                                    value={customModificationText}
                                    onChange={(e) =>
                                      setCustomModificationText(e.target.value)
                                    }
                                    placeholder={
                                      language === 'pl'
                                        ? 'np. dodaj rośliny doniczkowe, zmień kolor zasłon na granatowy...'
                                        : 'e.g. add potted plants, change curtain color to navy blue...'
                                    }
                                    className="flex-1 bg-white/40 backdrop-blur-md border border-white/60 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-gold/40 placeholder:text-silver-dark/50 text-graphite transition-all hover:bg-white/50 font-modern"
                                    onKeyDown={(e) => {
                                      if (
                                        e.key === 'Enter' &&
                                        customModificationText.trim()
                                      ) {
                                        void handleCustomModification();
                                      }
                                    }}
                                    disabled={isGenerating}
                                  />
                                  <GlassButton
                                    type="button"
                                    onClick={() => void handleCustomModification()}
                                    disabled={
                                      isGenerating || !customModificationText.trim()
                                    }
                                    className="px-8 shrink-0"
                                  >
                                    {language === 'pl' ? 'Zmień' : 'Change'}
                                  </GlassButton>
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
                        history={historyForDisplay}
                        currentIndex={currentHistoryIndex}
                        onNodeClick={(index) => {
                          const uploadFirst = !!roomUploadPreviewUrl;
                          if (uploadFirst && index === 0) {
                            handleShowOriginal();
                            setCurrentHistoryIndex(0);
                            return;
                          }
                          const ghIndex = uploadFirst ? index - 1 : index;
                          const historyItem = generationHistory[ghIndex];
                          if (historyItem) {
                            const image = generatedImages.find(
                              (img) => img.id === historyItem.id,
                            );
                            if (image) {
                              setGeneratedImage(image);
                              setCurrentHistoryIndex(index);
                              setShowOriginalRoomPhoto(false);
                            }
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

      <LoginModal
        isOpen={loginWallOpen}
        onClose={() => setLoginWallOpen(false)}
        gateMode={loginGateMode}
        nudgeLocation="fast_generate"
        nudgeReason="login_required"
        onNudgeEvent={runCreditsFunnelEvent}
        title={{ pl: 'Dokończ obraz', en: 'Finish your image' }}
        message={
          language === 'pl'
            ? `Zaloguj się — ${String(FREE_GRANT_CREDITS)} darmowych kredytów na start i zapis zmian.`
            : `Sign in for ${String(FREE_GRANT_CREDITS)} free starter credits and to save your edits.`
        }
        redirectPath="/flow/fast-generate"
      />

      <LoginModal
        isOpen={saveProfileNudgeOpen}
        onClose={() => {
          if (typeof window !== 'undefined') {
            sessionStorage.setItem(IDA_FAST_TRACK_SAVE_PROFILE_NUDGE_DISMISSED_KEY, '1');
          }
          setSaveProfileNudgeOpen(false);
        }}
        gateMode="soft"
        nudgeLocation="fast_generate_post_first_image"
        nudgeReason="login_required"
        onMaybeLater={() => {
          if (typeof window !== 'undefined') {
            sessionStorage.setItem(IDA_FAST_TRACK_SAVE_PROFILE_NUDGE_DISMISSED_KEY, '1');
          }
          setSaveProfileNudgeOpen(false);
        }}
        onNudgeEvent={(ev) => {
          const uid = (sessionData as { userHash?: string } | null)?.userHash;
          if (!uid) return;
          void logBehavioralEvent(uid, 'login_nudge', {
            path: 'fast-generate',
            phase: 'post_first_image',
            nudge: ev,
          });
        }}
        title={{ pl: 'Zapisz na koncie', en: 'Save to your account' }}
        message={
          language === 'pl'
            ? `${String(FREE_GRANT_CREDITS)} kredytów na start po zalogowaniu i zapis pracy — nic nie zginie. Możesz też iść dalej bez konta.`
            : `${String(FREE_GRANT_CREDITS)} starter credits when you sign in, plus saved work—or continue without an account.`
        }
        redirectPath="/flow/fast-generate"
        softMaybeLaterLabel={{ pl: 'Kontynuuj bez konta', en: 'Continue without account' }}
      />
    </div>
  );
}

