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

export function buildOptimizedFluxPrompt(sessionData: any): string {
  // TOKEN BUDGET: 65 max (CLIP limit is 77, we stay safe at 65)
  // Based on Research Through Design methodology - hierarchical data importance
  
  const parts: string[] = [];
  let estimatedTokens = 0;
  
  // Helper to estimate tokens (rough: split by spaces)
  const countTokens = (str: string) => str.split(/\s+/).length;
  
  // 1. BASE (3 tokens) - ESSENTIAL
  const roomType = (sessionData?.roomType || 'living_room').toString().replace('_', ' ');
  parts.push(`${roomType} interior`);
  estimatedTokens += 3;
  
  // 2. STYLE (2-4 tokens) - DNA 30% weight - HIGHEST PRIORITY
  const styles = sessionData?.visualDNA?.preferences?.styles || [];
  if (styles.length > 0 && estimatedTokens < 60) {
    const styleText = `${styles[0]} style`;
    parts.push(styleText);
    estimatedTokens += countTokens(styleText);
  }
  
  // 3. LADDER CORE NEED (8-12 tokens) - PSYCHOLOGICAL DEPTH - CRITICAL
  const promptElements = sessionData?.ladderResults?.promptElements;
  if (promptElements && estimatedTokens < 55) {
    // Choose most concise but impactful element
    // Priority: mood > atmosphere (mood is shorter but equally powerful)
    if (promptElements.mood) {
      const moodText = promptElements.mood
        .replace(/przytulny/gi, 'cozy')
        .replace(/spokojny/gi, 'peaceful')
        .replace(/energiczny/gi, 'energetic')
        .replace(/harmonijny/gi, 'harmonious')
        .replace(/autentyczny/gi, 'authentic')
        .replace(/elegancki/gi, 'elegant');
      
      const moodTokens = countTokens(moodText);
      if (moodTokens <= 12) {
        parts.push(moodText);
        estimatedTokens += moodTokens;
      }
    }
  }
  
  // 4. COLORS (4-6 tokens) - DNA 25% weight - HIGH PRIORITY
  // Prioritize implicit (DNA) but fallback to explicit palette selection
  const implicitColors = sessionData?.visualDNA?.preferences?.colors || [];
  const explicitPalette = sessionData?.colorsAndMaterials?.selectedPalette;
  const colors = implicitColors.length > 0 ? implicitColors : explicitPalette ? [explicitPalette] : [];
  if (colors.length > 0 && estimatedTokens < 58) {
    const colorText = `${colors.slice(0, 2).join(' and ')} palette`;
    parts.push(colorText);
    estimatedTokens += countTokens(colorText);
  }
  
  // 5. MATERIALS (3-4 tokens) - DNA 20% weight
  // Prioritize implicit (DNA) but fallback to explicit selections
  const implicitMaterials = sessionData?.visualDNA?.preferences?.materials || [];
  const explicitMaterials = sessionData?.colorsAndMaterials?.topMaterials || [];
  const materials = implicitMaterials.length > 0 ? implicitMaterials : explicitMaterials;
  if (materials.length > 0 && estimatedTokens < 60) {
    parts.push(`${materials[0]} materials`);
    estimatedTokens += 2;
  }
  
  // 6. LIGHTING (2-3 tokens) - DNA 5% weight + Ladder context
  // Prioritize implicit (DNA) but fallback to explicit sensory preference
  const implicitLighting = sessionData?.visualDNA?.preferences?.lighting || [];
  const explicitLight = sessionData?.sensoryPreferences?.light;
  const lighting = implicitLighting.length > 0 ? implicitLighting : explicitLight ? [explicitLight] : [];
  if (lighting.length > 0 && estimatedTokens < 62) {
    parts.push(`${lighting[0]} lighting`);
    estimatedTokens += 2;
  }
  
  // 7. QUALITY ANCHORS (3-4 tokens) - Technical
  if (estimatedTokens < 63) {
    parts.push('high quality, realistic');
    estimatedTokens += 3;
  }
  
  const finalPrompt = parts.filter(Boolean).join(', ');
  const actualTokens = countTokens(finalPrompt);
  
  // Logging for research analytics
  console.log('🎨 Optimized FLUX Prompt:', finalPrompt);
  console.log('📊 Estimated tokens:', actualTokens, '/ 65 budget');
  console.log('✅ CLIP safe:', actualTokens <= 65 ? 'YES' : 'NO - DANGER!');
  console.log('📈 Data sources:', {
    style: styles[0] || 'none',
    coreNeed: sessionData?.ladderResults?.coreNeed || 'none',
    colors: colors.slice(0, 2),
    materials: materials[0] || 'none'
  });
  
  return finalPrompt;
}

// Keep old function for backwards compatibility but mark as deprecated
export function buildFinalFluxPromptFromSession(sessionData: any) {
  console.warn('⚠️ buildFinalFluxPromptFromSession is deprecated - use buildOptimizedFluxPrompt instead');
  return buildOptimizedFluxPrompt(sessionData);
}


