"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import { GlassCard } from '@/components/ui/GlassCard';
import { 
  Brain, 
  Palette, 
  Target, 
  Heart, 
  Home as HomeIcon,
  Image as ImageIcon,
  ChevronRight,
  Sparkles,
  Leaf
} from 'lucide-react';
import Image from 'next/image';

// Visual DNA Section
export function VisualDNASection({ visualDNA }: { visualDNA: any }) {
  const { language } = useLanguage();
  const router = useRouter();

  if (!visualDNA) return null;

  const t = (pl: string, en: string) => (language === 'pl' ? pl : en);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="mb-6"
    >
      <GlassCard className="p-6 hover:border-gold/50 transition-all duration-300">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gold to-champagne flex items-center justify-center">
              <Palette size={20} className="text-white" />
            </div>
            <div>
              <h3 className="text-xl font-nasalization text-graphite">
                {t('Visual DNA', 'Visual DNA')}
              </h3>
              <p className="text-sm text-silver-dark font-modern">
                {t('Twoje preferencje wizualne', 'Your visual preferences')}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          {/* Dominant Style */}
          <div>
            <p className="text-xs text-silver-dark font-modern mb-1">
              {t('Dominujący Styl', 'Dominant Style')}
            </p>
            <p className="text-lg font-nasalization text-gold">
              {visualDNA.dominantStyle || t('Nieokreślony', 'Undefined')}
            </p>
          </div>

          {/* Accuracy */}
          <div>
            <p className="text-xs text-silver-dark font-modern mb-1">
              {t('Dokładność', 'Accuracy')}
            </p>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-white/20 rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-gold to-champagne h-2 rounded-full"
                  style={{ width: `${Math.max(0, Math.min(100, (visualDNA.accuracyScore || 0) > 1 ? visualDNA.accuracyScore : (visualDNA.accuracyScore || 0) * 100))}%` }}
                />
              </div>
              <span className="text-sm font-bold text-gold">
                {Math.round((visualDNA.accuracyScore || 0) > 1 ? (visualDNA.accuracyScore || 0) : (visualDNA.accuracyScore || 0) * 100)}%
              </span>
            </div>
          </div>
        </div>

        {/* Color Palette */}
        {visualDNA.preferences?.colors && visualDNA.preferences.colors.length > 0 && (
          <div className="mb-3">
            <p className="text-xs text-silver-dark font-modern mb-2">
              {t('Paleta Kolorów', 'Color Palette')}
            </p>
            <div className="flex gap-2 flex-wrap">
              {visualDNA.preferences.colors.map((color: string, idx: number) => (
                <span
                  key={idx}
                  className="px-3 py-1 rounded-full text-xs font-modern bg-white/20 text-graphite"
                >
                  {color}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Materials */}
        {visualDNA.preferences?.materials && visualDNA.preferences.materials.length > 0 && (
          <div>
            <p className="text-xs text-silver-dark font-modern mb-2">
              {t('Materiały', 'Materials')}
            </p>
            <div className="flex gap-2 flex-wrap">
              {visualDNA.preferences.materials.map((material: string, idx: number) => (
                <span
                  key={idx}
                  className="px-3 py-1 rounded-full text-xs font-modern bg-white/20 text-graphite"
                >
                  {material}
                </span>
              ))}
            </div>
          </div>
        )}
      </GlassCard>
    </motion.div>
  );
}

// Laddering / Core Needs Section
export function CoreNeedsSection({ ladderResults }: { ladderResults: any }) {
  const { language } = useLanguage();

  if (!ladderResults) return null;

  const t = (pl: string, en: string) => (language === 'pl' ? pl : en);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="mb-6"
    >
      <GlassCard className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gold to-platinum flex items-center justify-center">
              <Target size={20} className="text-white" />
            </div>
            <div>
              <h3 className="text-xl font-nasalization text-graphite">
                {t('Podstawowa Potrzeba', 'Core Need')}
              </h3>
              <p className="text-sm text-silver-dark font-modern">
                {t('Twój główny motyw', 'Your main motivation')}
              </p>
            </div>
          </div>
        </div>

        {/* Core Need Badge */}
        <div className="text-center py-4 mb-4">
          <div className="inline-block px-4 py-2 rounded-2xl glass-panel border border-gold/40 text-graphite">
            <p className="text-lg font-nasalization">
              {ladderResults.coreNeed || t('Nieokreślona', 'Undefined')}
            </p>
          </div>
        </div>

        {/* Laddering Path */}
        {ladderResults.path && ladderResults.path.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs text-silver-dark font-modern mb-2">
              {t('Ścieżka Wyboru', 'Choice Path')}
            </p>
            {ladderResults.path.map((step: any, idx: number) => (
              <div key={idx} className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-gold to-champagne flex items-center justify-center text-white text-xs font-bold">
                  {step.level}
                </div>
                <span className="text-sm text-graphite font-modern">
                  {step.selectedAnswer}
                </span>
              </div>
            ))}
          </div>
        )}
      </GlassCard>
    </motion.div>
  );
}

// Room Analysis Section
export function RoomAnalysisSection({ roomAnalysis, roomImage }: { roomAnalysis: any; roomImage?: string }) {
  const { language } = useLanguage();

  if (!roomAnalysis) return null;

  const t = (pl: string, en: string) => (language === 'pl' ? pl : en);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="mb-6"
    >
      <GlassCard className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gold to-platinum flex items-center justify-center">
              <HomeIcon size={20} className="text-white" />
            </div>
            <div>
              <h3 className="text-xl font-nasalization text-graphite">
                {t('Analiza Pokoju', 'Room Analysis')}
              </h3>
              <p className="text-sm text-silver-dark font-modern">
                {t('Twoja przestrzeń', 'Your space')}
              </p>
            </div>
          </div>
        </div>

        {/* Room Image */}
        {roomImage && (
          <div className="relative w-full h-48 rounded-xl overflow-hidden mb-4">
            <Image
              src={roomImage}
              alt="Room"
              fill
              className="object-cover"
            />
          </div>
        )}

        {/* Detected Room Type */}
        <div className="mb-3">
          <p className="text-xs text-silver-dark font-modern mb-1">
            {t('Wykryty Typ Pokoju', 'Detected Room Type')}
          </p>
          <p className="text-lg font-nasalization text-gold">
            {roomAnalysis.detected_room_type}
          </p>
          {roomAnalysis.confidence && (
            <p className="text-xs text-silver-dark font-modern">
              {t('Pewność:', 'Confidence:')} {Math.round(roomAnalysis.confidence * 100)}%
            </p>
          )}
        </div>

        {/* Description */}
        {roomAnalysis.room_description && (
          <div className="mb-3">
            <p className="text-xs text-silver-dark font-modern mb-1">
              {t('Opis', 'Description')}
            </p>
            <p className="text-sm text-graphite font-modern">
              {roomAnalysis.room_description}
            </p>
          </div>
        )}

        {/* IDA Comment */}
        {roomAnalysis.human_comment && (
          <div className="mt-4 pt-4 border-t border-white/20">
            <p className="text-xs text-silver-dark font-modern mb-1">
              {t('Komentarz IDA', 'IDA Comment')}
            </p>
            <p className="text-sm text-graphite font-modern italic">
              "{roomAnalysis.human_comment}"
            </p>
          </div>
        )}
      </GlassCard>
    </motion.div>
  );
}

// Inspirations Preview Section
export function InspirationsPreviewSection({ inspirations, onViewAll }: { inspirations: any[]; onViewAll?: () => void }) {
  const { language } = useLanguage();

  if (!inspirations || inspirations.length === 0) return null;

  const t = (pl: string, en: string) => (language === 'pl' ? pl : en);
  
  const displayInspirations = inspirations.filter(i => i.url).slice(0, 4);
  const remainingCount = Math.max(0, inspirations.length - 4);

  // Calculate aggregated biophilia
  const avgBiophilia = inspirations
    .filter(i => i.tags?.biophilia !== undefined)
    .reduce((sum, i) => sum + (i.tags?.biophilia || 0), 0) / inspirations.length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="mb-6"
      onClick={onViewAll}
      style={{ cursor: onViewAll ? 'pointer' : 'default' }}
    >
      <GlassCard className="p-6 hover:border-gold/50 transition-all duration-300">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gold to-champagne flex items-center justify-center">
              <Heart size={20} className="text-white" />
            </div>
            <div>
              <h3 className="text-xl font-nasalization text-graphite">
                {t('Inspiracje', 'Inspirations')}
              </h3>
              <p className="text-sm text-silver-dark font-modern">
                {inspirations.length} {t('obrazków', 'images')}
              </p>
            </div>
          </div>
          <ChevronRight size={24} className="text-gold" />
        </div>

        {/* Images Grid */}
        <div className="grid grid-cols-4 gap-2 mb-4">
          {displayInspirations.map((insp, idx) => (
            <div key={idx} className="relative aspect-square rounded-lg overflow-hidden">
              <Image
                src={insp.url!}
                alt={`Inspiration ${idx + 1}`}
                fill
                className="object-cover"
              />
            </div>
          ))}
        </div>

        {remainingCount > 0 && (
          <p className="text-sm text-center text-silver-dark font-modern">
            +{remainingCount} {t('więcej', 'more')}
          </p>
        )}

        {/* Biophilia Score */}
        {!isNaN(avgBiophilia) && avgBiophilia > 0 && (
          <div className="mt-4 pt-4 border-t border-white/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Leaf size={16} className="text-gold" />
                <span className="text-xs text-silver-dark font-modern">
                  {t('Poziom Natury', 'Nature Level')}
                </span>
              </div>
              <span className="text-sm font-bold text-gold">
                {avgBiophilia.toFixed(1)} / 3
              </span>
            </div>
          </div>
        )}
      </GlassCard>
    </motion.div>
  );
}

// Generation Stats Section
export function GenerationStatsSection({ generations, generatedImages }: { generations: any[]; generatedImages?: string[] }) {
  const { language } = useLanguage();

  const totalGenerations = generations?.length || 0;
  const totalImages = generatedImages?.length || 0;

  if (totalGenerations === 0 && totalImages === 0) return null;

  const t = (pl: string, en: string) => (language === 'pl' ? pl : en);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="mb-6"
    >
      <GlassCard className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gold to-champagne flex items-center justify-center">
            <Sparkles size={20} className="text-white" />
          </div>
          <div>
            <h3 className="text-xl font-nasalization text-graphite">
              {t('Statystyki Generowania', 'Generation Stats')}
            </h3>
            <p className="text-sm text-silver-dark font-modern">
              {t('Twoja aktywność', 'Your activity')}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-4 rounded-lg bg-white/10">
            <p className="text-3xl font-nasalization text-gold">{totalGenerations}</p>
            <p className="text-xs text-silver-dark font-modern">
              {t('Sesji generowania', 'Generation sessions')}
            </p>
          </div>
          <div className="text-center p-4 rounded-lg bg-white/10">
            <p className="text-3xl font-nasalization text-gold">{totalImages}</p>
            <p className="text-xs text-silver-dark font-modern">
              {t('Wygenerowanych obrazków', 'Generated images')}
            </p>
          </div>
        </div>
      </GlassCard>
    </motion.div>
  );
}
