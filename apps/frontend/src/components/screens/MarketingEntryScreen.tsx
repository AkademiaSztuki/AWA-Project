"use client";

import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  AnimatePresence,
  animate,
  LayoutGroup,
  motion,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useTransform,
  type MotionValue,
} from 'framer-motion';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowRight,
  Brain,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Heart,
  Home,
  Layers,
  PlayCircle,
  Sparkles,
  Upload,
  Wand2,
  type LucideIcon,
} from 'lucide-react';
import { GlassButton, GlassCard } from '@/components/ui';
import { LoginModal } from '@/components/auth/LoginModal';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { GOOGLE_AUTH_USER_ID_STORAGE_KEY } from '@/lib/auth-storage-keys';
import { useLayout } from '@/contexts/LayoutContext';
import { useWcagSettings } from '@/contexts/WcagSettingsContext';
import { getLayoutViewportWidth } from '@/lib/layout-viewport';
import { navigateWithChunkFallback } from '@/lib/navigation/chunk-safe-navigation';
import { navigateToFlowPath } from '@/lib/flow/path-navigation';
import { cn } from '@/lib/utils';
import { BODY_TEXT_CLASS, joinContentOrphans } from '@/lib/typography';
import Image from 'next/image';
import {
  buildLivingRoomMarketingCards,
  type LivingRoomMarketingCard,
} from '@/lib/tinder-livingroom-marketing-strip';
import { useIsMobile } from '@/hooks/useIsMobile';
import { usePreferHardNavigation } from '@/hooks/useSlowNetwork';
import { useSessionData } from '@/hooks/useSessionData';
import { stopAllDialogueAudio } from '@/hooks/useAudioManager';
import { MarketingHowItWorksIllustration } from '@/components/marketing/MarketingHowItWorksIllustration';
import {
  HERO_EMPTY_ROOM_FILE,
  HERO_INTERIOR_SLIDES,
  heroInteriorImageSrc,
  type HeroInteriorSlide,
} from '@/lib/marketing/hero-interior-slides';
import { useMarketingIdaIntro } from '@/components/marketing/MarketingIdaIntro';

/** Align with SubscriptionPlans / subscription plans page founders offer. */
const FOUNDERS_LAUNCH_SLOTS = 1000;
const PATH_AFTER_FREE_TRY = '/flow/path-selection';

function resolveClientAuthUserId(userId: string | undefined): string | undefined {
  if (userId?.trim()) return userId.trim();
  if (typeof window === 'undefined') return undefined;
  return localStorage.getItem(GOOGLE_AUTH_USER_ID_STORAGE_KEY)?.trim() || undefined;
}

/** Child layout effects can run before portal hosts mount — retry briefly (production DOM, local dev race). */
function resolvePortalHost(elementId: string, onResolved: (host: HTMLElement) => void): () => void {
  const tryResolve = () => {
    const el = document.getElementById(elementId);
    if (el) onResolved(el);
    return Boolean(el);
  };

  if (tryResolve()) return () => undefined;

  let rafId = 0;
  const schedule = (attempt: number) => {
    rafId = window.requestAnimationFrame(() => {
      if (tryResolve() || attempt >= 8) return;
      schedule(attempt + 1);
    });
  };
  schedule(0);

  return () => {
    if (rafId !== 0) window.cancelAnimationFrame(rafId);
  };
}

const copy = {
  pl: {
    eyebrow: 'IDA Interior Design Assistant',
    headline: 'Zobacz swoje wnętrze zaprojektowane pod Twoją osobowość',
    subheadline:
      'Punktem wyjścia jest Twoja przestrzeń. IDA pokazuje wiele możliwych wersji przyszłego wnętrza, dopasowanych do stylu życia, nastroju i tego, jak chcesz się czuć w przestrzeni.',
    primaryCta: 'Stwórz moje wnętrze',
    tryForFreeCta: 'Wypróbuj za darmo',
    secondaryCta: 'Zobacz jak działa',
    earlyAccessLine: `Wczesny dostęp · Basic za 0 zł · 6000 kredytów · limit ${FOUNDERS_LAUNCH_SLOTS} pierwszych osób`,
    loginModalTitle: 'Załóż konto lub zaloguj się',
    loginModalMessage:
      'Po rejestracji i weryfikacji e-maila możesz skorzystać z oferty na start i przejść do projektowania.',
    proof: [
      'Pierwsze propozycje w kilka minut',
      `Oferta na start: Basic za 0 zł · 6000 kredytów · limit ${FOUNDERS_LAUNCH_SLOTS} pierwszych osób`,
      'Dopasowanie do profilu i kontrola nad kolorem, światłem i detalami',
    ],
    after: 'Wersja IDA',
    visualTitle: 'Porównaj pustą przestrzeń z wariantami IDA',
    visualSubtitle:
      'Wariant po lewej zmienia się automatycznie. Przeciągnij suwak, żeby zestawić go z jasnym punktem wyjścia.',
    heroPrevVariantAria: 'Poprzedni wariant wnętrza',
    heroNextVariantAria: 'Następny wariant wnętrza',
    scrollDownHint: 'Przewiń w dół',
    profileTitle: 'Twój profil wnętrza',
    assistant:
      'Pokaż mi swoją przestrzeń, a pomogę Ci odkryć styl, który pasuje do Ciebie - nie tylko do trendów.',
    meetAwaTitle: 'Poznaj IDA - przewodniczkę po Twoim stylu',
    meetAwaSubtitle:
      'Najpierw pokazujemy efekt. Potem IDA pomaga zrozumieć, dlaczego dana przestrzeń pasuje właśnie do Ciebie: analizuje pokój, inspiracje, osobowość i potrzeby.',
    meetAwaBadge: 'IDA pojawia się po scrollu',
    meetAwaCards: ['analiza pokoju', 'profil osobowości', 'inspiracje', 'generowanie wariantów'],
    stylesTitle: 'Jedno zdjęcie pokoju. Wiele kierunków dopasowania.',
    stylesSubtitle:
      'Nie musisz od razu wiedzieć, czego chcesz. IDA z jednego zdjęcia pokazuje wiele wersji tej samej przestrzeni — wybierasz tę, która naprawdę do Ciebie pasuje.',
    stepsTitle: 'Od zdjęcia pokoju do wnętrza, które pasuje do Ciebie',
    stepsSubtitle:
      'Twój pokój jest punktem wyjścia. Dalej IDA układa flow — krótko albo dokładnie, zależnie od Ciebie.',
    steps: [
      {
        title: 'Pokaż swoją przestrzeń',
        description: 'Prześlij zdjęcie swojego pomieszczenia albo zacznij od przykładowego wnętrza.',
      },
      {
        title: 'IDA poznaje Twój styl',
        description: 'Krótka ścieżka daje szybki efekt, a pełny profil pozwala wejść głębiej w osobowość i potrzeby.',
      },
      {
        title: 'Otrzymujesz nowe wnętrze',
        description:
          'AI generuje propozycje, które możesz dalej modyfikować, porównywać i dopasowywać do swoich potrzeb.',
      },
    ],
    pathsTitle: 'Wybierz stopień spersonalizowania',
    fast: {
      title: 'Szybki start',
      label: 'Szybki podgląd',
      duration: '3-5 min',
      description: 'Dla osób, które chcą szybko zobaczyć pierwszy kierunek zmiany.',
      cta: 'Chcę szybko zobaczyć efekt',
      points: ['zdjęcie pokoju', 'podstawowy styl', 'pierwsze generacje'],
    },
    full: {
      title: 'Pełne Doświadczenie',
      label: 'Najlepszy efekt',
      duration: '20-30 min',
      description: 'Dla osób, które chcą wnętrze naprawdę dopasowane do siebie.',
      cta: 'Stwórz mój profil wnętrza',
      points: ['profil osobowości', 'preferencje sensoryczne', 'styl życia i inspiracje'],
    },
    whyTitle: 'To nie tylko ładny obrazek. To projekt dopasowany do Ciebie.',
    why: [
      {
        title: 'Osobowość',
        description: 'IDA bierze pod uwagę to, jak chcesz się czuć w swojej przestrzeni.',
        rotatingWords: [
          'spokój',
          'ciepło',
          'porządek',
          'lekkość',
          'intymność',
          'energia',
          'harmonia',
          'balans',
          'estetyka',
          'uczucia',
          'otwartość',
          'bliskość',
        ],
      },
      {
        title: 'Styl życia',
        description: 'Inaczej projektuje miejsce do odpoczynku, pracy, spotkań czy kreatywności.',
        rotatingWords: [
          'odpoczynek',
          'praca',
          'spotkania',
          'kreatywność',
          'koncentracja',
          'goście',
          'rutyna',
          'regeneracja',
          'wieczór',
          'flow',
          'weekend',
          'poranek',
        ],
      },
      {
        title: 'Dopasowanie',
        description:
          'Każdą propozycję wnętrza możesz dopracować tak, żeby jeszcze lepiej pasowała do Ciebie.',
        rotatingWords: [
          'zmiana stylu',
          'nowe kolory',
          'inny układ',
          'więcej światła',
          'mniej dekoracji',
          'cieplejszy klimat',
          'więcej roślin',
          'nowe warianty',
          'dopracowanie',
          'poprawki',
          'detale',
          'personalizacja',
        ],
      },
    ],
    emotionTitle: 'Twoje wnętrze powinno mówić Twoim językiem',
    emotion:
      'Nie każdy potrzebuje tego samego stylu. Jedni szukają spokoju, inni energii, struktury, ciepła albo przestrzeni do tworzenia. IDA pomaga odkryć, czego naprawdę potrzebujesz od swojego wnętrza - i zamienia to w obraz.',
    finalTitle: 'Zobacz, jak mogłoby wyglądać Twoje wnętrze',
    finalSubtitle: 'Wypróbuj bezpłatnie i zobacz pierwsze propozycje wnętrza dopasowane do Ciebie.',
    research: {
      badge: 'Projekt doktorski',
      title: 'Projekt badawczy IDA',
      author: 'Autor: Jakub Palka',
      institution: 'Akademia Sztuki w Szczecinie',
      body:
        'IDA to projekt doktorski badający, jak preferencje estetyczne i sztuczna inteligencja wspierają personalizację koncepcji wnętrz. Platforma łączy psychologię środowiskową z generatywnym AI w ramach Research Through Design.',
      feedback:
        'Masz uwagi, pytania badawcze lub znalazłeś błąd? Każda informacja pomaga w rozwoju projektu.',
      learnMoreCta: 'O projekcie',
      contactCta: 'Skontaktuj się z autorem',
    },
    footer: {
      tagline:
        'IDA · projekt doktorski · Autor: Jakub Palka · Akademia Sztuki w Szczecinie.',
      about: 'O projekcie',
      contact: 'Kontakt',
      privacy: 'Prywatność',
      terms: 'Regulamin',
      pricing: 'Cennik',
      rights: 'Wszelkie prawa zastrzeżone.',
    },
  },
  en: {
    eyebrow: 'IDA Interior Design Assistant',
    headline: 'See your interior designed around your personality',
    subheadline:
      'Your space is the starting point. IDA shows many possible futures shaped around your lifestyle, mood, and how you want the space to feel.',
    primaryCta: 'Create my interior',
    tryForFreeCta: 'Try for free',
    secondaryCta: 'See how it works',
    earlyAccessLine: `Early access · Basic for $0 · 6000 credits · for the first ${FOUNDERS_LAUNCH_SLOTS} people`,
    loginModalTitle: 'Create an account or sign in',
    loginModalMessage:
      'After sign-up and email verification you can use the launch offer and start designing.',
    proof: [
      'First ideas in minutes',
      `Launch offer: Basic for $0 · 6000 credits · for the first ${FOUNDERS_LAUNCH_SLOTS} people`,
      'Matched to your profile with control over colors, lighting, and details',
    ],
    after: 'IDA version',
    visualTitle: 'Compare a blank room with IDA variants',
    visualSubtitle:
      'The left-hand variant cycles automatically. Drag the slider to compare it with the bright starting space.',
    heroPrevVariantAria: 'Previous interior variant',
    heroNextVariantAria: 'Next interior variant',
    scrollDownHint: 'Scroll down',
    profileTitle: 'Your interior profile',
    assistant:
      'Show me your space and I will help you discover a style that fits you - not just the trends.',
    meetAwaTitle: 'Meet IDA - your guide to personal style',
    meetAwaSubtitle:
      'First we show the result. Then IDA helps explain why a space fits you: it reads the room, inspirations, personality, and needs.',
    meetAwaBadge: 'IDA appears after scroll',
    meetAwaCards: ['room analysis', 'personality profile', 'inspirations', 'variant generation'],
    stylesTitle: 'One room photo. Many directions to match you.',
    stylesSubtitle:
      'You do not need to know exactly what you want. From one photo, IDA shows many versions of the same space so you can pick the one that truly fits.',
    stepsTitle: 'From room photo to an interior that fits you',
    stepsSubtitle:
      'Your room is the starting point. IDA lays out the flow — quick or thorough, you decide.',
    steps: [
      {
        title: 'Show your space',
        description: 'Upload a photo of your space or start from an example interior.',
      },
      {
        title: 'IDA learns your style',
        description: 'Fast mode gives you a quick result, while the full profile goes deeper into personality and needs.',
      },
      {
        title: 'Get a new interior',
        description:
          'AI generates proposals you can edit, compare, and tune to what you actually need.',
      },
    ],
    pathsTitle: 'Choose how deeply IDA should get to know you',
    fast: {
      title: 'Quick start',
      label: 'Quick preview',
      duration: '3-5 min',
      description: 'For people who want to see the first design direction quickly.',
      cta: 'I want a quick result',
      points: ['room photo', 'basic style', 'first generations'],
    },
    full: {
      title: 'Full Experience',
      label: 'Best result',
      duration: '20-30 min',
      description: 'For people who want an interior that is truly adapted to them.',
      cta: 'Create my interior profile',
      points: ['personality profile', 'sensory preferences', 'lifestyle and inspirations'],
    },
    whyTitle: 'This is not just a pretty image. It is a design tailored to you.',
    why: [
      {
        title: 'Personality',
        description: 'IDA considers how you want to feel in your space.',
        rotatingWords: [
          'calm',
          'warmth',
          'order',
          'ease',
          'intimacy',
          'energy',
          'harmony',
          'balance',
          'aesthetics',
          'feeling',
          'openness',
          'closeness',
        ],
      },
      {
        title: 'Lifestyle',
        description: 'It designs differently for rest, work, social life, or creativity.',
        rotatingWords: [
          'rest',
          'work',
          'hosting',
          'creativity',
          'focus',
          'routine',
          'recovery',
          'evenings',
          'flow',
          'weekends',
          'mornings',
          'rhythm',
        ],
      },
      {
        title: 'Personal fit',
        description:
          'You can refine every interior proposal so it fits you even better.',
        rotatingWords: [
          'style change',
          'new colors',
          'new layout',
          'more light',
          'fewer decor pieces',
          'warmer mood',
          'more plants',
          'new variants',
          'refinement',
          'adjustments',
          'details',
          'personalization',
        ],
      },
    ],
    emotionTitle: 'Your interior should speak your language',
    emotion:
      'Not everyone needs the same style. Some people need calm, others need energy, structure, warmth, or room to create. IDA helps reveal what you truly need from your interior - and turns it into an image.',
    finalTitle: 'See what your interior could become',
    finalSubtitle: 'Try for free and see your first tailored interior concepts.',
    research: {
      badge: 'Doctoral research project',
      title: 'IDA research project',
      author: 'Author: Jakub Palka',
      institution: 'Academy of Art in Szczecin',
      body:
        'IDA is a doctoral research project studying how aesthetic preferences and artificial intelligence support the personalization of interior concepts. The platform combines environmental psychology with generative AI through Research Through Design.',
      feedback:
        'Have feedback, a research question, or found a bug? Every note helps the project grow.',
      learnMoreCta: 'About the project',
      contactCta: 'Contact the author',
    },
    footer: {
      tagline:
        'IDA · doctoral research project · Author: Jakub Palka · Academy of Art in Szczecin.',
      about: 'About the project',
      contact: 'Contact',
      privacy: 'Privacy',
      terms: 'Terms',
      pricing: 'Pricing',
      rights: 'All rights reserved.',
    },
  },
};

type MarketingProfileTag = {
  id: string;
  label: string;
  value: number;
};

/** Four rows — interior feel + Big Five (OCEAN) labels mixed; stable ids for layout animation. */
const EMOTION_PROFILE_CYCLES_PL: MarketingProfileTag[][] = [
  [
    { id: 'calm', label: 'Spokój', value: 82 },
    { id: 'creative', label: 'Kreatywność', value: 74 },
    { id: 'warmth', label: 'Ciepło', value: 68 },
    { id: 'minimal', label: 'Minimalizm', value: 61 },
  ],
  [
    { id: 'O', label: 'Otwartość', value: 71 },
    { id: 'C', label: 'Sumienność', value: 66 },
    { id: 'E', label: 'Ekstrawersja', value: 74 },
    { id: 'N', label: 'Neurotyczność', value: 52 },
  ],
  [
    { id: 'warmth', label: 'Ciepło', value: 88 },
    { id: 'N', label: 'Neurotyczność', value: 55 },
    { id: 'creative', label: 'Kreatywność', value: 73 },
    { id: 'A', label: 'Ugodowość', value: 69 },
  ],
  [
    { id: 'calm', label: 'Spokój', value: 76 },
    { id: 'O', label: 'Otwartość', value: 68 },
    { id: 'minimal', label: 'Minimalizm', value: 72 },
    { id: 'C', label: 'Sumienność', value: 64 },
  ],
];

const EMOTION_PROFILE_CYCLES_EN: MarketingProfileTag[][] = [
  [
    { id: 'calm', label: 'Calm', value: 82 },
    { id: 'creative', label: 'Creativity', value: 74 },
    { id: 'warmth', label: 'Warmth', value: 68 },
    { id: 'minimal', label: 'Minimalism', value: 61 },
  ],
  [
    { id: 'O', label: 'Openness', value: 71 },
    { id: 'C', label: 'Conscientiousness', value: 66 },
    { id: 'E', label: 'Extraversion', value: 74 },
    { id: 'N', label: 'Neuroticism', value: 52 },
  ],
  [
    { id: 'warmth', label: 'Warmth', value: 88 },
    { id: 'N', label: 'Neuroticism', value: 55 },
    { id: 'creative', label: 'Creativity', value: 73 },
    { id: 'A', label: 'Agreeableness', value: 69 },
  ],
  [
    { id: 'calm', label: 'Calm', value: 76 },
    { id: 'O', label: 'Openness', value: 68 },
    { id: 'minimal', label: 'Minimalism', value: 72 },
    { id: 'C', label: 'Conscientiousness', value: 64 },
  ],
];

const EMOTION_PROFILE_CYCLE_MS = 8200;
const EMOTION_LAYOUT_DURATION_S = 1.45;
const EMOTION_NUMBER_DURATION_S = 1.85;
const EMOTION_LABEL_DURATION_S = 1.15;

function useMarketingShowcaseFrame(cycleCount: number): number {
  const preferReducedMotion = useReducedMotion();
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    if (preferReducedMotion || cycleCount <= 1) return;
    const id = window.setInterval(() => {
      setFrame((f) => (f + 1) % cycleCount);
    }, EMOTION_PROFILE_CYCLE_MS);
    return () => clearInterval(id);
  }, [cycleCount, preferReducedMotion]);

  return preferReducedMotion ? 0 : frame;
}

const MarketingProfileAnimatedPercent: React.FC<{ value: number }> = ({ value }) => {
  const [display, setDisplay] = useState(value);
  const fromRef = useRef(value);

  useEffect(() => {
    const from = fromRef.current;
    fromRef.current = value;
    const controls = animate(from, value, {
      duration: EMOTION_NUMBER_DURATION_S,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => setDisplay(Math.round(v)),
    });
    return () => controls.stop();
  }, [value]);

  return <span>{display}</span>;
};

const ProfileTagRows: React.FC<{
  items: MarketingProfileTag[];
  layoutGroupId: string;
  compact?: boolean;
}> = ({ items, layoutGroupId, compact }) => {
  const preferReducedMotion = useReducedMotion();
  const layoutEase = [0.22, 1, 0.36, 1] as const;

  return (
    <LayoutGroup id={layoutGroupId}>
      <motion.div
        className={cn('relative grid', compact ? 'gap-2' : 'gap-3')}
        initial={{ opacity: 1, y: 14 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.12 }}
        transition={{ duration: 0.65, ease: 'easeOut' }}
      >
        {items.map((item) => (
          <motion.div
            key={item.id}
            layout={!preferReducedMotion}
            transition={{
              layout: {
                duration: preferReducedMotion ? 0 : EMOTION_LAYOUT_DURATION_S,
                ease: layoutEase,
              },
            }}
            className={cn(
              'relative overflow-hidden rounded-2xl border border-white/30 bg-[rgba(14,12,10,0.16)] font-modern text-graphite shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] backdrop-blur-md',
              compact ? 'text-xs sm:text-sm' : 'text-sm'
            )}
          >
            <motion.div
              aria-hidden
              className="absolute inset-y-0 left-0 z-0 rounded-l-2xl bg-[linear-gradient(90deg,rgba(195,193,190,0.34)_0%,rgba(247,231,206,0.24)_32%,rgba(247,231,206,0.36)_58%,rgba(255,229,92,0.5)_100%)] shadow-[inset_-1px_0_6px_rgba(255,255,255,0.14)]"
              initial={false}
              animate={{ width: `${item.value}%` }}
              transition={
                preferReducedMotion
                  ? { duration: 0 }
                  : { duration: EMOTION_NUMBER_DURATION_S, ease: layoutEase }
              }
            />
            <div
              className={cn(
                'relative z-[1] flex min-h-[2.75rem] items-center justify-between sm:min-h-[2.85rem]',
                compact ? 'px-4 py-2.5 sm:py-3' : 'px-5 py-4'
              )}
            >
              <motion.span
                key={item.label}
                initial={preferReducedMotion ? false : { opacity: 0.35, filter: 'blur(6px)', y: 3 }}
                animate={{ opacity: 1, filter: 'blur(0px)', y: 0 }}
                transition={{
                  duration: preferReducedMotion ? 0 : EMOTION_LABEL_DURATION_S,
                  ease: layoutEase,
                }}
                className="min-w-0 flex-1 pr-2 leading-snug text-graphite"
              >
                {item.label}
              </motion.span>
              <span className="shrink-0 tabular-nums text-graphite">
                <MarketingProfileAnimatedPercent value={item.value} />%
              </span>
            </div>
          </motion.div>
        ))}
      </motion.div>
    </LayoutGroup>
  );
};

/** Longer dwell time per word; stagger `startStaggerMs` so the three cards rarely tick together. */
const WHY_WORD_CYCLE_MS = 5600;
const WHY_WORD_STAGGER_STEP_MS = Math.round(WHY_WORD_CYCLE_MS / 3);

type WhyMarketingItem = (typeof copy.pl.why)[number];

const WhyRotatingWordMorph: React.FC<{
  words: string[];
  activeIndex: number;
  className?: string;
}> = ({ words, activeIndex, className }) => {
  const preferReducedMotion = useReducedMotion();
  const n = words.length;
  const label = n > 0 ? words[activeIndex % n] : '';
  const easeOut = [0.22, 1, 0.36, 1] as const;
  const easeIn = [0.4, 0, 1, 1] as const;

  return (
    <div
      className={cn(
        'mt-auto flex min-h-[4.25rem] shrink-0 items-center justify-center rounded-2xl border border-white/25',
        'bg-gradient-to-br from-white/40 via-champagne/30 to-gold-500/15 px-3 py-2.5',
        'shadow-[inset_0_1px_0_rgba(255,255,255,0.32),0_8px_24px_-16px_rgba(45,38,28,0.22)] backdrop-blur-[3px]',
        className
      )}
      aria-hidden
    >
      <div className="relative flex min-h-[2.5rem] w-full items-center justify-center">
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={`${activeIndex}-${label}`}
            initial={
              preferReducedMotion
                ? false
                : {
                    opacity: 0,
                    y: 12,
                    filter: 'blur(8px)',
                    scale: 0.97,
                  }
            }
            animate={{
              opacity: 1,
              y: 0,
              filter: 'blur(0px)',
              scale: 1,
            }}
            exit={
              preferReducedMotion
                ? undefined
                : {
                    opacity: 0,
                    y: -10,
                    filter: 'blur(8px)',
                    scale: 0.96,
                  }
            }
            transition={
              preferReducedMotion
                ? { duration: 0 }
                : {
                    opacity: { duration: 0.48, ease: easeOut },
                    y: { type: 'spring', stiffness: 280, damping: 32, mass: 0.85 },
                    filter: { duration: 0.44, ease: easeIn },
                    scale: { type: 'spring', stiffness: 360, damping: 34 },
                  }
            }
            className={cn(
              'inline-block max-w-full text-center font-modern text-sm font-medium normal-case tracking-wide text-graphite/75',
              'sm:text-[0.95rem] sm:leading-snug sm:tracking-[0.06em]',
              'will-change-[transform,opacity,filter]'
            )}
          >
            {label}
          </motion.span>
        </AnimatePresence>
      </div>
    </div>
  );
};

const WhyMarketingGalleryCard: React.FC<{
  item: WhyMarketingItem;
  index: number;
  Icon: LucideIcon;
}> = ({ item, index, Icon }) => {
  const preferReducedMotion = useReducedMotion();
  const words = item.rotatingWords;
  const n = Math.max(1, words.length);
  const [i, setI] = useState(() => (index * 5) % n);
  const hoverBumpArmedRef = useRef(true);

  useEffect(() => {
    if (preferReducedMotion || n <= 1) return;
    let intervalId: number | undefined;
    const timeoutId = window.setTimeout(() => {
      setI((j) => (j + 1) % n);
      intervalId = window.setInterval(() => {
        setI((j) => (j + 1) % n);
      }, WHY_WORD_CYCLE_MS);
    }, index * WHY_WORD_STAGGER_STEP_MS);
    return () => {
      window.clearTimeout(timeoutId);
      if (intervalId !== undefined) window.clearInterval(intervalId);
    };
  }, [n, preferReducedMotion, index]);

  const bump = useCallback(() => {
    if (n <= 1) return;
    setI((j) => (j + 1) % n);
  }, [n]);

  return (
    <div
      className="h-full min-h-[300px]"
      onPointerEnter={() => {
        if (!hoverBumpArmedRef.current) return;
        hoverBumpArmedRef.current = false;
        bump();
      }}
      onPointerLeave={() => {
        hoverBumpArmedRef.current = true;
      }}
    >
      <GlassCard
        variant="flatOnMobile"
        className={cn(
          'group flex h-full min-h-0 flex-col overflow-hidden p-6 transition-[box-shadow,transform] duration-300 ease-out max-xl:hover:shadow-none xl:hover:shadow-[0_12px_40px_-16px_rgba(45,38,28,0.28)]',
          MOBILE_FLAT_CARD_FRAME
        )}
      >
        <div className="mb-5 flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-gold-500/40 bg-graphite/30 text-gold-500 shadow-[inset_0_1px_0_rgba(255,255,255,0.14),0_0_20px_-6px_rgba(255,215,0,0.35)] transition-transform group-hover:scale-110">
          <Icon size={28} aria-hidden="true" />
        </div>
        <h3 className="mb-3 shrink-0 text-xl text-graphite">{item.title}</h3>
        <p className="min-h-0 flex-1 text-pretty font-modern text-sm leading-6 text-silver-dark">{item.description}</p>
        <WhyRotatingWordMorph words={words} activeIndex={i} />
      </GlassCard>
    </div>
  );
};

/**
 * Hero shrink / radius / shadow finish by this fraction of section scroll (lower = snappier, higher = slower).
 */
const HERO_SETTLE_SCROLL_END = 0.52;

/**
 * Before this settle fraction, keep room layer at scaleY 1. Wide viewports map a tiny scroll advance to a large
 * width delta (column vs vw), which otherwise reads as a vertically “squashed” placeholder immediately.
 */
const HERO_VISUAL_SCALEY_DEAD_ZONE = 0.08;

/** Slack so the squashed room layer stays slightly taller than the measured glass copy stack (wide layouts). */
const HERO_VISUAL_SCALEY_PANEL_PAD = 0.012;

/** Fraction of hero settle (0–1) — keep low so the header appears as soon as the hero begins to shrink. */
const MARKETING_HEADER_SETTLE_REVEAL = 0.004;
/** Fallback: raw section progress so we reveal even if settle is edge-rounded */
const MARKETING_HEADER_SCROLL_PROGRESS_REVEAL = 0.003;
/** Mid-page load / refresh: if document is already scrolled, show header without waiting for hero motion. */
const MARKETING_HEADER_WINDOW_SCROLL_REVEAL = 12;
/** `heroSettle` must increase vs last frame — avoids revealing on scroll-up when the curve moves backward through the same thresholds. */
const MARKETING_HEADER_SETTLE_ADVANCE_EPS = 0.00006;

/** Auto-advance interval for hero interior slides (ms). */
const HERO_INTERIOR_AUTO_ADVANCE_MS = 11_000;

/** Before/after split on load — lower % = more empty “before” room visible (better behind hero copy on mobile). */
const HERO_COMPARISON_INITIAL_DESKTOP = 56;
const HERO_COMPARISON_INITIAL_MOBILE = 38;
/** Fixed hero photo corner radius on compact viewports (no scroll-linked settle animation). */
const HERO_MOBILE_BORDER_RADIUS_PX = 22;
/** Desktop hero copy `bottom` at scroll settle=0 (16px base + 64px raised inset). */
const HERO_COPY_BOTTOM_DESKTOP_UNSETTLED_PX = 80;

/** Touch gesture lock — vertical scroll vs horizontal slider drag (mobile hero). */
const COMPARISON_GESTURE_SLOP_PX = 6;
/** Vertical movement must clearly dominate before yielding to page scroll. */
const COMPARISON_GESTURE_SCROLL_BIAS = 1.35;
/** Short tap on the photo repositions the split (pointerup, little movement). */
const COMPARISON_TAP_MAX_MOVEMENT_PX = 16;

type ComparisonGestureMode = 'undecided' | 'scroll' | 'drag';

/** Crossfade duration when swapping hero slides (seconds; exit + enter overlap in `sync` mode). */
const HERO_INTERIOR_CROSSFADE_SEC = 2.55;

/** Smooth ease-in-out for hero crossfade (symmetric cubic bezier). */
const HERO_INTERIOR_CROSSFADE_EASE: [number, number, number, number] = [0.45, 0, 0.55, 1];

/** Keep opacity at 1 — whileInView + scroll-linked hero often leaves sections invisible. */
const fadeUp = {
  initial: { opacity: 1, y: 28 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.12 },
  transition: { duration: 0.75, ease: 'easeOut' },
};

type HeroPhotoLayerProps = {
  src: string;
  label?: string;
  /** Uniform inverse scale for labels while the hero room layer scales down (desktop). */
  labelScale?: MotionValue<number>;
  /** Rounded corners on the photo stack only (animated with hero settle). */
  photoCornerRadius?: MotionValue<string>;
  priority?: boolean;
  /** When false, original `/public/hero` bytes (desktop fidelity). Mobile uses Next resize. */
  optimizeDelivery?: boolean;
  fetchPriority?: 'high' | 'low' | 'auto';
  loading?: 'lazy' | 'eager' | undefined;
  onLoadingComplete?: () => void;
  afterGlow?: boolean;
};

const HeroPhotoLayer = ({
  src,
  label,
  labelScale,
  photoCornerRadius,
  priority,
  optimizeDelivery = false,
  fetchPriority,
  loading,
  onLoadingComplete,
  afterGlow,
}: HeroPhotoLayerProps) => (
  <motion.div
    className="absolute inset-0 overflow-hidden"
    aria-hidden="true"
    style={
      photoCornerRadius
        ? ({ borderRadius: photoCornerRadius } as unknown as React.CSSProperties)
        : undefined
    }
  >
    <motion.div className="absolute inset-0 bg-transparent">
      <Image
        src={src}
        alt=""
        fill
        priority={priority}
        fetchPriority={fetchPriority}
        loading={loading}
        quality={optimizeDelivery ? 72 : undefined}
        sizes="(max-width: 1280px) 100vw, 1280px"
        unoptimized={!optimizeDelivery}
        className="object-cover"
        onLoadingComplete={onLoadingComplete}
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/18 via-transparent to-transparent xl:from-black/30 xl:via-black/5 xl:to-black/15" />
      {afterGlow ? (
        <motion.div
          animate={{ opacity: [0.35, 0.62, 0.35] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          className="pointer-events-none absolute inset-0 hidden bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.28),transparent_38%)] xl:block"
        />
      ) : null}
    </motion.div>
    {label &&
      (labelScale ? (
        <motion.div
          className="absolute bottom-5 left-5 max-w-[min(90%,20rem)] rounded-full border border-white/35 bg-black/40 px-4 py-2 text-pretty font-modern text-xs text-white backdrop-blur"
          style={{
            scale: labelScale,
            transformOrigin: '50% 100%',
          }}
        >
          {label}
        </motion.div>
      ) : (
        <div className="absolute bottom-5 left-5 max-w-[min(90%,20rem)] rounded-full border border-white/35 bg-black/40 px-4 py-2 text-pretty font-modern text-xs text-white backdrop-blur">
          {label}
        </div>
      ))}
  </motion.div>
);

function localizedHeroSlide(slide: HeroInteriorSlide, lang: 'pl' | 'en') {
  return lang === 'pl' ? slide.pl : slide.en;
}

const HeroScrollDownHint = ({
  label,
  opacity,
  preferReducedMotion,
}: {
  label: string;
  opacity: MotionValue<number>;
  preferReducedMotion: boolean | null;
}) => (
  <motion.div
    className="pointer-events-none absolute inset-x-0 bottom-0 z-[3] flex flex-col items-center gap-0.5 pb-[max(0.65rem,env(safe-area-inset-bottom,0px))] sm:gap-1 sm:pb-3"
    style={{ opacity }}
    aria-hidden="true"
  >
    <span className="font-modern text-[10px] font-medium uppercase tracking-[0.14em] text-white/55 sm:text-[11px] sm:tracking-[0.16em]">
      {label}
    </span>
    <motion.div
      animate={preferReducedMotion ? undefined : { y: [0, 3, 0] }}
      transition={
        preferReducedMotion
          ? undefined
          : { duration: 2.4, repeat: Infinity, ease: 'easeInOut' }
      }
    >
      <ChevronDown
        size={18}
        strokeWidth={2.25}
        className="text-gold-400/80 drop-shadow-[0_1px_2px_rgba(0,0,0,0.45)]"
        aria-hidden="true"
      />
    </motion.div>
  </motion.div>
);

const HERO_COMPARISON_CHEVRON_CLASS =
  'shrink-0 text-gold-500 drop-shadow-[0_1px_0_rgba(255,255,255,0.55),0_0_8px_rgba(0,0,0,0.35)] sm:h-5 sm:w-5';

/** Idle chevrons scale up from the final 18px / sm:20px footprint (~28px / ~31px). */
const HERO_COMPARISON_CHEVRON_IDLE_SCALE = 28 / 18;
const HERO_COMPARISON_CHEVRON_SHRINK_DURATION_S = 0.65;

const HeroComparisonHandle = ({
  showIdleHint,
  preferReducedMotion,
}: {
  showIdleHint: boolean;
  preferReducedMotion: boolean | null;
}) => {
  const shouldAnimate = showIdleHint && !preferReducedMotion;
  const chevronScale = showIdleHint ? HERO_COMPARISON_CHEVRON_IDLE_SCALE : 1;
  const chevronScaleTransition = preferReducedMotion
    ? { duration: 0 }
    : { duration: HERO_COMPARISON_CHEVRON_SHRINK_DURATION_S, ease: 'easeOut' as const };

  return (
    <div
      className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center gap-2 touch-none sm:gap-2.5"
      aria-hidden="true"
    >
      <motion.div
        initial={{ scale: HERO_COMPARISON_CHEVRON_IDLE_SCALE }}
        animate={{ scale: chevronScale }}
        transition={{ scale: chevronScaleTransition }}
        className="origin-center"
      >
        <motion.div
          animate={shouldAnimate ? { x: [0, -5, 0] } : { x: 0 }}
          transition={
            shouldAnimate
              ? { duration: 2.4, repeat: Infinity, ease: 'easeInOut' }
              : { duration: 0.2, ease: 'easeOut' }
          }
        >
          <ChevronLeft size={18} strokeWidth={2.5} className={HERO_COMPARISON_CHEVRON_CLASS} aria-hidden="true" />
        </motion.div>
      </motion.div>
      <motion.div
        initial={{ scale: HERO_COMPARISON_CHEVRON_IDLE_SCALE }}
        animate={{ scale: chevronScale }}
        transition={{ scale: chevronScaleTransition }}
        className="origin-center"
      >
        <motion.div
          animate={shouldAnimate ? { x: [0, 5, 0] } : { x: 0 }}
          transition={
            shouldAnimate
              ? { duration: 2.4, repeat: Infinity, ease: 'easeInOut', delay: 0.12 }
              : { duration: 0.2, ease: 'easeOut' }
          }
        >
          <ChevronRight size={18} strokeWidth={2.5} className={HERO_COMPARISON_CHEVRON_CLASS} aria-hidden="true" />
        </motion.div>
      </motion.div>
    </div>
  );
};

const HERO_VARIANT_RAIL_MAX_WIDTH_PX = 340;

/** Delicate gold outline on flat cards below xl (aligned with highlighted path card). */
const MOBILE_FLAT_CARD_FRAME = 'max-xl:border max-xl:border-gold-400/50';

function HeroVariantStyleRail({
  slideCopy,
  activeIndex,
  slideCount,
  onPrev,
  onNext,
  prevAria,
  nextAria,
  className,
}: {
  slideCopy: { title: string; tagline: string; description: string };
  activeIndex: number;
  slideCount: number;
  onPrev: () => void;
  onNext: () => void;
  prevAria: string;
  nextAria: string;
  className?: string;
}) {
  return (
    <GlassCard
      variant="flatOnMobile"
      className={cn(
        'pointer-events-none w-full max-w-[min(340px,calc(100%-2rem))] shrink-0 p-3.5 sm:max-w-[min(340px,calc(100%-2.5rem))] sm:p-4 lg:max-w-[min(340px,calc(100%-2.5rem))]',
        className
      )}
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-graphite">{slideCopy.title}</p>
          <p className="font-modern text-xs text-gold-500">{slideCopy.tagline}</p>
        </div>
        <Sparkles size={20} className="shrink-0 text-gold-500" aria-hidden="true" />
      </div>
      <p className="font-modern text-xs font-medium leading-5 text-graphite drop-shadow-[0_1px_0_rgba(255,255,255,0.45)]">
        {slideCopy.description}
      </p>
      <div className="mt-3 flex items-center gap-2">
        <button
          type="button"
          onClick={onPrev}
          className="pointer-events-auto flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/45 bg-white/70 text-graphite shadow-sm transition hover:bg-white"
          aria-label={prevAria}
        >
          <ChevronLeft size={18} aria-hidden="true" />
        </button>
        <div className="min-w-0 flex-1">
          <div className="mb-1 text-center font-modern text-[10px] font-semibold uppercase tracking-[0.14em] text-graphite/65">
            {activeIndex + 1} / {slideCount}
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-white/35">
            <div
              className="h-full rounded-full bg-gold-500 transition-[width] duration-300 ease-out"
              style={{
                width: `${((activeIndex + 1) / Math.max(1, slideCount)) * 100}%`,
              }}
            />
          </div>
        </div>
        <button
          type="button"
          onClick={onNext}
          className="pointer-events-auto flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/45 bg-white/70 text-graphite shadow-sm transition hover:bg-white"
          aria-label={nextAria}
        >
          <ChevronRight size={18} aria-hidden="true" />
        </button>
      </div>
    </GlassCard>
  );
}

const MarketingEntryScreen: React.FC<{ compactHeroHint?: boolean }> = ({
  compactHeroHint = false,
}) => {
  const router = useRouter();
  const { user } = useAuth();
  const { updateSessionData } = useSessionData();
  const pathname = usePathname();
  /** Align with GlassCard `flatOnMobile` / AppContentFrame compact layout (1280px). */
  const isMobile = useIsMobile(1280);
  const preferHardNavigation = usePreferHardNavigation();
  const compactHero = isMobile || compactHeroHint;
  const useMarqueePortal = pathname === '/' && !isMobile;
  const { language } = useLanguage();
  const { setHeaderVisible } = useLayout();
  const { fontScale, textSpacing } = useWcagSettings();
  /** At large WCAG text sizes the fixed max-height forces an inner scrollbar — let the panel grow instead. */
  const heroCopyRelaxedOverflow =
    fontScale === 'lg' || fontScale === 'xl' || textSpacing;
  const reduceHeroCarousel = useReducedMotion();
  const sliderPositionMv = useMotionValue(HERO_COMPARISON_INITIAL_DESKTOP);
  const sliderClipPath = useTransform(
    sliderPositionMv,
    (p) => `inset(0 ${100 - p}% 0 0)`
  );
  const sliderHandleLeft = useTransform(sliderPositionMv, (p) => `${p}%`);
  const [hasUsedComparisonSlider, setHasUsedComparisonSlider] = useState(false);
  const [activeVariant, setActiveVariant] = useState(0);
  const comparisonRef = useRef<HTMLDivElement | null>(null);
  const comparisonDraggingRef = useRef(false);
  const comparisonGestureModeRef = useRef<ComparisonGestureMode>('undecided');
  const comparisonPointerOriginRef = useRef<{ x: number; y: number } | null>(null);
  const comparisonActivePointerIdRef = useRef<number | null>(null);
  const comparisonInitialPositionRef = useRef(HERO_COMPARISON_INITIAL_DESKTOP);
  const heroStickyFrameRef = useRef<HTMLDivElement | null>(null);
  const heroCopyGlassPanelRef = useRef<HTMLDivElement | null>(null);
  const heroCopyPanelRef = useRef<HTMLDivElement | null>(null);
  const heroStyleRailAnchorRef = useRef<HTMLDivElement | null>(null);
  const heroStyleRailPortalLayerRef = useRef<HTMLDivElement | null>(null);
  const [heroStyleRailPortalHost, setHeroStyleRailPortalHost] = useState<HTMLElement | null>(null);
  const heroFrameHeightMv = useMotionValue(0);
  /** Minimum scaleY so room layer height ≥ glass headline panel height (desktop marketing hero). */
  const minHeroVisualScaleYMv = useMotionValue(0.72);
  const heroRef = useRef<HTMLElement | null>(null);
  /** After the first scroll that shrinks the hero, keep the glass header visible (including scroll back to top). */
  const marketingHeaderRevealedRef = useRef(false);
  const prevHeroSettleForHeaderRef = useRef(0);
  const marketingRootRef = useRef<HTMLDivElement | null>(null);
  const heroBleedMeasureRef = useRef<HTMLDivElement | null>(null);
  const marqueeAnchorRef = useRef<HTMLDivElement | null>(null);
  const marqueePortalLayerRef = useRef<HTMLDivElement | null>(null);
  const [marqueePortalHost, setMarqueePortalHost] = useState<HTMLElement | null>(null);
  const [loginOpen, setLoginOpen] = useState(false);
  /** Column box inside AppContentFrame — used for viewport breakout without relying on symmetric “max bleed”. */
  const [columnBox, setColumnBox] = useState({ left: 0, width: 0 });
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  });
  const [viewportWidth, setViewportWidth] = useState(0);
  /** Avoid mobile-first motion defaults (bottom 14px) before column measure on desktop. */
  const heroCopyUseDesktopFallback = !compactHero && !isMobile && columnBox.width === 0;
  /** One shared 0→1 curve for the hero “settle” window — header timing still reads this raw value. */
  const heroSettle = useTransform(scrollYProgress, (p) =>
    Math.min(1, Math.max(0, p / HERO_SETTLE_SCROLL_END))
  );
  const heroScrollHintOpacity = useTransform(heroSettle, (s) => Math.max(0, 1 - s / 0.16));
  const { introPortal, scrollToHowItWorksWithIntro } = useMarketingIdaIntro({
    heroSettle,
    settleAdvanceEps: MARKETING_HEADER_SETTLE_ADVANCE_EPS,
  });
  /**
   * Width, radius, and room squash use this delayed curve so the first stretch of scroll keeps full-bleed layout.
   * Raw `heroSettle` still drives header reveal thresholds.
   */
  const effectiveHeroSettle = useTransform(heroSettle, (s) => {
    const span = 1 - HERO_VISUAL_SCALEY_DEAD_ZONE;
    if (span <= 0) return s;
    return Math.min(1, Math.max(0, (s - HERO_VISUAL_SCALEY_DEAD_ZONE) / span));
  });
  const heroWidthMotion = useTransform(effectiveHeroSettle, (s) => {
    const breakout = 1 - s;
    const vw = viewportWidth || getLayoutViewportWidth();
    if (!columnBox.width || !vw) return vw ? `${vw}px` : '100%';
    const measured = columnBox.width + (vw - columnBox.width) * breakout;
    if (measured <= 0) return `${vw}px`;
    return `${Math.round(measured)}px`;
  });
  const heroMarginLeftMotion = useTransform(effectiveHeroSettle, (s) => {
    const breakout = 1 - s;
    if (!columnBox.width) return '0px';
    return `${(-columnBox.left * breakout).toFixed(2)}px`;
  });
  /** Same ratio as old `calc(100dvh * measured/vw)` but via transform — no per-frame layout height changes. */
  const heroVisualScaleY = useTransform(
    [effectiveHeroSettle, minHeroVisualScaleYMv],
    ([s, minSy]) => {
      if (isMobile || !columnBox.width || !viewportWidth) return 1;
      const breakout = 1 - (typeof s === 'number' ? s : 0);
      const measured = columnBox.width + (viewportWidth - columnBox.width) * breakout;
      if (measured <= 0) return 1;
      const ratio = measured / viewportWidth;
      const floor =
        typeof minSy === 'number' && minSy > 0.02 ? Math.min(1, minSy) : 0.72;
      return Math.max(ratio, floor);
    }
  );
  /** Photo band height (bottom-anchored); same ratio as heroVisualScaleY without transform scale. */
  const heroPhotoBandHeight = useTransform(heroVisualScaleY, (s) => {
    const scale = typeof s === 'number' ? s : 1;
    if (scale >= 0.9999) return '100%';
    return `${(scale * 100).toFixed(2)}%`;
  });
  /**
   * Keep hero copy’s right edge aligned to the content column while the sticky frame bleeds to full viewport width.
   * Analytic `translateX` (same breakout as width/margin-left) — avoids getBoundingClientRect per scroll frame jitter.
   */
  const columnLeftMv = useMotionValue(0);
  const columnWidthMv = useMotionValue(0);
  const viewportWidthMv = useMotionValue(0);
  const heroPanelDesktopMv = useMotionValue(0);

  useLayoutEffect(() => {
    columnLeftMv.set(columnBox.left);
    columnWidthMv.set(columnBox.width);
    viewportWidthMv.set(viewportWidth);
    heroPanelDesktopMv.set(isMobile ? 0 : 1);
  }, [
    columnBox.left,
    columnBox.width,
    viewportWidth,
    isMobile,
    columnLeftMv,
    columnWidthMv,
    viewportWidthMv,
    heroPanelDesktopMv,
  ]);

  /** Photo-only corner radius (20px → 36px when settled). Frozen on mobile. */
  const heroBorderRadius = useTransform(
    [effectiveHeroSettle, heroPanelDesktopMv],
    ([s, desktop]) => {
      if (typeof desktop === 'number' && desktop < 0.5) {
        return `${HERO_MOBILE_BORDER_RADIUS_PX}px`;
      }
      const t = Math.min(1, Math.max(0, typeof s === 'number' ? s : 0));
      return `${Math.round(20 + 16 * t)}px`;
    }
  );

  const heroPanelAnchorX = useTransform(
    [effectiveHeroSettle, columnLeftMv, columnWidthMv, viewportWidthMv, heroPanelDesktopMv],
    ([s, left, cw, vw, desktop]) => {
      if (typeof desktop === 'number' && desktop < 0.5) return 0;
      const settle = typeof s === 'number' ? s : 0;
      const L = typeof left === 'number' ? left : 0;
      const W = typeof cw === 'number' ? cw : 0;
      const V = typeof vw === 'number' ? vw : 0;
      if (W <= 0 || V <= 0) return 0;
      const breakout = 1 - settle;
      return breakout * (L + W - V);
    }
  );

  /** Raised bottom only while hero is unsettled (s→0); frozen on mobile. */
  const heroCopyBottomMotion = useTransform(
    [effectiveHeroSettle, heroPanelDesktopMv],
    ([s, desktop]) => {
      const isDesktop = typeof desktop === 'number' && desktop > 0.5;
      if (!isDesktop) return '14px';
      const t = Math.min(1, Math.max(0, typeof s === 'number' ? s : 0));
      const basePx = 16;
      const extraPx = (1 - t) * 64;
      return `${(basePx + extraPx).toFixed(1)}px`;
    }
  );

  /** Match hero copy stack bottom inset (z-20 outer pad + same `bottom` as headline motion) so the style rail GlassCard lines up with the main glass panel. */
  const heroStyleRailBottomPad = useTransform(
    [effectiveHeroSettle, heroPanelDesktopMv],
    ([s, desktop]) => {
      const t = Math.min(1, Math.max(0, typeof s === 'number' ? s : 0));
      const isWideHeroPanel = typeof desktop === 'number' && desktop > 0.5;
      const basePx = isWideHeroPanel ? 16 : 14;
      const copyBottomPx = basePx + (1 - t) * (isWideHeroPanel ? 64 : 28);
      const z20OuterBottomPx = isWideHeroPanel ? 24 : 20;
      return `calc(${z20OuterBottomPx + copyBottomPx}px + env(safe-area-inset-bottom, 0px))`;
    }
  );

  const assignHeroCopyGlassPanelRef = useCallback(
    (node: HTMLDivElement | null) => {
      heroCopyGlassPanelRef.current = node;
      if (!node || isMobile) return;
      const frame = heroStickyFrameRef.current;
      if (!frame) return;
      const fh = frame.getBoundingClientRect().height;
      const ph = node.getBoundingClientRect().height;
      if (fh > 1 && ph > 1) {
        minHeroVisualScaleYMv.set(Math.min(1, ph / fh + HERO_VISUAL_SCALEY_PANEL_PAD));
      }
    },
    [isMobile, minHeroVisualScaleYMv]
  );

  useLayoutEffect(() => {
    const el = heroStickyFrameRef.current;
    if (!el) return;

    if (isMobile) {
      minHeroVisualScaleYMv.set(0);
      const syncMobile = () => {
        const next = Math.round(el.getBoundingClientRect().height);
        if (next > 0) heroFrameHeightMv.set(next);
      };
      syncMobile();
      const ro =
        typeof ResizeObserver !== 'undefined' ? new ResizeObserver(syncMobile) : null;
      ro?.observe(el);
      window.addEventListener('resize', syncMobile);
      return () => {
        ro?.disconnect();
        window.removeEventListener('resize', syncMobile);
      };
    }

    const sync = () => {
      const frame = heroStickyFrameRef.current;
      const panelEl = heroCopyGlassPanelRef.current;
      if (!frame) return;
      const fh = frame.getBoundingClientRect().height;
      if (fh > 0) heroFrameHeightMv.set(Math.round(fh));
      const ph = panelEl?.getBoundingClientRect().height ?? 0;
      if (fh > 1 && ph > 1) {
        minHeroVisualScaleYMv.set(Math.min(1, ph / fh + HERO_VISUAL_SCALEY_PANEL_PAD));
      }
    };

    sync();
    requestAnimationFrame(() => {
      sync();
    });
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(sync) : null;
    ro?.observe(el);
    window.addEventListener('resize', sync);

    return () => {
      ro?.disconnect();
      window.removeEventListener('resize', sync);
    };
  }, [isMobile, language, minHeroVisualScaleYMv, fontScale, textSpacing]);

  /** Panel height can change without the sticky frame resizing (copy wrap, fonts). */
  useLayoutEffect(() => {
    if (isMobile) return;
    const panelEl = heroCopyGlassPanelRef.current;
    if (!panelEl) return;

    const syncPanel = () => {
      const frame = heroStickyFrameRef.current;
      if (!frame) return;
      const fh = frame.getBoundingClientRect().height;
      const ph = panelEl.getBoundingClientRect().height;
      if (fh > 1 && ph > 1) {
        minHeroVisualScaleYMv.set(Math.min(1, ph / fh + HERO_VISUAL_SCALEY_PANEL_PAD));
      }
    };

    syncPanel();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(syncPanel) : null;
    ro?.observe(panelEl);
    return () => ro?.disconnect();
  }, [isMobile, language, minHeroVisualScaleYMv, fontScale, textSpacing]);

  useLayoutEffect(() => {
    if (!heroCopyRelaxedOverflow || isMobile) {
      setHeroStyleRailPortalHost(null);
      return;
    }
    return resolvePortalHost('hero-style-rail-layer', setHeroStyleRailPortalHost);
  }, [heroCopyRelaxedOverflow, isMobile]);

  const applyHeroStyleRailPortalGeometry = useCallback(
    (force = false) => {
      const anchor = heroStyleRailAnchorRef.current;
      const layer = heroStyleRailPortalLayerRef.current;
      if (!anchor || !layer) return;

      const ar = anchor.getBoundingClientRect();
      const vh = window.innerHeight;
      if (!force && (ar.top > vh + 120 || ar.bottom < -80)) {
        layer.style.visibility = 'hidden';
        return;
      }
      layer.style.visibility = 'visible';

      const colLeft = columnBox.left;
      const colWidth = columnBox.width;
      const vw = viewportWidth || getLayoutViewportWidth();
      const copyFillsWidth = colWidth > 0 && vw > 0 && colWidth >= vw - 64;
      const cardW = Math.min(
        HERO_VARIANT_RAIL_MAX_WIDTH_PX,
        Math.max(260, copyFillsWidth ? vw - 32 : colLeft - 28)
      );

      if (copyFillsWidth) {
        const frameTop = heroStickyFrameRef.current?.getBoundingClientRect().top ?? 0;
        layer.style.top = `${Math.round(frameTop + 72)}px`;
        layer.style.bottom = 'auto';
        layer.style.left = '12px';
      } else {
        const leftPx = Math.max(12, colLeft - cardW - 20);
        layer.style.top = 'auto';
        layer.style.bottom = `${Math.max(12, Math.round(vh - ar.bottom))}px`;
        layer.style.left = `${leftPx}px`;
      }

      layer.style.right = 'auto';
      layer.style.width = `${Math.round(cardW)}px`;
    },
    [columnBox.left, columnBox.width, viewportWidth]
  );

  useLayoutEffect(() => {
    if (!heroCopyRelaxedOverflow || !heroStyleRailPortalHost) return;

    let rafId = 0;
    const scheduleSync = () => {
      if (rafId !== 0) return;
      rafId = window.requestAnimationFrame(() => {
        rafId = 0;
        applyHeroStyleRailPortalGeometry(false);
      });
    };

    const handleResize = () => {
      applyHeroStyleRailPortalGeometry(true);
    };

    applyHeroStyleRailPortalGeometry(true);
    window.addEventListener('scroll', scheduleSync, { passive: true });
    window.addEventListener('resize', handleResize);

    const ro =
      typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(() => applyHeroStyleRailPortalGeometry(true))
        : null;
    const anchor = heroStyleRailAnchorRef.current;
    const copyPanel = heroCopyGlassPanelRef.current;
    if (anchor) ro?.observe(anchor);
    if (copyPanel) ro?.observe(copyPanel);

    return () => {
      if (rafId !== 0) window.cancelAnimationFrame(rafId);
      window.removeEventListener('scroll', scheduleSync);
      window.removeEventListener('resize', handleResize);
      ro?.disconnect();
    };
  }, [
    heroCopyRelaxedOverflow,
    heroStyleRailPortalHost,
    applyHeroStyleRailPortalGeometry,
    activeVariant,
    language,
    fontScale,
    textSpacing,
  ]);

  const t = copy[language];
  const marketingLang = language === 'pl' ? 'pl' : 'en';
  const text = (s: string) => joinContentOrphans(s, marketingLang);
  const heroSlideCount = HERO_INTERIOR_SLIDES.length;
  const activeHeroSlide =
    HERO_INTERIOR_SLIDES[heroSlideCount > 0 ? Math.min(activeVariant, heroSlideCount - 1) : 0] ??
    HERO_INTERIOR_SLIDES[0];
  const activeHeroSlideCopy = localizedHeroSlide(activeHeroSlide, language === 'pl' ? 'pl' : 'en');
  const emptyRoomImageSrc = heroInteriorImageSrc(HERO_EMPTY_ROOM_FILE);
  const activeAfterImageSrc = heroInteriorImageSrc(activeHeroSlide.file);

  useEffect(() => {
    const urls = [emptyRoomImageSrc, heroInteriorImageSrc(HERO_INTERIOR_SLIDES[0]?.file ?? '')];
    for (const src of urls) {
      if (!src) continue;
      const img = new window.Image();
      img.fetchPriority = 'high';
      img.src = src;
    }
  }, [emptyRoomImageSrc]);

  const emotionProfileCycles = useMemo(
    () => (language === 'pl' ? EMOTION_PROFILE_CYCLES_PL : EMOTION_PROFILE_CYCLES_EN),
    [language]
  );
  const marketingShowcaseFrame = useMarketingShowcaseFrame(emotionProfileCycles.length);

  /** Compact viewports: header visible on load (no scroll-to-reveal). Desktop keeps cinematic reveal on hero shrink. */
  const isCompactMarketingViewport = useCallback(
    () => getLayoutViewportWidth() < 1280,
    []
  );

  /** Must read the same MotionValues as the hero shrink (`heroSettle`); manual DOM progress can stay at 0 while Framer still animates (sticky layout). */
  const syncMarketingHeaderVisibility = useCallback(() => {
    if (isCompactMarketingViewport()) {
      marketingHeaderRevealedRef.current = true;
      setHeaderVisible(true);
      return;
    }

    if (marketingHeaderRevealedRef.current) {
      setHeaderVisible(true);
      return;
    }

    const settle = heroSettle.get();
    const p = scrollYProgress.get();
    const prevSettle = prevHeroSettleForHeaderRef.current;
    const heroShrinkAdvancing = settle > prevSettle + MARKETING_HEADER_SETTLE_ADVANCE_EPS;
    prevHeroSettleForHeaderRef.current = settle;

    const pastRevealThreshold =
      settle > MARKETING_HEADER_SETTLE_REVEAL || p > MARKETING_HEADER_SCROLL_PROGRESS_REVEAL;

    const reveal = pastRevealThreshold && heroShrinkAdvancing;

    if (reveal) {
      marketingHeaderRevealedRef.current = true;
      setHeaderVisible(true);
    } else {
      setHeaderVisible(false);
    }
  }, [heroSettle, scrollYProgress, setHeaderVisible, isCompactMarketingViewport]);

  /** Align with `useIsMobile(1280)` — set split once before paint (SSR default is desktop). */
  useLayoutEffect(() => {
    const mobile = getLayoutViewportWidth() < 1280;
    const initial = mobile ? HERO_COMPARISON_INITIAL_MOBILE : HERO_COMPARISON_INITIAL_DESKTOP;
    comparisonInitialPositionRef.current = initial;
    sliderPositionMv.set(initial);
    if (mobile) {
      marketingHeaderRevealedRef.current = true;
      setHeaderVisible(true);
    }
  }, [setHeaderVisible, sliderPositionMv]);

  useMotionValueEvent(sliderPositionMv, 'change', (value) => {
    if (hasUsedComparisonSlider) return;
    if (Math.abs(value - comparisonInitialPositionRef.current) > 0.5) {
      setHasUsedComparisonSlider(true);
    }
  });

  useLayoutEffect(() => {
    if (isCompactMarketingViewport()) {
      marketingHeaderRevealedRef.current = true;
      setHeaderVisible(true);
      return;
    }
    if (typeof window !== 'undefined' && window.scrollY >= MARKETING_HEADER_WINDOW_SCROLL_REVEAL) {
      marketingHeaderRevealedRef.current = true;
    }
    syncMarketingHeaderVisibility();
  }, [syncMarketingHeaderVisibility, isCompactMarketingViewport, setHeaderVisible]);

  useMotionValueEvent(scrollYProgress, 'change', () => {
    syncMarketingHeaderVisibility();
  });

  useMotionValueEvent(heroSettle, 'change', () => {
    syncMarketingHeaderVisibility();
  });

  useEffect(() => {
    const onScroll = () => syncMarketingHeaderVisibility();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [syncMarketingHeaderVisibility]);

  useEffect(() => {
    const onResize = () => syncMarketingHeaderVisibility();
    window.addEventListener('resize', onResize, { passive: true });
    return () => window.removeEventListener('resize', onResize);
  }, [syncMarketingHeaderVisibility]);

  useEffect(() => {
    return () => setHeaderVisible(false);
  }, [setHeaderVisible]);

  /** Preload next hero slide after the active pair starts loading. */
  useEffect(() => {
    const nextIndex = (activeVariant + 1) % Math.max(heroSlideCount, 1);
    const nextSlide = HERO_INTERIOR_SLIDES[nextIndex];
    if (!nextSlide) return;
    const preload = new window.Image();
    preload.src = heroInteriorImageSrc(nextSlide.file);
  }, [activeVariant, heroSlideCount]);

  /** Reduce horizontal scrollbar flicker while the marketing hero animates width toward full layout viewport (desktop home only). */
  useEffect(() => {
    if (!useMarqueePortal) return;
    const root = document.documentElement;
    const prevOx = root.style.overflowX;
    const prevSg = root.style.scrollbarGutter;
    root.style.overflowX = 'clip';
    root.style.scrollbarGutter = 'stable';
    return () => {
      root.style.overflowX = prevOx;
      root.style.scrollbarGutter = prevSg;
    };
  }, [useMarqueePortal]);

  useLayoutEffect(() => {
    const measureBleed = () => {
      const node = heroBleedMeasureRef.current;
      if (!node) return;

      const rect = node.getBoundingClientRect();
      const left = Math.round(rect.left);
      const width = Math.round(rect.width);
      const vw = getLayoutViewportWidth();
      const mobile = vw < 1280;
      heroPanelDesktopMv.set(mobile ? 0 : 1);
      columnLeftMv.set(left);
      columnWidthMv.set(width);
      viewportWidthMv.set(vw);
      setColumnBox((prev) => {
        if (Math.abs(prev.left - left) < 1 && Math.abs(prev.width - width) < 1) return prev;
        return { left, width };
      });
      setViewportWidth((prev) => (prev === vw ? prev : vw));
      document.documentElement.style.setProperty('--awa-layout-vw', `${vw}px`);

      /** Patch bleed before React re-render — avoids one frame of narrow column / wrong margin. */
      const frame = heroStickyFrameRef.current;
      if (frame && width > 0 && vw > 0) {
        if (vw >= 1280) {
          frame.style.marginLeft = `${-left}px`;
          frame.style.width = `${vw}px`;
          frame.setAttribute('data-hero-bleed-measured', '');
          const copyPanel = heroCopyPanelRef.current;
          if (copyPanel) {
            const anchorX = left + width - vw;
            copyPanel.style.bottom = `${HERO_COPY_BOTTOM_DESKTOP_UNSETTLED_PX}px`;
            copyPanel.style.transform = `translateX(${anchorX}px) translateZ(0)`;
            copyPanel.setAttribute('data-hero-copy-positioned', '');
          }
        } else {
          frame.removeAttribute('data-hero-bleed-measured');
          frame.style.marginLeft = '';
          frame.style.width = '';
        }
      }
    };

    measureBleed();
    const raf = requestAnimationFrame(measureBleed);
    window.addEventListener('resize', measureBleed);

    /** No ResizeObserver: probe size can flutter sub-pixel while hero animates, re-firing measure in a loop. */

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', measureBleed);
    };
  }, [columnLeftMv, columnWidthMv, viewportWidthMv, heroPanelDesktopMv]);

  useLayoutEffect(() => {
    if (!useMarqueePortal) {
      setMarqueePortalHost(null);
      return;
    }
    return resolvePortalHost('living-room-marquee-layer', setMarqueePortalHost);
  }, [useMarqueePortal]);

  const applyMarqueePortalGeometry = useCallback((force = false) => {
    const anchor = marqueeAnchorRef.current;
    const layer = marqueePortalLayerRef.current;
    if (!anchor || !layer) return;
    const r = anchor.getBoundingClientRect();
    const vh = window.innerHeight;
    /** Skip while the strip is far off-screen — avoids fixed-layer layout writes during hero-only scroll (common jitter source). */
    if (!force && (r.top > vh + 280 || r.bottom < -160)) return;
    const vw = viewportWidth || getLayoutViewportWidth();
    const useColumnBreakout = columnBox.left > 0 && vw > 0;
    const top = Math.round(r.top);
    const left = useColumnBreakout ? 0 : Math.round(r.left);
    const w = useColumnBreakout ? Math.round(vw) : Math.round(r.width);
    const h = Math.max(1, Math.round(r.height));
    const key = `${top}|${left}|${w}|${h}`;
    const prev = layer.dataset.marqueeGeomKey;
    if (prev === key) return;
    layer.dataset.marqueeGeomKey = key;
    layer.style.setProperty('top', `${top}px`);
    layer.style.setProperty('left', `${left}px`);
    layer.style.setProperty('width', `${w}px`);
    layer.style.setProperty('height', `${h}px`);
  }, [columnBox.left, viewportWidth]);

  useLayoutEffect(() => {
    if (!useMarqueePortal || !marqueePortalHost) return;

    applyMarqueePortalGeometry(true);

    let rafId = 0;
    const scheduleSync = () => {
      if (rafId !== 0) return;
      rafId = window.requestAnimationFrame(() => {
        rafId = 0;
        applyMarqueePortalGeometry(false);
      });
    };

    const handleResize = () => {
      applyMarqueePortalGeometry(true);
    };

    applyMarqueePortalGeometry(true);
    window.addEventListener('scroll', scheduleSync, { passive: true });
    window.addEventListener('resize', handleResize);

    const ro =
      typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(() => applyMarqueePortalGeometry(true))
        : null;
    const anchor = marqueeAnchorRef.current;
    if (anchor) ro?.observe(anchor);

    return () => {
      if (rafId !== 0) window.cancelAnimationFrame(rafId);
      window.removeEventListener('scroll', scheduleSync);
      window.removeEventListener('resize', handleResize);
      ro?.disconnect();
    };
  }, [useMarqueePortal, marqueePortalHost, columnBox.left, viewportWidth, applyMarqueePortalGeometry]);

  useEffect(() => {
    if (reduceHeroCarousel || heroSlideCount === 0) return;
    const interval = window.setInterval(() => {
      setActiveVariant((current) => (current + 1) % heroSlideCount);
    }, HERO_INTERIOR_AUTO_ADVANCE_MS);

    return () => window.clearInterval(interval);
  }, [heroSlideCount, reduceHeroCarousel]);

  const marketingCarouselCards = useMemo(
    () => buildLivingRoomMarketingCards(language === 'pl' ? 'pl' : 'en'),
    [language]
  );
  const carouselLoop = useMemo(
    () => [...marketingCarouselCards, ...marketingCarouselCards],
    [marketingCarouselCards]
  );
  /** Marquee — slow drift; one full loop takes longer on more cards. */
  const carouselDurationSec = Math.max(120, marketingCarouselCards.length * 4.2);

  const goToFastPath = useCallback(() => {
    stopAllDialogueAudio();
    navigateToFlowPath(router, 'fast', updateSessionData);
  }, [router, updateSessionData]);

  const goToFullPath = useCallback(() => {
    stopAllDialogueAudio();
    navigateToFlowPath(router, 'full', updateSessionData);
  }, [router, updateSessionData]);

  const goToPathSelection = useCallback(() => {
    stopAllDialogueAudio();
    navigateWithChunkFallback(router, '/flow/path-selection');
  }, [router]);

  const openLoginForFreeTry = useCallback(() => {
    setLoginOpen(true);
  }, []);

  const handleTryBasicFree = useCallback(() => {
    stopAllDialogueAudio();
    if (user?.id || resolveClientAuthUserId(undefined)) {
      navigateWithChunkFallback(router, PATH_AFTER_FREE_TRY);
      return;
    }
    openLoginForFreeTry();
  }, [user?.id, router, openLoginForFreeTry]);

  const handleLoginSuccess = useCallback(() => {
    setLoginOpen(false);
    navigateWithChunkFallback(router, PATH_AFTER_FREE_TRY);
  }, [router]);

  const livingRoomMarqueeInner = (
    <div className="relative pb-3 sm:pb-4">
      {/*
        Mask only on this wrapper — do not combine filter (e.g. drop-shadow) on the same node as
        mask-image: browsers may composite the whole strip too dark. Card box-shadow is clipped in
        faded edge bands only; center cards keep normal glass shadow.
      */}
      <div
        className="relative pb-10 pt-0 sm:pb-12"
        style={
          {
            WebkitMaskImage:
              'linear-gradient(90deg, transparent 0%, #000 54%, #000 93%, transparent 100%)',
            maskImage: 'linear-gradient(90deg, transparent 0%, #000 54%, #000 93%, transparent 100%)',
            WebkitMaskSize: '100% 100%',
            maskSize: '100% 100%',
            WebkitMaskRepeat: 'no-repeat',
            maskRepeat: 'no-repeat',
          } as React.CSSProperties
        }
      >
        <motion.div
          className="relative flex w-max items-stretch gap-3 px-2 pb-1 pt-3 sm:gap-3.5 sm:px-4 sm:pb-2 sm:pt-4 md:px-6 md:pb-2 md:pt-5"
          animate={{ x: ['0%', '-50%'] }}
          transition={{ duration: carouselDurationSec, repeat: Infinity, ease: 'linear' }}
        >
          {carouselLoop.map((item, index) => (
            <VisualVariantCard key={`${item.filename}-${index}`} item={item} />
          ))}
        </motion.div>
      </div>
    </div>
  );

  const layoutVw = viewportWidth || getLayoutViewportWidth();
  const marqueeBreakoutReady = columnBox.left > 0 && layoutVw > 0;
  const marqueeBreakoutStyle = marqueeBreakoutReady
    ? ({
        marginLeft: `${-columnBox.left}px`,
        width: `${layoutVw}px`,
      } as const)
    : layoutVw > 0
      ? ({ width: `${layoutVw}px` } as const)
      : undefined;

  const updateSliderFromClientX = useCallback((clientX: number) => {
    const rect = comparisonRef.current?.getBoundingClientRect();
    if (!rect) return;

    const next = ((clientX - rect.left) / rect.width) * 100;
    sliderPositionMv.set(Math.max(8, Math.min(92, next)));
  }, [sliderPositionMv]);

  const syncComparisonTouchAction = useCallback((dragging: boolean) => {
    const el = comparisonRef.current;
    if (!el) return;
    el.style.touchAction = dragging ? 'none' : '';
  }, []);

  const resetComparisonGesture = useCallback(() => {
    comparisonDraggingRef.current = false;
    comparisonGestureModeRef.current = 'undecided';
    comparisonPointerOriginRef.current = null;
    comparisonActivePointerIdRef.current = null;
    syncComparisonTouchAction(false);
  }, [syncComparisonTouchAction]);

  const beginComparisonDrag = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (comparisonDraggingRef.current) {
      if (event.pointerType === 'touch') event.preventDefault();
      updateSliderFromClientX(event.clientX);
      return;
    }

    setHasUsedComparisonSlider(true);
    comparisonDraggingRef.current = true;
    comparisonGestureModeRef.current = 'drag';
    syncComparisonTouchAction(true);
    event.currentTarget.setPointerCapture(event.pointerId);
    if (event.pointerType === 'touch') event.preventDefault();
    updateSliderFromClientX(event.clientX);
  }, [syncComparisonTouchAction, updateSliderFromClientX]);

  const resolveComparisonGestureOnMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const origin = comparisonPointerOriginRef.current;
      if (!origin) return;

      const dx = event.clientX - origin.x;
      const dy = event.clientY - origin.y;
      const absDx = Math.abs(dx);
      const absDy = Math.abs(dy);

      if (
        absDy >= COMPARISON_GESTURE_SLOP_PX &&
        absDy > absDx * COMPARISON_GESTURE_SCROLL_BIAS
      ) {
        comparisonGestureModeRef.current = 'scroll';
        comparisonActivePointerIdRef.current = null;
        comparisonPointerOriginRef.current = null;
        return;
      }

      if (absDx >= absDy) {
        updateSliderFromClientX(event.clientX);
        setHasUsedComparisonSlider(true);
      }

      if (absDx >= COMPARISON_GESTURE_SLOP_PX && absDx >= absDy) {
        beginComparisonDrag(event);
      }
    },
    [beginComparisonDrag, updateSliderFromClientX]
  );

  /** iOS: non-passive touchmove keeps horizontal drag smooth once locked. */
  useEffect(() => {
    if (!isMobile) return;
    const el = comparisonRef.current;
    if (!el) return;

    const onTouchMove = (event: TouchEvent) => {
      if (comparisonGestureModeRef.current !== 'drag') return;
      const touch = event.touches[0];
      if (!touch) return;
      if (event.cancelable) event.preventDefault();
      const rect = el.getBoundingClientRect();
      const next = ((touch.clientX - rect.left) / rect.width) * 100;
      sliderPositionMv.set(Math.max(8, Math.min(92, next)));
    };

    el.addEventListener('touchmove', onTouchMove, { passive: false });
    return () => el.removeEventListener('touchmove', onTouchMove);
  }, [isMobile, sliderPositionMv]);

  const releaseComparisonPointerCapture = (
    target: HTMLDivElement,
    pointerId: number
  ) => {
    if (target.hasPointerCapture(pointerId)) {
      target.releasePointerCapture(pointerId);
    }
  };

  return (
    <>
    <div ref={marketingRootRef} className={cn('relative w-full pb-0', useMarqueePortal && 'pointer-events-none')}>
      {/* Width probe — must not use overflow-hidden or sticky will not behave reliably */}
      <div ref={heroBleedMeasureRef} data-hero-bleed-probe className="pointer-events-none h-0 w-full" aria-hidden="true" />
      <div className={cn(useMarqueePortal && 'pointer-events-auto')}>
      <section
        ref={heroRef}
        className="relative w-full min-h-[calc(100dvh-env(safe-area-inset-top,0px))] bg-transparent max-xl:-mt-[env(safe-area-inset-top,0px)] xl:min-h-[128dvh]"
      >
        <motion.div
          ref={heroStickyFrameRef}
          data-hero-sticky-frame
          style={
            isMobile
              ? undefined
              : {
                  marginLeft: heroMarginLeftMotion,
                  width: heroWidthMotion,
                }
          }
          className={cn(
            'sticky top-0 z-[5] h-[calc(100dvh-env(safe-area-inset-top,0px))] overflow-hidden max-xl:pt-[env(safe-area-inset-top,0px)]',
            'max-xl:!w-full max-xl:!max-w-none max-xl:!ml-0',
            !isMobile && 'will-change-[width,margin-left]'
          )}
        >
          {/*
            Photo band fills sticky width (no inner 100vw) so border-radius is not clipped square.
            Overlays stay siblings with z-[2].
          */}
          <motion.div
            ref={comparisonRef}
            tabIndex={0}
            className="absolute inset-0 z-[1] cursor-ew-resize max-xl:touch-pan-y xl:touch-none select-none overflow-hidden bg-transparent outline-none focus-visible:ring-2 focus-visible:ring-gold-500/80 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
            onPointerDown={(event) => {
              if (event.pointerType === 'touch') {
                comparisonGestureModeRef.current = 'undecided';
                comparisonPointerOriginRef.current = {
                  x: event.clientX,
                  y: event.clientY,
                };
                comparisonActivePointerIdRef.current = event.pointerId;
                updateSliderFromClientX(event.clientX);
                setHasUsedComparisonSlider(true);
                return;
              }

              beginComparisonDrag(event);
            }}
            onPointerMove={(event) => {
              if (event.pointerType === 'touch') {
                if (comparisonActivePointerIdRef.current !== event.pointerId) return;
                if (comparisonGestureModeRef.current === 'scroll') return;

                if (comparisonGestureModeRef.current === 'undecided') {
                  resolveComparisonGestureOnMove(event);
                  return;
                }

                event.preventDefault();
                updateSliderFromClientX(event.clientX);
                return;
              }

              if (!comparisonDraggingRef.current) return;
              if (event.buttons !== 1) return;
              updateSliderFromClientX(event.clientX);
            }}
            onPointerUp={(event) => {
              if (event.pointerType === 'touch') {
                const origin = comparisonPointerOriginRef.current;
                if (
                  origin &&
                  comparisonGestureModeRef.current === 'undecided'
                ) {
                  const dx = event.clientX - origin.x;
                  const dy = event.clientY - origin.y;
                  if (Math.hypot(dx, dy) <= COMPARISON_TAP_MAX_MOVEMENT_PX) {
                    updateSliderFromClientX(event.clientX);
                    setHasUsedComparisonSlider(true);
                  }
                }
              }

              releaseComparisonPointerCapture(event.currentTarget, event.pointerId);
              resetComparisonGesture();
            }}
            onPointerCancel={(event) => {
              releaseComparisonPointerCapture(event.currentTarget, event.pointerId);
              resetComparisonGesture();
            }}
            onLostPointerCapture={() => {
              resetComparisonGesture();
            }}
            onKeyDown={(event) => {
              const step = 5;
              if (
                event.key === 'ArrowLeft' ||
                event.key === 'ArrowDown' ||
                event.key === 'ArrowRight' ||
                event.key === 'ArrowUp' ||
                event.key === 'Home' ||
                event.key === 'End'
              ) {
                setHasUsedComparisonSlider(true);
              }
              if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') {
                event.preventDefault();
                sliderPositionMv.set(Math.max(8, sliderPositionMv.get() - step));
              } else if (event.key === 'ArrowRight' || event.key === 'ArrowUp') {
                event.preventDefault();
                sliderPositionMv.set(Math.min(92, sliderPositionMv.get() + step));
              } else if (event.key === 'Home') {
                event.preventDefault();
                sliderPositionMv.set(8);
              } else if (event.key === 'End') {
                event.preventDefault();
                sliderPositionMv.set(92);
              }
            }}
            role="group"
            aria-label={`${t.visualTitle}. ${t.visualSubtitle} ${activeHeroSlideCopy.title}.`}
          >
            <motion.div
              className={cn(
                'absolute overflow-hidden rounded-[22px] max-xl:[transform:none] xl:[transform:translateZ(0)]',
                isMobile ? 'inset-0' : 'inset-x-0 bottom-0 will-change-[height,border-radius]'
              )}
              style={
                isMobile
                  ? ({
                      borderRadius: heroBorderRadius,
                    } as unknown as React.CSSProperties)
                  : ({
                      height: heroPhotoBandHeight,
                      borderRadius: heroBorderRadius,
                    } as unknown as React.CSSProperties)
              }
            >
                <HeroPhotoLayer
                  src={emptyRoomImageSrc}
                  photoCornerRadius={heroBorderRadius}
                  priority={compactHero}
                  fetchPriority="high"
                />
                <motion.div
                  className="absolute inset-0 overflow-hidden"
                  style={{ clipPath: sliderClipPath }}
                >
                  <AnimatePresence initial={false} mode="sync">
                    <motion.div
                      key={activeVariant}
                      className="absolute inset-0"
                      initial={
                        reduceHeroCarousel || compactHero ? { opacity: 1 } : { opacity: 0 }
                      }
                      animate={{ opacity: 1 }}
                      exit={reduceHeroCarousel || compactHero ? { opacity: 1 } : { opacity: 0 }}
                      transition={{
                        duration: reduceHeroCarousel
                          ? 0
                          : compactHero
                            ? 0.35
                            : HERO_INTERIOR_CROSSFADE_SEC,
                        ease: HERO_INTERIOR_CROSSFADE_EASE,
                      }}
                    >
                      <HeroPhotoLayer
                        src={activeAfterImageSrc}
                        photoCornerRadius={heroBorderRadius}
                        afterGlow
                        priority={compactHero && activeVariant === 0}
                        fetchPriority={compactHero ? 'high' : undefined}
                      />
                    </motion.div>
                  </AnimatePresence>
                </motion.div>

                <motion.div
                  className="absolute inset-y-0 z-[2] w-px bg-white/45"
                  style={{ left: sliderHandleLeft }}
                  aria-hidden="true"
                >
                  <HeroComparisonHandle
                    showIdleHint={!hasUsedComparisonSlider}
                    preferReducedMotion={reduceHeroCarousel}
                  />
                </motion.div>
            </motion.div>

            <motion.div className="pointer-events-none absolute inset-0 z-[2] hidden bg-gradient-to-r from-graphite/24 via-graphite/6 to-transparent lg:from-graphite/46 lg:via-graphite/12 xl:block xl:from-graphite/38 xl:via-graphite/8" />
            <motion.div className="pointer-events-none absolute inset-x-0 bottom-0 z-[2] h-[28%] bg-gradient-to-t from-black/28 via-black/8 to-transparent max-xl:h-[32%] max-xl:from-black/32 xl:h-[40%] xl:from-black/44 xl:via-black/14" />
            <HeroScrollDownHint
              label={t.scrollDownHint}
              opacity={heroScrollHintOpacity}
              preferReducedMotion={reduceHeroCarousel}
            />
          </motion.div>

          <motion.div
            className="pointer-events-none absolute inset-0 z-20 flex flex-col justify-between pt-0 pb-[max(2rem,calc(1.25rem+env(safe-area-inset-bottom,0px)))] max-xl:pb-[max(2.5rem,calc(1.75rem+env(safe-area-inset-bottom,0px)))] sm:pb-4 lg:pb-6"
          >
            {/*
              Anchor copy to the sticky frame’s right edge (absolute right-*), not ml-auto — otherwise when width
              grows during hero settle, margin-left:auto absorbs the delta and the glass panel drifts left.
            */}
            <div className="pointer-events-none relative min-h-0 flex-1 max-xl:px-0 pb-0 xl:px-10 xl:pb-4">
              <motion.div
                ref={heroCopyPanelRef}
                data-hero-copy-panel
                initial={false}
                style={
                  heroCopyUseDesktopFallback
                    ? { x: 0, bottom: `${HERO_COPY_BOTTOM_DESKTOP_UNSETTLED_PX}px` }
                    : { x: heroPanelAnchorX, bottom: heroCopyBottomMotion }
                }
                className={cn(
                  'pointer-events-none absolute w-auto',
                  'max-xl:inset-x-4 max-xl:bottom-3.5 max-xl:max-w-none',
                  'xl:inset-x-auto xl:left-auto xl:right-10',
                  'xl:max-w-[min(100%,34rem)]',
                  'xl:w-[min(40rem,min(42vw,100%))]',
                  '2xl:w-[min(42rem,min(44vw,100%))]'
                )}
              >
                <div
                  ref={assignHeroCopyGlassPanelRef}
                  lang={language === 'pl' ? 'pl' : 'en'}
                  className={cn(
                    'pointer-events-none rounded-[1.65rem] px-5 py-6 max-xl:px-5 max-xl:py-4 sm:rounded-[1.85rem] sm:px-7 sm:py-7 lg:px-8 lg:py-7 xl:py-6',
                    'max-xl:border-none max-xl:bg-transparent max-xl:shadow-none max-xl:backdrop-blur-none',
                    'xl:glass-panel xl:border xl:border-white/25 xl:bg-gradient-to-br xl:from-pearl-100/82 xl:via-pearl-50/55 xl:to-champagne/35 xl:shadow-[0_24px_70px_-20px_rgba(45,38,28,0.28)] xl:backdrop-blur-xl',
                    heroCopyRelaxedOverflow
                      ? 'max-h-none overflow-visible'
                      : 'max-xl:max-h-[calc(100dvh-env(safe-area-inset-top,0px)-env(safe-area-inset-bottom,0px)-6rem)] max-xl:overflow-y-auto max-xl:overscroll-contain max-xl:scroll-pb-3 max-xl:scrollbar-hide max-xl:pointer-events-none xl:max-h-[min(72dvh,680px)] xl:overflow-y-auto xl:overscroll-contain xl:scrollbar-hide xl:pointer-events-none'
                  )}
                >
                  <div className="mb-3 max-xl:mb-2">
                    <span className="inline-flex items-center gap-2 rounded-full border border-gold-500/40 bg-gold-500/12 px-3 py-1.5 text-[10px] font-modern uppercase tracking-[0.2em] text-graphite sm:text-xs">
                      <Sparkles size={13} className="text-gold-500" aria-hidden="true" />
                      {t.eyebrow}
                    </span>
                  </div>
                  <h1 className="mb-3 max-xl:mb-2.5 text-balance break-words text-[1.5rem] font-semibold leading-[1.18] tracking-tight text-graphite hyphens-auto sm:mb-4 sm:text-[1.75rem] sm:leading-[1.2] md:text-3xl lg:text-[2rem] lg:leading-snug xl:text-[2.25rem]">
                    {t.headline}
                  </h1>
                  <ul className="mb-3 flex flex-col gap-1.5 max-xl:mb-2.5 max-xl:gap-1.5 sm:mb-4">
                    {t.proof.map((line) => (
                      <li
                        key={line}
                        className="flex items-start gap-2 font-modern text-[13px] leading-snug text-graphite/90 max-xl:gap-2 sm:gap-2.5 sm:text-sm"
                      >
                        <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-gold-500" aria-hidden="true" />
                        {line}
                      </li>
                    ))}
                  </ul>
                  <p className="mb-3 max-xl:mb-2 max-xl:text-[13px] max-xl:leading-snug font-modern text-sm font-medium leading-relaxed text-graphite drop-shadow-[0_1px_0_rgba(255,255,255,0.45)] sm:mb-4 sm:text-base sm:leading-7">
                    {t.subheadline}
                  </p>
                  <div className="pointer-events-auto flex w-full flex-col gap-2 max-xl:gap-2 max-xl:pb-1 pb-2 sm:gap-2.5 sm:pb-0">
                    <Link
                      href="/flow/path-selection"
                      prefetch={!preferHardNavigation}
                      onClick={() => stopAllDialogueAudio()}
                      className="glass-button glass-button-emphasis group flex h-14 min-h-14 max-h-14 w-full min-w-0 items-center justify-start gap-2 rounded-[32px] px-5 text-left text-base font-medium leading-tight text-graphite max-xl:h-14 max-xl:min-h-14 max-xl:max-h-14 max-xl:px-5 max-xl:py-0 max-xl:text-base max-xl:leading-tight lg:px-8 lg:py-4 lg:text-lg lg:min-h-[56px]"
                    >
                      <ArrowRight size={20} className="shrink-0 text-gold-500 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                      <span className="text-left">{t.primaryCta}</span>
                    </Link>
                    <Link
                      href="#how-it-works"
                      onClick={() => {
                        if (!preferHardNavigation) scrollToHowItWorksWithIntro();
                      }}
                      className="flex h-12 min-h-12 max-h-12 w-full min-w-0 items-center justify-start gap-2 rounded-[32px] border border-white/20 bg-silver-400/20 px-5 text-left text-base leading-tight text-gray-700 backdrop-blur-xl transition-all duration-300 ease-out hover:scale-[1.02] hover:bg-silver-300/35 hover:border-white/35 max-xl:h-12 max-xl:min-h-12 max-xl:max-h-12 max-xl:px-5 max-xl:py-0 max-xl:text-base max-xl:leading-tight lg:px-8 lg:py-4 lg:text-lg lg:min-h-[56px]"
                    >
                      <PlayCircle size={20} className="shrink-0 text-gold-500" aria-hidden="true" />
                      <span className="text-left">{t.secondaryCta}</span>
                    </Link>
                  </div>
                </div>
              </motion.div>
            </div>

          </motion.div>

          <motion.div
            className={cn(
              'pointer-events-none absolute inset-0 z-30 flex flex-col justify-end items-start max-xl:hidden',
              'px-4 pt-0 sm:px-5 lg:px-6'
            )}
            style={{ paddingBottom: heroStyleRailBottomPad }}
          >
            {heroCopyRelaxedOverflow ? (
              <div
                ref={heroStyleRailAnchorRef}
                className="h-px w-[min(340px,calc(100%-2rem))] shrink-0 opacity-0 sm:w-[min(340px,calc(100%-2.5rem))]"
                aria-hidden
              />
            ) : (
              <HeroVariantStyleRail
                slideCopy={activeHeroSlideCopy}
                activeIndex={activeVariant}
                slideCount={heroSlideCount}
                onPrev={() => setActiveVariant((i) => (i - 1 + heroSlideCount) % heroSlideCount)}
                onNext={() => setActiveVariant((i) => (i + 1) % heroSlideCount)}
                prevAria={t.heroPrevVariantAria}
                nextAria={t.heroNextVariantAria}
              />
            )}
          </motion.div>
        </motion.div>
        {heroCopyRelaxedOverflow && !isMobile && heroStyleRailPortalHost
          ? createPortal(
              <div
                ref={heroStyleRailPortalLayerRef}
                className="pointer-events-none fixed z-[6]"
                style={{ visibility: 'hidden' }}
              >
                <HeroVariantStyleRail
                  slideCopy={activeHeroSlideCopy}
                  activeIndex={activeVariant}
                  slideCount={heroSlideCount}
                  onPrev={() => setActiveVariant((i) => (i - 1 + heroSlideCount) % heroSlideCount)}
                  onNext={() => setActiveVariant((i) => (i + 1) % heroSlideCount)}
                  prevAria={t.heroPrevVariantAria}
                  nextAria={t.heroNextVariantAria}
                  className="max-w-none"
                />
              </div>,
              heroStyleRailPortalHost
            )
          : null}
        {/*
          In-flow space after the sticky frame (desktop) so the next section starts lower in the document: copy can
          stay under the hero (z-4) without riding so far under the frame at the end of this scroll track.
        */}
        <div
          className="pointer-events-none max-lg:hidden w-full shrink-0"
          style={{ height: 'min(12dvh, 6.25rem)' }}
          aria-hidden
        />
      </section>

      {/*
        Below sticky hero (z-[5]): copy stays under the glass panel and becomes visible only once it clears the frame.
        No Framer whileInView on this block: scroll-linked hero layout + in-view observers here caused visible jitter.
      */}
      <div className="relative z-[4] isolate">
      <section
        id="how-it-works"
        lang={language === 'pl' ? 'pl' : 'en'}
        className="scroll-mt-20 pt-10 pb-10 sm:scroll-mt-24 sm:pt-12 sm:pb-16 lg:pt-14"
      >
        <header className="mb-8 max-w-3xl sm:mb-10">
          <h2 className="text-balance break-words text-3xl leading-[1.12] tracking-tight text-graphite sm:text-4xl sm:leading-tight lg:text-5xl">
            {t.stepsTitle}
          </h2>
          <p className={`mt-3 max-w-3xl sm:mt-4 ${BODY_TEXT_CLASS} text-sm text-silver-dark sm:text-base sm:leading-7`}>
            {text(t.stepsSubtitle)}
          </p>
        </header>
        <div className="grid gap-5 sm:gap-6 md:grid-cols-3 md:gap-x-6 md:gap-y-7 md:[grid-template-rows:minmax(min-content,auto)_minmax(min-content,auto)_minmax(min-content,auto)]">
          {t.steps.map((step, index) => {
            const icons = [Upload, Brain, Wand2];
            const Icon = icons[index];
            const colStart =
              index === 0 ? 'md:col-start-1' : index === 1 ? 'md:col-start-2' : 'md:col-start-3';
            const stepNo = String(index + 1).padStart(2, '0');
            return (
              <div key={step.title} className="md:contents">
                <GlassCard
                  variant="flatOnMobile"
                  className={cn(
                    // No overflow-hidden on card: it clipped titles at large text / zoom (WCAG 1.4.4). Illustration keeps its own clip + radius.
                    'group flex h-full flex-col gap-3 p-6 sm:p-7 md:p-8',
                    MOBILE_FLAT_CARD_FRAME,
                    'md:row-span-3 md:grid md:grid-cols-1 md:gap-0 md:[grid-template-rows:subgrid]',
                    'md:min-h-min',
                    colStart,
                    'md:row-start-1'
                  )}
                >
                  <div className="flex min-h-min gap-4 sm:gap-5">
                    <div className="flex shrink-0 flex-col items-center gap-2">
                      <span className="font-modern text-xs font-semibold uppercase tracking-[0.2em] text-gold-500 drop-shadow-[0_1px_1px_rgba(45,38,28,0.35)]">
                        {stepNo}
                      </span>
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-gold-500/40 bg-graphite/30 text-gold-500 shadow-[inset_0_1px_0_rgba(255,255,255,0.14),0_0_20px_-6px_rgba(255,215,0,0.35)] transition-transform duration-300 ease-out group-hover:scale-[1.04] group-hover:border-gold-500/55">
                        <Icon size={26} aria-hidden="true" />
                      </div>
                    </div>
                    <div className="min-w-0 flex-1 self-start border-l border-white/25 pl-4 sm:pl-5">
                      <h3 className="text-balance break-words hyphens-auto text-lg font-semibold leading-snug text-graphite sm:text-xl sm:leading-snug">
                        {step.title}
                      </h3>
                    </div>
                  </div>
                  <p className="min-h-min break-words font-modern text-sm leading-6 text-silver-dark">{step.description}</p>
                  <div className="relative h-[8.5rem] shrink-0 overflow-hidden rounded-[1.25rem] border border-white/30 sm:h-36 md:mt-0">
                    <MarketingHowItWorksIllustration stepIndex={index} />
                  </div>
                </GlassCard>
              </div>
            );
          })}
        </div>
      </section>

      <motion.section
        id="marketing-path-selection"
        className="py-8 sm:py-14 scroll-mt-24"
        {...fadeUp}
      >
        <h2 className="mb-6 max-w-4xl text-3xl leading-tight text-graphite sm:text-5xl">{t.pathsTitle}</h2>
        <div className="grid gap-4 lg:grid-cols-2 lg:gap-x-4 lg:gap-y-6 lg:[grid-template-rows:auto_auto_auto_auto]">
          <PathCard
            icon={Clock}
            title={t.fast.title}
            badge={t.fast.label}
            meta={t.fast.duration}
            description={t.fast.description}
            points={t.fast.points}
            cta={t.fast.cta}
            onClick={goToFastPath}
          />
          <PathCard
            highlighted
            icon={Heart}
            title={t.full.title}
            badge={t.full.label}
            meta={t.full.duration}
            description={t.full.description}
            points={t.full.points}
            cta={t.full.cta}
            onClick={goToFullPath}
          />
        </div>
      </motion.section>

      <motion.section id="marketing-why" className="py-8 sm:py-14 scroll-mt-24" {...fadeUp}>
        <h2 className="mb-6 max-w-4xl text-3xl leading-tight text-graphite sm:text-5xl">{t.whyTitle}</h2>
        <div className="grid gap-4 md:grid-cols-3 md:items-stretch">
          {t.why.map((item, index) => {
            const icons = [Brain, Layers, Home] as const;
            const Icon = icons[index];
            return <WhyMarketingGalleryCard key={item.title} item={item} index={index} Icon={Icon} />;
          })}
        </div>
      </motion.section>

      <motion.section
        className={cn(
          'relative z-[4] pt-6 pb-6 sm:pt-9 sm:pb-7',
          useMarqueePortal && 'pointer-events-none'
        )}
        {...fadeUp}
        aria-label={t.stylesTitle}
      >
        <div
          className={cn(
            'mb-5 flex flex-col gap-3 sm:mb-8 sm:flex-row sm:items-end sm:justify-between',
            useMarqueePortal && 'pointer-events-auto'
          )}
        >
          <div>
            <h2 className="text-balance max-w-3xl text-2xl leading-tight text-graphite sm:text-4xl lg:text-5xl">{t.stylesTitle}</h2>
            <p className={`mt-2 max-w-3xl text-sm text-silver-dark sm:text-base sm:leading-7 ${BODY_TEXT_CLASS}`}>
              {text(t.stylesSubtitle)}
            </p>
          </div>
          <GlassButton
            size="md"
            onClick={handleTryBasicFree}
            className="glass-button-emphasis shrink-0 self-start sm:self-auto"
          >
            {t.tryForFreeCta}
          </GlassButton>
        </div>

        {useMarqueePortal ? (
          <>
            <div
              ref={marqueeAnchorRef}
              className="relative mt-7 min-h-[340px] pb-14 sm:mt-9 sm:min-h-[380px] sm:pb-16 md:min-h-[400px] md:pb-20"
              style={marqueeBreakoutStyle}
              aria-hidden
            />
            {marqueePortalHost
              ? createPortal(
                  <div
                    ref={marqueePortalLayerRef}
                    className="pointer-events-auto overflow-visible"
                    style={{ position: 'fixed' }}
                  >
                    <div className="relative box-border min-h-0 w-full min-w-0 overflow-x-clip overflow-y-visible px-5 pt-4 pb-20 sm:px-8 sm:pt-5 sm:pb-24 md:px-10">
                      {livingRoomMarqueeInner}
                    </div>
                  </div>,
                  marqueePortalHost
                )
              : null}
          </>
        ) : (
          <div
            className="relative mt-7 w-full overflow-x-clip overflow-y-visible px-5 pt-4 pb-20 sm:mt-9 sm:px-8 sm:pt-5 sm:pb-24 md:px-10"
            style={marqueeBreakoutStyle}
          >
            {livingRoomMarqueeInner}
          </div>
        )}
      </motion.section>

      <motion.section className="py-8 sm:py-14" {...fadeUp} lang={marketingLang}>
        <GlassCard
          variant="flatOnMobile"
          className="overflow-hidden border border-gold-400/35 p-6 sm:p-8 xl:border-gold-400/60"
        >
          <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <div>
              <h2 className="text-balance mb-4 text-3xl leading-tight text-graphite sm:text-5xl">{t.emotionTitle}</h2>
              <p className={`text-base leading-8 text-silver-dark ${BODY_TEXT_CLASS}`}>{text(t.emotion)}</p>
            </div>
            <div className="relative flex min-h-[280px] flex-col overflow-hidden rounded-2xl p-4 sm:min-h-[320px] sm:rounded-[32px] sm:p-5 max-xl:border max-xl:border-white/20 xl:border xl:border-white/30 xl:bg-gradient-to-br xl:from-white/12 xl:via-pearl-100/18 xl:to-gold-500/10 xl:shadow-[inset_0_1px_0_rgba(255,255,255,0.38)] xl:backdrop-blur-glass">
              <motion.div
                animate={{ y: [0, -16, 0], rotate: [0, 1.5, 0] }}
                transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
                className="pointer-events-none absolute right-8 top-6 hidden h-28 w-28 rounded-full bg-gold-500/35 blur-2xl xl:block"
                aria-hidden
              />
              <div className="relative z-[1] flex min-h-0 flex-1 flex-col justify-center">
                <ProfileTagRows
                  items={emotionProfileCycles[marketingShowcaseFrame] ?? []}
                  layoutGroupId={`emotion-profile-tags-${language}`}
                />
              </div>
            </div>
          </div>
        </GlassCard>
      </motion.section>

      <motion.section
        id="research-project"
        className="py-8 sm:py-12 scroll-mt-24"
        {...fadeUp}
        aria-labelledby="research-project-heading"
        lang={marketingLang}
      >
        <GlassCard
          variant="flatOnMobile"
          className="border border-white/25 p-6 sm:p-8 xl:border-gold-400/35"
        >
          <p className="mb-3 font-modern text-[11px] font-semibold uppercase tracking-[0.2em] text-gold-500">
            {t.research.badge}
          </p>
          <h2
            id="research-project-heading"
            className="text-balance mb-2 max-w-3xl text-2xl leading-tight text-graphite sm:text-3xl"
          >
            {t.research.title}
          </h2>
          <p className="mb-5 max-w-3xl font-modern text-sm text-graphite/75 sm:text-base">
            {t.research.author}
            <span className="mx-2 text-graphite/30" aria-hidden="true">
              ·
            </span>
            {t.research.institution}
          </p>
          <p className={`mb-5 max-w-3xl text-sm text-silver-dark sm:text-base sm:leading-8 ${BODY_TEXT_CLASS}`}>
            {text(t.research.body)}
          </p>
          <p className="text-pretty mb-6 max-w-3xl font-modern text-sm leading-6 text-silver-dark">
            {text(t.research.feedback)}
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <GlassButton
              size="md"
              variant="secondary"
              onClick={() => router.push('/o-projecie')}
              className="group"
            >
              {t.research.learnMoreCta}
              <ArrowRight
                size={18}
                className="text-gold-500 transition-transform group-hover:translate-x-0.5"
                aria-hidden="true"
              />
            </GlassButton>
            <GlassButton
              size="md"
              variant="secondary"
              onClick={() => router.push('/contact')}
              className="group"
            >
              {t.research.contactCta}
              <ArrowRight
                size={18}
                className="text-gold-500 transition-transform group-hover:translate-x-0.5"
                aria-hidden="true"
              />
            </GlassButton>
          </div>
        </GlassCard>
      </motion.section>

      <motion.section
        id="marketing-final-cta"
        className="py-10 text-center sm:py-16 scroll-mt-24"
        {...fadeUp}
      >
        <GlassCard variant="flatOnMobile" className="p-8 sm:p-12">
          <h2 className="text-balance mx-auto mb-4 max-w-4xl text-3xl leading-tight text-graphite sm:mb-5 sm:text-5xl">{t.finalTitle}</h2>
          <p className="mx-auto mb-4 max-w-2xl font-modern text-base text-silver-dark">{t.finalSubtitle}</p>
          <p className="mx-auto mb-7 max-w-2xl font-modern text-[11px] font-semibold leading-snug tracking-wide text-graphite/85 sm:text-xs">
            {t.earlyAccessLine}
          </p>
          <div className="mx-auto flex justify-center">
            <GlassButton
              size="lg"
              onClick={handleTryBasicFree}
              className="glass-button-emphasis group w-full min-w-0 sm:w-auto sm:min-w-[12rem]"
            >
              <Sparkles size={20} className="shrink-0 text-gold-500" aria-hidden="true" />
              {t.tryForFreeCta}
            </GlassButton>
          </div>
        </GlassCard>
      </motion.section>
      </div>
      </div>

      <div className={cn(useMarqueePortal && 'pointer-events-auto')}>
      <SiteFooter
        tagline={t.footer.tagline}
        aboutLabel={t.footer.about}
        contactLabel={t.footer.contact}
        privacyLabel={t.footer.privacy}
        termsLabel={t.footer.terms}
        pricingLabel={t.footer.pricing}
        rightsLabel={t.footer.rights}
        breakoutLeft={columnBox.left}
        breakoutWidth={viewportWidth}
      />
      </div>
    </div>
    {introPortal}
    <LoginModal
      isOpen={loginOpen}
      onClose={() => setLoginOpen(false)}
      onSuccess={handleLoginSuccess}
      redirectPath={PATH_AFTER_FREE_TRY}
      title={{
        pl: copy.pl.loginModalTitle,
        en: copy.en.loginModalTitle,
      }}
      message={language === 'pl' ? copy.pl.loginModalMessage : copy.en.loginModalMessage}
    />
    </>
  );
};

type VisualVariantCardProps = {
  item: LivingRoomMarketingCard;
};

const VisualVariantCard = ({ item }: VisualVariantCardProps) => (
  <div className="group/card relative w-[min(82vw,276px)] shrink-0 sm:w-[312px] xl:w-[340px]">
    <GlassCard
      variant="flatOnMobile"
      className="relative z-0 flex min-h-0 cursor-pointer flex-col overflow-hidden p-2.5 transition-[transform,box-shadow] duration-300 ease-out max-xl:group-hover/card:translate-y-0 max-xl:group-hover/card:scale-100 max-xl:group-hover/card:shadow-none xl:will-change-transform xl:group-hover/card:-translate-y-1.5 xl:group-hover/card:scale-[1.02] xl:group-hover/card:shadow-2xl sm:p-3"
    >
      <div className="relative h-[10.75rem] overflow-hidden rounded-[1.05rem] ring-1 ring-inset ring-black/[0.06] sm:h-[12.5rem] xl:h-[13.25rem]">
        <Image
          src={item.url}
          alt={item.title}
          fill
          className="pointer-events-none object-cover object-center"
          sizes="(max-width: 640px) 82vw, (max-width: 1280px) 312px, 340px"
        />
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 z-[1] h-[42%] bg-[linear-gradient(to_top,rgba(12,14,18,0.34)_0%,rgba(12,14,18,0.1)_48%,rgba(12,14,18,0)_100%)]"
          aria-hidden="true"
        />
        <div className="absolute inset-x-0 bottom-0 z-[2] flex max-h-12 flex-wrap items-end justify-center gap-1 overflow-hidden px-2 pb-2 pt-1">
          {item.chips.filter((chip) => chip !== item.title).slice(0, 4).map((chip, chipIndex) => (
            <span
              key={`${item.filename}-tag-${chipIndex}`}
              className="rounded-full border border-white/30 bg-black/40 px-1.5 py-0.5 font-modern text-[8px] font-semibold uppercase tracking-wide text-white shadow-sm backdrop-blur-[2px] sm:text-[9px]"
            >
              {chip}
            </span>
          ))}
        </div>
      </div>
      <div className="grid gap-1 border-t border-white/20 px-3 py-2.5 text-center sm:py-3">
        <h3 className="line-clamp-1 text-[0.95rem] font-semibold leading-tight tracking-tight text-graphite sm:text-base">
          {item.title}
        </h3>
        <p className="line-clamp-2 font-modern text-[11px] leading-relaxed text-graphite/65 sm:text-xs">
          {item.label}
        </p>
      </div>
    </GlassCard>
  </div>
);

type PathCardProps = {
  icon: LucideIcon;
  title: string;
  badge: string;
  meta?: string;
  description: string;
  points: string[];
  cta: string;
  highlighted?: boolean;
  onClick: () => void;
};

const PathCard = ({
  icon: Icon,
  title,
  badge,
  meta,
  description,
  points,
  cta,
  highlighted = false,
  onClick,
}: PathCardProps) => (
  <GlassCard
    variant="flatOnMobile"
    className={cn(
      'flex h-full flex-col overflow-hidden p-6 sm:p-7',
      MOBILE_FLAT_CARD_FRAME,
      highlighted ? 'bg-gold-400/5 xl:border xl:border-gold-400/60' : 'xl:border xl:border-white/20',
      // Desktop: share row heights with sibling so headers, copy, lists, and CTAs line up (CSS subgrid).
      'lg:row-span-4 lg:grid lg:min-h-0 lg:grid-cols-1 lg:[grid-template-rows:subgrid]',
      highlighted ? 'lg:col-start-2 lg:row-start-1' : 'lg:col-start-1 lg:row-start-1'
    )}
  >
    <div className="mb-5 flex items-start justify-between gap-4 lg:mb-0">
      <div className="flex min-w-0 items-center gap-3">
        <div
          className={cn(
            'flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-gold-500/40 text-gold-500 shadow-[inset_0_1px_0_rgba(255,255,255,0.14),0_0_20px_-6px_rgba(255,215,0,0.35)]',
            highlighted ? 'bg-graphite/28' : 'bg-graphite/32'
          )}
        >
          <Icon size={26} aria-hidden />
        </div>
        <div className="min-w-0">
          <h3 className="text-balance text-2xl leading-snug text-graphite">{title}</h3>
          {meta ? <p className="mt-1 font-modern text-xs text-silver-dark">{meta}</p> : null}
        </div>
      </div>
      <span className="shrink-0 self-start rounded-full border border-gold-500/45 bg-gold-500/15 px-3 py-1 font-modern text-xs text-graphite">
        {badge}
      </span>
    </div>
    <p className="mb-5 font-modern text-sm leading-6 text-silver-dark lg:mb-0">{description}</p>
    <ul className="mb-7 grid gap-2 font-modern text-sm text-graphite lg:mb-0">
      {points.map((point) => (
        <li key={point} className="flex items-center gap-2">
          <CheckCircle2 size={16} className="shrink-0 text-gold-500" aria-hidden="true" />
          {point}
        </li>
      ))}
    </ul>
    <GlassButton
      variant={highlighted ? 'primary' : 'secondary'}
      onClick={onClick}
      className={cn(
        'mt-auto w-full lg:mt-0',
        highlighted && 'glass-button-emphasis'
      )}
    >
      {cta}
    </GlassButton>
  </GlassCard>
);

type SiteFooterProps = {
  tagline: string;
  aboutLabel: string;
  contactLabel: string;
  privacyLabel: string;
  termsLabel: string;
  pricingLabel: string;
  rightsLabel: string;
  breakoutLeft: number;
  breakoutWidth: number;
};

const SiteFooter = ({
  tagline,
  aboutLabel,
  contactLabel,
  privacyLabel,
  termsLabel,
  pricingLabel,
  rightsLabel,
  breakoutLeft,
  breakoutWidth,
}: SiteFooterProps) => {
  const year = new Date().getFullYear();

  return (
    <footer
      className="mt-0 border-t border-graphite/[0.08] bg-gradient-to-b from-transparent to-pearl-200/35 pb-[max(1.75rem,env(safe-area-inset-bottom,0px))] pt-7"
      style={{
        marginLeft: breakoutLeft ? `${-breakoutLeft}px` : '0px',
        width: breakoutWidth ? `${breakoutWidth}px` : 'var(--awa-layout-vw, 100%)',
      }}
    >
      <div className="mx-auto max-w-3xl px-5 text-center sm:px-8">
        <p className="font-modern text-[11px] leading-relaxed tracking-wide text-silver-dark/90 sm:text-xs">
          {tagline}
        </p>
        <div
          className="mt-6 flex flex-col items-center gap-3 font-modern text-[11px] text-silver-dark sm:flex-row sm:flex-wrap sm:justify-center sm:gap-x-1 sm:gap-y-2 sm:text-xs"
          aria-label="Legal and site links"
        >
          <span className="text-silver-dark/80">
            © {year} IDA. {rightsLabel}
          </span>
          <span className="hidden text-graphite/20 sm:inline" aria-hidden="true">
            ·
          </span>
          <nav className="flex flex-wrap items-center justify-center gap-x-2 gap-y-2 sm:gap-x-0">
            {[
              { href: '/o-projecie', label: aboutLabel },
              { href: '/contact', label: contactLabel },
              { href: '/privacy', label: privacyLabel },
              { href: '/terms', label: termsLabel },
              { href: '/subscription/plans', label: pricingLabel },
            ].map((item, index) => (
              <React.Fragment key={item.href}>
                {index > 0 && (
                  <span className="hidden px-2 text-graphite/25 sm:inline" aria-hidden="true">
                    |
                  </span>
                )}
                <a
                  href={item.href}
                  className="min-h-[44px] min-w-[44px] px-1 py-2 text-graphite/75 underline-offset-4 transition-colors hover:text-graphite hover:underline sm:min-h-0 sm:min-w-0 sm:px-0"
                >
                  {item.label}
                </a>
              </React.Fragment>
            ))}
          </nav>
        </div>
      </div>
    </footer>
  );
};

export default MarketingEntryScreen;
