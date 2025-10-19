"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useSessionData } from '@/hooks/useSessionData';
import { useLanguage } from '@/contexts/LanguageContext';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';
import { GlassSlider } from '@/components/ui/GlassSlider';
import { AwaContainer } from '@/components/awa/AwaContainer';
import { AwaDialogue } from '@/components/awa/AwaDialogue';
import { 
  MoodGrid,
  BiophiliaTest,
  SensoryTestSuite,
  NatureMetaphorTest
} from '@/components/research';
import { SEMANTIC_DIFFERENTIAL_DIMENSIONS } from '@/lib/questions/validated-scales';
import { ArrowRight, ArrowLeft, Check, Sparkles, Heart, Zap } from 'lucide-react';

type WizardStep = 
  | 'welcome'
  | 'lifestyle'
  | 'tinder_swipes'
  | 'semantic_diff'
  | 'colors_materials'
  | 'sensory_tests'
  | 'nature_metaphor'
  | 'prs_ideal'
  | 'biophilia'
  | 'summary';

interface CoreProfileData {
  lifestyle?: {
    livingSituation: string;
    lifeVibe: string;
    goals: string[];
  };
  tinderSwipes?: Array<{
    imageId: string;
    direction: 'left' | 'right';
    dwellTime: number;
  }>;
  semanticDifferential?: {
    warmth: number;
    brightness: number;
    complexity: number;
    texture: number;
  };
  colorsAndMaterials?: {
    selectedPalette: string;
    topMaterials: string[];
  };
  sensoryPreferences?: {
    music: string;
    texture: string;
    light: string;
  };
  natureMetaphor?: string;
  prsIdeal?: { x: number; y: number };
  biophiliaScore?: number;
}

/**
 * CoreProfileWizard - One-time comprehensive user profiling
 * 
 * Collects:
 * - Lifestyle & values
 * - Implicit preferences (Tinder swipes)
 * - Explicit preferences (semantic differential, colors, materials)
 * - Sensory preferences (music, texture, light)
 * - Projective data (nature metaphor)
 * - Psychological baseline (PRS ideal, biophilia)
 * 
 * Takes ~12-15 minutes, saved forever, reused for all rooms
 */
export function CoreProfileWizard() {
  const router = useRouter();
  const { updateSessionData } = useSessionData();
  const { language } = useLanguage();
  
  const [currentStep, setCurrentStep] = useState<WizardStep>('welcome');
  const [profileData, setProfileData] = useState<CoreProfileData>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const steps: WizardStep[] = [
    'welcome',
    'lifestyle',
    'tinder_swipes',
    'semantic_diff',
    'colors_materials',
    'sensory_tests',
    'nature_metaphor',
    'prs_ideal',
    'biophilia',
    'summary'
  ];

  const currentStepIndex = steps.indexOf(currentStep);
  const progress = ((currentStepIndex + 1) / steps.length) * 100;

  const updateProfile = (data: Partial<CoreProfileData>) => {
    setProfileData(prev => ({ ...prev, ...data }));
  };

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
    setIsSubmitting(true);
    
    try {
      // Save to user profile in database
      await updateSessionData({
        coreProfile: profileData,
        coreProfileCompletedAt: new Date().toISOString()
      });

      // Navigate to dashboard or next step
      router.push('/dashboard');
    } catch (error) {
      console.error('Failed to save core profile:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col w-full">
      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-4xl mx-auto">
          {/* Progress Bar */}
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
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </div>

          {/* Step Content */}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              {currentStep === 'welcome' && (
                <WelcomeStep onNext={handleNext} />
              )}

              {currentStep === 'lifestyle' && (
                <LifestyleStep 
                  data={profileData.lifestyle}
                  onUpdate={(data) => updateProfile({ lifestyle: data })}
                  onNext={handleNext}
                  onBack={handleBack}
                />
              )}

              {currentStep === 'tinder_swipes' && (
                <TinderSwipesStep 
                  onComplete={(swipes) => {
                    updateProfile({ tinderSwipes: swipes });
                    handleNext();
                  }}
                  onBack={handleBack}
                />
              )}

              {currentStep === 'semantic_diff' && (
                <SemanticDifferentialStep 
                  data={profileData.semanticDifferential}
                  onUpdate={(data) => updateProfile({ semanticDifferential: data })}
                  onNext={handleNext}
                  onBack={handleBack}
                />
              )}

              {currentStep === 'colors_materials' && (
                <ColorsMaterialsStep 
                  data={profileData.colorsAndMaterials}
                  onUpdate={(data) => updateProfile({ colorsAndMaterials: data })}
                  onNext={handleNext}
                  onBack={handleBack}
                />
              )}

              {currentStep === 'sensory_tests' && (
                <div>
                  <SensoryTestSuite 
                    onComplete={(results) => {
                      updateProfile({ sensoryPreferences: results });
                      handleNext();
                    }}
                  />
                  <div className="flex justify-between mt-6">
                    <GlassButton onClick={handleBack} variant="secondary">
                      <ArrowLeft size={18} className="mr-2" />
                      {language === 'pl' ? 'Wstecz' : 'Back'}
                    </GlassButton>
                  </div>
                </div>
              )}

              {currentStep === 'nature_metaphor' && (
                <div>
                  <NatureMetaphorTest 
                    onSelect={(id) => updateProfile({ natureMetaphor: id })}
                  />
                  <div className="flex justify-between mt-6">
                    <GlassButton onClick={handleBack} variant="secondary">
                      <ArrowLeft size={18} className="mr-2" />
                      {language === 'pl' ? 'Wstecz' : 'Back'}
                    </GlassButton>
                    <GlassButton 
                      onClick={handleNext}
                      disabled={!profileData.natureMetaphor}
                    >
                      {language === 'pl' ? 'Dalej' : 'Next'}
                      <ArrowRight size={18} className="ml-2" />
                    </GlassButton>
                  </div>
                </div>
              )}

              {currentStep === 'prs_ideal' && (
                <div>
                  <GlassCard className="p-6 lg:p-8 mb-6">
                    <div className="text-center mb-6">
                      <h2 className="text-2xl lg:text-3xl font-nasalization bg-gradient-to-r from-gold to-champagne bg-clip-text text-transparent mb-2">
                        {language === 'pl' ? 'Twoja Idealna Przestrzeń' : 'Your Ideal Space'}
                      </h2>
                      <p className="text-graphite font-modern">
                        {language === 'pl'
                          ? 'Gdzie chciałbyś żeby Twoje przestrzenie były idealnie?'
                          : 'Where would you like your spaces to be ideally?'}
                      </p>
                    </div>
                    <MoodGrid 
                      initialPosition={profileData.prsIdeal}
                      onPositionChange={(pos) => updateProfile({ prsIdeal: pos })}
                      mode="target"
                    />
                  </GlassCard>
                  <div className="flex justify-between">
                    <GlassButton onClick={handleBack} variant="secondary">
                      <ArrowLeft size={18} className="mr-2" />
                      {language === 'pl' ? 'Wstecz' : 'Back'}
                    </GlassButton>
                    <GlassButton 
                      onClick={handleNext}
                      disabled={!profileData.prsIdeal}
                    >
                      {language === 'pl' ? 'Dalej' : 'Next'}
                      <ArrowRight size={18} className="ml-2" />
                    </GlassButton>
                  </div>
                </div>
              )}

              {currentStep === 'biophilia' && (
                <div>
                  <BiophiliaTest 
                    onSelect={(score) => updateProfile({ biophiliaScore: score })}
                  />
                  <div className="flex justify-between mt-6">
                    <GlassButton onClick={handleBack} variant="secondary">
                      <ArrowLeft size={18} className="mr-2" />
                      {language === 'pl' ? 'Wstecz' : 'Back'}
                    </GlassButton>
                    <GlassButton 
                      onClick={handleNext}
                      disabled={profileData.biophiliaScore === undefined}
                    >
                      {language === 'pl' ? 'Dalej' : 'Next'}
                      <ArrowRight size={18} className="ml-2" />
                    </GlassButton>
                  </div>
                </div>
              )}

              {currentStep === 'summary' && (
                <SummaryStep 
                  data={profileData}
                  onComplete={handleComplete}
                  onBack={handleBack}
                  isSubmitting={isSubmitting}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      <div className="w-full">
        <AwaDialogue 
          currentStep="onboarding" 
          fullWidth={true}
          autoHide={true}
        />
      </div>
    </div>
  );
}

// ========== INDIVIDUAL STEP COMPONENTS ==========

function WelcomeStep({ onNext }: { onNext: () => void }) {
  const { language } = useLanguage();

  return (
    <GlassCard className="p-8 lg:p-12 text-center">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.5, type: "spring" }}
        className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-gold via-champagne to-platinum flex items-center justify-center"
      >
        <Heart size={40} className="text-white" fill="currentColor" />
      </motion.div>

      <h1 className="text-3xl lg:text-4xl xl:text-5xl font-nasalization bg-gradient-to-r from-gold via-champagne to-platinum bg-clip-text text-transparent mb-6">
        {language === 'pl' ? 'Poznajmy Się' : 'Let\'s Get to Know You'}
      </h1>

      <p className="text-base lg:text-lg text-graphite font-modern max-w-2xl mx-auto mb-8">
        {language === 'pl'
          ? 'Poświęć 15 minut aby stworzyć swój Profil. To jednorazowe - raz wypełnisz, będziesz używać w każdym pokoju.'
          : 'Spend 15 minutes to create your Core Profile. One-time only - fill once, use for every room.'}
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto mb-8">
        {[
          { icon: Sparkles, label: language === 'pl' ? 'Preferencje wizualne' : 'Visual preferences' },
          { icon: Heart, label: language === 'pl' ? 'Psychologia' : 'Psychology' },
          { icon: Zap, label: language === 'pl' ? 'Styl życia' : 'Lifestyle' }
        ].map((item, i) => (
          <div key={i} className="glass-panel rounded-xl p-4">
            <item.icon size={24} className="text-gold mx-auto mb-2" />
            <p className="text-sm font-modern text-graphite">{item.label}</p>
          </div>
        ))}
      </div>

      <GlassButton onClick={onNext} className="px-8 py-4">
        {language === 'pl' ? 'Zacznijmy!' : 'Let\'s Start!'}
        <ArrowRight size={20} className="ml-2" />
      </GlassButton>
    </GlassCard>
  );
}

// ========== PLACEHOLDER STEPS (to be implemented) ==========

function LifestyleStep({ data, onUpdate, onNext, onBack }: any) {
  const { language } = useLanguage();
  const [lifestyleData, setLifestyleData] = useState(data || {});

  return (
    <GlassCard className="p-6 lg:p-8">
      <h2 className="text-2xl lg:text-3xl font-nasalization text-graphite mb-6">
        {language === 'pl' ? 'Twój Styl Życia' : 'Your Lifestyle'}
      </h2>
      <p className="text-graphite font-modern mb-8">
        {language === 'pl' ? 'Kilka szybkich pytań o Ciebie...' : 'A few quick questions about you...'}
      </p>
      
      {/* TODO: Implement lifestyle questions */}
      <div className="glass-panel rounded-xl p-8 text-center text-silver-dark mb-6">
        <p>{language === 'pl' ? 'Pytania lifestyle - do implementacji' : 'Lifestyle questions - to be implemented'}</p>
      </div>

      <div className="flex justify-between">
        <GlassButton onClick={onBack} variant="secondary">
          <ArrowLeft size={18} className="mr-2" />
          {language === 'pl' ? 'Wstecz' : 'Back'}
        </GlassButton>
        <GlassButton onClick={() => { onUpdate(lifestyleData); onNext(); }}>
          {language === 'pl' ? 'Dalej' : 'Next'}
          <ArrowRight size={18} className="ml-2" />
        </GlassButton>
      </div>
    </GlassCard>
  );
}

function TinderSwipesStep({ onComplete, onBack }: any) {
  const { language } = useLanguage();
  
  return (
    <GlassCard className="p-6 lg:p-8">
      <h2 className="text-2xl lg:text-3xl font-nasalization text-graphite mb-4">
        {language === 'pl' ? 'Swipes Wizualne' : 'Visual Swipes'}
      </h2>
      <p className="text-graphite font-modern mb-8">
        {language === 'pl' ? '50 obrazów - reaguj sercem!' : '50 images - react with your heart!'}
      </p>
      
      {/* TODO: Implement Tinder swipes */}
      <div className="glass-panel rounded-xl p-8 text-center text-silver-dark mb-6">
        <p>{language === 'pl' ? 'Tinder swipes - do implementacji' : 'Tinder swipes - to be implemented'}</p>
      </div>

      <div className="flex justify-between">
        <GlassButton onClick={onBack} variant="secondary">
          <ArrowLeft size={18} className="mr-2" />
          {language === 'pl' ? 'Wstecz' : 'Back'}
        </GlassButton>
      </div>
    </GlassCard>
  );
}

function SemanticDifferentialStep({ data, onUpdate, onNext, onBack }: any) {
  const { t, language } = useLanguage();
  const [values, setValues] = useState(data || {
    warmth: 0.5,
    brightness: 0.5,
    complexity: 0.5,
    texture: 0.5
  });

  const handleChange = (dimension: string, value: number) => {
    const newValues = { ...values, [dimension]: value };
    setValues(newValues);
    onUpdate(newValues);
  };

  return (
    <GlassCard className="p-6 lg:p-8">
      <h2 className="text-2xl lg:text-3xl font-nasalization text-graphite mb-4">
        {language === 'pl' ? 'Twoje Preferencje' : 'Your Preferences'}
      </h2>
      <p className="text-graphite font-modern mb-8">
        {language === 'pl' ? 'Gdzie się widzisz na tych skalach?' : 'Where do you see yourself on these scales?'}
      </p>

      <div className="space-y-8 mb-8">
        {SEMANTIC_DIFFERENTIAL_DIMENSIONS.map((dim) => (
          <div key={dim.id} className="glass-panel rounded-xl p-6">
            <p className="text-base font-semibold text-graphite mb-4">
              {t(dim.label)}
            </p>
            <div className="flex items-center justify-between text-sm text-silver-dark mb-3">
              <span>{t(dim.min.label)}</span>
              <span>{t(dim.max.label)}</span>
            </div>
            <GlassSlider
              min={0}
              max={1}
              step={0.01}
              value={values[dim.id]}
              onChange={(val) => handleChange(dim.id, val)}
            />
          </div>
        ))}
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
  );
}

function ColorsMaterialsStep({ data, onUpdate, onNext, onBack }: any) {
  const { language } = useLanguage();
  
  return (
    <GlassCard className="p-6 lg:p-8">
      <h2 className="text-2xl lg:text-3xl font-nasalization text-graphite mb-4">
        {language === 'pl' ? 'Kolory i Materiały' : 'Colors & Materials'}
      </h2>
      <p className="text-graphite font-modern mb-8">
        {language === 'pl' ? 'Wybierz swoje ulubione...' : 'Choose your favorites...'}
      </p>
      
      {/* TODO: Implement colors/materials selection */}
      <div className="glass-panel rounded-xl p-8 text-center text-silver-dark mb-6">
        <p>{language === 'pl' ? 'Kolory i materiały - do implementacji' : 'Colors & materials - to be implemented'}</p>
      </div>

      <div className="flex justify-between">
        <GlassButton onClick={onBack} variant="secondary">
          <ArrowLeft size={18} className="mr-2" />
          {language === 'pl' ? 'Wstecz' : 'Back'}
        </GlassButton>
        <GlassButton onClick={() => { onUpdate({}); onNext(); }}>
          {language === 'pl' ? 'Dalej' : 'Next'}
          <ArrowRight size={18} className="ml-2" />
        </GlassButton>
      </div>
    </GlassCard>
  );
}

function SummaryStep({ data, onComplete, onBack, isSubmitting }: any) {
  const { language } = useLanguage();

  return (
    <GlassCard className="p-8 lg:p-12 text-center">
      <motion.div
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ duration: 0.6, type: "spring" }}
        className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center"
      >
        <Check size={40} className="text-white" />
      </motion.div>

      <h1 className="text-3xl lg:text-4xl xl:text-5xl font-nasalization bg-gradient-to-r from-green-600 to-emerald-500 bg-clip-text text-transparent mb-6">
        {language === 'pl' ? 'Gotowe!' : 'All Set!'}
      </h1>

      <p className="text-base lg:text-lg text-graphite font-modern max-w-2xl mx-auto mb-8">
        {language === 'pl'
          ? 'Wspaniale! Twój Core Profile jest kompletny. Teraz możemy tworzyć wnętrza które naprawdę odzwierciedlają KIM jesteś.'
          : 'Great! Your Core Profile is complete. Now we can create interiors that truly reflect WHO you are.'}
      </p>

      <div className="flex justify-center gap-4">
        <GlassButton onClick={onBack} variant="secondary" disabled={isSubmitting}>
          <ArrowLeft size={18} className="mr-2" />
          {language === 'pl' ? 'Wstecz' : 'Back'}
        </GlassButton>
        <GlassButton onClick={onComplete} disabled={isSubmitting} className="px-8">
          {isSubmitting ? (language === 'pl' ? 'Zapisywanie...' : 'Saving...') : (language === 'pl' ? 'Zakończ' : 'Complete')}
          <Check size={18} className="ml-2" />
        </GlassButton>
      </div>
    </GlassCard>
  );
}

