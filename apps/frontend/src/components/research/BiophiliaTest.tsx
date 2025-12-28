"use client";

import React, { useState, useEffect } from 'react';
import { BIOPHILIA_OPTIONS, BiophiliaOption } from '@/lib/questions/validated-scales';
import { useLanguage } from '@/contexts/LanguageContext';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';
import { Leaf } from 'lucide-react';
import Image from 'next/image';

interface BiophiliaTestProps {
  onSelect: (score: number, optionId: string) => void;
  className?: string;
  frameless?: boolean;
  stepCounter?: string;
}

/**
 * BiophiliaTest - Visual Dosage Test Component
 * 
 * Research: Kellert (2008) - 14 Patterns of Biophilic Design
 * User selects from 4 visual options representing nature density (0-3)
 * 
 * 0 = No nature (urban, sleek)
 * 1 = Minimal (1-2 plants)
 * 2 = Moderate (several plants, natural materials)
 * 3 = Maximum (urban jungle)
 */
export function BiophiliaTest({ onSelect, className = '', frameless = false, stepCounter }: BiophiliaTestProps) {
  const { t, language } = useLanguage();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  
  // #region agent log
  useEffect(() => {
    const measureHeights = () => {
      const buttons = document.querySelectorAll('[data-biophilia-button]');
      const heights: number[] = [];
      const textHeights: number[] = [];
      buttons.forEach((btn, idx) => {
        const height = (btn as HTMLElement).offsetHeight;
        heights.push(height);
        const textSection = (btn as HTMLElement).querySelector('[data-biophilia-text]') as HTMLElement;
        const textHeight = textSection?.offsetHeight || 0;
        textHeights.push(textHeight);
        const h4 = textSection?.querySelector('h4') as HTMLElement;
        const p = textSection?.querySelector('p') as HTMLElement;
        fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'BiophiliaTest.tsx:measureHeights',message:'Biophilia button height measured',data:{buttonIndex:idx,buttonHeight:height,textSectionHeight:textHeight,h4Height:h4?.offsetHeight||0,pHeight:p?.offsetHeight||0,optionId:BIOPHILIA_OPTIONS[idx]?.id,gridCols:'1x2'},timestamp:Date.now(),sessionId:'debug-session',runId:'height-measurement',hypothesisId:'H1'})}).catch(()=>{});
      });
      if (heights.length > 0) {
        const avgHeight = heights.reduce((a, b) => a + b, 0) / heights.length;
        const minHeight = Math.min(...heights);
        const maxHeight = Math.max(...heights);
        const avgTextHeight = textHeights.reduce((a, b) => a + b, 0) / textHeights.length;
        const minTextHeight = Math.min(...textHeights);
        const maxTextHeight = Math.max(...textHeights);
        fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'BiophiliaTest.tsx:measureHeights',message:'Biophilia button heights summary',data:{avgHeight,minHeight,maxHeight,heightDiff:maxHeight-minHeight,avgTextHeight,minTextHeight,maxTextHeight,textHeightDiff:maxTextHeight-minTextHeight,count:heights.length},timestamp:Date.now(),sessionId:'debug-session',runId:'height-measurement',hypothesisId:'H1'})}).catch(()=>{});
      }
    };
    const timeout = setTimeout(measureHeights, 500);
    return () => clearTimeout(timeout);
  }, [selectedId]);
  // #endregion

  // #region agent log
  useEffect(() => {
    BIOPHILIA_OPTIONS.forEach(opt => {
      if (opt.imageUrl) {
        fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'BiophiliaTest.tsx:useEffect',message:'Rendering biophilia option with imageUrl',data:{optionId:opt.id,score:opt.score,imageUrl:opt.imageUrl},timestamp:Date.now(),sessionId:'debug-session',runId:'image-load-check',hypothesisId:'H3'})}).catch(()=>{});
      }
    });
  }, []);
  // #endregion

  const handleSelect = (option: BiophiliaOption) => {
    setSelectedId(option.id);
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'BiophiliaTest.tsx:handleSelect',message:'User selected biophilia option',data:{optionId:option.id,score:option.score,label:option.label},timestamp:Date.now(),sessionId:'debug-session',runId:'explicit-check',hypothesisId:'E1'})}).catch(()=>{});
    // #endregion
    onSelect(option.score, option.id);
  };

  const content = (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-1 gap-1.5">
        <div className="flex items-center gap-2.5 flex-1">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-gold to-champagne flex items-center justify-center flex-shrink-0 shadow-md">
            <Leaf className="text-white" size={14} />
          </div>
          <div className="flex-1">
            <p className="text-[9px] sm:text-[10px] uppercase tracking-[0.3em] text-gold font-bold leading-none mb-0.5">
              Biophilia
            </p>
            <p className="text-xs sm:text-sm font-modern text-graphite leading-tight">
              {language === 'pl'
                ? 'Która wersja najbardziej TY?'
                : 'Which version is most YOU?'}
            </p>
          </div>
        </div>
        {selectedId && (
          <div className="flex flex-row sm:flex-col items-center sm:items-end gap-2 sm:gap-0 flex-shrink-0 bg-white/5 sm:bg-transparent p-1 sm:p-0 rounded-lg border border-white/10 sm:border-none">
            <span className="text-[9px] uppercase tracking-wider text-silver-dark opacity-70">
              {language === 'pl' ? 'Wybrano' : 'Selected'}
            </span>
            <span className="text-[10px] sm:text-xs font-bold text-gold leading-none">
              {getBiophiliaLevelLabel(
                BIOPHILIA_OPTIONS.find((o) => o.id === selectedId)?.score || 0,
                language
              )}
            </span>
          </div>
        )}
      </div>

      {/* Options Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-4">
        {BIOPHILIA_OPTIONS.map((option) => {
          const isSelected = selectedId === option.id;

          return (
            <button
              key={option.id}
              type="button"
              data-biophilia-button
              className={`rounded-2xl border overflow-hidden text-left flex flex-col transition-all min-h-[160px] sm:min-h-[220px] ${
                isSelected
                  ? 'border-gold bg-gold/10 shadow-inner shadow-gold/10'
                  : 'border-white/10 hover:border-gold/30 hover:bg-white/5'
              }`}
              style={{ 
                transform: 'translateZ(0)',
                backfaceVisibility: 'hidden',
                WebkitFontSmoothing: 'antialiased'
              }}
              onClick={() => handleSelect(option)}
            >
              {/* Image */}
              <div className="relative w-full h-24 sm:h-48 overflow-hidden rounded-t-2xl rounded-b-2xl bg-gray-200 flex-shrink-0">
                {option.imageUrl ? (
                  <Image
                    src={option.imageUrl}
                    alt={t(option.label)}
                    fill
                    sizes="(max-width: 768px) 50vw, 33vw"
                    className="object-cover"
                    style={{ objectPosition: 'center 65%' }}
                    onLoad={() => {
                      // #region agent log
                      fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'BiophiliaTest.tsx:onLoad',message:'Biophilia image loaded successfully',data:{optionId:option.id,score:option.score,imageUrl:option.imageUrl},timestamp:Date.now(),sessionId:'debug-session',runId:'image-load-check',hypothesisId:'H1'})}).catch(()=>{});
                      // #endregion
                    }}
                    onError={() => {
                      // #region agent log
                      fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'BiophiliaTest.tsx:onError',message:'Biophilia image failed to load',data:{optionId:option.id,score:option.score,imageUrl:option.imageUrl},timestamp:Date.now(),sessionId:'debug-session',runId:'image-load-check',hypothesisId:'H2'})}).catch(()=>{});
                      // #endregion
                    }}
                  />
                ) : (
                  // Placeholder if image not yet available
                  <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
                    <p className="text-4xl">{getBiophiliaEmoji(option.score)}</p>
                  </div>
                )}

                {/* Selected badge */}
                {isSelected && (
                  <div className="absolute top-2 right-2 bg-gold text-white px-2 py-1 rounded-full text-xs font-semibold z-10">
                    ✓
                  </div>
                )}

                {/* Score indicator */}
                <div className="absolute bottom-2 left-2 flex gap-1">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div
                      key={i}
                      className={`w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full ${
                        i <= option.score ? 'bg-green-500' : 'bg-white/50'
                      }`}
                    />
                  ))}
                </div>
              </div>

              {/* Label & Description */}
              <div className="px-3 sm:px-4 pt-2 sm:pt-3 pb-3 sm:pb-4 flex flex-col gap-1.5 sm:gap-2 flex-1" data-biophilia-text>
                <div className="flex items-start justify-between gap-2 sm:gap-3">
                  <h4 className="font-nasalization text-[11px] sm:text-sm text-graphite leading-tight">
                    {t(option.label)}
                  </h4>
                </div>
                <p className="text-[10px] sm:text-xs text-silver-dark font-modern leading-relaxed">
                  {t(option.description)}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Help text */}
      <div className="mt-2 flex items-center justify-between gap-4">
        <p className="text-[9px] sm:text-xs text-silver-dark font-modern flex-1 italic opacity-80">
          {language === 'pl'
            ? 'Biophilia to nasza naturalna potrzeba kontaktu z naturą'
            : 'Biophilia is our natural need for contact with nature'}
        </p>
        {stepCounter && (
          <p className="text-[9px] sm:text-xs text-silver-dark font-modern whitespace-nowrap opacity-60">
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
 * Get emoji representation of biophilia level
 */
function getBiophiliaEmoji(score: number): string {
  const emojis = ['🏢', '🌱', '🌿', '🌳'];
  return emojis[score] || '🌱';
}

/**
 * Get human-readable label for biophilia level
 */
function getBiophiliaLevelLabel(score: number, language: 'pl' | 'en'): string {
  const labels = {
    pl: ['Minimalna', 'Niska', 'Umiarkowana', 'Wysoka'],
    en: ['Minimal', 'Low', 'Moderate', 'High']
  };

  return labels[language][score] || labels[language][0];
}

/**
 * Biophilia Result Display Component
 * Shows selected level with explanation
 */
interface BiophiliaResultProps {
  score: number;
  className?: string;
}

export function BiophiliaResult({ score, className = '' }: BiophiliaResultProps) {
  const { language } = useLanguage();

  const explanations = {
    pl: [
      'Preferujesz czysto miejski, elegancki wygląd bez elementów naturalnych.',
      'Doceniasz subtelne akcenty natury - pojedyncze rośliny lub naturalne materiały.',
      'Lubisz wyraźną obecność natury - kilka roślin, drewno, dużo naturalnego światła.',
      'Kochasz obfitość natury - miejska dżungla, organiczne formy, maksimum zieleni.'
    ],
    en: [
      'You prefer a purely urban, sleek look without natural elements.',
      'You appreciate subtle nature accents - individual plants or natural materials.',
      'You like a clear presence of nature - several plants, wood, plenty of natural light.',
      'You love abundance of nature - urban jungle, organic forms, maximum greenery.'
    ]
  };

  return (
    <GlassCard className={`p-4 ${className}`}>
      <div className="flex items-center gap-4">
        <div className="text-5xl">{getBiophiliaEmoji(score)}</div>
        <div className="flex-1">
          <h4 className="font-nasalization text-lg text-gray-800 mb-1">
            {getBiophiliaLevelLabel(score, language)}{' '}
            {language === 'pl' ? 'orientacja biofiliczna' : 'biophilic orientation'}
          </h4>
          <p className="text-sm text-gray-600 font-modern">{explanations[language][score]}</p>
        </div>
      </div>
    </GlassCard>
  );
}

