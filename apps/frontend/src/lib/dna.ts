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
    colors: pickTop(colors, 2),
    materials: pickTop(materials, 2),
    furniture: pickTop(furniture, 2),
    lighting: pickTop(lighting, 2),
    layout: pickTop(layout, 2),
    mood: pickTop(mood, 2),
  };

  const confidence = Math.min(95, Math.max(65, Math.round((liked.length / totalConsidered) * 100)));

  return { weights, top, confidence };
}

export function buildFluxPromptFromDNA(dna: WeightedDNAResult, roomType: string = 'living room') {
  const stylePhrase = dna.top.styles.join(' and ');
  const colorPhrase = dna.top.colors.join(' and ');
  const materialPhrase = dna.top.materials.join(' and ');
  const furniturePhrase = dna.top.furniture.join(' ');
  const lightingPhrase = dna.top.lighting.join(' and ');
  const moodPhrase = dna.top.mood.join(' ');

  const parts = [
    `Professional interior design photography of a beautiful ${roomType}`,
    stylePhrase ? `in ${stylePhrase} style` : '',
    colorPhrase ? `featuring ${colorPhrase} color palette` : '',
    materialPhrase ? `with ${materialPhrase} materials` : '',
    furniturePhrase ? `${furniturePhrase} furniture` : '',
    lightingPhrase ? `${lightingPhrase} lighting` : '',
    moodPhrase ? `creating ${moodPhrase} atmosphere` : '',
    'high quality, realistic, detailed'
  ].filter(Boolean);

  return parts.join(', ');
}

export function buildFinalFluxPromptFromSession(sessionData: any) {
  const roomType = (sessionData?.roomType || 'living room').toString();
  const v = sessionData?.visualDNA || {};
  const prefs = v?.preferences || {};

  const styles = Array.isArray(prefs.styles) ? prefs.styles : [];
  const colors = Array.isArray(prefs.colors) ? prefs.colors : [];
  const materials = Array.isArray(prefs.materials) ? prefs.materials : [];
  const furniture = []; // not explicitly in visualDNA; can be inferred later
  const lighting = Array.isArray(prefs.lighting) ? prefs.lighting : [];
  const mood = Array.isArray(v?.moodSummary ? [v.moodSummary] : []) ? [v.moodSummary].filter(Boolean) : [];

  const dnaPrompt = buildFluxPromptFromDNA(
    {
      weights: {},
      top: {
        styles,
        colors,
        materials,
        furniture,
        lighting,
        layout: [],
        mood,
      },
      confidence: v?.accuracyScore || 70,
    },
    roomType,
  );

  const promptElements = sessionData?.ladderResults?.promptElements;
  const ladderParts: string[] = [];
  if (promptElements) {
    if (promptElements.atmosphere) ladderParts.push(promptElements.atmosphere);
    if (promptElements.materials) ladderParts.push(`using ${promptElements.materials}`);
    if (promptElements.colors) ladderParts.push(promptElements.colors);
    if (promptElements.lighting) ladderParts.push(promptElements.lighting);
    if (promptElements.layout) ladderParts.push(promptElements.layout);
    if (promptElements.mood) ladderParts.push(promptElements.mood);
  }

  const usage = sessionData?.usagePattern?.timeOfDay;
  const usageMap: Record<string, string> = {
    morning: 'optimized for morning use with bright, energizing daylight',
    afternoon: 'optimized for afternoon productivity with balanced natural lighting',
    evening: 'optimized for evening relaxation with warm, ambient lighting',
    night: 'optimized for nighttime comfort with soft, cozy illumination',
  };
  const usagePart = usage ? usageMap[usage] : '';

  const emotion = sessionData?.emotionalPreference?.emotion;
  const emotionMap: Record<string, string> = {
    peaceful: 'evoking deep tranquility and inner peace',
    energetic: 'inspiring motivation and dynamic energy',
    joyful: 'radiating happiness and positive vibes',
    focused: 'promoting concentration and mental clarity',
  };
  const emotionPart = emotion ? emotionMap[emotion] : '';

  const quality = 'interior design magazine quality, realistic lighting and shadows, high resolution, sharp focus';

  return [dnaPrompt, ...ladderParts, usagePart, emotionPart, quality]
    .filter(Boolean)
    .join(', ')
    .replace(/\s+,/g, ',')
    .replace(/,\s+,/g, ', ');
}


