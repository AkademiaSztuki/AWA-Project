"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { useSessionData } from '@/hooks/useSessionData';
import { useLanguage } from '@/contexts/LanguageContext';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';
import { GlassAccordion } from '@/components/ui/GlassAccordion';
import { AwaContainer } from '@/components/awa/AwaContainer';
import { AwaDialogue } from '@/components/awa/AwaDialogue';
import { SensoryTestSuite, type SensoryTestSuiteHandle } from '@/components/research';
import { COLOR_PALETTE_OPTIONS, getPaletteLabel } from '@/components/setup/paletteOptions';
import { EducationSelect } from '@/components/setup/EducationSelect';
import { STYLE_OPTIONS } from '@/lib/questions/style-options';
import { ArrowRight, ArrowLeft, Sparkles, Heart, X, ChevronDown } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useFullFlowProgress } from '@/contexts/FullFlowProgressContext';
import {
  FULL_FLOW_MAX_JOURNEY_INDEX_STORAGE_KEY,
  isFullFlowFromDashboard,
  minJourneyIndexForCoreProfileStep,
  type CoreProfileWizardStepId,
} from '@/lib/flow/full-flow-progress';
import { LoginModal } from '@/components/auth/LoginModal';
import { computeWeightedDNAFromSwipes } from '@/lib/dna';
import { buildImplicitPreferenceProfile } from '@/lib/preferences/preference-comparison-registry';
import { stopAllDialogueAudio } from '@/hooks/useAudioManager';
import {
  saveResearchConsent,
  saveParticipantSwipes,
  safeSessionStorage,
  safeLocalStorage,
  saveSessionToGcp,
  logBehavioralEvent,
  startPageView,
  endPageView,
} from '@/lib/gcp-data';
import { getSessionStoreSnapshot } from '@/hooks/useSession';
import { initAnonSessionAfterConsent } from '@/lib/anon-session-client';
import Link from 'next/link';
import { GLASS_CARD_DESKTOP_GROW_STEP as STEP_CARD_HEIGHT } from '@/lib/flow/glass-step-layout';
import { topMaterialsFromSensorySuiteResults } from '@/lib/participants-mapper';

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

const WIZARD_STEP_STORAGE_KEY = 'awa-core-profile-step';

const WIZARD_STEPS: readonly WizardStep[] = [
  'consent',
  'demographics',
  'lifestyle',
  'tinder_swipes',
  'semantic_diff',
  'sensory_tests',
] as const;

function isWizardStep(value: string | null): value is WizardStep {
  return Boolean(value && (WIZARD_STEPS as readonly string[]).includes(value));
}

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

type CountryRegion = 'PL' | 'Europe' | 'Africa' | 'Americas' | 'AsiaPacific';

const COUNTRY_OPTIONS: Array<{
  code: string;
  region: CountryRegion;
  label: { pl: string; en: string };
}> = [
  // Primary focus country
  { code: 'PL', region: 'PL', label: { pl: 'Polska', en: 'Poland' } },

  // Europe
  { code: 'DE', region: 'Europe', label: { pl: 'Niemcy', en: 'Germany' } },
  { code: 'CZ', region: 'Europe', label: { pl: 'Czechy', en: 'Czech Republic' } },
  { code: 'SK', region: 'Europe', label: { pl: 'Słowacja', en: 'Slovakia' } },
  { code: 'UA', region: 'Europe', label: { pl: 'Ukraina', en: 'Ukraine' } },
  { code: 'GB', region: 'Europe', label: { pl: 'Wielka Brytania', en: 'United Kingdom' } },
  { code: 'IE', region: 'Europe', label: { pl: 'Irlandia', en: 'Ireland' } },
  { code: 'SE', region: 'Europe', label: { pl: 'Szwecja', en: 'Sweden' } },
  { code: 'NO', region: 'Europe', label: { pl: 'Norwegia', en: 'Norway' } },
  { code: 'FI', region: 'Europe', label: { pl: 'Finlandia', en: 'Finland' } },
  { code: 'DK', region: 'Europe', label: { pl: 'Dania', en: 'Denmark' } },
  { code: 'FR', region: 'Europe', label: { pl: 'Francja', en: 'France' } },
  { code: 'ES', region: 'Europe', label: { pl: 'Hiszpania', en: 'Spain' } },
  { code: 'PT', region: 'Europe', label: { pl: 'Portugalia', en: 'Portugal' } },
  { code: 'IT', region: 'Europe', label: { pl: 'Włochy', en: 'Italy' } },
  { code: 'NL', region: 'Europe', label: { pl: 'Holandia', en: 'Netherlands' } },
  { code: 'BE', region: 'Europe', label: { pl: 'Belgia', en: 'Belgium' } },
  { code: 'AT', region: 'Europe', label: { pl: 'Austria', en: 'Austria' } },
  { code: 'CH', region: 'Europe', label: { pl: 'Szwajcaria', en: 'Switzerland' } },
  { code: 'LT', region: 'Europe', label: { pl: 'Litwa', en: 'Lithuania' } },
  { code: 'LV', region: 'Europe', label: { pl: 'Łotwa', en: 'Latvia' } },
  { code: 'EE', region: 'Europe', label: { pl: 'Estonia', en: 'Estonia' } },
  { code: 'RO', region: 'Europe', label: { pl: 'Rumunia', en: 'Romania' } },
  { code: 'HU', region: 'Europe', label: { pl: 'Węgry', en: 'Hungary' } },
  { code: 'HR', region: 'Europe', label: { pl: 'Chorwacja', en: 'Croatia' } },
  { code: 'SI', region: 'Europe', label: { pl: 'Słowenia', en: 'Slovenia' } },
  { code: 'BG', region: 'Europe', label: { pl: 'Bułgaria', en: 'Bulgaria' } },
  { code: 'GR', region: 'Europe', label: { pl: 'Grecja', en: 'Greece' } },

  // Southern Africa focus
  { code: 'ZA', region: 'Africa', label: { pl: 'Republika Południowej Afryki', en: 'South Africa' } },
  { code: 'NA', region: 'Africa', label: { pl: 'Namibia', en: 'Namibia' } },
  { code: 'BW', region: 'Africa', label: { pl: 'Botswana', en: 'Botswana' } },
  { code: 'ZW', region: 'Africa', label: { pl: 'Zimbabwe', en: 'Zimbabwe' } },
  { code: 'MZ', region: 'Africa', label: { pl: 'Mozambik', en: 'Mozambique' } },
  { code: 'LS', region: 'Africa', label: { pl: 'Lesotho', en: 'Lesotho' } },
  { code: 'SZ', region: 'Africa', label: { pl: 'Eswatini', en: 'Eswatini' } },

  // Other African countries
  { code: 'NG', region: 'Africa', label: { pl: 'Nigeria', en: 'Nigeria' } },
  { code: 'KE', region: 'Africa', label: { pl: 'Kenia', en: 'Kenya' } },
  { code: 'GH', region: 'Africa', label: { pl: 'Ghana', en: 'Ghana' } },
  { code: 'EG', region: 'Africa', label: { pl: 'Egipt', en: 'Egypt' } },
  { code: 'MA', region: 'Africa', label: { pl: 'Maroko', en: 'Morocco' } },
  { code: 'TN', region: 'Africa', label: { pl: 'Tunezja', en: 'Tunisia' } },
  { code: 'DZ', region: 'Africa', label: { pl: 'Algieria', en: 'Algeria' } },
  { code: 'ET', region: 'Africa', label: { pl: 'Etiopia', en: 'Ethiopia' } },
  { code: 'TZ', region: 'Africa', label: { pl: 'Tanzania', en: 'Tanzania' } },
  { code: 'UG', region: 'Africa', label: { pl: 'Uganda', en: 'Uganda' } },
  { code: 'SN', region: 'Africa', label: { pl: 'Senegal', en: 'Senegal' } },
  { code: 'CM', region: 'Africa', label: { pl: 'Kamerun', en: 'Cameroon' } },
  { code: 'CI', region: 'Africa', label: { pl: 'Wybrzeże Kości Słoniowej', en: 'Côte d’Ivoire' } },
  { code: 'ZM', region: 'Africa', label: { pl: 'Zambia', en: 'Zambia' } },
  { code: 'RW', region: 'Africa', label: { pl: 'Rwanda', en: 'Rwanda' } },

  // Americas
  { code: 'US', region: 'Americas', label: { pl: 'Stany Zjednoczone', en: 'United States' } },
  { code: 'CA', region: 'Americas', label: { pl: 'Kanada', en: 'Canada' } },

  // Asia-Pacific
  { code: 'AU', region: 'AsiaPacific', label: { pl: 'Australia', en: 'Australia' } },
  { code: 'NZ', region: 'AsiaPacific', label: { pl: 'Nowa Zelandia', en: 'New Zealand' } },
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

  const [query, setQuery] = useState('');
  const countryRootRef = useRef<HTMLDivElement>(null);

  const handleCountryRootBlur = (e: React.FocusEvent<HTMLDivElement>) => {
    const next = e.relatedTarget as Node | null;
    if (next && countryRootRef.current?.contains(next)) return;
    setOpen(false);
  };

  const filteredOptions = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) {
      return COUNTRY_OPTIONS;
    }
    return COUNTRY_OPTIONS.filter((option) => {
      const label = option.label[language].toLowerCase();
      return (
        label.includes(term) ||
        option.code.toLowerCase().includes(term)
      );
    });
  }, [query, language]);

  const groupedOptions = useMemo(() => {
    const groups: Record<CountryRegion, typeof COUNTRY_OPTIONS> = {
      PL: [],
      Europe: [],
      Africa: [],
      Americas: [],
      AsiaPacific: [],
    };
    for (const option of filteredOptions) {
      groups[option.region].push(option);
    }
    return groups;
  }, [filteredOptions]);

  const regionLabel = (region: CountryRegion) => {
    if (region === 'PL') return language === 'pl' ? 'Najczęściej wybierane' : 'Most common';
    if (region === 'Europe') return language === 'pl' ? 'Europa' : 'Europe';
    if (region === 'Africa') return language === 'pl' ? 'Afryka' : 'Africa';
    if (region === 'Americas') return language === 'pl' ? 'Ameryki' : 'Americas';
    return language === 'pl' ? 'Azja i Pacyfik' : 'Asia & Pacific';
  };

  return (
    <div ref={countryRootRef} className="relative min-w-0" onBlur={handleCountryRootBlur}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="w-full rounded-lg border border-gold/60 bg-gradient-to-r from-gold/55 via-champagne/50 to-gold/35 p-3 text-sm font-modern text-graphite flex items-center justify-between focus:border-gold focus:outline-none backdrop-blur-lg shadow-sm"
      >
        <span>{selectedLabel}</span>
        <span className="text-graphite/70">▾</span>
      </button>

      {open && (
        <div className="absolute z-40 bottom-full mb-3 max-h-80 w-full min-w-0 overflow-hidden rounded-xl border border-white/25 bg-[#c7b07a] shadow-2xl ring-1 ring-gold/35 backdrop-blur-sm">
          <div className="border-b border-white/20 px-3 py-2 bg-[#c1a86e]/80">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={language === 'pl' ? 'Zacznij wpisywać kraj...' : 'Type to search country...'}
              className="w-full min-w-0 rounded-lg bg-white/80 px-3 py-1.5 text-xs font-modern text-graphite placeholder:text-graphite/50 focus:outline-none focus:ring-2 focus:ring-gold"
            />
          </div>
          <div className="max-h-60 min-h-0 overflow-y-auto overflow-x-hidden overscroll-y-contain px-1 py-1 space-y-2 awa-scrollbar">
            {(Object.entries(groupedOptions) as Array<[CountryRegion, typeof COUNTRY_OPTIONS]>).map(
              ([region, options]) =>
                options.length > 0 && (
                  <div key={region} className="min-w-0">
                    <div className="px-3 py-1 text-[11px] font-modern uppercase tracking-wide text-graphite/70">
                      {regionLabel(region as CountryRegion)}
                    </div>
                    <ul className="py-0.5 space-y-0.5">
                      {options.map((option) => (
                        <li key={option.code}>
                          <button
                            type="button"
                            className={`w-full min-w-0 text-left px-4 py-1.5 text-sm font-modern rounded-lg transition ${
                              value === option.code
                                ? 'bg-gold/80 text-white font-semibold shadow-inner drop-shadow-sm'
                                : 'text-graphite/90 hover:bg-gold/70 hover:text-white hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.55)]'
                            }`}
                            onMouseDown={(e) => {
                              e.preventDefault();
                              onChange(option.code);
                              setOpen(false);
                              setQuery('');
                            }}
                          >
                            {option.label[language]}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                ),
            )}
          </div>
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
  const searchParams = useSearchParams();
  const { updateSessionData, sessionData, isInitialized } = useSessionData();
  const { language } = useLanguage();
  const { user } = useAuth();
  const { setProfileStep } = useFullFlowProgress();

  const [currentStep, setCurrentStep] = useState<WizardStep>('consent');
  const pageViewTrackingRef = useRef<{ userHash: string; viewId: string } | null>(null);
  const hasRestoredStepRef = useRef(false);
  const sensorySuiteRef = useRef<SensoryTestSuiteHandle>(null);
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

  // Apply path_type from sessionStorage after login redirect (set by PathSelectionScreen)
  useEffect(() => {
    const stored = safeSessionStorage.getItem('aura_auth_path_type');
    if (stored === 'full') {
      safeSessionStorage.removeItem('aura_auth_path_type');
      updateSessionData({ pathType: 'full' });
    }
  }, [updateSessionData]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const uh = sessionData?.userHash;
      if (!uh) return;
      const viewId = await startPageView(uh, 'core_profile', { wizardStep: currentStep });
      if (viewId && mounted) {
        pageViewTrackingRef.current = { userHash: uh, viewId };
      }
    })();
    return () => {
      mounted = false;
      (async () => {
        const t = pageViewTrackingRef.current;
        if (t) await endPageView(t.userHash, t.viewId);
        pageViewTrackingRef.current = null;
      })();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionData?.userHash]);

  const steps = WIZARD_STEPS;

  // Restore saved step, `?step=` from progress bar (same-route navigation), or skip completed intro steps
  useEffect(() => {
    if (!isInitialized) return;

    const stepFromUrl = searchParams.get('step');
    const fromDashboard = isFullFlowFromDashboard(searchParams);
    if (isWizardStep(stepFromUrl) && typeof window !== 'undefined') {
      const maxRaw = sessionStorage.getItem(FULL_FLOW_MAX_JOURNEY_INDEX_STORAGE_KEY);
      const max = parseInt(maxRaw || '0', 10);
      const safeMax = Number.isFinite(max) && max >= 0 ? max : 0;
      const requested = stepFromUrl as CoreProfileWizardStepId;
      if (
        fromDashboard ||
        safeMax >= minJourneyIndexForCoreProfileStep(requested)
      ) {
        let resolved: WizardStep = stepFromUrl;
        if (
          stepFromUrl === 'demographics' &&
          sessionData.demographics?.ageRange &&
          sessionData.demographics?.gender
        ) {
          resolved = 'lifestyle';
        }
        setCurrentStep(resolved);
        sessionStorage.setItem(WIZARD_STEP_STORAGE_KEY, resolved);
        hasRestoredStepRef.current = true;
        router.replace('/setup/profile', { scroll: false });
        return;
      }
    }

    if (hasRestoredStepRef.current) return;
    hasRestoredStepRef.current = true;

    const hasConsent = !!sessionData.consentTimestamp;
    const hasDemographics = !!(sessionData.demographics?.ageRange && sessionData.demographics?.gender);

    if (typeof window !== 'undefined' && hasConsent && hasDemographics) {
      const raw = sessionStorage.getItem(WIZARD_STEP_STORAGE_KEY);
      if (isWizardStep(raw)) {
        setCurrentStep(raw);
        return;
      }
      if (raw) {
        sessionStorage.removeItem(WIZARD_STEP_STORAGE_KEY);
      }
    }

    if (hasConsent && hasDemographics) {
      console.log('[CoreProfileWizard] Skipping completed steps, going to lifestyle');
      setCurrentStep('lifestyle');
    } else if (hasConsent) {
      console.log('[CoreProfileWizard] Skipping consent, going to demographics');
      setCurrentStep('demographics');
    }
  }, [isInitialized, sessionData, searchParams, router]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    sessionStorage.setItem(WIZARD_STEP_STORAGE_KEY, currentStep);
  }, [currentStep]);

  useEffect(() => {
    setProfileStep(currentStep as CoreProfileWizardStepId);
    return () => {
      setProfileStep(null);
    };
  }, [currentStep, setProfileStep]);

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
      console.warn('[CoreProfileWizard] ⚠️ Cannot proceed - missing consent checkboxes');
      return; // Nie pozwól przejść dalej bez wszystkich checkboxów
    }
    
    console.log('[CoreProfileWizard] ✅ All consent checkboxes checked, proceeding...');
    stopAllDialogueAudio();
    const timestamp = new Date().toISOString();
    
    // Zapis zgody do bazy
    const userHash = sessionData?.userHash;
    if (userHash) {
      try {
        console.log('[CoreProfileWizard] Attempting to save consent with userHash:', userHash);
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
          console.warn('[CoreProfileWizard] ⚠️ Failed to save consent to database (returned null)');
        }
      } catch (error) {
        console.error('[CoreProfileWizard] ❌ Error saving consent:', error);
      }
    } else {
      console.warn('[CoreProfileWizard] ⚠️ No userHash available, skipping consent save');
    }
    
    console.log('[CoreProfileWizard] Updating session data and moving to next step...');
    await updateSessionData({ consentTimestamp: timestamp });
    void initAnonSessionAfterConsent();
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
    try {
      await saveSessionToGcp(getSessionStoreSnapshot() as unknown as Record<string, unknown>);
    } catch (e) {
      console.warn('[CoreProfileWizard] saveSessionToGcp after demographics failed:', e);
    }
    handleNext();
  };

  const flushSessionToGcp = async () => {
    try {
      await saveSessionToGcp(getSessionStoreSnapshot() as unknown as Record<string, unknown>);
    } catch (e) {
      console.warn('[CoreProfileWizard] saveSessionToGcp on step advance failed:', e);
    }
  };

  const handleNext = () => {
    void (async () => {
      if (currentStep === 'semantic_diff' && profileData.semanticDifferential) {
        await updateSessionData({
          semanticDifferential: profileData.semanticDifferential,
        });
      }

      const insight = generateInsight(currentStep, profileData);
      if (insight) {
        setCurrentInsight(insight);
      }

      const nextIndex = currentStepIndex + 1;
      if (nextIndex < steps.length) {
        setCurrentStep(steps[nextIndex]);
        await flushSessionToGcp();
      } else {
        await handleComplete();
      }
    })();
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

      const explicitTopMaterialsFinal = topMaterialsFromSensorySuiteResults({
        topMaterials:
          profileData.colorsAndMaterials?.topMaterials ??
          sessionData?.colorsAndMaterials?.topMaterials,
        texture:
          profileData.sensoryPreferences?.texture ?? sessionData?.sensoryPreferences?.texture,
      });

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
          return semantic;
        })(),
        
        // Colors & Materials (explicit)
        colorsAndMaterials: {
          ...(profileData.colorsAndMaterials || {}),
          topMaterials: explicitTopMaterialsFinal
        } as any,
        
        // Sensory preferences (explicit)
        sensoryPreferences: profileData.sensoryPreferences,
        
        // Biophilia score (psychological baseline)
        biophiliaScore: profileData.biophiliaScore,
        
        // Mark profile as complete
        coreProfileComplete: true,
        coreProfileCompletedAt: new Date().toISOString()
      });

      if (typeof window !== 'undefined') {
        sessionStorage.removeItem(WIZARD_STEP_STORAGE_KEY);
      }

      await saveSessionToGcp(getSessionStoreSnapshot() as unknown as Record<string, unknown>, {
        preferenceSnapshotMilestone: 'core_profile_complete',
      });

      if (user) {
        router.push('/flow/inspirations');
      } else {
        setShowLoginModal(true);
      }
    } catch (error) {
      console.error('Failed to save core profile:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLoginSuccess = async () => {
    setShowLoginModal(false);
    const hash =
      typeof window !== 'undefined'
        ? safeLocalStorage.getItem('aura_user_hash')
        : sessionData?.userHash;
    if (hash) {
      await updateSessionData({ userHash: hash });
    }
    router.push('/flow/inspirations');
  };

  const handleContinueWithoutAccount = useCallback(() => {
    setShowLoginModal(false);
    router.push('/flow/inspirations');
  }, [router]);

  return (
    <div className="awa-profile-no-scrollbars flex w-full flex-col">
      {/* Main Content */}
      <div className="w-full overflow-x-hidden">
        <div className="w-full max-w-full lg:max-w-none mx-auto space-y-2 sm:space-y-4 lg:space-y-6">
          
          {/* Step Content */}
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
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
                    const implicitProfile = buildImplicitPreferenceProfile(swipes);
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
                          colors: weighted.top.colors.slice(0, 5),
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
                        lightingMood: implicitProfile.lighting ?? undefined,
                      } as any
                    });

                    try {
                      await saveSessionToGcp(getSessionStoreSnapshot() as unknown as Record<string, unknown>);
                    } catch (e) {
                      console.warn('[CoreProfileWizard] saveSessionToGcp after tinder failed:', e);
                    }
                    
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
                <GlassCard
                  variant="flatOnMobile"
                  className={`p-3 sm:p-5 md:p-6 flex flex-col ${STEP_CARD_HEIGHT} !shadow-none w-full`}
                >
                      <SensoryTestSuite
                        ref={sensorySuiteRef}
                        className="flex w-full min-w-0 max-w-full flex-col"
                        initialSensoryPreferences={{
                          music:
                            profileData.sensoryPreferences?.music ??
                            sessionData?.sensoryPreferences?.music,
                          texture:
                            profileData.sensoryPreferences?.texture ??
                            sessionData?.sensoryPreferences?.texture,
                          light:
                            profileData.sensoryPreferences?.light ??
                            sessionData?.sensoryPreferences?.light,
                        }}
                        initialNatureMetaphor={
                          profileData.natureMetaphor ?? sessionData?.natureMetaphor
                        }
                        initialBiophiliaScore={
                          typeof profileData.biophiliaScore === 'number'
                            ? profileData.biophiliaScore
                            : typeof sessionData?.biophiliaScore === 'number'
                              ? sessionData.biophiliaScore
                              : undefined
                        }
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
                          const finalMaterials = topMaterialsFromSensorySuiteResults(results);
                          const materialValue = finalMaterials[0] ?? '';

                          updateProfile({
                            sensoryPreferences: {
                              music: results.music,
                              texture: materialValue,
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
                              texture: materialValue,
                              light: results.light
                            },
                            natureMetaphor: results.natureMetaphor,
                            colorsAndMaterials: {
                              selectedStyle: finalStyle,
                              selectedPalette: finalPalette,
                              topMaterials: finalMaterials
                            }
                          });
                          await flushSessionToGcp();
                          if (isFullFlowFromDashboard(searchParams)) {
                            router.push('/dashboard');
                            return;
                          }
                          handleNext();
                        }}
                      />

                    <div className="mt-6 flex shrink-0 justify-between sm:mt-8">
                      <GlassButton
                        onClick={() => {
                          if (sensorySuiteRef.current?.tryGoBackSubStep()) return;
                          handleBack();
                        }}
                        variant="secondary"
                      >
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
      <div className="fixed bottom-0 left-0 right-0 w-full z-50 pointer-events-none">
        <AwaDialogue 
          currentStep={STEP_TO_DIALOGUE[currentStep]} 
          fullWidth={true}
          autoHide={true}
        />
      </div>

      {/* Login Modal - shown after profile completion if not logged in */}
      <LoginModal 
        isOpen={showLoginModal}
        onClose={handleContinueWithoutAccount}
        onSuccess={handleLoginSuccess}
        gateMode="soft"
        nudgeLocation="setup_profile_complete"
        nudgeReason="login_required"
        redirectPath="/flow/inspirations"
        onMaybeLater={handleContinueWithoutAccount}
        onNudgeEvent={(ev) => {
          const h = sessionData?.userHash;
          if (h) void logBehavioralEvent(h, 'login_nudge', { page: 'setup-profile-complete', nudge: ev });
        }}
        softMaybeLaterLabel={{
          pl: 'Kontynuuj bez konta',
          en: 'Continue without account',
        }}
        message={language === 'pl' 
          ? 'Świetnie! Zaloguj się, aby zapisać profil na koncie i wrócić później. Możesz też kontynuować bez logowania — dane badawcze zapisujemy w tej sesji.'
          : 'Great! Sign in to save your profile to your account and return later. You can also continue without signing in — we still save your session for research.'}
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
      sessionCookieText:
        'Techniczne: po akceptacji zgody ustawiamy HttpOnly cookie z losowym identyfikatorem sesji anonimowej oraz (serwerowo) jednokierunkowy skrót adresu IP w celu ograniczenia nadużyć limitu darmowych generacji (nie w celu identyfikacji marketingowej).',
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
      accordion3Content: 'Dane mogą być przetwarzane przez dostawców infrastruktury niezbędnych do działania usługi: Vercel (hosting/analityka), Google Cloud (baza, magazyn, generacja obrazów, backend API), Stripe (płatności jeśli dotyczy).',
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
      sessionCookieText:
        'Technical: after you accept, we set an HttpOnly cookie with a random anonymous session id and a one-way server-side hash of the IP address to limit abuse of free generation quotas (not for marketing identification).',
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
      accordion3Content: 'Data may be processed by infrastructure providers necessary for service operation: Vercel (hosting/analytics), Google Cloud (database, storage, image generation, backend API), Stripe (payments if applicable).',
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
    <GlassCard variant="flatOnMobile" className={`p-6 md:p-8 flex flex-col ${STEP_CARD_HEIGHT} !shadow-none`}>
      <div className="flex flex-col">
        <div className="flex-1">
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
              <p className="leading-relaxed text-xs text-silver-dark mt-2">{texts.sessionCookieText}</p>
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
        </div>

        {/* Przyciski */}
        <div className="flex justify-between mt-8">
          <GlassButton variant="secondary" onClick={onExit}>
            <ArrowLeft size={18} />
            {texts.back}
          </GlassButton>

          <GlassButton onClick={onAgree} disabled={!canProceedConsent}>
            {texts.submit}
            <ArrowRight size={18} />
          </GlassButton>
        </div>
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
      <GlassCard variant="flatOnMobile" className={`p-6 md:p-8 flex flex-col ${STEP_CARD_HEIGHT} !shadow-none`}>
        <div className="flex flex-col">
          <div className="flex-1">
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
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {['18-24', '25-34', '35-44', '45-54', '55-64', '65+'].map((range) => (
                    <button
                      key={range}
                      type="button"
                      onClick={() => onUpdate({ ...data, ageRange: range })}
                      className={`rounded-lg p-3 text-xs sm:text-sm md:text-base font-modern font-semibold transition-all duration-300 cursor-pointer group ${
                        data.ageRange === range
                          ? 'bg-gold/30 border-2 border-gold text-graphite shadow-lg'
                          : 'bg-white/10 border border-white/30 text-graphite transition-all duration-200 ease-out hover:scale-[1.03] hover:bg-gold-400/22 hover:border-gold-400/50 hover:shadow-[0_0_30px_-8px_rgba(255,229,92,0.45)]'
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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
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
                      className={`rounded-lg p-4 text-xs sm:text-sm md:text-base font-modern font-semibold transition-all duration-300 cursor-pointer group ${
                        data.gender === option.id
                          ? 'bg-gold/30 border-2 border-gold text-graphite shadow-lg'
                          : 'bg-white/10 border border-white/30 text-graphite transition-all duration-200 ease-out hover:scale-[1.03] hover:bg-gold-400/22 hover:border-gold-400/50 hover:shadow-[0_0_30px_-8px_rgba(255,229,92,0.45)]'
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
                <EducationSelect
                  value={data.education}
                  onChange={(id) => onUpdate({ ...data, education: id })}
                  language={language}
                />
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
          </div>

          <div className="flex justify-between mt-8">
            <GlassButton variant="secondary" onClick={onBack}>
              <ArrowLeft size={18} />
              {texts.back}
            </GlassButton>

            <GlassButton disabled={!canProceed} onClick={onSubmit}>
              {texts.continue}
              <ArrowRight size={18} />
            </GlassButton>
          </div>
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
    <GlassCard variant="flatOnMobile" className={`p-6 md:p-8 flex flex-col ${STEP_CARD_HEIGHT} !shadow-none`}>
      <div className="flex flex-col">
        <div className="flex-1">
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {LIVING_SITUATION_OPTIONS.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => updateField('livingSituation', option.id)}
                    className={`rounded-lg p-4 text-xs sm:text-sm md:text-base font-modern font-semibold transition-all duration-300 cursor-pointer group ${
                      lifestyleData.livingSituation === option.id
                        ? 'bg-gold/30 border-2 border-gold text-graphite shadow-lg'
                        : 'bg-white/10 border border-white/30 text-graphite transition-all duration-200 ease-out hover:scale-[1.03] hover:bg-gold-400/22 hover:border-gold-400/50 hover:shadow-[0_0_30px_-8px_rgba(255,229,92,0.45)]'
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
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                {LIFE_VIBE_OPTIONS.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => updateField('lifeVibe', option.id)}
                    className={`rounded-lg p-3 sm:p-4 text-xs sm:text-sm md:text-base font-modern font-semibold transition-all duration-300 cursor-pointer group ${
                      lifestyleData.lifeVibe === option.id
                        ? 'bg-gold/30 border-2 border-gold text-graphite shadow-lg'
                        : 'bg-white/10 border border-white/30 text-graphite transition-all duration-200 ease-out hover:scale-[1.03] hover:bg-gold-400/22 hover:border-gold-400/50 hover:shadow-[0_0_30px_-8px_rgba(255,229,92,0.45)]'
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {GOAL_OPTIONS.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => toggleGoal(option.id)}
                    className={`rounded-lg p-4 text-xs sm:text-sm md:text-base font-modern font-semibold transition-all duration-300 cursor-pointer group ${
                      lifestyleData.goals?.includes(option.id)
                        ? 'bg-gold/30 border-2 border-gold text-graphite shadow-lg'
                        : 'bg-white/10 border border-white/30 text-graphite transition-all duration-200 ease-out hover:scale-[1.03] hover:bg-gold-400/22 hover:border-gold-400/50 hover:shadow-[0_0_30px_-8px_rgba(255,229,92,0.45)]'
                    }`}
                  >
                    {option.label[language]}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-between mt-8">
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
      </div>
    </GlassCard>
  );
}

function TinderSwipesStep({ onComplete, onBack }: any) {
  const { language } = useLanguage();
  const { sessionData } = useSessionData();
  const reduceMotion = useReducedMotion();
  const firstPhotoHintDoneRef = useRef(false);
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

  // Preload first 5 images immediately when images are loaded using link preload
  useEffect(() => {
    if (images.length > 0 && !isLoading) {
      const preloadCount = Math.min(5, images.length);
      for (let i = 0; i < preloadCount; i++) {
        const link = document.createElement('link');
        link.rel = 'preload';
        link.as = 'image';
        link.href = images[i].url;
        document.head.appendChild(link);
      }
    }
  }, [images, isLoading]);

  // Preload next 3-5 images when current index changes
  useEffect(() => {
    if (images.length > 0 && currentIndex < images.length - 1) {
      const preloadCount = Math.min(5, images.length - currentIndex - 1);
      for (let i = 1; i <= preloadCount; i++) {
        const nextImage = images[currentIndex + i];
        if (nextImage) {
          const link = document.createElement('link');
          link.rel = 'preload';
          link.as = 'image';
          link.href = nextImage.url;
          document.head.appendChild(link);
        }
      }
    }
  }, [currentIndex, images]);

  const currentImage = images[currentIndex];
  const isFirstCard = currentIndex === 0;
  useEffect(() => {
    if (currentIndex > 0) firstPhotoHintDoneRef.current = true;
  }, [currentIndex]);
  const firstCardCta = isFirstCard && !reduceMotion && !isLoading && !firstPhotoHintDoneRef.current;
  const progress = images.length > 0 ? (currentIndex / images.length) * 100 : 0;

  useEffect(() => {
    setStartTime(Date.now());
  }, [currentIndex]);

  const handleBackClick = () => {
    if (showInstructions) {
      onBack();
      return;
    }
    if (currentIndex > 0) {
      setCurrentIndex((i) => i - 1);
      setSwipes((s) => s.slice(0, -1));
      return;
    }
    setShowInstructions(true);
  };

  const handleSwipe = (direction: 'left' | 'right') => {
    
    if (!currentImage) {
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
        if (userHash) {
          await saveParticipantSwipes(userHash, [{
            imageId: currentImage.id,
            direction,
            reactionTimeMs: reactionTime,
            timestamp: Date.now(),
            tags: currentImage.tags,
            categories: currentImage.categories,
          }]);
        }
      } catch (e) {
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
      <GlassCard
        variant="flatOnMobile"
        className={`p-6 md:p-8 text-center relative flex w-full max-w-full flex-col ${STEP_CARD_HEIGHT} !shadow-none`}
      >
        <div className="flex w-full min-h-0 flex-1 flex-col items-center touch-none">
          <div className="flex w-full min-h-0 flex-1 flex-col items-center justify-center">
            <h2 className="text-xl md:text-2xl font-nasalization text-graphite mb-3">
              {language === 'pl' ? 'Wnętrzarski Tinder' : 'Interior Design Tinder'}
            </h2>
            <p className="min-h-[2.75rem] md:min-h-[3.25rem] text-graphite font-modern mb-4 text-sm [text-wrap:balance]">
              {language === 'pl' 
                ? `${isLoading ? 'Ładowanie...' : `Pokażę Ci ${images.length} różnych wnętrz. Reaguj sercem, nie głową!`}`
                : `${isLoading ? 'Loading...' : `I'll show you ${images.length} different interiors. React with your heart, not your head!`}`}
            </p>
            
            <div className="mb-6 flex justify-center gap-8">
              <div className="flex items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-full border border-red-400/20 bg-red-500/10 glass-panel backdrop-blur-xl">
                  <X className="text-red-500" size={18} />
                </div>
                <span className="text-sm font-modern text-graphite">{language === 'pl' ? 'Nie' : 'No'}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-full border border-green-400/20 bg-green-500/10 glass-panel backdrop-blur-xl">
                  <Heart className="text-green-500" size={18} />
                </div>
                <span className="text-sm font-modern text-graphite">{language === 'pl' ? 'Tak!' : 'Yes!'}</span>
              </div>
            </div>
          </div>

          <div className="mt-2 flex w-full max-w-full shrink-0 items-center justify-between gap-3">
            <GlassButton onClick={handleBackClick} variant="secondary">
              <ArrowLeft size={18} />
              {language === 'pl' ? 'Wstecz' : 'Back'}
            </GlassButton>
            <GlassButton onClick={() => setShowInstructions(false)}>
              {language === 'pl' ? 'Rozpocznij' : 'Start'}
              <ArrowRight size={18} />
            </GlassButton>
          </div>
        </div>
      </GlassCard>
    );
  }

  return (
      <GlassCard variant="flatOnMobile" className={`px-2 py-4 sm:p-6 flex flex-col ${STEP_CARD_HEIGHT} !shadow-none select-none`}>
      <div className="min-h-full flex flex-col touch-none">
        <div className="flex min-h-0 flex-1 flex-col">
          {isLoading ? (
            <div className="flex flex-1 items-center justify-center text-silver-dark">
              {language === 'pl' ? 'Ładowanie zdjęć...' : 'Loading images...'}
            </div>
          ) : (
            <div className="grid min-h-0 w-full flex-1 grid-rows-[auto_auto_minmax(0,1fr)] content-start gap-y-3">
              {/* Swipe card + glass actions inset at bottom of image */}
              <div>
                <div className="relative w-full aspect-[4/3] sm:aspect-[3/2] md:h-[480px] md:aspect-auto lg:h-[520px] overflow-hidden rounded-2xl">
                  {/* Hidden preload of next image for Next.js Image optimization */}
                  {images[currentIndex + 1] && (
                    <div className="absolute opacity-0 pointer-events-none w-1 h-1 overflow-hidden">
                      <Image
                        src={images[currentIndex + 1].url}
                        alt=""
                        width={1}
                        height={1}
                        loading="eager"
                      />
                    </div>
                  )}
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
                              className="object-cover object-center w-full h-full select-none"
                              priority={currentIndex === 0}
                              quality={75}
                              sizes="100vw"
                              loading={currentIndex < 3 ? "eager" : "lazy"}
                            />
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex justify-center bg-gradient-to-t from-black/35 via-black/10 to-transparent px-4 pb-4 pt-10 sm:px-5 sm:pb-5 sm:pt-12">
                    <div className="pointer-events-auto flex items-center gap-6 sm:gap-8">
                      <motion.button
                        whileHover={{ scale: 1.06 }}
                        whileTap={{ scale: 0.94 }}
                        onClick={() => handleSwipe('left')}
                        className="relative group flex h-16 w-16 items-center justify-center overflow-visible rounded-full border border-white/35 bg-white/12 shadow-lg backdrop-blur-xl transition-colors duration-200 hover:border-red-400/55 hover:bg-red-500/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/40 sm:h-[4.5rem] sm:w-[4.5rem]"
                        aria-label={language === 'pl' ? 'Nie podoba mi się' : 'Dislike'}
                        initial={firstCardCta ? { opacity: 0, y: 18, scale: 0.86 } : false}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={
                          firstCardCta
                            ? {
                                opacity: { delay: 0.35, duration: 0.4, ease: [0.22, 1, 0.36, 1] },
                                y: { delay: 0.35, type: 'spring', stiffness: 420, damping: 26 },
                                scale: { delay: 0.35, type: 'spring', stiffness: 420, damping: 26 },
                              }
                            : undefined
                        }
                      >
                        {firstCardCta && (
                          <motion.span
                            aria-hidden
                            className="pointer-events-none absolute inset-0 rounded-full"
                            initial={{ boxShadow: '0 0 0 0px rgba(248, 113, 113, 0.55)' }}
                            animate={{
                              boxShadow: [
                                '0 0 0 0px rgba(248, 113, 113, 0.45)',
                                '0 0 0 12px rgba(248, 113, 113, 0.12)',
                                '0 0 0 0px rgba(248, 113, 113, 0.35)',
                                '0 0 0 12px rgba(248, 113, 113, 0.1)',
                                '0 0 0 0px rgba(248, 113, 113, 0.45)',
                              ],
                            }}
                            transition={{
                              delay: 0.8,
                              duration: 1.4,
                              times: [0, 0.25, 0.5, 0.75, 1],
                              repeat: 1,
                              ease: 'easeInOut',
                            }}
                          />
                        )}
                        <X
                          size={22}
                          strokeWidth={2.25}
                          className="relative z-[1] text-red-400 transition-colors duration-200 group-hover:text-red-200"
                          aria-hidden="true"
                        />
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.06 }}
                        whileTap={{ scale: 0.94 }}
                        onClick={() => handleSwipe('right')}
                        className="relative group flex h-16 w-16 items-center justify-center overflow-visible rounded-full border border-white/35 bg-white/12 shadow-lg backdrop-blur-xl transition-colors duration-200 hover:border-green-400/55 hover:bg-green-500/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-400/40 sm:h-[4.5rem] sm:w-[4.5rem]"
                        aria-label={language === 'pl' ? 'Podoba mi się' : 'Like'}
                        initial={firstCardCta ? { opacity: 0, y: 18, scale: 0.86 } : false}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={
                          firstCardCta
                            ? {
                                opacity: { delay: 0.5, duration: 0.4, ease: [0.22, 1, 0.36, 1] },
                                y: { delay: 0.5, type: 'spring', stiffness: 420, damping: 26 },
                                scale: { delay: 0.5, type: 'spring', stiffness: 420, damping: 26 },
                              }
                            : undefined
                        }
                      >
                        {firstCardCta && (
                          <motion.span
                            aria-hidden
                            className="pointer-events-none absolute inset-0 rounded-full"
                            initial={{ boxShadow: '0 0 0 0px rgba(74, 222, 128, 0.45)' }}
                            animate={{
                              boxShadow: [
                                '0 0 0 0px rgba(74, 222, 128, 0.4)',
                                '0 0 0 12px rgba(74, 222, 128, 0.12)',
                                '0 0 0 0px rgba(74, 222, 128, 0.3)',
                                '0 0 0 12px rgba(74, 222, 128, 0.1)',
                                '0 0 0 0px rgba(74, 222, 128, 0.4)',
                              ],
                            }}
                            transition={{
                              delay: 0.95,
                              duration: 1.4,
                              times: [0, 0.25, 0.5, 0.75, 1],
                              repeat: 1,
                              ease: 'easeInOut',
                            }}
                          />
                        )}
                        <Heart
                          size={22}
                          strokeWidth={2.25}
                          className="relative z-[1] text-green-400 transition-colors duration-200 group-hover:text-green-200"
                          aria-hidden="true"
                        />
                      </motion.button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Progress - Moved below images as requested */}
              <div>
                <div className="flex justify-end items-center gap-2 mb-2" aria-live="polite" aria-atomic="true">
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

              {/* Soaks extra card height so controls stay directly under the progress bar */}
              <div className="min-h-0" aria-hidden="true" />
            </div>
          )}
        </div>

        <div className="flex justify-between mt-4">
          <GlassButton onClick={handleBackClick} variant="secondary">
            <ArrowLeft size={18} />
            {language === 'pl' ? 'Wstecz' : 'Back'}
          </GlassButton>
        </div>
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

  const handleBackClick = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion((q) => q - 1);
      return;
    }
    onBack();
  };

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
    <GlassCard variant="flatOnMobile" className={`p-6 md:p-8 flex flex-col justify-center ${STEP_CARD_HEIGHT} !shadow-none`}>
      <div className="flex flex-col justify-center">
        <div className="flex-1">
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
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
                sizes="(min-width: 768px) 50vw, 100vw"
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
                sizes="(min-width: 768px) 50vw, 100vw"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-4">
                <p className="text-white font-modern text-sm font-semibold">
                  {currentQ.rightLabel[language]}
                </p>
              </div>
            </button>
          </div>
        </div>

        <div className="flex justify-between mt-8">
          <GlassButton onClick={handleBackClick} variant="secondary">
            <ArrowLeft size={18} />
            {language === 'pl' ? 'Wstecz' : 'Back'}
          </GlassButton>
        </div>
      </div>
    </GlassCard>
  );
}

