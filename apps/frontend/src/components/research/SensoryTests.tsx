"use client";

import React, { useState } from 'react';
import { 
  MUSIC_PREFERENCES, 
  TEXTURE_PREFERENCES, 
  LIGHT_PREFERENCES,
  SensoryOption 
} from '@/lib/questions/validated-scales';
import { useLanguage } from '@/contexts/LanguageContext';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { Volume2, Hand, Lightbulb, Play, Pause } from 'lucide-react';

interface SensoryTestProps {
  type: 'music' | 'texture' | 'light';
  onSelect: (selectedId: string) => void;
  className?: string;
}

/**
 * SensoryTest - Multi-modal preference testing
 * 
 * Research: Novel contribution - multi-sensory profiling for interior design
 * Tests: Music (auditory), Texture (tactile), Light (visual)
 */
export function SensoryTest({ type, onSelect, className = '' }: SensoryTestProps) {
  const { t, language } = useLanguage();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
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

  const titles = {
    music: {
      pl: 'Jaka muzyka pasuje do Twojej idealnej przestrzeni?',
      en: 'What music fits your ideal space?'
    },
    texture: {
      pl: 'Jakiej tekstury chcesz dotykać najczęściej?',
      en: 'What texture do you want to touch most?'
    },
    light: {
      pl: 'Jaki typ oświetlenia preferujesz?',
      en: 'What type of lighting do you prefer?'
    }
  };

  const Icon = icons[type];

  const handleSelect = (option: SensoryOption) => {
    setSelectedId(option.id);
    onSelect(option.id);
    
    // Stop any playing audio
    if (audioElement) {
      audioElement.pause();
      setPlayingAudio(null);
    }
  };

  const handlePlayAudio = async (option: SensoryOption, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!option.audioUrl) return;

    if (playingAudio === option.id) {
      // Stop currently playing
      if (audioElement) {
        audioElement.pause();
        setPlayingAudio(null);
      }
    } else {
      // Stop previous and play new
      if (audioElement) {
        audioElement.pause();
      }
      
      const audio = new Audio(option.audioUrl);
      audio.volume = 0.5;
      setAudioElement(audio);
      
      audio.play().catch(err => {
        console.error('Audio play failed:', err);
      });
      
      audio.onended = () => {
        setPlayingAudio(null);
      };
      
      setPlayingAudio(option.id);
    }
  };

  return (
    <GlassCard className={`p-6 lg:p-8 ${className}`}>
      {/* Title */}
      <div className="text-center mb-8">
        <div className="flex items-center justify-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-gold to-champagne flex items-center justify-center shadow-lg">
            <Icon className="text-white" size={24} />
          </div>
          <h3 className="text-2xl lg:text-3xl xl:text-4xl font-nasalization bg-gradient-to-r from-gold to-champagne bg-clip-text text-transparent">
            {type === 'music' ? (language === 'pl' ? 'Muzyka' : 'Music') :
             type === 'texture' ? (language === 'pl' ? 'Tekstura' : 'Texture') :
             (language === 'pl' ? 'Światło' : 'Light')}
          </h3>
        </div>
        
        <p className="text-base lg:text-lg text-graphite font-modern max-w-2xl mx-auto">
          {t(titles[type])}
        </p>
      </div>

      {/* Options Grid */}
      <div className={`grid gap-4 ${
        type === 'music' ? 'grid-cols-2 lg:grid-cols-3' :
        type === 'texture' ? 'grid-cols-2 lg:grid-cols-3' :
        'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
      }`}>
        {options.map((option, index) => {
          const isSelected = selectedId === option.id;
          const isHovered = hoveredId === option.id;
          const isPlaying = playingAudio === option.id;

          return (
            <motion.div
              key={option.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
              whileHover={{ scale: 1.05, y: -5 }}
              className="relative"
            >
              <div
                className={`glass-panel rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 min-h-[280px] flex flex-col ${
                  isSelected
                    ? 'border-2 border-gold shadow-xl shadow-gold/20'
                    : isHovered
                    ? 'border border-gold/50'
                    : 'border border-white/30'
                }`}
                onMouseEnter={() => setHoveredId(option.id)}
                onMouseLeave={() => setHoveredId(null)}
                onClick={() => handleSelect(option)}
              >
                {/* Image/Visual */}
                {option.imageUrl ? (
                  <div className="relative w-full h-32 lg:h-40 bg-gray-200">
                    <Image
                      src={option.imageUrl}
                      alt={t(option.label)}
                      fill
                      className="object-cover"
                    />
                    
                    {/* Selected overlay */}
                    {isSelected && (
                      <div className="absolute inset-0 bg-gradient-to-br from-gold/20 to-champagne/20 backdrop-blur-sm flex items-center justify-center">
                        <div className="w-12 h-12 rounded-full bg-gold flex items-center justify-center">
                          <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  // Fallback for music without image
                  <div className="w-full h-32 lg:h-40 bg-gradient-to-br from-platinum-100 to-pearl-100 flex items-center justify-center">
                    <Icon size={48} className="text-silver-dark" />
                  </div>
                )}

                {/* Content */}
                <div className="p-4 flex-1 flex flex-col">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h4 className="font-nasalization text-base lg:text-lg text-graphite">
                      {t(option.label)}
                    </h4>
                    
                    {/* Audio play button for music */}
                    {type === 'music' && option.audioUrl && (
                      <button
                        onClick={(e) => handlePlayAudio(option, e)}
                        className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                          isPlaying 
                            ? 'bg-gold text-white' 
                            : 'glass-panel hover:bg-gold/20'
                        }`}
                      >
                        {isPlaying ? <Pause size={14} /> : <Play size={14} />}
                      </button>
                    )}
                  </div>
                  
                  <p className="text-xs lg:text-sm text-silver-dark font-modern">
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
            className="mt-6 text-center"
          >
            <div className="inline-block glass-panel px-6 py-3 rounded-full bg-gradient-to-r from-gold/10 to-champagne/10 border-gold/30">
              <p className="text-sm lg:text-base font-modern text-graphite">
                {language === 'pl' ? 'Wybrano:' : 'Selected:'}{' '}
                <span className="font-semibold text-gold">
                  {t(options.find(o => o.id === selectedId)!.label)}
                </span>
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Help text */}
      <div className="mt-6 text-xs lg:text-sm text-center text-silver-dark font-modern">
        {type === 'music' && (language === 'pl' 
          ? 'Wybierz muzykę która najlepiej oddaje vibe Twojej idealnej przestrzeni'
          : 'Choose music that best captures the vibe of your ideal space'
        )}
        {type === 'texture' && (language === 'pl'
          ? 'Którą teksturę chciałbyś dotykać najczęściej w swoim wnętrzu?'
          : 'Which texture would you like to touch most in your interior?'
        )}
        {type === 'light' && (language === 'pl'
          ? 'Wybierz temperaturę światła która Cię relaksuje i inspiruje'
          : 'Choose the light temperature that relaxes and inspires you'
        )}
      </div>
    </GlassCard>
  );
}

/**
 * Combined Sensory Test Suite
 * All three tests in one component with tabs or steps
 */
interface SensoryTestSuiteProps {
  onComplete: (results: {
    music: string;
    texture: string;
    light: string;
  }) => void;
  className?: string;
}

export function SensoryTestSuite({ onComplete, className = '' }: SensoryTestSuiteProps) {
  const { language } = useLanguage();
  const [currentTest, setCurrentTest] = useState<'music' | 'texture' | 'light'>('music');
  const [results, setResults] = useState<{
    music?: string;
    texture?: string;
    light?: string;
  }>({});

  const handleSelect = (testType: 'music' | 'texture' | 'light', value: string) => {
    const newResults = { ...results, [testType]: value };
    setResults(newResults);

    // Auto-advance to next test
    if (testType === 'music' && !results.texture) {
      setTimeout(() => setCurrentTest('texture'), 500);
    } else if (testType === 'texture' && !results.light) {
      setTimeout(() => setCurrentTest('light'), 500);
    } else if (testType === 'light' && newResults.music && newResults.texture && newResults.light) {
      // All completed
      setTimeout(() => {
        onComplete({
          music: newResults.music!,
          texture: newResults.texture!,
          light: newResults.light!
        });
      }, 500);
    }
  };

  const progress = ((Object.keys(results).length / 3) * 100);

  return (
    <div className={className}>
      {/* Progress */}
      <div className="mb-6">
        <div className="flex items-center justify-between text-sm text-silver-dark mb-2">
          <span>{language === 'pl' ? 'Postęp' : 'Progress'}</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="glass-panel rounded-full h-2 overflow-hidden">
          <motion.div 
            className="h-full bg-gradient-to-r from-gold to-champagne"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {(['music', 'texture', 'light'] as const).map((test) => (
          <button
            key={test}
            onClick={() => setCurrentTest(test)}
            className={`flex-1 px-4 py-3 rounded-xl font-modern text-sm lg:text-base transition-all ${
              currentTest === test
                ? 'glass-panel bg-gradient-to-br from-gold/20 to-champagne/20 border-gold/40 text-graphite font-semibold'
                : results[test]
                ? 'glass-panel text-gold'
                : 'glass-panel text-silver-dark'
            }`}
          >
            {results[test] && '✓ '}
            {test === 'music' ? (language === 'pl' ? 'Muzyka' : 'Music') :
             test === 'texture' ? (language === 'pl' ? 'Tekstura' : 'Texture') :
             (language === 'pl' ? 'Światło' : 'Light')}
          </button>
        ))}
      </div>

      {/* Current Test */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentTest}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
        >
          <SensoryTest
            type={currentTest}
            onSelect={(value) => handleSelect(currentTest, value)}
          />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

