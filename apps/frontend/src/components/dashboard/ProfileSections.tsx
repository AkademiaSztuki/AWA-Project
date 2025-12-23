"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import { GlassCard } from '@/components/ui/GlassCard';
import { 
  Brain, 
  Palette, 
  Heart, 
  Home as HomeIcon,
  Image as ImageIcon,
  ChevronRight,
  Sparkles,
  Leaf,
  Plus,
  Trash2,
  Eye
} from 'lucide-react';
import Image from 'next/image';
import { getPaletteLabel } from '@/components/setup/paletteOptions';
import { getStyleLabel } from '@/lib/questions/style-options';
import { translateMaterial, translateColor } from '@/lib/translations/material-translations';

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
  visualDNA
}: {
  sessionData: any;
  visualDNA: any;
}) {
  const { language } = useLanguage();

  // #region agent log
  React.useEffect(() => {
    void fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: 'debug-session',
        runId: 'dashboard-render',
        hypothesisId: 'D1',
        location: 'ProfileSections.tsx:PreferencesOverviewSection',
        message: 'PreferencesOverviewSection render data',
        data: {
          hasVisualDNA: !!visualDNA,
          visualDNAStyle: visualDNA?.dominantStyle,
          visualDNAColors: visualDNA?.preferences?.colors,
          visualDNAMaterials: visualDNA?.preferences?.materials,
          hasColorsAndMaterials: !!sessionData?.colorsAndMaterials,
          colorsAndMaterialsStyle: sessionData?.colorsAndMaterials?.selectedStyle,
          colorsAndMaterialsStyleType: typeof sessionData?.colorsAndMaterials?.selectedStyle,
          colorsAndMaterialsStyleIsEmpty: sessionData?.colorsAndMaterials?.selectedStyle === '',
          colorsAndMaterialsPalette: sessionData?.colorsAndMaterials?.selectedPalette,
          colorsAndMaterialsMaterials: sessionData?.colorsAndMaterials?.topMaterials,
          hasSemanticDifferential: !!sessionData?.semanticDifferential,
          semanticWarmth: sessionData?.semanticDifferential?.warmth,
          semanticBrightness: sessionData?.semanticDifferential?.brightness,
          semanticComplexity: sessionData?.semanticDifferential?.complexity,
          hasSensoryPreferences: !!sessionData?.sensoryPreferences
        },
        timestamp: Date.now()
      })
    }).catch(() => {});
  }, [visualDNA, sessionData]);
  // #endregion

  const t = (pl: string, en: string) => (language === 'pl' ? pl : en);

  const colorsAndMaterials = sessionData?.colorsAndMaterials;
  const sensoryPreferences = sessionData?.sensoryPreferences;
  const semantic = sessionData?.semanticDifferential;

  const implicitStyleRaw = visualDNA?.dominantStyle || visualDNA?.preferences?.styles?.[0];
  const implicitStyleLabel = implicitStyleRaw ? getStyleLabel(implicitStyleRaw, language) : undefined;
  const implicitPalette = visualDNA?.preferences?.colors || [];
  const implicitMaterials = visualDNA?.preferences?.materials || [];
  const implicitWarmth = visualDNA?.preferences?.warmth ?? visualDNA?.implicitScores?.warmth;
  const implicitBrightness = visualDNA?.preferences?.brightness ?? visualDNA?.implicitScores?.brightness;
  const implicitComplexity = visualDNA?.preferences?.complexity ?? visualDNA?.implicitScores?.complexity;
  // #region agent log
  React.useEffect(() => {
    fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ProfileSections.tsx:PreferencesOverviewSection-display-values',message:'Displaying semantic values in dashboard',data:{implicitWarmth,implicitBrightness,implicitComplexity,explicitWarmth:semantic?.warmth,explicitBrightness:semantic?.brightness,explicitComplexity:semantic?.complexity},timestamp:Date.now(),sessionId:'debug-session',runId:'dashboard-display',hypothesisId:'F'})}).catch(()=>{});
  }, [implicitWarmth, implicitBrightness, implicitComplexity, semantic]);
  // #endregion

  // CRITICAL: Check if selectedStyle exists and is not empty string
  const explicitStyleLabel = colorsAndMaterials?.selectedStyle && colorsAndMaterials.selectedStyle.length > 0
    ? getStyleLabel(colorsAndMaterials.selectedStyle, language)
    : undefined;
  const explicitPaletteLabel = colorsAndMaterials?.selectedPalette
    ? getPaletteLabel(colorsAndMaterials.selectedPalette, language)
    : undefined;
  const explicitMaterials = colorsAndMaterials?.topMaterials || [];

  const hasExplicit =
    !!(explicitStyleLabel ||
      explicitPaletteLabel ||
      (explicitMaterials.length || 0) > 0 ||
      sensoryPreferences ||
      semantic);
  const hasImplicit = Boolean(visualDNA);

  if (!hasExplicit && !hasImplicit) return null;

  const formatPercent = (value?: number) => {
    if (value === undefined || value === null) return null;
    return Math.round(Math.max(0, Math.min(1, value)) * 100);
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

  const renderChips = (values?: string[], category?: 'material' | 'color' | 'other', skipTranslation = false) => {
    if (!values || values.length === 0) return <span className="text-silver-dark text-sm font-modern">—</span>;
    return (
      <div className="flex gap-2 flex-wrap">
        {values.slice(0, 6).map((item, idx) => {
          let translatedItem = item;
          if (!skipTranslation) {
            if (category === 'material') {
              translatedItem = translateMaterial(item, language);
            } else if (category === 'color') {
              translatedItem = translateColor(item, language);
            }
          }
          return (
            <span
              key={`${item}-${idx}`}
              className="px-3 py-1 rounded-full text-xs font-modern bg-white/15 text-graphite border border-white/10"
            >
              {translatedItem}
            </span>
          );
        })}
      </div>
    );
  };

  const rows = [
    {
      id: 'style',
      label: t('Styl', 'Style'),
      implicitValue: implicitStyleLabel || implicitStyleRaw,
      explicitValue: explicitStyleLabel
    },
    {
      id: 'palette',
      label: t('Paleta', 'Palette'),
      implicitList: implicitPalette || [],
      explicitList: explicitPaletteLabel ? [explicitPaletteLabel] : []
    },
    {
      id: 'materials',
      label: t('Materiały', 'Materials'),
      implicitList: implicitMaterials || [],
      explicitList: explicitMaterials || []
    },
    {
      id: 'warmth',
      label: t('Ciepło', 'Warmth'),
      implicitValue: implicitWarmth,
      explicitValue: semantic?.warmth,
      type: 'bar'
    },
    {
      id: 'brightness',
      label: t('Jasność', 'Brightness'),
      implicitValue: implicitBrightness,
      explicitValue: semantic?.brightness,
      type: 'bar'
    },
    {
      id: 'complexity',
      label: t('Złożoność', 'Complexity'),
      implicitValue: implicitComplexity,
      explicitValue: semantic?.complexity,
      type: 'bar'
    }
  ];

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
                {t('Preferencje – ukryte i jawne', 'Preferences – implicit & explicit')}
              </h3>
              <p className="text-sm text-silver-dark font-modern">
                {t('W jednym miejscu: Tinder + świadome wybory', 'One place: swipe DNA + explicit choices')}
              </p>
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5">
          <div className="grid grid-cols-3 gap-3 px-4 py-3 text-xs uppercase tracking-[0.2em] text-silver-dark font-modern border-b border-white/10">
            <span>{t('Kategoria', 'Category')}</span>
            <span>{t('Ukryte (Tinder)', 'Implicit (swipe)')}</span>
            <span>{t('Jawne (świadome)', 'Explicit (conscious)')}</span>
          </div>
          <div className="divide-y divide-white/10">
            {rows.map((row) => (
              <div key={row.id} className="grid grid-cols-3 gap-3 px-4 py-3 items-center">
                <span className="text-sm font-modern text-silver-dark">{row.label}</span>
                <div className="min-h-[24px] flex items-center">
                  {row.type === 'bar'
                    ? renderBar(row.implicitValue as number | undefined)
                    : row.implicitList && Array.isArray(row.implicitList) && row.implicitList.length > 0
                    ? renderChips(row.implicitList as string[], row.id === 'materials' ? 'material' : row.id === 'palette' ? 'color' : 'other')
                    : row.implicitValue && String(row.implicitValue).trim()
                    ? renderChips([String(row.implicitValue)])
                    : <span className="text-silver-dark text-sm font-modern">—</span>}
                </div>
                <div className="min-h-[24px] flex items-center">
                  {row.type === 'bar'
                    ? renderBar(row.explicitValue as number | undefined)
                    : row.explicitList && Array.isArray(row.explicitList) && row.explicitList.length > 0
                    ? renderChips(row.explicitList as string[], row.id === 'materials' ? 'material' : row.id === 'palette' ? 'color' : 'other', (row as any).explicitIsTranslated)
                    : row.explicitValue && String(row.explicitValue).trim()
                    ? renderChips([String(row.explicitValue)])
                    : <span className="text-silver-dark text-sm font-modern">—</span>}
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

  // Check if we have any explicit preferences
  const hasExplicitData = !!(colorsAndMaterials?.selectedStyle || 
                              colorsAndMaterials?.selectedPalette ||
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
          {colorsAndMaterials?.topMaterials && colorsAndMaterials.topMaterials.length > 0 && (
            <div>
              <p className="text-xs text-silver-dark font-modern mb-2">
                {t('Materiały', 'Materials')}
              </p>
              <div className="flex gap-2 flex-wrap">
                {colorsAndMaterials.topMaterials.map((material: string, idx: number) => (
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
                {sensoryPreferences?.texture && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-silver-dark font-modern w-20">{t('Tekstura:', 'Texture:')}</span>
                    <span className="text-sm text-graphite font-modern">{sensoryPreferences.texture}</span>
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
        <motion.div 
          className={`grid grid-cols-4 gap-2 mb-4 ${isExpanded ? 'max-h-[500px] overflow-y-auto pr-1' : ''}`}
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
export function GenerationStatsSection({ generations, generatedImages, onToggleFavorite }: { generations: any[]; generatedImages?: any[]; onToggleFavorite?: (imageId?: string, imageUrl?: string) => void }) {
  const { language } = useLanguage();
  const [isExpanded, setIsExpanded] = React.useState(false);
  const [imageErrors, setImageErrors] = React.useState<Set<number>>(new Set());

  const totalGenerations = generations?.length || 0;
  
  // Handle both string[] and object[] formats for generatedImages
  const normalizedImages = (generatedImages || []).map((img, idx) => {
    if (typeof img === 'string') {
      return { _idx: idx, _imageUrl: img.startsWith('data:') ? img : `data:image/png;base64,${img}`, _isFavorite: false, _id: undefined };
    }
    return { _idx: idx, _imageUrl: getImageUrl(img), _isFavorite: !!(img as any)?.isFavorite, _id: (img as any)?.id };
  }).filter(img => img._imageUrl !== null);
  
  const totalImages = normalizedImages.length;

  if (totalGenerations === 0 && totalImages === 0) return null;

  const t = (pl: string, en: string) => (language === 'pl' ? pl : en);
  
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
          <motion.div 
            className={`grid grid-cols-4 gap-2 mb-4 ${isExpanded ? 'max-h-[500px] overflow-y-auto pr-1' : ''}`}
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
                <div key={img._idx} className="relative aspect-square rounded-lg overflow-hidden bg-white/5">
                  <Image
                    src={img._imageUrl!}
                    alt={`Generated ${img._idx + 1}`}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 25vw, 20vw"
                    onError={() => handleImageError(img._idx)}
                    unoptimized={img._imageUrl?.startsWith('data:')}
                  />
                  {onToggleFavorite && (
                    <button
                      className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/35 hover:bg-black/50 border border-white/20 flex items-center justify-center transition-colors"
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
    </motion.div>
  );
}
