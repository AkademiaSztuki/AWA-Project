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
              <div className="relative w-full h-full overflow-hidden bg-white/5">
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

// Map style IDs to image filenames (using first available image for each style)
const STYLE_IMAGE_MAP: Record<string, string> = {
  'art-deco': 'living_room_art_deco_gold_brass_complex_dark_warm_low_desert_cold_metal_none_luxurious_13.jpg.jpeg',
  'bohemian': 'living_room_bohemian_pastel_mixed_complex_bright_warm_low_garden_soft_fabric_plants_playful_23.jpg.jpeg',
  'contemporary': 'living_room_contemporary_neutral_marble_simple_bright_cool_bright_mountain_glass_none_sophisticated_7.jpg.jpeg',
  'eclectic': 'living_room_eclectic_rainbow_mixed_complex_bright_warm_low_sunset_soft_fabric_plants_groovy_12.jpg.jpeg',
  'farmhouse': 'living_room_farmhouse_warm_cream_wood_simple_bright_warm_bright_garden_smooth_wood_plants_comfortable_14.jpg.jpeg',
  'gothic': 'living_room_gothic_black_metal_simple_dark_cool_bright_mountain_cold_metal_none_dramatic_19.jpg.jpeg',
  'industrial': 'living_room_industrial_charcoal_metal_simple_dark_neutral_light_ocean_cold_metal_none_edgy_4.jpg.jpeg',
  'japanese': 'living_room_japanese_beige_bamboo_simple_bright_neutral_light_forest_smooth_wood_plants_zen_9.jpg.jpeg',
  'maximalist': 'living_room_maximalist_jewel_tones_velvet_complex_bright_warm_bright_garden_soft_fabric_plants_playful_10.jpg.jpeg',
  'mediterranean': 'living_room_mediterranean_terracotta_clay_complex_bright_warm_bright_sunset_rough_stone_plants_warm_16.jpg.jpeg',
  'mid-century': 'living_room_mid_century_orange_wood_complex_bright_warm_bright_sunset_warm_leather_plants_nostalgic_18.jpg.jpeg',
  'minimalist': 'living_room_minimalist_cream_linen_simple_bright_neutral_light_forest_smooth_wood_plants_calm_5.jpg.jpeg',
  'modern': 'living_room_modern_black_white_simple_dark_neutral_light_ocean_glass_none_minimal_22.jpg.jpeg',
  'rustic': 'living_room_rustic_warm_brown_wood_complex_bright_warm_bright_sunset_smooth_wood_plants_homey_26.jpg.jpeg',
  'scandinavian': 'living_room_scandinavian_light_grey_wood_simple_bright_warm_bright_forest_smooth_wood_plants_hygge_21.jpg.jpeg',
  'traditional': 'living_room_traditional_burgundy_leather_complex_dark_warm_low_desert_warm_leather_none_elegant_8.jpg.jpeg',
  'vintage': 'living_room_vintage_brown_leather_complex_dark_warm_low_desert_warm_leather_none_nostalgic_20.jpg.jpeg',
  'zen': 'living_room_zen_white_stone_simple_bright_neutral_light_mountain_rough_stone_plants_serene_15.jpg.jpeg',
};

function getStyleImagePath(styleId: string): string | null {
  const filename = STYLE_IMAGE_MAP[styleId];
  return filename ? `/Tinder/Livingroom/${filename}` : null;
}

function StyleTest({ options, selectedId, onSelect, frameless = false, className = '', stepCounter }: StyleTestProps) {
  const { language, t } = useLanguage();
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());

  const ContentWrapper = frameless ? 'div' : GlassCard;
  const wrapperClass = frameless 
    ? `h-full flex flex-col justify-start ${className}`
    : `p-2.5 sm:p-5 md:p-6 h-full flex flex-col justify-start ${className}`;

  const handleImageError = (styleId: string) => {
    setImageErrors(prev => new Set(prev).add(styleId));
  };

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
          const imagePath = getStyleImagePath(style.id);
          const hasImageError = imageErrors.has(style.id);
          const hasImage = imagePath && !hasImageError;
          
          return (
            <button
              key={style.id}
              type="button"
              onClick={() => onSelect(style.id)}
              className={`rounded-2xl border overflow-hidden text-left flex flex-col transition-all relative min-h-[200px] sm:min-h-[180px] ${
                isSelected
                  ? 'border-gold shadow-inner shadow-gold/10'
                  : 'border-white/10 hover:border-gold/30'
              }`}
              style={{ 
                transform: 'translateZ(0)',
                backfaceVisibility: 'hidden',
                WebkitFontSmoothing: 'antialiased'
              }}
            >
              {/* Background Image */}
              {hasImage && (
                <div className="absolute inset-0 z-0 rounded-2xl overflow-hidden">
                  <Image
                    src={imagePath}
                    alt=""
                    fill
                    className="object-cover rounded-2xl"
                    onError={() => handleImageError(style.id)}
                    loading="lazy"
                    quality={85}
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  />
                </div>
              )}
              
              {/* Glass overlay */}
              <div className={`absolute inset-0 z-10 rounded-2xl ${
                hasImage 
                  ? (isSelected ? 'bg-gold/25' : 'bg-black/20')
                  : (isSelected ? 'bg-gold/10' : 'bg-white/5')
              }`} />
              
              {/* Style name and description at bottom */}
              <div className="absolute bottom-0 left-0 right-0 z-20 px-3 sm:px-4 py-2.5 sm:py-3 flex flex-col gap-0.5 sm:gap-1">
                <h4 className={`font-nasalization text-xs sm:text-sm leading-tight ${
                  hasImage ? 'text-white drop-shadow-lg' : 'text-graphite'
                }`}>
                  {language === 'pl' ? style.labelPl : style.labelEn}
                </h4>
                <p className={`text-[9px] sm:text-[10px] font-modern leading-tight line-clamp-2 ${
                  hasImage ? 'text-white/90 drop-shadow-md' : 'text-silver-dark'
                }`}>
                  {language === 'pl' ? (style.descriptionPl || style.description) : style.description}
                </p>
              </div>
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


