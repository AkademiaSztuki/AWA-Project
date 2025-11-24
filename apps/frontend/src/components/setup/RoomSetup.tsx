"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';
import { GlassSlider } from '@/components/ui/GlassSlider';
import { AwaDialogue } from '@/components/awa/AwaDialogue';
import { MoodGrid } from '@/components/research';
import { ACTIVITY_QUESTIONS, PAIN_POINTS } from '@/lib/questions/adaptive-questions';
import { ArrowRight, ArrowLeft, Camera, Activity, AlertCircle, Target } from 'lucide-react';
import { useModalAPI } from '@/hooks/useModalAPI';
import { saveRoom } from '@/lib/supabase-deep-personalization';
import { useSession, useSessionData } from '@/hooks';
import { SessionData } from '@/types';
import { RoomPreferencePayload, RoomActivity } from '@/types/deep-personalization';
import { COLOR_PALETTE_OPTIONS, getPaletteLabel } from '@/components/setup/paletteOptions';
import {
  SEMANTIC_DIFFERENTIAL_DIMENSIONS,
  MUSIC_PREFERENCES,
  TEXTURE_PREFERENCES,
  LIGHT_PREFERENCES
} from '@/lib/questions/validated-scales';
import { mapActivitiesToRecommendations } from '@/lib/preferences/activity-mapping';

// Helper function to convert file to base64
const toBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      // Extract only the base64 part without the MIME header
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = (error) => reject(error);
  });

type SetupStep = 
  | 'photo_upload'
  | 'preference_source'
  | 'prs_current'
  | 'usage_context'
  | 'activities'
  | 'pain_points'
  | 'social_dynamics'
  | 'prs_target'
  | 'summary';

type PreferenceSource = 'profile' | 'complete';
type SemanticDimensionId = 'warmth' | 'brightness' | 'complexity' | 'texture';

interface RoomData {
  name: string;
  roomType: string;
  usageType: 'solo' | 'shared';
  sharedWith?: string[];
  photos?: string[];
  prsCurrent?: { x: number; y: number };
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
  const { sessionData } = useSession();
  const { updateSessionData } = useSessionData();
  
  const [currentStep, setCurrentStep] = useState<SetupStep>('photo_upload');
  const [roomData, setRoomData] = useState<RoomData>({
    name: '',
    roomType: '',
    usageType: 'solo',
    painPoints: [],
    activities: []
  });
  const [isSaving, setIsSaving] = useState(false);

  const steps: SetupStep[] = [
    'photo_upload',
    'preference_source',
    'prs_current',
    'activities',
    'usage_context',
    'pain_points',
    'prs_target',
    'summary'
  ];

  const currentStepIndex = steps.indexOf(currentStep);
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
          preferenceSource: roomData.preferenceSource,
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
      
      await updateSessionData({
        roomType: roomData.roomType,
        roomName: roomData.name,
        roomUsageType: roomData.usageType,
        roomPainPoints: roomData.painPoints,
        roomActivities: roomData.activities,
        roomPreferenceSource: roomData.preferenceSource,
        roomPreferences: roomData.explicitPreferences,
        roomActivityContext: activityContext,
        roomImage: roomData.photos && roomData.photos.length > 0 ? roomData.photos[0] : sessionData.roomImage,
        prsCurrent: roomData.prsCurrent,
        prsTarget: roomData.prsTarget
      });
      
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
      
      {/* Dialog IDA na dole - cała szerokość */}
      <div className="w-full">
        <AwaDialogue 
          currentStep="onboarding" 
          fullWidth={true}
          autoHide={true}
        />
      </div>

      <div className="flex-1 p-4 lg:p-8 pb-32">
        <div className="max-w-4xl mx-auto">
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
                explicitPreferences={roomData.explicitPreferences}
                onBack={handleBack}
                onContinue={(source, payload) => {
                  setRoomData({
                    ...roomData,
                    preferenceSource: source,
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
                <GlassCard className="p-6 lg:p-8">
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

                  <div className="flex justify-between mt-6">
                    <GlassButton onClick={handleBack} variant="secondary">
                      <ArrowLeft size={18} />
                      {language === 'pl' ? 'Wstecz' : 'Back'}
                    </GlassButton>
                    <GlassButton 
                      onClick={handleNext}
                      disabled={!roomData.prsCurrent}
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
                <GlassCard className="p-6 lg:p-8">
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

                  <div className="flex justify-between mt-6">
                    <GlassButton onClick={handleBack} variant="secondary">
                      <ArrowLeft size={18} />
                      {language === 'pl' ? 'Wstecz' : 'Back'}
                    </GlassButton>
                    <GlassButton 
                      onClick={handleNext}
                      disabled={!roomData.prsTarget}
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
      <GlassCard className="p-6 lg:p-8 min-h-[600px] max-h-[85vh] overflow-auto scrollbar-hide">
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

        <div className="flex justify-between">
          <GlassButton onClick={onBack} variant="secondary">
            <ArrowLeft size={18} />
            {language === 'pl' ? 'Wstecz' : 'Back'}
          </GlassButton>
          <GlassButton onClick={onNext}>
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
  const [pendingAnalysisFile, setPendingAnalysisFile] = useState<File | null>(null);
  const [pendingAnalysisLabel, setPendingAnalysisLabel] = useState<string | null>(null);
  
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
      } catch (error) {
        console.error('Nie udało się wygenerować komentarza IDA (LLM):', error);
      } finally {
        setIsGeneratingHumanComment(false);
      }
    },
    [generateLLMComment]
  );

  const analyzeImage = async (file: File) => {
    setIsAnalyzing(true);
    try {
      console.log('Starting room analysis for file:', file.name);
      
      // Convert file to base64
      const base64 = await toBase64(file);
      console.log(`File converted to base64, length: ${base64.length} chars`);
      
      // Analyze room using MiniCPM-o-2.6
      const analysis = await analyzeRoom({ image: base64, metadata: { source: 'setup-room-step' } });
      
      console.log('Room analysis result:', analysis);
      
      setRoomAnalysis(analysis);
      setDetectedRoomType(analysis.detected_room_type);
      
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
      } else if (analysis.room_description) {
        void requestHumanComment(analysis.detected_room_type, analysis.room_description);
      }
      
    } catch (error) {
      console.error('Error analyzing room:', error);
      
      // Check if it's a timeout error (cold start)
      if (error instanceof Error && error.message.includes('408')) {
        alert('Model AI jest jeszcze ładowany (pierwsze uruchomienie). Spróbuj ponownie za chwilę.');
      }
    } finally {
      setIsAnalyzing(false);
      setPendingAnalysisFile(null);
      setPendingAnalysisLabel(null);
    }
  };

  const handleExampleSelect = async (imageUrl: string) => {
    try {
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
          roomDescription: 'Contemporary living room with minimalist design',
          comment: 'A minimalist living room with clean lines and neutral colors.',
          humanComment: 'Minimalistyczny salon z czystymi liniami i stonowanymi kolorami.'
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
        const base64 = await toBase64(file);
        
        // Blob URL for display
        const imageObjectUrl = URL.createObjectURL(blob);
        
        const newPhotos = [...uploadedPhotos, imageObjectUrl];
        const newPhotosBase64 = [...uploadedPhotosBase64, base64];
        
        setUploadedPhotos(newPhotos);
        setUploadedPhotosBase64(newPhotosBase64);
        setSelectedImage(imageObjectUrl);
        onUpdate(newPhotosBase64, metadata.roomType, metadata.roomName);
        
        // Set pre-computed data instantly
        setDetectedRoomType(metadata.roomType);
        setRoomName(metadata.roomName);
        setRoomAnalysis({
          detected_room_type: metadata.roomType,
          confidence: metadata.confidence,
          room_description: metadata.roomDescription,
          comment: metadata.comment,
          suggestions: []
        });
        setLlmComment({
          comment: metadata.comment,
          suggestions: []
        });
        setHumanComment(metadata.humanComment);
        setPendingAnalysisFile(null);
        setPendingAnalysisLabel(null);
      } else {
        // Custom image - prepare for analysis (manual trigger)
        const response = await fetch(imageUrl);
        const blob = await response.blob();
        const file = new File([blob], imageUrl.split('/').pop() || 'image.jpg', { type: blob.type });
        
        // Convert to base64
        const base64 = await toBase64(file);
        
        // Blob URL for display
        const imageObjectUrl = URL.createObjectURL(file);
        const newPhotos = [...uploadedPhotos, imageObjectUrl];
        const newPhotosBase64 = [...uploadedPhotosBase64, base64];
        
        setUploadedPhotos(newPhotos);
        setUploadedPhotosBase64(newPhotosBase64);
        setSelectedImage(imageObjectUrl);
        onUpdate(newPhotosBase64, detectedRoomType || '', roomName || '');
        setPendingAnalysisFile(file);
        setPendingAnalysisLabel(file.name || imageUrl);
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
      
      // Convert to base64 for API
      const base64 = await toBase64(file);
      
      // Add to uploaded photos (blob URL for display)
      const imageUrl = URL.createObjectURL(file);
      const newPhotos = [...uploadedPhotos, imageUrl];
      const newPhotosBase64 = [...uploadedPhotosBase64, base64];
      
      setUploadedPhotos(newPhotos);
      setUploadedPhotosBase64(newPhotosBase64);
      setSelectedImage(imageUrl);
      
      // Pass base64 to parent (for API usage)
      onUpdate(newPhotosBase64, detectedRoomType || '', roomName || '');
      setPendingAnalysisFile(file);
      setPendingAnalysisLabel(file.name || imageUrl);
      
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
      <GlassCard className="p-6 lg:p-8 min-h-[600px] max-h-[85vh] overflow-auto scrollbar-hide">
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

        {pendingAnalysisFile && (
          <div className="mb-6 p-4 glass-panel rounded-2xl border border-white/20">
            <p className="text-graphite font-modern mb-3">
              {language === 'pl'
                ? `Nowe zdjęcie "${pendingAnalysisLabel || pendingAnalysisFile.name}" czeka na analizę.`
                : `New photo "${pendingAnalysisLabel || pendingAnalysisFile.name}" is ready for analysis.`}
            </p>
            <GlassButton onClick={handleAnalyzePending} disabled={isAnalyzing}>
              {language === 'pl' ? 'Analizuj wybrane zdjęcie' : 'Analyze selected photo'}
            </GlassButton>
          </div>
        )}

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
        
        {detectedRoomType && !isAnalyzing && (
          <div className="mb-6 p-6 glass-panel rounded-2xl">
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 bg-gradient-to-r from-gold/20 to-champagne/20 rounded-full flex items-center justify-center flex-shrink-0">
                <div className="w-4 h-4 bg-gradient-to-r from-gold to-champagne rounded-full"></div>
              </div>
              <div className="flex-1">
                <p className="text-graphite font-modern font-bold text-lg mb-3">
                  {language === 'pl' ? 'IDA wykryła: ' : 'IDA detected: '}
                  <span className="text-gold">
                    {ROOM_TYPE_TRANSLATIONS[detectedRoomType] || detectedRoomType}
                  </span>
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowRoomTypeSelection(true)}
                    className="px-4 py-2 bg-white/10 hover:bg-white/20 text-graphite text-sm font-modern font-semibold rounded-xl transition-all duration-200 hover:scale-105 border border-white/20"
                  >
                    {language === 'pl' ? 'Zmień typ pomieszczenia' : 'Change room type'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* LLM Comment */}
        {llmComment && !isAnalyzing && (
          <div className="mb-6 p-6 glass-panel rounded-2xl">
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 bg-gradient-to-r from-gold/20 to-champagne/20 rounded-full flex items-center justify-center flex-shrink-0">
                <div className="w-4 h-4 bg-gradient-to-r from-gold to-champagne rounded-full"></div>
              </div>
              <div className="flex-1">
                <p className="text-graphite font-modern font-bold text-lg mb-3">
                  {language === 'pl' ? 'Komentarz IDA:' : 'IDA Comment:'}
                </p>
                <p className="text-sm text-graphite font-modern leading-relaxed bg-white/5 p-4 rounded-xl border border-white/10 mb-4">
                  {llmComment.comment}
                </p>
                
                {/* Human Polish comment from IDA */}
                {humanComment && (
                  <>
                    <p className="text-graphite font-modern font-bold text-lg mb-3">
                      {language === 'pl' ? 'Komentarz IDA po polsku:' : 'IDA Comment in Polish:'}
                    </p>
                    <p className="text-sm text-graphite font-modern leading-relaxed bg-gradient-to-r from-gold/10 to-champagne/10 p-4 rounded-xl border border-gold/20 mb-4">
                      {humanComment}
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
        {isGeneratingHumanComment && !humanComment && (
          <div className="mb-6 p-4 glass-panel rounded-2xl">
            <p className="text-graphite font-modern">
              {language === 'pl'
                ? 'IDA przygotowuje naturalny komentarz na podstawie Twojego zdjęcia...'
                : 'IDA is preparing a natural comment based on your photo...'}
            </p>
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
        <div className="glass-panel rounded-2xl p-8 border-2 border-dashed border-gold/30 hover:border-gold/50 transition-colors mb-6">
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
                {language === 'pl' ? 'Wybrane zdjęcie' : 'Selected photo'}
              </h3>
              <button
                onClick={() => {
                  setSelectedImage(null);
                  setDetectedRoomType(null);
                  setRoomAnalysis(null);
                  setLlmComment(null);
                  setHumanComment(null);
                  setRoomName('');
                }}
                className="text-sm text-silver-dark hover:text-gold transition-colors font-modern"
              >
                {language === 'pl' ? 'Zmień zdjęcie' : 'Change photo'}
              </button>
            </div>
            <div className="relative">
              <img 
                src={selectedImage} 
                alt={language === 'pl' ? 'Wybrane zdjęcie' : 'Selected photo'} 
                className="w-full max-w-md mx-auto rounded-xl shadow-lg"
              />
            </div>
          </div>
        )}

        <div className="flex justify-between">
          <GlassButton onClick={onBack} variant="secondary">
            <ArrowLeft size={18} />
            {language === 'pl' ? 'Wstecz' : 'Back'}
          </GlassButton>
          <GlassButton 
            onClick={() => {
              onUpdate(uploadedPhotosBase64, detectedRoomType, roomName);
              onNext();
            }}
            disabled={isAnalyzing || !detectedRoomType}
          >
            {isAnalyzing 
              ? (language === 'pl' ? 'Analizuje...' : 'Analyzing...')
              : (language === 'pl' ? 'Dalej' : 'Next')
            }
            <ArrowRight size={18} />
          </GlassButton>
        </div>
      </GlassCard>
    </motion.div>
  );
}

interface PreferenceSourceStepProps {
  sessionData?: SessionData;
  preferenceSource?: PreferenceSource | null;
  explicitPreferences?: RoomPreferencePayload;
  onBack: () => void;
  onContinue: (source: PreferenceSource, payload?: RoomPreferencePayload) => void;
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
  }
});

function PreferenceSourceStep({
  sessionData,
  preferenceSource,
  explicitPreferences,
  onBack,
  onContinue
}: PreferenceSourceStepProps) {
  const { language } = useLanguage();
  const [selectedSource, setSelectedSource] = useState<PreferenceSource | null>(preferenceSource ?? null);
  const [localPrefs, setLocalPrefs] = useState<RoomPreferencePayload>(() => buildDefaultPreferences(explicitPreferences));

  useEffect(() => {
    setSelectedSource(preferenceSource ?? null);
  }, [preferenceSource]);

  useEffect(() => {
    setLocalPrefs(buildDefaultPreferences(explicitPreferences));
  }, [explicitPreferences]);

  const ensureCompleteSelected = () => {
    if (selectedSource !== 'complete') {
      setSelectedSource('complete');
    }
  };

  const handleSemanticChange = (dimension: SemanticDimensionId, value: number) => {
    ensureCompleteSelected();
    setLocalPrefs((prev) => ({
      ...prev,
      semanticDifferential: {
        ...(prev.semanticDifferential || {}),
        [dimension]: value / 10
      }
    }));
  };

  const handlePaletteSelect = (paletteId: string) => {
    ensureCompleteSelected();
    setLocalPrefs((prev) => ({
      ...prev,
      colorsAndMaterials: {
        ...(prev.colorsAndMaterials || {}),
        selectedPalette: paletteId,
        topMaterials: prev.colorsAndMaterials?.topMaterials || []
      }
    }));
  };

  const toggleMaterial = (materialId: string) => {
    ensureCompleteSelected();
    setLocalPrefs((prev) => {
      const current = prev.colorsAndMaterials?.topMaterials || [];
      const exists = current.includes(materialId);
      const nextMaterials = exists
        ? current.filter((m) => m !== materialId)
        : current.length >= 3
          ? [...current.slice(1), materialId]
          : [...current, materialId];
      return {
        ...prev,
        colorsAndMaterials: {
          ...(prev.colorsAndMaterials || {}),
          topMaterials: nextMaterials
        }
      };
    });
  };

  type SensoryKey = 'music' | 'texture' | 'light';

  const handleSensorySelect = (key: SensoryKey, value: string) => {
    ensureCompleteSelected();
    setLocalPrefs((prev) => ({
      ...prev,
      sensoryPreferences: {
        ...(prev.sensoryPreferences || {}),
        [key]: value
      }
    }));
  };

  const hasProfileData = Boolean(
    sessionData?.colorsAndMaterials?.selectedPalette ||
      sessionData?.semanticDifferential ||
      (sessionData?.sensoryPreferences &&
        (sessionData.sensoryPreferences.music ||
          sessionData.sensoryPreferences.texture ||
          sessionData.sensoryPreferences.light))
  );

  const semanticComplete = Boolean(
    localPrefs.semanticDifferential &&
      (['warmth', 'brightness', 'complexity', 'texture'] as SemanticDimensionId[]).every(
        (key) => typeof localPrefs.semanticDifferential?.[key] === 'number'
      )
  );
  const paletteReady = Boolean(localPrefs.colorsAndMaterials?.selectedPalette);
  const materialsReady = (localPrefs.colorsAndMaterials?.topMaterials?.length || 0) > 0;
  const sensoryReady = Boolean(
    localPrefs.sensoryPreferences?.music &&
      localPrefs.sensoryPreferences?.texture &&
      localPrefs.sensoryPreferences?.light
  );
  const canSubmitComplete = semanticComplete && paletteReady && materialsReady && sensoryReady;

  const handleContinue = () => {
    if (!selectedSource) return;
    if (selectedSource === 'profile') {
      if (!hasProfileData) return;
      onContinue('profile');
      return;
    }
    if (selectedSource === 'complete' && canSubmitComplete) {
      onContinue('complete', localPrefs);
    }
  };

  const profilePaletteLabel = getPaletteLabel(sessionData?.colorsAndMaterials?.selectedPalette, language);
  const profileSemantic = sessionData?.semanticDifferential;
  const profileSensory = sessionData?.sensoryPreferences;
  const profilePreview = [
    profilePaletteLabel
      ? `${language === 'pl' ? 'Paleta' : 'Palette'}: ${profilePaletteLabel}`
      : null,
    profileSemantic
      ? `${language === 'pl' ? 'Ciepło' : 'Warmth'} ${Math.round((profileSemantic.warmth ?? 0) * 100)}%`
      : null,
    profileSensory?.music
      ? `${language === 'pl' ? 'Muzyka' : 'Music'}: ${profileSensory.music}`
      : null
  ].filter(Boolean);

  const sensoryOptionsMap: Record<SensoryKey, typeof MUSIC_PREFERENCES> = {
    music: MUSIC_PREFERENCES,
    texture: TEXTURE_PREFERENCES,
    light: LIGHT_PREFERENCES
  };

  const sensoryLabels: Record<SensoryKey, { pl: string; en: string }> = {
    music: { pl: 'Muzyka', en: 'Music' },
    texture: { pl: 'Tekstury', en: 'Textures' },
    light: { pl: 'Światło', en: 'Light' }
  };

  return (
    <motion.div
      key="preference_source"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
    >
      <GlassCard className="p-6 lg:p-8 min-h-[600px] max-h-[85vh] overflow-auto scrollbar-hide">
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
                ? 'Możemy użyć Twojego profilu lub zebrać krótkie odpowiedzi dla tego pokoju.'
                : 'We can reuse your core profile or capture quick answers just for this room.'}
            </p>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6 mb-8">
          <div
            className={`glass-panel rounded-2xl p-6 border transition-all ${
              selectedSource === 'profile'
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
              onClick={() => setSelectedSource('profile')}
              disabled={!hasProfileData}
            >
              {language === 'pl' ? 'Zastosuj profil' : 'Apply my profile'}
              <ArrowRight size={16} />
            </GlassButton>
          </div>

          <div
            className={`glass-panel rounded-2xl p-6 border transition-all ${
              selectedSource === 'complete'
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
            <GlassButton variant="secondary" onClick={() => setSelectedSource('complete')}>
              {language === 'pl' ? 'Wybierz tryb z pytaniami' : 'Switch to question mode'}
            </GlassButton>
          </div>
        </div>

        <div className="space-y-6 mb-8">
          <div className="glass-panel rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-nasalization text-graphite">
                {language === 'pl' ? '1. Nastrój pokoju' : '1. Room mood sliders'}
              </h4>
              <p className="text-xs text-silver-dark font-modern">
                {language === 'pl' ? 'Ustaw intuicyjnie' : 'Follow your intuition'}
              </p>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              {SEMANTIC_DIFFERENTIAL_DIMENSIONS.map((dimension) => {
                const semanticValue =
                  localPrefs.semanticDifferential?.[dimension.id as SemanticDimensionId] ??
                  DEFAULT_SEMANTIC_VALUE;
                return (
                  <div key={dimension.id} className="p-3 rounded-2xl border border-white/5 bg-white/5">
                    <p className="text-sm font-modern text-graphite mb-2">
                      {dimension.label[language]}
                    </p>
                    <div className="flex justify-between text-xs text-silver-dark mb-1 font-modern">
                      <span>{dimension.min.label[language]}</span>
                      <span>{dimension.max.label[language]}</span>
                    </div>
                    <GlassSlider
                      min={0}
                      max={10}
                      value={Math.round(semanticValue * 10)}
                      onChange={(value) => handleSemanticChange(dimension.id as SemanticDimensionId, value)}
                    />
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            <div className="glass-panel rounded-2xl p-6">
              <h4 className="text-lg font-nasalization text-graphite mb-4">
                {language === 'pl' ? '2a. Paleta bazowa' : '2a. Base palette'}
              </h4>
              <div className="grid grid-cols-2 gap-3">
                {COLOR_PALETTE_OPTIONS.map((palette) => {
                  const isSelected = localPrefs.colorsAndMaterials?.selectedPalette === palette.id;
                  return (
                    <button
                      type="button"
                      key={palette.id}
                      onClick={() => handlePaletteSelect(palette.id)}
                      className={`rounded-2xl border p-3 transition-all text-left ${
                        isSelected ? 'border-gold bg-gold/10 shadow-lg' : 'border-white/15 hover:border-gold/40'
                      }`}
                    >
                      <div className="flex gap-2 mb-2 h-8">
                        {palette.colors.map((color, idx) => (
                          <div key={idx} className="flex-1 rounded-lg" style={{ backgroundColor: color }} />
                        ))}
                      </div>
                      <p className="text-sm font-modern text-graphite text-center">
                        {palette.label[language]}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="glass-panel rounded-2xl p-6">
              <h4 className="text-lg font-nasalization text-graphite mb-4">
                {language === 'pl' ? '2b. Kluczowe materiały' : '2b. Signature materials'}
              </h4>
              <p className="text-xs text-silver-dark font-modern mb-3">
                {language === 'pl' ? 'Wybierz maksymalnie 3' : 'Pick up to three'}
              </p>
              <div className="flex flex-wrap gap-2">
                {MATERIAL_OPTIONS.map((option) => {
                  const isActive = localPrefs.colorsAndMaterials?.topMaterials?.includes(option.id);
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => toggleMaterial(option.id)}
                      className={`px-4 py-2 rounded-2xl border text-sm font-modern transition-all ${
                        isActive
                          ? 'border-gold bg-gold/10 text-graphite'
                          : 'border-white/20 text-silver-dark hover:border-gold/40'
                      }`}
                    >
                      {option.label[language]}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="glass-panel rounded-2xl p-6">
            <h4 className="text-lg font-nasalization text-graphite mb-4">
              {language === 'pl' ? '3. Szybkie preferencje sensoryczne' : '3. Quick sensory picks'}
            </h4>
            <div className="grid md:grid-cols-3 gap-4">
              {(['music', 'texture', 'light'] as SensoryKey[]).map((key) => (
                <div key={key} className="border border-white/10 rounded-2xl p-3">
                  <p className="text-xs uppercase tracking-[0.2em] text-silver-dark mb-2">
                    {sensoryLabels[key][language]}
                  </p>
                  <div className="flex flex-col gap-2">
                    {sensoryOptionsMap[key].map((option) => {
                      const isActive = localPrefs.sensoryPreferences?.[key] === option.id;
                      return (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => handleSensorySelect(key, option.id)}
                          className={`text-left px-3 py-2 rounded-xl text-sm transition-all ${
                            isActive
                              ? 'bg-gold/15 text-graphite border border-gold/40'
                              : 'bg-white/5 text-silver-dark border border-transparent hover:border-white/20'
                          }`}
                        >
                          {option.label[language]}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-between">
          <GlassButton onClick={onBack} variant="secondary">
            <ArrowLeft size={18} />
            {language === 'pl' ? 'Wstecz' : 'Back'}
          </GlassButton>
          <GlassButton
            onClick={handleContinue}
            disabled={
              !selectedSource ||
              (selectedSource === 'profile' && !hasProfileData) ||
              (selectedSource === 'complete' && !canSubmitComplete)
            }
          >
            {language === 'pl' ? 'Zapisz preferencje' : 'Apply preferences'}
            <ArrowRight size={18} />
          </GlassButton>
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

const TIME_OF_DAY_OPTIONS = [
  { id: 'morning', label: { pl: 'Rano', en: 'Morning' } },
  { id: 'afternoon', label: { pl: 'Popołudnie', en: 'Afternoon' } },
  { id: 'evening', label: { pl: 'Wieczór', en: 'Evening' } },
  { id: 'night', label: { pl: 'Noc', en: 'Night' } },
  { id: 'varies', label: { pl: 'Różnie', en: 'Varies' } }
];

const WITH_WHOM_OPTIONS = [
  { id: 'alone', label: { pl: 'Samodzielnie', en: 'Alone' } },
  { id: 'partner', label: { pl: 'Z partnerem/partnerką', en: 'With partner' } },
  { id: 'family', label: { pl: 'Z rodziną/dziećmi', en: 'With family/kids' } },
  { id: 'guests', label: { pl: 'Z gośćmi', en: 'With guests' } },
  { id: 'varies', label: { pl: 'Różnie', en: 'Varies' } }
];

const SATISFACTION_OPTIONS = [
  { id: 'great', emoji: '😊', label: { pl: 'Świetnie wspiera', en: 'Great support' } },
  { id: 'ok', emoji: '😐', label: { pl: 'Może być', en: 'It works' } },
  { id: 'difficult', emoji: '😕', label: { pl: 'Utrudnia', en: 'Needs help' } }
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
      <GlassCard className="p-6 lg:p-8 min-h-[600px] max-h-[85vh] overflow-auto scrollbar-hide">
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

        <div className="flex justify-between">
          <GlassButton onClick={onBack} variant="secondary">
            <ArrowLeft size={18} className="mr-2" />
            {language === 'pl' ? 'Wstecz' : 'Back'}
          </GlassButton>
          <GlassButton onClick={onNext}>
            {language === 'pl' ? 'Dalej' : 'Next'}
            <ArrowRight size={18} className="ml-2" />
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
      <GlassCard className="p-6 lg:p-8 min-h-[600px] max-h-[85vh] overflow-auto scrollbar-hide">
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
                <div key={activity.type} className="glass-panel rounded-2xl p-5 border border-white/10">
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

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs uppercase tracking-[0.2em] text-silver-dark">
                        {language === 'pl' ? 'Częstotliwość' : 'Frequency'}
                      </label>
                      <select
                        className="w-full mt-2 rounded-2xl border border-white/15 bg-white/5 px-4 py-2 text-sm text-graphite focus:border-gold focus:outline-none"
                        value={activity.frequency}
                        onChange={(e) => updateActivity(activity.type, { frequency: e.target.value })}
                      >
                        {FREQUENCY_OPTIONS.map((option) => (
                          <option key={option.id} value={option.id}>
                            {option.label[language]}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs uppercase tracking-[0.2em] text-silver-dark">
                        {language === 'pl' ? 'Pora dnia' : 'Time of day'}
                      </label>
                      <select
                        className="w-full mt-2 rounded-2xl border border-white/15 bg-white/5 px-4 py-2 text-sm text-graphite focus:border-gold focus:outline-none"
                        value={activity.timeOfDay}
                        onChange={(e) => updateActivity(activity.type, { timeOfDay: e.target.value })}
                      >
                        {TIME_OF_DAY_OPTIONS.map((option) => (
                          <option key={option.id} value={option.id}>
                            {option.label[language]}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs uppercase tracking-[0.2em] text-silver-dark">
                        {language === 'pl' ? 'Z kim?' : 'With whom?'}
                      </label>
                      <select
                        className="w-full mt-2 rounded-2xl border border-white/15 bg-white/5 px-4 py-2 text-sm text-graphite focus:border-gold focus:outline-none"
                        value={activity.withWhom}
                        onChange={(e) => updateActivity(activity.type, { withWhom: e.target.value })}
                      >
                        {WITH_WHOM_OPTIONS.map((option) => (
                          <option key={option.id} value={option.id}>
                            {option.label[language]}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs uppercase tracking-[0.2em] text-silver-dark mb-2 block">
                        {language === 'pl' ? 'Jak wspiera' : 'Support quality'}
                      </label>
                      <div className="flex gap-2">
                        {SATISFACTION_OPTIONS.map((option) => {
                          const isActive = activity.satisfaction === option.id;
                          return (
                            <button
                              key={option.id}
                              type="button"
                              onClick={() => updateActivity(activity.type, { satisfaction: option.id })}
                              className={`flex-1 rounded-2xl border py-2 text-sm transition-all ${
                                isActive
                                  ? 'border-gold bg-gold/10 text-graphite'
                                  : 'border-white/20 text-silver-dark hover:border-gold/30'
                              }`}
                            >
                              <span className="block text-xl">{option.emoji}</span>
                              <span>{option.label[language]}</span>
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
          <div className="glass-panel rounded-2xl p-6 border border-dashed border-white/15 text-center text-silver-dark font-modern mb-6">
            {language === 'pl'
              ? 'Zaznacz przynajmniej jedną aktywność, aby przejść dalej.'
              : 'Select at least one activity to continue.'}
          </div>
        )}

        <div className="flex justify-between mt-6">
          <GlassButton onClick={onBack} variant="secondary">
            <ArrowLeft size={18} className="mr-2" />
            {language === 'pl' ? 'Wstecz' : 'Back'}
          </GlassButton>
          <GlassButton onClick={handleNextStep} disabled={!hasSelectedActivities}>
            {language === 'pl' ? 'Dalej' : 'Next'}
            <ArrowRight size={18} className="ml-2" />
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
      <GlassCard className="p-8 text-center min-h-[600px] max-h-[85vh] overflow-auto scrollbar-hide">
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

        <div className="flex justify-center gap-4">
          <GlassButton onClick={onBack} variant="secondary">
            <ArrowLeft size={18} />
            {language === 'pl' ? 'Wstecz' : 'Back'}
          </GlassButton>
          <GlassButton onClick={onComplete} className="px-8" disabled={isSaving}>
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

