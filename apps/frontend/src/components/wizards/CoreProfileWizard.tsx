"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useSessionData } from '@/hooks/useSessionData';
import { useLanguage } from '@/contexts/LanguageContext';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';
import { GlassAccordion } from '@/components/ui/GlassAccordion';
import { AwaContainer } from '@/components/awa/AwaContainer';
import { AwaDialogue } from '@/components/awa/AwaDialogue';
import { SensoryTestSuite } from '@/components/research';
import { COLOR_PALETTE_OPTIONS, getPaletteLabel } from '@/components/setup/paletteOptions';
import { STYLE_OPTIONS } from '@/lib/questions/style-options';
import { ArrowRight, ArrowLeft, Sparkles, Heart, X, ChevronDown } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { LoginModal } from '@/components/auth/LoginModal';
import { computeWeightedDNAFromSwipes } from '@/lib/dna';
import { stopAllDialogueAudio } from '@/hooks/useAudioManager';
import { saveResearchConsent, saveParticipantSwipes } from '@/lib/supabase';
import Link from 'next/link';

const STEP_CARD_HEIGHT = "min-h-[700px] max-h-[85vh]";

type WizardStep = 
  | 'consent'
  | 'demographics'
  | 'lifestyle'
  | 'tinder_swipes'
  | 'semantic_diff'
  | 'sensory_tests';

// Map wizard steps to AwaDialogue flow steps
const STEP_TO_DIALOGUE: Record<WizardStep, string> = {
  consent: 'onboarding',
  demographics: 'wizard_demographics',
  lifestyle: 'wizard_lifestyle',
  tinder_swipes: 'tinder',
  semantic_diff: 'wizard_semantic',
  sensory_tests: 'wizard_sensory'
};

// Heuristic extraction of implicit warmth / brightness / complexity from Tinder swipes
function computeImplicitSemanticsFromSwipes(swipes: Array<{ direction: 'left' | 'right'; tags?: string[]; categories?: any }>) {
  const liked = swipes.filter((s) => s.direction === 'right');
  if (liked.length === 0) return {};

  const warmTokens = new Set(['warm', 'cozy', 'earth', 'terracotta', 'gold', 'beige', 'wood', 'oak', 'sunny']);
  const coolTokens = new Set(['cool', 'ice', 'icy', 'blue', 'silver', 'chrome', 'steel']);
  const brightTokens = new Set(['bright', 'light', 'daylight', 'sunny', 'airy']);
  const darkTokens = new Set(['dark', 'moody', 'dim', 'shadow']);
  const complexTokens = new Set(['maximalist', 'ornate', 'pattern', 'patterned', 'busy', 'layered', 'decorative', 'eclectic', 'detailed']);
  const simpleTokens = new Set(['minimal', 'minimalist', 'clean', 'simple', 'plain']);

  let warmthScore = 0;
  let brightnessScore = 0;
  let complexityScore = 0;
  let warmthCount = 0;
  let brightnessCount = 0;
  let complexityCount = 0;

  const tokensFrom = (item: any) => {
    const tags = Array.isArray(item?.tags) ? item.tags : [];
    const categoriesTokens = [
      item?.categories?.style,
      ...(item?.categories?.colors || []),
      ...(item?.categories?.materials || []),
      ...(item?.categories?.mood || [])
    ].filter(Boolean);
    return [...tags, ...categoriesTokens].map((t: any) => t?.toString().toLowerCase()).filter(Boolean);
  };

  liked.forEach((s) => {
    const tokens = tokensFrom(s);

    tokens.forEach((t) => {
      if (warmTokens.has(t)) {
        warmthScore += 1;
        warmthCount++;
      } else if (coolTokens.has(t)) {
        warmthScore -= 1;
        warmthCount++;
      }

      if (brightTokens.has(t)) {
        brightnessScore += 1;
        brightnessCount++;
      } else if (darkTokens.has(t)) {
        brightnessScore -= 1;
        brightnessCount++;
      }

      if (complexTokens.has(t)) {
        complexityScore += 1;
        complexityCount++;
      } else if (simpleTokens.has(t)) {
        complexityScore -= 1;
        complexityCount++;
      }
    });

    // If API already gives numeric brightness/complexity, include them
    if (typeof s.categories?.brightness === 'number') {
      brightnessScore += s.categories.brightness - 0.5;
      brightnessCount++;
    }
    if (typeof s.categories?.complexity === 'number') {
      complexityScore += s.categories.complexity - 0.5;
      complexityCount++;
    }
  });

  const toPercent01 = (score: number, count: number) => {
    if (count === 0) return undefined;
    const normalized = 0.5 + score / (count * 2); // clamp around 0.5
    return Math.max(0, Math.min(1, normalized));
  };

  return {
    warmth: toPercent01(warmthScore, warmthCount),
    brightness: toPercent01(brightnessScore, brightnessCount),
    complexity: toPercent01(complexityScore, complexityCount)
  };
}

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

const getDefaultCountry = (language: 'pl' | 'en') => (language === 'pl' ? 'PL' : 'US');
const COUNTRY_OPTIONS = [
  { code: 'PL', label: { pl: 'Polska', en: 'Poland' } },
  { code: 'DE', label: { pl: 'Niemcy', en: 'Germany' } },
  { code: 'CZ', label: { pl: 'Czechy', en: 'Czech Republic' } },
  { code: 'SK', label: { pl: 'Słowacja', en: 'Slovakia' } },
  { code: 'UA', label: { pl: 'Ukraina', en: 'Ukraine' } },
  { code: 'GB', label: { pl: 'Wielka Brytania', en: 'United Kingdom' } },
  { code: 'IE', label: { pl: 'Irlandia', en: 'Ireland' } },
  { code: 'SE', label: { pl: 'Szwecja', en: 'Sweden' } },
  { code: 'NO', label: { pl: 'Norwegia', en: 'Norway' } },
  { code: 'FI', label: { pl: 'Finlandia', en: 'Finland' } },
  { code: 'DK', label: { pl: 'Dania', en: 'Denmark' } },
  { code: 'FR', label: { pl: 'Francja', en: 'France' } },
  { code: 'ES', label: { pl: 'Hiszpania', en: 'Spain' } },
  { code: 'PT', label: { pl: 'Portugalia', en: 'Portugal' } },
  { code: 'IT', label: { pl: 'Włochy', en: 'Italy' } },
  { code: 'NL', label: { pl: 'Holandia', en: 'Netherlands' } },
  { code: 'BE', label: { pl: 'Belgia', en: 'Belgium' } },
  { code: 'AT', label: { pl: 'Austria', en: 'Austria' } },
  { code: 'CH', label: { pl: 'Szwajcaria', en: 'Switzerland' } },
  { code: 'LT', label: { pl: 'Litwa', en: 'Lithuania' } },
  { code: 'LV', label: { pl: 'Łotwa', en: 'Latvia' } },
  { code: 'EE', label: { pl: 'Estonia', en: 'Estonia' } },
  { code: 'US', label: { pl: 'Stany Zjednoczone', en: 'United States' } },
  { code: 'CA', label: { pl: 'Kanada', en: 'Canada' } },
  { code: 'AU', label: { pl: 'Australia', en: 'Australia' } },
  { code: 'NZ', label: { pl: 'Nowa Zelandia', en: 'New Zealand' } },
  { code: 'RO', label: { pl: 'Rumunia', en: 'Romania' } },
  { code: 'HU', label: { pl: 'Węgry', en: 'Hungary' } },
  { code: 'HR', label: { pl: 'Chorwacja', en: 'Croatia' } },
  { code: 'SI', label: { pl: 'Słowenia', en: 'Slovenia' } },
  { code: 'BG', label: { pl: 'Bułgaria', en: 'Bulgaria' } },
  { code: 'GR', label: { pl: 'Grecja', en: 'Greece' } },
];

function CountrySelect({
  value,
  onChange,
  language
}: {
  value: string;
  onChange: (code: string) => void;
  language: 'pl' | 'en';
}) {
  const [open, setOpen] = useState(false);
  const selectedLabel = COUNTRY_OPTIONS.find((option) => option.code === value)?.label[language] ?? value;

  return (
    <div className="relative" tabIndex={0} onBlur={() => setOpen(false)}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="w-full rounded-lg border border-gold/60 bg-gradient-to-r from-gold/55 via-champagne/50 to-gold/35 p-3 text-sm font-modern text-graphite flex items-center justify-between focus:border-gold focus:outline-none backdrop-blur-lg shadow-sm"
      >
        <span>{selectedLabel}</span>
        <span className="text-graphite/70">▾</span>
      </button>

      {open && (
        <div className="absolute z-40 bottom-full mb-3 max-h-64 w-full overflow-auto rounded-xl border border-white/25 bg-[#c7b07a] shadow-2xl ring-1 ring-gold/35 backdrop-blur-sm">
          <ul className="py-1 space-y-0.5">
            {COUNTRY_OPTIONS.map((option) => (
              <li key={option.code}>
                <button
                  type="button"
                  className={`w-full text-left px-4 py-2 text-sm font-modern rounded-lg transition ${
                    value === option.code
                      ? 'bg-gold/80 text-white font-semibold shadow-inner drop-shadow-sm'
                      : 'text-graphite/90 hover:bg-gold/70 hover:text-white hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.55)]'
                  }`}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    onChange(option.code);
                    setOpen(false);
                  }}
                >
                  {option.label[language]}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

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
    country: string;
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
  const [consentState, setConsentState] = useState({
    consentResearch: false,
    consentProcessing: false,
    acknowledgedArt13: false
  });
  const [demographics, setDemographics] = useState({
    ageRange: '',
    gender: '',
    education: '',
    country: getDefaultCountry(language)
  });
  const canProceedDemographics = Boolean(demographics.ageRange && demographics.gender && demographics.education && demographics.country);

  useEffect(() => {
    setDemographics((prev) => ({
      ...prev,
      country: prev.country || getDefaultCountry(language)
    }));
  }, [language]);

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
    if (!consentState.consentResearch || !consentState.consentProcessing || !consentState.acknowledgedArt13) {
      return; // Nie pozwól przejść dalej bez wszystkich checkboxów
    }
    
    stopAllDialogueAudio();
    const timestamp = new Date().toISOString();
    
    // Zapis zgody do bazy
    const userHash = sessionData?.userHash;
    if (userHash) {
      try {
        const consentData = await saveResearchConsent(
          userHash,
          {
            consentResearch: consentState.consentResearch,
            consentProcessing: consentState.consentProcessing,
            acknowledgedArt13: consentState.acknowledgedArt13
          },
          language
        );
        
        if (consentData) {
          console.log('[CoreProfileWizard] ✅ Consent saved to database:', consentData.id);
        } else {
          console.warn('[CoreProfileWizard] ⚠️ Failed to save consent to database');
        }
      } catch (error) {
        console.error('[CoreProfileWizard] ❌ Error saving consent:', error);
      }
    } else {
      console.warn('[CoreProfileWizard] ⚠️ No userHash available, skipping consent save');
    }
    
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
      const implicitSemantics = computeImplicitSemanticsFromSwipes(profileData.tinderSwipes || []);
      const implicitScores = {
        warmth: profileData.semanticDifferential?.warmth ?? undefined,
        brightness: profileData.semanticDifferential?.brightness ?? undefined,
        complexity: profileData.semanticDifferential?.complexity ?? undefined
      };
      const mergedImplicit = {
        warmth: implicitSemantics.warmth ?? implicitScores.warmth,
        brightness: implicitSemantics.brightness ?? implicitScores.brightness,
        complexity: implicitSemantics.complexity ?? implicitScores.complexity
      };

      const mergedVisualDNA = {
        ...(sessionData?.visualDNA || {}),
        preferences: {
          ...(sessionData?.visualDNA?.preferences || {}),
          warmth: mergedImplicit.warmth,
          brightness: mergedImplicit.brightness,
          complexity: mergedImplicit.complexity
        },
        implicitScores: mergedImplicit
      };

      const explicitTopMaterials =
        profileData.colorsAndMaterials?.topMaterials?.length
          ? profileData.colorsAndMaterials.topMaterials
          : profileData.sensoryPreferences?.texture
          ? [profileData.sensoryPreferences.texture]
          : sessionData?.colorsAndMaterials?.topMaterials || [];

      // Save ALL profile data to session
      await updateSessionData({
        visualDNA: mergedVisualDNA as any,
        // Lifestyle
        lifestyle: profileData.lifestyle,
        
        // Big Five (if collected here)
        bigFive: profileData.bigFive as any,
        
        // Inspirations (if collected here)
        inspirations: profileData.inspirations,
        
        // Tinder swipes (implicit preferences)
        tinderData: {
          swipes: profileData.tinderSwipes || []
        },
        
        // Semantic differential (explicit warmth/brightness/complexity)
        semanticDifferential: (() => {
          const semantic = profileData.semanticDifferential;
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'CoreProfileWizard.tsx:handleComplete-semanticDifferential',message:'Saving semanticDifferential to sessionData',data:{warmth:semantic?.warmth,brightness:semantic?.brightness,complexity:semantic?.complexity,rawSemantic:semantic},timestamp:Date.now(),sessionId:'debug-session',runId:'session-save',hypothesisId:'B'})}).catch(()=>{});
          // #endregion
          return semantic;
        })(),
        
        // Colors & Materials (explicit)
        colorsAndMaterials: {
          ...(profileData.colorsAndMaterials || {}),
          topMaterials: explicitTopMaterials
        } as any,
        
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
                      consentState={consentState}
                      setConsentState={setConsentState}
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
                      onComplete={async (results) => {
                        // #region agent log
                        const resultsAny = results as any;
                        fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'CoreProfileWizard.tsx:onComplete-sensory',message:'Saving explicit preferences to profile',data:{resultsKeys:Object.keys(results),biophiliaScore:results.biophiliaScore,music:results.music,texture:results.texture,light:results.light,natureMetaphor:results.natureMetaphor,hasStyle:!!resultsAny.style,resultsStyle:resultsAny.style||null,resultsStyleType:typeof resultsAny.style,resultsStyleIsEmpty:resultsAny.style==='',hasPalette:!!resultsAny.palette,resultsPalette:resultsAny.palette||null,profileDataStyle:profileData.colorsAndMaterials?.selectedStyle||null,profileDataStyleType:typeof profileData.colorsAndMaterials?.selectedStyle,sessionDataStyle:sessionData.colorsAndMaterials?.selectedStyle||null,sessionDataStyleType:typeof sessionData.colorsAndMaterials?.selectedStyle},timestamp:Date.now(),sessionId:'debug-session',runId:'explicit-check',hypothesisId:'E5'})}).catch(()=>{});
                        // #endregion
                        const currentStyle = profileData.colorsAndMaterials?.selectedStyle;
                        const finalStyle =
                          results.style ||
                          sessionData.colorsAndMaterials?.selectedStyle ||
                          currentStyle ||
                          '';
                        const finalPalette =
                          (results as any).palette ||
                          sessionData.colorsAndMaterials?.selectedPalette ||
                          profileData.colorsAndMaterials?.selectedPalette ||
                          '';
                        const finalMaterials =
                          (results as any).topMaterials ||
                          sessionData.colorsAndMaterials?.topMaterials ||
                          profileData.colorsAndMaterials?.topMaterials ||
                          [];

                        // #region agent log
                        fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'CoreProfileWizard.tsx:onComplete-sensory-explicit',message:'Resolved explicit before persist',data:{finalStyle,finalPalette,materialsCount:finalMaterials.length},timestamp:Date.now(),sessionId:'debug-session',runId:'explicit-check',hypothesisId:'E16'})}).catch(()=>{});
                        // #endregion

                        updateProfile({
                          sensoryPreferences: {
                            music: results.music,
                            texture: results.texture,
                            light: results.light
                          },
                          natureMetaphor: results.natureMetaphor,
                          biophiliaScore: results.biophiliaScore,
                          colorsAndMaterials: {
                            ...(profileData.colorsAndMaterials || {}),
                            selectedStyle: finalStyle,
                            selectedPalette: finalPalette,
                            topMaterials: finalMaterials
                          }
                        });
                        // CRITICAL: Save biophiliaScore to sessionData immediately to prevent sync issues
                        // CRITICAL: Use finalStyle, finalPalette, finalMaterials directly, not from profileData
                        await updateSessionData({
                          biophiliaScore: results.biophiliaScore,
                          sensoryPreferences: {
                            music: results.music,
                            texture: results.texture,
                            light: results.light
                          },
                          natureMetaphor: results.natureMetaphor,
                          colorsAndMaterials: {
                            selectedStyle: finalStyle,
                            selectedPalette: finalPalette,
                            topMaterials: finalMaterials
                          }
                        });
                        // #region agent log
                        fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'CoreProfileWizard.tsx:onComplete-sensory-updateSessionData',message:'Immediately saving biophiliaScore to sessionData',data:{biophiliaScore:results.biophiliaScore,sessionDataUpdated:true},timestamp:Date.now(),sessionId:'debug-session',runId:'explicit-check',hypothesisId:'E15'})}).catch(()=>{});
                        // #endregion
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

      {/* Dialog IDA na dole - dynamiczny dla każdego kroku */}
      <div className="fixed bottom-0 left-0 right-0 w-full z-50">
        <AwaDialogue 
          currentStep={STEP_TO_DIALOGUE[currentStep]} 
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

function ConsentStep({ 
  onAgree, 
  onExit,
  consentState,
  setConsentState
}: { 
  onAgree: () => void; 
  onExit: () => void;
  consentState: {
    consentResearch: boolean;
    consentProcessing: boolean;
    acknowledgedArt13: boolean;
  };
  setConsentState: (state: {
    consentResearch: boolean;
    consentProcessing: boolean;
    acknowledgedArt13: boolean;
  }) => void;
}) {
  const { language } = useLanguage();
  const [showLearnMore, setShowLearnMore] = useState(false);

  const consentTexts = {
    pl: {
      title: 'Zgoda na udział w badaniu',
      administrator: 'Administrator danych',
      administratorText: 'Jakub Palka, kontakt: jakub.palka@akademiasztuki.eu',
      purpose: 'Cel',
      purposeText: 'Badanie analizuje, jak interaktywny system AI wpływa na proces twórczy w projektowaniu wnętrz; wyniki opracowywane statystycznie i publikowane zbiorczo.',
      scope: 'Zakres danych',
      scopeText: 'Dane konta (e-mail), odpowiedzi i wyniki testów, preferencje i interakcje (np. czasy reakcji), przesłane zdjęcia wnętrz oraz dane techniczne/analityczne działania serwisu.',
      voluntary: 'Dobrowolność',
      voluntaryText: 'Udział jest dobrowolny; można przerwać i wycofać zgodę w dowolnym momencie poprzez e-mail.',
      rights: 'Prawa',
      rightsText: 'Prawa z RODO + prawo skargi do Prezesa UODO (szczegóły w Polityce prywatności).',
      photos: 'Zdjęcia',
      photosText: 'Przesyłaj tylko zdjęcia wnętrz; nie przesyłaj zdjęć osób, dokumentów ani danych wrażliwych.',
      acceptAll: 'Akceptuję wszystkie warunki i wyrażam zgodę',
      consent1: 'Zgoda na udział w badaniu',
      consent2: 'Zgoda na przetwarzanie danych osobowych',
      consent3: 'Zapoznałem się z informacją (art. 13 RODO)',
      consentNote: 'Zgodę możesz wycofać w dowolnym momencie, kontaktując się mailowo.',
      learnMore: 'Dowiedz się więcej',
      accordion1Title: 'Podstawa prawna i profilowanie',
      accordion1Content: 'Podstawa: zgoda. System analizuje odpowiedzi i zachowania w celu personalizacji wyników/generacji (profilowanie w celach badawczych/personalizacji).',
      accordion2Title: 'Jakie dane zbieramy',
      accordion2Content: 'Konto: e-mail + identyfikator użytkownika. Badawcze: wyniki testów, odpowiedzi, czasy reakcji, metadane interakcji. Techniczne/analityczne: dane o urządzeniu/przeglądarce + dane analityczne (Vercel).',
      accordion3Title: 'Narzędzia i odbiorcy danych',
      accordion3Content: 'Dane mogą być przetwarzane przez dostawców infrastruktury niezbędnych do działania usługi: Vercel (hosting/analityka), Supabase (auth/db/storage), Modal, Google Cloud, Stripe (płatności jeśli dotyczy).',
      accordion4Title: 'Jak długo przechowujemy dane',
      accordion4Content: 'Na czas realizacji badań + okres niezbędny do archiwizacji danych badawczych; konto do czasu usunięcia konta/wycofania zgody (z zastrzeżeniem obowiązków prawnych).',
      accordion5Title: 'Twoje prawa',
      accordion5Content: 'Dostęp, sprostowanie, usunięcie, ograniczenie, skarga do UODO; realizacja praw przez e-mail.',
      privacy: 'Polityka prywatności',
      terms: 'Regulamin',
      contact: 'Kontakt',
      back: 'Wstecz',
      submit: 'Dalej'
    },
    en: {
      title: 'Research Participation Consent',
      administrator: 'Data Administrator',
      administratorText: 'Jakub Palka, contact: jakub.palka@akademiasztuki.eu',
      purpose: 'Purpose',
      purposeText: 'The study analyzes how an interactive AI system influences the creative process in interior design; results are processed statistically and published collectively.',
      scope: 'Data Scope',
      scopeText: 'Account data (email), test responses and results, preferences and interactions (e.g., reaction times), uploaded interior photos, and technical/analytical service operation data.',
      voluntary: 'Voluntary Participation',
      voluntaryText: 'Participation is voluntary; you can stop and withdraw consent at any time via email.',
      rights: 'Rights',
      rightsText: 'GDPR rights + right to file a complaint with the Data Protection Authority (details in Privacy Policy).',
      photos: 'Photos',
      photosText: 'Upload only interior photos; do not upload photos of people, documents, or sensitive data.',
      acceptAll: 'I accept all terms and give consent',
      consent1: 'Consent to participate in study',
      consent2: 'Consent to personal data processing',
      consent3: 'I have read the information (Article 13 GDPR)',
      consentNote: 'You can withdraw your consent at any time by contacting us via email.',
      learnMore: 'Learn more',
      accordion1Title: 'Legal Basis and Profiling',
      accordion1Content: 'Basis: consent. The system analyzes responses and behaviors to personalize results/generation (profiling for research/personalization purposes).',
      accordion2Title: 'What Data We Collect',
      accordion2Content: 'Account: email + user identifier. Research: test results, responses, reaction times, interaction metadata. Technical/analytical: device/browser data + analytical data (Vercel).',
      accordion3Title: 'Tools and Data Recipients',
      accordion3Content: 'Data may be processed by infrastructure providers necessary for service operation: Vercel (hosting/analytics), Supabase (auth/db/storage), Modal, Google Cloud, Stripe (payments if applicable).',
      accordion4Title: 'Data Retention Period',
      accordion4Content: 'For the duration of the study + period necessary for research data archiving; account until account deletion/consent withdrawal (subject to legal obligations).',
      accordion5Title: 'Your Rights',
      accordion5Content: 'Access, rectification, deletion, restriction, complaint to Data Protection Authority; rights exercised via email.',
      privacy: 'Privacy Policy',
      terms: 'Terms of Service',
      contact: 'Contact',
      back: 'Back',
      submit: 'Continue'
    }
  };

  const texts = consentTexts[language];
  const canProceedConsent = consentState.consentResearch && consentState.consentProcessing && consentState.acknowledgedArt13;

  return (
    <GlassCard className={`p-6 md:p-8 ${STEP_CARD_HEIGHT} overflow-auto scrollbar-hide`}>
      <h2 className="text-xl md:text-2xl font-nasalization text-graphite mb-2">
        {texts.title}
      </h2>

      {/* Warstwa 1: Krótkie bloki informacyjne */}
      <div className="space-y-2.5 text-graphite font-modern text-xs mb-5">
        <div className="p-2.5 rounded-lg bg-white/5 border border-white/10">
          <h3 className="text-gold font-semibold mb-1 text-xs uppercase tracking-wide">
            {texts.administrator}
          </h3>
          <p className="leading-relaxed">{texts.administratorText}</p>
        </div>

        <div className="p-2.5 rounded-lg bg-white/5 border border-white/10">
          <h3 className="text-gold font-semibold mb-1 text-xs uppercase tracking-wide">
            {texts.purpose}
          </h3>
          <p className="leading-relaxed">{texts.purposeText}</p>
        </div>

        <div className="p-2.5 rounded-lg bg-white/5 border border-white/10">
          <h3 className="text-gold font-semibold mb-1 text-xs uppercase tracking-wide">
            {texts.scope}
          </h3>
          <p className="leading-relaxed">{texts.scopeText}</p>
        </div>

        <div className="p-2.5 rounded-lg bg-white/5 border border-white/10">
          <h3 className="text-gold font-semibold mb-1 text-xs uppercase tracking-wide">
            {texts.voluntary}
          </h3>
          <p className="leading-relaxed">{texts.voluntaryText}</p>
        </div>

        <div className="p-2.5 rounded-lg bg-white/5 border border-white/10">
          <h3 className="text-gold font-semibold mb-1 text-xs uppercase tracking-wide">
            {texts.rights}
          </h3>
          <p className="leading-relaxed">{texts.rightsText}</p>
        </div>

        <div className="p-2.5 rounded-lg bg-white/5 border border-white/10">
          <h3 className="text-gold font-semibold mb-1 text-xs uppercase tracking-wide">
            {texts.photos}
          </h3>
          <p className="leading-relaxed">{texts.photosText}</p>
        </div>
      </div>

      {/* Główny checkbox "Akceptuję wszystkie" */}
      <div className="mb-4 pb-4 border-b border-white/20">
        <label className="flex items-center gap-3 cursor-pointer group">
          <div className="relative">
            <input
              type="checkbox"
              checked={consentState.consentResearch && consentState.consentProcessing && consentState.acknowledgedArt13}
              onChange={(e) => {
                const allChecked = e.target.checked;
                setConsentState({
                  consentResearch: allChecked,
                  consentProcessing: allChecked,
                  acknowledgedArt13: allChecked
                });
              }}
              className="w-5 h-5 rounded border-2 border-gold/60 bg-white/10 backdrop-blur-sm text-gold focus:ring-2 focus:ring-gold focus:ring-offset-1 focus:ring-offset-transparent cursor-pointer transition-all appearance-none checked:bg-gold/40 checked:border-gold relative z-10"
            />
            {consentState.consentResearch && consentState.consentProcessing && consentState.acknowledgedArt13 && (
              <svg className="absolute top-0.5 left-0.5 w-4 h-4 text-graphite pointer-events-none z-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            )}
          </div>
          <span className="text-sm font-semibold text-graphite font-modern flex-1 group-hover:text-gold transition-colors">
            {texts.acceptAll}
          </span>
        </label>
      </div>

      {/* Szczegółowe checkboxy (opcjonalne, można je rozwinąć) */}
      <details className="mb-4">
        <summary className="text-xs text-silver-dark font-modern cursor-pointer hover:text-gold transition-colors mb-2">
          {language === 'pl' ? 'Szczegóły zgód' : 'Consent details'}
        </summary>
        <div className="space-y-2.5 mt-3 pl-2 border-l-2 border-gold/20">
          <label className="flex items-center gap-3 cursor-pointer group">
            <div className="relative">
              <input
                type="checkbox"
                checked={consentState.consentResearch}
                onChange={(e) => setConsentState({ ...consentState, consentResearch: e.target.checked })}
                className="w-4 h-4 rounded border-2 border-gold/60 bg-white/10 backdrop-blur-sm text-gold focus:ring-2 focus:ring-gold focus:ring-offset-1 focus:ring-offset-transparent cursor-pointer transition-all appearance-none checked:bg-gold/40 checked:border-gold relative z-10"
              />
              {consentState.consentResearch && (
                <svg className="absolute top-0 left-0 w-4 h-4 text-graphite pointer-events-none z-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
            <span className="text-xs text-graphite font-modern flex-1">
              {texts.consent1}
            </span>
          </label>

          <label className="flex items-center gap-3 cursor-pointer group">
            <div className="relative">
              <input
                type="checkbox"
                checked={consentState.consentProcessing}
                onChange={(e) => setConsentState({ ...consentState, consentProcessing: e.target.checked })}
                className="w-4 h-4 rounded border-2 border-gold/60 bg-white/10 backdrop-blur-sm text-gold focus:ring-2 focus:ring-gold focus:ring-offset-1 focus:ring-offset-transparent cursor-pointer transition-all appearance-none checked:bg-gold/40 checked:border-gold relative z-10"
              />
              {consentState.consentProcessing && (
                <svg className="absolute top-0 left-0 w-4 h-4 text-graphite pointer-events-none z-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
            <span className="text-xs text-graphite font-modern flex-1">
              {texts.consent2}
            </span>
          </label>

          <label className="flex items-center gap-3 cursor-pointer group">
            <div className="relative">
              <input
                type="checkbox"
                checked={consentState.acknowledgedArt13}
                onChange={(e) => setConsentState({ ...consentState, acknowledgedArt13: e.target.checked })}
                className="w-4 h-4 rounded border-2 border-gold/60 bg-white/10 backdrop-blur-sm text-gold focus:ring-2 focus:ring-gold focus:ring-offset-1 focus:ring-offset-transparent cursor-pointer transition-all appearance-none checked:bg-gold/40 checked:border-gold relative z-10"
              />
              {consentState.acknowledgedArt13 && (
                <svg className="absolute top-0 left-0 w-4 h-4 text-graphite pointer-events-none z-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
            <span className="text-xs text-graphite font-modern flex-1">
              {texts.consent3}
            </span>
          </label>
        </div>
      </details>

      <p className="text-xs text-silver-dark font-modern mb-4 italic">
        {texts.consentNote}
      </p>

      {/* Przycisk "Dowiedz się więcej" ze strzałką */}
      <div className="rounded-xl overflow-hidden mb-3 bg-white/10 backdrop-blur-xl border border-white/20 shadow-xl">
        <button
          type="button"
          onClick={() => setShowLearnMore(!showLearnMore)}
          className="w-full px-4 py-2.5 flex items-center justify-between text-left hover:bg-white/5 transition-colors"
        >
          <span className="text-sm font-semibold text-graphite font-modern">
            {texts.learnMore}
          </span>
          <ChevronDown
            size={20}
            className={`text-gold transition-transform duration-200 ${showLearnMore ? 'rotate-180' : ''}`}
          />
        </button>
      </div>

      {/* Akordeony "Dowiedz się więcej" - pokazują się po kliknięciu */}
      {showLearnMore && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.3 }}
          className="space-y-3 mb-5 overflow-hidden"
        >
          <GlassAccordion title={texts.accordion1Title}>
            <p className="text-sm">{texts.accordion1Content}</p>
          </GlassAccordion>

          <GlassAccordion title={texts.accordion2Title}>
            <p className="text-sm">{texts.accordion2Content}</p>
          </GlassAccordion>

          <GlassAccordion title={texts.accordion3Title}>
            <p className="text-sm">{texts.accordion3Content}</p>
          </GlassAccordion>

          <GlassAccordion title={texts.accordion4Title}>
            <p className="text-sm">{texts.accordion4Content}</p>
          </GlassAccordion>

          <GlassAccordion title={texts.accordion5Title}>
            <p className="text-sm">{texts.accordion5Content}</p>
          </GlassAccordion>
        </motion.div>
      )}

      {/* Linki na dole */}
      <div className="flex flex-wrap gap-4 justify-center text-xs text-gold font-modern mb-5 border-t border-white/20 pt-4">
        <Link href="/privacy" className="hover:text-champagne transition-colors underline">
          {texts.privacy}
        </Link>
        <Link href="/terms" className="hover:text-champagne transition-colors underline">
          {texts.terms}
        </Link>
        <a href="mailto:jakub.palka@akademiasztuki.eu" className="hover:text-champagne transition-colors underline">
          {texts.contact}
        </a>
      </div>

      {/* Przyciski */}
      <div className="flex justify-between mt-6">
        <GlassButton variant="secondary" onClick={onExit}>
          <ArrowLeft size={18} />
          {texts.back}
        </GlassButton>

        <GlassButton onClick={onAgree} disabled={!canProceedConsent}>
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
      country: 'Kraj zamieszkania',
      back: 'Wstecz',
      continue: 'Kontynuuj'
    },
    en: {
      title: 'A Few Quick Questions',
      subtitle: 'Help us better understand the diversity of study participants',
      age: 'Age range',
      gender: 'Gender',
      education: 'Education level',
      country: 'Country of residence',
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
        <h2 className="text-xl md:text-2xl font-nasalization text-graphite drop-shadow-sm mb-2">
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

          <div>
            <label className="block text-sm font-semibold text-graphite mb-2">
              {texts.country}
            </label>
            <CountrySelect
              value={data.country}
              onChange={(code) => onUpdate({ ...data, country: code })}
              language={language}
            />
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
  const { sessionData } = useSessionData();
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
    // #region agent log
    void fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'CoreProfileWizard.tsx:TinderSwipesStep:handleSwipe-entry',message:'handleSwipe called in CoreProfileWizard',data:{direction,hasCurrentImage:!!currentImage,currentImageId:currentImage?.id,userHash:(sessionData as any)?.userHash},timestamp:Date.now(),sessionId:'debug-session',runId:'flow-debug',hypothesisId:'H8'})}).catch(()=>{});
    // #endregion
    
    if (!currentImage) {
      // #region agent log
      void fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'CoreProfileWizard.tsx:TinderSwipesStep:handleSwipe-no-image',message:'No currentImage, returning early',data:{direction},timestamp:Date.now(),sessionId:'debug-session',runId:'flow-debug',hypothesisId:'H8'})}).catch(()=>{});
      // #endregion
      return;
    }
    
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
    
    // Save swipe to participant_swipes immediately
    (async () => {
      try {
        const userHash = (sessionData as any)?.userHash;
        // #region agent log
        void fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'CoreProfileWizard.tsx:TinderSwipesStep:handleSwipe-saving',message:'Saving swipe to participant_swipes',data:{userHash,imageId:currentImage.id,direction,reactionTimeMs:reactionTime},timestamp:Date.now(),sessionId:'debug-session',runId:'flow-debug',hypothesisId:'H8'})}).catch(()=>{});
        // #endregion
        if (userHash) {
          await saveParticipantSwipes(userHash, [{
            imageId: currentImage.id,
            direction,
            reactionTimeMs: reactionTime,
            timestamp: Date.now(),
            tags: currentImage.tags,
            categories: currentImage.categories,
          }]);
          // #region agent log
          void fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'CoreProfileWizard.tsx:TinderSwipesStep:handleSwipe-complete',message:'Swipe saved successfully',data:{userHash,imageId:currentImage.id,direction},timestamp:Date.now(),sessionId:'debug-session',runId:'flow-debug',hypothesisId:'H8'})}).catch(()=>{});
          // #endregion
        }
      } catch (e) {
        // #region agent log
        void fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'CoreProfileWizard.tsx:TinderSwipesStep:handleSwipe-error',message:'Error saving swipe',data:{error:e instanceof Error?e.message:String(e)},timestamp:Date.now(),sessionId:'debug-session',runId:'flow-debug',hypothesisId:'H8'})}).catch(()=>{});
        // #endregion
        console.error('Error saving swipe to participant_swipes:', e);
      }
    })();
    
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

  const currentQ = questions[currentQuestion];

  const handleChoice = (side: 'left' | 'right') => {
    const value = side === 'left' ? 0.2 : 0.8;
    const newAnswers = { ...answers, [currentQ.id]: value };
    setAnswers(newAnswers);
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'CoreProfileWizard.tsx:handleChoice',message:'Semantic differential choice captured',data:{questionId:currentQ.id,side,value,allAnswers:newAnswers},timestamp:Date.now(),sessionId:'debug-session',runId:'semantic-capture',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
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
            style={{ objectPosition: 'center 30%' }}
            onLoad={() => {
              // #region agent log
              fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'CoreProfileWizard.tsx:leftImage-onLoad',message:'Profile setup semantic differential left image loaded',data:{questionId:currentQ.id,imageUrl:currentQ.leftImage},timestamp:Date.now(),sessionId:'debug-session',runId:'image-load-check',hypothesisId:'H1'})}).catch(()=>{});
              // #endregion
            }}
            onError={() => {
              // #region agent log
              fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'CoreProfileWizard.tsx:leftImage-onError',message:'Profile setup semantic differential left image failed',data:{questionId:currentQ.id,imageUrl:currentQ.leftImage},timestamp:Date.now(),sessionId:'debug-session',runId:'image-load-check',hypothesisId:'H2'})}).catch(()=>{});
              // #endregion
            }}
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
            style={{ objectPosition: 'center 30%' }}
            onLoad={() => {
              // #region agent log
              fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'CoreProfileWizard.tsx:rightImage-onLoad',message:'Profile setup semantic differential right image loaded',data:{questionId:currentQ.id,imageUrl:currentQ.rightImage},timestamp:Date.now(),sessionId:'debug-session',runId:'image-load-check',hypothesisId:'H1'})}).catch(()=>{});
              // #endregion
            }}
            onError={() => {
              // #region agent log
              fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'CoreProfileWizard.tsx:rightImage-onError',message:'Profile setup semantic differential right image failed',data:{questionId:currentQ.id,imageUrl:currentQ.rightImage},timestamp:Date.now(),sessionId:'debug-session',runId:'image-load-check',hypothesisId:'H2'})}).catch(()=>{});
              // #endregion
            }}
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

