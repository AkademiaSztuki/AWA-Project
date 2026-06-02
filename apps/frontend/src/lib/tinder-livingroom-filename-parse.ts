/**
 * Parses `public/Tinder/Livingroom/*` filenames into the same tags/categories
 * as `GET /api/tinder/livingroom` (shared heuristic vocabulary).
 */

export type LivingRoomTinderCategories = {
  style: string | null;
  colors: string[];
  materials: string[];
  furniture: string[];
  lighting: string[];
  layout: string[];
  mood: string[];
  biophilia: number;
  brightness?: 'bright' | 'dark' | null;
  complexity?: 'complex' | 'simple' | null;
  lightingMood?: 'warm_low' | 'warm_bright' | 'cool_bright' | 'neutral_light' | null;
};

export type LivingRoomTinderParsed = LivingRoomTinderCategories & {
  tags: string[];
};

const STYLE_WORDS = new Set([
  'modern', 'scandinavian', 'minimalist', 'industrial', 'rustic', 'bohemian',
  'contemporary', 'traditional', 'mid_century', 'japandi', 'wabi_sabi', 'wabi', 'sabi',
  'art_deco', 'art_nouveau', 'coastal', 'mediterranean', 'tropical',
  'hollywood_regency', 'french_provincial', 'english_country', 'nordic_hygge', 'nordic',
  'brutalist', 'maximalist', 'eclectic', 'zen', 'moroccan', 'southwestern',
  'california_casual', 'brooklyn_loft', 'parisian_chic', 'memphis_postmodern', 'memphis',
  'biophilic', 'vintage', 'retro', 'classic', 'luxury', 'glam',
  'farmhouse', 'gothic', 'japanese', 'transitional'
]);

const COLOR_WORDS = new Set([
  'white','beige','grey','gray','black','charcoal','cream','sage','green','blue','ocean','navy','turquoise','teal','pink','blush','pastel','lavender','burgundy','gold','silver','chrome','copper','mustard','peach','coral','orange','yellow','red','brown','jewel','tones','mint',
  'earth','clay','muted','sand','terracotta','forest','neutral','natural','warm','cool',
  'adobe','turquoise','coral','avocado','rainbow','jewel_tones','deep','rich'
]);

const MATERIAL_WORDS = new Set([
  'wood','oak','birch','bamboo','stone','marble','linen','cotton','wool','leather','metal','steel','brass','copper','rattan','jute','ceramic','glass','concrete',
  'velvet','silk','chrome','plastic','adobe','driftwood','wicker','live_edge','raw','unfinished','mixed'
]);

const FURNITURE_WORDS = new Set([
  'sofa','sectional','modular','chesterfield','wingback','armchair','table','coffee','console','bench','pouf','low','seating','poufs','cushions','low_seating','poufs_cushions'
]);

const LIGHTING_WORDS = new Set([
  'natural','daylight','pendant','spotlights','neon','led','strips','lamps','sconces','recessed','statement','chandelier','crystal','table_lamps','floor_lamps','paper','lanterns'
]);

const LAYOUT_WORDS = new Set([
  'open','plan','loft','style','zoned','areas','compact','efficient','indoor','outdoor','flow','spacious','cozy','intimate'
]);

/** Parsed from filename tokens only — images unchanged. */
const BRIGHTNESS_WORDS = new Set(['bright', 'dark', 'light', 'dim', 'moody']);
const COMPLEXITY_WORDS = new Set(['complex', 'simple', 'minimal', 'minimalist']);

const LIGHTING_MOOD_WORDS = new Set(['warm_low', 'warm_bright', 'cool_bright', 'neutral_light']);

const MOOD_WORDS = new Set([
  'cozy','warm','serene','peaceful','romantic','elegant','luxurious','dramatic','playful','fresh','relaxing','authentic','minimal','calm','refreshing','harmonious','bold',
  'hygge','zen','groovy','nostalgic','tropical','urban','edgy','imperfect','contemplative','graceful','flowing','sophisticated','refined','mystical','homey','comfortable','laid_back','sunny','relaxed','breezy','fun','unconventional','energetic','80s','vibrant'
]);

const BIOPHILIA_WORDS = new Set([
  'plants','nature','forest','greenery','biophilic','organic','botanical','garden',
  'natural','live_edge','indoor_outdoor','flowing','refreshing','harmonious'
]);

function stripExtensions(filename: string): string {
  return filename.replace(/\.(jpg|jpeg|png)(\.(jpg|jpeg|png))?$/i, '');
}

export function parseLivingRoomTinderFilename(filename: string): LivingRoomTinderParsed {
  const base = stripExtensions(filename);
  const parts = base.split('_');

  const startIndex = parts[0] === 'living' && parts[1] === 'room' ? 2 : 0;
  const tokens = parts.slice(startIndex);

  if (tokens.length > 0 && /^\d+$/.test(tokens[tokens.length - 1])) {
    tokens.pop();
  }

  const tags = [...tokens];

  const reconstructedTokens: string[] = [];
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    const nextToken = tokens[i + 1];

    if (nextToken) {
      const twoWordStyle = `${token}_${nextToken}`;
      if (STYLE_WORDS.has(twoWordStyle)) {
        reconstructedTokens.push(twoWordStyle);
        i++;
        continue;
      }
    }

    reconstructedTokens.push(token);
  }

  const styleTokens: string[] = [];
  const colors: string[] = [];
  const materials: string[] = [];
  const furniture: string[] = [];
  const lighting: string[] = [];
  const layout: string[] = [];
  const mood: string[] = [];
  let biophiliaCount = 0;
  let brightness: 'bright' | 'dark' | null = null;
  let complexity: 'complex' | 'simple' | null = null;
  let lightingMood: LivingRoomTinderCategories['lightingMood'] = null;

  for (let i = 0; i < reconstructedTokens.length; i++) {
    const token = reconstructedTokens[i];
    const next = reconstructedTokens[i + 1];
    const twoWord = next ? `${token}_${next}` : null;
    if (twoWord && LIGHTING_MOOD_WORDS.has(twoWord)) {
      lightingMood = twoWord as NonNullable<LivingRoomTinderCategories['lightingMood']>;
      i++;
      continue;
    }
  }

  for (const token of reconstructedTokens) {
    if (STYLE_WORDS.has(token)) {
      styleTokens.push(token);
    } else if (BIOPHILIA_WORDS.has(token)) {
      biophiliaCount++;
    } else if (BRIGHTNESS_WORDS.has(token) && !brightness) {
      brightness = token === 'dark' || token === 'dim' || token === 'moody' ? 'dark' : 'bright';
    } else if (COMPLEXITY_WORDS.has(token) && !complexity) {
      complexity = token === 'complex' ? 'complex' : 'simple';
    } else if (COLOR_WORDS.has(token) && colors.length < 2) {
      colors.push(token);
    } else if (MATERIAL_WORDS.has(token) && materials.length < 2) {
      materials.push(token);
    } else if (FURNITURE_WORDS.has(token) && furniture.length < 2) {
      furniture.push(token);
    } else if (LIGHTING_WORDS.has(token) && lighting.length < 2) {
      lighting.push(token);
    } else if (LAYOUT_WORDS.has(token) && layout.length < 2) {
      layout.push(token);
    } else if (MOOD_WORDS.has(token) && mood.length < 2) {
      mood.push(token);
    }
  }

  const biophilia =
    biophiliaCount === 0 ? 0 : biophiliaCount <= 2 ? 1 : biophiliaCount <= 4 ? 2 : 3;

  const style = styleTokens.length > 0 ? styleTokens[0] : null;

  return {
    style,
    colors,
    materials,
    furniture,
    lighting,
    layout,
    mood,
    biophilia,
    brightness,
    complexity,
    lightingMood,
    tags,
  };
}
