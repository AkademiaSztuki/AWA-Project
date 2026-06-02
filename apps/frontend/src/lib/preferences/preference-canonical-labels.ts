/**
 * User-facing labels for canonical preference tokens (PL/EN).
 * Research/DB keeps English snake_case; dashboard shows friendly text.
 */

import { getStyleLabel } from '@/lib/questions/style-options';
import { translateColor, translateMaterial } from '@/lib/translations/material-translations';
import type { PreferenceDimensionId } from '@/lib/preferences/preference-comparison-registry';

const BUCKET_LABELS: Record<string, { pl: string; en: string }> = {
  warm: { pl: 'Ciepło', en: 'Warm' },
  cool: { pl: 'Chłód', en: 'Cool' },
  neutral: { pl: 'Neutralnie', en: 'Neutral' },
  bright: { pl: 'Jasno', en: 'Bright' },
  dim: { pl: 'Przyciemnione', en: 'Dim' },
  balanced: { pl: 'Zbalansowane', en: 'Balanced' },
  simple: { pl: 'Prosto', en: 'Simple' },
  moderate: { pl: 'Umiarkowanie', en: 'Moderate' },
  complex: { pl: 'Złożone', en: 'Complex' },
  warm_low: { pl: 'Ciepłe, przyciemnione', en: 'Warm, dimmed' },
  warm_bright: { pl: 'Ciepłe, jasne', en: 'Warm, bright' },
  cool_bright: { pl: 'Chłodne, jasne', en: 'Cool, bright' },
};

const MOOD_LABELS: Record<string, { pl: string; en: string }> = {
  playful: { pl: 'Zabawny', en: 'Playful' },
  sophisticated: { pl: 'Wyrafinowany', en: 'Sophisticated' },
  cozy: { pl: 'Przytulny', en: 'Cozy' },
  serene: { pl: 'Spokojny', en: 'Serene' },
  peaceful: { pl: 'Spokojny', en: 'Peaceful' },
  romantic: { pl: 'Romantyczny', en: 'Romantic' },
  elegant: { pl: 'Elegancki', en: 'Elegant' },
  luxurious: { pl: 'Luksusowy', en: 'Luxurious' },
  dramatic: { pl: 'Dramatyczny', en: 'Dramatic' },
  fresh: { pl: 'Świeży', en: 'Fresh' },
  relaxing: { pl: 'Relaksujący', en: 'Relaxing' },
  authentic: { pl: 'Autentyczny', en: 'Authentic' },
  minimal: { pl: 'Minimalny', en: 'Minimal' },
  calm: { pl: 'Spokojny', en: 'Calm' },
  bold: { pl: 'Odważny', en: 'Bold' },
  zen: { pl: 'Zen', en: 'Zen' },
  hygge: { pl: 'Hygge', en: 'Hygge' },
};

const NATURE_LABELS: Record<string, { pl: string; en: string }> = {
  ocean: { pl: 'Ocean', en: 'Ocean' },
  forest: { pl: 'Las', en: 'Forest' },
  garden: { pl: 'Ogród', en: 'Garden' },
  mountain: { pl: 'Góry', en: 'Mountain' },
  desert: { pl: 'Pustynia', en: 'Desert' },
  sunset: { pl: 'Zachód słońca', en: 'Sunset' },
};

const MUSIC_LABELS: Record<string, { pl: string; en: string }> = {
  jazz: { pl: 'Jazz', en: 'Jazz' },
  classical: { pl: 'Klasyka', en: 'Classical' },
  electronic: { pl: 'Elektronika', en: 'Electronic' },
  rock: { pl: 'Rock', en: 'Rock' },
  funk: { pl: 'Funk', en: 'Funk' },
  pop: { pl: 'Pop', en: 'Pop' },
};

const LIFESTYLE_VIBE_LABELS: Record<string, { pl: string; en: string }> = {
  creative: { pl: 'Kreatywny', en: 'Creative' },
  calm: { pl: 'Spokojny', en: 'Calm' },
  chaotic: { pl: 'Chaotyczny', en: 'Chaotic' },
  organized: { pl: 'Zorganizowany', en: 'Organized' },
  social: { pl: 'Społeczny', en: 'Social' },
  introverted: { pl: 'Introwertyczny', en: 'Introverted' },
  grounded: { pl: 'Uziemiony', en: 'Grounded' },
  busy: { pl: 'Zabiegany', en: 'Busy' },
};

const STYLE_ALIASES_FOR_LABEL: Record<string, string> = {
  mid_century: 'mid-century',
  art_deco: 'art-deco',
};

const BIOPHILIA_LABELS: Record<number, { pl: string; en: string }> = {
  0: { pl: 'Brak roślin', en: 'No plants' },
  1: { pl: 'Odrobina zieleni', en: 'A touch of green' },
  2: { pl: 'Umiarkowana zieleń', en: 'Moderate greenery' },
  3: { pl: 'Dużo natury', en: 'Lots of nature' },
};

/** Dimensions shown in user dashboard (research-only rows omitted). */
export const USER_FACING_COMPARISON_DIMENSIONS = new Set<string>([
  'style',
  'materials',
  'color_tokens',
  'color_temperature',
  'brightness',
  'complexity',
  'lighting',
]);

export function translateCanonicalPreferenceToken(
  token: string,
  language: 'pl' | 'en',
  dimensionId?: PreferenceDimensionId | string,
): string {
  if (!token) return token;

  const biophiliaNum = /^\d+$/.test(token) ? Number(token) : NaN;
  if (!Number.isNaN(biophiliaNum) && dimensionId === 'biophilia') {
    const bio = BIOPHILIA_LABELS[biophiliaNum];
    if (bio) return language === 'pl' ? bio.pl : bio.en;
    return token;
  }

  const normalized = token.toLowerCase().trim().replace(/\s+/g, '_');

  if (dimensionId === 'style' || dimensionId === undefined) {
    const styleId = STYLE_ALIASES_FOR_LABEL[normalized] ?? normalized;
    const styleLabel = getStyleLabel(styleId, language);
    if (styleLabel !== styleId) return styleLabel;
  }

  if (dimensionId === 'materials') {
    return translateMaterial(normalized, language);
  }

  if (dimensionId === 'color_tokens' || dimensionId === 'color_temperature') {
    const color = translateColor(normalized, language);
    if (color !== normalized) return color;
  }

  const dict =
    BUCKET_LABELS[normalized] ??
    MOOD_LABELS[normalized] ??
    NATURE_LABELS[normalized] ??
    MUSIC_LABELS[normalized] ??
    LIFESTYLE_VIBE_LABELS[normalized];

  if (dict) return language === 'pl' ? dict.pl : dict.en;

  if (dimensionId === 'materials') {
    return translateMaterial(normalized, language);
  }

  return translateColor(normalized, language);
}
