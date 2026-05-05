import { parseLivingRoomTinderFilename } from '@/lib/tinder-livingroom-filename-parse';

export type MarketingLocale = 'pl' | 'en';

export type LivingRoomMarketingCard = {
  filename: string;
  url: string;
  title: string;
  label: string;
  description: string;
  chips: string[];
};

/** Curated marquee order — interleaves repeated styles so adjacent cards do not feel duplicated. */
export const LIVINGROOM_MARKETING_FILENAMES: readonly string[] = [
  'living_room_scandinavian_white_wood_simple_bright_warm_bright_forest_smooth_wood_plants_cozy_1.jpg.jpeg',
  'living_room_art_deco_gold_brass_complex_dark_warm_low_desert_cold_metal_none_luxurious_13.jpg.jpeg',
  'living_room_japanese_beige_bamboo_simple_bright_neutral_light_forest_smooth_wood_plants_zen_9.jpg.jpeg',
  'living_room_bohemian_pastel_mixed_complex_bright_warm_low_garden_soft_fabric_plants_playful_23.jpg.jpeg',
  'living_room_industrial_charcoal_metal_simple_dark_neutral_light_ocean_cold_metal_none_edgy_4.jpg.jpeg',
  'living_room_coastal_blue_white_simple_bright_cool_bright_ocean_glass_plants_fresh_11.jpg.jpeg',
  'living_room_traditional_burgundy_leather_complex_dark_warm_low_desert_warm_leather_none_elegant_8.jpg.jpeg',
  'living_room_minimalist_cream_linen_simple_bright_neutral_light_forest_smooth_wood_plants_calm_5.jpg.jpeg',
  'living_room_maximalist_jewel_tones_velvet_complex_bright_warm_bright_garden_soft_fabric_plants_playful_10.jpg.jpeg',
  'living_room_contemporary_neutral_marble_simple_bright_cool_bright_mountain_glass_none_sophisticated_7.jpg.jpeg',
  'living_room_rustic_warm_brown_wood_complex_bright_warm_bright_sunset_smooth_wood_plants_homey_26.jpg.jpeg',
  'living_room_tropical_green_rattan_complex_bright_warm_bright_garden_soft_fabric_plants_vibrant_17.jpg.jpeg',
  'living_room_gothic_black_metal_simple_dark_cool_bright_mountain_cold_metal_none_dramatic_19.jpg.jpeg',
  'living_room_mid_century_orange_wood_complex_bright_warm_bright_sunset_warm_leather_plants_nostalgic_18.jpg.jpeg',
  'living_room_zen_white_stone_simple_bright_neutral_light_mountain_rough_stone_plants_serene_15.jpg.jpeg',
  'living_room_mediterranean_terracotta_clay_complex_bright_warm_bright_sunset_rough_stone_plants_warm_16.jpg.jpeg',
  'living_room_modern_black_white_simple_dark_neutral_light_ocean_glass_none_minimal_22.jpg.jpeg',
  'living_room_farmhouse_warm_cream_wood_simple_bright_warm_bright_garden_smooth_wood_plants_comfortable_14.jpg.jpeg',
  'living_room_eclectic_rainbow_mixed_complex_bright_warm_low_sunset_soft_fabric_plants_groovy_12.jpg.jpeg',
  'living_room_vintage_brown_leather_complex_dark_warm_low_desert_warm_leather_none_nostalgic_20.jpg.jpeg',
  'living_room_contemporary_neutral_steel_simple_bright_cool_bright_mountain_cold_metal_none_sophisticated_27.jpg.png',
  'living_room_bohemian_warm_earth_velvet_complex_bright_warm_low_garden_soft_fabric_plants_romantic_3.jpg.jpeg',
  'living_room_industrial_grey_concrete_simple_dark_cool_bright_mountain_cold_metal_none_urban_24.jpg.jpeg',
  'living_room_japanese_natural_bamboo_simple_bright_neutral_light_forest_smooth_wood_plants_zen_29.jpg.png',
  'living_room_minimalist_white_marble_simple_bright_neutral_light_forest_glass_plants_calm_25.jpg.jpeg',
  'living_room_rustic_warm_wood_complex_bright_warm_bright_sunset_warm_leather_plants_homey_6.jpg.jpeg',
  'living_room_scandinavian_light_grey_wood_simple_bright_warm_bright_forest_smooth_wood_plants_hygge_21.jpg.jpeg',
  'living_room_traditional_deep_red_wood_complex_dark_warm_low_desert_warm_leather_none_elegant_28.jpg.png',
  'living_room_maximalist_rich_colors_velvet_complex_bright_warm_bright_garden_soft_fabric_plants_bold_30.jpg.png',
  'living_room_modern_grey_concrete_complex_dark_cool_bright_mountain_cold_metal_none_minimal_2.jpg.jpeg',
];

const STYLE_LABELS: Partial<Record<string, { pl: string; en: string }>> = {
  art_deco: { pl: 'Art déco', en: 'Art deco' },
  bohemian: { pl: 'Boho', en: 'Bohemian' },
  coastal: { pl: 'Nadmorski', en: 'Coastal' },
  contemporary: { pl: 'Współczesny', en: 'Contemporary' },
  eclectic: { pl: 'Eklektyczny', en: 'Eclectic' },
  farmhouse: { pl: 'Rustykalny farmhouse', en: 'Farmhouse' },
  gothic: { pl: 'Gotycki', en: 'Gothic' },
  industrial: { pl: 'Industrialny', en: 'Industrial' },
  japanese: { pl: 'Japoński', en: 'Japanese' },
  maximalist: { pl: 'Maksymalistyczny', en: 'Maximalist' },
  mediterranean: { pl: 'Śródziemnomorski', en: 'Mediterranean' },
  mid_century: { pl: 'Mid-century', en: 'Mid-century' },
  minimalist: { pl: 'Minimalistyczny', en: 'Minimalist' },
  modern: { pl: 'Nowoczesny', en: 'Modern' },
  rustic: { pl: 'Rustykalny', en: 'Rustic' },
  scandinavian: { pl: 'Skandynawski', en: 'Scandinavian' },
  traditional: { pl: 'Tradycyjny', en: 'Traditional' },
  tropical: { pl: 'Tropikalny', en: 'Tropical' },
  vintage: { pl: 'Vintage', en: 'Vintage' },
  zen: { pl: 'Zen', en: 'Zen' },
};

function titleCaseStyle(styleKey: string): string {
  return styleKey
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function styleTitle(style: string | null, locale: MarketingLocale): string {
  if (!style) return locale === 'pl' ? 'Salon' : 'Living room';
  const mapped = STYLE_LABELS[style];
  if (mapped) return mapped[locale];
  return titleCaseStyle(style);
}

const COLOR_PL: Record<string, string> = {
  warm: 'ciepły',
  cool: 'chłodny',
  neutral: 'neutralny',
  bright: 'jasny',
  dark: 'ciemny',
  white: 'biały',
  beige: 'beż',
  grey: 'szarość',
  gray: 'szarość',
  black: 'czerń',
  gold: 'złoto',
  brass: 'mosiądz',
  blue: 'błękit',
  green: 'zieleń',
  pastel: 'pastel',
  jewel: 'jewel tones',
  tones: '',
  rainbow: 'tęcza',
  earth: 'ziemisty',
  cream: 'krem',
  charcoal: 'antracyt',
  terracotta: 'terakota',
  burgundy: 'bordo',
  orange: 'pomarańcz',
  brown: 'brąz',
  ocean: 'ocean',
  forest: 'las',
  sand: 'piasek',
  natural: 'naturalny',
  mixed: 'mix',
};

function translateToken(token: string, locale: MarketingLocale, kind: 'color' | 'material' | 'mood'): string {
  if (locale === 'en') return token.replace(/_/g, ' ');
  if (kind === 'color') return COLOR_PL[token] ?? token.replace(/_/g, ' ');
  return token.replace(/_/g, ' ');
}

function buildChips(parsed: ReturnType<typeof parseLivingRoomTinderFilename>, locale: MarketingLocale): string[] {
  const chips: string[] = [];
  if (parsed.style) chips.push(styleTitle(parsed.style, locale));
  parsed.colors.slice(0, 2).forEach((c) => chips.push(translateToken(c, locale, 'color')));
  parsed.materials.slice(0, 2).forEach((m) => chips.push(translateToken(m, locale, 'material')));
  parsed.mood.slice(0, 1).forEach((m) => chips.push(translateToken(m, locale, 'mood')));
  if (parsed.biophilia >= 2) chips.push(locale === 'pl' ? 'rośliny' : 'plants');
  return [...new Set(chips.filter(Boolean))].slice(0, 6);
}

function buildDescription(parsed: ReturnType<typeof parseLivingRoomTinderFilename>, locale: MarketingLocale): string {
  const s = styleTitle(parsed.style, locale);
  if (locale === 'pl') {
    const parts: string[] = [];
    if (parsed.colors.length) {
      parts.push(`Paleta: ${parsed.colors.map((c) => translateToken(c, 'pl', 'color')).filter(Boolean).join(', ')}.`);
    }
    if (parsed.materials.length) {
      parts.push(`Materiały: ${parsed.materials.map((m) => translateToken(m, 'pl', 'material')).join(', ')}.`);
    }
    if (parsed.lighting.length) {
      parts.push(`Światło: ${parsed.lighting.join(', ')}.`);
    }
    if (parsed.mood.length) {
      parts.push(`Klimat: ${parsed.mood.map((m) => translateToken(m, 'pl', 'mood')).join(', ')}.`);
    }
    const body = parts.join(' ');
    return body.trim() ? `${s} — ${body}` : `${s} — tagi z nazwy pliku (jak w Interior Tinder).`;
  }

  const parts: string[] = [];
  if (parsed.colors.length) parts.push(`Palette: ${parsed.colors.join(', ')}.`);
  if (parsed.materials.length) parts.push(`Materials: ${parsed.materials.join(', ')}.`);
  if (parsed.lighting.length) parts.push(`Light: ${parsed.lighting.join(', ')}.`);
  if (parsed.mood.length) parts.push(`Mood: ${parsed.mood.join(', ')}.`);
  const body = parts.join(' ');
  return body.trim() ? `${s} — ${body}` : `${s} — filename tags (Interior Tinder).`;
}

function buildLabel(parsed: ReturnType<typeof parseLivingRoomTinderFilename>, locale: MarketingLocale): string {
  const tone =
    parsed.colors.includes('warm') || parsed.colors.includes('earth')
      ? locale === 'pl'
        ? 'ciepło'
        : 'warmth'
      : parsed.colors.includes('cool')
        ? locale === 'pl'
          ? 'chłód'
          : 'cool'
        : locale === 'pl'
          ? 'balans'
          : 'balance';
  const complexity =
    parsed.tags.includes('simple') || parsed.tags.includes('minimal')
      ? locale === 'pl'
        ? 'spójna forma'
        : 'clean form'
      : parsed.tags.includes('complex')
        ? locale === 'pl'
          ? 'bogatsza kompozycja'
          : 'richer composition'
        : locale === 'pl'
          ? 'średnia złożoność'
          : 'medium complexity';

  return locale === 'pl' ? `${tone} · ${complexity}` : `${tone} · ${complexity}`;
}

/** Short “personality” line for marketing cards — mood-first, then style hint (no palette dumps). */
const MOOD_PERSONALITY: Partial<Record<string, { pl: string; en: string }>> = {
  calm: { pl: 'Spokój i skupienie', en: 'Calm focus' },
  cozy: { pl: 'Ciepło i przytulność', en: 'Cozy warmth' },
  serene: { pl: 'Cisza i równowaga', en: 'Serene balance' },
  peaceful: { pl: 'Spokój dla zmysłów', en: 'Peaceful senses' },
  elegant: { pl: 'Elegancja bez zgiełku', en: 'Quiet elegance' },
  sophisticated: { pl: 'Dojrzała harmonia', en: 'Refined harmony' },
  playful: { pl: 'Lekka energia', en: 'Playful energy' },
  fresh: { pl: 'Świeżość i światło', en: 'Fresh and bright' },
  dramatic: { pl: 'Kontrast i teatr przestrzeni', en: 'Dramatic contrast' },
  bold: { pl: 'Odważny charakter', en: 'Bold character' },
  minimal: { pl: 'Minimum, maksimum spokoju', en: 'Minimal calm' },
  relaxing: { pl: 'Odpoczynek dla zmysłów', en: 'Sensory rest' },
  harmonious: { pl: 'Harmonia form', en: 'Harmonious balance' },
  romantic: { pl: 'Ciepły, romantyczny klimat', en: 'Warm romance' },
  comfortable: { pl: 'Domowy komfort', en: 'Home comfort' },
  homey: { pl: 'Przytulny, „domowy” klimat', en: 'Homey warmth' },
  nostalgic: { pl: 'Nostalgiczny nastrój', en: 'Nostalgic mood' },
  urban: { pl: 'Miejski charakter', en: 'Urban edge' },
  edgy: { pl: 'Surowa energia', en: 'Raw edge' },
  groovy: { pl: 'Swoboda i rytm', en: 'Groovy rhythm' },
  luxurious: { pl: 'Luksus bez krzyku', en: 'Quiet luxury' },
  vibrant: { pl: 'Żywa energia', en: 'Vibrant energy' },
  zen: { pl: 'Zen i porządek', en: 'Zen clarity' },
  hygge: { pl: 'Hygge i komfort', en: 'Hygge comfort' },
  warm: { pl: 'Ciepły klimat', en: 'Warm atmosphere' },
  refreshing: { pl: 'Orzeźwienie i lekkość', en: 'Refreshing lightness' },
  authentic: { pl: 'Naturalny charakter', en: 'Authentic feel' },
  contemplative: { pl: 'Przestrzeń do refleksji', en: 'Contemplative space' },
  graceful: { pl: 'Lekki, stonowany ton', en: 'Graceful restraint' },
  refined: { pl: 'Dopracowany detal', en: 'Refined detail' },
  mystical: { pl: 'Intymny, „magiczny” klimat', en: 'Intimate mood' },
  sunny: { pl: 'Słoneczny nastrój', en: 'Sunny warmth' },
  laid_back: { pl: 'Luźny, komfortowy vibe', en: 'Laid-back comfort' },
  relaxed: { pl: 'Luźny relaks', en: 'Relaxed ease' },
  breezy: { pl: 'Lekki jak powiew', en: 'Breezy lightness' },
  fun: { pl: 'Zabawa z formą', en: 'Playful fun' },
  unconventional: { pl: 'Poza schematem', en: 'Unconventional edge' },
  energetic: { pl: 'Dynamiczna energia', en: 'Dynamic energy' },
  tropical: { pl: 'Tropikalna swoboda', en: 'Tropical ease' },
};

const STYLE_PERSONALITY: Partial<Record<string, { pl: string; en: string }>> = {
  minimalist: { pl: 'Spokój linii i przestrzeni', en: 'Quiet lines and space' },
  zen: { pl: 'Uważność i cisza', en: 'Mindful stillness' },
  scandinavian: { pl: 'Lekkość i hygge', en: 'Light Nordic hygge' },
  japanese: { pl: 'Harmonia i porządek', en: 'Harmony and order' },
  industrial: { pl: 'Surowy, szczery charakter', en: 'Honest industrial grit' },
  bohemian: { pl: 'Swoboda i warstwy tekstur', en: 'Free-spirited layers' },
  coastal: { pl: 'Powiew świeżości', en: 'Coastal freshness' },
  farmhouse: { pl: 'Ciepło rodzinnego stołu', en: 'Warm farmhouse ease' },
  gothic: { pl: 'Misterna ciemność', en: 'Ornate darkness' },
  art_deco: { pl: 'Glamour i geometria', en: 'Glamour and geometry' },
  mid_century: { pl: 'Retro optymizm formy', en: 'Retro optimism' },
  maximalist: { pl: 'Odważna ilość detalu', en: 'Bold abundance' },
  traditional: { pl: 'Klasyczny spokój', en: 'Classic calm' },
  tropical: { pl: 'Żywa, tropikalna energia', en: 'Tropical vitality' },
  vintage: { pl: 'Stare dusze, nowe życie', en: 'Vintage soul' },
  modern: { pl: 'Nowoczesna klarowność', en: 'Modern clarity' },
  rustic: { pl: 'Ciepło surowego drewna', en: 'Rustic warmth' },
  eclectic: { pl: 'Miks osobowości', en: 'Eclectic mix' },
  contemporary: { pl: 'Współczesny balans', en: 'Contemporary balance' },
  mediterranean: { pl: 'Słoneczny Mediteran', en: 'Sunny Mediterranean' },
};

function buildPersonalityLine(parsed: ReturnType<typeof parseLivingRoomTinderFilename>, locale: MarketingLocale): string {
  for (const raw of parsed.mood) {
    const key = raw.toLowerCase().replace(/\s+/g, '_');
    const hit = MOOD_PERSONALITY[key];
    if (hit) return hit[locale];
  }
  for (const raw of parsed.mood) {
    const norm = raw.toLowerCase();
    const entry = Object.entries(MOOD_PERSONALITY).find(
      ([k]) => norm === k || norm.includes(k) || k.includes(norm)
    );
    if (entry) {
      const row = entry[1];
      if (row) return row[locale];
    }
  }
  const styleRow = parsed.style ? STYLE_PERSONALITY[parsed.style] : undefined;
  if (styleRow) {
    return styleRow[locale];
  }
  return buildLabel(parsed, locale);
}

export function buildLivingRoomMarketingCards(locale: MarketingLocale): LivingRoomMarketingCard[] {
  return LIVINGROOM_MARKETING_FILENAMES.map((filename) => {
    const parsed = parseLivingRoomTinderFilename(filename);
    const title = styleTitle(parsed.style, locale);
    return {
      filename,
      url: `/Tinder/Livingroom/${filename}`,
      title,
      label: buildPersonalityLine(parsed, locale),
      description: buildDescription(parsed, locale),
      chips: buildChips(parsed, locale),
    };
  });
}
