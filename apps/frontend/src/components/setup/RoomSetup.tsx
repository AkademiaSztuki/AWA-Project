"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';
import { GlassSlider } from '@/components/ui/GlassSlider';
import { AwaDialogue } from '@/components/awa/AwaDialogue';
import { MoodGrid } from '@/components/research';
import { ACTIVITY_QUESTIONS, PAIN_POINTS } from '@/lib/questions/adaptive-questions';
import { ArrowRight, ArrowLeft, Camera, Activity, AlertCircle, Target, X, Heart, Sparkles } from 'lucide-react';
import Image from 'next/image';
import { useModalAPI } from '@/hooks/useModalAPI';
import { saveRoom } from '@/lib/supabase-deep-personalization';
import { useSession, useSessionData } from '@/hooks';
import { saveParticipantImages } from '@/lib/remote-spaces';
import { supabase } from '@/lib/supabase';
import { useGoogleAI, getGenerationParameters } from '@/hooks/useGoogleAI';
import { GenerationSource } from '@/lib/prompt-synthesis/modes';
import { SessionData } from '@/types';
import { RoomPreferencePayload, RoomActivity } from '@/types/deep-personalization';
import { fileToNormalizedBase64 } from '@/lib/utils';
import { COLOR_PALETTE_OPTIONS, getPaletteLabel } from '@/components/setup/paletteOptions';
import { STYLE_OPTIONS, getStyleLabel } from '@/lib/questions/style-options';
import { SensoryTestSuite } from '@/components/research/SensoryTests';
import {
  SEMANTIC_DIFFERENTIAL_DIMENSIONS,
  MUSIC_PREFERENCES,
  TEXTURE_PREFERENCES,
  LIGHT_PREFERENCES
} from '@/lib/questions/validated-scales';
import { mapActivitiesToRecommendations } from '@/lib/preferences/activity-mapping';

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
  const { language } = useLanguage();
  const { sessionData, updateSessionData } = useSessionData();
  
  const [currentStep, setCurrentStep] = useState<SetupStep>('photo_upload');
  const [roomData, setRoomData] = useState<RoomData>({
    name: '',
    roomType: '',
    usageType: 'solo',
    painPoints: [],
    activities: []
  });
  const [isSaving, setIsSaving] = useState(false);

  // #region agent log
  const prevStepRef = useRef<string | null>(null);
  useEffect(() => {
    const prev = prevStepRef.current;
    prevStepRef.current = currentStep;
    void fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'pre-fix',hypothesisId:'H5',location:'RoomSetup.tsx:step-change',message:'RoomSetup step changed',data:{prevStep:prev,nextStep:currentStep,language},timestamp:Date.now()})}).catch(()=>{});
  }, [currentStep, language]);

  const prevRoomAnalysisSigRef = useRef<string | null>(null);
  useEffect(() => {
    const ra = (sessionData as any)?.roomAnalysis;
    const sigObj = {
      hasRA: !!ra,
      humanLen: ra?.human_comment?.length || 0,
      commentLen: ra?.comment?.length || 0,
      descLen: ra?.room_description?.length || 0,
      detected: ra?.detected_room_type || null,
      hasEmpty: !!(sessionData as any)?.roomImageEmpty
    };
    const sig = JSON.stringify(sigObj);
    if (sig !== prevRoomAnalysisSigRef.current) {
      prevRoomAnalysisSigRef.current = sig;
      void fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'pre-fix',hypothesisId:'H6',location:'RoomSetup.tsx:roomAnalysis-sig',message:'roomAnalysis/customMessage inputs changed',data:{sig:sigObj,currentStep},timestamp:Date.now()})}).catch(()=>{});
    }
  }, [sessionData, currentStep]);
  // #endregion

  const shouldShowPreferenceQuestions = roomData.preferenceSource === 'complete';
  const steps = useMemo(
    () =>
      shouldShowPreferenceQuestions
        ? BASE_STEPS
        : BASE_STEPS.filter((step) => step !== 'preference_questions'),
    [shouldShowPreferenceQuestions]
  );

  const currentStepIndex = Math.max(0, steps.indexOf(currentStep));
  const progress = ((currentStepIndex + 1) / steps.length) * 100;

  const handleNext = () => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < steps.length) {
      setCurrentStep(steps[nextIndex]);
    }
  };

  const handleBack = () => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setCurrentStep(steps[prevIndex]);
    } else {
      router.push('/dashboard');
    }
  };

  const handleComplete = async () => {
    setIsSaving(true);
    try {
      console.log('[RoomSetup] Saving room:', roomData);
      console.log('[RoomSetup] Household ID:', householdId);

      const activityContext =
        roomData.preferenceSource === 'complete' && (roomData.activities?.length || 0) > 0
          ? mapActivitiesToRecommendations(roomData.activities)
          : undefined;
      
      // Try to save to Supabase, but don't block if it fails
      try {
        const savedRoom = await saveRoom({
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
        });
        
        if (savedRoom) {
          console.log('[RoomSetup] Room saved with ID:', savedRoom.id);
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
        (language === 'pl' ? 'Nowa przestrzeń' : 'New Space');

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

      await updateSessionData({
        roomType: roomData.roomType,
        roomName: roomData.name,
        roomUsageType: roomData.usageType,
        roomPainPoints: roomData.painPoints,
        roomActivities: roomData.activities,
        roomPreferenceSource: roomData.preferenceSource,
        roomPreferences: roomData.explicitPreferences,
        roomActivityContext: activityContext,
        roomImage: roomImageBase64, // Use converted base64, not blob URL
        prsCurrent: roomData.prsCurrent,
        prsTarget: roomData.prsTarget,
        currentSpaceId: targetSpaceId,
        spaces: updatedSpaces
      });
      
      // Save room photos to participant_images
      try {
        const userHash = (sessionData as any)?.userHash;
        // #region agent log
        void fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'RoomSetup.tsx:handleComplete',message:'Saving room photo to participant_images',data:{userHash,hasRoomImage:!!roomImageBase64,roomImageLength:roomImageBase64?.length||0},timestamp:Date.now(),sessionId:'debug-session',runId:'flow-debug',hypothesisId:'H10'})}).catch(()=>{});
        // #endregion
        if (userHash && roomImageBase64) {
          // Convert base64 to data URL for saveParticipantImages
          const dataUrl = `data:image/jpeg;base64,${roomImageBase64}`;
          await saveParticipantImages(userHash, [{
            url: dataUrl,
            type: 'room_photo',
            is_favorite: false
          }]);
          // #region agent log
          void fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'RoomSetup.tsx:handleComplete-complete',message:'Room photo saved successfully',data:{userHash},timestamp:Date.now(),sessionId:'debug-session',runId:'flow-debug',hypothesisId:'H10'})}).catch(()=>{});
          // #endregion
        }
      } catch (e) {
        // #region agent log
        void fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'RoomSetup.tsx:handleComplete-error',message:'Error saving room photo',data:{error:e instanceof Error?e.message:String(e)},timestamp:Date.now(),sessionId:'debug-session',runId:'flow-debug',hypothesisId:'H10'})}).catch(()=>{});
        // #endregion
        console.warn('[RoomSetup] Failed to save room photo to participant_images:', e);
      }
      
      // Navigate to generate flow
      router.push(`/flow/generate`);
      
    } catch (error) {
      console.error('[RoomSetup] Error in handleComplete:', error);
      alert('Błąd podczas zapisywania pokoju. Spróbuj ponownie.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col w-full relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-radial from-pearl-50 via-platinum-50 to-silver-100 -z-10" />
      
      {/* Dialog IDA na dole - dynamiczny dla każdego kroku, pokazuje komentarz IDA jeśli dostępny */}
      {(() => {
        const roomAnalysis = (sessionData as any)?.roomAnalysis;
        const roomComment = language === 'pl' 
          ? (roomAnalysis?.human_comment || roomAnalysis?.comment)
          : (roomAnalysis?.comment || roomAnalysis?.human_comment);
        
        const hasProcessedImage = (sessionData as any)?.roomImageEmpty;
        const hasPhotos = roomData.photos && roomData.photos.length > 0;
        
        // Pokazuj komentarz analizy tylko w kroku photo_upload, jeśli zdjęcie zostało wgrane,
        // komentarz jest dostępny i nie został jeszcze w pełni wyświetlony w tej sesji.
        const isAlreadySeen = (sessionData as any)?.roomAnalysisCommentSeen === roomComment;
        const showAnalysis = currentStep === 'photo_upload' && hasPhotos && roomComment && !isAlreadySeen;

        if (showAnalysis) {
          const extraInfo = hasProcessedImage
            ? (language === 'pl'
                ? "Usunąłeś meble ze zdjęcia - to świetny pomysł! Dzięki temu generowane wizualizacje nie będą zbyt mocno trzymać się obecnego układu mebli."
                : "You removed furniture from the photo - great idea! This will help generated visualizations not stick too closely to the current furniture layout.")
            : (language === 'pl'
                ? "Sugestia: Jeśli chcesz, możesz usunąć meble ze zdjęcia przyciskiem poniżej. Pomoże to IDA stworzyć zupełnie nową aranżację bez sugerowania się obecnym układem."
                : "Pro Tip: You can remove furniture using the button below. This helps IDA create a completely new arrangement without being influenced by the current layout.");
          
          return (
            <div className="fixed bottom-0 left-0 right-0 w-full z-50">
              <AwaDialogue 
                key="room-analysis-dialogue"
                currentStep="room_analysis_ready" 
                fullWidth={true}
                autoHide={true}
                customMessage={[roomComment, extraInfo]}
                onDialogueEnd={() => {
                  console.log('[RoomSetup] Analysis dialogue finished, marking as seen');
                  updateSessionData({ roomAnalysisCommentSeen: roomComment } as any);
                }}
              />
            </div>
          );
        }

        // Standardowy dialog dla danego kroku
        return (
          <div className="fixed bottom-0 left-0 right-0 w-full z-50">
            <AwaDialogue 
              key={`step-${currentStep}`}
              currentStep={STEP_TO_DIALOGUE[currentStep]} 
              fullWidth={true}
              autoHide={true}
            />
          </div>
        );
      })()}

      <div className="flex-1 p-4 lg:p-8 pb-32">
        <div className="max-w-3xl lg:max-w-none mx-auto">
          {/* Progress */}
          <div className="mb-8 h-12">
            <div className="flex items-center justify-between text-sm text-silver-dark mb-2 font-modern h-6">
              <span>
                {language === 'pl' ? 'Krok' : 'Step'} {currentStepIndex + 1} / {steps.length}
              </span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="glass-panel rounded-full h-3 overflow-hidden">
              <motion.div 
                className="h-full bg-gradient-to-r from-gold via-champagne to-gold"
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </div>

          <AnimatePresence mode="wait">
            {currentStep === 'photo_upload' && (
              <PhotoUploadStep 
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
                  setCurrentStep('preference_questions');
                }}
              />
            )}

            {currentStep === 'preference_questions' && (
              <PreferenceQuestionsStep
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
                <GlassCard variant="flatOnMobile" className="p-6 lg:p-8">
                  <h2 className="text-2xl lg:text-3xl font-nasalization text-graphite mb-4 text-center">
                    {language === 'pl' ? 'Stan Obecny' : 'Current State'}
                  </h2>
                  <p className="text-graphite font-modern mb-6 text-center">
                    {language === 'pl'
                      ? 'Gdzie jest to pomieszczenie teraz?'
                      : 'Where is this space now?'}
                  </p>
                  
                  <MoodGrid 
                    initialPosition={roomData.prsCurrent}
                    onPositionChange={(pos) => setRoomData({ ...roomData, prsCurrent: pos })}
                    mode="current"
                  />

                  <div className="flex flex-col sm:flex-row justify-between gap-3 sm:gap-4 mt-6">
                    <GlassButton onClick={handleBack} variant="secondary" className="w-full sm:w-auto">
                      <ArrowLeft size={18} />
                      {language === 'pl' ? 'Wstecz' : 'Back'}
                    </GlassButton>
                    <GlassButton 
                      onClick={handleNext}
                      disabled={!roomData.prsCurrent}
                      className="w-full sm:w-auto"
                    >
                      {language === 'pl' ? 'Dalej' : 'Next'}
                      <ArrowRight size={18} />
                    </GlassButton>
                  </div>
                </GlassCard>
              </motion.div>
            )}

            {currentStep === 'usage_context' && (
              <UsageContextStep 
                usageType={roomData.usageType}
                onUpdate={(type: 'solo' | 'shared') => setRoomData({ ...roomData, usageType: type })}
                onNext={handleNext}
                onBack={handleBack}
              />
            )}

            {currentStep === 'activities' && (
              <ActivitiesStep 
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
                <GlassCard variant="flatOnMobile" className="p-6 lg:p-8">
                  <h2 className="text-2xl lg:text-3xl font-nasalization bg-gradient-to-r from-gold to-champagne bg-clip-text text-transparent mb-4 text-center">
                    {language === 'pl' ? 'Cel: Gdzie Ma Być?' : 'Goal: Where Should It Be?'}
                  </h2>
                  <p className="text-graphite font-modern mb-6 text-center">
                    {language === 'pl'
                      ? 'Gdzie POWINNO być to pomieszczenie idealnie?'
                      : 'Where SHOULD this space be ideally?'}
                  </p>
                  
                  <MoodGrid 
                    initialPosition={roomData.prsTarget}
                    onPositionChange={(pos) => setRoomData({ ...roomData, prsTarget: pos })}
                    mode="target"
                  />

                  <div className="flex flex-col sm:flex-row justify-between gap-3 sm:gap-4 mt-6">
                    <GlassButton onClick={handleBack} variant="secondary" className="w-full sm:w-auto">
                      <ArrowLeft size={18} />
                      {language === 'pl' ? 'Wstecz' : 'Back'}
                    </GlassButton>
                    <GlassButton 
                      onClick={handleNext}
                      disabled={!roomData.prsTarget}
                      className="w-full sm:w-auto"
                    >
                      {language === 'pl' ? 'Dalej' : 'Next'}
                      <ArrowRight size={18} />
                    </GlassButton>
                  </div>
                </GlassCard>
              </motion.div>
            )}

            {currentStep === 'summary' && (
              <RoomSummaryStep 
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
  const { language } = useLanguage();
  const [selectedUsage, setSelectedUsage] = useState('solo');

  const usageOptions = [
    { 
      id: 'solo', 
      label: language === 'pl' ? 'Tylko ja' : 'Just me',
    },
    { 
      id: 'couple', 
      label: language === 'pl' ? 'Ja i partner/ka' : 'Me and partner',
    },
    { 
      id: 'family', 
      label: language === 'pl' ? 'Rodzina z dziećmi' : 'Family with children',
    },
    { 
      id: 'roommates', 
      label: language === 'pl' ? 'Współlokatorzy' : 'Roommates',
    },
    { 
      id: 'multigenerational', 
      label: language === 'pl' ? 'Wielopokoleniowa rodzina' : 'Multigenerational family',
    },
    { 
      id: 'shared', 
      label: language === 'pl' ? 'Dzielone z innymi' : 'Shared with others',
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
      <GlassCard className="p-6 lg:p-8 min-h-[400px] sm:min-h-[500px] max-h-[85vh] overflow-auto scrollbar-hide">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-gold to-champagne flex items-center justify-center">
            <Target size={24} className="text-white" />
          </div>
          <h2 className="text-2xl lg:text-3xl font-nasalization text-graphite">
            {language === 'pl' ? 'Kto Używa?' : 'Who Uses It?'}
        </h2>
          </div>

        <p className="text-graphite font-modern mb-6">
          {language === 'pl'
            ? 'Kto używa tego pomieszczenia?'
            : 'Who uses this space?'}
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8">
          {usageOptions.map((option) => (
              <button
              key={option.id}
              onClick={() => handleSelect(option.id)}
              className={`rounded-xl p-4 text-sm font-modern font-semibold transition-all duration-300 cursor-pointer group ${
                selectedUsage === option.id
                  ? 'bg-gold/30 border-2 border-gold text-graphite shadow-lg'
                  : 'bg-white/10 border border-white/30 text-graphite hover:bg-gold/10 hover:border-gold/50 hover:text-gold-700'
              }`}
            >
              <p className="text-center leading-tight">{option.label}</p>
              </button>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row justify-between gap-3 sm:gap-4">
          <GlassButton onClick={onBack} variant="secondary" className="w-full sm:w-auto">
            <ArrowLeft size={18} />
            {language === 'pl' ? 'Wstecz' : 'Back'}
          </GlassButton>
          <GlassButton onClick={onNext} className="w-full sm:w-auto">
            {language === 'pl' ? 'Dalej' : 'Next'}
            <ArrowRight size={18} />
          </GlassButton>
        </div>
      </GlassCard>
    </motion.div>
  );
}

export function PhotoUploadStep({ photos, roomType, onUpdate, onNext, onBack }: any) {
  const { language } = useLanguage();
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
        setHumanComment(response.comment);
        // Update sessionData with human_comment
        if (roomAnalysis) {
          updateSessionData({ roomAnalysis: { ...roomAnalysis, human_comment: response.comment } } as any);
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
      // #region agent log
      void fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'pre-fix',hypothesisId:'H8',location:'RoomSetup.tsx:PhotoUploadStep:analyzeImage:start',message:'Room analysis started',data:{uploadId:lastUploadIdRef.current||null,fileName:file?.name||null,fileType:file?.type||null,fileSize:file?.size||null,step:'photo_upload'},timestamp:Date.now()})}).catch(()=>{});
      // #endregion
      
      // Convert file to base64
      const base64 = await fileToNormalizedBase64(file);
      console.log(`File converted to base64, length: ${base64.length} chars`);
      
      // Analyze room using Google Gemini 2.0 Flash (replaced Gemma 3)
      const analysis = await analyzeRoom({ image: base64, metadata: { source: 'setup-room-step' } });
      
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
      // #region agent log
      void fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'pre-fix',hypothesisId:'H8',location:'RoomSetup.tsx:PhotoUploadStep:analyzeImage:before-updateSessionData',message:'About to update sessionData.roomAnalysis',data:{uploadId:lastUploadIdRef.current||null,detectedRoomType:analysis?.detected_room_type||null,commentLen:analysis?.comment?.length||0,humanCommentLen:analysis?.human_comment?.length||0,descLen:analysis?.room_description?.length||0},timestamp:Date.now()})}).catch(()=>{});
      // #endregion
      // #region agent log
      void fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'pre-fix',hypothesisId:'H2',location:'RoomSetup.tsx:PhotoUploadStep:analyzeImage',message:'Room analysis ready -> saving to sessionData',data:{detectedRoomType:analysis?.detected_room_type||null,hasHumanComment:!!analysis?.human_comment,humanCommentLen:analysis?.human_comment?.length||0,hasComment:!!analysis?.comment,commentLen:analysis?.comment?.length||0,hasRoomDescription:!!analysis?.room_description,roomDescriptionLen:analysis?.room_description?.length||0},timestamp:Date.now()})}).catch(()=>{});
      // #endregion
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
      alert(language === 'pl' ? 'Najpierw dodaj zdjęcie' : 'Please add a photo first');
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
      
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'RoomSetup.tsx:handleRemoveFurniture',message:'Starting furniture removal',data:{prompt:removeFurniturePrompt.substring(0,200)},timestamp:Date.now(),sessionId:'debug-session',runId:'removal-debug',hypothesisId:'H1'})}).catch(()=>{});
      // #endregion

      const baseParams = getGenerationParameters('micro', 0);
      const response = await generateSixImagesParallelWithGoogle({
        prompts: [{ source: 'implicit' as GenerationSource, prompt: removeFurniturePrompt }],
        base_image: cleanBase64,
        style: 'empty',
        modifications: ['remove furniture'],
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

      const processedBase64 = response.results[0].image;
      
      // #region agent log
      const beforeSaveStorageCheck = typeof window !== 'undefined' ? sessionStorage.getItem('aura_session_room_image_empty') : null;
      fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'RoomSetup.tsx:handleRemoveFurniture:before-save',message:'About to save roomImageEmpty to sessionData',data:{processedBase64Length:processedBase64?.length||0,hasProcessedBase64:!!processedBase64,hasBeforeSaveStorage:!!beforeSaveStorageCheck,beforeSaveStorageLength:beforeSaveStorageCheck?.length||0},timestamp:Date.now(),sessionId:'debug-session',runId:'removal-debug',hypothesisId:'H2'})}).catch(()=>{});
      // #endregion
      
      // Create data URL for display
      const processedDataUrl = `data:image/jpeg;base64,${processedBase64}`;
      setProcessedImage(processedDataUrl);
      
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'RoomSetup.tsx:handleRemoveFurniture:before-updateSessionData',message:'About to call updateSessionData',data:{processedBase64Length:processedBase64?.length||0,hasProcessedBase64:!!processedBase64},timestamp:Date.now(),sessionId:'debug-session',runId:'removal-debug',hypothesisId:'H2'})}).catch(()=>{});
      // #endregion
      
      // Save to sessionData for use in generation
      await updateSessionData({ 
        roomImageEmpty: processedBase64 
      } as any);
      
      // #region agent log
      const afterSaveStorageCheck = typeof window !== 'undefined' ? sessionStorage.getItem('aura_session_room_image_empty') : null;
      fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'RoomSetup.tsx:handleRemoveFurniture:after-save',message:'roomImageEmpty saved to sessionData',data:{processedBase64Length:processedBase64?.length||0,hasProcessedBase64:!!processedBase64,hasAfterSaveStorage:!!afterSaveStorageCheck,afterSaveStorageLength:afterSaveStorageCheck?.length||0,storageMatches:processedBase64===afterSaveStorageCheck},timestamp:Date.now(),sessionId:'debug-session',runId:'removal-debug',hypothesisId:'H2'})}).catch(()=>{});
      // #endregion
      
      console.log('[PhotoUploadStep] Successfully removed furniture from image');
    } catch (error) {
      console.error('[PhotoUploadStep] Error removing furniture:', error);
      alert(language === 'pl' 
        ? 'Nie udało się usunąć mebli. Spróbuj ponownie lub przejdź dalej z oryginalnym zdjęciem.'
        : 'Failed to remove furniture. Try again or continue with the original image.');
    } finally {
      setIsRemovingFurniture(false);
    }
  };

  const handleExampleSelect = async (imageUrl: string) => {
    try {
      lastUploadIdRef.current = `example_${Date.now()}_${Math.random().toString(16).slice(2)}`;
      // #region agent log
      void fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'pre-fix',hypothesisId:'H8',location:'RoomSetup.tsx:PhotoUploadStep:handleExampleSelect',message:'Example image selected',data:{uploadId:lastUploadIdRef.current,imageUrl,step:'photo_upload'},timestamp:Date.now()})}).catch(()=>{});
      // #endregion
      // Pre-computed metadata for example images - NO ANALYSIS NEEDED!
      const exampleMetadata: { [key: string]: any } = {
        '/images/tinder/Living Room (1).jpg': {
          roomType: 'living_room',
          roomName: 'Salon',
          confidence: 0.95,
          roomDescription: 'Modern living room with comfortable seating',
          comment: 'This is a bright, modern living space with excellent natural light.',
          humanComment: 'Nowoczesny salon z dużą ilością światła naturalnego i wygodnymi meblami.'
        },
        '/images/tinder/Living Room (2).jpg': {
          roomType: 'living_room',
          roomName: 'Salon',
          confidence: 0.93,
          roomDescription: 'Modern minimalist living room with neutral tones, natural wood furniture, and abundant greenery',
          comment: 'A serene Scandinavian-inspired living room with light wood, cream tones, and natural plants.',
          humanComment: 'Minimalistyczny salon w stylu skandynawskim z jasnym drewnem, kremowymi tonami i naturalnymi roślinami.'
        },
        '/images/tinder/Living Room (3).jpg': {
          roomType: 'living_room',
          roomName: 'Salon',
          confidence: 0.92,
          roomDescription: 'Cozy living room with warm atmosphere',
          comment: 'A cozy, inviting living room with warm tones.',
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
          human_comment: metadata.humanComment,
          suggestions: []
        };
        setRoomAnalysis(roomAnalysisData);
        setLlmComment({
          comment: metadata.comment,
          suggestions: []
        });
        setHumanComment(metadata.humanComment);
        
        // Save to sessionData so dialogue can access it
        console.log('[PhotoUploadStep] Saving example image roomAnalysis to sessionData:', {
          hasHumanComment: !!metadata.humanComment,
          humanComment: metadata.humanComment,
          hasComment: !!metadata.comment,
          comment: metadata.comment
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
      // #region agent log
      void fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'pre-fix',hypothesisId:'H8',location:'RoomSetup.tsx:PhotoUploadStep:handleFileUpload',message:'User uploaded file selected',data:{uploadId:lastUploadIdRef.current,fileName:file?.name||null,fileType:file?.type||null,fileSize:file?.size||null,step:'photo_upload'},timestamp:Date.now()})}).catch(()=>{});
      // #endregion
      
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
      <GlassCard variant="flatOnMobile" className="p-6 lg:p-8 min-h-[600px] max-h-[85vh] overflow-auto scrollbar-hide">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-gold to-champagne flex items-center justify-center">
            <Camera size={24} className="text-white" />
          </div>
          <h2 className="text-2xl lg:text-3xl font-nasalization text-graphite">
            {language === 'pl' ? 'Pokaż Nam Pomieszczenie' : 'Show Us the Space'}
          </h2>
        </div>

        <p className="text-graphite font-modern mb-6">
          {language === 'pl'
            ? 'Prześlij zdjęcie obecnego stanu pomieszczenia. IDA przeanalizuje je i automatycznie rozpozna typ pomieszczenia.'
            : 'Upload a photo of the current space state. IDA will analyze it and automatically detect the room type.'}
        </p>


        {/* Room Analysis Results */}
        {isAnalyzing && (
          <div className="mb-6 p-6 glass-panel rounded-2xl">
            <div className="flex items-center gap-4">
              <div className="w-6 h-6 border-2 border-gold/40 border-t-gold rounded-full animate-spin"></div>
              <div>
                <p className="text-graphite font-modern font-semibold text-lg">
                  {language === 'pl' ? 'IDA analizuje pomieszczenie...' : 'IDA is analyzing the room...'}
                </p>
                <p className="text-silver-dark text-sm font-modern">
                  {language === 'pl' ? 'To może potrwać chwilę' : 'This may take a moment'}
                </p>
              </div>
            </div>
          </div>
        )}
        
        {/* Room type display and selection - always show if image is uploaded */}
        {selectedImage && !isAnalyzing && (
          <div className="mb-6 p-6 md:glass-panel rounded-2xl relative overflow-hidden">
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
                        {language === 'pl' ? 'IDA wykryła: ' : 'IDA detected: '}
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
                        {language === 'pl' ? 'Zmień pomieszczenie' : 'Change room'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-graphite font-modern font-bold text-lg mb-3">
                    {language === 'pl' ? 'Wybierz typ pomieszczenia:' : 'Select room type:'}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}


        {/* Room type selection - hidden until "Zmień" is clicked */}
        {showRoomTypeSelection && (
          <div className="mb-6 p-6 glass-panel rounded-2xl">
            <h3 className="text-sm font-bold text-graphite mb-3 font-modern">
              {language === 'pl' ? 'Typ pomieszczenia' : 'Room type'}
            </h3>
            <div className="flex flex-wrap gap-2">
              {[
                { id: 'living_room', label: language === 'pl' ? 'Pokój dzienny' : 'Living Room' },
                { id: 'bedroom', label: language === 'pl' ? 'Sypialnia' : 'Bedroom' },
                { id: 'kitchen', label: language === 'pl' ? 'Kuchnia' : 'Kitchen' },
                { id: 'dining_room', label: language === 'pl' ? 'Jadalnia' : 'Dining Room' },
                { id: 'bathroom', label: language === 'pl' ? 'Łazienka' : 'Bathroom' },
                { id: 'office', label: language === 'pl' ? 'Biuro' : 'Office' },
                { id: 'empty_room', label: language === 'pl' ? 'Puste pomieszczenie' : 'Empty Room' },
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
        <div className="md:glass-panel rounded-2xl p-8 border-2 border-dashed border-gold/30 hover:border-gold/50 transition-colors mb-6">
          <label className="cursor-pointer flex flex-col items-center">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-gold to-champagne flex items-center justify-center mb-4">
              <Camera size={32} className="text-white" />
            </div>
            <p className="text-graphite font-semibold mb-2">
                  {language === 'pl' ? 'Kliknij aby dodać zdjęcie' : 'Click to add photo'}
            </p>
            <p className="text-sm text-silver-dark">
              {language === 'pl' ? 'Lub przeciągnij i upuść' : 'Or drag and drop'}
            </p>
            <input
              type="file"
                  accept="image/jpeg,image/jpg,image/png,image/tiff,image/heic,image/heif"
              onChange={handleFileUpload}
              className="hidden"
                  disabled={isAnalyzing}
            />
          </label>
        </div>

            {/* Example images */}
            <div className="mb-6">
              <h3 className="text-sm font-bold text-graphite mb-3 font-modern">
                {language === 'pl' ? 'Przykładowe zdjęcia' : 'Example photos'}
              </h3>
              <div className="flex gap-3 justify-center flex-wrap">
                {[
                  '/images/tinder/Living Room (1).jpg',
                  '/images/tinder/Living Room (2).jpg',
                  '/images/tinder/Living Room (3).jpg',
                ].map((img, idx) => (
                  <button
                    key={img}
                    type="button"
                    onClick={() => handleExampleSelect(img)}
                    className="border-2 border-transparent hover:border-gold rounded-xl transition-all"
                    disabled={isAnalyzing}
                  >
                    <img src={img} alt={`Przykład ${idx + 1}`} className="w-24 h-16 rounded-xl object-cover" />
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
                {language === 'pl' 
                  ? (processedImage ? 'Zdjęcie bez mebli' : 'Wybrane zdjęcie')
                  : (processedImage ? 'Image without furniture' : 'Selected photo')}
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
                        ? (language === 'pl' ? 'Ponowne usuwanie...' : 'Retrying...')
                        : (language === 'pl' ? 'Spróbuj ponownie' : 'Try again')}
                    </GlassButton>
                    <button
                      onClick={() => {
                        setProcessedImage(null);
                        updateSessionData({ roomImageEmpty: undefined } as any);
                      }}
                      className="text-[10px] px-3 h-8 bg-white/10 hover:bg-white/20 text-graphite font-modern rounded-lg transition-all border border-white/20"
                    >
                      {language === 'pl' ? 'Przywróć meble' : 'Restore furniture'}
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
                  {language === 'pl' ? 'Zmień zdjęcie' : 'Change photo'}
                </button>
              </div>
            </div>
            <div className="relative">
              <img 
                src={processedImage || selectedImage} 
                alt={language === 'pl' ? 'Wybrane zdjęcie' : 'Selected photo'} 
                className="w-full max-w-md mx-auto rounded-xl shadow-lg"
              />
              {processedImage && (
                <div className="mt-2 text-xs text-silver-dark text-center font-modern">
                  {language === 'pl' 
                    ? '✓ Meble zostały usunięte. To zdjęcie będzie używane podczas generowania.'
                    : '✓ Furniture removed. This image will be used during generation.'}
                </div>
              )}
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 sm:gap-4 mt-6">
          <GlassButton onClick={onBack} variant="secondary" className="w-full sm:w-auto">
            <ArrowLeft size={18} />
            {language === 'pl' ? 'Wstecz' : 'Back'}
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
                      ? (language === 'pl' ? 'Usuwanie...' : 'Removing...')
                      : (language === 'pl' ? 'Usuń meble (Zalecane)' : 'Remove furniture (Recommended)')}
                  </span>
                  <span className="sm:hidden">
                    {isRemovingFurniture 
                      ? (language === 'pl' ? 'Usuwanie...' : 'Removing...')
                      : (language === 'pl' ? 'Usuń meble' : 'Remove furniture')}
                  </span>
                </GlassButton>
              </motion.div>
            )}

            <GlassButton 
              onClick={() => {
                // Use detected room type or allow manual selection
                const finalRoomType = detectedRoomType || roomType || 'empty_room';
                const finalRoomName = roomName || (language === 'pl' ? 'Pomieszczenie' : 'Room');
                onUpdate(uploadedPhotosBase64, finalRoomType, finalRoomName);
                onNext();
              }}
              disabled={isAnalyzing || uploadedPhotosBase64.length === 0}
              variant={processedImage || !selectedImage || detectedRoomType === 'empty_room' ? 'primary' : 'secondary'}
              className="w-full sm:w-auto"
            >
              {isAnalyzing 
                ? (language === 'pl' ? 'Analizuje...' : 'Analyzing...')
                : (language === 'pl' ? 'Dalej' : 'Next')
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
  onBack: () => void;
  onSubmit: (payload: RoomPreferencePayload) => void;
}

const DEFAULT_SEMANTIC_VALUE = 0.5;

const buildDefaultPreferences = (source?: RoomPreferencePayload): RoomPreferencePayload => ({
  semanticDifferential: {
    warmth: source?.semanticDifferential?.warmth ?? DEFAULT_SEMANTIC_VALUE,
    brightness: source?.semanticDifferential?.brightness ?? DEFAULT_SEMANTIC_VALUE,
    complexity: source?.semanticDifferential?.complexity ?? DEFAULT_SEMANTIC_VALUE,
    texture: source?.semanticDifferential?.texture ?? DEFAULT_SEMANTIC_VALUE
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
  const { language } = useLanguage();

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
      ? `${language === 'pl' ? 'Paleta' : 'Palette'}: ${profilePaletteLabel}`
      : null,
    profileStyleLabel
      ? `${language === 'pl' ? 'Styl' : 'Style'}: ${profileStyleLabel}`
      : null,
    profileSemantic
      ? `${language === 'pl' ? 'Ciepło' : 'Warmth'} ${Math.round((profileSemantic.warmth ?? 0) * 100)}%`
      : null,
    profileSensory?.music
      ? `${language === 'pl' ? 'Muzyka' : 'Music'}: ${profileSensory.music}`
      : null
  ].filter(Boolean);

  return (
    <motion.div
      key="preference_source"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
    >
      <GlassCard variant="flatOnMobile" className="p-6 lg:p-8 min-h-[600px] max-h-[85vh] overflow-auto scrollbar-hide">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-gold to-champagne flex items-center justify-center">
            <Target size={24} className="text-white" />
          </div>
          <div>
            <h2 className="text-2xl lg:text-3xl font-nasalization text-graphite">
              {language === 'pl' ? 'Jak mamy poznać Twój styl?' : 'How should we learn this room?'}
            </h2>
            <p className="text-sm text-silver-dark font-modern">
              {language === 'pl'
                ? 'Wybierz szybkie użycie profilu lub przejdź do krótkich pytań dla tego pokoju.'
                : 'Pick the fast profile reuse or move to a short, room-specific questionnaire.'}
            </p>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6 mb-10">
          <div
            className={`glass-panel rounded-2xl p-6 border transition-all ${
              preferenceSource === 'complete'
                ? 'border-gold bg-gold/5 shadow-lg shadow-gold/10'
                : 'border-white/10'
            }`}
          >
            <p className="uppercase text-xs tracking-[0.3em] text-silver-dark mb-2">
              {language === 'pl' ? 'Dokładniejsze' : 'Complete mode'}
            </p>
            <h3 className="text-xl font-nasalization text-graphite mb-4">
              {language === 'pl' ? 'Odpowiem na pytania' : 'Answer quick room questions'}
            </h3>
            <p className="text-sm text-silver-dark font-modern mb-4">
              {language === 'pl'
                ? '3 krótkie sekcje zajmą ~2 minuty i dadzą IDA pełny kontekst dla tego pokoju.'
                : 'Three short sections take ~2 minutes and give IDA a complete, room-specific context.'}
            </p>
            <GlassButton variant="secondary" onClick={onSelectQuestions}>
              {language === 'pl' ? 'Przejdź do pytań' : 'Go to questions'}
              <ArrowRight size={16} />
            </GlassButton>
          </div>

          <div
            className={`glass-panel rounded-2xl p-6 border transition-all ${
              preferenceSource === 'profile'
                ? 'border-gold bg-gold/5 shadow-lg shadow-gold/10'
                : 'border-white/10'
            }`}
          >
            <p className="uppercase text-xs tracking-[0.3em] text-silver-dark mb-2">
              {language === 'pl' ? 'Szybka opcja' : 'Fast path'}
            </p>
            <h3 className="text-xl font-nasalization text-graphite mb-3">
              {language === 'pl' ? 'Użyj mojego profilu' : 'Use my profile preferences'}
            </h3>
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
                    {language === 'pl'
                      ? 'Twoje globalne dane preferencji są zapisane i gotowe do użycia.'
                      : 'Your global preference data is saved and ready to reuse.'}
                  </li>
                )}
              </ul>
            ) : (
              <p className="text-sm text-silver-dark font-modern">
                {language === 'pl'
                  ? 'Uzupełnij najpierw profil główny, aby skorzystać z tej opcji.'
                  : 'Complete the core profile first to unlock this option.'}
              </p>
            )}
            <GlassButton
              className="mt-6"
              onClick={onSelectProfile}
              disabled={!hasProfileData}
            >
              {language === 'pl' ? 'Zastosuj profil' : 'Apply my profile'}
              <ArrowRight size={16} />
            </GlassButton>
          </div>
        </div>

        <div className="flex justify-start">
          <GlassButton onClick={onBack} variant="secondary" className="w-full sm:w-auto">
            <ArrowLeft size={18} />
            {language === 'pl' ? 'Wstecz' : 'Back'}
          </GlassButton>
        </div>
      </GlassCard>
    </motion.div>
  );
}

function PreferenceQuestionsStep({
  explicitPreferences,
  onBack,
  onSubmit
}: PreferenceQuestionsStepProps) {
  const { language } = useLanguage();
  const [localPrefs, setLocalPrefs] = useState<RoomPreferencePayload>(() => buildDefaultPreferences(explicitPreferences));
  const [natureMetaphor, setNatureMetaphor] = useState<string | undefined>(explicitPreferences?.natureMetaphor);
  const [biophiliaScore, setBiophiliaScore] = useState<number | undefined>(explicitPreferences?.biophiliaScore);
  const [currentVisualQuestion, setCurrentVisualQuestion] = useState(0);
  const [visualAnswers, setVisualAnswers] = useState<Record<string, number>>(() => {
    return {
      warmth: explicitPreferences?.semanticDifferential?.warmth ?? 50,
      brightness: explicitPreferences?.semanticDifferential?.brightness ?? 50,
      complexity: explicitPreferences?.semanticDifferential?.complexity ?? 50
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
    const currentQ = visualQuestions[currentVisualQuestion];
    const value = side === 'left' ? 20 : 80; // Mapowanie: left = 20, right = 80 (na skali 0-100)
    const newAnswers = { ...visualAnswers, [currentQ.id]: value };
    setVisualAnswers(newAnswers);
    
    // Update localPrefs
    setLocalPrefs(curr => ({
      ...curr,
      semanticDifferential: {
        warmth: currentQ.id === 'warmth' ? value : (curr.semanticDifferential?.warmth ?? 50),
        brightness: currentQ.id === 'brightness' ? value : (curr.semanticDifferential?.brightness ?? 50),
        complexity: currentQ.id === 'complexity' ? value : (curr.semanticDifferential?.complexity ?? 50),
        texture: curr.semanticDifferential?.texture ?? 50
      }
    }));
    
    if (currentVisualQuestion + 1 < visualQuestions.length) {
      setCurrentVisualQuestion(currentVisualQuestion + 1);
    } else {
      // All visual questions completed, show sensory tests
      setCurrentVisualQuestion(visualQuestions.length);
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
      <GlassCard variant="flatOnMobile" className="p-6 lg:p-8 min-h-[60vh] max-h-[90vh] h-auto overflow-auto scrollbar-hide flex flex-col">
        <div className="mb-6">
          <h2 className="text-xl md:text-2xl font-nasalization text-graphite">
            {language === 'pl' ? 'Testy Sensoryczne' : 'Sensory Suite'}
          </h2>
          <p className="text-graphite font-modern text-sm">
            {language === 'pl'
              ? 'Paleta, metafora natury, muzyka, tekstury, światło i biophilia w jednym spójnym oknie.'
              : 'Palette, nature metaphor, music, textures, light and biophilia inside one coherent panel.'}
          </p>
        </div>
        <div className="flex-1 flex flex-col justify-center">
          <AnimatePresence mode="wait">
            {currentVisualQuestion < visualQuestions.length ? (
            // Step 1: Visual Questions
            <motion.div
              key="visual_questions"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex flex-col items-center justify-center h-full"
            >
              <h3 className="text-xl md:text-2xl font-nasalization text-graphite mb-2 text-center">
                {visualQuestions[currentVisualQuestion].question[language]}
              </h3>
              <p className="text-graphite font-modern mb-6 text-sm text-center">
                {language === 'pl' ? 'Reaguj intuicyjnie, nie myśl za długo' : 'React intuitively, don\'t overthink'}
              </p>
              
              <div className="mb-6">
                <div className="text-xs text-silver-dark text-center mb-2 font-modern">
                  {language === 'pl' ? 'Pytanie' : 'Question'} {currentVisualQuestion + 1} / {visualQuestions.length}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 mb-6 w-full">
                <button
                  type="button"
                  onClick={() => handleVisualChoice('left')}
                  className="group relative aspect-[4/3] rounded-xl overflow-hidden border-2 border-white/30 hover:border-gold/50 transition-all hover:scale-[1.02] cursor-pointer"
                >
                  <Image
                    src={visualQuestions[currentVisualQuestion].leftImage}
                    alt={visualQuestions[currentVisualQuestion].leftLabel[language]}
                    fill
                    className="object-cover"
                    style={{ objectPosition: 'center 30%' }}
                    onLoad={() => {
                      // #region agent log
                      fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'RoomSetup.tsx:leftImage-onLoad',message:'Semantic differential left image loaded',data:{questionId:visualQuestions[currentVisualQuestion].id,imageUrl:visualQuestions[currentVisualQuestion].leftImage},timestamp:Date.now(),sessionId:'debug-session',runId:'image-load-check',hypothesisId:'H1'})}).catch(()=>{});
                      // #endregion
                    }}
                    onError={() => {
                      // #region agent log
                      fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'RoomSetup.tsx:leftImage-onError',message:'Semantic differential left image failed',data:{questionId:visualQuestions[currentVisualQuestion].id,imageUrl:visualQuestions[currentVisualQuestion].leftImage},timestamp:Date.now(),sessionId:'debug-session',runId:'image-load-check',hypothesisId:'H2'})}).catch(()=>{});
                      // #endregion
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-4">
                    <p className="text-white font-modern text-sm font-semibold">
                      {visualQuestions[currentVisualQuestion].leftLabel[language]}
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleVisualChoice('right')}
                  className="group relative aspect-[4/3] rounded-xl overflow-hidden border-2 border-white/30 hover:border-gold/50 transition-all hover:scale-[1.02] cursor-pointer"
                >
                  <Image
                    src={visualQuestions[currentVisualQuestion].rightImage}
                    alt={visualQuestions[currentVisualQuestion].rightLabel[language]}
                    fill
                    className="object-cover"
                    style={{ objectPosition: 'center 30%' }}
                    onLoad={() => {
                      // #region agent log
                      fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'RoomSetup.tsx:rightImage-onLoad',message:'Semantic differential right image loaded',data:{questionId:visualQuestions[currentVisualQuestion].id,imageUrl:visualQuestions[currentVisualQuestion].rightImage},timestamp:Date.now(),sessionId:'debug-session',runId:'image-load-check',hypothesisId:'H1'})}).catch(()=>{});
                      // #endregion
                    }}
                    onError={() => {
                      // #region agent log
                      fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'RoomSetup.tsx:rightImage-onError',message:'Semantic differential right image failed',data:{questionId:visualQuestions[currentVisualQuestion].id,imageUrl:visualQuestions[currentVisualQuestion].rightImage},timestamp:Date.now(),sessionId:'debug-session',runId:'image-load-check',hypothesisId:'H2'})}).catch(()=>{});
                      // #endregion
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-4">
                    <p className="text-white font-modern text-sm font-semibold">
                      {visualQuestions[currentVisualQuestion].rightLabel[language]}
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
              className="w-full h-full"
            >
              <SensoryTestSuite
                className="flex flex-col h-full"
                paletteOptions={COLOR_PALETTE_OPTIONS}
                selectedPalette={localPrefs.colorsAndMaterials?.selectedPalette}
                onPaletteSelect={(paletteId) => handlePaletteSelect(paletteId)}
                styleOptions={STYLE_OPTIONS}
                selectedStyle={selectedStyle}
                onStyleSelect={(styleId) => handleStyleSelect(styleId)}
                onComplete={(results) => {
                  setLocalPrefs((prev) => ({
                    ...prev,
                    sensoryPreferences: {
                      music: results.music,
                      texture: results.texture,
                      light: results.light
                    },
                    ...(results.style && {
                      colorsAndMaterials: {
                        ...(prev.colorsAndMaterials || {}),
                        selectedStyle: results.style
                      }
                    })
                  }));
                  setNatureMetaphor(results.natureMetaphor);
                  setBiophiliaScore(results.biophiliaScore);
                  if (results.style) {
                    setSelectedStyle(results.style);
                  }
                }}
              />
            </motion.div>
          )}
          </AnimatePresence>
        </div>

        <div className="flex flex-col sm:flex-row justify-between gap-3 sm:gap-4 mt-8">
          <GlassButton 
            onClick={() => {
              if (currentVisualQuestion > 0 && currentVisualQuestion < visualQuestions.length) {
                // Go back to previous visual question
                setCurrentVisualQuestion(currentVisualQuestion - 1);
              } else if (currentVisualQuestion >= visualQuestions.length) {
                // Go back to visual questions from sensory tests
                setCurrentVisualQuestion(visualQuestions.length - 1);
              } else {
                // Go back to previous step in flow
                onBack();
              }
            }} 
            variant="secondary"
            className="w-full sm:w-auto"
          >
            <ArrowLeft size={18} />
            {language === 'pl' ? 'Wstecz' : 'Back'}
          </GlassButton>
          {currentVisualQuestion >= visualQuestions.length && (
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
              {language === 'pl' ? 'Zapisz preferencje' : 'Apply preferences'}
              <ArrowRight size={18} />
            </GlassButton>
          )}
        </div>
      </GlassCard>
    </motion.div>
  );
}

const MATERIAL_OPTIONS = [
  { id: 'smooth_wood', label: { pl: 'Gładkie drewno', en: 'Smooth wood' } },
  { id: 'warm_leather', label: { pl: 'Ciepła skóra', en: 'Warm leather' } },
  { id: 'rough_stone', label: { pl: 'Szorstki kamień', en: 'Rough stone' } },
  { id: 'soft_fabric', label: { pl: 'Miękka tkanina', en: 'Soft fabric' } },
  { id: 'glass', label: { pl: 'Szkło', en: 'Glass' } },
  { id: 'polished_metal', label: { pl: 'Polerowany metal', en: 'Polished metal' } }
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
  const { t, language } = useLanguage();

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
      <GlassCard className="p-6 lg:p-8 min-h-[400px] sm:min-h-[500px] max-h-[85vh] overflow-auto scrollbar-hide">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-gold to-champagne flex items-center justify-center">
            <AlertCircle size={24} className="text-white" />
          </div>
          <h2 className="text-2xl lg:text-3xl font-nasalization text-graphite">
            {language === 'pl' ? 'Co Cię Irytuje?' : 'What Bothers You?'}
          </h2>
        </div>

        <p className="text-graphite font-modern mb-6">
          {language === 'pl'
            ? 'Wybierz wszystkie problemy które chciałbyś rozwiązać'
            : 'Select all problems you\'d like to solve'}
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
                    : 'bg-white/10 border border-white/30 text-graphite hover:bg-gold/10 hover:border-gold/50 hover:text-gold-700'
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
            {language === 'pl' ? 'Wstecz' : 'Back'}
          </GlassButton>
          <GlassButton onClick={onNext} className="w-full sm:w-auto">
            {language === 'pl' ? 'Dalej' : 'Next'}
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
  const { t, language } = useLanguage();
  const activityDefinitions = ACTIVITY_QUESTIONS[roomType as keyof typeof ACTIVITY_QUESTIONS] || ACTIVITY_QUESTIONS.default;

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
      <GlassCard variant="flatOnMobile" className="p-6 lg:p-8 min-h-[600px] max-h-[85vh] overflow-auto scrollbar-hide">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-gold to-champagne flex items-center justify-center">
            <Activity size={24} className="text-white" />
          </div>
          <div>
            <h2 className="text-2xl lg:text-3xl font-nasalization text-graphite">
              {language === 'pl' ? 'Co tu robisz?' : 'What happens here?'}
            </h2>
            <p className="text-sm text-silver-dark font-modern">
              {language === 'pl'
                ? 'Zaznacz rytuały w tym pokoju i powiedz, jak wspiera je obecna przestrzeń.'
                : 'Select every ritual you run in this room and describe how the space supports it.'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-8">
          {activityDefinitions.map((activity) => {
            const isSelected = Boolean(activityMap[activity.id]);
            return (
              <button
                key={activity.id}
                onClick={() => toggleActivity(activity.id)}
                className={`glass-panel rounded-xl p-4 transition-all duration-300 ${
                  isSelected ? 'border-2 border-gold bg-gold/10 scale-105' : 'border border-white/30 hover:border-gold/30'
                }`}
              >
                <div className="w-8 h-8 mx-auto mb-3 rounded-full bg-gradient-to-br from-gold/20 to-champagne/20 flex items-center justify-center">
                  <div className="w-4 h-4 bg-gradient-to-br from-gold to-champagne rounded-full"></div>
                </div>
                <p className="text-xs font-modern text-graphite text-center leading-tight">{t(activity.label)}</p>
              </button>
            );
          })}
        </div>

        {hasSelectedActivities ? (
          <div className="space-y-4 mb-6">
            {selectedActivities.map((activity) => {
              const definition = activityDefinitions.find((item: any) => item.id === activity.type);
              return (
                <div key={activity.type} className="md:glass-panel rounded-2xl p-5 border border-white/10">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-sm uppercase tracking-[0.2em] text-silver-dark">
                        {language === 'pl' ? 'Aktywność' : 'Activity'}
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
                      {language === 'pl' ? 'Usuń' : 'Remove'}
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-silver-dark">
                        {language === 'pl' ? 'Częstotliwość' : 'Frequency'}
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
                        {language === 'pl' ? 'Jak to miejsce się sprawdza?' : 'How does the space feel?'}
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
          <div className="md:glass-panel rounded-2xl p-6 border border-dashed border-white/15 text-center text-silver-dark font-modern mb-6">
            {language === 'pl'
              ? 'Zaznacz przynajmniej jedną aktywność, aby przejść dalej.'
              : 'Select at least one activity to continue.'}
          </div>
        )}

        <div className="flex flex-col sm:flex-row justify-between gap-3 sm:gap-4 mt-6">
          <GlassButton onClick={onBack} variant="secondary" className="w-full sm:w-auto">
            <ArrowLeft size={18} />
            {language === 'pl' ? 'Wstecz' : 'Back'}
          </GlassButton>
          <GlassButton onClick={handleNextStep} disabled={!hasSelectedActivities} className="w-full sm:w-auto">
            {language === 'pl' ? 'Dalej' : 'Next'}
            <ArrowRight size={18} />
          </GlassButton>
        </div>
      </GlassCard>
    </motion.div>
  );
}

function RoomSummaryStep({ data, onComplete, onBack, isSaving }: any) {
  const { language } = useLanguage();

  return (
    <motion.div
      key="summary"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
    >
      <GlassCard variant="flatOnMobile" className="p-8 text-center min-h-[600px] max-h-[85vh] overflow-auto scrollbar-hide">
        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-gold to-champagne flex items-center justify-center">
          <Target size={40} className="text-white" />
        </div>

        <h2 className="text-3xl lg:text-4xl font-nasalization bg-gradient-to-r from-gold to-champagne bg-clip-text text-transparent mb-4">
          {language === 'pl' ? 'Pomieszczenie Gotowe!' : 'Space Ready!'}
        </h2>

        <p className="text-graphite font-modern mb-8 max-w-xl mx-auto">
          {language === 'pl'
            ? `Świetnie! "${data.name}" jest gotowe do projektowania. IDA ma wszystko czego potrzebuje aby stworzyć wnętrze które naprawdę pasuje do Ciebie.`
            : `Great! "${data.name}" is ready to design. IDA has everything needed to create an interior that truly fits you.`}
        </p>

        <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4">
          <GlassButton onClick={onBack} variant="secondary" className="w-full sm:w-auto">
            <ArrowLeft size={18} />
            {language === 'pl' ? 'Wstecz' : 'Back'}
          </GlassButton>
          <GlassButton onClick={onComplete} className="w-full sm:w-auto sm:px-8" disabled={isSaving}>
            {isSaving
              ? (language === 'pl' ? 'Zapisuję...' : 'Saving...')
              : (language === 'pl' ? 'Zacznij Projektowanie' : 'Start Designing')
            }
            <ArrowRight size={18} />
          </GlassButton>
        </div>
      </GlassCard>
    </motion.div>
  );
}

