"use client";

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import {
  ArrowRight,
  Brain,
  CheckCircle2,
  Clock,
  Heart,
  Home,
  Layers,
  PlayCircle,
  SlidersHorizontal,
  Sparkles,
  Upload,
  Wand2,
  type LucideIcon,
} from 'lucide-react';
import { GlassButton, GlassCard } from '@/components/ui';
import { useLanguage } from '@/contexts/LanguageContext';
import { useLayout } from '@/contexts/LayoutContext';
import { cn } from '@/lib/utils';

const copy = {
  pl: {
    eyebrow: 'IDA Interior Design Assistant',
    headline: 'Wygeneruj wnętrze dopasowane do Twojej osobowości',
    subheadline:
      'IDA analizuje Twoje preferencje, styl życia i charakter, a potem tworzy propozycje wnętrz, w których naprawdę możesz poczuć się sobą.',
    primaryCta: 'Stwórz moje wnętrze',
    secondaryCta: 'Zobacz jak to działa',
    proof: ['Pierwsze propozycje w kilka minut', 'Możesz zacząć za darmo', 'Dopasowanie do Twojego profilu'],
    before: 'Obecny pokój',
    after: 'Wersja IDA',
    visualTitle: 'Podgląd transformacji',
    visualSubtitle: 'Przeciągnij suwak i zobacz kierunek zmiany',
    profileTitle: 'Twój profil wnętrza',
    profileTags: ['Spokój', 'Kreatywność', 'Ciepło', 'Minimalizm'],
    assistant:
      'Pokaż mi swoją przestrzeń, a pomogę Ci odkryć styl, który pasuje do Ciebie - nie tylko do trendów.',
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
  },
  en: {
    eyebrow: 'IDA Interior Design Assistant',
    headline: 'Generate an interior shaped around your personality',
    subheadline:
      'IDA reads your preferences, lifestyle, and character, then creates rooms that feel like they actually belong to you.',
    primaryCta: 'Create my interior',
    secondaryCta: 'See how it works',
    proof: ['First ideas in minutes', 'Start for free', 'Matched to your profile'],
    before: 'Current room',
    after: 'IDA version',
    visualTitle: 'Transformation preview',
    visualSubtitle: 'Move the slider to reveal the design direction',
    profileTitle: 'Your interior profile',
    profileTags: ['Calm', 'Creativity', 'Warmth', 'Minimalism'],
    assistant:
      'Show me your space and I will help you discover a style that fits you - not just the trends.',
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
  },
};

const profileScores = [82, 74, 68, 61];

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-80px' },
  transition: { duration: 0.65, ease: 'easeOut' },
};

const PlaceholderRoom = ({ variant }: { variant: 'before' | 'after' }) => {
  const isAfter = variant === 'after';

  return (
    <div
      className={cn(
        'absolute inset-0 overflow-hidden',
        isAfter
          ? 'bg-[radial-gradient(circle_at_18%_22%,rgba(255,229,92,0.38),transparent_28%),linear-gradient(135deg,#f8f8ff_0%,#f7e7ce_45%,#d7b56d_100%)]'
          : 'bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.45),transparent_24%),linear-gradient(135deg,#d6d3cd_0%,#b8b2aa_50%,#8d8781_100%)]'
      )}
      aria-hidden="true"
    >
      <div className="absolute inset-x-0 bottom-0 h-[38%] bg-black/10" />
      <div className="absolute left-[8%] top-[13%] h-[54%] w-[28%] rounded-t-full border border-white/45 bg-white/18 backdrop-blur-[2px]" />
      <div
        className={cn(
          'absolute right-[12%] top-[18%] h-[28%] w-[34%] rounded-2xl border border-white/35 shadow-xl',
          isAfter ? 'bg-white/35' : 'bg-white/16'
        )}
      />
      <div
        className={cn(
          'absolute bottom-[16%] left-[22%] h-[22%] w-[56%] rounded-[28px] border border-white/35 shadow-2xl',
          isAfter ? 'bg-graphite/70' : 'bg-graphite/35'
        )}
      />
      <div
        className={cn(
          'absolute bottom-[28%] left-[30%] h-[12%] w-[18%] rounded-2xl border border-white/30',
          isAfter ? 'bg-gold-400/65' : 'bg-silver-400/45'
        )}
      />
      <div
        className={cn(
          'absolute bottom-[28%] right-[25%] h-[12%] w-[18%] rounded-2xl border border-white/30',
          isAfter ? 'bg-champagne/80' : 'bg-silver-300/45'
        )}
      />
      <div
        className={cn(
          'absolute bottom-[9%] right-[12%] h-[28%] w-[8%] rounded-full border border-white/35',
          isAfter ? 'bg-white/65' : 'bg-white/24'
        )}
      />
      {isAfter && (
        <>
          <div className="absolute left-[12%] top-[10%] h-24 w-24 rounded-full bg-gold-400/30 blur-2xl" />
          <div className="absolute right-[16%] bottom-[20%] h-32 w-32 rounded-full bg-white/35 blur-3xl" />
          <div className="absolute left-[14%] bottom-[18%] h-16 w-1 rounded-full bg-gold-500/70" />
        </>
      )}
    </div>
  );
};

const MarketingEntryScreen: React.FC = () => {
  const router = useRouter();
  const { language } = useLanguage();
  const { setHeaderVisible } = useLayout();
  const [sliderPosition, setSliderPosition] = useState(54);
  const t = copy[language];

  useEffect(() => {
    setHeaderVisible(false);
  }, [setHeaderVisible]);

  const goToStart = () => router.push('/start');
  const scrollToHowItWorks = () => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' });

  return (
    <div className="relative mx-auto w-full max-w-6xl overflow-hidden pb-16 pt-2 sm:pt-4">
      <section className="grid min-h-[calc(100dvh-9rem)] items-center gap-8 lg:grid-cols-[0.92fr_1.08fr]">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
          className="space-y-6"
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-gold-400/45 bg-white/20 px-4 py-2 text-xs font-modern uppercase tracking-[0.22em] text-graphite backdrop-blur-xl">
            <Sparkles size={14} className="text-gold-600" aria-hidden="true" />
            {t.eyebrow}
          </div>

          <div className="space-y-4">
            <h1 className="max-w-3xl text-4xl leading-tight text-graphite sm:text-5xl lg:text-6xl">
              {t.headline}
            </h1>
            <p className="max-w-2xl font-modern text-base leading-8 text-silver-dark sm:text-lg">
              {t.subheadline}
            </p>
          </div>

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

          <div className="grid gap-2 sm:grid-cols-3">
            {t.proof.map((item) => (
              <div key={item} className="flex items-center gap-2 rounded-2xl bg-white/15 px-3 py-2 font-modern text-sm text-graphite backdrop-blur">
                <CheckCircle2 size={16} className="shrink-0 text-gold-600" aria-hidden="true" />
                {item}
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.15, ease: 'easeOut' }}
          className="relative"
        >
          <GlassCard variant="glass" className="relative overflow-hidden p-3 sm:p-4">
            <div className="mb-3 flex items-center justify-between gap-3 px-2">
              <div>
                <p className="text-sm text-graphite">{t.visualTitle}</p>
                <p className="font-modern text-xs text-silver-dark">{t.visualSubtitle}</p>
              </div>
              <div className="rounded-full border border-gold-400/40 bg-gold-400/15 px-3 py-1 font-modern text-xs text-graphite">
                AI preview
              </div>
            </div>

            <div className="relative aspect-[4/3] overflow-hidden rounded-[28px] border border-white/35 shadow-2xl">
              <PlaceholderRoom variant="before" />
              <div
                className="absolute inset-0 overflow-hidden"
                style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
              >
                <PlaceholderRoom variant="after" />
              </div>

              <div className="absolute left-4 top-4 rounded-full bg-black/45 px-3 py-1.5 font-modern text-xs text-white backdrop-blur">
                {t.after}
              </div>
              <div className="absolute right-4 top-4 rounded-full bg-black/35 px-3 py-1.5 font-modern text-xs text-white backdrop-blur">
                {t.before}
              </div>

              <div
                className="absolute inset-y-0 w-0.5 bg-white shadow-2xl"
                style={{ left: `${sliderPosition}%` }}
                aria-hidden="true"
              >
                <div className="absolute left-1/2 top-1/2 flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/60 bg-white/85 shadow-xl">
                  <SlidersHorizontal size={22} className="text-graphite" aria-hidden="true" />
                </div>
              </div>

              <input
                type="range"
                min="16"
                max="84"
                value={sliderPosition}
                onChange={(event) => setSliderPosition(Number(event.target.value))}
                className="absolute inset-x-4 bottom-4 h-2 cursor-ew-resize appearance-none rounded-full bg-white/35 accent-gold-500"
                aria-label={t.visualSubtitle}
              />
            </div>
          </GlassCard>

          <GlassCard variant="highlighted" className="mt-4 p-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="mb-1 text-sm text-graphite">{t.profileTitle}</p>
                <p className="font-modern text-xs text-silver-dark">{t.assistant}</p>
              </div>
              <div className="grid min-w-[240px] gap-2">
                {t.profileTags.map((tag, index) => (
                  <div key={tag} className="grid grid-cols-[92px_1fr_34px] items-center gap-2 font-modern text-xs text-graphite">
                    <span>{tag}</span>
                    <div className="h-2 overflow-hidden rounded-full bg-white/35">
                      <div className="h-full rounded-full bg-gradient-to-r from-gold-600 to-gold-400" style={{ width: `${profileScores[index]}%` }} />
                    </div>
                    <span>{profileScores[index]}%</span>
                  </div>
                ))}
              </div>
            </div>
          </GlassCard>
        </motion.div>
      </section>

      <motion.section id="how-it-works" className="py-12 sm:py-16" {...fadeUp}>
        <h2 className="mb-6 max-w-3xl text-2xl leading-tight text-graphite sm:text-4xl">{t.stepsTitle}</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {t.steps.map((step, index) => {
            const icons = [Upload, Brain, Wand2];
            const Icon = icons[index];
            return (
              <GlassCard key={step.title} variant="glass" className="p-5">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gold-400/20 text-graphite">
                  <Icon size={24} aria-hidden="true" />
                </div>
                <h3 className="mb-2 text-lg text-graphite">{step.title}</h3>
                <p className="font-modern text-sm leading-6 text-silver-dark">{step.description}</p>
              </GlassCard>
            );
          })}
        </div>
      </motion.section>

      <motion.section className="py-8 sm:py-12" {...fadeUp}>
        <h2 className="mb-6 max-w-3xl text-2xl leading-tight text-graphite sm:text-4xl">{t.pathsTitle}</h2>
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

      <motion.section className="py-8 sm:py-12" {...fadeUp}>
        <h2 className="mb-6 max-w-3xl text-2xl leading-tight text-graphite sm:text-4xl">{t.whyTitle}</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {t.why.map((item, index) => {
            const icons = [Brain, Layers, Home];
            const Icon = icons[index];
            return (
              <GlassCard key={item.title} variant="glass" className="p-5">
                <Icon size={24} className="mb-4 text-gold-600" aria-hidden="true" />
                <h3 className="mb-2 text-lg text-graphite">{item.title}</h3>
                <p className="font-modern text-sm leading-6 text-silver-dark">{item.description}</p>
              </GlassCard>
            );
          })}
        </div>
      </motion.section>

      <motion.section className="py-8 sm:py-12" {...fadeUp}>
        <GlassCard variant="highlighted" className="overflow-hidden p-6 sm:p-8">
          <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
            <div>
              <h2 className="mb-4 text-2xl leading-tight text-graphite sm:text-4xl">{t.emotionTitle}</h2>
              <p className="font-modern text-base leading-8 text-silver-dark">{t.emotion}</p>
            </div>
            <div className="relative min-h-[220px] overflow-hidden rounded-[28px] border border-white/35 bg-gradient-to-br from-white/35 via-champagne/45 to-gold-400/30 p-5">
              <div className="absolute right-8 top-6 h-20 w-20 rounded-full bg-gold-400/35 blur-2xl" />
              <div className="relative grid gap-3">
                {t.profileTags.map((tag, index) => (
                  <div key={tag} className="flex items-center justify-between rounded-2xl bg-white/35 px-4 py-3 font-modern text-sm text-graphite backdrop-blur">
                    <span>{tag}</span>
                    <span className="text-gold-600">{profileScores[index]}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </GlassCard>
      </motion.section>

      <motion.section className="py-10 text-center sm:py-16" {...fadeUp}>
        <GlassCard variant="glass" className="p-8 sm:p-10">
          <h2 className="mx-auto mb-3 max-w-3xl text-3xl leading-tight text-graphite sm:text-5xl">{t.finalTitle}</h2>
          <p className="mx-auto mb-6 max-w-2xl font-modern text-base text-silver-dark">{t.finalSubtitle}</p>
          <GlassButton size="lg" onClick={goToStart} className="mx-auto group">
            {t.primaryCta}
            <ArrowRight size={20} className="transition-transform group-hover:translate-x-1" aria-hidden="true" />
          </GlassButton>
        </GlassCard>
      </motion.section>
    </div>
  );
};

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
  <GlassCard variant={highlighted ? 'highlighted' : 'interactive'} className="flex h-full flex-col p-6">
    <div className="mb-4 flex items-start justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className={cn('flex h-12 w-12 items-center justify-center rounded-2xl', highlighted ? 'bg-gold-400/30' : 'bg-white/25')}>
          <Icon size={24} className="text-graphite" aria-hidden />
        </div>
        <div>
          <h3 className="text-xl text-graphite">{title}</h3>
          {meta && <p className="font-modern text-xs text-silver-dark">{meta}</p>}
        </div>
      </div>
      <span className="rounded-full border border-gold-400/45 bg-gold-400/15 px-3 py-1 font-modern text-xs text-graphite">
        {badge}
      </span>
    </div>
    <p className="mb-4 font-modern text-sm leading-6 text-silver-dark">{description}</p>
    <ul className="mb-6 grid gap-2 font-modern text-sm text-graphite">
      {points.map((point) => (
        <li key={point} className="flex items-center gap-2">
          <CheckCircle2 size={16} className="shrink-0 text-gold-600" aria-hidden="true" />
          {point}
        </li>
      ))}
    </ul>
    <GlassButton variant={highlighted ? 'primary' : 'secondary'} onClick={onClick} className="mt-auto w-full">
      {cta}
    </GlassButton>
  </GlassCard>
);

export default MarketingEntryScreen;
