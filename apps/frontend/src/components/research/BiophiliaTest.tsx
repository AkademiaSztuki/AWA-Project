"use client";

import React, { useState } from 'react';
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
export function BiophiliaTest({ onSelect, className = '', frameless = false }: BiophiliaTestProps) {
  const { t, language } = useLanguage();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const handleSelect = (option: BiophiliaOption) => {
    setSelectedId(option.id);
    onSelect(option.score, option.id);
  };

  const content = (
    <>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gold to-champagne flex items-center justify-center">
            <Leaf className="text-white" size={20} />
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-silver-dark">
              Biophilia
            </p>
            <p className="text-sm font-modern text-graphite">
              {language === 'pl'
                ? 'Która wersja najbardziej TY?'
                : 'Which version is most YOU?'}
            </p>
          </div>
        </div>
        {selectedId && (
          <p className="text-xs text-right text-silver-dark">
            {language === 'pl' ? 'Wybrano:' : 'Selected:'}{' '}
            <span className="font-semibold text-graphite">
              {getBiophiliaLevelLabel(
                BIOPHILIA_OPTIONS.find((o) => o.id === selectedId)?.score || 0,
                language
              )}
            </span>
          </p>
        )}
      </div>

      {/* Options Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 content-center">
        {BIOPHILIA_OPTIONS.map((option) => {
          const isSelected = selectedId === option.id;

          return (
            <button
              key={option.id}
              type="button"
              className={`rounded-2xl border px-4 py-4 text-left flex flex-col gap-3 transition-all ${
                isSelected
                  ? 'border-gold bg-gold/10 shadow-inner shadow-gold/10'
                  : 'border-white/10 hover:border-gold/30 hover:bg-white/5'
              }`}
              onClick={() => handleSelect(option)}
            >
              {/* Image */}
              <div className="relative w-full h-32 overflow-hidden rounded-xl bg-gray-200">
                {option.imageUrl ? (
                  <Image
                    src={option.imageUrl}
                    alt={t(option.label)}
                    fill
                    sizes="(max-width: 768px) 50vw, 33vw"
                    className="object-cover"
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
                      className={`w-1.5 h-1.5 rounded-full ${
                        i <= option.score ? 'bg-green-500' : 'bg-white/50'
                      }`}
                    />
                  ))}
                </div>
              </div>

              {/* Label & Description */}
              <div className="flex items-start justify-between gap-3">
                <h4 className="font-nasalization text-sm text-graphite">
                  {t(option.label)}
                </h4>
              </div>
              <p className="text-xs text-silver-dark font-modern leading-relaxed">
                {t(option.description)}
              </p>
            </button>
          );
        })}
      </div>

      {/* Help text */}
      <p className="mt-4 text-xs text-center text-silver-dark font-modern">
        {language === 'pl'
          ? 'Biophilia to nasza naturalna potrzeba kontaktu z naturą - pomaga nam zaprojektować przestrzeń która Cię wspiera'
          : 'Biophilia is our natural need for contact with nature - helps us design a space that supports you'}
      </p>
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

