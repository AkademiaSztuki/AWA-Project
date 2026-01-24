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
import { Palette, Check } from 'lucide-react';
import { STYLE_OPTIONS } from '@/lib/questions/style-options';

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
      title: 'Wybierz Swój Styl',
      subtitle: 'W jakim stylu chcesz urządzić swoje wnętrze?',
      description: 'Wybierz jeden styl, który najbardziej Ci odpowiada. Pomoże mi to stworzyć idealne wizualizacje.',
      continue: 'Dalej',
      selectOne: 'Wybierz jeden styl aby kontynuować'
    },
    en: {
      title: 'Choose Your Style',
      subtitle: 'What style would you like for your interior?',
      description: 'Select one style that resonates with you. This will help me create perfect visualizations.',
      continue: 'Continue',
      selectOne: 'Select one style to continue'
    }
  };

  const t = texts[language];

  const handleContinue = async () => {
    if (!selectedStyle) return;

    console.log('[StyleSelection] Selected style:', selectedStyle);

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
      coreNeed: 'comfortable and functional interior'
    });

    // Go to fast track generation
    router.push('/flow/fast-generate');
  };

  return (
    <div className="min-h-screen flex flex-col w-full">
      <div className="flex-1 flex items-center justify-center p-4 lg:p-8">
        <GlassCard variant="flatOnMobile" className="w-full max-w-6xl p-6 md:p-8 lg:glass-panel lg:shadow-xl rounded-2xl max-h-[min(90vh,900px)] overflow-auto scrollbar-hide">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-gold to-champagne flex items-center justify-center shadow-lg">
                <Palette size={28} className="text-white" />
              </div>
              <h1 className="text-3xl lg:text-4xl font-nasalization bg-gradient-to-r from-gold via-champagne to-platinum bg-clip-text text-transparent">
                {t.title}
              </h1>
            </div>
            <p className="text-graphite font-modern text-lg">
              {t.subtitle}
            </p>
            <p className="text-silver-dark font-modern text-sm mt-2">
              {t.description}
            </p>
          </div>

          {/* Style Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
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
                  className={`relative rounded-2xl overflow-hidden text-left transition-all duration-300 min-h-[200px] ${
                    isSelected
                      ? 'border-2 border-gold shadow-xl'
                      : 'border border-white/10 hover:border-gold/50'
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
                  <div className="absolute bottom-0 left-0 right-0 z-20 px-4 py-4 flex flex-col gap-1">
                    <h3 className={`font-nasalization text-lg leading-tight ${
                      hasImage ? 'text-white drop-shadow-lg' : 'text-graphite'
                    }`}>
                      {language === 'pl' ? style.labelPl : style.labelEn}
                    </h3>
                    <p className={`text-xs font-modern leading-tight ${
                      hasImage ? 'text-white/80 drop-shadow-md' : 'text-silver-dark'
                    }`}>
                      {language === 'pl' ? (style.descriptionPl || style.description) : style.description}
                    </p>
                  </div>
                </motion.button>
              );
            })}
          </div>

          {/* Continue Button */}
          <div className="flex justify-center">
            <GlassButton
              onClick={handleContinue}
              disabled={!selectedStyle}
              size="lg"
              className="px-8"
            >
              {selectedStyle ? t.continue : t.selectOne}
            </GlassButton>
          </div>
        </GlassCard>
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

