'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useSession } from '@/hooks';
import { useLanguage } from '@/contexts/LanguageContext';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';
import { AwaDialogue } from '@/components/awa/AwaDialogue';
import { Palette, Check } from 'lucide-react';
import { STYLE_OPTIONS } from '@/lib/questions/style-options';

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
        <GlassCard className="w-full max-w-6xl p-6 md:p-8 glass-panel shadow-xl rounded-2xl max-h-[90vh] overflow-auto scrollbar-hide">
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
              return (
                <motion.button
                  key={style.id}
                  onClick={() => setSelectedStyle(style.id)}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.98 }}
                  className={`relative p-6 rounded-2xl text-left transition-all duration-300 ${
                    isSelected
                      ? 'bg-gradient-to-br from-gold/30 to-champagne/30 border-2 border-gold shadow-xl'
                      : 'glass-panel hover:border-gold/50'
                  }`}
                >
                  {isSelected && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gold flex items-center justify-center"
                    >
                      <Check size={20} className="text-white" />
                    </motion.div>
                  )}
                  
                  <h3 className="text-xl font-nasalization text-graphite mb-2">
                    {language === 'pl' ? style.labelPl : style.labelEn}
                  </h3>
                  <p className="text-sm text-silver-dark font-modern">
                    {style.description}
                  </p>
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

