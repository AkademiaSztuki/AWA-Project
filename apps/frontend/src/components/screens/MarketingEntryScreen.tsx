"use client";

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { Environment, OrbitControls } from '@react-three/drei';
import { motion, useMotionValueEvent, useScroll, useTransform } from 'framer-motion';
import { useRouter } from 'next/navigation';
import {
  ArrowRight,
  Brain,
  CheckCircle2,
  Clock,
  FileText,
  Heart,
  Home,
  Layers,
  Mail,
  PlayCircle,
  Shield,
  SlidersHorizontal,
  Sparkles,
  Upload,
  Wand2,
  type LucideIcon,
} from 'lucide-react';
import { GlassButton, GlassCard } from '@/components/ui';
import { AwaModel } from '@/components/awa/AwaModel';
import { useLanguage } from '@/contexts/LanguageContext';
import { useLayout } from '@/contexts/LayoutContext';
import { cn } from '@/lib/utils';

const copy = {
  pl: {
    eyebrow: 'IDA Interior Design Assistant',
    headline: 'Zobacz swoje wnętrze zaprojektowane pod Twoją osobowość',
    subheadline:
      'Stały punkt wyjścia to Twój obecny pokój. IDA pokazuje kilka możliwych wersji przyszłego wnętrza, dopasowanych do stylu życia, nastroju i tego, jak chcesz się czuć w przestrzeni.',
    primaryCta: 'Stwórz moje wnętrze',
    secondaryCta: 'Zobacz jak działa',
    proof: ['Pierwsze propozycje w kilka minut', 'Możesz zacząć za darmo', 'Dopasowanie do Twojego profilu'],
    before: 'Obecny pokój',
    after: 'Wersja IDA',
    visualTitle: 'Porównaj obecny pokój z wariantami IDA',
    visualSubtitle: 'Wariant IDA zmienia się automatycznie. Przeciągnij suwak, żeby porównać projekt z punktem wyjścia.',
    slideHint: 'Przeciągnij',
    profileTitle: 'Twój profil wnętrza',
    profileTags: ['Spokój', 'Kreatywność', 'Ciepło', 'Minimalizm'],
    assistant:
      'Pokaż mi swoją przestrzeń, a pomogę Ci odkryć styl, który pasuje do Ciebie - nie tylko do trendów.',
    meetAwaTitle: 'Poznaj IDA - przewodniczkę po Twoim stylu',
    meetAwaSubtitle:
      'Najpierw pokazujemy efekt. Potem IDA pomaga zrozumieć, dlaczego dana przestrzeń pasuje właśnie do Ciebie: analizuje pokój, inspiracje, osobowość i potrzeby.',
    meetAwaBadge: 'IDA pojawia się po scrollu',
    meetAwaCards: ['analiza pokoju', 'profil osobowości', 'inspiracje', 'generowanie wariantów'],
    stylesTitle: 'Jedno zdjęcie pokoju. Kilka kierunków dopasowania.',
    stylesSubtitle:
      'Użytkownik nie musi od razu wiedzieć, czego chce. IDA pomaga zobaczyć różne wersje tej samej przestrzeni i wybrać tę, która naprawdę pasuje.',
    variants: [
      {
        name: 'Calm Focus',
        label: 'spokój + koncentracja',
        description: 'jasne światło, miękkie materiały, mniej bodźców',
      },
      {
        name: 'Warm Social',
        label: 'ciepło + spotkania',
        description: 'cieplejsza paleta, wygodne strefy, bardziej zapraszający klimat',
      },
      {
        name: 'Creative Flow',
        label: 'energia + kreatywność',
        description: 'mocniejsze akcenty, rytm, ekspresja i przestrzeń do tworzenia',
      },
    ],
    stepsTitle: 'Od zdjęcia pokoju do wnętrza, które pasuje do Ciebie',
    steps: [
      {
        title: 'Pokaż swoją przestrzeń',
        description: 'Prześlij zdjęcie pokoju albo zacznij od inspiracji, które lubisz.',
      },
      {
        title: 'IDA poznaje Twój styl',
        description: 'Krótka ścieżka daje szybki efekt, a pełny profil pozwala wejść głębiej w osobowość i potrzeby.',
      },
      {
        title: 'Otrzymujesz nowe wnętrze',
        description: 'AI generuje propozycje, które możesz dopracowywać, porównywać i zapisywać.',
      },
    ],
    pathsTitle: 'Wybierz, jak głęboko IDA ma Cię poznać',
    fast: {
      title: 'Szybki start',
      label: '3-5 min',
      description: 'Dla osób, które chcą szybko zobaczyć pierwszy kierunek zmiany.',
      cta: 'Chcę szybko zobaczyć efekt',
      points: ['zdjęcie pokoju', 'podstawowy styl', 'pierwsze generacje'],
    },
    full: {
      title: 'Pełna personalizacja',
      label: 'Najlepszy efekt',
      duration: '20-30 min',
      description: 'Dla osób, które chcą wnętrze naprawdę dopasowane do siebie.',
      cta: 'Stwórz mój profil wnętrza',
      points: ['profil osobowości', 'preferencje sensoryczne', 'styl życia i inspiracje'],
    },
    whyTitle: 'To nie tylko ładny obrazek. To projekt oparty na Tobie.',
    why: [
      {
        title: 'Osobowość',
        description: 'IDA bierze pod uwagę to, jak chcesz się czuć w swojej przestrzeni.',
      },
      {
        title: 'Styl życia',
        description: 'Inaczej projektuje miejsce do odpoczynku, pracy, spotkań czy kreatywności.',
      },
      {
        title: 'Realna przestrzeń',
        description: 'Twoje wnętrze nie jest pustą kartką - IDA pracuje z tym, co już masz.',
      },
    ],
    emotionTitle: 'Twoje wnętrze powinno mówić Twoim językiem',
    emotion:
      'Nie każdy potrzebuje tego samego stylu. Jedni szukają spokoju, inni energii, struktury, ciepła albo przestrzeni do tworzenia. IDA pomaga odkryć, czego naprawdę potrzebujesz od swojego wnętrza - i zamienia to w obraz.',
    finalTitle: 'Zobacz, jak mogłoby wyglądać Twoje wnętrze',
    finalSubtitle: 'Zacznij od szybkiej ścieżki albo przejdź pełną personalizację.',
    footer: {
      product: 'IDA',
      description: 'AI interior design assistant tworzony z myślą o personalizacji, badaniu preferencji i lepszej współpracy człowieka z AI.',
      contact: 'Kontakt',
      privacy: 'Prywatność',
      terms: 'Regulamin',
      start: 'Start',
    },
  },
  en: {
    eyebrow: 'IDA Interior Design Assistant',
    headline: 'See your interior designed around your personality',
    subheadline:
      'Your current room stays as the starting point. IDA shows several possible future versions shaped around your lifestyle, mood, and how you want the space to feel.',
    primaryCta: 'Create my interior',
    secondaryCta: 'See how it works',
    proof: ['First ideas in minutes', 'Start for free', 'Matched to your profile'],
    before: 'Current room',
    after: 'IDA version',
    visualTitle: 'Compare your current room with IDA variants',
    visualSubtitle: 'The IDA version changes automatically. Drag the slider to compare the concept with the starting point.',
    slideHint: 'Drag',
    profileTitle: 'Your interior profile',
    profileTags: ['Calm', 'Creativity', 'Warmth', 'Minimalism'],
    assistant:
      'Show me your space and I will help you discover a style that fits you - not just the trends.',
    meetAwaTitle: 'Meet IDA - your guide to personal style',
    meetAwaSubtitle:
      'First we show the result. Then IDA helps explain why a space fits you: it reads the room, inspirations, personality, and needs.',
    meetAwaBadge: 'IDA appears after scroll',
    meetAwaCards: ['room analysis', 'personality profile', 'inspirations', 'variant generation'],
    stylesTitle: 'One room photo. Several personalized directions.',
    stylesSubtitle:
      'Users do not need to know exactly what they want. IDA helps them see different versions of the same space and choose the one that truly fits.',
    variants: [
      {
        name: 'Calm Focus',
        label: 'calm + focus',
        description: 'soft light, calmer materials, fewer distractions',
      },
      {
        name: 'Warm Social',
        label: 'warmth + hosting',
        description: 'warmer palette, comfortable zones, a more inviting atmosphere',
      },
      {
        name: 'Creative Flow',
        label: 'energy + creativity',
        description: 'stronger accents, rhythm, expression, and room to create',
      },
    ],
    stepsTitle: 'From room photo to an interior that fits you',
    steps: [
      {
        title: 'Show your space',
        description: 'Upload a room photo or start with inspirations you already like.',
      },
      {
        title: 'IDA learns your style',
        description: 'Fast mode gives you a quick result, while the full profile goes deeper into personality and needs.',
      },
      {
        title: 'Get a new interior',
        description: 'AI generates proposals you can refine, compare, and save.',
      },
    ],
    pathsTitle: 'Choose how deeply IDA should get to know you',
    fast: {
      title: 'Quick start',
      label: '3-5 min',
      description: 'For people who want to see the first design direction quickly.',
      cta: 'I want a quick result',
      points: ['room photo', 'basic style', 'first generations'],
    },
    full: {
      title: 'Full personalization',
      label: 'Best result',
      duration: '20-30 min',
      description: 'For people who want an interior that is truly adapted to them.',
      cta: 'Create my interior profile',
      points: ['personality profile', 'sensory preferences', 'lifestyle and inspirations'],
    },
    whyTitle: 'This is not just a pretty image. It is a design based on you.',
    why: [
      {
        title: 'Personality',
        description: 'IDA considers how you want to feel in your space.',
      },
      {
        title: 'Lifestyle',
        description: 'It designs differently for rest, work, social life, or creativity.',
      },
      {
        title: 'Real space',
        description: 'Your room is not a blank canvas - IDA works with what you already have.',
      },
    ],
    emotionTitle: 'Your interior should speak your language',
    emotion:
      'Not everyone needs the same style. Some people need calm, others need energy, structure, warmth, or room to create. IDA helps reveal what you truly need from your interior - and turns it into an image.',
    finalTitle: 'See what your interior could become',
    finalSubtitle: 'Start with the quick path or go into full personalization.',
    footer: {
      product: 'IDA',
      description: 'An AI interior design assistant built for personalization, preference research, and better human-AI collaboration.',
      contact: 'Contact',
      privacy: 'Privacy',
      terms: 'Terms',
      start: 'Start',
    },
  },
};

const profileScores = [82, 74, 68, 61];

const fadeUp = {
  initial: { opacity: 0, y: 32 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-90px' },
  transition: { duration: 0.75, ease: 'easeOut' },
};

const BEFORE_ROOM_THEME: RoomTheme = {
  wall: 'from-[#cfc8bc] via-[#b8aea1] to-[#8c8277]',
  floor: 'bg-[#4b433e]/30',
  sofa: 'bg-graphite/40',
  pillowA: 'bg-silver-400/55',
  pillowB: 'bg-white/30',
  art: 'bg-white/16',
  glow: 'bg-white/20',
  accent: 'bg-silver-400/50',
};

const AFTER_ROOM_THEMES: RoomTheme[] = [
  {
    wall: 'from-[#f9f8ef] via-[#f7e7ce] to-[#d7b56d]',
    floor: 'bg-[#6f5438]/22',
    sofa: 'bg-graphite/78',
    pillowA: 'bg-gold-400/75',
    pillowB: 'bg-champagne/90',
    art: 'bg-white/38',
    glow: 'bg-gold-400/35',
    accent: 'bg-gold-500/75',
  },
  {
    wall: 'from-[#fffaf0] via-[#f2d5b5] to-[#b8794d]',
    floor: 'bg-[#8b5e3c]/24',
    sofa: 'bg-[#5d4638]/75',
    pillowA: 'bg-[#e8b86d]/80',
    pillowB: 'bg-white/70',
    art: 'bg-[#fff6de]/45',
    glow: 'bg-[#f4b66a]/40',
    accent: 'bg-[#c7773a]/75',
  },
  {
    wall: 'from-[#f6fbff] via-[#dceaf1] to-[#8ea6b5]',
    floor: 'bg-[#455a64]/22',
    sofa: 'bg-[#263238]/72',
    pillowA: 'bg-[#6ec6ca]/65',
    pillowB: 'bg-[#f6f1df]/80',
    art: 'bg-white/40',
    glow: 'bg-[#9dd6d9]/38',
    accent: 'bg-[#2f7f84]/70',
  },
];

type RoomTheme = {
  wall: string;
  floor: string;
  sofa: string;
  pillowA: string;
  pillowB: string;
  art: string;
  glow: string;
  accent: string;
};

type RoomPlaceholderProps = {
  theme: RoomTheme;
  mode: 'before' | 'after';
  label?: string;
};

const RoomPlaceholder = ({ theme, mode, label }: RoomPlaceholderProps) => (
  <div
    className={cn(
      'absolute inset-0 overflow-hidden bg-gradient-to-br',
      theme.wall
    )}
    aria-hidden="true"
  >
    <div className={cn('absolute inset-x-0 bottom-0 h-[36%]', theme.floor)} />
    <div className="absolute left-[6%] top-[10%] h-[55%] w-[26%] rounded-t-full border border-white/45 bg-white/18 backdrop-blur-[2px]" />
    <motion.div
      animate={mode === 'after' ? { opacity: [0.4, 0.75, 0.4], scale: [1, 1.08, 1] } : undefined}
      transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
      className={cn('absolute right-[14%] top-[12%] h-32 w-32 rounded-full blur-3xl', theme.glow)}
    />
    <div className={cn('absolute right-[9%] top-[16%] h-[30%] w-[35%] rounded-[2rem] border border-white/35 shadow-xl', theme.art)}>
      <div className="absolute inset-4 rounded-[1.5rem] border border-white/30" />
      <div className={cn('absolute bottom-5 left-5 h-2 w-20 rounded-full', theme.accent)} />
    </div>
    <div className={cn('absolute bottom-[15%] left-[20%] h-[23%] w-[58%] rounded-[2.2rem] border border-white/35 shadow-2xl', theme.sofa)} />
    <div className={cn('absolute bottom-[29%] left-[29%] h-[12%] w-[18%] rounded-2xl border border-white/30', theme.pillowA)} />
    <div className={cn('absolute bottom-[29%] right-[25%] h-[12%] w-[18%] rounded-2xl border border-white/30', theme.pillowB)} />
    <div className={cn('absolute bottom-[8%] right-[11%] h-[30%] w-[8%] rounded-full border border-white/35', mode === 'after' ? 'bg-white/68' : 'bg-white/26')} />
    <div className={cn('absolute bottom-[9%] left-[11%] h-[22%] w-[11%] rounded-t-full border border-white/30', mode === 'after' ? theme.accent : 'bg-silver-400/36')} />
    {mode === 'after' && (
      <>
        <div className={cn('absolute left-[13%] bottom-[18%] h-20 w-1 rounded-full', theme.accent)} />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.35),transparent_36%)]" />
      </>
    )}
    {label && (
      <div className="absolute bottom-5 left-5 rounded-full border border-white/35 bg-black/35 px-4 py-2 font-modern text-xs text-white backdrop-blur">
        {label}
      </div>
    )}
  </div>
);

const MarketingEntryScreen: React.FC = () => {
  const router = useRouter();
  const { language } = useLanguage();
  const { setHeaderVisible } = useLayout();
  const [sliderPosition, setSliderPosition] = useState(56);
  const [activeVariant, setActiveVariant] = useState(0);
  const comparisonRef = useRef<HTMLDivElement | null>(null);
  const heroRef = useRef<HTMLElement | null>(null);
  const heroBleedMeasureRef = useRef<HTMLDivElement | null>(null);
  /** Column box inside AppContentFrame — used for viewport breakout without relying on symmetric “max bleed”. */
  const [columnBox, setColumnBox] = useState({ left: 0, width: 0 });
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  });
  const [viewportWidth, setViewportWidth] = useState(0);
  const [heroScrollProgress, setHeroScrollProgress] = useState(0);
  const heroSettleProgress = Math.min(1, Math.max(0, heroScrollProgress));
  const heroBreakoutProgress = 1 - heroSettleProgress;
  const measuredHeroWidth =
    columnBox.width && viewportWidth
      ? columnBox.width + (viewportWidth - columnBox.width) * heroBreakoutProgress
      : 0;
  const measuredHeroMarginLeft = -columnBox.left * heroBreakoutProgress;
  const heroWidth = measuredHeroWidth > 0 ? `${measuredHeroWidth}px` : '100vw';
  const heroMarginLeft =
    measuredHeroWidth > 0 ? `${measuredHeroMarginLeft}px` : 'calc(50% - 50vw)';
  const heroBorderRadius = useTransform(scrollYProgress, [0, 1], ['0px', '36px']);
  const heroShadow = useTransform(
    scrollYProgress,
    [0, 1],
    ['0 0 0 rgba(31, 38, 135, 0)', '0 34px 90px rgba(31, 38, 135, 0.32)']
  );
  const modelX = useTransform(scrollYProgress, [0.12, 0.58], [-360, 0]);
  const modelOpacity = useTransform(scrollYProgress, [0.08, 0.38], [0, 1]);
  const modelScale = useTransform(scrollYProgress, [0.12, 0.58], [0.88, 1]);
  const t = copy[language];

  useMotionValueEvent(scrollYProgress, 'change', (latest) => {
    setHeroScrollProgress(latest);
  });

  useEffect(() => {
    setHeaderVisible(false);
  }, [setHeaderVisible]);

  useEffect(() => {
    const measureBleed = () => {
      const node = heroBleedMeasureRef.current;
      if (!node) return;

      const rect = node.getBoundingClientRect();
      setColumnBox({ left: rect.left, width: rect.width });
      setViewportWidth(window.innerWidth);
    };

    measureBleed();
    window.addEventListener('resize', measureBleed);

    return () => window.removeEventListener('resize', measureBleed);
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setActiveVariant((current) => (current + 1) % AFTER_ROOM_THEMES.length);
    }, 3600);

    return () => window.clearInterval(interval);
  }, []);

  const activeTheme = AFTER_ROOM_THEMES[activeVariant];
  const activeVariantCopy = t.variants[activeVariant];
  const styleCards = useMemo(
    () => t.variants.map((variant, index) => ({ ...variant, theme: AFTER_ROOM_THEMES[index] })),
    [t.variants]
  );

  const goToStart = () => router.push('/start');
  const scrollToHowItWorks = () => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' });

  const updateSliderFromClientX = (clientX: number) => {
    const rect = comparisonRef.current?.getBoundingClientRect();
    if (!rect) return;

    const next = ((clientX - rect.left) / rect.width) * 100;
    setSliderPosition(Math.max(8, Math.min(92, next)));
  };

  return (
    <div className="relative w-full pb-12">
      {/* Width probe — must not use overflow-hidden or sticky will not behave reliably */}
      <div ref={heroBleedMeasureRef} className="pointer-events-none h-0 w-full" aria-hidden="true" />
      <section ref={heroRef} className="relative h-[190dvh]">
        <motion.div
          style={{
            marginLeft: heroMarginLeft,
            width: heroWidth,
            borderRadius: heroBorderRadius,
            boxShadow: heroShadow,
          }}
          className="sticky top-0 z-[40] h-[100dvh] overflow-hidden border border-white/25 bg-pearl-100/30 backdrop-blur-[2px]"
        >
          <div className="pointer-events-none absolute inset-0 z-0 bg-gradient-to-r from-graphite/68 via-graphite/22 to-transparent" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-0 h-1/2 bg-gradient-to-t from-black/45 via-black/15 to-transparent" />

          <div
            ref={comparisonRef}
            className="relative z-20 h-full cursor-ew-resize overflow-hidden"
            onPointerDown={(event) => {
              event.currentTarget.setPointerCapture(event.pointerId);
              updateSliderFromClientX(event.clientX);
            }}
            onPointerMove={(event) => {
              if (event.buttons !== 1) return;
              updateSliderFromClientX(event.clientX);
            }}
            role="group"
            aria-label={t.visualTitle}
          >
            <RoomPlaceholder theme={BEFORE_ROOM_THEME} mode="before" label={t.before} />
            <motion.div
              key={activeVariant}
              initial={{ opacity: 0.88 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.55 }}
              className="absolute inset-0 overflow-hidden"
              style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
            >
              <RoomPlaceholder theme={activeTheme} mode="after" label={`${t.after}: ${activeVariantCopy.name}`} />
            </motion.div>

            <div
              className="absolute inset-y-0 z-[21] w-1 bg-white shadow-2xl"
              style={{ left: `${sliderPosition}%` }}
              aria-hidden="true"
            >
              <div className="absolute left-1/2 top-1/2 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/70 bg-white/90 shadow-2xl sm:h-20 sm:w-20">
                <SlidersHorizontal size={28} className="text-graphite" aria-hidden="true" />
              </div>
            </div>

            <input
              type="range"
              min="8"
              max="92"
              value={sliderPosition}
              onChange={(event) => setSliderPosition(Number(event.target.value))}
              className="glass-slider-input absolute inset-0 z-[22] h-full w-full cursor-ew-resize opacity-0"
              aria-label={t.visualSubtitle}
            />
          </div>

          <motion.div
            style={{ x: modelX, opacity: modelOpacity, scale: modelScale }}
            className="pointer-events-none absolute bottom-0 left-0 z-[15] hidden h-[84dvh] w-[44vw] min-w-[520px] lg:block"
          >
            <Canvas camera={{ position: [-1.2, 0.4, 2.2], fov: 70 }} className="h-full w-full bg-transparent">
              <Environment preset="studio" />
              <ambientLight intensity={0.55} color="#FFE5B4" />
              <directionalLight position={[2, 2, 2]} intensity={0.5} color="#FFD700" />
              <AwaModel currentStep="landing" position={[-0.45, -0.9, 0]} />
              <OrbitControls enablePan={false} enableZoom={false} enableRotate={false} />
            </Canvas>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: -24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.75, delay: 0.15, ease: 'easeOut' }}
            className="relative z-30 flex h-full items-end justify-end p-4 sm:p-8 xl:p-10"
          >
            <GlassCard variant="glass" className="mb-6 max-w-2xl p-5 sm:p-7 xl:p-8 lg:mr-4">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-gold-400/45 bg-white/25 px-4 py-2 text-xs font-modern uppercase tracking-[0.22em] text-graphite backdrop-blur-xl">
                <Sparkles size={14} className="text-gold-600" aria-hidden="true" />
                {t.eyebrow}
              </div>
              <h1 className="mb-4 text-4xl leading-tight text-graphite sm:text-5xl xl:text-6xl">
                {t.headline}
              </h1>
              <p className="mb-6 font-modern text-base leading-8 text-silver-dark sm:text-lg">
                {t.subheadline}
              </p>
              <div className="flex flex-col gap-3 sm:flex-row">
                <GlassButton size="lg" onClick={goToStart} className="group">
                  {t.primaryCta}
                  <ArrowRight size={20} className="transition-transform group-hover:translate-x-1" aria-hidden="true" />
                </GlassButton>
                <GlassButton size="lg" variant="secondary" onClick={scrollToHowItWorks}>
                  <PlayCircle size={20} aria-hidden="true" />
                  {t.secondaryCta}
                </GlassButton>
              </div>
            </GlassCard>
          </motion.div>

          <GlassCard variant="glass" className="absolute right-4 top-4 z-30 w-[min(340px,calc(100%-2rem))] p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm text-graphite">{activeVariantCopy.name}</p>
                <p className="font-modern text-xs text-gold-600">{activeVariantCopy.label}</p>
              </div>
              <Sparkles size={20} className="text-gold-600" aria-hidden="true" />
            </div>
            <p className="font-modern text-xs leading-5 text-silver-dark">{activeVariantCopy.description}</p>
            <div className="mt-3 flex gap-1.5">
              {t.variants.map((variant, index) => (
                <button
                  key={variant.name}
                  type="button"
                  onClick={() => setActiveVariant(index)}
                  className={cn(
                    'h-2 flex-1 rounded-full transition-colors',
                    index === activeVariant ? 'bg-gold-500' : 'bg-white/45 hover:bg-white/70'
                  )}
                  aria-label={variant.name}
                />
              ))}
            </div>
          </GlassCard>

          <div className="pointer-events-none absolute bottom-5 left-1/2 z-30 flex -translate-x-1/2 items-center gap-2 rounded-full border border-white/35 bg-white/65 px-4 py-2 font-modern text-xs text-graphite shadow-xl backdrop-blur-xl">
            <SlidersHorizontal size={15} aria-hidden="true" />
            {t.slideHint}
          </div>
        </motion.div>
      </section>

      <motion.section className="py-10 sm:py-16" {...fadeUp}>
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="max-w-3xl text-3xl leading-tight text-graphite sm:text-5xl">{t.stylesTitle}</h2>
            <p className="mt-3 max-w-3xl font-modern text-base leading-7 text-silver-dark">{t.stylesSubtitle}</p>
          </div>
          <GlassButton variant="secondary" onClick={goToStart}>
            {t.primaryCta}
          </GlassButton>
        </div>

        <div className="relative overflow-hidden py-3">
          <motion.div
            className="flex w-max gap-4"
            animate={{ x: ['0%', '-50%'] }}
            transition={{ duration: 28, repeat: Infinity, ease: 'linear' }}
          >
            {[...styleCards, ...styleCards].map((variant, index) => (
              <VisualVariantCard key={`${variant.name}-${index}`} variant={variant} index={index} />
            ))}
          </motion.div>
        </div>
      </motion.section>

      <motion.section id="how-it-works" className="py-10 sm:py-16" {...fadeUp}>
        <h2 className="mb-6 max-w-4xl text-3xl leading-tight text-graphite sm:text-5xl">{t.stepsTitle}</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {t.steps.map((step, index) => {
            const icons = [Upload, Brain, Wand2];
            const Icon = icons[index];
            return (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, y: 28 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-80px' }}
                transition={{ duration: 0.55, delay: index * 0.12 }}
              >
                <GlassCard variant="glass" className="group h-full overflow-hidden p-6">
                  <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-gold-400/20 text-graphite transition-transform group-hover:scale-110">
                    <Icon size={26} aria-hidden="true" />
                  </div>
                  <h3 className="mb-2 text-xl text-graphite">{step.title}</h3>
                  <p className="font-modern text-sm leading-6 text-silver-dark">{step.description}</p>
                  <div className="relative mt-6 h-28 overflow-hidden rounded-2xl border border-white/30">
                    <RoomPlaceholder theme={index === 0 ? BEFORE_ROOM_THEME : AFTER_ROOM_THEMES[index - 1]} mode={index === 0 ? 'before' : 'after'} />
                  </div>
                </GlassCard>
              </motion.div>
            );
          })}
        </div>
      </motion.section>

      <motion.section className="py-8 sm:py-14" {...fadeUp}>
        <h2 className="mb-6 max-w-4xl text-3xl leading-tight text-graphite sm:text-5xl">{t.pathsTitle}</h2>
        <div className="grid gap-4 lg:grid-cols-2">
          <PathCard
            icon={Clock}
            title={t.fast.title}
            badge={t.fast.label}
            description={t.fast.description}
            points={t.fast.points}
            cta={t.fast.cta}
            onClick={goToStart}
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
            onClick={goToStart}
          />
        </div>
      </motion.section>

      <motion.section className="py-8 sm:py-14" {...fadeUp}>
        <h2 className="mb-6 max-w-4xl text-3xl leading-tight text-graphite sm:text-5xl">{t.whyTitle}</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {t.why.map((item, index) => {
            const icons = [Brain, Layers, Home];
            const Icon = icons[index];
            return (
              <GlassCard key={item.title} variant="glass" className="group min-h-[260px] overflow-hidden p-6">
                <Icon size={28} className="mb-5 text-gold-600 transition-transform group-hover:scale-110" aria-hidden="true" />
                <h3 className="mb-3 text-xl text-graphite">{item.title}</h3>
                <p className="font-modern text-sm leading-6 text-silver-dark">{item.description}</p>
                <motion.div
                  whileInView={{ x: index % 2 === 0 ? 18 : -18 }}
                  transition={{ duration: 1.2, ease: 'easeOut' }}
                  className="mt-7 h-24 rounded-2xl border border-white/30 bg-gradient-to-br from-white/40 via-champagne/40 to-gold-400/25"
                />
              </GlassCard>
            );
          })}
        </div>
      </motion.section>

      <motion.section className="py-8 sm:py-14" {...fadeUp}>
        <GlassCard variant="highlighted" className="overflow-hidden p-6 sm:p-8">
          <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <div>
              <h2 className="mb-4 text-3xl leading-tight text-graphite sm:text-5xl">{t.emotionTitle}</h2>
              <p className="font-modern text-base leading-8 text-silver-dark">{t.emotion}</p>
            </div>
            <div className="relative min-h-[320px] overflow-hidden rounded-[32px] border border-white/35 bg-gradient-to-br from-white/35 via-champagne/45 to-gold-400/30 p-5">
              <motion.div
                animate={{ y: [0, -16, 0], rotate: [0, 1.5, 0] }}
                transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute right-8 top-6 h-28 w-28 rounded-full bg-gold-400/35 blur-2xl"
              />
              <div className="relative grid gap-3">
                {t.profileTags.map((tag, index) => (
                  <motion.div
                    key={tag}
                    initial={{ opacity: 0, x: 24 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                    className="flex items-center justify-between rounded-2xl bg-white/35 px-5 py-4 font-modern text-sm text-graphite backdrop-blur"
                  >
                    <span>{tag}</span>
                    <span className="text-gold-600">{profileScores[index]}%</span>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </GlassCard>
      </motion.section>

      <motion.section className="py-10 text-center sm:py-16" {...fadeUp}>
        <GlassCard variant="glass" className="p-8 sm:p-12">
          <h2 className="mx-auto mb-3 max-w-4xl text-3xl leading-tight text-graphite sm:text-5xl">{t.finalTitle}</h2>
          <p className="mx-auto mb-7 max-w-2xl font-modern text-base text-silver-dark">{t.finalSubtitle}</p>
          <GlassButton size="lg" onClick={goToStart} className="mx-auto group">
            {t.primaryCta}
            <ArrowRight size={20} className="transition-transform group-hover:translate-x-1" aria-hidden="true" />
          </GlassButton>
        </GlassCard>
      </motion.section>

      <footer className="pb-6 pt-4">
        <GlassCard variant="glass" className="p-5 sm:p-6">
          <div className="grid gap-6 md:grid-cols-[1.2fr_0.8fr] md:items-center">
            <div>
              <p className="mb-2 text-lg text-graphite">{t.footer.product}</p>
              <p className="max-w-2xl font-modern text-sm leading-6 text-silver-dark">{t.footer.description}</p>
            </div>
            <div className="flex flex-wrap gap-2 md:justify-end">
              <FooterLink icon={Mail} label={t.footer.contact} href="mailto:contact@idainteriors.ai" />
              <FooterLink icon={Shield} label={t.footer.privacy} href="/privacy" />
              <FooterLink icon={FileText} label={t.footer.terms} href="/terms" />
            </div>
          </div>
        </GlassCard>
      </footer>
    </div>
  );
};

type VisualVariantCardProps = {
  variant: {
    name: string;
    label: string;
    description: string;
    theme: RoomTheme;
  };
  index: number;
};

const VisualVariantCard = ({ variant, index }: VisualVariantCardProps) => (
  <motion.div
    whileHover={{ y: -8, scale: 1.02 }}
    className="w-[320px] shrink-0 sm:w-[420px] xl:w-[520px]"
  >
    <GlassCard variant="glass" className="overflow-hidden p-3">
      <div className="relative h-56 overflow-hidden rounded-[26px] border border-white/35 sm:h-72">
        <RoomPlaceholder theme={variant.theme} mode="after" />
      </div>
      <div className="p-3">
        <div className="mb-1 flex items-center justify-between gap-3">
          <h3 className="text-lg text-graphite">{variant.name}</h3>
          <span className="rounded-full bg-gold-400/20 px-3 py-1 font-modern text-xs text-graphite">0{(index % 3) + 1}</span>
        </div>
        <p className="font-modern text-xs uppercase tracking-[0.18em] text-gold-600">{variant.label}</p>
        <p className="mt-2 font-modern text-sm leading-6 text-silver-dark">{variant.description}</p>
      </div>
    </GlassCard>
  </motion.div>
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
  <GlassCard variant={highlighted ? 'highlighted' : 'interactive'} className="flex h-full flex-col overflow-hidden p-6 sm:p-7">
    <div className="mb-5 flex items-start justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className={cn('flex h-14 w-14 items-center justify-center rounded-2xl', highlighted ? 'bg-gold-400/30' : 'bg-white/25')}>
          <Icon size={26} className="text-graphite" aria-hidden />
        </div>
        <div>
          <h3 className="text-2xl text-graphite">{title}</h3>
          {meta && <p className="font-modern text-xs text-silver-dark">{meta}</p>}
        </div>
      </div>
      <span className="rounded-full border border-gold-400/45 bg-gold-400/15 px-3 py-1 font-modern text-xs text-graphite">
        {badge}
      </span>
    </div>
    <p className="mb-5 font-modern text-sm leading-6 text-silver-dark">{description}</p>
    <ul className="mb-7 grid gap-2 font-modern text-sm text-graphite">
      {points.map((point) => (
        <li key={point} className="flex items-center gap-2">
          <CheckCircle2 size={16} className="shrink-0 text-gold-600" aria-hidden="true" />
          {point}
        </li>
      ))}
    </ul>
    <div className="relative mb-6 h-44 overflow-hidden rounded-2xl border border-white/30">
      <RoomPlaceholder theme={highlighted ? AFTER_ROOM_THEMES[1] : AFTER_ROOM_THEMES[0]} mode="after" />
    </div>
    <GlassButton variant={highlighted ? 'primary' : 'secondary'} onClick={onClick} className="mt-auto w-full">
      {cta}
    </GlassButton>
  </GlassCard>
);

type FooterLinkProps = {
  icon: LucideIcon;
  label: string;
  href: string;
};

const FooterLink = ({ icon: Icon, label, href }: FooterLinkProps) => (
  <a
    href={href}
    className="flex min-h-[44px] items-center gap-2 rounded-full border border-white/25 bg-white/20 px-4 py-2 font-modern text-sm text-graphite transition-colors hover:bg-white/35"
  >
    <Icon size={16} aria-hidden="true" />
    {label}
  </a>
);

export default MarketingEntryScreen;
