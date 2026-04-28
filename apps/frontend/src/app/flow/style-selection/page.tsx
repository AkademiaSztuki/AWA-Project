'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { useSession } from '@/hooks';
import { useLanguage } from '@/contexts/LanguageContext';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';
import { AwaDialogue } from '@/components/awa/AwaDialogue';
import { Check, ArrowLeft } from 'lucide-react';
import { STYLE_OPTIONS } from '@/lib/questions/style-options';
import { safeSessionStorage } from '@/lib/gcp-data';
import { FULL_FLOW_GLASS_SHELL, GLASS_CARD_SCROLL_STEP } from '@/lib/flow/glass-step-layout';

/** Tells /flow/fast-generate to ignore any cached fast preview (survives in-memory/GCP merge quirks). */
const IDA_FAST_TRACK_REQUIRE_FRESH_GEN_KEY = 'awa_fast_track_require_fresh_gen';

// Map style IDs to image filenames
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

/**
 * Style Selection Page for Fast Track
 * User picks a dominant style for their interior
 * Uses shared STYLE_OPTIONS from style-options.ts for consistency
 */

export default function StyleSelectionPage() {
  const router = useRouter();
  const { sessionData, updateSession } = useSession();
  const { language } = useLanguage();
  const [selectedStyle, setSelectedStyle] = useState<string | null>(null);
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());

  const handleImageError = (styleId: string) => {
    setImageErrors(prev => new Set(prev).add(styleId));
  };

  const texts = {
    pl: {
      title: 'Wybierz swój styl',
      subtitle: 'W jakim stylu chcesz urządzić swoje wnętrze?',
      description: 'Wybierz jeden styl, który najbardziej Ci odpowiada. Pomoże mi to stworzyć idealne wizualizacje.',
      continue: 'Dalej',
      selectOne: 'Wybierz jeden styl, aby kontynuować',
      back: 'Wstecz',
    },
    en: {
      title: 'Choose Your Style',
      subtitle: 'What style would you like for your interior?',
      description: 'Select one style that resonates with you. This will help me create perfect visualizations.',
      continue: 'Continue',
      selectOne: 'Select one style to continue',
      back: 'Back',
    }
  };

  const t = texts[language];

  const applyStyleAndGoToGenerate = async () => {
    if (!selectedStyle) return;

    console.log('[StyleSelection] Selected style:', selectedStyle);

    const prev = sessionData as any;
    const prevImages = Array.isArray(prev?.generatedImages) ? prev.generatedImages : [];
    const prevGens = Array.isArray(prev?.generations) ? prev.generations : [];
    // New style ⇒ drop prior fast-track previews so /flow/fast-generate does not restore an old render
    const generatedImages = prevImages.filter((img: any) => {
      const id = img && typeof img === 'object' ? img.id : null;
      return !(id && String(id).startsWith('fast-'));
    });
    const generations = prevGens.filter((g: any) => !(g?.id && String(g.id).startsWith('fast-gen')));

    // Save style to session as visualDNA for prompt building
    await updateSession({
      visualDNA: {
        dominantStyle: selectedStyle,
        dominantTags: [],
        preferences: {
          colors: [],
          materials: [],
          styles: [selectedStyle],
          lighting: []
        },
        accuracyScore: 0
      },
      tinderResults: [],
      ladderPath: ['quick'],
      coreNeed: 'comfortable and functional interior',
      generatedImages,
      generations,
      fastTrackLastGeneratedStyle: undefined,
    });

    safeSessionStorage.setItem(IDA_FAST_TRACK_REQUIRE_FRESH_GEN_KEY, '1');

    // Go to fast track generation
    router.push('/flow/fast-generate');
  };

  const handleContinue = async () => {
    if (!selectedStyle) return;
    await applyStyleAndGoToGenerate();
  };

  const handleBack = () => {
    router.push('/flow/fast-track');
  };

  return (
    <div className="min-h-screen flex flex-col w-full">
      <div className="flex-1 flex justify-center items-start">
        <div className={`${FULL_FLOW_GLASS_SHELL} space-y-6`}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <GlassCard variant="flatOnMobile" scrollable className={`flex min-h-0 flex-col p-6 md:p-8 ${GLASS_CARD_SCROLL_STEP}`}>
          {/* Header */}
          <div className="mb-6">
            <h1 className="font-nasalization text-xl text-graphite md:text-2xl">
              {t.title}
            </h1>
            <p className="mt-3 text-sm font-modern text-graphite">
              {t.subtitle}
            </p>
            <p className="mt-2 text-sm font-modern text-silver-dark">
              {t.description}
            </p>
          </div>

          {/* Style Grid */}
          <div className="mb-8 grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-4 md:grid-cols-3">
            {STYLE_OPTIONS.map((style) => {
              const isSelected = selectedStyle === style.id;
              const imagePath = getStyleImagePath(style.id);
              const hasImageError = imageErrors.has(style.id);
              const hasImage = imagePath && !hasImageError;
              
              return (
                <motion.button
                  key={style.id}
                  onClick={() => setSelectedStyle(style.id)}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.98 }}
                  className={`relative min-h-[200px] overflow-hidden rounded-2xl border text-left transition-all duration-300 sm:min-h-[180px] ${
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
                        alt={language === 'pl' 
                          ? `Przykład wnętrza w stylu ${style.labelPl}` 
                          : `Example interior in ${style.labelEn} style`}
                        fill
                        className="object-cover rounded-2xl"
                        onError={() => handleImageError(style.id)}
                        loading="lazy"
                        quality={85}
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      />
                    </div>
                  )}
                  
                  {/* Glass overlay */}
                  <div className={`absolute inset-0 z-10 rounded-2xl ${
                    hasImage 
                      ? (isSelected ? 'bg-gold/25' : 'bg-black/20')
                      : (isSelected ? 'bg-gold/10' : 'bg-white/5')
                  }`} />
                  
                  {/* Check icon */}
                  {isSelected && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute top-4 right-4 z-30 w-8 h-8 rounded-full bg-gold flex items-center justify-center shadow-lg"
                    >
                      <Check size={20} className="text-white" />
                    </motion.div>
                  )}
                  
                  {/* Style name and description at bottom */}
                  <div className="absolute bottom-0 left-0 right-0 z-20 flex flex-col gap-0.5 px-3 py-2.5 sm:gap-1 sm:px-4 sm:py-3">
                    <h3 className={`font-nasalization text-xs leading-tight sm:text-sm ${
                      hasImage ? 'text-white drop-shadow-lg' : 'text-graphite'
                    }`}>
                      {language === 'pl' ? style.labelPl : style.labelEn}
                    </h3>
                    <p className={`line-clamp-2 text-[9px] font-modern leading-tight sm:text-[10px] ${
                      hasImage ? 'text-white/90 drop-shadow-md' : 'text-silver-dark'
                    }`}>
                      {language === 'pl' ? (style.descriptionPl || style.description) : style.description}
                    </p>
                  </div>
                </motion.button>
              );
            })}
          </div>

          {/* Back + continue (same pattern as fast-track photo step) */}
          <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <GlassButton
              type="button"
              variant="secondary"
              onClick={handleBack}
              size="lg"
              className="w-full sm:w-auto"
            >
              <ArrowLeft size={18} />
              {t.back}
            </GlassButton>
            <GlassButton
              type="button"
              onClick={handleContinue}
              disabled={!selectedStyle}
              size="lg"
              className="px-8 w-full sm:w-auto"
            >
              {selectedStyle ? t.continue : t.selectOne}
            </GlassButton>
          </div>
            </GlassCard>
          </motion.div>
        </div>
      </div>

      {/* Dialog IDA na dole */}
      <div className="w-full">
        <AwaDialogue 
          currentStep="upload" 
          fullWidth={true}
          autoHide={true}
          customMessage={language === 'pl' 
            ? 'Wybierz styl, który Cię inspiruje. Nie martw się - możesz go później dostosować!'
            : 'Choose a style that inspires you. Don\'t worry - you can adjust it later!'}
        />
      </div>
    </div>
  );
}

