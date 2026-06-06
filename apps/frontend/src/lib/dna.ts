import { buildPreferenceMatrixFromSession } from '@/lib/preferences/preference-matrix';

export type TinderSwipe = {
  direction: 'left' | 'right';
  tags?: string[];
  categories?: {
    style: string | null;
    colors: string[];
    materials: string[];
    furniture: string[];
    lighting: string[];
    layout: string[];
    mood: string[];
    biophilia?: number; // 0-3 scale
  };
};

export type WeightedDNAResult = {
  weights: Record<string, number>;
  top: {
    styles: string[];
    colors: string[];
    materials: string[];
    furniture: string[];
    lighting: string[];
    layout: string[];
    mood: string[];
  };
  confidence: number;
};

const CATEGORY_WEIGHTS = {
  STYLE_DNA: 0.30,
  COLOR_DNA: 0.25,
  MATERIAL_DNA: 0.20,
  FURNITURE_DNA: 0.15,
  LIGHTING_DNA: 0.05,
  LAYOUT_DNA: 0.03,
  MOOD_DNA: 0.02,
} as const;

export function computeWeightedDNAFromSwipes(swipes: TinderSwipe[], totalShown?: number): WeightedDNAResult {
  const liked = swipes.filter((s) => s.direction === 'right');
  const totalConsidered = typeof totalShown === 'number' && totalShown > 0 ? totalShown : Math.max(swipes.length, 1);

  const weights: Record<string, number> = {};

  const increment = (token: string, amount: number) => {
    if (!token) return;
    weights[token] = (weights[token] || 0) + amount;
  };

  liked.forEach((s) => {
    const c = s.categories;
    if (!c) return;
    // Style
    if (c.style) increment(c.style, CATEGORY_WEIGHTS.STYLE_DNA);
    // Colors (up to 2)
    c.colors?.forEach((t) => increment(t, CATEGORY_WEIGHTS.COLOR_DNA / Math.max(c.colors.length, 1)));
    // Materials
    c.materials?.forEach((t) => increment(t, CATEGORY_WEIGHTS.MATERIAL_DNA / Math.max(c.materials.length, 1)));
    // Furniture
    c.furniture?.forEach((t) => increment(t, CATEGORY_WEIGHTS.FURNITURE_DNA / Math.max(c.furniture.length, 1)));
    // Lighting
    c.lighting?.forEach((t) => increment(t, CATEGORY_WEIGHTS.LIGHTING_DNA / Math.max(c.lighting.length, 1)));
    // Layout
    c.layout?.forEach((t) => increment(t, CATEGORY_WEIGHTS.LAYOUT_DNA / Math.max(c.layout.length, 1)));
    // Mood
    c.mood?.forEach((t) => increment(t, CATEGORY_WEIGHTS.MOOD_DNA / Math.max(c.mood.length, 1)));
    // Filename tags (same vocabulary as Livingroom parser — no image changes)
    const tagWeight = CATEGORY_WEIGHTS.COLOR_DNA * 0.15;
    s.tags?.forEach((t) => increment(t, tagWeight));
  });

  const pickTop = (candidates: string[], n: number) => {
    return candidates
      .sort((a, b) => (weights[b] || 0) - (weights[a] || 0))
      .filter((t, idx, arr) => arr.indexOf(t) === idx)
      .slice(0, n);
  };

  // Build candidate lists from what appeared in likes
  const allTokens = Object.keys(weights);
  const extractByPrefix = (prefixes: string[]) => allTokens.filter((t) => prefixes.some(() => true));
  // We do not have strict vocabularies here; choose top by what category arrays provided
  const categoryTokens = (fieldSelector: (c: NonNullable<TinderSwipe['categories']>) => string[]) => {
    const set = new Set<string>();
    liked.forEach((s) => {
      if (s.categories) fieldSelector(s.categories).forEach((t) => set.add(t));
    });
    return Array.from(set);
  };

  const styleTokens = (() => {
    const set = new Set<string>();
    liked.forEach((s) => {
      const st = s.categories?.style;
      if (st) set.add(st);
    });
    return Array.from(set);
  })();

  const colors = categoryTokens((c) => c.colors || []);
  const materials = categoryTokens((c) => c.materials || []);
  const furniture = categoryTokens((c) => c.furniture || []);
  const lighting = categoryTokens((c) => c.lighting || []);
  const layout = categoryTokens((c) => c.layout || []);
  const mood = categoryTokens((c) => c.mood || []);

  const top = {
    styles: pickTop(styleTokens, 2),
    colors: pickTop(colors, 5),
    materials: pickTop(materials, 2),
    furniture: pickTop(furniture, 2),
    lighting: pickTop(lighting, 2),
    layout: pickTop(layout, 2),
    mood: pickTop(mood, 2),
  };

  const confidence = Math.min(95, Math.max(65, Math.round((liked.length / totalConsidered) * 100)));

  return { weights, top, confidence };
}
