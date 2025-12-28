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
import { Volume2, Hand, Lightbulb, Play, Pause, Palette } from 'lucide-react';
import { NatureMetaphorTest } from '@/components/research/ProjectiveTechniques';
import { BiophiliaTest } from '@/components/research/BiophiliaTest';
import { STYLE_OPTIONS, type StyleOption } from '@/lib/questions/style-options';

interface SensoryTestProps {
  type: 'music' | 'texture' | 'light';
  onSelect: (selectedId: string) => void;
  className?: string;
  value?: string | null;
  frameless?: boolean;
  stepCounter?: string;
}

export function SensoryTest({ type, onSelect, className = '', value, frameless = false, stepCounter }: SensoryTestProps) {
  const { t, language } = useLanguage();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());
  
  // #region agent log
  useEffect(() => {
    const options = type === 'texture' ? TEXTURE_PREFERENCES : type === 'light' ? LIGHT_PREFERENCES : MUSIC_PREFERENCES;
    options.forEach(opt => {
      if (opt.imageUrl) {
        fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'SensoryTests.tsx:useEffect',message:'Rendering option with imageUrl',data:{type,optionId:opt.id,imageUrl:opt.imageUrl},timestamp:Date.now(),sessionId:'debug-session',runId:'image-load-check',hypothesisId:'H3'})}).catch(()=>{});
      }
    });
  }, [type]);
  // #endregion

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
      ? 'grid-cols-1 md:grid-cols-2'
      : type === 'texture' || type === 'music'
      ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3'
      : 'grid-cols-1 md:grid-cols-2';

  const selectedOption = selectedId ? options.find(o => o.id === selectedId) : null;

  const ContentWrapper = frameless ? 'div' : GlassCard;
  const wrapperClass = frameless 
    ? `h-full flex flex-col justify-start ${className}`
    : `p-2.5 sm:p-5 md:p-6 h-full flex flex-col justify-start ${className}`;

  return (
    <ContentWrapper className={wrapperClass}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-1 gap-1.5">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-gold to-champagne flex items-center justify-center flex-shrink-0 shadow-md">
            <Icon className="text-white" size={14} />
          </div>
          <div>
            <p className="text-[9px] sm:text-[10px] uppercase tracking-[0.3em] text-gold font-bold leading-none mb-0.5">
              {type === 'music' ? (language === 'pl' ? 'Muzyka' : 'Music') :
               type === 'texture' ? (language === 'pl' ? 'Tekstury' : 'Textures') :
               (language === 'pl' ? 'Światło' : 'Light')}
            </p>
            <p className="text-xs sm:text-sm font-modern text-graphite leading-tight">
              {prompts[type][language]}
            </p>
          </div>
        </div>
        {selectedOption && (
          <div className="flex flex-row sm:flex-col items-center sm:items-end gap-2 sm:gap-0 flex-shrink-0 bg-white/5 sm:bg-transparent p-1 sm:p-0 rounded-lg border border-white/10 sm:border-none">
            <span className="text-[9px] uppercase tracking-wider text-silver-dark opacity-70">
              {language === 'pl' ? 'Wybrano' : 'Selected'}
            </span>
            <span className="text-[10px] sm:text-xs font-bold text-gold leading-none">
              {t(selectedOption.label)}
            </span>
          </div>
        )}
      </div>

      <div className={`grid ${gridCols} gap-2.5 sm:gap-4`}>
        {options.map((option) => {
          const isSelected = selectedId === option.id;
          const isPlaying = playingAudio === option.id;

          return (
            <button
              key={option.id}
              type="button"
              onClick={() => handleSelect(option)}
              className={`rounded-2xl border overflow-hidden text-left flex flex-col transition-all relative z-0 ${
                isSelected
                  ? 'border-gold bg-gold/15 shadow-inner shadow-gold/10'
                  : 'border-white/10 hover:border-gold/30 hover:bg-white/5'
              }`}
              style={{ 
                transform: 'translateZ(0)',
                backfaceVisibility: 'hidden',
                WebkitFontSmoothing: 'antialiased'
              }}
            >
              {option.imageUrl && !imageErrors.has(option.imageUrl) ? (
                <div className={`relative w-full overflow-hidden bg-white/5 ${type === 'music' ? 'h-20 sm:h-40' : 'h-28 sm:h-48'}`}>
                  <Image
                    src={option.imageUrl}
                    alt={t(option.label)}
                    fill
                    sizes="(max-width: 768px) 50vw, 33vw"
                    className="object-cover"
                    style={{ objectPosition: type === 'texture' ? 'center center' : type === 'light' ? 'center 77%' : 'center 30%' }}
                    onLoad={() => {
                      // #region agent log
                      fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'SensoryTests.tsx:onLoad',message:'Image loaded successfully',data:{type,optionId:option.id,imageUrl:option.imageUrl},timestamp:Date.now(),sessionId:'debug-session',runId:'image-load-check',hypothesisId:'H1'})}).catch(()=>{});
                      // #endregion
                    }}
                    onError={() => {
                      // #region agent log
                      fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'SensoryTests.tsx:onError',message:'Image failed to load',data:{type,optionId:option.id,imageUrl:option.imageUrl},timestamp:Date.now(),sessionId:'debug-session',runId:'image-load-check',hypothesisId:'H2'})}).catch(()=>{});
                      // #endregion
                      setImageErrors(prev => new Set(prev).add(option.imageUrl!));
                    }}
                  />
                </div>
              ) : (
                <div className={`relative w-full overflow-hidden flex items-center justify-center bg-white/5 ${type === 'music' ? 'h-20 sm:h-40 bg-transparent' : 'h-28 sm:h-48'}`}>
                  <Icon size={32} className="text-silver-dark" />
                </div>
              )}

              <div className="px-3 sm:px-4 pt-2 sm:pt-3 pb-3 sm:pb-4 flex flex-col gap-1.5 sm:gap-2">
                <div className="flex items-start justify-between gap-2 sm:gap-3">
                  <h4 className="font-nasalization text-[11px] sm:text-sm text-graphite leading-tight">
                    {t(option.label)}
                  </h4>
                  {type === 'music' && option.audioUrl && (
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={(e) => handlePlayAudio(option, e)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          handlePlayAudio(option, e as any);
                        }
                      }}
                      className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex-shrink-0 flex items-center justify-center border transition-colors cursor-pointer ${
                        isPlaying
                          ? 'bg-gold text-white border-gold'
                          : 'border-white/20 text-graphite hover:border-gold/50'
                      }`}
                    >
                      {isPlaying ? <Pause size={12} /> : <Play size={12} />}
                    </div>
                  )}
                </div>
                <p className="text-[10px] sm:text-xs text-silver-dark font-modern leading-relaxed">
                  {t(option.description)}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-1 flex items-center justify-between gap-4">
        <p className="text-[9px] sm:text-xs text-silver-dark font-modern flex-1 italic opacity-80">
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
        {stepCounter && (
          <p className="text-[9px] sm:text-xs text-silver-dark font-modern whitespace-nowrap opacity-60">
            {stepCounter}
          </p>
        )}
      </div>
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
  stepCounter?: string;
}

interface StyleTestProps {
  options: StyleOption[];
  selectedId?: string;
  onSelect: (id: string) => void;
  frameless?: boolean;
  className?: string;
  stepCounter?: string;
}

function PaletteTest({ options, selectedId, onSelect, frameless = false, className = '', stepCounter }: PaletteTestProps) {
  const { language } = useLanguage();

  const ContentWrapper = frameless ? 'div' : GlassCard;
  const wrapperClass = frameless 
    ? `h-full flex flex-col justify-start ${className}`
    : `p-2.5 sm:p-5 md:p-6 h-full flex flex-col justify-start ${className}`;

  return (
    <ContentWrapper className={wrapperClass}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-1 gap-1.5">
        <div>
          <p className="text-[9px] sm:text-[10px] uppercase tracking-[0.3em] text-gold font-bold leading-none mb-0.5">
            {language === 'pl' ? 'Paleta' : 'Palette'}
          </p>
          <p className="text-xs sm:text-sm font-modern text-graphite leading-tight">
            {language === 'pl'
              ? 'Która paleta pomoże nam ustawić bazę kolorystyczną?'
              : 'Which palette should anchor the chromatic base?'}
          </p>
        </div>
        {selectedId && (
          <div className="flex flex-row sm:flex-col items-center sm:items-end gap-2 sm:gap-0 flex-shrink-0 bg-white/5 sm:bg-transparent p-1 sm:p-0 rounded-lg border border-white/10 sm:border-none">
            <span className="text-[9px] uppercase tracking-wider text-silver-dark opacity-70">
              {language === 'pl' ? 'Wybrano' : 'Selected'}
            </span>
            <span className="text-[10px] sm:text-xs font-bold text-gold leading-none">
              {options.find(p => p.id === selectedId)?.label[language]}
            </span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4">
        {options.map((palette) => {
          const isSelected = palette.id === selectedId;
          return (
            <button
              key={palette.id}
              type="button"
              onClick={() => onSelect(palette.id)}
              className={`rounded-2xl border overflow-hidden text-left flex flex-col transition-all min-h-[90px] sm:min-h-[165px] relative z-0 ${
                isSelected
                  ? 'border-gold bg-gold/15 shadow-inner shadow-gold/10'
                  : 'border-white/10 hover:border-gold/30 hover:bg-white/5'
              }`}
              style={{ 
                transform: 'translateZ(0)',
                backfaceVisibility: 'hidden',
                WebkitFontSmoothing: 'antialiased'
              }}
            >
              <div className="relative w-full h-9 sm:h-28 overflow-hidden bg-white/5 flex-shrink-0">
                <div className="flex gap-2 h-full w-full">
                  {palette.colors.map((color, index) => (
                    <div
                      key={index}
                      className="flex-1 h-full shadow-sm"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
              <div className="px-2 sm:px-4 pt-2 pb-3 flex-1 flex items-center justify-center">
                <p className="text-[10px] sm:text-sm font-nasalization text-graphite text-center leading-tight">
                  {palette.label[language]}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-1 flex items-center justify-between gap-4">
        <p className="text-[9px] sm:text-xs text-silver-dark font-modern flex-1 italic opacity-80">
          {language === 'pl'
            ? 'Paleta ustawia bazę pod wszystkie sensoryczne decyzje.'
            : 'The palette sets the base for every other sensory decision.'}
        </p>
        {stepCounter && (
          <p className="text-[9px] sm:text-xs text-silver-dark font-modern whitespace-nowrap opacity-60">
            {stepCounter}
          </p>
        )}
      </div>
    </ContentWrapper>
  );
}

function StyleTest({ options, selectedId, onSelect, frameless = false, className = '', stepCounter }: StyleTestProps) {
  const { language, t } = useLanguage();

  const ContentWrapper = frameless ? 'div' : GlassCard;
  const wrapperClass = frameless 
    ? `h-full flex flex-col justify-start ${className}`
    : `p-2.5 sm:p-5 md:p-6 h-full flex flex-col justify-start ${className}`;

  return (
    <ContentWrapper className={wrapperClass}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-1 gap-1.5">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-gold to-champagne flex items-center justify-center flex-shrink-0 shadow-md">
            <Palette className="text-white" size={14} />
          </div>
          <div>
            <p className="text-[9px] sm:text-[10px] uppercase tracking-[0.3em] text-gold font-bold leading-none mb-0.5">
              {language === 'pl' ? 'Styl' : 'Style'}
            </p>
            <p className="text-xs sm:text-sm font-modern text-graphite leading-tight">
              {language === 'pl'
                ? 'Który styl najlepiej opisuje Twoje preferencje?'
                : 'Which style best describes your preferences?'}
            </p>
          </div>
        </div>
        {selectedId && (
          <div className="flex flex-row sm:flex-col items-center sm:items-end gap-2 sm:gap-0 flex-shrink-0 bg-white/5 sm:bg-transparent p-1.5 sm:p-0 rounded-lg border border-white/10 sm:border-none">
            <span className="text-[9px] uppercase tracking-wider text-silver-dark opacity-70">
              {language === 'pl' ? 'Wybrano' : 'Selected'}
            </span>
            <span className="text-[10px] sm:text-xs font-bold text-gold leading-none">
              {(() => {
                const style = options.find(s => s.id === selectedId);
                return style ? (language === 'pl' ? style.labelPl : style.labelEn) : '';
              })()}
            </span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 sm:gap-4 overflow-y-auto">
        {options.map((style) => {
          const isSelected = style.id === selectedId;
          return (
            <button
              key={style.id}
              type="button"
              onClick={() => onSelect(style.id)}
              className={`rounded-2xl border px-3 sm:px-4 py-3 sm:py-4 text-left flex flex-col gap-2 sm:gap-3 transition-all ${
                isSelected
                  ? 'border-gold bg-gold/10 shadow-inner shadow-gold/10'
                  : 'border-white/10 hover:border-gold/30 hover:bg-white/5'
              }`}
              style={{ 
                transform: 'translateZ(0)',
                backfaceVisibility: 'hidden',
                WebkitFontSmoothing: 'antialiased'
              }}
            >
              <h4 className="font-nasalization text-[11px] sm:text-sm text-graphite leading-tight">
                {language === 'pl' ? style.labelPl : style.labelEn}
              </h4>
              <p className="text-[10px] sm:text-xs text-silver-dark font-modern leading-relaxed">
                {style.description}
              </p>
            </button>
          );
        })}
      </div>

      <div className="mt-1 flex items-center justify-between gap-4">
        <p className="text-[9px] sm:text-xs text-silver-dark font-modern flex-1 italic opacity-80">
          {language === 'pl'
            ? 'Styl ustawia bazę dla całej estetyki przestrzeni.'
            : 'Style sets the foundation for the entire space aesthetic.'}
        </p>
        {stepCounter && (
          <p className="text-[9px] sm:text-xs text-silver-dark font-modern whitespace-nowrap opacity-60">
            {stepCounter}
          </p>
        )}
      </div>
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
    style?: string;
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
  styleOptions?: StyleOption[];
  selectedStyle?: string;
  onStyleSelect?: (id: string) => void;
}

type SensorySuiteTest = 'palette' | 'style' | 'music' | 'texture' | 'light' | 'nature' | 'biophilia';
type InteractiveTest = 'music' | 'texture' | 'light';

export function SensoryTestSuite({
  onComplete,
  className = '',
  profileContext,
  paletteOptions,
  selectedPalette,
  onPaletteSelect,
  styleOptions,
  selectedStyle,
  onStyleSelect
}: SensoryTestSuiteProps) {
  const { language } = useLanguage();
  const hasPalette = Boolean(paletteOptions?.length && onPaletteSelect);
  const hasStyle = Boolean(styleOptions?.length && onStyleSelect);
  const tests = useMemo<SensorySuiteTest[]>(() => {
    const baseTests: SensorySuiteTest[] = [];
    if (hasPalette) baseTests.push('palette');
    if (hasStyle) baseTests.push('style');
    baseTests.push('music', 'texture', 'light', 'nature', 'biophilia');
    return baseTests;
  }, [hasPalette, hasStyle]);
  const [currentTest, setCurrentTest] = useState<SensorySuiteTest>(tests[0]);
  const [results, setResults] = useState<{
    music?: string;
    texture?: string;
    light?: string;
    natureMetaphor?: string;
    style?: string;
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
    // CRITICAL: Check style from nextResults first, then fallback to selectedStyle prop
    const styleReady = !hasStyle || Boolean(nextResults.style || selectedStyle);
    const sensoryReady = Boolean(nextResults.music && nextResults.texture && nextResults.light);
    const natureReady = Boolean(nextResults.natureMetaphor);
    const biophiliaReady = typeof (nextBiophilia ?? biophiliaScore) === 'number';
    return paletteReady && styleReady && sensoryReady && natureReady && biophiliaReady;
  };

  const triggerComplete = (finalResults: typeof results, finalBiophilia: number | undefined) => {
    if (
      finalBiophilia === undefined ||
      !finalResults.music ||
      !finalResults.texture ||
      !finalResults.light ||
      !finalResults.natureMetaphor
    ) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'SensoryTests.tsx:triggerComplete-incomplete',message:'Cannot complete - missing data',data:{hasBiophilia:finalBiophilia!==undefined,hasMusic:!!finalResults.music,hasTexture:!!finalResults.texture,hasLight:!!finalResults.light,hasNature:!!finalResults.natureMetaphor},timestamp:Date.now(),sessionId:'debug-session',runId:'explicit-check',hypothesisId:'E3'})}).catch(()=>{});
      // #endregion
      return;
    }
    const payload = {
      music: finalResults.music,
      texture: finalResults.texture,
      light: finalResults.light,
      natureMetaphor: finalResults.natureMetaphor,
      biophiliaScore: finalBiophilia,
      // CRITICAL: Use style from finalResults first, then fallback to selectedStyle prop
      ...(finalResults.style && { style: finalResults.style }),
      ...(!finalResults.style && selectedStyle && { style: selectedStyle }),
      // CRITICAL: Add palette to payload (same logic as style)
      ...(selectedPalette && { palette: selectedPalette })
    };
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'SensoryTests.tsx:triggerComplete',message:'SensoryTests complete - calling onComplete',data:{payload:payload,payloadKeys:Object.keys(payload),biophiliaScore:finalBiophilia,hasStyle:!!selectedStyle,selectedStyle:selectedStyle||null,payloadStyle:payload.style||null,hasPalette:!!selectedPalette,selectedPalette:selectedPalette||null,payloadPalette:payload.palette||null,finalResultsStyle:finalResults.style||null,finalResultsKeys:Object.keys(finalResults)},timestamp:Date.now(),sessionId:'debug-session',runId:'explicit-check',hypothesisId:'E4'})}).catch(()=>{});
    // #endregion
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

    if (testType === 'style') {
      onStyleSelect?.(value as string);
      // CRITICAL: Update results with selected style immediately
      const newResults = { ...results, style: value as string };
      setResults(newResults);
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'SensoryTests.tsx:handleSelect-style',message:'Style selected in SensoryTests',data:{selectedStyle:value,newResultsStyle:newResults.style,canComplete:canComplete(newResults,biophiliaScore),hasBiophilia:biophiliaScore!==undefined},timestamp:Date.now(),sessionId:'debug-session',runId:'explicit-check',hypothesisId:'E18'})}).catch(()=>{});
      // #endregion
      goToNext(testType);
      if (canComplete(newResults, biophiliaScore)) {
        triggerComplete(newResults, biophiliaScore);
      }
      return;
    }

    if (testType === 'biophilia') {
      const score = typeof value === 'number' ? value : Number(value);
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'SensoryTests.tsx:handleSelect-biophilia',message:'Biophilia score set in SensoryTests',data:{score:score,valueType:typeof value,canComplete:canComplete(results,score)},timestamp:Date.now(),sessionId:'debug-session',runId:'explicit-check',hypothesisId:'E2'})}).catch(()=>{});
      // #endregion
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
      case 'style':
        return language === 'pl' ? 'Styl' : 'Style';
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
    if (test === 'style') return Boolean(selectedStyle);
    if (test === 'nature') return Boolean(results.natureMetaphor);
    if (test === 'biophilia') return typeof biophiliaScore === 'number';
    return Boolean(results[test as InteractiveTest]);
  };

  return (
    <div className={`flex flex-col gap-1.5 sm:gap-2 h-full pb-1 w-full max-w-full overflow-x-hidden ${className}`}>
      {profileContext && (
        <div className="glass-panel rounded-2xl border border-white/10 bg-white/5 p-3 text-[10px] text-silver-dark flex flex-wrap gap-3 w-full mb-1">
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

      <div className="flex gap-1 overflow-x-auto py-1 scrollbar-hide -mx-1 px-1 flex-shrink-0">
        {tests.map((test) => (
          <button
            key={test}
            onClick={() => setCurrentTest(test)}
            className={`whitespace-nowrap px-2.5 py-1.5 rounded-lg text-[10px] sm:text-xs font-nasalization font-bold transition-all flex-shrink-0 sm:flex-1 border flex items-center justify-center ${
              currentTest === test
                ? 'bg-white/25 border-white/40 text-white shadow-sm'
                : isTestComplete(test)
                ? 'bg-gold/20 border-gold/30 text-gold'
                : 'bg-white/5 border-white/10 text-white/40 hover:text-white/60'
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
            stepCounter={language === 'pl'
              ? `Krok ${currentIndex + 1} z ${tests.length}`
              : `Step ${currentIndex + 1} of ${tests.length}`}
          />
        ) : currentTest === 'style' && hasStyle && styleOptions ? (
          <StyleTest
            options={styleOptions}
            selectedId={selectedStyle}
            onSelect={(value) => handleSelect('style', value)}
            frameless
            className="h-full overflow-y-auto flex flex-col justify-center"
            stepCounter={language === 'pl'
              ? `Krok ${currentIndex + 1} z ${tests.length}`
              : `Step ${currentIndex + 1} of ${tests.length}`}
          />
        ) : currentTest === 'nature' ? (
          <NatureMetaphorTest
            frameless
            className="h-full overflow-y-auto flex flex-col justify-center"
            onSelect={(value) => handleSelect('nature', value)}
            stepCounter={language === 'pl'
              ? `Krok ${currentIndex + 1} z ${tests.length}`
              : `Step ${currentIndex + 1} of ${tests.length}`}
          />
        ) : currentTest === 'biophilia' ? (
          <BiophiliaTest
            frameless
            className="h-full overflow-y-auto flex flex-col justify-center"
            onSelect={(score) => handleSelect('biophilia', score)}
            stepCounter={language === 'pl'
              ? `Krok ${currentIndex + 1} z ${tests.length}`
              : `Step ${currentIndex + 1} of ${tests.length}`}
          />
        ) : (
          <SensoryTest
            type={currentTest as InteractiveTest}
            onSelect={(value) => handleSelect(currentTest, value)}
            className="h-full overflow-y-auto flex flex-col justify-center"
            value={results[currentTest as InteractiveTest] || null}
            frameless
            stepCounter={language === 'pl'
              ? `Krok ${currentIndex + 1} z ${tests.length}`
              : `Step ${currentIndex + 1} of ${tests.length}`}
          />
        )}
      </div>
    </div>
  );
}


