"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';
import { AwaDialogue } from '@/components/awa/AwaDialogue';
import { MoodGrid } from '@/components/research';
import { ACTIVITY_QUESTIONS, PAIN_POINTS } from '@/lib/questions/adaptive-questions';
import { ArrowRight, ArrowLeft, Camera, Activity, AlertCircle, Target, Image as ImageIcon } from 'lucide-react';
import { useModalAPI } from '@/hooks/useModalAPI';
import { saveRoom } from '@/lib/supabase-deep-personalization';
import { useSession } from '@/hooks';

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
  | 'prs_current'
  | 'usage_context'
  | 'activities'
  | 'pain_points'
  | 'social_dynamics'
  | 'room_swipes'
  | 'prs_target'
  | 'summary';

interface RoomData {
  name: string;
  roomType: string;
  usageType: 'solo' | 'shared';
  sharedWith?: string[];
  photos?: string[];
  prsCurrent?: { x: number; y: number };
  painPoints: string[];
  activities: string[];
  activitySatisfaction?: Record<string, string>;
  socialDynamics?: any;
  roomSwipes?: any[];
  prsTarget?: { x: number; y: number };
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
    'prs_current',
    'activities',
    'usage_context',
    'pain_points',
    // ...(roomData.usageType === 'shared' ? ['social_dynamics' as SetupStep] : []), // TODO: Implement social_dynamics step
    'room_swipes',
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
      
      // Try to save to Supabase, but don't block if it fails
      try {
        const savedRoom = await saveRoom({
          householdId,
          name: roomData.name,
          roomType: roomData.roomType,
          usageType: roomData.usageType,
          sharedWith: roomData.sharedWith || [],
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
          activities: (roomData.activities || []).map(id => ({ 
            type: id,
            frequency: 'daily',
            satisfaction: roomData.activitySatisfaction?.[id] || 'ok'
          }))
        });
        
        if (savedRoom) {
          console.log('[RoomSetup] Room saved with ID:', savedRoom.id);
        }
      } catch (dbError) {
        console.warn('[RoomSetup] Could not save to DB (migrations not applied?), continuing anyway:', dbError);
        // Continue to generate even if DB save fails
      }
      
      console.log('[RoomSetup] Navigating to generate flow');
      
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
                selected={roomData.activities}
                satisfaction={roomData.activitySatisfaction}
                onUpdate={(activities: string[], satisfaction: Record<string, string>) => 
                  setRoomData({ ...roomData, activities, activitySatisfaction: satisfaction })
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

            {currentStep === 'room_swipes' && (
              <RoomSwipesStep 
                roomType={roomData.roomType}
                onComplete={(swipes: any[]) => {
                  setRoomData({ ...roomData, roomSwipes: swipes });
                  handleNext();
                }}
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
  const { analyzeRoom } = useModalAPI();
  const [uploadedPhotos, setUploadedPhotos] = useState<string[]>(photos || []);
  const [uploadedPhotosBase64, setUploadedPhotosBase64] = useState<string[]>([]); // Store base64 for API
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [roomAnalysis, setRoomAnalysis] = useState<any>(null);
  const [detectedRoomType, setDetectedRoomType] = useState<string | null>(null);
  const [llmComment, setLlmComment] = useState<{ comment: string; suggestions: string[]; } | null>(null);
  const [humanComment, setHumanComment] = useState<string | null>(null);
  const [showRoomTypeSelection, setShowRoomTypeSelection] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  
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

  const analyzeImage = async (file: File) => {
    setIsAnalyzing(true);
    try {
      console.log('Starting room analysis for file:', file.name);
      
      // Convert file to base64
      const base64 = await toBase64(file);
      console.log(`File converted to base64, length: ${base64.length} chars`);
      
      // Analyze room using MiniCPM-o-2.6
      const analysis = await analyzeRoom({ image: base64 });
      
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
      
      // Set human Polish comment if available
      if (analysis.human_comment) {
        setHumanComment(analysis.human_comment);
      }
      
    } catch (error) {
      console.error('Error analyzing room:', error);
      
      // Check if it's a timeout error (cold start)
      if (error instanceof Error && error.message.includes('408')) {
        alert('Model AI jest jeszcze ładowany (pierwsze uruchomienie). Spróbuj ponownie za chwilę.');
      }
    } finally {
      setIsAnalyzing(false);
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
        onUpdate(newPhotosBase64);
        
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
      } else {
        // Custom image - analyze with Gemma
        setIsAnalyzing(true);
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
        onUpdate(newPhotosBase64);
        
        await analyzeImage(file);
      }
    } catch (error) {
      console.error("Error fetching example image", error);
      alert("Błąd podczas ładowania przykładowego zdjęcia");
    } finally {
      setIsAnalyzing(false);
    }
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
      onUpdate(newPhotosBase64);
      
      // Automatically analyze the room
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

function ActivitiesStep({ roomType, selected, satisfaction, onUpdate, onNext, onBack }: any) {
  const { t, language } = useLanguage();
  const [selectedActivities, setSelectedActivities] = useState<string[]>(selected || []);
  const [activitySatisfaction, setActivitySatisfaction] = useState<Record<string, string>>(satisfaction || {});

  const activities = ACTIVITY_QUESTIONS[roomType] || ACTIVITY_QUESTIONS.default;

  const toggleActivity = (id: string) => {
    const updated = selectedActivities.includes(id)
      ? selectedActivities.filter(a => a !== id)
      : [...selectedActivities, id];
    setSelectedActivities(updated);
  };

  const setSatisfaction = (activityId: string, level: string) => {
    const updated = { ...activitySatisfaction, [activityId]: level };
    setActivitySatisfaction(updated);
  };

  const handleNext = () => {
    onUpdate(selectedActivities, activitySatisfaction);
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
          <h2 className="text-2xl lg:text-3xl font-nasalization text-graphite">
            {language === 'pl' ? 'Co Tu Robisz?' : 'What Do You Do Here?'}
          </h2>
        </div>

        <p className="text-graphite font-modern mb-6">
          {language === 'pl'
            ? 'Wybierz wszystkie aktywności które wykonujesz w tym pokoju'
            : 'Select all activities you do in this room'}
        </p>

        {/* Activity selection */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-8">
          {activities.map((activity) => {
            const isSelected = selectedActivities.includes(activity.id);
            return (
              <button
                key={activity.id}
                onClick={() => toggleActivity(activity.id)}
                className={`glass-panel rounded-xl p-4 transition-all duration-300 ${
                  isSelected
                    ? 'border-2 border-gold bg-gold/10 scale-105'
                    : 'border border-white/30 hover:border-gold/30'
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

        {/* Satisfaction ratings for selected activities */}
        {selectedActivities.length > 0 && (
          <div className="glass-panel rounded-xl p-6 mb-6">
            <p className="text-sm font-semibold text-graphite mb-4">
              {language === 'pl' 
                ? 'Jak dobrze pokój wspiera każdą aktywność?' 
                : 'How well does the room support each activity?'}
            </p>
            
            <div className="space-y-4">
              {selectedActivities.map((activityId) => {
                const activity = activities.find((a: any) => a.id === activityId);
                if (!activity) return null;

                return (
                  <div key={activityId} className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{activity.icon}</span>
                      <span className="text-sm font-modern text-graphite">{t(activity.label)}</span>
                    </div>
                    <div className="flex gap-2">
                      {[
                        { id: 'great', emoji: '😊', label: language === 'pl' ? 'Świetnie' : 'Great' },
                        { id: 'ok', emoji: '😐', label: language === 'pl' ? 'OK' : 'OK' },
                        { id: 'difficult', emoji: '😕', label: language === 'pl' ? 'Trudno' : 'Difficult' }
                      ].map((level) => (
                        <button
                          key={level.id}
                          onClick={() => setSatisfaction(activityId, level.id)}
                          className={`w-12 h-12 rounded-xl transition-all duration-300 ${
                            activitySatisfaction[activityId] === level.id
                              ? 'glass-panel border-2 border-gold bg-gold/10 scale-110'
                              : 'glass-panel border border-white/30 hover:scale-105'
                          }`}
                          title={level.label}
                        >
                          <span className="text-xl">{level.emoji}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="flex justify-between">
          <GlassButton onClick={onBack} variant="secondary">
            <ArrowLeft size={18} className="mr-2" />
            {language === 'pl' ? 'Wstecz' : 'Back'}
          </GlassButton>
          <GlassButton 
            onClick={handleNext}
            disabled={selectedActivities.length === 0}
          >
            {language === 'pl' ? 'Dalej' : 'Next'}
            <ArrowRight size={18} className="ml-2" />
          </GlassButton>
        </div>
      </GlassCard>
    </motion.div>
  );
}

function RoomSwipesStep({ roomType, onComplete, onBack }: any) {
  const { language } = useLanguage();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [swipes, setSwipes] = useState<Array<{ image: string; action: 'like' | 'dislike'; timestamp: number }>>([]);
  const [isDragging, setIsDragging] = useState(false);

  // Mock room-specific images - in real app these would come from API
  const roomImages = Array.from({ length: 30 }, (_, i) => ({
    id: i + 1,
    url: `https://picsum.photos/400/600?random=${i + 1}`,
    roomType: roomType
  }));

  const currentImage = roomImages[currentImageIndex];

  const handleDragEnd = (event: any, info: any) => {
    setIsDragging(false);
    
    if (info.offset.x > 100) {
      // Swipe right - like
      handleSwipe('like');
    } else if (info.offset.x < -100) {
      // Swipe left - dislike
      handleSwipe('dislike');
    }
  };

  const handleSwipe = (action: 'like' | 'dislike') => {
    if (!currentImage) return;

    const newSwipe = {
      image: currentImage.url,
      action,
      timestamp: Date.now()
    };

    setSwipes([...swipes, newSwipe]);
    
    if (currentImageIndex < roomImages.length - 1) {
      setCurrentImageIndex(currentImageIndex + 1);
    } else {
      // All images swiped
      onComplete(swipes);
    }
  };

  const handleLike = () => handleSwipe('like');
  const handleDislike = () => handleSwipe('dislike');

  return (
    <motion.div
      key="room_swipes"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
    >
      <GlassCard className="p-6 lg:p-8 min-h-[600px] max-h-[85vh] overflow-auto scrollbar-hide">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-gold to-champagne flex items-center justify-center">
            <ImageIcon size={24} className="text-white" />
          </div>
          <h2 className="text-2xl lg:text-3xl font-nasalization text-graphite">
            {language === 'pl' ? 'Twój Styl Wnętrza' : 'Your Interior Style'}
          </h2>
        </div>

        <p className="text-graphite font-modern mb-6">
          {language === 'pl'
            ? `30 obrazów wnętrz ${roomType === 'bedroom' ? 'sypialni' : roomType === 'kitchen' ? 'kuchni' : roomType === 'living_room' ? 'salonów' : 'pomieszczeń'}. Reaguj sercem!`
            : `30 ${roomType} interior images. React with your heart!`}
        </p>

        {/* Progress */}
        <div className="mb-6">
          <div className="flex justify-between text-sm text-silver-dark mb-2 font-modern">
            <span>{language === 'pl' ? 'Obraz' : 'Image'} {currentImageIndex + 1} / {roomImages.length}</span>
            <span>{Math.round(((currentImageIndex + 1) / roomImages.length) * 100)}%</span>
          </div>
          <div className="glass-panel rounded-full h-2 overflow-hidden">
            <motion.div 
              className="h-full bg-gradient-to-r from-gold via-champagne to-gold"
              initial={{ width: 0 }}
              animate={{ width: `${((currentImageIndex + 1) / roomImages.length) * 100}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>

        {/* Tinder Card */}
        <div className="relative h-96 mb-8">
          <AnimatePresence>
            {currentImage && (
              <motion.div
                key={currentImage.id}
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                onDragEnd={handleDragEnd}
                onDragStart={() => setIsDragging(true)}
                initial={{ scale: 0, rotate: 0 }}
                animate={{ scale: 1, rotate: 0 }}
                exit={{ scale: 0, opacity: 0, transition: { duration: 0.2 } }}
                whileDrag={{ scale: 1.05, rotate: 5 }}
                style={{ touchAction: 'none' }}
                className="absolute inset-0 glass-panel rounded-2xl overflow-hidden cursor-grab active:cursor-grabbing"
              >
                <img
                  src={currentImage.url}
                  alt={`${roomType} interior ${currentImageIndex + 1}`}
                  className="w-full h-full object-cover"
                  draggable={false}
                />
                
                {/* Overlay for drag feedback */}
                {isDragging && (
                  <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                    <div className="text-white font-modern font-bold text-lg">
                      {language === 'pl' ? 'Przeciągnij w prawo/lewo' : 'Drag right/left'}
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-center gap-8 mb-6">
          <button
            onClick={handleDislike}
            className="w-16 h-16 rounded-full glass-panel border-2 border-red-400 hover:border-red-500 flex items-center justify-center transition-all duration-200 hover:scale-110 z-10"
          >
            <span className="text-2xl">👎</span>
          </button>
          
          <button
            onClick={handleLike}
            className="w-16 h-16 rounded-full glass-panel border-2 border-green-400 hover:border-green-500 flex items-center justify-center transition-all duration-200 hover:scale-110 z-10"
          >
            <span className="text-2xl">👍</span>
          </button>
        </div>

        <div className="flex justify-between">
          <GlassButton onClick={onBack} variant="secondary">
            <ArrowLeft size={18} />
            {language === 'pl' ? 'Wstecz' : 'Back'}
          </GlassButton>
          <GlassButton onClick={() => onComplete(swipes)}>
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

