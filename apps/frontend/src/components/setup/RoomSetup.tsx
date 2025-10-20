"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';
import { AwaContainer } from '@/components/awa/AwaContainer';
import { MoodGrid } from '@/components/research';
import { ACTIVITY_QUESTIONS, PAIN_POINTS } from '@/lib/questions/adaptive-questions';
import { ArrowRight, ArrowLeft, Camera, Activity, AlertCircle, Target, Image as ImageIcon } from 'lucide-react';

type SetupStep = 
  | 'room_basics'
  | 'photo_upload'
  | 'prs_current'
  | 'pain_points'
  | 'activities'
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
  
  const [currentStep, setCurrentStep] = useState<SetupStep>('room_basics');
  const [roomData, setRoomData] = useState<RoomData>({
    name: '',
    roomType: '',
    usageType: 'solo',
    painPoints: [],
    activities: []
  });

  const steps: SetupStep[] = [
    'room_basics',
    'photo_upload',
    'prs_current',
    'pain_points',
    'activities',
    ...(roomData.usageType === 'shared' ? ['social_dynamics' as SetupStep] : []),
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
    // TODO: Save to Supabase rooms table
    console.log('Saving room:', roomData);
    
    // Navigate to design session for this room
    router.push(`/design/new-room-id`);
  };

  return (
    <div className="min-h-screen flex flex-col w-full relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-radial from-pearl-50 via-platinum-50 to-silver-100 -z-10" />
      
      <AwaContainer 
        currentStep="onboarding" 
        showDialogue={false}
        fullWidth={true}
        autoHide={false}
      />

      <div className="flex-1 p-4 lg:p-8">
        <div className="max-w-4xl mx-auto">
          {/* Progress */}
          <div className="mb-8">
            <div className="flex items-center justify-between text-sm text-silver-dark mb-2 font-modern">
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
            {currentStep === 'room_basics' && (
              <RoomBasicsStep 
                data={roomData}
                onUpdate={setRoomData}
                onNext={handleNext}
              />
            )}

            {currentStep === 'photo_upload' && (
              <PhotoUploadStep 
                photos={roomData.photos}
                onUpdate={(photos: string[]) => setRoomData({ ...roomData, photos })}
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
                      ? 'Gdzie jest TEN pokój teraz?'
                      : 'Where is THIS room now?'}
                  </p>
                  
                  <MoodGrid 
                    initialPosition={roomData.prsCurrent}
                    onPositionChange={(pos) => setRoomData({ ...roomData, prsCurrent: pos })}
                    mode="current"
                  />

                  <div className="flex justify-between mt-6">
                    <GlassButton onClick={handleBack} variant="secondary">
                      <ArrowLeft size={18} className="mr-2" />
                      {language === 'pl' ? 'Wstecz' : 'Back'}
                    </GlassButton>
                    <GlassButton 
                      onClick={handleNext}
                      disabled={!roomData.prsCurrent}
                    >
                      {language === 'pl' ? 'Dalej' : 'Next'}
                      <ArrowRight size={18} className="ml-2" />
                    </GlassButton>
                  </div>
                </GlassCard>
              </motion.div>
            )}

            {currentStep === 'pain_points' && (
              <PainPointsStep 
                selected={roomData.painPoints}
                onUpdate={(points: string[]) => setRoomData({ ...roomData, painPoints: points })}
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
                      ? 'Gdzie POWINIEN być ten pokój idealnie?'
                      : 'Where SHOULD this room be ideally?'}
                  </p>
                  
                  <MoodGrid 
                    initialPosition={roomData.prsTarget}
                    onPositionChange={(pos) => setRoomData({ ...roomData, prsTarget: pos })}
                    mode="target"
                  />

                  <div className="flex justify-between mt-6">
                    <GlassButton onClick={handleBack} variant="secondary">
                      <ArrowLeft size={18} className="mr-2" />
                      {language === 'pl' ? 'Wstecz' : 'Back'}
                    </GlassButton>
                    <GlassButton 
                      onClick={handleNext}
                      disabled={!roomData.prsTarget}
                    >
                      {language === 'pl' ? 'Dalej' : 'Next'}
                      <ArrowRight size={18} className="ml-2" />
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
              />
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

// ========== STEP COMPONENTS ==========

function RoomBasicsStep({ data, onUpdate, onNext }: any) {
  const { language } = useLanguage();

  return (
    <motion.div
      key="room_basics"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
    >
      <GlassCard className="p-6 lg:p-8">
        <h2 className="text-2xl lg:text-3xl font-nasalization text-graphite mb-6">
          {language === 'pl' ? 'Jaki To Pokój?' : 'What Room Is This?'}
        </h2>

        <div className="space-y-6">
          {/* Room name */}
          <div>
            <label className="block text-sm font-semibold text-graphite mb-2">
              {language === 'pl' ? 'Nazwa pokoju' : 'Room name'}
            </label>
            <input
              type="text"
              value={data.name}
              onChange={(e) => onUpdate({ ...data, name: e.target.value })}
              placeholder={language === 'pl' ? 'np. Sypialnia główna, Salon...' : 'e.g. Master Bedroom, Living Room...'}
              className="w-full glass-panel rounded-xl p-4 font-modern text-graphite placeholder-silver-dark focus:outline-none focus:border-gold/50 transition-colors"
            />
          </div>

          {/* Room type */}
          <div>
            <label className="block text-sm font-semibold text-graphite mb-3">
              {language === 'pl' ? 'Typ pokoju' : 'Room type'}
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {[
                { id: 'bedroom', label: language === 'pl' ? 'Sypialnia' : 'Bedroom', icon: '🛏️' },
                { id: 'living_room', label: language === 'pl' ? 'Salon' : 'Living Room', icon: '🛋️' },
                { id: 'kitchen', label: language === 'pl' ? 'Kuchnia' : 'Kitchen', icon: '🍳' },
                { id: 'bathroom', label: language === 'pl' ? 'Łazienka' : 'Bathroom', icon: '🛁' },
                { id: 'home_office', label: language === 'pl' ? 'Biuro' : 'Home Office', icon: '💼' },
                { id: 'dining_room', label: language === 'pl' ? 'Jadalnia' : 'Dining Room', icon: '🍽️' },
                { id: 'kids_room', label: language === 'pl' ? 'Pokój dziecka' : 'Kids Room', icon: '🧸' },
                { id: 'other', label: language === 'pl' ? 'Inne' : 'Other', icon: '🏠' }
              ].map((type) => (
                <button
                  key={type.id}
                  onClick={() => onUpdate({ ...data, roomType: type.id })}
                  className={`glass-panel rounded-xl p-4 transition-all duration-300 ${
                    data.roomType === type.id
                      ? 'border-2 border-gold bg-gold/10 scale-105'
                      : 'border border-white/30 hover:border-gold/30'
                  }`}
                >
                  <div className="text-3xl mb-2">{type.icon}</div>
                  <p className="text-xs font-modern text-graphite">{type.label}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Usage type */}
          <div>
            <label className="block text-sm font-semibold text-graphite mb-3">
              {language === 'pl' ? 'Kto używa tego pokoju?' : 'Who uses this room?'}
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => onUpdate({ ...data, usageType: 'solo' })}
                className={`glass-panel rounded-xl p-4 transition-all duration-300 ${
                  data.usageType === 'solo'
                    ? 'border-2 border-gold bg-gold/10'
                    : 'border border-white/30 hover:border-gold/30'
                }`}
              >
                <div className="text-3xl mb-2">🧑</div>
                <p className="text-sm font-modern text-graphite">
                  {language === 'pl' ? 'Tylko ja' : 'Just me'}
                </p>
              </button>

              <button
                onClick={() => onUpdate({ ...data, usageType: 'shared' })}
                className={`glass-panel rounded-xl p-4 transition-all duration-300 ${
                  data.usageType === 'shared'
                    ? 'border-2 border-gold bg-gold/10'
                    : 'border border-white/30 hover:border-gold/30'
                }`}
              >
                <div className="text-3xl mb-2">👥</div>
                <p className="text-sm font-modern text-graphite">
                  {language === 'pl' ? 'Dzielony' : 'Shared'}
                </p>
              </button>
            </div>
          </div>
        </div>

        <div className="flex justify-end mt-8">
          <GlassButton 
            onClick={onNext}
            disabled={!data.name.trim() || !data.roomType}
          >
            {language === 'pl' ? 'Dalej' : 'Next'}
            <ArrowRight size={18} className="ml-2" />
          </GlassButton>
        </div>
      </GlassCard>
    </motion.div>
  );
}

function PhotoUploadStep({ photos, onUpdate, onNext, onBack }: any) {
  const { language } = useLanguage();
  const [uploadedPhotos, setUploadedPhotos] = useState<string[]>(photos || []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    // TODO: Process and upload photos
    console.log('Files selected:', files.length);
  };

  return (
    <motion.div
      key="photo_upload"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
    >
      <GlassCard className="p-6 lg:p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-400 to-cyan-500 flex items-center justify-center">
            <Camera size={24} className="text-white" />
          </div>
          <h2 className="text-2xl lg:text-3xl font-nasalization text-graphite">
            {language === 'pl' ? 'Pokaż Nam Pokój' : 'Show Us the Room'}
          </h2>
        </div>

        <p className="text-graphite font-modern mb-6">
          {language === 'pl'
            ? 'Prześlij 2-3 zdjęcia obecnego stanu pokoju. IDA przeanalizuje je i pomoże zrozumieć co możemy poprawić.'
            : 'Upload 2-3 photos of the current room state. IDA will analyze them and help understand what we can improve.'}
        </p>

        {/* Upload Area */}
        <div className="glass-panel rounded-2xl p-8 border-2 border-dashed border-gold/30 hover:border-gold/50 transition-colors mb-6">
          <label className="cursor-pointer flex flex-col items-center">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-gold to-champagne flex items-center justify-center mb-4">
              <Camera size={32} className="text-white" />
            </div>
            <p className="text-graphite font-semibold mb-2">
              {language === 'pl' ? 'Kliknij aby dodać zdjęcia' : 'Click to add photos'}
            </p>
            <p className="text-sm text-silver-dark">
              {language === 'pl' ? 'Lub przeciągnij i upuść' : 'Or drag and drop'}
            </p>
            <input
              type="file"
              accept="image/*"
              multiple
              max={3}
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
        </div>

        {/* Photo preview placeholder */}
        {uploadedPhotos.length > 0 && (
          <div className="grid grid-cols-3 gap-3 mb-6">
            {uploadedPhotos.map((photo, i) => (
              <div key={i} className="aspect-square glass-panel rounded-xl bg-gray-200" />
            ))}
          </div>
        )}

        <div className="flex justify-between">
          <GlassButton onClick={onBack} variant="secondary">
            <ArrowLeft size={18} className="mr-2" />
            {language === 'pl' ? 'Wstecz' : 'Back'}
          </GlassButton>
          <GlassButton 
            onClick={() => {
              onUpdate(uploadedPhotos);
              onNext();
            }}
          >
            {language === 'pl' ? 'Dalej' : 'Next'}
            <ArrowRight size={18} className="ml-2" />
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
      <GlassCard className="p-6 lg:p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-400 to-orange-500 flex items-center justify-center">
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
                className={`glass-panel rounded-xl p-4 transition-all duration-300 ${
                  isSelected
                    ? 'border-2 border-gold bg-gold/10 scale-105'
                    : 'border border-white/30 hover:border-gold/30'
                }`}
              >
                <div className="text-3xl mb-2">{point.icon}</div>
                <p className="text-xs font-modern text-graphite">{t(point.label)}</p>
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
      <GlassCard className="p-6 lg:p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center">
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
                <div className="text-3xl mb-2">{activity.icon}</div>
                <p className="text-xs font-modern text-graphite">{t(activity.label)}</p>
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

  return (
    <motion.div
      key="room_swipes"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
    >
      <GlassCard className="p-6 lg:p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-pink-400 to-rose-500 flex items-center justify-center">
            <ImageIcon size={24} className="text-white" />
          </div>
          <h2 className="text-2xl lg:text-3xl font-nasalization text-graphite">
            {language === 'pl' ? 'Visual DNA Pokoju' : 'Room Visual DNA'}
          </h2>
        </div>

        <p className="text-graphite font-modern mb-6">
          {language === 'pl'
            ? `30 obrazów - tylko ${roomType}. Reaguj sercem!`
            : `30 images - only ${roomType}. React with your heart!`}
        </p>

        {/* TODO: Implement room-specific Tinder swipes */}
        <div className="glass-panel rounded-xl p-12 text-center text-silver-dark mb-6">
          <ImageIcon size={48} className="mx-auto mb-4 text-gold" />
          <p>{language === 'pl' ? 'Room-specific swipes - do implementacji' : 'Room-specific swipes - to be implemented'}</p>
        </div>

        <div className="flex justify-between">
          <GlassButton onClick={onBack} variant="secondary">
            <ArrowLeft size={18} className="mr-2" />
            {language === 'pl' ? 'Wstecz' : 'Back'}
          </GlassButton>
          <GlassButton onClick={() => onComplete([])}>
            {language === 'pl' ? 'Dalej' : 'Next'}
            <ArrowRight size={18} className="ml-2" />
          </GlassButton>
        </div>
      </GlassCard>
    </motion.div>
  );
}

function RoomSummaryStep({ data, onComplete, onBack }: any) {
  const { language } = useLanguage();

  return (
    <motion.div
      key="summary"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
    >
      <GlassCard className="p-8 text-center">
        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center">
          <Target size={40} className="text-white" />
        </div>

        <h2 className="text-3xl lg:text-4xl font-nasalization bg-gradient-to-r from-green-600 to-emerald-500 bg-clip-text text-transparent mb-4">
          {language === 'pl' ? 'Pokój Gotowy!' : 'Room Ready!'}
        </h2>

        <p className="text-graphite font-modern mb-8 max-w-xl mx-auto">
          {language === 'pl'
            ? `Świetnie! "${data.name}" jest gotowy do projektowania. IDA ma wszystko czego potrzebuje aby stworzyć wnętrze które naprawdę pasuje do Ciebie.`
            : `Great! "${data.name}" is ready to design. IDA has everything needed to create an interior that truly fits you.`}
        </p>

        <div className="flex justify-center gap-4">
          <GlassButton onClick={onBack} variant="secondary">
            <ArrowLeft size={18} className="mr-2" />
            {language === 'pl' ? 'Wstecz' : 'Back'}
          </GlassButton>
          <GlassButton onClick={onComplete} className="px-8">
            {language === 'pl' ? 'Zacznij Projektowanie' : 'Start Designing'}
            <ArrowRight size={18} className="ml-2" />
          </GlassButton>
        </div>
      </GlassCard>
    </motion.div>
  );
}

