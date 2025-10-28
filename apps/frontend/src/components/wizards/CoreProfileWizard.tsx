"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
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
import { BigFiveStep } from '@/components/steps/BigFiveStep';
import { InspirationsStep } from '@/components/steps/InspirationsStep';
import { SEMANTIC_DIFFERENTIAL_DIMENSIONS } from '@/lib/questions/validated-scales';
import { ArrowRight, ArrowLeft, Check, Sparkles, Heart, Zap, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { LoginModal } from '@/components/auth/LoginModal';

type WizardStep = 
  | 'welcome'
  | 'lifestyle'
  | 'big_five'
  | 'inspirations'
  | 'tinder_swipes'
  | 'semantic_diff'
  | 'colors_materials'
  | 'sensory_tests'
  | 'nature_metaphor'
  | 'aspirational_self'
  | 'prs_ideal'
  | 'biophilia'
  | 'summary';

interface CoreProfileData {
  lifestyle?: {
    livingSituation: string;
    lifeVibe: string;
    goals: string[];
  };
  bigFive?: {
    responses: Record<string, number>;
    scores: {
      openness: number;
      conscientiousness: number;
      extraversion: number;
      agreeableness: number;
      neuroticism: number;
    };
    completedAt: string;
  };
  inspirations?: Array<{
    id: string;
    fileId?: string;
    url?: string;
    tags?: {
      styles?: string[];
      colors?: string[];
      materials?: string[];
      biophilia?: number;
    };
    description?: string;
    addedAt: string;
  }>;
  tinderSwipes?: Array<{
    imageId: number;
    direction: 'left' | 'right';
    reactionTime: number;
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
  aspirationalSelf?: {
    feelings: string[];
    rituals: string[];
  };
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
  const { updateSessionData, sessionData } = useSessionData();
  const { language } = useLanguage();
  const { user, linkUserHashToAuth } = useAuth();
  
  const [currentStep, setCurrentStep] = useState<WizardStep>('welcome');
  const [profileData, setProfileData] = useState<CoreProfileData>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentInsight, setCurrentInsight] = useState<string>('');
  const [showLoginModal, setShowLoginModal] = useState(false);

  const steps: WizardStep[] = [
    'welcome',
    'lifestyle',
    'big_five',
    'inspirations',
    'tinder_swipes',
    'semantic_diff',
    'colors_materials',
    'sensory_tests',
    'nature_metaphor',
    'aspirational_self',
    'prs_ideal',
    'biophilia',
    'summary'
  ];

  const currentStepIndex = steps.indexOf(currentStep);
  const progress = ((currentStepIndex + 1) / steps.length) * 100;

  const updateProfile = (data: Partial<CoreProfileData>) => {
    setProfileData(prev => ({ ...prev, ...data }));
  };

  // Generate personalized IDA insight based on profile data
  const generateInsight = (step: WizardStep, data: CoreProfileData): string => {
    const insights = {
      lifestyle: () => {
        if (data.lifestyle?.livingSituation === 'partner') {
          return language === 'pl' 
            ? "Rozumiem - projektujemy dla dwojga! To będzie balans między 'my' i 'ja'. 💑"
            : "I understand - we're designing for two! It'll be a balance between 'us' and 'me'. 💑";
        }
        if (data.lifestyle?.goals?.includes('peace')) {
          return language === 'pl'
            ? "Spokój to Twój priorytet - stworzymy przestrzeń która odpręża. 🧘"
            : "Peace is your priority - we'll create a space that relaxes. 🧘";
        }
        return '';
      },
      tinder_swipes: () => {
        const rightSwipes = data.tinderSwipes?.filter(s => s.direction === 'right').length || 0;
        if (rightSwipes > 20) {
          return language === 'pl'
            ? "Widzę Twoje preferencje! Ciepłe, przytulne wnętrza to Twój język. 🌳"
            : "I see your preferences! Warm, cozy interiors are your language. 🌳";
        }
        return language === 'pl' 
          ? "Poznałam Twój gust wizualny - to będzie piękne! ✨"
          : "I learned your visual taste - this will be beautiful! ✨";
      },
      nature_metaphor: () => {
        const metaphors: Record<string, { pl: string; en: string }> = {
          ocean: { 
            pl: "Ocean - płynność, spokój, głębia. Będziemy tworzyć przestrzeń która 'oddycha'. 🌊",
            en: "Ocean - fluidity, calm, depth. We'll create a space that 'breathes'. 🌊"
          },
          forest: {
            pl: "Las - uziemienie, organiczność. Przestrzeń pełna natury i spokoju. 🌲",
            en: "Forest - grounding, organic. A space full of nature and peace. 🌲"
          },
          mountain: {
            pl: "Góry - siła, inspiracja. Wyniosła przestrzeń która motywuje. ⛰️",
            en: "Mountains - strength, inspiration. An elevated space that motivates. ⛰️"
          }
        };
        return metaphors[data.natureMetaphor || '']?.[language] || '';
      },
      aspirational_self: () => {
        if (data.aspirationalSelf?.rituals?.includes('morning_coffee')) {
          return language === 'pl'
            ? "Poranek to Twój czas - stworzymy przestrzeń która wspiera ten rytuał. ☀️☕"
            : "Morning is your time - we'll create a space that supports this ritual. ☀️☕";
        }
        return '';
      },
      biophilia: () => {
        if ((data.biophiliaScore || 0) >= 2) {
          return language === 'pl'
            ? "Kochasz naturę! Zielone rośliny będą wszędzie. 🌿"
            : "You love nature! Green plants will be everywhere. 🌿";
        }
        return '';
      }
    };

    return insights[step as keyof typeof insights]?.() || '';
  };

  const handleNext = () => {
    // Generate insight for current step
    const insight = generateInsight(currentStep, profileData);
    if (insight) {
      setCurrentInsight(insight);
    }
    
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < steps.length) {
      setCurrentStep(steps[nextIndex]);
    }
  };

  const handleBack = () => {
    setCurrentInsight(''); // Clear insight when going back
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setCurrentStep(steps[prevIndex]);
    }
  };

  const handleComplete = async () => {
    setIsSubmitting(true);
    
    try {
      // Save to session data
      await updateSessionData({
        tinderData: {
          swipes: profileData.tinderSwipes || []
        },
      });

      // If user is not logged in, show login modal
      if (!user) {
        setShowLoginModal(true);
        setIsSubmitting(false);
        return;
      }

      // If logged in, link user_hash and proceed to dashboard
      if (sessionData?.userHash) {
        await linkUserHashToAuth(sessionData.userHash);
      }

      router.push('/dashboard');
    } catch (error) {
      console.error('Failed to save core profile:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLoginSuccess = async () => {
    setShowLoginModal(false);
    
    // Link user_hash to authenticated user
    if (sessionData?.userHash && user) {
      await linkUserHashToAuth(sessionData.userHash);
    }
    
    // Navigate to dashboard
    router.push('/dashboard');
  };

  return (
    <div className="min-h-screen flex flex-col w-full">
      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-4xl mx-auto">
          {/* Progress Bar */}
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
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </div>

          {/* IDA Insight - Progressive Reveal */}
          <AnimatePresence>
            {currentInsight && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.5 }}
                className="mb-6"
              >
                <div className="glass-panel rounded-xl p-4 bg-gradient-to-r from-gold/10 via-champagne/10 to-platinum/10 border-2 border-gold/30">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gold to-champagne flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Sparkles size={18} className="text-white" />
                    </div>
                    <p className="text-sm font-modern text-graphite flex-1">
                      {currentInsight}
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

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
                  onUpdate={(data: { livingSituation: string; lifeVibe: string; goals: string[] }) => updateProfile({ lifestyle: data })}
                  onNext={handleNext}
                  onBack={handleBack}
                />
              )}

              {currentStep === 'big_five' && (
                <BigFiveStep 
                  data={profileData.bigFive}
                  onUpdate={(data: { responses: Record<string, number>; scores: { openness: number; conscientiousness: number; extraversion: number; agreeableness: number; neuroticism: number }; completedAt: string }) => updateProfile({ bigFive: data })}
                  onNext={handleNext}
                  onBack={handleBack}
                />
              )}

              {currentStep === 'inspirations' && (
                <InspirationsStep 
                  data={profileData.inspirations}
                  onUpdate={(data: Array<{ id: string; fileId?: string; url?: string; tags?: { styles?: string[]; colors?: string[]; materials?: string[]; biophilia?: number; }; description?: string; addedAt: string; }>) => updateProfile({ inspirations: data })}
                  onNext={handleNext}
                  onBack={handleBack}
                />
              )}

              {currentStep === 'tinder_swipes' && (
                <TinderSwipesStep 
                  onComplete={(swipes: Array<{ imageId: number; direction: 'left' | 'right'; reactionTime: number; dwellTime: number }>) => {
                    updateProfile({ tinderSwipes: swipes });
                    handleNext();
                  }}
                  onBack={handleBack}
                />
              )}

              {currentStep === 'semantic_diff' && (
                <SemanticDifferentialStep 
                  data={profileData.semanticDifferential}
                  onUpdate={(data: { warmth: number; brightness: number; complexity: number; texture: number }) => updateProfile({ semanticDifferential: data })}
                  onNext={handleNext}
                  onBack={handleBack}
                />
              )}

              {currentStep === 'colors_materials' && (
                <ColorsMaterialsStep 
                  data={profileData.colorsAndMaterials}
                  onUpdate={(data: { selectedPalette: string; topMaterials: string[] }) => updateProfile({ colorsAndMaterials: data })}
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
                      <ArrowLeft size={18} />
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
                      <ArrowLeft size={18} />
                      {language === 'pl' ? 'Wstecz' : 'Back'}
                    </GlassButton>
                    <GlassButton 
                      onClick={handleNext}
                      disabled={!profileData.natureMetaphor}
                    >
                      {language === 'pl' ? 'Dalej' : 'Next'}
                      <ArrowRight size={18} />
                    </GlassButton>
                  </div>
                </div>
              )}

              {currentStep === 'aspirational_self' && (
                <AspirationalSelfStep 
                  data={profileData.aspirationalSelf}
                  onUpdate={(data: { feelings: string[]; rituals: string[] }) => updateProfile({ aspirationalSelf: data })}
                  onNext={handleNext}
                  onBack={handleBack}
                />
              )}

              {currentStep === 'prs_ideal' && (
                <GlassCard className="p-6 md:p-8 min-h-[600px] max-h-[85vh] overflow-auto scrollbar-hide">
                  <div className="text-center mb-6">
                    <h2 className="text-xl md:text-2xl font-nasalization bg-gradient-to-r from-gold to-champagne bg-clip-text text-transparent mb-2">
                      {language === 'pl' ? 'Twoja Idealna Przestrzeń' : 'Your Ideal Space'}
                    </h2>
                    <p className="text-graphite font-modern text-sm">
                      {language === 'pl'
                        ? 'Gdzie chciałbyś żeby Twoje przestrzenie były idealnie?'
                        : 'Where would you like your spaces to be ideally?'}
                    </p>
                  </div>
                  
                  <div className="mb-6">
                    <MoodGrid 
                      initialPosition={profileData.prsIdeal}
                      onPositionChange={(pos) => updateProfile({ prsIdeal: pos })}
                      mode="target"
                    />
                  </div>

                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <GlassButton onClick={handleBack} variant="secondary">
                      <ArrowLeft size={18} />
                      {language === 'pl' ? 'Wstecz' : 'Back'}
                    </GlassButton>
                    <GlassButton 
                      onClick={handleNext}
                      disabled={!profileData.prsIdeal}
                    >
                      {language === 'pl' ? 'Dalej' : 'Next'}
                      <ArrowRight size={18} />
                    </GlassButton>
                  </div>
                </GlassCard>
              )}

              {currentStep === 'biophilia' && (
                <div>
                  <BiophiliaTest 
                    onSelect={(score) => updateProfile({ biophiliaScore: score })}
                  />
                  <div className="flex justify-between mt-6">
                    <GlassButton onClick={handleBack} variant="secondary">
                      <ArrowLeft size={18} />
                      {language === 'pl' ? 'Wstecz' : 'Back'}
                    </GlassButton>
                    <GlassButton 
                      onClick={handleNext}
                      disabled={profileData.biophiliaScore === undefined}
                    >
                      {language === 'pl' ? 'Dalej' : 'Next'}
                      <ArrowRight size={18} />
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

      {/* Dialog IDA na dole - cała szerokość */}
      <div className="w-full">
        <AwaDialogue 
          currentStep="onboarding" 
          fullWidth={true}
          autoHide={true}
        />
      </div>

      {/* Login Modal - shown after profile completion if not logged in */}
      <LoginModal 
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onSuccess={handleLoginSuccess}
        message={language === 'pl' 
          ? 'Świetnie! Zaloguj się aby zachować swój profil i wrócić później.'
          : 'Great! Sign in to save your profile and return later.'}
      />
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
          ? 'Poświęć 15 minut aby stworzyć swój Profil. To jednorazowe - raz wypełnione, pozostanie w Twoim profilu.'
          : 'Spend 15 minutes to create your Core Profile. One-time only - once filled, stays in your profile.'}
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
        <ArrowRight size={20} />
      </GlassButton>
    </GlassCard>
  );
}

// ========== PLACEHOLDER STEPS (to be implemented) ==========

function LifestyleStep({ data, onUpdate, onNext, onBack }: any) {
  const { language } = useLanguage();
  const [lifestyleData, setLifestyleData] = useState(data || {
    livingSituation: '',
    lifeVibe: '',
    goals: [] as string[]
  });

  const updateField = (field: string, value: any) => {
    const updated = { ...lifestyleData, [field]: value };
    setLifestyleData(updated);
  };

  const toggleGoal = (goal: string) => {
    const goals = lifestyleData.goals || [];
    const updated = {
      ...lifestyleData,
      goals: goals.includes(goal) 
        ? goals.filter((g: string) => g !== goal)
        : [...goals, goal]
    };
    setLifestyleData(updated);
  };

  const canProceed = lifestyleData.livingSituation && lifestyleData.lifeVibe && lifestyleData.goals?.length > 0;

  const livingSituationOptions = [
    { id: 'alone', label: { pl: 'Sam/Sama', en: 'Alone' } },
    { id: 'partner', label: { pl: 'Z Partnerem', en: 'With Partner' } },
    { id: 'family', label: { pl: 'Rodzina', en: 'Family' } },
    { id: 'roommates', label: { pl: 'Współlokatorzy', en: 'Roommates' } }
  ];

  const vibeOptions = [
    { id: 'calm', label: { pl: 'Spokojny', en: 'Calm' } },
    { id: 'chaotic', label: { pl: 'Chaotyczny', en: 'Chaotic' } },
    { id: 'creative', label: { pl: 'Kreatywny', en: 'Creative' } },
    { id: 'organized', label: { pl: 'Zorganizowany', en: 'Organized' } },
    { id: 'social', label: { pl: 'Społeczny', en: 'Social' } },
    { id: 'introverted', label: { pl: 'Introwertyczny', en: 'Introverted' } }
  ];

  const goalOptions = [
    { id: 'peace', label: { pl: 'Spokój i relaks', en: 'Peace and relaxation' } },
    { id: 'creativity', label: { pl: 'Kreatywność i inspiracja', en: 'Creativity and inspiration' } },
    { id: 'productivity', label: { pl: 'Produktywność i focus', en: 'Productivity and focus' } },
    { id: 'connection', label: { pl: 'Więź z bliskimi', en: 'Connection with loved ones' } },
    { id: 'privacy', label: { pl: 'Prywatność i autonomia', en: 'Privacy and autonomy' } },
    { id: 'beauty', label: { pl: 'Estetyka i piękno', en: 'Aesthetics and beauty' } }
  ];

  return (
    <GlassCard className="p-6 md:p-8 min-h-[600px] max-h-[85vh] overflow-auto scrollbar-hide">
      <h2 className="text-xl md:text-2xl font-nasalization text-graphite mb-2">
        {language === 'pl' ? 'Twój Styl Życia' : 'Your Lifestyle'}
      </h2>
      <p className="text-graphite font-modern mb-6 text-sm">
        {language === 'pl' ? 'Kilka szybkich pytań o Ciebie...' : 'A few quick questions about you...'}
      </p>
      
      <div className="space-y-6">
        {/* Question 1: Living Situation */}
        <div>
          <label className="block text-sm font-semibold text-graphite mb-2">
            {language === 'pl' ? 'Z kim mieszkasz?' : 'Who do you live with?'}
          </label>
          <div className="grid grid-cols-2 gap-2">
            {livingSituationOptions.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => updateField('livingSituation', option.id)}
                className={`rounded-lg p-4 text-sm font-modern font-semibold transition-all duration-300 cursor-pointer group ${
                  lifestyleData.livingSituation === option.id
                    ? 'bg-gold/30 border-2 border-gold text-graphite shadow-lg'
                    : 'bg-white/10 border border-white/30 text-graphite hover:bg-gold/10 hover:border-gold/50 hover:text-gold-700'
                }`}
              >
                {option.label[language]}
              </button>
            ))}
          </div>
        </div>

        {/* Question 2: Life Vibe */}
        <div>
          <label className="block text-sm font-semibold text-graphite mb-2">
            {language === 'pl' ? 'Jaki jest vibe Twojego życia teraz?' : 'What\'s your life vibe right now?'}
          </label>
          <div className="grid grid-cols-3 gap-2">
            {vibeOptions.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => updateField('lifeVibe', option.id)}
                className={`rounded-lg p-3 text-sm font-modern font-semibold transition-all duration-300 cursor-pointer group ${
                  lifestyleData.lifeVibe === option.id
                    ? 'bg-gold/30 border-2 border-gold text-graphite shadow-lg'
                    : 'bg-white/10 border border-white/30 text-graphite hover:bg-gold/10 hover:border-gold/50 hover:text-gold-700'
                }`}
              >
                {option.label[language]}
              </button>
            ))}
          </div>
        </div>

        {/* Question 3: Goals (multi-select) */}
        <div>
          <label className="block text-sm font-semibold text-graphite mb-2">
            {language === 'pl' ? 'Co jest dla Ciebie najważniejsze w domu?' : 'What matters most to you at home?'}
            <span className="text-xs text-silver-dark ml-2">
              ({language === 'pl' ? 'wybierz kilka' : 'select multiple'})
            </span>
          </label>
          <div className="grid grid-cols-2 gap-2">
            {goalOptions.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => toggleGoal(option.id)}
                className={`rounded-lg p-4 text-sm font-modern font-semibold transition-all duration-300 cursor-pointer group ${
                  lifestyleData.goals?.includes(option.id)
                    ? 'bg-gold/30 border-2 border-gold text-graphite shadow-lg'
                    : 'bg-white/10 border border-white/30 text-graphite hover:bg-gold/10 hover:border-gold/50 hover:text-gold-700'
                }`}
              >
                {option.label[language]}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 justify-center mt-6">
        <GlassButton onClick={onBack} variant="secondary">
          <ArrowLeft size={18} className="mr-2" />
          {language === 'pl' ? 'Wstecz' : 'Back'}
        </GlassButton>
        <GlassButton 
          onClick={() => { onUpdate(lifestyleData); onNext(); }}
          disabled={!canProceed}
        >
          {language === 'pl' ? 'Dalej' : 'Next'}
          <ArrowRight size={18} className="ml-2" />
        </GlassButton>
      </div>
    </GlassCard>
  );
}

function TinderSwipesStep({ onComplete, onBack }: any) {
  const { language } = useLanguage();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [swipes, setSwipes] = useState<Array<{
    imageId: number;
    direction: 'left' | 'right';
    reactionTime: number;
    dwellTime: number;
    tags: string[];
    categories: any;
  }>>([]);
  const [startTime, setStartTime] = useState(Date.now());
  const [showInstructions, setShowInstructions] = useState(true);
  const [images, setImages] = useState<Array<{
    id: number;
    url: string;
    filename: string;
    tags: string[];
    categories: any;
  }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Fetch real images with tags from API (like Tinder)
  useEffect(() => {
    const fetchImages = async () => {
      try {
        setIsLoading(true);
        const res = await fetch('/api/tinder/livingroom', { cache: 'no-store' });
        if (!res.ok) throw new Error('Failed to load images');
        const data = await res.json();
        setImages(data);
      } catch (error) {
        console.error('Failed to load tinder images:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchImages();
  }, []);

  const currentImage = images[currentIndex];
  const progress = images.length > 0 ? (currentIndex / images.length) * 100 : 0;

  useEffect(() => {
    setStartTime(Date.now());
  }, [currentIndex]);

  const handleSwipe = (direction: 'left' | 'right') => {
    if (!currentImage) return;
    
    const reactionTime = Date.now() - startTime;
    const dwellTime = reactionTime; // Simplified for now
    
    const newSwipes = [...swipes, {
      imageId: currentImage.id,
      direction,
      reactionTime,
      dwellTime,
      tags: currentImage.tags,
      categories: currentImage.categories
    }];
    
    setSwipes(newSwipes);
    
    if (currentIndex + 1 >= images.length) {
      // Completed!
      onComplete(newSwipes);
    } else {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handleDragEnd = (event: any, info: any) => {
    const threshold = 100;
    if (info.offset.x > threshold) {
      handleSwipe('right');
    } else if (info.offset.x < -threshold) {
      handleSwipe('left');
    }
  };

  if (showInstructions) {
  return (
    <GlassCard className="p-6 md:p-8 text-center min-h-[600px] max-h-[85vh] overflow-auto scrollbar-hide">
      <h2 className="text-xl md:text-2xl font-nasalization text-graphite mb-3">
        {language === 'pl' ? 'Wnętrzarski Tinder' : 'Interior Design Tinder'}
      </h2>
        <p className="text-graphite font-modern mb-4 text-sm">
          {language === 'pl' 
            ? `${isLoading ? 'Ładowanie...' : `Pokażę Ci ${images.length} różnych wnętrz. Reaguj sercem, nie głową!`}`
            : `${isLoading ? 'Loading...' : `I'll show you ${images.length} different interiors. React with your heart, not your head!`}`}
        </p>
        
        <div className="flex justify-center gap-8 mb-6">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
              <X className="text-red-500" size={20} />
            </div>
            <span className="text-sm text-graphite">{language === 'pl' ? 'Nie' : 'No'}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
              <Heart className="text-green-500" size={20} />
            </div>
            <span className="text-sm text-graphite">{language === 'pl' ? 'Tak!' : 'Yes!'}</span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <GlassButton onClick={onBack} variant="secondary">
            <ArrowLeft size={18} className="mr-2" />
            {language === 'pl' ? 'Wstecz' : 'Back'}
          </GlassButton>
          <GlassButton onClick={() => setShowInstructions(false)}>
            {language === 'pl' ? 'Rozpocznij' : 'Start'} →
          </GlassButton>
        </div>
      </GlassCard>
    );
  }

  return (
    <div className="w-full h-full">
      {isLoading ? (
        <div className="flex items-center justify-center h-96 text-silver-dark">
          {language === 'pl' ? 'Ładowanie zdjęć...' : 'Loading images...'}
        </div>
      ) : (
        <>
      {/* Progress */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-silver-dark font-modern">
            {language === 'pl' ? 'Postęp' : 'Progress'}
          </span>
          <span className="text-sm text-silver-dark font-modern">
            {currentIndex + 1} / {images.length}
          </span>
        </div>
        <div className="w-full bg-silver/20 rounded-full h-2">
          <motion.div
            className="bg-gradient-to-r from-gold to-champagne h-2 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      {/* Swipe Card - Larger */}
      <div className="relative h-[450px] md:h-[550px] mb-6">
        <AnimatePresence>
          {currentImage && (
            <motion.div
              key={currentImage.id}
              className="absolute inset-0 cursor-grab active:cursor-grabbing"
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              onDragEnd={handleDragEnd}
              initial={{ scale: 0, rotate: 0 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ 
                scale: 0, 
                opacity: 0,
                transition: { duration: 0.2 }
              }}
              whileDrag={{ scale: 1.05, rotate: 5 }}
              style={{ touchAction: 'none' }}
            >
              <div className="h-full rounded-2xl overflow-hidden shadow-2xl border-4 border-white/20">
                <div className="relative h-full w-full">
                  <Image
                    src={currentImage.url}
                    alt="Interior"
                    fill
                    draggable={false}
                    className="object-cover w-full h-full select-none"
                    priority
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Action Buttons - Bigger */}
      <div className="flex justify-center gap-6">
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => handleSwipe('left')}
          className="w-20 h-20 rounded-full bg-gradient-to-br from-red-100 to-red-200 hover:from-red-200 hover:to-red-300 shadow-xl flex items-center justify-center transition-all z-10"
        >
          <X size={36} className="text-red-600" />
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => handleSwipe('right')}
          className="w-20 h-20 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 hover:from-green-500 hover:to-emerald-600 shadow-xl flex items-center justify-center transition-all z-10"
        >
          <Heart size={36} className="text-white" fill="currentColor" />
        </motion.button>
      </div>
      </>
      )}
    </div>
  );
}

function SemanticDifferentialStep({ data, onUpdate, onNext, onBack }: any) {
  const { language } = useLanguage();
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState(data || {});

  const questions = [
    {
      id: 'warmth',
      question: { pl: 'Które wnętrze bardziej TY?', en: 'Which interior is more YOU?' },
      leftLabel: { pl: 'Zimne', en: 'Cool' },
      rightLabel: { pl: 'Ciepłe', en: 'Warm' },
      leftImage: '/images/tinder/Living Room (2).jpg',
      rightImage: '/images/tinder/Living Room (1).jpg'
    },
    {
      id: 'brightness',
      question: { pl: 'Które wnętrze bardziej TY?', en: 'Which interior is more YOU?' },
      leftLabel: { pl: 'Ciemne', en: 'Dark' },
      rightLabel: { pl: 'Jasne', en: 'Bright' },
      leftImage: '/images/tinder/Living Room (3).jpg',
      rightImage: '/images/tinder/Living Room (1).jpg'
    },
    {
      id: 'complexity',
      question: { pl: 'Które wnętrze bardziej TY?', en: 'Which interior is more YOU?' },
      leftLabel: { pl: 'Proste', en: 'Simple' },
      rightLabel: { pl: 'Złożone', en: 'Complex' },
      leftImage: '/images/tinder/Living Room (2).jpg',
      rightImage: '/images/tinder/Living Room (3).jpg'
    }
  ];

  const currentQ = questions[currentQuestion];

  const handleChoice = (side: 'left' | 'right') => {
    const value = side === 'left' ? 0.2 : 0.8;
    const newAnswers = { ...answers, [currentQ.id]: value };
    setAnswers(newAnswers);
    onUpdate(newAnswers);
    
    if (currentQuestion + 1 < questions.length) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      setTimeout(() => onNext(), 300);
    }
  };

  return (
    <GlassCard className="p-6 md:p-8 min-h-[600px] max-h-[85vh] overflow-auto scrollbar-hide">
      <h2 className="text-xl md:text-2xl font-nasalization text-graphite mb-2 text-center">
        {currentQ.question[language]}
      </h2>
      <p className="text-graphite font-modern mb-6 text-sm text-center">
        {language === 'pl' ? 'Reaguj intuicyjnie, nie myśl za długo' : 'React intuitively, don\'t overthink'}
      </p>
      
      <div className="mb-6">
        <div className="text-xs text-silver-dark text-center mb-2 font-modern">
          {language === 'pl' ? 'Pytanie' : 'Question'} {currentQuestion + 1} / {questions.length}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <button
          type="button"
          onClick={() => handleChoice('left')}
          className="group relative aspect-[4/3] rounded-xl overflow-hidden border-2 border-white/30 hover:border-gold/50 transition-all hover:scale-[1.02] cursor-pointer"
        >
          <Image
            src={currentQ.leftImage}
            alt={currentQ.leftLabel[language]}
            fill
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-4">
            <p className="text-white font-modern text-sm font-semibold">
              {currentQ.leftLabel[language]}
            </p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => handleChoice('right')}
          className="group relative aspect-[4/3] rounded-xl overflow-hidden border-2 border-white/30 hover:border-gold/50 transition-all hover:scale-[1.02] cursor-pointer"
        >
          <Image
            src={currentQ.rightImage}
            alt={currentQ.rightLabel[language]}
            fill
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-4">
            <p className="text-white font-modern text-sm font-semibold">
              {currentQ.rightLabel[language]}
            </p>
          </div>
        </button>
      </div>

      <div className="flex justify-center">
        <GlassButton onClick={onBack} variant="secondary">
          <ArrowLeft size={18} />
          {language === 'pl' ? 'Wstecz' : 'Back'}
        </GlassButton>
      </div>
    </GlassCard>
  );
}

function AspirationalSelfStep({ data, onUpdate, onNext, onBack }: any) {
  const { language } = useLanguage();
  const [aspirationalData, setAspirationalData] = useState(data || {
    feelings: [] as string[],
    rituals: [] as string[]
  });

  const toggleFeeling = (feeling: string) => {
    const feelings = aspirationalData.feelings || [];
    const updated = {
      ...aspirationalData,
      feelings: feelings.includes(feeling)
        ? feelings.filter((f: string) => f !== feeling)
        : [...feelings, feeling]
    };
    setAspirationalData(updated);
  };

  const toggleRitual = (ritual: string) => {
    const rituals = aspirationalData.rituals || [];
    const updated = {
      ...aspirationalData,
      rituals: rituals.includes(ritual)
        ? rituals.filter((r: string) => r !== ritual)
        : [...rituals, ritual]
    };
    setAspirationalData(updated);
  };

  const canProceed = aspirationalData.feelings?.length > 0 && aspirationalData.rituals?.length > 0;

  const feelingOptions = [
    { id: 'calm', label: { pl: 'Spokojny/a i zrelaksowany/a', en: 'Calm and relaxed' } },
    { id: 'energized', label: { pl: 'Energiczny/a i produktywny/a', en: 'Energized and productive' } },
    { id: 'creative', label: { pl: 'Kreatywny/a i inspirowany/a', en: 'Creative and inspired' } },
    { id: 'focused', label: { pl: 'Skupiony/a i jasny umysł', en: 'Focused and clear-minded' } },
    { id: 'connected', label: { pl: 'Połączony/a z bliskimi', en: 'Connected with loved ones' } },
    { id: 'grounded', label: { pl: 'Uziemiony/a i zbalansowany/a', en: 'Grounded and balanced' } }
  ];

  const ritualOptions = [
    { id: 'morning_coffee', label: { pl: 'Poranna kawa i refleksja', en: 'Morning coffee and reflection' } },
    { id: 'evening_reading', label: { pl: 'Wieczorne czytanie', en: 'Evening reading' } },
    { id: 'yoga', label: { pl: 'Joga/medytacja', en: 'Yoga/meditation' } },
    { id: 'deep_work', label: { pl: 'Praca głęboka', en: 'Deep work' } },
    { id: 'family_time', label: { pl: 'Czas z rodziną', en: 'Family time' } },
    { id: 'creative_projects', label: { pl: 'Kreatywne projekty', en: 'Creative projects' } }
  ];

  return (
    <GlassCard className="p-6 md:p-8 min-h-[600px] max-h-[85vh] overflow-auto scrollbar-hide">
      <div className="text-center mb-6">
        <h2 className="text-xl md:text-2xl font-nasalization bg-gradient-to-r from-gold to-champagne bg-clip-text text-transparent mb-2">
          {language === 'pl' ? 'Kim Chcesz Być?' : 'Who Do You Want to Be?'}
        </h2>
        <p className="text-graphite font-modern text-sm">
          {language === 'pl' 
            ? 'Projektujemy dla Twojego najlepszego ja, nie obecnego' 
            : 'We design for your best self, not current self'}
        </p>
      </div>
      
      <div className="space-y-6">
        {/* Question 1: Desired Feelings */}
        <div>
          <label className="block text-sm font-semibold text-graphite mb-2">
            {language === 'pl' ? 'Jak chcesz się czuć w swoim idealnym pokoju?' : 'How do you want to feel in your ideal room?'}
            <span className="text-xs text-silver-dark ml-2">
              ({language === 'pl' ? 'wybierz kilka' : 'select multiple'})
            </span>
          </label>
          <div className="grid grid-cols-2 gap-2">
            {feelingOptions.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => toggleFeeling(option.id)}
                className={`rounded-lg p-4 text-sm font-modern font-semibold transition-all duration-300 cursor-pointer group ${
                  aspirationalData.feelings?.includes(option.id)
                    ? 'bg-gold/30 border-2 border-gold text-graphite shadow-lg'
                    : 'bg-white/10 border border-white/30 text-graphite hover:bg-gold/10 hover:border-gold/50 hover:text-gold-700'
                }`}
              >
                {option.label[language]}
              </button>
            ))}
          </div>
        </div>

        {/* Question 2: Rituals */}
        <div>
          <label className="block text-sm font-semibold text-graphite mb-2">
            {language === 'pl' ? 'Jakie rytuały chcesz tu praktykować?' : 'What rituals do you want to practice here?'}
            <span className="text-xs text-silver-dark ml-2">
              ({language === 'pl' ? 'wybierz kilka' : 'select multiple'})
            </span>
          </label>
          <div className="grid grid-cols-2 gap-2">
            {ritualOptions.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => toggleRitual(option.id)}
                className={`rounded-lg p-4 text-sm font-modern font-semibold transition-all duration-300 cursor-pointer group ${
                  aspirationalData.rituals?.includes(option.id)
                    ? 'bg-gold/30 border-2 border-gold text-graphite shadow-lg'
                    : 'bg-white/10 border border-white/30 text-graphite hover:bg-gold/10 hover:border-gold/50 hover:text-gold-700'
                }`}
              >
                {option.label[language]}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 justify-center mt-6">
        <GlassButton onClick={onBack} variant="secondary">
          <ArrowLeft size={18} className="mr-2" />
          {language === 'pl' ? 'Wstecz' : 'Back'}
        </GlassButton>
        <GlassButton 
          onClick={() => { onUpdate(aspirationalData); onNext(); }}
          disabled={!canProceed}
        >
          {language === 'pl' ? 'Dalej' : 'Next'}
          <ArrowRight size={18} className="ml-2" />
        </GlassButton>
      </div>
    </GlassCard>
  );
}

function ColorsMaterialsStep({ data, onUpdate, onNext, onBack }: any) {
  const { language } = useLanguage();
  const [colorsData, setColorsData] = useState(data || {
    selectedPalette: '',
    topMaterials: [] as string[]
  });

  const toggleMaterial = (material: string) => {
    const materials = colorsData.topMaterials || [];
    const updated = {
      ...colorsData,
      topMaterials: materials.includes(material)
        ? materials.filter((m: string) => m !== material)
        : [...materials, material]
    };
    setColorsData(updated);
  };

  const canProceed = colorsData.selectedPalette && colorsData.topMaterials?.length > 0;

  const paletteOptions = [
    { 
      id: 'warm-earth', 
      colors: ['#8B7355', '#D4A574', '#F5DEB3', '#E6D5B8'],
      label: { pl: 'Ciepła Ziemia', en: 'Warm Earth' }
    },
    { 
      id: 'cool-nordic', 
      colors: ['#E8F1F5', '#B0C4DE', '#778899', '#A9B8C2'],
      label: { pl: 'Nordycki Chłód', en: 'Cool Nordic' }
    },
    { 
      id: 'vibrant-bold', 
      colors: ['#FF6B6B', '#4ECDC4', '#FFE66D', '#95E1D3'],
      label: { pl: 'Odważne Kolory', en: 'Vibrant Bold' }
    },
    { 
      id: 'natural-green', 
      colors: ['#6B8E23', '#8FBC8F', '#F5F5DC', '#DEB887'],
      label: { pl: 'Naturalna Zieleń', en: 'Natural Green' }
    },
    { 
      id: 'monochrome', 
      colors: ['#2C2C2C', '#5C5C5C', '#8C8C8C', '#E8E8E8'],
      label: { pl: 'Monochromatyczne', en: 'Monochrome' }
    },
    { 
      id: 'soft-pastels', 
      colors: ['#FFB6C1', '#E6E6FA', '#FFE4E1', '#F0E68C'],
      label: { pl: 'Miękkie Pastele', en: 'Soft Pastels' }
    }
  ];

  const materialOptions = [
    { id: 'wood', label: { pl: 'Drewno', en: 'Wood' } },
    { id: 'metal', label: { pl: 'Metal', en: 'Metal' } },
    { id: 'fabric', label: { pl: 'Tkaniny', en: 'Fabric' } },
    { id: 'stone', label: { pl: 'Kamień', en: 'Stone' } },
    { id: 'glass', label: { pl: 'Szkło', en: 'Glass' } },
    { id: 'leather', label: { pl: 'Skóra', en: 'Leather' } }
  ];

  return (
    <GlassCard className="p-6 md:p-8 min-h-[600px] max-h-[85vh] overflow-auto scrollbar-hide">
      <h2 className="text-xl md:text-2xl font-nasalization text-graphite mb-2">
        {language === 'pl' ? 'Kolory i Materiały' : 'Colors & Materials'}
      </h2>
      <p className="text-graphite font-modern mb-6 text-sm">
        {language === 'pl' ? 'Wybierz swoją paletę i ulubione materiały...' : 'Choose your palette and favorite materials...'}
      </p>
      
      <div className="space-y-6">
        {/* Color Palettes */}
        <div>
          <label className="block text-sm font-semibold text-graphite mb-2">
            {language === 'pl' ? 'Która paleta kolorów najbardziej Ciebie odzwierciedla?' : 'Which color palette reflects you most?'}
          </label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {paletteOptions.map((palette) => (
              <button
                key={palette.id}
                type="button"
                onClick={() => setColorsData({ ...colorsData, selectedPalette: palette.id })}
                className={`rounded-lg p-3 transition-all duration-300 cursor-pointer group ${
                  colorsData.selectedPalette === palette.id
                    ? 'bg-gold/30 border-2 border-gold shadow-lg'
                    : 'bg-white/10 border border-white/30 hover:bg-gold/10 hover:border-gold/50'
                }`}
              >
                <div className="flex gap-1 mb-2 h-8">
                  {palette.colors.map((color, i) => (
                    <div 
                      key={i} 
                      className="flex-1 rounded"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
                <p className="text-xs font-modern text-graphite text-center font-semibold group-hover:text-gold-700 transition-colors">{palette.label[language]}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Materials (multi-select) */}
        <div>
          <label className="block text-sm font-semibold text-graphite mb-2">
            {language === 'pl' ? 'Jakich materiałów chcesz dotykać?' : 'What materials do you want to touch?'}
            <span className="text-xs text-silver-dark ml-2">
              ({language === 'pl' ? 'wybierz kilka' : 'select multiple'})
            </span>
          </label>
          <div className="grid grid-cols-3 gap-2">
            {materialOptions.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => toggleMaterial(option.id)}
                className={`rounded-lg p-4 text-sm font-modern font-semibold transition-all duration-300 cursor-pointer group ${
                  colorsData.topMaterials?.includes(option.id)
                    ? 'bg-gold/30 border-2 border-gold text-graphite shadow-lg'
                    : 'bg-white/10 border border-white/30 text-graphite hover:bg-gold/10 hover:border-gold/50 hover:text-gold-700'
                }`}
              >
                {option.label[language]}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 justify-center mt-6">
        <GlassButton onClick={onBack} variant="secondary">
          <ArrowLeft size={18} className="mr-2" />
          {language === 'pl' ? 'Wstecz' : 'Back'}
        </GlassButton>
        <GlassButton 
          onClick={() => { onUpdate(colorsData); onNext(); }}
          disabled={!canProceed}
        >
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
        className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-gold via-champagne to-platinum flex items-center justify-center shadow-xl"
      >
        <Check size={40} className="text-white" />
      </motion.div>

      <h1 className="text-3xl lg:text-4xl xl:text-5xl font-nasalization bg-gradient-to-r from-gold via-champagne to-platinum bg-clip-text text-transparent mb-6">
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
          <Check size={18} />
        </GlassButton>
      </div>
    </GlassCard>
  );
}

