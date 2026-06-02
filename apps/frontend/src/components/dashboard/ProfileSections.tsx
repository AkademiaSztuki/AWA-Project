"use client";

import React, { useMemo } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';
import { AwaScrollArea } from '@/components/ui/AwaScrollArea';
import { 
  Brain, 
  Palette, 
  Heart, 
  Home as HomeIcon,
  Image as ImageIcon,
  ChevronLeft,
  ChevronRight,
  Download,
  Sparkles,
  Leaf,
  Plus,
  Trash2,
  Eye,
  X
} from 'lucide-react';
import Image from 'next/image';
import { getPaletteLabel } from '@/components/setup/paletteOptions';
import { getStyleLabel } from '@/lib/questions/style-options';
import { translateMaterial, translateColor } from '@/lib/translations/material-translations';
import { resolveExplicitMaterialsForDisplay } from '@/lib/participants-mapper';
import {
  buildPreferenceComparisonFromSession,
  PREFERENCE_DIMENSION_UI_LABELS,
} from '@/lib/preferences/preference-comparison-registry';
import {
  translateCanonicalPreferenceToken,
  USER_FACING_COMPARISON_DIMENSIONS,
} from '@/lib/preferences/preference-canonical-labels';
import type { SessionData } from '@/types';

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
                {t('Ukryte Preferencje', 'Implicit Preferences')}
              </h3>
              <p className="text-sm text-silver-dark font-modern">
                {t('Z analizy Twoich wyborów (Tinder)', 'From your swipe choices (Tinder)')}
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
                  {translateColor(color, language)}
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
                  {translateMaterial(material, language)}
                </span>
              ))}
            </div>
          </div>
        )}
      </GlassCard>
    </motion.div>
  );
}

// Combined preferences overview (implicit + explicit in one card)
export function PreferencesOverviewSection({
  sessionData,
  visualDNA,
  onRetakeImplicit,
  onRetakeExplicit,
}: {
  sessionData: any;
  visualDNA: any;
  onRetakeImplicit?: () => void;
  onRetakeExplicit?: () => void;
}) {
  const { language } = useLanguage();

  const t = (pl: string, en: string) => (language === 'pl' ? pl : en);

  const comparison = useMemo(() => {
    if (!sessionData?.userHash) return null;
    try {
      return buildPreferenceComparisonFromSession(sessionData as SessionData);
    } catch {
      return null;
    }
  }, [sessionData]);

  const comparisonDimensions = useMemo(
    () =>
      (comparison?.dimensions ?? []).filter((d) =>
        USER_FACING_COMPARISON_DIMENSIONS.has(d.id),
      ),
    [comparison],
  );
  const hasComparisonRows = comparisonDimensions.length > 0;

  const hasExplicit = comparisonDimensions.some(
    (d) => d.explicitCanonical.length > 0,
  );
  const hasImplicit = comparisonDimensions.some(
    (d) => d.implicitCanonical.length > 0,
  ) || Boolean(visualDNA);

  if (!hasExplicit && !hasImplicit && !hasComparisonRows) return null;

  const formatPercent = (value?: number | string) => {
    if (value === undefined || value === null) return null;
    const n = typeof value === 'string' ? Number(value.trim()) : value;
    if (typeof n !== 'number' || Number.isNaN(n)) return null;
    const unit = n > 1 ? n / 100 : n;
    return Math.round(Math.max(0, Math.min(1, unit)) * 100);
  };

  const renderBar = (value?: number) => {
    const pct = formatPercent(value);
    if (pct === null) return <span className="text-silver-dark text-sm font-modern">—</span>;
    return (
      <div className="flex items-center gap-2">
        <div className="flex-1 h-2 rounded-full bg-white/15 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-gold to-champagne"
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="text-xs font-semibold text-gold">{pct}%</span>
      </div>
    );
  };

  const renderChips = (
    values?: string[],
    dimensionId?: string,
  ) => {
    if (!values || values.length === 0) {
      return <span className="text-silver-dark text-sm font-modern">—</span>;
    }
    return (
      <div className="flex gap-2 flex-wrap">
        {values.slice(0, 6).map((item, idx) => (
          <span
            key={`${item}-${idx}`}
            className="px-3 py-1 rounded-full text-xs font-modern bg-white/15 text-graphite border border-white/10"
          >
            {translateCanonicalPreferenceToken(item, language, dimensionId)}
          </span>
        ))}
      </div>
    );
  };

  const dimensionLabel = (id: string) => {
    const labels = PREFERENCE_DIMENSION_UI_LABELS[id];
    if (!labels) return id;
    return language === 'pl' ? labels.pl : labels.en;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="mb-6"
    >
      <GlassCard className="p-6 hover:border-gold/50 transition-all duration-300">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gold to-champagne flex items-center justify-center">
              <Sparkles size={20} className="text-white" />
            </div>
            <div>
              <h3 className="text-xl font-nasalization text-graphite">
                {t('Preferencje – ukryte i jawne', 'Preferences – implicit & explicit')}
              </h3>
              <p className="text-sm text-silver-dark font-modern">
                {t(
                  'Po lewej wnioski ze zdjęć (Tinder), po prawej Twoje świadome wybory z profilu.',
                  'On the left: patterns from photos (Tinder). On the right: your conscious profile choices.',
                )}
              </p>
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5">
          <div className="grid grid-cols-3 gap-3 px-4 py-3 text-xs uppercase tracking-[0.2em] text-silver-dark font-modern border-b border-white/10">
            <span>{t('Kategoria', 'Category')}</span>
            <div className="flex flex-wrap items-center gap-2">
              <span>{t('Ukryte', 'Implicit')}</span>
              {onRetakeImplicit && (
                <button
                  type="button"
                  onClick={onRetakeImplicit}
                  className="rounded-full border border-gold/25 bg-white/10 px-2.5 py-1 font-modern text-[10px] normal-case tracking-normal text-graphite transition hover:border-gold/50 hover:bg-gold/10"
                >
                  {t('Ponów test', 'Retake test')}
                </button>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span>{t('Jawne', 'Explicit')}</span>
              {onRetakeExplicit && (
                <button
                  type="button"
                  onClick={onRetakeExplicit}
                  className="rounded-full border border-gold/25 bg-white/10 px-2.5 py-1 font-modern text-[10px] normal-case tracking-normal text-graphite transition hover:border-gold/50 hover:bg-gold/10"
                >
                  {t('Ponów test', 'Retake test')}
                </button>
              )}
            </div>
          </div>
          <div className="divide-y divide-white/10">
            {comparisonDimensions.map((dim) => (
              <div
                key={dim.id}
                className="grid grid-cols-3 gap-3 px-4 py-3 items-center"
              >
                <span className="text-sm font-modern text-silver-dark">
                  {dimensionLabel(dim.id)}
                </span>
                <div className="min-h-[24px] flex items-center">
                  {dim.implicitCanonical.length > 0
                    ? renderChips(dim.implicitCanonical, dim.id)
                    : (
                      <span className="text-silver-dark text-sm font-modern">—</span>
                    )}
                </div>
                <div className="min-h-[24px] flex items-center">
                  {dim.explicitCanonical.length > 0
                    ? renderChips(dim.explicitCanonical, dim.id)
                    : (
                      <span className="text-silver-dark text-sm font-modern">—</span>
                    )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </GlassCard>
    </motion.div>
  );
}

// Explicit Preferences Section (Jawne preferencje)
export function ExplicitPreferencesSection({ sessionData }: { sessionData: any }) {
  const { language } = useLanguage();

  const t = (pl: string, en: string) => (language === 'pl' ? pl : en);

  const colorsAndMaterials = sessionData?.colorsAndMaterials;
  const sensoryPreferences = sessionData?.sensoryPreferences;
  const explicitMaterialsForDisplay = resolveExplicitMaterialsForDisplay({
    colorsAndMaterials,
    sensoryPreferences,
  });

  // Check if we have any explicit preferences
  const hasExplicitData = !!(colorsAndMaterials?.selectedStyle || 
                              colorsAndMaterials?.selectedPalette ||
                              explicitMaterialsForDisplay.length > 0 ||
                              sensoryPreferences?.light ||
                              sensoryPreferences?.texture ||
                              sensoryPreferences?.music ||
                              sensoryPreferences?.natureMetaphor);

  if (!hasExplicitData) return null;

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
              <Sparkles size={20} className="text-white" />
            </div>
            <div>
              <h3 className="text-xl font-nasalization text-graphite">
                {t('Jawne Preferencje', 'Explicit Preferences')}
              </h3>
              <p className="text-sm text-silver-dark font-modern">
                {t('Twoje świadome wybory', 'Your conscious choices')}
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {/* Style & Palette */}
          {(colorsAndMaterials?.selectedStyle || colorsAndMaterials?.selectedPalette) && (
            <div>
              <p className="text-xs text-silver-dark font-modern mb-2">
                {t('Styl i Paleta', 'Style & Palette')}
              </p>
              <div className="flex gap-2 flex-wrap">
                {colorsAndMaterials?.selectedStyle && (
                  <span className="px-3 py-1 rounded-full text-xs font-modern bg-white/20 text-graphite">
                    {getStyleLabel(colorsAndMaterials.selectedStyle, language)}
                  </span>
                )}
                {colorsAndMaterials?.selectedPalette && (
                  <span className="px-3 py-1 rounded-full text-xs font-modern bg-white/20 text-graphite">
                    {getPaletteLabel(colorsAndMaterials.selectedPalette, language) || colorsAndMaterials.selectedPalette}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Materials */}
          {explicitMaterialsForDisplay.length > 0 && (
            <div>
              <p className="text-xs text-silver-dark font-modern mb-2">
                {t('Materiały', 'Materials')}
              </p>
              <div className="flex gap-2 flex-wrap">
                {explicitMaterialsForDisplay.map((material: string, idx: number) => (
                  <span
                    key={idx}
                    className="px-3 py-1 rounded-full text-xs font-modern bg-white/20 text-graphite"
                  >
                    {translateMaterial(material, language)}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Sensory Preferences */}
          {(sensoryPreferences?.light || sensoryPreferences?.texture || sensoryPreferences?.music || sensoryPreferences?.natureMetaphor) && (
            <div>
              <p className="text-xs text-silver-dark font-modern mb-2">
                {t('Preferencje Sensoryczne', 'Sensory Preferences')}
              </p>
              <div className="space-y-1">
                {sensoryPreferences?.light && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-silver-dark font-modern w-20">{t('Światło:', 'Light:')}</span>
                    <span className="text-sm text-graphite font-modern">{sensoryPreferences.light}</span>
                  </div>
                )}
                {sensoryPreferences?.music && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-silver-dark font-modern w-20">{t('Muzyka:', 'Music:')}</span>
                    <span className="text-sm text-graphite font-modern">{sensoryPreferences.music}</span>
                  </div>
                )}
                {sensoryPreferences?.natureMetaphor && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-silver-dark font-modern w-20">{t('Metafora:', 'Metaphor:')}</span>
                    <span className="text-sm text-graphite font-modern">{sensoryPreferences.natureMetaphor}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
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
              sizes="100vw"
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

        {/* IDA Comment - moved to dialogue at bottom */}
      </GlassCard>
    </motion.div>
  );
}

// Helper to get image URL from various formats
function getImageUrl(item: any): string | null {
  // Check all possible image fields
  if (item.url) return item.url;
  if (item.imageBase64) return item.imageBase64;
  if (item.image) return item.image;
  if (item.base64) return item.base64.startsWith('data:') ? item.base64 : `data:image/png;base64,${item.base64}`;
  if (item.previewUrl) return item.previewUrl;
  if (item.thumbnailUrl) return item.thumbnailUrl;
  return null;
}

// Inspirations Preview Section
export function InspirationsPreviewSection({ 
  inspirations, 
  onViewAll,
  onAddInspirations,
  onDeleteInspiration,
  explicitBiophilia
}: { 
  inspirations: any[]; 
  onViewAll?: () => void;
  onAddInspirations?: () => void;
  onDeleteInspiration?: (inspiration: any) => void;
  explicitBiophilia?: number; // 0-3 skala z ankiety/roomPreferences
}) {
  const { language } = useLanguage();
  const [isExpanded, setIsExpanded] = React.useState(false);
  const [imageErrors, setImageErrors] = React.useState<Set<number>>(new Set());

  const t = (pl: string, en: string) => (language === 'pl' ? pl : en);

  // Show empty state with add button if no inspirations
  if (!inspirations || inspirations.length === 0) {
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
                <Heart size={20} className="text-white" />
              </div>
              <div>
                <h3 className="text-xl font-nasalization text-graphite">
                  {t('Inspiracje', 'Inspirations')}
                </h3>
                <p className="text-sm text-silver-dark font-modern">
                  {t('Dodaj zdjęcia wnętrz, które Ci się podobają', 'Add interior photos you like')}
                </p>
              </div>
            </div>
          </div>
          
          {onAddInspirations && (
            <button
              onClick={onAddInspirations}
              className="w-full py-4 border-2 border-dashed border-gold/30 rounded-lg 
                       hover:border-gold/60 hover:bg-gold/5 transition-all duration-200
                       flex items-center justify-center gap-2 text-gold font-modern"
            >
              <Plus size={20} />
              {t('Dodaj inspiracje', 'Add inspirations')}
            </button>
          )}
        </GlassCard>
      </motion.div>
    );
  }
  
  // Get all inspirations with valid images
  const allValidInspirations = inspirations.map((insp, idx) => ({
    ...insp,
    _idx: idx,
    _imageUrl: getImageUrl(insp)
  })).filter(i => i._imageUrl !== null);
  
  // Show 4 when collapsed, all when expanded
  const displayInspirations = isExpanded 
    ? allValidInspirations
    : allValidInspirations.slice(0, 4);
  
  const totalWithImages = allValidInspirations.length;
  const remainingCount = isExpanded ? 0 : Math.max(0, totalWithImages - 4);

  // Calculate aggregated biophilia
  const inspirationBiophiliaAvg = (() => {
    if (!inspirations || inspirations.length === 0) return NaN;
    const sum = inspirations.reduce((acc, i) => {
      const val = typeof i.tags?.biophilia === 'number' && !Number.isNaN(i.tags.biophilia)
        ? i.tags.biophilia
        : 0;
      return acc + val;
    }, 0);
    return sum / inspirations.length; // dzielimy przez wszystkie
  })();

  // Ujednolicenie z pipeline: normalizuj do 0-1, clamp do explicit (0-3)
  const inspirationNorm = !Number.isNaN(inspirationBiophiliaAvg)
    ? (inspirationBiophiliaAvg > 1 ? inspirationBiophiliaAvg / 3 : inspirationBiophiliaAvg)
    : NaN;
  const explicitNorm = explicitBiophilia !== undefined
    ? (explicitBiophilia > 1 ? explicitBiophilia / 3 : explicitBiophilia)
    : undefined;
  const clampedNorm = !Number.isNaN(inspirationNorm)
    ? (explicitNorm !== undefined ? Math.min(inspirationNorm, explicitNorm) : inspirationNorm)
    : NaN;
  const avgBiophilia = Number.isNaN(clampedNorm) ? NaN : clampedNorm * 3; // prezentacja 0-3

  const handleImageError = (idx: number) => {
    setImageErrors(prev => new Set(prev).add(idx));
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="mb-6"
    >
      <GlassCard className="p-6 hover:border-gold/50 transition-all duration-300">
        <div className="flex items-center justify-between mb-4 gap-3">
          <div 
            className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gold to-champagne flex items-center justify-center flex-shrink-0">
              <Heart size={20} className="text-white" />
            </div>
            <div className="min-w-0">
              <h3 className="text-xl font-nasalization text-graphite">
                {t('Inspiracje', 'Inspirations')}
              </h3>
              <p className="text-sm text-silver-dark font-modern">
                {totalWithImages} {t('obrazków', 'images')}
                {totalWithImages < inspirations.length && ` (${inspirations.length - totalWithImages} ${t('bez podglądu', 'no preview')})`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {onViewAll && (
              <div 
                className="flex items-center text-gold cursor-pointer hover:text-champagne transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  onViewAll();
                }}
              >
                <Eye size={20} />
              </div>
            )}
            <ChevronRight 
              size={24} 
              className={`text-gold transition-transform duration-200 cursor-pointer ${isExpanded ? 'rotate-90' : ''}`}
              onClick={() => setIsExpanded(!isExpanded)}
            />
          </div>
        </div>

        {/* Images Grid */}
        <AwaScrollArea
          variant="auto"
          className={`mb-4${isExpanded ? ' max-h-[500px]' : ''}`}
          autoHide={isExpanded}
        >
        <motion.div 
          className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2"
          initial={false}
          animate={{ height: isExpanded ? 'auto' : 'auto' }}
        >
          {displayInspirations.map((insp) => {
            if (imageErrors.has(insp._idx)) {
              return (
                <div key={insp._idx} className="relative aspect-square rounded-lg overflow-hidden bg-white/10 flex items-center justify-center">
                  <ImageIcon size={24} className="text-silver-dark" />
                </div>
              );
            }
            
            return (
              <div key={insp._idx} className="relative aspect-square rounded-lg overflow-hidden bg-white/5">
                <Image
                  src={insp._imageUrl}
                  alt={`Inspiration ${insp._idx + 1}`}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 25vw, 20vw"
                  onError={() => handleImageError(insp._idx)}
                  unoptimized={insp._imageUrl?.startsWith('data:')}
                />
                
                {onDeleteInspiration && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteInspiration(insp);
                    }}
                    className="absolute top-1 right-1 w-8 h-8 rounded-full bg-black/50 hover:bg-black/70 border border-white/20 flex items-center justify-center transition-colors"
                    aria-label={t('Usuń inspirację', 'Delete inspiration')}
                  >
                    <Trash2 size={16} className="text-white" />
                  </button>
                )}
              </div>
            );
          })}
        </motion.div>
        </AwaScrollArea>

        {/* Show remaining count or add more button */}
        <div className="mt-4 pt-4 border-t border-white/20 flex items-center justify-between gap-4">
          {remainingCount > 0 ? (
            <p className="text-sm text-silver-dark font-modern cursor-pointer hover:text-gold transition-colors"
               onClick={() => setIsExpanded(true)}>
              +{remainingCount} {t('więcej', 'more')}
            </p>
          ) : (
            <div></div>
          )}
          
          {onAddInspirations && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onAddInspirations();
              }}
              className="flex items-center gap-1 text-sm text-gold hover:text-champagne transition-colors font-modern"
            >
              <Plus size={16} />
              {t('Dodaj więcej', 'Add more')}
            </button>
          )}
        </div>

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

// Generation Stats Section with expandable images
export function GenerationStatsSection({
  generations,
  generatedImages,
  onToggleFavorite,
  onDeleteGeneratedImage,
}: {
  generations: any[];
  generatedImages?: any[];
  onToggleFavorite?: (imageId?: string, imageUrl?: string) => void;
  onDeleteGeneratedImage?: (imageId: string) => void | Promise<void>;
}) {
  const { language } = useLanguage();
  const [isExpanded, setIsExpanded] = React.useState(false);
  const [imageErrors, setImageErrors] = React.useState<Set<number>>(new Set());
  /** Index into normalizedImages (not `_idx`). */
  const [zoomedIndex, setZoomedIndex] = React.useState<number | null>(null);
  const [portalReady, setPortalReady] = React.useState(false);

  const totalGenerations = generations?.length || 0;

  // Handle both string[] and object[] formats for generatedImages
  const normalizedImages = React.useMemo(
    () =>
      (generatedImages || [])
        .map((img, idx) => {
          if (typeof img === 'string') {
            return {
              _idx: idx,
              _imageUrl: img.startsWith('data:') ? img : `data:image/png;base64,${img}`,
              _isFavorite: false,
              _id: undefined as string | undefined,
            };
          }
          return {
            _idx: idx,
            _imageUrl: getImageUrl(img),
            _isFavorite: !!(img as any)?.isFavorite,
            _id: (img as any)?.id as string | undefined,
          };
        })
        .filter((img) => img._imageUrl !== null),
    [generatedImages],
  );

  const totalImages = normalizedImages.length;

  const t = (pl: string, en: string) => (language === 'pl' ? pl : en);

  const zoomedSlide = zoomedIndex !== null ? normalizedImages[zoomedIndex] : null;

  React.useEffect(() => {
    setPortalReady(true);
  }, []);

  React.useEffect(() => {
    if (zoomedIndex !== null && zoomedIndex >= normalizedImages.length) {
      setZoomedIndex(null);
    }
  }, [zoomedIndex, normalizedImages.length]);

  React.useEffect(() => {
    if (zoomedIndex === null) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [zoomedIndex]);

  React.useEffect(() => {
    if (zoomedIndex === null) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setZoomedIndex(null);
        return;
      }
      if (e.key === 'ArrowLeft') {
        setZoomedIndex((i) => (i !== null && i > 0 ? i - 1 : i));
      } else if (e.key === 'ArrowRight') {
        setZoomedIndex((i) =>
          i !== null && i < normalizedImages.length - 1 ? i + 1 : i,
        );
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [zoomedIndex, normalizedImages.length]);

  const isUuid = (id: string | undefined): boolean =>
    !!id &&
    /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(
      id,
    );

  const handleDownloadImage = (url: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = `image-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDeleteZoomed = async () => {
    if (!zoomedSlide?._id || !onDeleteGeneratedImage || !isUuid(zoomedSlide._id)) return;
    await onDeleteGeneratedImage(zoomedSlide._id);
    setZoomedIndex(null);
  };

  if (totalGenerations === 0 && totalImages === 0) return null;
  
  const displayImages = isExpanded ? normalizedImages : normalizedImages.slice(0, 4);
  const remainingCount = isExpanded ? 0 : Math.max(0, totalImages - 4);

  const handleImageError = (idx: number) => {
    setImageErrors(prev => new Set(prev).add(idx));
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="mb-6"
    >
      <GlassCard className="p-6">
        <div 
          className="flex items-center justify-between mb-4 cursor-pointer"
          onClick={() => totalImages > 0 && setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gold to-champagne flex items-center justify-center">
              <Sparkles size={20} className="text-white" />
            </div>
            <div>
              <h3 className="text-xl font-nasalization text-graphite">
                {t('Wygenerowane Obrazy', 'Generated Images')}
              </h3>
              <p className="text-sm text-silver-dark font-modern">
                {totalImages} {t('obrazków', 'images')} • {totalGenerations} {t('sesji', 'sessions')}
              </p>
            </div>
          </div>
          {totalImages > 0 && (
            <ChevronRight 
              size={24} 
              className={`text-gold transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}
            />
          )}
        </div>

        {/* Images Grid */}
        {totalImages > 0 && (
          <AwaScrollArea
            variant="auto"
            className={`mb-4${isExpanded ? ' max-h-[500px]' : ''}`}
            autoHide={isExpanded}
          >
          <motion.div 
            className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2"
            initial={false}
          >
            {displayImages.map((img) => {
              if (imageErrors.has(img._idx)) {
                return (
                  <div key={img._idx} className="relative aspect-square rounded-lg overflow-hidden bg-white/10 flex items-center justify-center">
                    <ImageIcon size={24} className="text-silver-dark" />
                  </div>
                );
              }
              
              return (
                <div key={img._idx} className="group relative aspect-square rounded-lg overflow-hidden bg-white/5">
                  <Image
                    src={img._imageUrl!}
                    alt={`Generated ${img._idx + 1}`}
                    fill
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                    sizes="(max-width: 768px) 25vw, 20vw"
                    onError={() => handleImageError(img._idx)}
                    unoptimized={img._imageUrl?.startsWith('data:')}
                  />
                  <button
                    type="button"
                    className="absolute inset-0 z-10 cursor-zoom-in focus:outline-none focus:ring-2 focus:ring-gold focus:ring-offset-2 focus:ring-offset-transparent"
                    onClick={() => {
                      const listIndex = normalizedImages.findIndex((x) => x._idx === img._idx);
                      setZoomedIndex(listIndex >= 0 ? listIndex : null);
                    }}
                    aria-label={t('Powiększ obraz', 'Zoom image')}
                  />
                  {onToggleFavorite && (
                    <button
                      className="absolute top-2 right-2 z-20 w-8 h-8 rounded-full bg-black/35 hover:bg-black/50 border border-white/20 flex items-center justify-center transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleFavorite(img._id, img._imageUrl!);
                      }}
                      aria-label={img._isFavorite ? 'Unfavorite' : 'Favorite'}
                    >
                      <Heart
                        size={16}
                        className={img._isFavorite ? 'text-gold' : 'text-white'}
                        fill={img._isFavorite ? '#E2B66B' : 'none'}
                      />
                    </button>
                  )}
                </div>
              );
            })}
          </motion.div>
          </AwaScrollArea>
        )}

        {remainingCount > 0 && (
          <p className="text-sm text-center text-silver-dark font-modern cursor-pointer hover:text-gold transition-colors"
             onClick={() => setIsExpanded(true)}>
            +{remainingCount} {t('więcej', 'more')}
          </p>
        )}

        {/* Stats summary when no images */}
        {totalImages === 0 && totalGenerations > 0 && (
          <div className="text-center p-4 rounded-lg bg-white/10">
            <p className="text-3xl font-nasalization text-gold">{totalGenerations}</p>
            <p className="text-xs text-silver-dark font-modern">
              {t('Sesji generowania', 'Generation sessions')}
            </p>
          </div>
        )}
      </GlassCard>

      {portalReady &&
        createPortal(
          <AnimatePresence>
            {zoomedIndex !== null && zoomedSlide ? (
              <motion.div
                key="dashboard-generated-lightbox"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="fixed inset-0 z-[300] flex flex-col items-center justify-center bg-black/80 px-1.5 py-4 sm:px-4 md:px-8 md:py-8"
                onClick={() => setZoomedIndex(null)}
                role="dialog"
                aria-modal="true"
                aria-label={t('Powiększone zdjęcie', 'Zoomed image')}
              >
                <div className="mx-auto flex min-h-0 w-full max-w-screen-2xl flex-1 flex-col xl:grid xl:grid-cols-[minmax(320px,0.3fr)_minmax(400px,0.7fr)] xl:items-start xl:gap-10">
                  <div className="hidden xl:block" aria-hidden="true" />
                  <div className="flex min-h-0 w-full flex-col items-center justify-center">
                    <motion.div
                      initial={{ scale: 0.9 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0.9 }}
                      transition={{ duration: 0.2 }}
                      className="relative flex w-full max-h-[calc(100vh-8rem)] flex-col items-center justify-center"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="relative flex min-h-0 w-full flex-1 items-center justify-center">
                        <div
                          className="relative flex h-[calc(100vh-14rem)] w-full items-center justify-center overflow-hidden rounded-3xl"
                          style={{ borderRadius: '1.5rem' }}
                        >
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setZoomedIndex(null);
                            }}
                            className="absolute right-3 top-3 z-30 flex h-10 w-10 items-center justify-center rounded-full bg-black/45 backdrop-blur-sm transition-colors hover:bg-black/60 sm:right-4 sm:top-4"
                            aria-label={t('Zamknij', 'Close')}
                          >
                            <X size={22} className="text-white" aria-hidden="true" />
                          </button>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={zoomedSlide._imageUrl!}
                            alt={t('Powiększone wygenerowane wnętrze', 'Zoomed generated interior')}
                            className="max-h-full max-w-full h-auto w-auto object-contain object-center"
                            style={{ borderRadius: 'inherit' }}
                          />
                        </div>

                        {totalImages > 1 && zoomedIndex > 0 && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setZoomedIndex((i) => (i !== null && i > 0 ? i - 1 : i));
                            }}
                            className="absolute left-2 top-1/2 z-10 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/20 transition-colors hover:bg-white/40"
                            aria-label={t('Poprzednie zdjęcie', 'Previous image')}
                          >
                            <ChevronLeft size={28} className="text-white" aria-hidden="true" />
                          </button>
                        )}
                        {totalImages > 1 && zoomedIndex < totalImages - 1 && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setZoomedIndex((i) =>
                                i !== null && i < totalImages - 1 ? i + 1 : i,
                              );
                            }}
                            className="absolute right-14 top-1/2 z-10 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/20 transition-colors hover:bg-white/40 sm:right-16"
                            aria-label={t('Następne zdjęcie', 'Next image')}
                          >
                            <ChevronRight size={28} className="text-white" aria-hidden="true" />
                          </button>
                        )}
                      </div>

                      <div className="-mt-2 flex flex-shrink-0 justify-center gap-2 sm:-mt-3">
                        <GlassButton
                          type="button"
                          onClick={() => handleDownloadImage(zoomedSlide._imageUrl!)}
                          variant="secondary"
                          className="text-white hover:text-white"
                        >
                          <Download size={20} className="mr-2" />
                          {t('Pobierz', 'Download')}
                        </GlassButton>
                        {onDeleteGeneratedImage && isUuid(zoomedSlide._id) && (
                          <GlassButton
                            type="button"
                            onClick={() => void handleDeleteZoomed()}
                            variant="secondary"
                            className="bg-red-500/25 text-white hover:bg-red-500/45 hover:text-white"
                          >
                            <Trash2 size={20} className="mr-2" />
                            {t('Usuń', 'Delete')}
                          </GlassButton>
                        )}
                      </div>
                    </motion.div>
                  </div>
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>,
          document.body,
        )}
    </motion.div>
  );
}
