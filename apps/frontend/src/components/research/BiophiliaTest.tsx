"use client";

import React, { useState } from 'react';
import { BIOPHILIA_OPTIONS, BiophiliaOption } from '@/lib/questions/validated-scales';
import { useLanguage } from '@/contexts/LanguageContext';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';
import Image from 'next/image';

interface BiophiliaTestProps {
  onSelect: (score: number, optionId: string) => void;
  className?: string;
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
export function BiophiliaTest({ onSelect, className = '' }: BiophiliaTestProps) {
  const { t, language } = useLanguage();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const handleSelect = (option: BiophiliaOption) => {
    setSelectedId(option.id);
    onSelect(option.score, option.id);
  };

  return (
    <GlassCard className={`p-6 ${className}`}>
      {/* Title */}
      <div className="text-center mb-6">
        <h3 className="text-2xl lg:text-3xl font-nasalization text-gray-800 mb-2">
          {language === 'pl' 
            ? 'Która wersja najbardziej TY?' 
            : 'Which version is most YOU?'}
        </h3>
        <p className="text-sm text-gray-600 font-modern">
          {language === 'pl'
            ? 'Wybierz pokój który czujesz jako swój - naturalna obecność i rośliny'
            : 'Choose the room that feels like you - nature presence and plants'}
        </p>
      </div>

      {/* Options Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {BIOPHILIA_OPTIONS.map((option) => {
          const isSelected = selectedId === option.id;
          const isHovered = hoveredId === option.id;

          return (
            <div
              key={option.id}
              className={`relative cursor-pointer transition-all duration-300 transform ${
                isSelected ? 'scale-105' : isHovered ? 'scale-102' : 'scale-100'
              }`}
              onMouseEnter={() => setHoveredId(option.id)}
              onMouseLeave={() => setHoveredId(null)}
              onClick={() => handleSelect(option)}
            >
              <div
                className={`glass-panel rounded-lg overflow-hidden border-2 transition-all ${
                  isSelected
                    ? 'border-gold-500 shadow-xl'
                    : isHovered
                    ? 'border-gold-300'
                    : 'border-white/30'
                }`}
              >
                {/* Image */}
                <div className="relative w-full h-48 bg-gray-200">
                  {option.imageUrl ? (
                    <Image
                      src={option.imageUrl}
                      alt={t(option.label)}
                      fill
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
                    <div className="absolute top-2 right-2 bg-gold-500 text-white px-3 py-1 rounded-full text-sm font-semibold">
                      ✓ {language === 'pl' ? 'Wybrane' : 'Selected'}
                    </div>
                  )}

                  {/* Score indicator */}
                  <div className="absolute bottom-2 left-2 flex gap-1">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <div
                        key={i}
                        className={`w-2 h-2 rounded-full ${
                          i <= option.score ? 'bg-green-500' : 'bg-gray-300'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                {/* Label & Description */}
                <div className="p-4">
                  <h4 className="font-nasalization text-lg text-gray-800 mb-1">
                    {t(option.label)}
                  </h4>
                  <p className="text-sm text-gray-600 font-modern">
                    {t(option.description)}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Option Summary */}
      {selectedId && (
        <div className="mt-6 text-center">
          <div className="inline-block glass-panel px-6 py-3 rounded-full">
            <p className="text-sm font-modern text-gray-700">
              {language === 'pl' ? 'Twój poziom biofilii:' : 'Your biophilia level:'}{' '}
              <span className="font-semibold text-green-600">
                {getBiophiliaLevelLabel(
                  BIOPHILIA_OPTIONS.find((o) => o.id === selectedId)?.score || 0,
                  language
                )}
              </span>
            </p>
          </div>
        </div>
      )}

      {/* Help text */}
      <div className="mt-4 text-xs text-center text-gray-500 font-modern">
        {language === 'pl'
          ? 'Biophilia to nasza naturalna potrzeba kontaktu z naturą - pomaga nam zaprojektować przestrzeń która Cię wspiera'
          : 'Biophilia is our natural need for contact with nature - helps us design a space that supports you'}
      </div>
    </GlassCard>
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

