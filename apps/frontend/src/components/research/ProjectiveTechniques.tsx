"use client";

import React, { useState, useEffect } from 'react';
import { NATURE_METAPHOR_OPTIONS, SensoryOption } from '@/lib/questions/validated-scales';
import { useLanguage } from '@/contexts/LanguageContext';
import { GlassCard } from '@/components/ui/GlassCard';
import Image from 'next/image';
import { Mountain, Sparkles } from 'lucide-react';

interface NatureMetaphorTestProps {
  onSelect: (selectedId: string) => void;
  className?: string;
  frameless?: boolean;
  stepCounter?: string;
}

/**
 * NatureMetaphorTest - Projective technique using nature metaphors
 * 
 * Research: Projective techniques bypass cognitive filters
 * User selects nature place that "feels like" their ideal room
 * Reveals archetypal patterns and deep preferences
 */
export function NatureMetaphorTest({ onSelect, className = '', frameless = false, stepCounter }: NatureMetaphorTestProps) {
  const { t, language } = useLanguage();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());
  
  // #region agent log
  useEffect(() => {
    const measureHeights = () => {
      const buttons = document.querySelectorAll('[data-nature-metaphor-button]');
      const heights: number[] = [];
      const textHeights: number[] = [];
      buttons.forEach((btn, idx) => {
        const height = (btn as HTMLElement).offsetHeight;
        heights.push(height);
        const textSection = (btn as HTMLElement).querySelector('[data-nature-metaphor-text]') as HTMLElement;
        const textHeight = textSection?.offsetHeight || 0;
        textHeights.push(textHeight);
        const h4 = textSection?.querySelector('h4') as HTMLElement;
        const p = textSection?.querySelector('p') as HTMLElement;
        fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ProjectiveTechniques.tsx:measureHeights',message:'Nature metaphor button height measured',data:{buttonIndex:idx,buttonHeight:height,textSectionHeight:textHeight,h4Height:h4?.offsetHeight||0,pHeight:p?.offsetHeight||0,optionId:NATURE_METAPHOR_OPTIONS[idx]?.id,gridCols:'2x3'},timestamp:Date.now(),sessionId:'debug-session',runId:'height-measurement',hypothesisId:'H1'})}).catch(()=>{});
      });
      if (heights.length > 0) {
        const avgHeight = heights.reduce((a, b) => a + b, 0) / heights.length;
        const minHeight = Math.min(...heights);
        const maxHeight = Math.max(...heights);
        const avgTextHeight = textHeights.reduce((a, b) => a + b, 0) / textHeights.length;
        const minTextHeight = Math.min(...textHeights);
        const maxTextHeight = Math.max(...textHeights);
        fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ProjectiveTechniques.tsx:measureHeights',message:'Nature metaphor button heights summary',data:{avgHeight,minHeight,maxHeight,heightDiff:maxHeight-minHeight,avgTextHeight,minTextHeight,maxTextHeight,textHeightDiff:maxTextHeight-minTextHeight,count:heights.length},timestamp:Date.now(),sessionId:'debug-session',runId:'height-measurement',hypothesisId:'H1'})}).catch(()=>{});
      }
    };
    const timeout = setTimeout(measureHeights, 500);
    return () => clearTimeout(timeout);
  }, [selectedId]);
  // #endregion

  // #region agent log
  useEffect(() => {
    NATURE_METAPHOR_OPTIONS.forEach(opt => {
      if (opt.imageUrl) {
        fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ProjectiveTechniques.tsx:useEffect',message:'Rendering nature metaphor option with imageUrl',data:{optionId:opt.id,imageUrl:opt.imageUrl},timestamp:Date.now(),sessionId:'debug-session',runId:'image-load-check',hypothesisId:'H3'})}).catch(()=>{});
      }
    });
  }, []);
  // #endregion

  const handleSelect = (option: SensoryOption) => {
    setSelectedId(option.id);
    onSelect(option.id);
  };

  const content = (
    <>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3 flex-1">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gold to-champagne flex items-center justify-center">
            <Mountain className="text-white" size={20} />
          </div>
          <div className="flex-1">
            <p className="text-xs uppercase tracking-[0.3em] text-silver-dark">
              {language === 'pl' ? 'Metafora' : 'Metaphor'}
            </p>
            <p className="text-sm font-modern text-graphite">
              {language === 'pl' 
                ? 'Gdyby Twoja idealna przestrzeń była miejscem w naturze, którym by była?'
                : 'If your ideal space was a place in nature, which would it be?'}
            </p>
          </div>
        </div>
        {selectedId && (
          <p className="text-xs text-right text-silver-dark">
            {language === 'pl' ? 'Wybrano:' : 'Selected:'}{' '}
            <span className="font-semibold text-graphite">
              {t(NATURE_METAPHOR_OPTIONS.find(o => o.id === selectedId)!.label)}
            </span>
          </p>
        )}
      </div>

      {/* Options Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 flex-1 content-center">
        {NATURE_METAPHOR_OPTIONS.map((option) => {
          const isSelected = selectedId === option.id;

          return (
            <button
              key={option.id}
              type="button"
              data-nature-metaphor-button
              className={`rounded-2xl border overflow-hidden text-left flex flex-col transition-all ${
                isSelected
                  ? 'border-gold bg-gold/10 shadow-inner shadow-gold/10'
                  : 'border-white/10 hover:border-gold/30 hover:bg-white/5'
              }`}
              onClick={() => handleSelect(option)}
            >
              {/* Image */}
              <div className="relative w-full h-48 overflow-hidden rounded-t-2xl rounded-b-2xl bg-gray-200">
                {option.imageUrl && !imageErrors.has(option.imageUrl) ? (
                  <Image
                    src={option.imageUrl}
                    alt={t(option.label)}
                    fill
                    sizes="(max-width: 768px) 50vw, 33vw"
                    className="object-cover"
                    style={{ objectPosition: 'center 65%' }}
                    onLoad={() => {
                      // #region agent log
                      fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ProjectiveTechniques.tsx:onLoad',message:'Nature metaphor image loaded successfully',data:{optionId:option.id,imageUrl:option.imageUrl},timestamp:Date.now(),sessionId:'debug-session',runId:'image-load-check',hypothesisId:'H1'})}).catch(()=>{});
                      // #endregion
                    }}
                    onError={() => {
                      // #region agent log
                      fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ProjectiveTechniques.tsx:onError',message:'Nature metaphor image failed to load',data:{optionId:option.id,imageUrl:option.imageUrl},timestamp:Date.now(),sessionId:'debug-session',runId:'image-load-check',hypothesisId:'H2'})}).catch(()=>{});
                      // #endregion
                      setImageErrors(prev => new Set(prev).add(option.imageUrl!));
                    }}
                  />
                ) : (
                  // Placeholder with gradient
                  <div className={`absolute inset-0 ${getNatureGradient(option.id)}`} />
                )}
                
                {/* Selected overlay */}
                {isSelected && (
                  <div className="absolute top-2 right-2 bg-gold text-white px-2 py-1 rounded-full text-xs font-semibold z-10">
                    ✓
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="px-4 pt-3 pb-4 flex flex-col gap-2 min-h-[80px]" data-nature-metaphor-text>
                <div className="flex items-start justify-between gap-3">
                  <h4 className="font-nasalization text-sm text-graphite">
                    {t(option.label)}
                  </h4>
                </div>
                <p className="text-xs text-silver-dark font-modern leading-relaxed">
                  {t(option.description)}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-4 mb-2 flex items-center justify-between gap-4">
        <p className="text-xs text-silver-dark font-modern flex-1">
          {language === 'pl'
            ? 'Techniki projekcyjne pomagają odkryć autentyczne preferencje poza świadomymi filtrami'
            : 'Projective techniques help discover authentic preferences beyond conscious filters'}
        </p>
        {stepCounter && (
          <p className="text-xs text-silver-dark font-modern whitespace-nowrap">
            {stepCounter}
          </p>
        )}
      </div>
    </>
  );

  const ContentWrapper = frameless ? 'div' : GlassCard;
  const wrapperClass = frameless 
    ? `h-full flex flex-col justify-center ${className}`
    : `p-6 lg:p-8 h-full flex flex-col justify-center ${className}`;

  return (
    <ContentWrapper className={wrapperClass}>
      {content}
    </ContentWrapper>
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

