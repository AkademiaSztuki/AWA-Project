"use client";

import React, { useState } from 'react';
import { NATURE_METAPHOR_OPTIONS, SensoryOption } from '@/lib/questions/validated-scales';
import { useLanguage } from '@/contexts/LanguageContext';
import { GlassCard } from '@/components/ui/GlassCard';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { Mountain, Sparkles } from 'lucide-react';

interface NatureMetaphorTestProps {
  onSelect: (selectedId: string) => void;
  className?: string;
  frameless?: boolean;
}

/**
 * NatureMetaphorTest - Projective technique using nature metaphors
 * 
 * Research: Projective techniques bypass cognitive filters
 * User selects nature place that "feels like" their ideal room
 * Reveals archetypal patterns and deep preferences
 */
export function NatureMetaphorTest({ onSelect, className = '', frameless = false }: NatureMetaphorTestProps) {
  const { t, language } = useLanguage();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const handleSelect = (option: SensoryOption) => {
    setSelectedId(option.id);
    onSelect(option.id);
  };

  const content = (
    <>
      {/* Title */}
      <div className="text-center mb-8">
        <div className="flex items-center justify-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-400 via-emerald-400 to-teal-500 flex items-center justify-center shadow-lg">
            <Mountain className="text-white" size={24} />
          </div>
          <h3 className="text-2xl lg:text-3xl xl:text-4xl font-nasalization bg-gradient-to-r from-green-600 via-emerald-500 to-teal-600 bg-clip-text text-transparent">
            {language === 'pl' ? 'Metafora Natury' : 'Nature Metaphor'}
          </h3>
        </div>
        
        <p className="text-base lg:text-lg text-graphite font-modern max-w-2xl mx-auto">
          {language === 'pl' 
            ? 'Gdyby Twoja idealna przestrzeń była miejscem w naturze, którym by była?'
            : 'If your ideal space was a place in nature, which would it be?'}
        </p>
        <p className="text-sm text-silver-dark font-modern mt-2">
          {language === 'pl'
            ? 'Nie myśl za dużo - reaguj sercem, nie głową'
            : 'Don\'t think too much - react with your heart, not your head'}
        </p>
      </div>

      {/* Options Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
        {NATURE_METAPHOR_OPTIONS.map((option, index) => {
          const isSelected = selectedId === option.id;
          const isHovered = hoveredId === option.id;

          return (
            <motion.div
              key={option.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
              whileHover={{ scale: 1.05, y: -8 }}
              className="relative"
            >
              <div
                className={`glass-panel rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 ${
                  isSelected
                    ? 'border-2 border-emerald-500 shadow-2xl shadow-emerald-500/30'
                    : isHovered
                    ? 'border border-emerald-400/50 shadow-lg'
                    : 'border border-white/30'
                }`}
                onMouseEnter={() => setHoveredId(option.id)}
                onMouseLeave={() => setHoveredId(null)}
                onClick={() => handleSelect(option)}
              >
                {/* Image */}
                <div className="relative w-full h-40 lg:h-48 bg-gray-200">
                  {option.imageUrl ? (
                    <Image
                      src={option.imageUrl}
                      alt={t(option.label)}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    // Placeholder with gradient
                    <div className={`absolute inset-0 ${getNatureGradient(option.id)}`} />
                  )}
                  
                  {/* Selected overlay */}
                  {isSelected && (
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="absolute inset-0 bg-gradient-to-br from-emerald-500/30 to-teal-500/30 backdrop-blur-sm flex items-center justify-center"
                    >
                      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-xl">
                        <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    </motion.div>
                  )}

                  {/* Hover glow */}
                  {isHovered && !isSelected && (
                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-400/20 to-teal-400/20 pointer-events-none" />
                  )}
                </div>

                {/* Content */}
                <div className="p-4">
                  <h4 className={`font-nasalization text-base lg:text-lg mb-2 transition-colors ${
                    isSelected ? 'text-emerald-600' : 'text-graphite'
                  }`}>
                    {t(option.label)}
                  </h4>
                  <p className="text-xs lg:text-sm text-silver-dark font-modern leading-relaxed">
                    {t(option.description)}
                  </p>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Selected Summary */}
      <AnimatePresence>
        {selectedId && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="mt-8"
          >
            <GlassCard className="p-6 bg-gradient-to-br from-emerald-50/50 to-teal-50/50 border-emerald-200/30">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center flex-shrink-0">
                  <Sparkles className="text-white" size={20} />
                </div>
                <div>
                  <h4 className="font-nasalization text-lg text-emerald-700 mb-2">
                    {language === 'pl' ? 'Twoja Esencja' : 'Your Essence'}
                  </h4>
                  <p className="text-sm lg:text-base text-graphite font-modern">
                    <strong className="text-emerald-600">
                      {t(NATURE_METAPHOR_OPTIONS.find(o => o.id === selectedId)!.label)}
                    </strong>
                    {' - '}
                    {t(NATURE_METAPHOR_OPTIONS.find(o => o.id === selectedId)!.description)}
                  </p>
                  <p className="text-xs lg:text-sm text-silver-dark mt-2">
                    {language === 'pl'
                      ? 'Ta metafora pomoże nam zrozumieć głębsze potrzeby Twojej przestrzeni'
                      : 'This metaphor helps us understand the deeper needs of your space'}
                  </p>
                </div>
              </div>
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Help text */}
      <div className="mt-6 text-xs lg:text-sm text-center text-silver-dark font-modern italic">
        {language === 'pl'
          ? 'Techniki projekcyjne pomagają odkryć autentyczne preferencje poza świadomymi filtrami'
          : 'Projective techniques help discover authentic preferences beyond conscious filters'}
      </div>
    </>
  );

  if (frameless) {
    return (
      <div className={className}>
        {content}
      </div>
    );
  }

  return (
    <GlassCard className={`p-6 lg:p-8 ${className}`}>
      {content}
    </GlassCard>
  );
}

/**
 * Helper function to get gradient for nature type (fallback if image not available)
 */
function getNatureGradient(natureId: string): string {
  const gradients: Record<string, string> = {
    ocean: 'bg-gradient-to-br from-blue-400 via-cyan-400 to-teal-500',
    forest: 'bg-gradient-to-br from-green-600 via-emerald-500 to-green-700',
    mountain: 'bg-gradient-to-br from-gray-500 via-slate-400 to-blue-300',
    desert: 'bg-gradient-to-br from-amber-300 via-orange-200 to-yellow-300',
    garden: 'bg-gradient-to-br from-green-400 via-lime-300 to-emerald-400',
    sunset: 'bg-gradient-to-br from-orange-400 via-pink-400 to-purple-500'
  };
  return gradients[natureId] || 'bg-gradient-to-br from-gray-200 to-gray-300';
}

/**
 * AspirationalSelfPrompt - Identity Mirroring technique
 * User describes ideal version of themselves in the space
 */
interface AspirationalSelfPromptProps {
  onSubmit: (description: string) => void;
  className?: string;
}

export function AspirationalSelfPrompt({ onSubmit, className = '' }: AspirationalSelfPromptProps) {
  const { language } = useLanguage();
  const [description, setDescription] = useState('');
  const [isRecording, setIsRecording] = useState(false);

  const handleSubmit = () => {
    if (description.trim()) {
      onSubmit(description);
    }
  };

  const handleSkip = () => {
    onSubmit(''); // Empty string means skipped
  };

  return (
    <GlassCard className={`p-6 lg:p-8 ${className}`}>
      <div className="text-center mb-6">
        <div className="flex items-center justify-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-400 via-pink-400 to-rose-500 flex items-center justify-center shadow-lg">
            <Sparkles className="text-white" size={24} />
          </div>
          <h3 className="text-2xl lg:text-3xl xl:text-4xl font-nasalization bg-gradient-to-r from-purple-600 via-pink-500 to-rose-600 bg-clip-text text-transparent">
            {language === 'pl' ? 'Twoja Wizja' : 'Your Vision'}
          </h3>
        </div>
        
        <p className="text-base lg:text-lg text-graphite font-modern max-w-2xl mx-auto">
          {language === 'pl'
            ? 'Wyobraź sobie siebie za rok - najlepsza wersja Ciebie. Opowiedz o typowym dniu w tym pokoju.'
            : 'Imagine yourself in a year - the best version of you. Describe a typical day in this room.'}
        </p>
      </div>

      {/* Text Input */}
      <div className="space-y-4">
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={language === 'pl' 
            ? 'Wstaję wcześnie, nieśpiesznie. Robię kawę, medytuję przy oknie. Czuję się spokojnie i w kontroli...'
            : 'I wake up early, unhurried. Make coffee, meditate by the window. Feel calm and in control...'}
          className="w-full h-32 lg:h-40 glass-panel rounded-xl p-4 font-modern text-graphite placeholder-silver-dark resize-none focus:outline-none focus:border-purple-400 transition-colors"
          maxLength={500}
        />

        <div className="flex items-center justify-between text-xs text-silver-dark">
          <span>{language === 'pl' ? 'Opcjonalne - ale bardzo pomocne!' : 'Optional - but very helpful!'}</span>
          <span>{description.length}/500</span>
        </div>

        {/* Voice Recording Button (future feature) */}
        <div className="glass-panel rounded-xl p-4 bg-gradient-to-br from-purple-50/50 to-pink-50/50">
          <p className="text-sm text-center text-silver-dark font-modern">
            🎤 {language === 'pl' 
              ? 'Nagrywanie głosowe - wkrótce!'
              : 'Voice recording - coming soon!'}
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={handleSkip}
            className="flex-1 glass-panel rounded-xl px-6 py-3 font-modern text-silver-dark hover:bg-white/30 transition-colors"
          >
            {language === 'pl' ? 'Pomiń' : 'Skip'}
          </button>
          <button
            onClick={handleSubmit}
            disabled={!description.trim()}
            className={`flex-1 rounded-xl px-6 py-3 font-semibold transition-all ${
              description.trim()
                ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:shadow-lg hover:scale-105'
                : 'glass-panel text-silver-dark cursor-not-allowed'
            }`}
          >
            {language === 'pl' ? 'Zapisz Wizję' : 'Save Vision'}
          </button>
        </div>
      </div>

      {/* Help text */}
      <div className="mt-6 text-xs lg:text-sm text-center text-silver-dark font-modern italic">
        {language === 'pl'
          ? 'Design dla KIM chcesz być, nie tylko kim jesteś teraz'
          : 'Design for WHO you want to be, not just who you are now'}
      </div>
    </GlassCard>
  );
}

