"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useSessionData } from '@/hooks/useSessionData';
import { useLanguage } from '@/contexts/LanguageContext';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';
import { AwaContainer } from '@/components/awa/AwaContainer';
import { AwaDialogue } from '@/components/awa/AwaDialogue';
import { SensoryTestSuite } from '@/components/research';
import { COLOR_PALETTE_OPTIONS, getPaletteLabel } from '@/components/setup/paletteOptions';
import { STYLE_OPTIONS } from '@/lib/questions/style-options';
import { ArrowRight, ArrowLeft, Sparkles, Heart, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { LoginModal } from '@/components/auth/LoginModal';
import { computeWeightedDNAFromSwipes } from '@/lib/dna';
import { stopAllDialogueAudio } from '@/hooks/useAudioManager';

const STEP_CARD_HEIGHT = "min-h-[700px] max-h-[85vh]";

type WizardStep = 
  | 'consent'
  | 'demographics'
  | 'lifestyle'
  | 'tinder_swipes'
  | 'semantic_diff'
  | 'sensory_tests';

const LIVING_SITUATION_OPTIONS = [
  { id: 'alone', label: { pl: 'Sam/Sama', en: 'Alone' } },
  { id: 'partner', label: { pl: 'Z Partnerem', en: 'With Partner' } },
  { id: 'family', label: { pl: 'Rodzina', en: 'Family' } },
  { id: 'roommates', label: { pl: 'Współlokatorzy', en: 'Roommates' } }
];

const LIFE_VIBE_OPTIONS = [
  { id: 'calm', label: { pl: 'Spokojny', en: 'Calm' } },
  { id: 'chaotic', label: { pl: 'Chaotyczny', en: 'Chaotic' } },
  { id: 'creative', label: { pl: 'Kreatywny', en: 'Creative' } },
  { id: 'organized', label: { pl: 'Zorganizowany', en: 'Organized' } },
  { id: 'social', label: { pl: 'Społeczny', en: 'Social' } },
  { id: 'introverted', label: { pl: 'Introwertyczny', en: 'Introverted' } }
];

const GOAL_OPTIONS = [
  { id: 'peace', label: { pl: 'Spokój i relaks', en: 'Peace and relaxation' } },
  { id: 'creativity', label: { pl: 'Kreatywność i inspiracja', en: 'Creativity and inspiration' } },
  { id: 'productivity', label: { pl: 'Produktywność i focus', en: 'Productivity and focus' } },
  { id: 'connection', label: { pl: 'Więź z bliskimi', en: 'Connection with loved ones' } },
  { id: 'privacy', label: { pl: 'Prywatność i autonomia', en: 'Privacy and autonomy' } },
  { id: 'beauty', label: { pl: 'Estetyka i piękno', en: 'Aesthetics and beauty' } }
];

const getLivingSituationLabel = (livingSituation?: string, language: 'pl' | 'en' = 'pl') =>
  LIVING_SITUATION_OPTIONS.find(o => o.id === livingSituation)?.label[language];

const getGoalLabels = (goalIds: string[] = [], language: 'pl' | 'en' = 'pl') =>
  goalIds
    .map(id => GOAL_OPTIONS.find(option => option.id === id)?.label[language])
    .filter(Boolean) as string[];

interface CoreProfileData {
  demographics?: {
    ageRange: string;
    gender: string;
    education: string;
  };
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
    selectedPalette?: string;
    topMaterials?: string[];
    selectedStyle?: string;
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
 * - Explicit preferences (semantic differential, colors)
 * - Sensory preferences (music, texture, light)
 * - Aspirational rituals / feelings
 * - Psychological baseline (biophilia)
 * 
 * Takes ~12-15 minutes, saved forever, reused for all rooms
 */
export function CoreProfileWizard() {
  const router = useRouter();
  const { updateSessionData, sessionData } = useSessionData();
  const { language } = useLanguage();
  const { user, linkUserHashToAuth } = useAuth();
  
  const [currentStep, setCurrentStep] = useState<WizardStep>('consent');
  const [profileData, setProfileData] = useState<CoreProfileData>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentInsight, setCurrentInsight] = useState<string>('');
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [demographics, setDemographics] = useState({
    ageRange: '',
    gender: '',
    education: ''
  });
  const canProceedDemographics = Boolean(demographics.ageRange && demographics.gender && demographics.education);

  const steps: WizardStep[] = [
    'consent',
    'demographics',
    'lifestyle',
    'tinder_swipes',
    'semantic_diff',
    'sensory_tests'
  ];

  const currentStepIndex = steps.indexOf(currentStep);

  const paletteLabel = getPaletteLabel(profileData.colorsAndMaterials?.selectedPalette, language);
  const livingSituationLabel = getLivingSituationLabel(profileData.lifestyle?.livingSituation, language);
  const goalLabels = getGoalLabels(profileData.lifestyle?.goals, language);

  const sensoryProfileContext = {
    paletteLabel,
    livingSituation: livingSituationLabel,
    goals: goalLabels
  };

  const updateProfile = (data: Partial<CoreProfileData> | ((prev: CoreProfileData) => Partial<CoreProfileData>)) => {
    setProfileData(prev => {
      const nextData = typeof data === 'function' ? data(prev) : data;
      return { ...prev, ...nextData };
    });
  };

  // Generate personalized IDA insight based on profile data
  const generateInsight = (step: WizardStep, data: CoreProfileData): string => {
    const insights = {
      consent: () => '',
      demographics: () => '',
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

  const handleConsentAgree = async () => {
    stopAllDialogueAudio();
    const timestamp = new Date().toISOString();
    await updateSessionData({ consentTimestamp: timestamp });
    handleNext();
  };

  const handleExitToHome = () => {
    stopAllDialogueAudio();
    router.push('/');
  };

  const handleDemographicsSubmit = async () => {
    if (!canProceedDemographics) return;
    stopAllDialogueAudio();
    await updateSessionData({ demographics });
    updateProfile({ demographics });
    handleNext();
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
    } else {
      handleComplete();
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
    if (isSubmitting) return;
    setIsSubmitting(true);
    
    try {
      // Save ALL profile data to session
      await updateSessionData({
        // Lifestyle
        lifestyle: profileData.lifestyle,
        
        // Big Five (if collected here)
        bigFive: profileData.bigFive,
        
        // Inspirations (if collected here)
        inspirations: profileData.inspirations,
        
        // Tinder swipes (implicit preferences)
        tinderData: {
          swipes: profileData.tinderSwipes || []
        },
        
        // Semantic differential (explicit warmth/brightness/complexity)
        semanticDifferential: profileData.semanticDifferential,
        
        // Colors & Materials (explicit)
        colorsAndMaterials: profileData.colorsAndMaterials as any,
        
        // Sensory preferences (explicit)
        sensoryPreferences: profileData.sensoryPreferences,
        
        // Biophilia score (psychological baseline)
        biophiliaScore: profileData.biophiliaScore,
        
        // Mark profile as complete
        coreProfileComplete: true,
        coreProfileCompletedAt: new Date().toISOString()
      });

      // Continue with flow - go to inspirations next
      router.push('/flow/inspirations');
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
    
    // Continue with flow - go to photo upload next
    router.push('/flow/photo');
  };

  return (
    <div className="flex flex-col w-full">
      {/* Main Content */}
      <div className="flex-1 flex justify-center items-start">
        <div className="w-full max-w-3xl lg:max-w-none mx-auto space-y-6">
          
          {/* Step Content */}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
                  {currentStep === 'consent' && (
                    <ConsentStep 
                      onAgree={handleConsentAgree}
                      onExit={handleExitToHome}
                    />
                  )}

                  {currentStep === 'demographics' && (
                    <ProfileDemographicsStep 
                      data={demographics}
                      onUpdate={setDemographics}
                      onBack={handleBack}
                      onSubmit={handleDemographicsSubmit}
                      canProceed={canProceedDemographics}
                    />
                  )}

              {currentStep === 'lifestyle' && (
                <LifestyleStep 
                  data={profileData.lifestyle}
                  onUpdate={(data: { livingSituation: string; lifeVibe: string; goals: string[] }) => updateProfile({ lifestyle: data })}
                  onNext={handleNext}
                  onBack={handleBack}
                />
              )}

              {currentStep === 'tinder_swipes' && (
                <TinderSwipesStep 
                  onComplete={async (swipes: Array<{ imageId: number; direction: 'left' | 'right'; reactionTime: number; dwellTime: number }>) => {
                    updateProfile({ tinderSwipes: swipes });
                    
                    // Compute DNA analysis in background
                    const weighted = computeWeightedDNAFromSwipes(swipes, swipes.length);
                    const dominantStyle = weighted.top.styles.join(' + ') || 'Modern';
                    const colorPalette = weighted.top.colors.join(' + ') || 'Neutral colors';
                    const materials = weighted.top.materials.join(' + ') || 'Natural materials';
                    const lighting = weighted.top.lighting.join(' + ') || 'Soft lighting';
                    const mood = weighted.top.mood.join(' + ') || 'Cozy';
                    
                    // Save visualDNA to session
                    await updateSessionData({
                      visualDNA: {
                        dominantTags: [dominantStyle, ...weighted.top.colors, ...weighted.top.materials].filter(Boolean),
                        preferences: {
                          colors: weighted.top.colors,
                          materials: weighted.top.materials,
                          styles: weighted.top.styles,
                          lighting: weighted.top.lighting,
                        },
                        accuracyScore: Math.round(weighted.confidence),
                        dominantStyle,
                        colorPalette,
                        materialsSummary: materials,
                        lightingSummary: lighting,
                        moodSummary: mood,
                      } as any
                    });
                    
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

              {currentStep === 'sensory_tests' && (
                <GlassCard className={`p-6 md:p-8 h-[70vh] flex flex-col`}>
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
                  <div className="flex-1 overflow-y-auto scrollbar-hide pr-1">
                    <SensoryTestSuite 
                      className="flex flex-col h-full"
                      paletteOptions={COLOR_PALETTE_OPTIONS}
                      selectedPalette={profileData.colorsAndMaterials?.selectedPalette}
                      onPaletteSelect={(paletteId) =>
                        updateProfile((prev) => ({
                          colorsAndMaterials: {
                            ...(prev.colorsAndMaterials || { topMaterials: [] }),
                            selectedPalette: paletteId
                          }
                        }))
                      }
                      styleOptions={STYLE_OPTIONS}
                      selectedStyle={profileData.colorsAndMaterials?.selectedStyle}
                      onStyleSelect={(styleId) =>
                        updateProfile((prev) => ({
                          colorsAndMaterials: {
                            selectedPalette: prev.colorsAndMaterials?.selectedPalette,
                            topMaterials: prev.colorsAndMaterials?.topMaterials || [],
                            selectedStyle: styleId
                          }
                        }))
                      }
                      onComplete={(results) => {
                        updateProfile({
                          sensoryPreferences: {
                            music: results.music,
                            texture: results.texture,
                            light: results.light
                          },
                          natureMetaphor: results.natureMetaphor,
                          biophiliaScore: results.biophiliaScore,
                          ...(results.style && {
                            colorsAndMaterials: {
                              ...profileData.colorsAndMaterials,
                              selectedStyle: results.style
                            }
                          })
                        });
                        handleNext();
                      }}
                    />
                  </div>
                  <div className="flex justify-between mt-6">
                    <GlassButton onClick={handleBack} variant="secondary">
                      <ArrowLeft size={18} />
                      {language === 'pl' ? 'Wstecz' : 'Back'}
                    </GlassButton>
                  </div>
                </GlassCard>
              )}

            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Dialog IDA na dole - cała szerokość */}
      <div className="w-full">
        <AwaDialogue 
          currentStep="onboarding" 
          message={currentInsight}
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

function ConsentStep({ onAgree, onExit }: { onAgree: () => void; onExit: () => void }) {
  const { language } = useLanguage();

  const consentTexts = {
    pl: {
      title: 'Zgoda na Udział w Badaniu',
      purpose: 'Cel Badania',
      purposeText: 'Badanie prowadzone przez Akademię Sztuk Pięknych ma na celu zbadanie, w jaki sposób interaktywny system AI wpływa na proces twórczy w projektowaniu wnętrz.',
      yourData: 'Twoje Dane',
      dataText: 'Wszystkie dane będą przetwarzane anonimowo. Zamiast danych osobowych używamy unikalnego, losowego identyfikatora. Dane będą wykorzystane wyłącznie do celów naukowych i nie będą udostępniane osobom trzecim.',
      collected: 'Co Będzie Zbierane?',
      agree: 'Wyrażam Zgodę Na:',
      consent1: 'Przetwarzanie moich danych w sposób anonimowy dla celów badawczych',
      consent2: 'Udział w badaniu naukowym Akademii Sztuk Pięknych',
      consent3: 'Rozumiem, że moje dane będą w pełni zanonimizowane',
      back: 'Wstecz',
      submit: 'Zgadzam się i Dalej'
    },
    en: {
      title: 'Research Participation Consent',
      purpose: 'Study Purpose',
      purposeText: 'This study conducted by the Academy of Fine Arts aims to investigate how interactive AI systems influence the creative process in interior design.',
      yourData: 'Your Data',
      dataText: 'All data will be processed anonymously. Instead of personal information, we use a unique, random identifier. Data will be used solely for scientific purposes and will not be shared with third parties.',
      collected: 'What Will Be Collected?',
      agree: 'I Consent To:',
      consent1: 'Processing my data anonymously for research purposes',
      consent2: 'Participation in the Academy of Fine Arts research study',
      consent3: 'I understand that my data will be fully anonymized',
      back: 'Back',
      submit: 'I Agree and Continue'
    }
  };

  const texts = consentTexts[language];

  return (
    <GlassCard className={`p-6 md:p-8 ${STEP_CARD_HEIGHT} overflow-auto scrollbar-hide`}>
      <h1 className="text-xl md:text-2xl font-nasalization bg-gradient-to-r from-gold to-champagne bg-clip-text text-transparent mb-3">
        {texts.title}
      </h1>

      <div className="space-y-3 text-graphite font-modern text-xs md:text-sm">
        <div>
          <h3 className="text-lg font-semibold text-gold mb-2">
            {texts.purpose}
          </h3>
          <p>{texts.purposeText}</p>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-gold mb-2">
            {texts.yourData}
          </h3>
          <p>{texts.dataText}</p>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-gold mb-2">
            {texts.collected}
          </h3>
          <ul className="list-disc list-inside space-y-1">
            <li>{language === 'pl' ? 'Twoje wybory i preferencje wizualne' : 'Your choices and visual preferences'}</li>
            <li>{language === 'pl' ? 'Czasy reakcji i wzorce interakcji' : 'Reaction times and interaction patterns'}</li>
            <li>{language === 'pl' ? 'Oceny i odpowiedzi na pytania' : 'Ratings and survey responses'}</li>
            <li>{language === 'pl' ? 'Informacje o procesie projektowym' : 'Information about the design process'}</li>
          </ul>
        </div>
      </div>

      <div className="flex justify-between mt-6">
        <GlassButton variant="secondary" onClick={onExit}>
          <ArrowLeft size={18} />
          {texts.back}
        </GlassButton>

        <GlassButton onClick={onAgree}>
          {texts.submit}
          <ArrowRight size={18} />
        </GlassButton>
      </div>
    </GlassCard>
  );
}

function ProfileDemographicsStep({ data, onUpdate, onBack, onSubmit, canProceed }: any) {
  const { language } = useLanguage();

  const demographicsTexts = {
    pl: {
      title: 'Kilka Szybkich Pytań',
      subtitle: 'Pomogą nam lepiej zrozumieć różnorodność uczestników badania',
      age: 'Przedział wiekowy',
      gender: 'Płeć',
      education: 'Wykształcenie',
      back: 'Wstecz',
      continue: 'Kontynuuj'
    },
    en: {
      title: 'A Few Quick Questions',
      subtitle: 'Help us better understand the diversity of study participants',
      age: 'Age range',
      gender: 'Gender',
      education: 'Education level',
      back: 'Back',
      continue: 'Continue'
    }
  };

  const texts = demographicsTexts[language];

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.6 }}
    >
      <GlassCard className={`p-6 md:p-8 ${STEP_CARD_HEIGHT} overflow-auto scrollbar-hide`}>
        <h2 className="text-xl md:text-2xl font-nasalization bg-gradient-to-r from-gold to-champagne bg-clip-text text-transparent mb-2">
          {texts.title}
        </h2>
        <p className="text-graphite font-modern mb-6 text-sm">
          {texts.subtitle}
        </p>

        <div className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-graphite mb-2">
              {texts.age}
            </label>
            <div className="grid grid-cols-3 gap-2">
              {['18-24', '25-34', '35-44', '45-54', '55-64', '65+'].map((range) => (
                <button
                  key={range}
                  type="button"
                  onClick={() => onUpdate({ ...data, ageRange: range })}
                  className={`rounded-lg p-3 text-sm font-modern font-semibold transition-all duration-300 cursor-pointer group ${
                    data.ageRange === range
                      ? 'bg-gold/30 border-2 border-gold text-graphite shadow-lg'
                      : 'bg-white/10 border border-white/30 text-graphite hover:bg-gold/10 hover:border-gold/50 hover:text-gold-700'
                  }`}
                >
                  {range}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-graphite mb-2">
              {texts.gender}
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'female', label: language === 'pl' ? 'Kobieta' : 'Female' },
                { id: 'male', label: language === 'pl' ? 'Mężczyzna' : 'Male' },
                { id: 'non-binary', label: language === 'pl' ? 'Niebinarna' : 'Non-binary' },
                { id: 'prefer-not-say', label: language === 'pl' ? 'Wolę nie mówić' : 'Prefer not to say' }
              ].map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => onUpdate({ ...data, gender: option.id })}
                  className={`rounded-lg p-4 text-sm font-modern font-semibold transition-all duration-300 cursor-pointer group ${
                    data.gender === option.id
                      ? 'bg-gold/30 border-2 border-gold text-graphite shadow-lg'
                      : 'bg-white/10 border border-white/30 text-graphite hover:bg-gold/10 hover:border-gold/50 hover:text-gold-700'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-graphite mb-2">
              {texts.education}
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'high-school', label: language === 'pl' ? 'Średnie' : 'High School' },
                { id: 'bachelor', label: language === 'pl' ? 'Licencjat' : 'Bachelor\'s' },
                { id: 'master', label: language === 'pl' ? 'Magister' : 'Master\'s' },
                { id: 'doctorate', label: language === 'pl' ? 'Doktorat' : 'Doctorate' }
              ].map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => onUpdate({ ...data, education: option.id })}
                  className={`rounded-lg p-3 text-sm font-modern font-semibold transition-all duration-300 cursor-pointer group ${
                    data.education === option.id
                      ? 'bg-gold/30 border-2 border-gold text-graphite shadow-lg'
                      : 'bg-white/10 border border-white/30 text-graphite hover:bg-gold/10 hover:border-gold/50 hover:text-gold-700'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-between mt-6">
          <GlassButton variant="secondary" onClick={onBack}>
            <ArrowLeft size={18} />
            {texts.back}
          </GlassButton>

          <GlassButton disabled={!canProceed} onClick={onSubmit}>
            {texts.continue}
            <ArrowRight size={18} />
          </GlassButton>
        </div>
      </GlassCard>
    </motion.div>
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

  return (
    <GlassCard className={`p-6 md:p-8 ${STEP_CARD_HEIGHT} overflow-auto scrollbar-hide`}>
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
            {LIVING_SITUATION_OPTIONS.map((option) => (
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
            {LIFE_VIBE_OPTIONS.map((option) => (
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
            {GOAL_OPTIONS.map((option) => (
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

      <div className="flex justify-between mt-6">
        <GlassButton onClick={onBack} variant="secondary">
          <ArrowLeft size={18} />
          {language === 'pl' ? 'Wstecz' : 'Back'}
        </GlassButton>
        <GlassButton 
          onClick={() => { onUpdate(lifestyleData); onNext(); }}
          disabled={!canProceed}
        >
          {language === 'pl' ? 'Dalej' : 'Next'}
          <ArrowRight size={18} />
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
    <GlassCard className={`p-6 md:p-8 text-center min-h-[700px] max-h-[85vh] overflow-auto scrollbar-hide flex flex-col justify-center items-center`}>
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

        <div className="flex justify-between">
          <GlassButton onClick={onBack} variant="secondary">
            <ArrowLeft size={18} />
            {language === 'pl' ? 'Wstecz' : 'Back'}
          </GlassButton>
          <GlassButton onClick={() => setShowInstructions(false)}>
            {language === 'pl' ? 'Rozpocznij' : 'Start'}
            <ArrowRight size={18} />
          </GlassButton>
        </div>
      </GlassCard>
    );
  }

  return (
    <GlassCard className={`p-4 sm:p-6 min-h-[700px] max-h-[85vh] flex flex-col`}>
      {isLoading ? (
        <div className="flex flex-1 items-center justify-center text-silver-dark">
          {language === 'pl' ? 'Ładowanie zdjęć...' : 'Loading images...'}
        </div>
      ) : (
        <div className="flex-1 flex flex-col">
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
        </div>
      )}

      <div className="flex justify-between mt-6">
        <GlassButton onClick={onBack} variant="secondary">
          <ArrowLeft size={18} />
          {language === 'pl' ? 'Wstecz' : 'Back'}
        </GlassButton>
      </div>
    </GlassCard>
  );
}

function SemanticDifferentialStep({ data, onUpdate, onNext, onBack }: any) {
  const { language } = useLanguage();
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState(data || {});

  const questions = [
    {
      id: 'warmth',
      question: { pl: 'Które wnętrze bardziej do Ciebie pasuje?', en: 'Which interior suits you better?' },
      leftLabel: { pl: 'Zimne', en: 'Cool' },
      rightLabel: { pl: 'Ciepłe', en: 'Warm' },
      leftImage: '/images/tinder/Living Room (2).jpg',
      rightImage: '/images/tinder/Living Room (1).jpg'
    },
    {
      id: 'brightness',
      question: { pl: 'Które wnętrze bardziej do Ciebie pasuje?', en: 'Which interior suits you better?' },
      leftLabel: { pl: 'Ciemne', en: 'Dark' },
      rightLabel: { pl: 'Jasne', en: 'Bright' },
      leftImage: '/images/tinder/Living Room (3).jpg',
      rightImage: '/images/tinder/Living Room (1).jpg'
    },
    {
      id: 'complexity',
      question: { pl: 'Które wnętrze bardziej do Ciebie pasuje?', en: 'Which interior suits you better?' },
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
    <GlassCard className={`p-6 md:p-8 min-h-[700px] max-h-[85vh] overflow-auto scrollbar-hide flex flex-col justify-center`}>
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

      <div className="flex justify-between mt-6">
        <GlassButton onClick={onBack} variant="secondary">
          <ArrowLeft size={18} />
          {language === 'pl' ? 'Wstecz' : 'Back'}
        </GlassButton>
      </div>
    </GlassCard>
  );
}

