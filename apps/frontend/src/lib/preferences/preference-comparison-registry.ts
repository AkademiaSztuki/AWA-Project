/**
 * Canonical implicit (Tinder tags) vs explicit (/setup/profile) preference comparison.
 * Does not modify Tinder image filenames — only reads tags and maps to shared vocabulary.
 */

import { SessionData } from '@/types';
import { TinderSwipe, computeWeightedDNAFromSwipes } from '@/lib/dna';
import { COLOR_PALETTE_OPTIONS } from '@/components/setup/paletteOptions';
import { mergeColorsMaterialsForParticipant } from '@/lib/participants-mapper';
import { normalizeSemanticTo01 } from '@/lib/semantic-scale';

export const PREFERENCE_COMPARISON_SCHEMA_VERSION = 1;

/** Dashboard / export labels for comparison dimensions */
export const PREFERENCE_DIMENSION_UI_LABELS: Record<
  string,
  { pl: string; en: string }
> = {
  style: { pl: 'Styl', en: 'Style' },
  materials: { pl: 'Materiały', en: 'Materials' },
  color_tokens: { pl: 'Kolory', en: 'Colors' },
  color_temperature: { pl: 'Temperatura koloru', en: 'Color temperature' },
  brightness: { pl: 'Jasność', en: 'Brightness' },
  complexity: { pl: 'Złożoność', en: 'Complexity' },
  lighting: { pl: 'Światło', en: 'Lighting' },
  mood: { pl: 'Nastrój (Tinder)', en: 'Mood (Tinder)' },
  biophilia: { pl: 'Biofilia', en: 'Biophilia' },
  nature_metaphor: { pl: 'Metafora natury', en: 'Nature metaphor' },
  music: { pl: 'Muzyka (tylko jawne)', en: 'Music (explicit only)' },
  lifestyle: { pl: 'Styl życia (tylko jawne)', en: 'Lifestyle (explicit only)' },
};

export type ComparableDimensionId =
  | 'style'
  | 'materials'
  | 'color_tokens'
  | 'color_temperature'
  | 'brightness'
  | 'complexity'
  | 'lighting'
  | 'mood'
  | 'biophilia'
  | 'nature_metaphor';

export type ExplicitOnlyDimensionId = 'music' | 'lifestyle';

export type PreferenceDimensionId = ComparableDimensionId | ExplicitOnlyDimensionId;

export type ColorTemperatureBucket = 'warm' | 'cool' | 'neutral';
export type BrightnessBucket = 'bright' | 'dim' | 'balanced';
export type ComplexityBucket = 'simple' | 'moderate' | 'complex';
export type LightingCanonical = 'warm_low' | 'warm_bright' | 'neutral' | 'cool_bright';

export interface PreferenceDimensionComparison {
  id: PreferenceDimensionId;
  comparable: boolean;
  implicitCanonical: string[];
  explicitCanonical: string[];
  match: boolean;
  matchScore: number | null;
  implicitRaw?: Record<string, unknown>;
  explicitRaw?: Record<string, unknown>;
}

export interface PreferenceComparisonResult {
  schemaVersion: number;
  computedAt: string;
  dimensions: PreferenceDimensionComparison[];
}

const STYLE_ALIASES: Record<string, string> = {
  mid_century: 'mid-century',
  wabi_sabi: 'japanese',
  wabi: 'japanese',
  sabi: 'japanese',
  art_deco: 'art-deco',
  art_nouveau: 'art-deco',
  nordic_hygge: 'scandinavian',
  nordic: 'scandinavian',
  memphis_postmodern: 'maximalist',
  memphis: 'maximalist',
  hollywood_regency: 'luxury',
  french_provincial: 'traditional',
  english_country: 'traditional',
  brooklyn_loft: 'industrial',
  parisian_chic: 'contemporary',
  california_casual: 'contemporary',
  southwestern: 'rustic',
  moroccan: 'bohemian',
  tropical: 'mediterranean',
  brutalist: 'industrial',
  glam: 'luxury',
  classic: 'traditional',
  vintage: 'retro',
  japandi: 'japanese',
};

const MATERIAL_ALIASES: Record<string, string> = {
  soft_fabric: 'fabric',
  smooth_wood: 'wood',
  cold_metal: 'metal',
  rough_stone: 'stone',
  warm_leather: 'leather',
  live_edge: 'wood',
  driftwood: 'wood',
  unfinished: 'wood',
};

const WARM_COLOR_TOKENS = new Set([
  'warm', 'cozy', 'earth', 'terracotta', 'gold', 'beige', 'ochre', 'sand', 'peach', 'coral',
  'orange', 'yellow', 'mustard', 'brown', 'cream', 'adobe', 'rust', 'copper', 'brass',
]);

const COOL_COLOR_TOKENS = new Set([
  'cool', 'blue', 'navy', 'turquoise', 'teal', 'mint', 'lavender', 'silver', 'chrome',
  'steel', 'ice', 'icy', 'ocean', 'sage', 'green', 'forest',
]);

const NEUTRAL_COLOR_TOKENS = new Set([
  'neutral', 'grey', 'gray', 'white', 'black', 'charcoal', 'cream', 'beige', 'muted',
  'natural', 'clay', 'sand',
]);

const NATURE_METAPHOR_TOKENS = new Set([
  'ocean', 'forest', 'garden', 'mountain', 'desert', 'sunset',
]);

const LIGHTING_MOOD_COMPOUNDS: Record<string, LightingCanonical> = {
  warm_low: 'warm_low',
  warm_bright: 'warm_bright',
  cool_bright: 'cool_bright',
  neutral_light: 'neutral',
  neutral: 'neutral',
};

const PALETTE_ID_TO_COLOR_TOKENS: Record<string, string[]> = {
  'biophilic-restoration': ['green', 'earth', 'warm', 'natural'],
  'cognitive-calm': ['blue', 'cool', 'neutral'],
  'social-warmth': ['warm', 'orange', 'gold', 'cream'],
  'focus-minimalism': ['neutral', 'gray', 'black'],
  'vital-energy': ['warm', 'red', 'yellow'],
  'analogous-harmony': ['pink', 'purple', 'warm'],
  'earthen-balance': ['brown', 'earth', 'green', 'neutral'],
  'nordic-light': ['cool', 'blue', 'neutral', 'cream'],
  'deep-luxury': ['neutral', 'gold', 'green', 'deep'],
  'warm-greige': ['warm', 'neutral', 'beige'],
  'terracotta-olive': ['terracotta', 'warm', 'green', 'cream'],
  'coastal-hamptons': ['blue', 'cool', 'cream', 'neutral'],
  'sage-cream': ['sage', 'green', 'cream', 'neutral'],
  'monochrome-bw': ['black', 'white', 'neutral', 'gray'],
  'dusty-rose': ['pink', 'warm', 'neutral'],
  'forest-walnut': ['forest', 'green', 'brown', 'neutral'],
  'ochre-sand': ['ochre', 'sand', 'warm', 'neutral'],
  'cool-slate': ['cool', 'gray', 'blue', 'neutral'],
};

function normalizeToken(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const v = raw.toString().trim().toLowerCase().replace(/\s+/g, '_');
  if (!v) return null;
  return STYLE_ALIASES[v] ?? MATERIAL_ALIASES[v] ?? v;
}

function uniqueSorted(tokens: string[]): string[] {
  return Array.from(new Set(tokens.filter(Boolean))).sort();
}

function jaccard(a: string[], b: string[]): number {
  if (a.length === 0 && b.length === 0) return 1;
  if (a.length === 0 || b.length === 0) return 0;
  const setA = new Set(a);
  const setB = new Set(b);
  let inter = 0;
  for (const x of setA) {
    if (setB.has(x)) inter++;
  }
  const union = setA.size + setB.size - inter;
  return union === 0 ? 0 : inter / union;
}

function topWeightedTokens(
  weights: Record<string, number>,
  candidates: string[],
  n: number,
): string[] {
  return candidates
    .filter((t) => (weights[t] || 0) > 0)
    .sort((a, b) => (weights[b] || 0) - (weights[a] || 0))
    .slice(0, n);
}

function tokensFromLikedSwipes(swipes: TinderSwipe[]): string[] {
  const liked = swipes.filter((s) => s.direction === 'right');
  const out: string[] = [];
  liked.forEach((s) => {
    if (s.categories?.style) out.push(s.categories.style);
    s.categories?.colors?.forEach((c) => out.push(c));
    s.categories?.materials?.forEach((m) => out.push(m));
    s.categories?.mood?.forEach((m) => out.push(m));
    s.categories?.lighting?.forEach((l) => out.push(l));
    s.tags?.forEach((t) => out.push(t));
  });
  return out.map((t) => normalizeToken(t)).filter((t): t is string => Boolean(t));
}

function inferColorTemperatureFromTokens(tokens: string[]): ColorTemperatureBucket | null {
  let warm = 0;
  let cool = 0;
  let neutral = 0;
  for (const t of tokens) {
    if (t === 'warm') warm += 2;
    else if (t === 'cool') cool += 2;
    else if (t === 'neutral') neutral += 2;
    else if (WARM_COLOR_TOKENS.has(t)) warm++;
    else if (COOL_COLOR_TOKENS.has(t)) cool++;
    else if (NEUTRAL_COLOR_TOKENS.has(t)) neutral++;
  }
  if (warm === 0 && cool === 0 && neutral === 0) return null;
  if (warm >= cool && warm >= neutral) return 'warm';
  if (cool >= warm && cool >= neutral) return 'cool';
  return 'neutral';
}

function inferBrightnessFromTokens(tokens: string[]): BrightnessBucket | null {
  let bright = 0;
  let dim = 0;
  for (const t of tokens) {
    if (t === 'bright' || t === 'light' || t === 'sunny' || t === 'airy') bright++;
    if (t === 'dark' || t === 'moody' || t === 'dim' || t === 'shadow') dim++;
  }
  if (bright === 0 && dim === 0) return null;
  if (bright > dim) return 'bright';
  if (dim > bright) return 'dim';
  return 'balanced';
}

function inferComplexityFromTokens(tokens: string[]): ComplexityBucket | null {
  let complex = 0;
  let simple = 0;
  for (const t of tokens) {
    if (
      t === 'complex' ||
      t === 'maximalist' ||
      t === 'eclectic' ||
      t === 'ornate' ||
      t === 'layered' ||
      t === 'bold'
    ) {
      complex++;
    }
    if (
      t === 'simple' ||
      t === 'minimalist' ||
      t === 'minimal' ||
      t === 'clean' ||
      t === 'plain'
    ) {
      simple++;
    }
  }
  if (complex === 0 && simple === 0) return null;
  if (complex > simple) return 'complex';
  if (simple > complex) return 'simple';
  return 'moderate';
}

function inferLightingFromTokens(tokens: string[]): LightingCanonical | null {
  for (const t of tokens) {
    if (LIGHTING_MOOD_COMPOUNDS[t]) return LIGHTING_MOOD_COMPOUNDS[t];
  }
  if (tokens.includes('warm_low')) return 'warm_low';
  if (tokens.includes('warm_bright')) return 'warm_bright';
  if (tokens.includes('cool_bright')) return 'cool_bright';
  return null;
}

function semanticWarmthToBucket(value: number | undefined): ColorTemperatureBucket | null {
  if (value === undefined || Number.isNaN(value)) return null;
  const v = value > 1 ? value / 100 : value;
  if (v > 0.6) return 'warm';
  if (v < 0.4) return 'cool';
  return 'neutral';
}

function semanticBrightnessToBucket(value: number | undefined): BrightnessBucket | null {
  if (value === undefined || Number.isNaN(value)) return null;
  const v = value > 1 ? value / 100 : value;
  if (v > 0.6) return 'bright';
  if (v < 0.4) return 'dim';
  return 'balanced';
}

function semanticComplexityToBucket(value: number | undefined): ComplexityBucket | null {
  if (value === undefined || Number.isNaN(value)) return null;
  const v = value > 1 ? value / 100 : value;
  if (v > 0.6) return 'complex';
  if (v < 0.4) return 'simple';
  return 'moderate';
}

/** Biophilia 0–3 from profile / room setup / session export (handles string from DB). */
export function resolveExplicitBiophiliaScore(sessionData: SessionData): number | null {
  const candidates: unknown[] = [
    sessionData.biophiliaScore,
    sessionData.roomPreferences?.biophiliaScore,
    (sessionData as { psychologicalBaseline?: { biophiliaScore?: unknown } })
      .psychologicalBaseline?.biophiliaScore,
  ];

  const exportJson = (sessionData as { session_export_json?: unknown }).session_export_json;
  if (exportJson && typeof exportJson === 'object') {
    const snap = exportJson as Record<string, unknown>;
    candidates.push(snap.biophiliaScore);
    const rp = snap.roomPreferences as { biophiliaScore?: unknown } | undefined;
    candidates.push(rp?.biophiliaScore);
  }

  for (const raw of candidates) {
    if (raw === undefined || raw === null || raw === '') continue;
    const n = typeof raw === 'number' ? raw : Number(raw);
    if (!Number.isNaN(n)) {
      return Math.round(Math.max(0, Math.min(3, n)));
    }
  }
  return null;
}

export function explicitPaletteToColorTokens(paletteId?: string): string[] {
  if (!paletteId) return [];
  const mapped = PALETTE_ID_TO_COLOR_TOKENS[paletteId];
  if (mapped) return uniqueSorted(mapped);
  const opt = COLOR_PALETTE_OPTIONS.find((p) => p.id === paletteId);
  if (!opt) return [];
  return uniqueSorted([paletteId.replace(/-/g, '_')]);
}

export interface ImplicitPreferenceProfile {
  styles: string[];
  materials: string[];
  colorTokens: string[];
  moods: string[];
  colorTemperature: ColorTemperatureBucket | null;
  brightness: BrightnessBucket | null;
  complexity: ComplexityBucket | null;
  lighting: LightingCanonical | null;
  biophilia: number | null;
  natureMetaphor: string | null;
  colorWeights: Record<string, number>;
  rawTokenSample: string[];
}

export interface ExplicitPreferenceProfile {
  style: string | null;
  materials: string[];
  colorTokens: string[];
  paletteId: string | null;
  colorTemperature: ColorTemperatureBucket | null;
  brightness: BrightnessBucket | null;
  complexity: ComplexityBucket | null;
  lighting: LightingCanonical | null;
  biophilia: number | null;
  natureMetaphor: string | null;
  music: string | null;
  lifestyleVibe: string | null;
}

export function buildImplicitPreferenceProfile(swipes: TinderSwipe[]): ImplicitPreferenceProfile {
  const liked = swipes.filter((s) => s.direction === 'right');
  const dna = computeWeightedDNAFromSwipes(swipes, swipes.length);
  const allTokens = tokensFromLikedSwipes(swipes);

  const styleCandidates = Array.from(
    new Set(
      liked
        .map((s) => normalizeToken(s.categories?.style))
        .filter((t): t is string => Boolean(t)),
    ),
  );

  const materialCandidates = Array.from(
    new Set(
      liked.flatMap((s) => s.categories?.materials || []).map((m) => normalizeToken(m)).filter(Boolean) as string[],
    ),
  );

  const colorCandidates = Array.from(
    new Set(
      liked.flatMap((s) => s.categories?.colors || []).map((c) => normalizeToken(c)).filter(Boolean) as string[],
    ),
  );

  const moodCandidates = Array.from(
    new Set(
      liked.flatMap((s) => s.categories?.mood || []).map((m) => normalizeToken(m)).filter(Boolean) as string[],
    ),
  );

  const colorWeights: Record<string, number> = {};
  Object.entries(dna.weights).forEach(([k, v]) => {
    const n = normalizeToken(k);
    if (n && (colorCandidates.includes(n) || WARM_COLOR_TOKENS.has(n) || COOL_COLOR_TOKENS.has(n) || NEUTRAL_COLOR_TOKENS.has(n))) {
      colorWeights[n] = (colorWeights[n] || 0) + v;
    }
  });

  const colorTokens = uniqueSorted([
    ...topWeightedTokens(dna.weights, colorCandidates, 5),
    ...topWeightedTokens(colorWeights, Object.keys(colorWeights), 5),
  ]).slice(0, 8);

  let biophiliaSum = 0;
  let biophiliaN = 0;
  let brightnessVotes: BrightnessBucket | null = null;
  let complexityVotes: ComplexityBucket | null = null;
  let lightingFromCategories: LightingCanonical | null = null;

  liked.forEach((s) => {
    const c = s.categories as {
      biophilia?: number;
      brightness?: 'bright' | 'dark' | null;
      complexity?: 'complex' | 'simple' | null;
      lightingMood?: string | null;
    } | undefined;
    const b = c?.biophilia;
    if (typeof b === 'number' && !Number.isNaN(b)) {
      biophiliaSum += b;
      biophiliaN++;
    }
    if (c?.brightness === 'bright') brightnessVotes = 'bright';
    else if (c?.brightness === 'dark' && brightnessVotes !== 'bright') brightnessVotes = 'dim';
    if (c?.complexity === 'complex') complexityVotes = 'complex';
    else if (c?.complexity === 'simple' && complexityVotes !== 'complex') complexityVotes = 'simple';
    if (c?.lightingMood) {
      const lm = c.lightingMood.replace('neutral_light', 'neutral') as LightingCanonical;
      if (['warm_low', 'warm_bright', 'neutral', 'cool_bright'].includes(lm)) {
        lightingFromCategories = lm;
      }
    }
  });
  const biophilia = biophiliaN > 0 ? Math.round(biophiliaSum / biophiliaN) : null;

  let natureMetaphor: string | null = null;
  for (const t of allTokens) {
    if (NATURE_METAPHOR_TOKENS.has(t)) {
      natureMetaphor = t;
      break;
    }
  }

  return {
    styles: topWeightedTokens(dna.weights, styleCandidates, 3),
    materials: topWeightedTokens(dna.weights, materialCandidates, 3),
    colorTokens,
    moods: topWeightedTokens(dna.weights, moodCandidates, 3),
    colorTemperature: inferColorTemperatureFromTokens(allTokens),
    brightness: brightnessVotes ?? inferBrightnessFromTokens(allTokens),
    complexity: complexityVotes ?? inferComplexityFromTokens(allTokens),
    lighting: lightingFromCategories ?? inferLightingFromTokens(allTokens),
    biophilia,
    natureMetaphor,
    colorWeights,
    rawTokenSample: allTokens.slice(0, 40),
  };
}

export function buildExplicitPreferenceProfile(sessionData: SessionData): ExplicitPreferenceProfile {
  const mergedCm = mergeColorsMaterialsForParticipant(sessionData);
  const semantic = sessionData.semanticDifferential;
  const rpSem = sessionData.roomPreferences?.semanticDifferential;
  const warmth = normalizeSemanticTo01(semantic?.warmth ?? rpSem?.warmth);
  const brightness = normalizeSemanticTo01(semantic?.brightness ?? rpSem?.brightness);
  const complexity = normalizeSemanticTo01(semantic?.complexity ?? rpSem?.complexity);

  const sensory =
    sessionData.sensoryPreferences ?? sessionData.roomPreferences?.sensoryPreferences;
  const paletteId = mergedCm.selectedPalette || null;
  const materials = (mergedCm.topMaterials || [])
    .map((m) => normalizeToken(m))
    .filter((m): m is string => Boolean(m));

  const lightRaw = sensory?.light ? normalizeToken(sensory.light) : null;
  const lighting =
    lightRaw && ['warm_low', 'warm_bright', 'neutral', 'cool_bright'].includes(lightRaw)
      ? (lightRaw as LightingCanonical)
      : null;

  const biophilia = resolveExplicitBiophiliaScore(sessionData);

  const natureRaw = sessionData.natureMetaphor ?? sessionData.roomPreferences?.natureMetaphor;
  const natureMetaphor = natureRaw ? normalizeToken(natureRaw) : null;

  return {
    style: mergedCm.selectedStyle ? normalizeToken(mergedCm.selectedStyle) : null,
    materials: uniqueSorted(materials),
    colorTokens: explicitPaletteToColorTokens(paletteId || undefined),
    paletteId,
    colorTemperature: semanticWarmthToBucket(warmth),
    brightness: semanticBrightnessToBucket(brightness),
    complexity: semanticComplexityToBucket(complexity),
    lighting,
    biophilia,
    natureMetaphor,
    music: sensory?.music ? normalizeToken(sensory.music) : null,
    lifestyleVibe: sessionData.lifestyle?.lifeVibe
      ? normalizeToken(sessionData.lifestyle.lifeVibe)
      : null,
  };
}

function buildComparableDimension(
  id: ComparableDimensionId,
  implicitVals: string[],
  explicitVals: string[],
  matchMode: 'exact' | 'jaccard' | 'scalar',
  implicitRaw?: Record<string, unknown>,
  explicitRaw?: Record<string, unknown>,
): PreferenceDimensionComparison {
  const implicitCanonical = uniqueSorted(implicitVals);
  const explicitCanonical = uniqueSorted(explicitVals);
  let matchScore: number | null = null;
  let match = false;

  if (matchMode === 'scalar') {
    match =
      implicitCanonical.length > 0 &&
      explicitCanonical.length > 0 &&
      implicitCanonical[0] === explicitCanonical[0];
    matchScore = match ? 1 : implicitCanonical.length && explicitCanonical.length ? 0 : null;
  } else if (matchMode === 'exact') {
    match =
      implicitCanonical.length > 0 &&
      explicitCanonical.length > 0 &&
      implicitCanonical[0] === explicitCanonical[0];
    matchScore = match ? 1 : null;
  } else {
    matchScore = jaccard(implicitCanonical, explicitCanonical);
    match = matchScore >= 0.5 && implicitCanonical.length > 0 && explicitCanonical.length > 0;
  }

  return {
    id,
    comparable: true,
    implicitCanonical,
    explicitCanonical,
    match,
    matchScore,
    implicitRaw,
    explicitRaw,
  };
}

export function comparePreferenceProfiles(
  implicit: ImplicitPreferenceProfile,
  explicit: ExplicitPreferenceProfile,
): PreferenceComparisonResult {
  const dimensions: PreferenceDimensionComparison[] = [];

  dimensions.push(
    buildComparableDimension(
      'style',
      implicit.styles.slice(0, 1),
      explicit.style ? [explicit.style] : [],
      'exact',
      { topStyles: implicit.styles, weights: implicit.colorWeights },
      { selectedStyle: explicit.style },
    ),
  );

  dimensions.push(
    buildComparableDimension(
      'materials',
      implicit.materials,
      explicit.materials,
      'jaccard',
      { materials: implicit.materials },
      { topMaterials: explicit.materials },
    ),
  );

  dimensions.push(
    buildComparableDimension(
      'color_tokens',
      implicit.colorTokens,
      explicit.colorTokens,
      'jaccard',
      { colorTokens: implicit.colorTokens, colorWeights: implicit.colorWeights },
      { paletteId: explicit.paletteId, colorTokens: explicit.colorTokens },
    ),
  );

  const tempImplicit = implicit.colorTemperature ? [implicit.colorTemperature] : [];
  const tempExplicit = explicit.colorTemperature ? [explicit.colorTemperature] : [];
  dimensions.push({
    ...buildComparableDimension('color_temperature', tempImplicit, tempExplicit, 'scalar'),
    id: 'color_temperature',
  });

  const brightImplicit = implicit.brightness ? [implicit.brightness] : [];
  const brightExplicit = explicit.brightness ? [explicit.brightness] : [];
  dimensions.push({
    ...buildComparableDimension('brightness', brightImplicit, brightExplicit, 'scalar'),
    id: 'brightness',
  });

  const complexImplicit = implicit.complexity ? [implicit.complexity] : [];
  const complexExplicit = explicit.complexity ? [explicit.complexity] : [];
  dimensions.push({
    ...buildComparableDimension('complexity', complexImplicit, complexExplicit, 'scalar'),
    id: 'complexity',
  });

  const lightImplicit = implicit.lighting ? [implicit.lighting] : [];
  const lightExplicit = explicit.lighting ? [explicit.lighting] : [];
  dimensions.push({
    ...buildComparableDimension('lighting', lightImplicit, lightExplicit, 'exact'),
    id: 'lighting',
  });

  dimensions.push(
    buildComparableDimension(
      'mood',
      implicit.moods,
      [],
      'jaccard',
      { moods: implicit.moods },
      {},
    ),
  );

  const bioImplicit =
    implicit.biophilia !== null ? [String(implicit.biophilia)] : [];
  const bioExplicit =
    explicit.biophilia !== null ? [String(explicit.biophilia)] : [];
  dimensions.push({
    ...buildComparableDimension('biophilia', bioImplicit, bioExplicit, 'scalar'),
    id: 'biophilia',
  });

  const natureImplicit = implicit.natureMetaphor ? [implicit.natureMetaphor] : [];
  const natureExplicit = explicit.natureMetaphor ? [explicit.natureMetaphor] : [];
  dimensions.push({
    ...buildComparableDimension('nature_metaphor', natureImplicit, natureExplicit, 'exact'),
    id: 'nature_metaphor',
  });

  if (explicit.music) {
    dimensions.push({
      id: 'music',
      comparable: false,
      implicitCanonical: [],
      explicitCanonical: [explicit.music],
      match: false,
      matchScore: null,
      explicitRaw: { music: explicit.music },
    });
  }

  if (explicit.lifestyleVibe) {
    dimensions.push({
      id: 'lifestyle',
      comparable: false,
      implicitCanonical: [],
      explicitCanonical: [explicit.lifestyleVibe],
      match: false,
      matchScore: null,
      explicitRaw: { lifeVibe: explicit.lifestyleVibe },
    });
  }

  return {
    schemaVersion: PREFERENCE_COMPARISON_SCHEMA_VERSION,
    computedAt: new Date().toISOString(),
    dimensions,
  };
}

/** When Tinder swipes are missing from session (e.g. stripped export), use visualDNA / DB columns. */
function enrichImplicitFromVisualDna(
  implicit: ImplicitPreferenceProfile,
  sessionData: SessionData,
): ImplicitPreferenceProfile {
  const v = sessionData.visualDNA;
  if (!v?.preferences) return implicit;

  const out: ImplicitPreferenceProfile = { ...implicit };
  const normList = (items?: string[]) =>
    uniqueSorted(
      (items || [])
        .map((x) => normalizeToken(String(x ?? '')))
        .filter((t): t is string => Boolean(t)),
    );

  if (out.styles.length === 0) {
    const styles = normList([
      v.dominantStyle,
      ...(v.preferences.styles || []),
    ] as string[]);
    if (styles.length > 0) out.styles = styles.slice(0, 3);
  }
  if (out.materials.length === 0) {
    const materials = normList(v.preferences.materials);
    if (materials.length > 0) out.materials = materials.slice(0, 3);
  }
  if (out.colorTokens.length === 0) {
    const colors = normList(v.preferences.colors);
    if (colors.length > 0) out.colorTokens = colors.slice(0, 8);
  }

  const scores = v.implicitScores;
  if (!out.brightness && scores?.brightness !== undefined) {
    out.brightness = semanticBrightnessToBucket(scores.brightness);
  }
  if (!out.complexity && scores?.complexity !== undefined) {
    out.complexity = semanticComplexityToBucket(scores.complexity);
  }
  if (!out.colorTemperature && scores?.warmth !== undefined) {
    out.colorTemperature = semanticWarmthToBucket(scores.warmth);
  }

  if (!out.colorTemperature && out.colorTokens.length > 0) {
    out.colorTemperature = inferColorTemperatureFromTokens(out.colorTokens);
  }
  if (!out.brightness && out.colorTokens.length > 0) {
    out.brightness = inferBrightnessFromTokens(out.colorTokens);
  }
  if (!out.complexity && out.colorTokens.length > 0) {
    out.complexity = inferComplexityFromTokens(out.colorTokens);
  }

  return out;
}

export function buildPreferenceComparisonFromSession(
  sessionData: SessionData,
): PreferenceComparisonResult {
  const swipes: TinderSwipe[] = (sessionData.tinderData?.swipes || []).map((s: any) => ({
    direction: s.direction,
    tags: s.tags,
    categories: s.categories,
  }));
  const implicit = enrichImplicitFromVisualDna(
    buildImplicitPreferenceProfile(swipes),
    sessionData,
  );
  const explicit = buildExplicitPreferenceProfile(sessionData);
  return comparePreferenceProfiles(implicit, explicit);
}

/** Flat research fields derived from comparison JSON (for participants row). */
export function flattenPreferenceComparisonForParticipant(
  comparison: PreferenceComparisonResult,
): {
  preference_comparison_json: PreferenceComparisonResult;
  style_match?: boolean;
  color_tokens_match_score?: number;
  biophilia_match?: boolean;
  nature_metaphor_match?: boolean;
} {
  const byId = (id: PreferenceDimensionId) =>
    comparison.dimensions.find((d) => d.id === id);

  const style = byId('style');
  const colors = byId('color_tokens');
  const bio = byId('biophilia');
  const nature = byId('nature_metaphor');

  return {
    preference_comparison_json: comparison,
    style_match: style?.match,
    color_tokens_match_score:
      typeof colors?.matchScore === 'number' ? colors.matchScore : undefined,
    biophilia_match: bio?.match,
    nature_metaphor_match: nature?.match,
  };
}
