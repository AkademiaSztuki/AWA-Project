"use client";

import React, { useState, useEffect, useMemo } from 'react';
import {
  MUSIC_PREFERENCES,
  TEXTURE_PREFERENCES,
  LIGHT_PREFERENCES,
  SensoryOption
} from '@/lib/questions/validated-scales';
import { useLanguage } from '@/contexts/LanguageContext';
import { GlassCard } from '@/components/ui/GlassCard';
import Image from 'next/image';
import { Volume2, Hand, Lightbulb, Play, Pause } from 'lucide-react';
import { NatureMetaphorTest } from '@/components/research/ProjectiveTechniques';
import { BiophiliaTest } from '@/components/research/BiophiliaTest';

interface SensoryTestProps {
  type: 'music' | 'texture' | 'light';
  onSelect: (selectedId: string) => void;
  className?: string;
  value?: string | null;
  frameless?: boolean;
}

export function SensoryTest({ type, onSelect, className = '', value, frameless = false }: SensoryTestProps) {
  const { t, language } = useLanguage();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);

  const options = type === 'music' ? MUSIC_PREFERENCES :
                  type === 'texture' ? TEXTURE_PREFERENCES :
                  LIGHT_PREFERENCES;

  const icons = {
    music: Volume2,
    texture: Hand,
    light: Lightbulb
  };

  const prompts = {
    music: {
      pl: 'Jak brzmi przestrzeń, którą tworzymy?',
      en: 'What does your new space sound like?'
    },
    texture: {
      pl: 'Jaką fakturę chcesz czuć pod palcami?',
      en: 'Which texture should your hands meet?'
    },
    light: {
      pl: 'Jakie światło ma Ci towarzyszyć?',
      en: 'What kind of light should accompany you?'
    }
  };

  const Icon = icons[type];

  useEffect(() => {
    setSelectedId(value || null);
    setPlayingAudio(null);
    audioElement?.pause();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, value]);

  const handleSelect = (option: SensoryOption) => {
    setSelectedId(option.id);
    onSelect(option.id);

    if (audioElement) {
      audioElement.pause();
      setPlayingAudio(null);
    }
  };

  const handlePlayAudio = (option: SensoryOption, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!option.audioUrl) return;

    if (playingAudio === option.id) {
      audioElement?.pause();
      setPlayingAudio(null);
    } else {
      audioElement?.pause();
      const audio = new Audio(option.audioUrl);
      audio.volume = 0.5;
      setAudioElement(audio);
      audio.play().catch(err => console.error('Audio play failed:', err));
      audio.onended = () => setPlayingAudio(null);
      setPlayingAudio(option.id);
    }
  };

  const gridCols =
    type === 'light'
      ? 'grid-cols-2'
      : 'grid-cols-2 md:grid-cols-3';

  const selectedOption = selectedId ? options.find(o => o.id === selectedId) : null;

  const ContentWrapper = frameless ? 'div' : GlassCard;
  const wrapperClass = frameless 
    ? `h-full flex flex-col justify-center ${className}`
    : `p-5 md:p-6 h-full flex flex-col justify-center ${className}`;

  return (
    <ContentWrapper className={wrapperClass}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gold to-champagne flex items-center justify-center">
            <Icon className="text-white" size={20} />
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-silver-dark">
              {type === 'music' ? (language === 'pl' ? 'Muzyka' : 'Music') :
               type === 'texture' ? (language === 'pl' ? 'Tekstury' : 'Textures') :
               (language === 'pl' ? 'Światło' : 'Light')}
            </p>
            <p className="text-sm font-modern text-graphite">
              {prompts[type][language]}
            </p>
          </div>
        </div>
        {selectedOption && (
          <p className="text-xs text-right text-silver-dark">
            {language === 'pl' ? 'Wybrano:' : 'Selected:'}{' '}
            <span className="font-semibold text-graphite">
              {t(selectedOption.label)}
            </span>
          </p>
        )}
      </div>

      <div className={`grid ${gridCols} gap-4 flex-1 content-center`}>
        {options.map((option) => {
          const isSelected = selectedId === option.id;
          const isPlaying = playingAudio === option.id;

          return (
            <button
              key={option.id}
              type="button"
              onClick={() => handleSelect(option)}
              className={`rounded-2xl border px-4 py-4 text-left flex flex-col gap-3 transition-all ${
                isSelected
                  ? 'border-gold bg-gold/10 shadow-inner shadow-gold/10'
                  : 'border-white/10 hover:border-gold/30 hover:bg-white/5'
              }`}
            >
              {option.imageUrl ? (
                <div className="relative w-full h-28 overflow-hidden rounded-xl bg-gray-200">
                  <Image
                    src={option.imageUrl}
                    alt={t(option.label)}
                    fill
                    className="object-cover"
                  />
                </div>
              ) : (
                <div className="w-full h-28 rounded-xl bg-gradient-to-br from-platinum-200 to-pearl-100 flex items-center justify-center">
                  <Icon size={32} className="text-silver-dark" />
                </div>
              )}

              <div className="flex items-start justify-between gap-3">
                <h4 className="font-nasalization text-sm text-graphite">
                  {t(option.label)}
                </h4>
                {type === 'music' && option.audioUrl && (
                  <button
                    type="button"
                    onClick={(e) => handlePlayAudio(option, e)}
                    className={`w-8 h-8 rounded-full flex items-center justify-center border transition-colors ${
                      isPlaying
                        ? 'bg-gold text-white border-gold'
                        : 'border-white/20 text-graphite hover:border-gold/50'
                    }`}
                  >
                    {isPlaying ? <Pause size={14} /> : <Play size={14} />}
                  </button>
                )}
              </div>
              <p className="text-xs text-silver-dark font-modern leading-relaxed">
                {t(option.description)}
              </p>
            </button>
          );
        })}
      </div>

      <p className="mt-4 text-xs text-center text-silver-dark font-modern">
        {type === 'music' && (language === 'pl'
          ? 'Muzyka ustawia tempo Twoich rytuałów.'
          : 'Music sets the tempo of your rituals.')}
        {type === 'texture' && (language === 'pl'
          ? 'Tekstura wpływa na codzienny kontakt z przestrzenią.'
          : 'Texture defines daily touchpoints in the space.')}
        {type === 'light' && (language === 'pl'
          ? 'Światło reguluje energię i skupienie przez cały dzień.'
          : 'Light shapes your energy and focus throughout the day.')}
      </p>
    </ContentWrapper>
  );
}

interface PaletteTestProps {
  options: Array<{
    id: string;
    colors: string[];
    label: { pl: string; en: string };
  }>;
  selectedId?: string;
  onSelect: (id: string) => void;
  frameless?: boolean;
  className?: string;
}

function PaletteTest({ options, selectedId, onSelect, frameless = false, className = '' }: PaletteTestProps) {
  const { language } = useLanguage();

  const ContentWrapper = frameless ? 'div' : GlassCard;
  const wrapperClass = frameless 
    ? `h-full flex flex-col justify-center ${className}`
    : `p-5 md:p-6 h-full flex flex-col justify-center ${className}`;

  return (
    <ContentWrapper className={wrapperClass}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-silver-dark">
            {language === 'pl' ? 'Paleta' : 'Palette'}
          </p>
          <p className="text-sm font-modern text-graphite">
            {language === 'pl'
              ? 'Która paleta pomoże nam ustawić bazę kolorystyczną?'
              : 'Which palette should anchor the chromatic base?'}
          </p>
        </div>
        {selectedId && (
          <p className="text-xs text-right text-silver-dark">
            {language === 'pl' ? 'Wybrano:' : 'Selected:'}{' '}
            <span className="font-semibold text-graphite">
              {options.find(p => p.id === selectedId)?.label[language]}
            </span>
          </p>
        )}
      </div>

      <div className="grid grid-cols-3 gap-4 flex-1 content-center">
        {options.map((palette) => {
          const isSelected = palette.id === selectedId;
          return (
            <button
              key={palette.id}
              type="button"
              onClick={() => onSelect(palette.id)}
              className={`rounded-2xl border p-4 flex flex-col gap-3 text-left transition-all h-full ${
                isSelected
                  ? 'border-gold bg-gold/10 shadow-inner shadow-gold/15'
                  : 'border-white/10 hover:border-gold/30 hover:bg-white/5'
              }`}
            >
              <div className="flex gap-2 h-20 w-full">
                {palette.colors.map((color, index) => (
                  <div
                    key={index}
                    className="flex-1 rounded-lg h-full shadow-sm"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
              <p className="text-sm font-nasalization text-graphite text-center">
                {palette.label[language]}
              </p>
            </button>
          );
        })}
      </div>

      <p className="mt-4 text-xs text-center text-silver-dark font-modern">
        {language === 'pl'
          ? 'Paleta ustawia bazę pod wszystkie sensoryczne decyzje.'
          : 'The palette sets the base for every other sensory decision.'}
      </p>
    </ContentWrapper>
  );
}

interface SensoryTestSuiteProps {
  onComplete: (results: {
    music: string;
    texture: string;
    light: string;
    natureMetaphor: string;
    biophiliaScore: number;
  }) => void;
  className?: string;
  profileContext?: {
    paletteLabel?: string;
    livingSituation?: string;
    goals?: string[];
  };
  paletteOptions?: PaletteTestProps['options'];
  selectedPalette?: string;
  onPaletteSelect?: (id: string) => void;
}

type SensorySuiteTest = 'palette' | 'music' | 'texture' | 'light' | 'nature' | 'biophilia';
type InteractiveTest = 'music' | 'texture' | 'light';

export function SensoryTestSuite({
  onComplete,
  className = '',
  profileContext,
  paletteOptions,
  selectedPalette,
  onPaletteSelect
}: SensoryTestSuiteProps) {
  const { language } = useLanguage();
  const hasPalette = Boolean(paletteOptions?.length && onPaletteSelect);
  const tests = useMemo<SensorySuiteTest[]>(
    () => (hasPalette ? ['palette', 'music', 'texture', 'light', 'nature', 'biophilia'] : ['music', 'texture', 'light', 'nature', 'biophilia']),
    [hasPalette]
  );
  const [currentTest, setCurrentTest] = useState<SensorySuiteTest>(tests[0]);
  const [results, setResults] = useState<{
    music?: string;
    texture?: string;
    light?: string;
    natureMetaphor?: string;
  }>({});
  const [biophiliaScore, setBiophiliaScore] = useState<number | undefined>(undefined);

  useEffect(() => {
    if (!tests.includes(currentTest)) {
      setCurrentTest(tests[0]);
    }
  }, [tests, currentTest]);

  const goToNext = (testType: SensorySuiteTest) => {
    const next = tests[tests.indexOf(testType) + 1];
    if (next) {
      setTimeout(() => setCurrentTest(next), 300);
    }
  };

  const canComplete = (nextResults: typeof results, nextBiophilia?: number) => {
    const paletteReady = !hasPalette || Boolean(selectedPalette);
    const sensoryReady = Boolean(nextResults.music && nextResults.texture && nextResults.light);
    const natureReady = Boolean(nextResults.natureMetaphor);
    const biophiliaReady = typeof (nextBiophilia ?? biophiliaScore) === 'number';
    return paletteReady && sensoryReady && natureReady && biophiliaReady;
  };

  const triggerComplete = (finalResults: typeof results, finalBiophilia: number | undefined) => {
    if (
      finalBiophilia === undefined ||
      !finalResults.music ||
      !finalResults.texture ||
      !finalResults.light ||
      !finalResults.natureMetaphor
    ) {
      return;
    }
    const payload = {
      music: finalResults.music,
      texture: finalResults.texture,
      light: finalResults.light,
      natureMetaphor: finalResults.natureMetaphor,
      biophiliaScore: finalBiophilia
    };
    setTimeout(() => onComplete(payload), 300);
  };

  const handleSelect = (testType: SensorySuiteTest, value: string | number) => {
    if (testType === 'palette') {
      onPaletteSelect?.(value as string);
      goToNext(testType);
      if (canComplete(results)) {
        triggerComplete(results, biophiliaScore);
      }
      return;
    }

    if (testType === 'biophilia') {
      const score = typeof value === 'number' ? value : Number(value);
      setBiophiliaScore(score);
      if (canComplete(results, score)) {
        triggerComplete(results, score);
      }
      return;
    }

    if (testType === 'nature') {
      const nextResults = { ...results, natureMetaphor: value as string };
      setResults(nextResults);
      if (tests.indexOf(testType) !== tests.length - 1) {
        goToNext(testType);
      }
      if (canComplete(nextResults)) {
        triggerComplete(nextResults, biophiliaScore);
      }
      return;
    }

    const newResults = { ...results, [testType]: value as string };
    setResults(newResults);
    if (tests.indexOf(testType) + 1 < tests.length) {
      goToNext(testType);
    }
    if (canComplete(newResults)) {
      triggerComplete(newResults, biophiliaScore);
    }
  };

  const currentIndex = tests.indexOf(currentTest);

  const getTestLabel = (test: SensorySuiteTest) => {
    switch (test) {
      case 'music':
        return language === 'pl' ? 'Muzyka' : 'Music';
      case 'texture':
        return language === 'pl' ? 'Tekstury' : 'Textures';
      case 'light':
        return language === 'pl' ? 'Światło' : 'Light';
      case 'palette':
        return language === 'pl' ? 'Paleta' : 'Palette';
      case 'nature':
        return language === 'pl' ? 'Metafora' : 'Metaphor';
      case 'biophilia':
        return 'Biophilia';
      default:
        return '';
    }
  };

  const isTestComplete = (test: SensorySuiteTest) => {
    if (test === 'palette') return Boolean(selectedPalette);
    if (test === 'nature') return Boolean(results.natureMetaphor);
    if (test === 'biophilia') return typeof biophiliaScore === 'number';
    return Boolean(results[test as InteractiveTest]);
  };

  return (
    <div className={`flex flex-col gap-4 h-full ${className}`}>
      {profileContext && (
        <div className="glass-panel rounded-2xl border border-white/10 bg-white/5 p-4 text-xs text-silver-dark flex flex-wrap gap-4">
          {profileContext.paletteLabel && (
            <div>
              <p className="uppercase tracking-[0.2em] mb-1">{language === 'pl' ? 'Paleta' : 'Palette'}</p>
              <p className="text-sm font-nasalization text-graphite">{profileContext.paletteLabel}</p>
            </div>
          )}
          {profileContext.livingSituation && (
            <div>
              <p className="uppercase tracking-[0.2em] mb-1">{language === 'pl' ? 'Tryb życia' : 'Lifestyle'}</p>
              <p className="text-sm font-nasalization text-graphite">{profileContext.livingSituation}</p>
            </div>
          )}
          {profileContext.goals && profileContext.goals.length > 0 && (
            <div>
              <p className="uppercase tracking-[0.2em] mb-1">{language === 'pl' ? 'Priorytety' : 'Priorities'}</p>
              <p className="text-sm font-modern text-graphite">{profileContext.goals.join(' · ')}</p>
            </div>
          )}
        </div>
      )}

      <div className="flex gap-2">
        {tests.map((test) => (
          <button
            key={test}
            onClick={() => setCurrentTest(test)}
            className={`flex-1 px-4 py-2 rounded-xl text-xs font-semibold transition-colors ${
              currentTest === test
                ? 'bg-gold/30 border border-gold/50 text-graphite'
                : isTestComplete(test)
                ? 'bg-white/10 border border-gold/30 text-gold'
                : 'bg-white/5 border border-white/10 text-silver-dark'
            }`}
          >
            {getTestLabel(test)}
          </button>
        ))}
      </div>

      <div className="flex-1">
        {currentTest === 'palette' && hasPalette && paletteOptions ? (
          <PaletteTest
            options={paletteOptions}
            selectedId={selectedPalette}
            onSelect={(value) => handleSelect('palette', value)}
            frameless
            className="h-full overflow-y-auto flex flex-col justify-center"
          />
        ) : currentTest === 'nature' ? (
          <NatureMetaphorTest
            frameless
            className="h-full overflow-y-auto flex flex-col justify-center"
            onSelect={(value) => handleSelect('nature', value)}
          />
        ) : currentTest === 'biophilia' ? (
          <BiophiliaTest
            frameless
            className="h-full overflow-y-auto flex flex-col justify-center"
            onSelect={(score) => handleSelect('biophilia', score)}
          />
        ) : (
          <SensoryTest
            type={currentTest as InteractiveTest}
            onSelect={(value) => handleSelect(currentTest, value)}
            className="h-full overflow-y-auto flex flex-col justify-center"
            value={results[currentTest as InteractiveTest] || null}
            frameless
          />
        )}
      </div>

      <p className="text-center text-xs text-silver-dark font-modern">
        {language === 'pl'
          ? `Krok ${currentIndex + 1} z ${tests.length}`
          : `Step ${currentIndex + 1} of ${tests.length}`}
      </p>
    </div>
  );
}


