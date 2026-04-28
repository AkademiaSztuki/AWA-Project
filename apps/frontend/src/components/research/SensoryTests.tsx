"use client";

import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
  useImperativeHandle,
  forwardRef,
} from 'react';
import {
  MUSIC_PREFERENCES,
  TEXTURE_PREFERENCES,
  LIGHT_PREFERENCES,
  SensoryOption
} from '@/lib/questions/validated-scales';
import { useLanguage } from '@/contexts/LanguageContext';
import { GlassCard } from '@/components/ui/GlassCard';
import Image from 'next/image';
import { Volume2, Hand, Lightbulb, Play, Pause, Palette, Check, SwatchBook } from 'lucide-react';
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
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());
  

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
    setHoveredId(null);
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

  const previewId = hoveredId ?? selectedId ?? null;
  const previewOption = previewId ? options.find((o) => o.id === previewId) : undefined;
  const previewName = previewOption ? t(previewOption.label) : undefined;
  const isHoverPreview = Boolean(hoveredId && hoveredId !== selectedId);
  const badgeUpper =
    previewName == null
      ? null
      : isHoverPreview
        ? language === 'pl'
          ? 'Podgląd'
          : 'Preview'
        : selectedId
          ? language === 'pl'
            ? 'Wybrano'
            : 'Selected'
          : language === 'pl'
            ? 'Podgląd'
            : 'Preview';

  const ContentWrapper = frameless ? 'div' : GlassCard;
  const wrapperClass = frameless 
    ? `h-full flex flex-col justify-start ${className}`
    : `p-2.5 sm:p-5 md:p-6 h-full flex flex-col justify-start ${className}`;

  return (
    <ContentWrapper className={`${wrapperClass} keep-colors`}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-1 gap-1.5">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-gold to-champagne flex items-center justify-center flex-shrink-0 shadow-md">
            <Icon className="text-white" size={14} aria-hidden="true" />
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
        <div className="flex max-w-[11rem] flex-shrink-0 flex-col items-end justify-center gap-0 rounded-lg border border-white/10 bg-white/5 px-2 py-1 sm:max-w-[12rem] sm:bg-white/[0.06] sm:px-2 sm:py-1.5">
          <span
            className={`flex h-3 w-full items-center justify-end text-right text-[8px] uppercase leading-none tracking-wider transition-colors duration-200 sm:text-[9px] ${
              previewName
                ? isHoverPreview
                  ? 'text-gold/90'
                  : 'text-silver-dark opacity-80'
                : 'text-transparent'
            }`}
            aria-hidden={!previewName}
          >
            {previewName ? badgeUpper : '\u00a0'}
          </span>
          <span
            className={`flex min-h-[2rem] w-full items-end justify-end text-right text-[8px] leading-tight sm:text-[9px] line-clamp-2 hyphens-auto break-words ${
              previewName ? 'font-bold text-gold' : 'font-modern text-silver-dark opacity-75'
            }`}
          >
            {previewName ??
              (language === 'pl'
                ? 'Najedź na opcję, by zobaczyć nazwę.'
                : 'Hover an option to preview its name.')}
          </span>
        </div>
      </div>

      <div
        className={`grid ${gridCols} gap-2.5 sm:gap-4`}
        onMouseLeave={() => setHoveredId(null)}
      >
        {options.map((option) => {
          const isSelected = selectedId === option.id;
          const isHovered = hoveredId === option.id;
          const isPlaying = playingAudio === option.id;

          return (
            <button
              key={option.id}
              type="button"
              onClick={() => handleSelect(option)}
              onMouseEnter={() => setHoveredId(option.id)}
              className={`relative z-0 flex flex-col overflow-hidden rounded-2xl border text-left transition-all ${
                isSelected
                  ? 'border-gold bg-gold/15 shadow-inner shadow-gold/10'
                  : isHovered
                    ? 'border-gold/50 shadow-md shadow-gold/15'
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
                    }}
                    onError={() => {
                      setImageErrors(prev => new Set(prev).add(option.imageUrl!));
                    }}
                  />
                </div>
              ) : (
                <div className={`relative w-full overflow-hidden flex items-center justify-center bg-white/5 ${type === 'music' ? 'h-20 sm:h-40 bg-transparent' : 'h-28 sm:h-48'}`}>
                  <Icon size={32} className="text-silver-dark" aria-hidden="true" />
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
                      {isPlaying ? <Pause size={12} aria-hidden="true" /> : <Play size={12} aria-hidden="true" />}
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
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const previewId = hoveredId ?? selectedId ?? null;
  const previewPalette = previewId ? options.find((p) => p.id === previewId) : undefined;
  const previewName = previewPalette?.label[language];
  const isHoverPreview = Boolean(hoveredId && hoveredId !== selectedId);
  const badgeUpper =
    previewName == null
      ? null
      : isHoverPreview
        ? language === 'pl'
          ? 'Podgląd'
          : 'Preview'
        : selectedId
          ? language === 'pl'
            ? 'Wybrano'
            : 'Selected'
          : language === 'pl'
            ? 'Podgląd'
            : 'Preview';

  const ContentWrapper = frameless ? 'div' : GlassCard;
  const wrapperClass = frameless 
    ? `h-full flex flex-col justify-start ${className}`
    : `p-2.5 sm:p-5 md:p-6 h-full flex flex-col justify-start ${className}`;

  return (
    <ContentWrapper className={`${wrapperClass} keep-colors`}>
      <div className="mb-1 flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-gold to-champagne shadow-md">
            <SwatchBook className="text-white" size={14} strokeWidth={2} aria-hidden />
          </div>
          <div>
            <p className="mb-0.5 text-[9px] font-bold uppercase leading-none tracking-[0.3em] text-gold sm:text-[10px]">
              {language === 'pl' ? 'Paleta' : 'Palette'}
            </p>
            <p className="text-xs font-modern leading-tight text-graphite sm:text-sm">
              {language === 'pl'
                ? 'Która paleta najbardziej pasuje do nastroju, w jakim chcesz mieszkać?'
                : 'Which palette best matches the mood you want to live in?'}
            </p>
          </div>
        </div>
        <div className="flex max-w-[11rem] flex-shrink-0 flex-col items-end justify-center gap-0 rounded-lg border border-white/10 bg-white/5 px-2 py-1 sm:max-w-[12rem] sm:bg-white/[0.06] sm:px-2 sm:py-1.5 sm:transition-colors sm:duration-200">
          <span
            className={`flex h-3 w-full items-center justify-end text-right text-[8px] uppercase leading-none tracking-wider transition-colors duration-200 sm:text-[9px] ${
              previewName
                ? isHoverPreview
                  ? 'text-gold/90'
                  : 'text-silver-dark opacity-80'
                : 'text-transparent'
            }`}
            aria-hidden={!previewName}
          >
            {previewName ? badgeUpper : '\u00a0'}
          </span>
          <span
            className={`flex min-h-[2rem] w-full items-end justify-end text-right text-[8px] leading-tight transition-opacity duration-200 line-clamp-2 hyphens-auto break-words sm:text-[9px] ${
              previewName ? 'font-bold text-gold sm:text-[10px]' : 'font-modern text-silver-dark opacity-75'
            }`}
          >
            {previewName ??
              (language === 'pl'
                ? 'Najedź na kafelek, by zobaczyć nazwę palety.'
                : 'Hover a tile to preview the palette name.')}
          </span>
        </div>
      </div>

      <div
        className="grid w-full grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-4 md:grid-cols-3"
        onMouseLeave={() => setHoveredId(null)}
      >
        {options.map((palette) => {
          const isSelected = palette.id === selectedId;
          const isHovered = palette.id === hoveredId;
          const name = palette.label[language];
          return (
            <button
              key={palette.id}
              type="button"
              onClick={() => onSelect(palette.id)}
              onMouseEnter={() => setHoveredId(palette.id)}
              className={`relative flex min-h-[200px] flex-col overflow-hidden rounded-2xl border text-left transition-all sm:min-h-[180px] ${
                isSelected
                  ? 'border-gold shadow-inner shadow-gold/10'
                  : isHovered
                    ? 'border-gold/50 shadow-md shadow-gold/15'
                    : 'border-white/10 hover:border-gold/30'
              } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/50`}
              style={{
                transform: 'translateZ(0)',
                backfaceVisibility: 'hidden',
                WebkitFontSmoothing: 'antialiased'
              }}
            >
              <div className="absolute inset-0 z-0 flex flex-row">
                {palette.colors.map((color, index) => (
                  <div
                    key={index}
                    className="flex-1 shadow-sm transition-[filter] duration-200"
                    style={{
                      backgroundColor: color,
                      filter: isHovered || isSelected ? 'brightness(1.05) saturate(1.06)' : undefined
                    }}
                  />
                ))}
              </div>

              <div
                className={`absolute inset-0 z-10 rounded-2xl ${
                  isSelected ? 'bg-gold/20' : isHovered ? 'bg-black/15' : 'bg-black/10'
                }`}
              />

              <div className="absolute bottom-0 left-0 right-0 z-20 flex flex-col gap-0.5 bg-gradient-to-t from-black/75 via-black/35 to-transparent px-3 py-2.5 sm:gap-1 sm:px-4 sm:py-3">
                <h4 className="font-nasalization text-xs leading-tight text-white drop-shadow-lg sm:text-sm">
                  {name}
                </h4>
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-1 flex items-center justify-between gap-4">
        <p className="flex-1 text-[9px] font-modern italic text-silver-dark opacity-80 sm:text-xs">
          {language === 'pl'
            ? 'Paleta ustawia kolorystyczną bazę wnętrza.'
            : 'The palette anchors the color story of your space.'}
        </p>
        {stepCounter ? (
          <p className="whitespace-nowrap text-[9px] font-modern text-silver-dark opacity-60 sm:text-xs">
            {stepCounter}
          </p>
        ) : null}
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
  const { language } = useLanguage();
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const previewId = hoveredId ?? selectedId ?? null;
  const previewStyle = previewId ? options.find((s) => s.id === previewId) : undefined;
  const previewName = previewStyle
    ? language === 'pl'
      ? previewStyle.labelPl
      : previewStyle.labelEn
    : undefined;
  const isHoverPreview = Boolean(hoveredId && hoveredId !== selectedId);
  const badgeUpper =
    previewName == null
      ? null
      : isHoverPreview
        ? language === 'pl'
          ? 'Podgląd'
          : 'Preview'
        : selectedId
          ? language === 'pl'
            ? 'Wybrano'
            : 'Selected'
          : language === 'pl'
            ? 'Podgląd'
            : 'Preview';

  const ContentWrapper = frameless ? 'div' : GlassCard;
  const wrapperClass = frameless 
    ? `h-full flex flex-col justify-start ${className}`
    : `p-2.5 sm:p-5 md:p-6 h-full flex flex-col justify-start ${className}`;

  const handleImageError = (styleId: string) => {
    setImageErrors(prev => new Set(prev).add(styleId));
  };

  return (
    <ContentWrapper className={`${wrapperClass} keep-colors`}>
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
        <div className="flex max-w-[11rem] flex-shrink-0 flex-col items-end justify-center gap-0 rounded-lg border border-white/10 bg-white/5 px-2 py-1 sm:max-w-[12rem] sm:bg-white/[0.06] sm:px-2 sm:py-1.5">
          <span
            className={`flex h-3 w-full items-center justify-end text-right text-[8px] uppercase leading-none tracking-wider transition-colors duration-200 sm:text-[9px] ${
              previewName
                ? isHoverPreview
                  ? 'text-gold/90'
                  : 'text-silver-dark opacity-80'
                : 'text-transparent'
            }`}
            aria-hidden={!previewName}
          >
            {previewName ? badgeUpper : '\u00a0'}
          </span>
          <span
            className={`flex min-h-[2rem] w-full items-end justify-end text-right text-[8px] leading-tight line-clamp-2 hyphens-auto break-words sm:text-[9px] ${
              previewName ? 'font-bold text-gold sm:text-[10px]' : 'font-modern text-silver-dark opacity-75'
            }`}
          >
            {previewName ??
              (language === 'pl'
                ? 'Najedź na styl, by zobaczyć nazwę.'
                : 'Hover a style tile to preview its name.')}
          </span>
        </div>
      </div>

      <div
        className="grid grid-cols-1 gap-2 overflow-y-auto awa-scrollbar sm:grid-cols-2 sm:gap-4 md:grid-cols-3"
        onMouseLeave={() => setHoveredId(null)}
      >
        {options.map((style) => {
          const isSelected = style.id === selectedId;
          const isHovered = style.id === hoveredId;
          const imagePath = getStyleImagePath(style.id);
          const hasImageError = imageErrors.has(style.id);
          const hasImage = imagePath && !hasImageError;
          
          return (
            <button
              key={style.id}
              type="button"
              onClick={() => onSelect(style.id)}
              onMouseEnter={() => setHoveredId(style.id)}
              className={`relative flex min-h-[200px] flex-col overflow-hidden rounded-2xl border text-left transition-all sm:min-h-[180px] ${
                isSelected
                  ? 'border-gold shadow-inner shadow-gold/10'
                  : isHovered
                    ? 'border-gold/50 shadow-md shadow-gold/15'
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
              <div
                className={`absolute inset-0 z-10 rounded-2xl ${
                  hasImage
                    ? isSelected
                      ? 'bg-gold/25'
                      : isHovered
                        ? 'bg-black/28'
                        : 'bg-black/20'
                    : isSelected
                      ? 'bg-gold/10'
                      : isHovered
                        ? 'bg-white/10'
                        : 'bg-white/5'
                }`}
              />
              
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

type SensorySuiteTest = 'palette' | 'style' | 'music' | 'texture' | 'light' | 'nature' | 'biophilia';
type InteractiveTest = 'music' | 'texture' | 'light';

type SensorySuiteResults = {
  music?: string;
  texture?: string;
  light?: string;
  natureMetaphor?: string;
  style?: string;
};

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
  /** Restore answers when the user re-opens this step (session / profile already persisted). */
  initialSensoryPreferences?: Partial<Pick<SensorySuiteResults, 'music' | 'texture' | 'light'>>;
  initialNatureMetaphor?: string;
  initialBiophiliaScore?: number;
}

function subStepHasValue(
  test: SensorySuiteTest,
  selectedPalette: string | undefined,
  selectedStyle: string | undefined,
  results: SensorySuiteResults,
  biophiliaScore: number | undefined,
): boolean {
  switch (test) {
    case 'palette':
      return Boolean(selectedPalette);
    case 'style':
      return Boolean(results.style || selectedStyle);
    case 'music':
      return Boolean(results.music);
    case 'texture':
      return Boolean(results.texture);
    case 'light':
      return Boolean(results.light);
    case 'nature':
      return Boolean(results.natureMetaphor);
    case 'biophilia':
      return typeof biophiliaScore === 'number';
  }
}

/** Largest index such that tests[0..idx] are all answered (from the start). */
function maxConsecutiveFilledSubStepIndex(
  tests: SensorySuiteTest[],
  selectedPalette: string | undefined,
  selectedStyle: string | undefined,
  results: SensorySuiteResults,
  biophiliaScore: number | undefined,
): number {
  let max = -1;
  for (let i = 0; i < tests.length; i++) {
    if (!subStepHasValue(tests[i], selectedPalette, selectedStyle, results, biophiliaScore)) break;
    max = i;
  }
  return Math.max(0, max);
}

function firstIncompleteSubStepIndex(
  tests: SensorySuiteTest[],
  selectedPalette: string | undefined,
  selectedStyle: string | undefined,
  results: SensorySuiteResults,
  biophiliaScore: number | undefined,
): number {
  for (let i = 0; i < tests.length; i++) {
    if (!subStepHasValue(tests[i], selectedPalette, selectedStyle, results, biophiliaScore)) {
      return i;
    }
  }
  return Math.max(0, tests.length - 1);
}

function pickInitialSensorySubStep(
  tests: SensorySuiteTest[],
  selectedPalette: string | undefined,
  selectedStyle: string | undefined,
  initialSensoryPreferences: SensoryTestSuiteProps['initialSensoryPreferences'],
  initialNatureMetaphor: string | undefined,
  initialBiophiliaScore: number | undefined,
): { step: SensorySuiteTest; index: number; results: SensorySuiteResults; biophilia: number | undefined } {
  const results: SensorySuiteResults = {
    music: initialSensoryPreferences?.music,
    texture: initialSensoryPreferences?.texture,
    light: initialSensoryPreferences?.light,
    natureMetaphor: initialNatureMetaphor,
  };
  const biophilia = typeof initialBiophiliaScore === 'number' ? initialBiophiliaScore : undefined;
  const fi = firstIncompleteSubStepIndex(tests, selectedPalette, selectedStyle, results, biophilia);
  const step = tests[fi] ?? tests[0];
  return {
    step,
    index: Math.max(0, tests.indexOf(step)),
    results,
    biophilia,
  };
}

export type SensoryTestSuiteHandle = {
  /** Go one sub-step back inside the suite; returns false on the first sub-step. */
  tryGoBackSubStep: () => boolean;
};

export const SensoryTestSuite = forwardRef<SensoryTestSuiteHandle, SensoryTestSuiteProps>(function SensoryTestSuite(
  {
    onComplete,
    className = '',
    profileContext,
    paletteOptions,
    selectedPalette,
    onPaletteSelect,
    styleOptions,
    selectedStyle,
    onStyleSelect,
    initialSensoryPreferences,
    initialNatureMetaphor,
    initialBiophiliaScore,
  },
  ref
) {
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

  const bootstrap = useMemo(
    () =>
      pickInitialSensorySubStep(
        tests,
        selectedPalette,
        selectedStyle,
        initialSensoryPreferences,
        initialNatureMetaphor,
        initialBiophiliaScore,
      ),
    [
      tests,
      selectedPalette,
      selectedStyle,
      initialSensoryPreferences?.music,
      initialSensoryPreferences?.texture,
      initialSensoryPreferences?.light,
      initialNatureMetaphor,
      initialBiophiliaScore,
    ],
  );

  const [results, setResults] = useState<SensorySuiteResults>(() => ({ ...bootstrap.results }));
  const [biophiliaScore, setBiophiliaScore] = useState<number | undefined>(() => bootstrap.biophilia);
  const [currentTest, setCurrentTest] = useState<SensorySuiteTest>(() => bootstrap.step);
  const [maxVisitedStepIndex, setMaxVisitedStepIndex] = useState(() => bootstrap.index);

  /** Prevents duplicate `onComplete` (e.g. re-click palette/style when session already has full answers → wizard completion + login modal). */
  const completionDispatchedRef = useRef(false);

  useEffect(() => {
    setResults((prev) => ({
      ...prev,
      music: prev.music || initialSensoryPreferences?.music,
      texture: prev.texture || initialSensoryPreferences?.texture,
      light: prev.light || initialSensoryPreferences?.light,
      natureMetaphor: prev.natureMetaphor || initialNatureMetaphor,
    }));
    setBiophiliaScore((prev) =>
      typeof prev === 'number' ? prev : typeof initialBiophiliaScore === 'number' ? initialBiophiliaScore : undefined,
    );
  }, [
    initialSensoryPreferences?.music,
    initialSensoryPreferences?.texture,
    initialSensoryPreferences?.light,
    initialNatureMetaphor,
    initialBiophiliaScore,
  ]);

  useEffect(() => {
    if (!tests.includes(currentTest)) {
      setCurrentTest(tests[0]);
    }
  }, [tests, currentTest]);

  const currentIndex = tests.indexOf(currentTest);

  useEffect(() => {
    setMaxVisitedStepIndex((m) => Math.max(m, currentIndex));
  }, [currentIndex]);

  const filledFromSavedAnswers = useMemo(
    () =>
      maxConsecutiveFilledSubStepIndex(
        tests,
        selectedPalette,
        selectedStyle,
        results,
        biophiliaScore,
      ),
    [tests, selectedPalette, selectedStyle, results, biophiliaScore],
  );

  /** Session / profile already had answers before this visit — allow jumping by saved progress. */
  const prefillFromSession = Boolean(
    initialSensoryPreferences?.music ||
      initialSensoryPreferences?.texture ||
      initialSensoryPreferences?.light ||
      initialNatureMetaphor ||
      typeof initialBiophiliaScore === 'number',
  );

  /** First-time flow: only steps you've reached (`maxVisited`) stay open ahead; saved tail does not burst all dots at once after palette+style. */
  const furthestClickIndex = prefillFromSession
    ? Math.max(filledFromSavedAnswers, maxVisitedStepIndex, currentIndex)
    : Math.max(maxVisitedStepIndex, currentIndex);

  const goToSubStep = useCallback(
    (i: number) => {
      if (i === currentIndex) return;
      if (i > furthestClickIndex) return;
      const next = tests[i];
      if (next) {
        if (i < currentIndex) {
          completionDispatchedRef.current = false;
        }
        setCurrentTest(next);
      }
    },
    [currentIndex, furthestClickIndex, tests],
  );

  useImperativeHandle(
    ref,
    () => ({
      tryGoBackSubStep: () => {
        const idx = tests.indexOf(currentTest);
        if (idx <= 0) return false;
        completionDispatchedRef.current = false;
        setCurrentTest(tests[idx - 1]);
        return true;
      }
    }),
    [tests, currentTest]
  );

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
    if (completionDispatchedRef.current) return;
    if (
      finalBiophilia === undefined ||
      !finalResults.music ||
      !finalResults.texture ||
      !finalResults.light ||
      !finalResults.natureMetaphor
    ) {
      return;
    }
    completionDispatchedRef.current = true;
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
    setTimeout(() => onComplete(payload), 300);
  };

  const handleSelect = (testType: SensorySuiteTest, value: string | number) => {
    if (testType === 'palette') {
      onPaletteSelect?.(value as string);
      goToNext(testType);
      return;
    }

    if (testType === 'style') {
      onStyleSelect?.(value as string);
      // CRITICAL: Update results with selected style immediately
      const newResults = { ...results, style: value as string };
      setResults(newResults);
      goToNext(testType);
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

  return (
    <div className={`flex min-h-0 flex-col gap-1.5 sm:gap-2 h-full pb-1 w-full max-w-full overflow-x-hidden ${className}`}>
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

      <ol
        className="grid w-full list-none m-0 p-0 py-2 gap-x-1 gap-y-1.5 items-start"
        style={{ gridTemplateColumns: `repeat(${tests.length}, minmax(0, 1fr))` }}
        aria-label={language === 'pl' ? 'Kolejność testów sensorycznych' : 'Sensory test sequence'}
      >
        {tests.map((test, i) => {
          const isCurrent = i === currentIndex;
          const isStrictlyPast = i < currentIndex;
          const isForwardClickable = i > currentIndex && i <= furthestClickIndex;
          const isLocked = i > furthestClickIndex;
          const showCheck = isStrictlyPast;
          const navLabel =
            language === 'pl'
              ? `${getTestLabel(test)} — krok ${i + 1} z ${tests.length}${
                  isLocked
                    ? '. Najpierw ukończ wcześniejsze kroki.'
                    : isCurrent
                      ? ', aktualny krok.'
                      : isForwardClickable
                        ? '. Kliknij, aby przejść do tego kroku.'
                        : '. Kliknij, aby wrócić do tego kroku.'
                }`
              : `${getTestLabel(test)} — step ${i + 1} of ${tests.length}${
                  isLocked
                    ? '. Complete earlier steps first.'
                    : isCurrent
                      ? ', current step.'
                      : isForwardClickable
                        ? '. Click to open this step.'
                        : '. Click to go back to this step.'
                }`;
          return (
            <li key={test} className="flex min-w-0 flex-col items-center text-center">
              <button
                type="button"
                disabled={isLocked}
                onClick={() => goToSubStep(i)}
                aria-label={navLabel}
                aria-current={isCurrent ? 'step' : undefined}
                className={`flex w-full flex-col items-center gap-0.5 px-0.5 rounded-lg transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/55 focus-visible:ring-offset-1 focus-visible:ring-offset-transparent ${
                  isCurrent
                    ? 'opacity-100'
                    : isStrictlyPast || isForwardClickable
                      ? 'opacity-90'
                      : 'opacity-45'
                } ${isLocked ? 'cursor-not-allowed' : 'cursor-pointer'}`}
              >
                <span
                  className={`flex h-6 w-6 sm:h-7 sm:w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-nasalization font-bold border transition-colors ${
                    isCurrent
                      ? 'border-white/50 bg-white/20 text-white shadow-sm'
                      : showCheck
                        ? 'border-gold/35 bg-gold/15 text-gold'
                        : isForwardClickable
                          ? 'border-white/22 bg-white/[0.08] text-white/70'
                          : 'border-white/12 bg-white/[0.04] text-white/50'
                  }`}
                >
                  {showCheck ? (
                    <Check className="h-3.5 w-3.5 sm:h-4 sm:w-4" strokeWidth={2.5} aria-hidden />
                  ) : (
                    i + 1
                  )}
                </span>
                <span
                  className={`w-full text-[8px] sm:text-[9px] md:text-[10px] font-nasalization font-bold leading-tight line-clamp-2 break-words hyphens-auto ${
                    isCurrent
                      ? 'text-white'
                      : showCheck
                        ? 'text-gold/90'
                        : isForwardClickable
                          ? 'text-white/75'
                          : 'text-white/45'
                  }`}
                >
                  {getTestLabel(test)}
                </span>
              </button>
            </li>
          );
        })}
      </ol>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {/* Native scroll: nested SimpleBar (flexFill + h-0) inside CoreProfileWizard's scroll
            collapses palette/style grids to zero height on some viewports. */}
        <div className="min-h-0 flex-1 w-full min-w-0 overflow-y-auto overflow-x-hidden">
        {currentTest === 'palette' && hasPalette && paletteOptions ? (
          <PaletteTest
            options={paletteOptions}
            selectedId={selectedPalette}
            onSelect={(value) => handleSelect('palette', value)}
            frameless
            className="flex h-full min-h-0 flex-col justify-center overflow-x-hidden"
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
            className="flex h-full min-h-0 flex-col justify-center overflow-x-hidden"
            stepCounter={language === 'pl'
              ? `Krok ${currentIndex + 1} z ${tests.length}`
              : `Step ${currentIndex + 1} of ${tests.length}`}
          />
        ) : currentTest === 'nature' ? (
          <NatureMetaphorTest
            frameless
            className="flex h-full min-h-0 flex-col justify-center overflow-x-hidden"
            onSelect={(value) => handleSelect('nature', value)}
            stepCounter={language === 'pl'
              ? `Krok ${currentIndex + 1} z ${tests.length}`
              : `Step ${currentIndex + 1} of ${tests.length}`}
          />
        ) : currentTest === 'biophilia' ? (
          <BiophiliaTest
            frameless
            className="flex h-full min-h-0 flex-col justify-center overflow-x-hidden"
            onSelect={(score) => handleSelect('biophilia', score)}
            stepCounter={language === 'pl'
              ? `Krok ${currentIndex + 1} z ${tests.length}`
              : `Step ${currentIndex + 1} of ${tests.length}`}
          />
        ) : (
          <SensoryTest
            type={currentTest as InteractiveTest}
            onSelect={(value) => handleSelect(currentTest, value)}
            className="flex h-full min-h-0 flex-col justify-center overflow-x-hidden"
            value={results[currentTest as InteractiveTest] || null}
            frameless
            stepCounter={language === 'pl'
              ? `Krok ${currentIndex + 1} z ${tests.length}`
              : `Step ${currentIndex + 1} of ${tests.length}`}
          />
        )}
        </div>
      </div>
    </div>
  );
});

