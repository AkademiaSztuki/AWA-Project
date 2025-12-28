// Style options matching the ones used in /flow/style-selection/page.tsx
// This ensures data consistency across the application

export interface StyleOption {
  id: string;
  labelPl: string;
  labelEn: string;
  description: string;
  descriptionPl: string;
}

// Style type for type safety across the application
export type StyleId = 
  | 'modern' | 'scandinavian' | 'industrial' | 'minimalist' | 'rustic'
  | 'bohemian' | 'contemporary' | 'traditional' | 'mid-century'
  | 'japanese' | 'art-deco' | 'vintage' | 'maximalist'
  | 'farmhouse' | 'mediterranean'
  | 'gothic' | 'zen' | 'eclectic';

export const STYLE_OPTIONS: StyleOption[] = [
  // === MODERN & MINIMAL ===
  {
    id: 'modern',
    labelPl: 'Nowoczesny',
    labelEn: 'Modern',
    description: 'Clean lines, minimalist approach, neutral colors',
    descriptionPl: 'Czyste linie, minimalistyczne podejście, neutralne kolory'
  },
  {
    id: 'minimalist',
    labelPl: 'Minimalistyczny',
    labelEn: 'Minimalist',
    description: 'Less is more, simple forms, functional',
    descriptionPl: 'Mniej znaczy więcej, proste formy, funkcjonalność'
  },
  {
    id: 'contemporary',
    labelPl: 'Współczesny',
    labelEn: 'Contemporary',
    description: 'Current trends, balanced, sophisticated',
    descriptionPl: 'Aktualne trendy, zbalansowany, wyrafinowany'
  },
  
  // === NORDIC & ZEN ===
  {
    id: 'scandinavian',
    labelPl: 'Skandynawski',
    labelEn: 'Scandinavian',
    description: 'Bright, natural light, wood accents, hygge',
    descriptionPl: 'Jasne, naturalne światło, akcenty drewniane, hygge'
  },
  {
    id: 'japanese',
    labelPl: 'Japoński',
    labelEn: 'Japanese',
    description: 'Wabi-sabi, natural materials, harmony with nature',
    descriptionPl: 'Wabi-sabi, naturalne materiały, harmonia z naturą'
  },
  {
    id: 'zen',
    labelPl: 'Zen',
    labelEn: 'Zen',
    description: 'Meditative calm, minimal decor, natural elements',
    descriptionPl: 'Medytacyjny spokój, minimalna dekoracja, naturalne elementy'
  },
  
  // === INDUSTRIAL & RAW ===
  {
    id: 'industrial',
    labelPl: 'Industrialny',
    labelEn: 'Industrial',
    description: 'Exposed brick, metal, raw materials',
    descriptionPl: 'Cegła, metal, surowe materiały'
  },
  
  // === CLASSIC & TRADITIONAL ===
  {
    id: 'traditional',
    labelPl: 'Klasyczny',
    labelEn: 'Traditional',
    description: 'Timeless elegance, classic furniture, warm',
    descriptionPl: 'Odwieczna elegancja, klasyczne meble, ciepło'
  },
  {
    id: 'mid-century',
    labelPl: 'Mid-Century',
    labelEn: 'Mid-Century Modern',
    description: 'Retro 50s-60s, organic curves, vintage',
    descriptionPl: 'Retro lata 50-60, organiczne krzywe, vintage'
  },
  {
    id: 'art-deco',
    labelPl: 'Art Deco',
    labelEn: 'Art Deco',
    description: 'Glamorous 1920s, geometric patterns, luxury',
    descriptionPl: 'Glamour lat 20., geometryczne wzory, luksus'
  },
  {
    id: 'vintage',
    labelPl: 'Vintage',
    labelEn: 'Vintage',
    description: 'Nostalgic charm, curated antiques, character',
    descriptionPl: 'Nostalgiczny urok, starannie dobrane antyki, charakter'
  },
  
  // === BOLD & ECLECTIC ===
  {
    id: 'bohemian',
    labelPl: 'Bohemian',
    labelEn: 'Bohemian',
    description: 'Eclectic, colorful, artistic, free-spirited',
    descriptionPl: 'Eklektyczny, kolorowy, artystyczny, wolny duch'
  },
  {
    id: 'maximalist',
    labelPl: 'Maksymalistyczny',
    labelEn: 'Maximalist',
    description: 'Bold patterns, rich colors, layered decor',
    descriptionPl: 'Śmiałe wzory, bogate kolory, warstwowa dekoracja'
  },
  {
    id: 'eclectic',
    labelPl: 'Eklektyczny',
    labelEn: 'Eclectic',
    description: 'Mixed styles, curated chaos, artistic expression',
    descriptionPl: 'Mieszane style, starannie dobrany chaos, artystyczna ekspresja'
  },
  {
    id: 'gothic',
    labelPl: 'Gotycki',
    labelEn: 'Gothic',
    description: 'Dark and dramatic, ornate details, moody',
    descriptionPl: 'Ciemny i dramatyczny, ozdobne detale, nastrojowy'
  },
  
  // === NATURAL & WARM ===
  {
    id: 'rustic',
    labelPl: 'Rustykalny',
    labelEn: 'Rustic',
    description: 'Natural wood, warm tones, countryside charm',
    descriptionPl: 'Naturalne drewno, ciepłe tony, wiejski urok'
  },
  {
    id: 'farmhouse',
    labelPl: 'Farmhouse',
    labelEn: 'Farmhouse',
    description: 'Cozy countryside, shiplap, vintage touches',
    descriptionPl: 'Przytulna wieś, deski, vintage akcenty'
  },
  {
    id: 'mediterranean',
    labelPl: 'Śródziemnomorski',
    labelEn: 'Mediterranean',
    description: 'Warm terracotta, rustic elegance, sunny vibes',
    descriptionPl: 'Ciepła terakota, rustykalna elegancja, słoneczny klimat'
  }
];

// Helper to get label based on language
export function getStyleLabel(styleId: string, language: 'pl' | 'en' = 'pl'): string {
  const style = STYLE_OPTIONS.find(s => s.id === styleId);
  if (!style) return styleId;
  return language === 'pl' ? style.labelPl : style.labelEn;
}

