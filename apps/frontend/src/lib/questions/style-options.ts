// Style options matching the ones used in /flow/style-selection/page.tsx
// This ensures data consistency across the application

export interface StyleOption {
  id: string;
  labelPl: string;
  labelEn: string;
  description: string;
}

// Style type for type safety across the application
export type StyleId = 
  | 'modern' | 'scandinavian' | 'industrial' | 'minimalist' | 'rustic'
  | 'bohemian' | 'contemporary' | 'traditional' | 'mid-century'
  | 'japanese' | 'art-deco' | 'vintage' | 'maximalist' | 'coastal'
  | 'farmhouse' | 'transitional' | 'mediterranean' | 'tropical'
  | 'gothic' | 'zen' | 'eclectic';

export const STYLE_OPTIONS: StyleOption[] = [
  // === MODERN & MINIMAL ===
  {
    id: 'modern',
    labelPl: 'Nowoczesny',
    labelEn: 'Modern',
    description: 'Clean lines, minimalist approach, neutral colors'
  },
  {
    id: 'minimalist',
    labelPl: 'Minimalistyczny',
    labelEn: 'Minimalist',
    description: 'Less is more, simple forms, functional'
  },
  {
    id: 'contemporary',
    labelPl: 'Współczesny',
    labelEn: 'Contemporary',
    description: 'Current trends, balanced, sophisticated'
  },
  {
    id: 'transitional',
    labelPl: 'Przejściowy',
    labelEn: 'Transitional',
    description: 'Blend of traditional and modern, timeless yet fresh'
  },
  
  // === NORDIC & ZEN ===
  {
    id: 'scandinavian',
    labelPl: 'Skandynawski',
    labelEn: 'Scandinavian',
    description: 'Bright, natural light, wood accents, hygge'
  },
  {
    id: 'japanese',
    labelPl: 'Japoński',
    labelEn: 'Japanese',
    description: 'Wabi-sabi, natural materials, harmony with nature'
  },
  {
    id: 'zen',
    labelPl: 'Zen',
    labelEn: 'Zen',
    description: 'Meditative calm, minimal decor, natural elements'
  },
  
  // === INDUSTRIAL & RAW ===
  {
    id: 'industrial',
    labelPl: 'Industrialny',
    labelEn: 'Industrial',
    description: 'Exposed brick, metal, raw materials'
  },
  
  // === CLASSIC & TRADITIONAL ===
  {
    id: 'traditional',
    labelPl: 'Klasyczny',
    labelEn: 'Traditional',
    description: 'Timeless elegance, classic furniture, warm'
  },
  {
    id: 'mid-century',
    labelPl: 'Mid-Century',
    labelEn: 'Mid-Century Modern',
    description: 'Retro 50s-60s, organic curves, vintage'
  },
  {
    id: 'art-deco',
    labelPl: 'Art Deco',
    labelEn: 'Art Deco',
    description: 'Glamorous 1920s, geometric patterns, luxury'
  },
  {
    id: 'vintage',
    labelPl: 'Vintage',
    labelEn: 'Vintage',
    description: 'Nostalgic charm, curated antiques, character'
  },
  
  // === BOLD & ECLECTIC ===
  {
    id: 'bohemian',
    labelPl: 'Bohemian',
    labelEn: 'Bohemian',
    description: 'Eclectic, colorful, artistic, free-spirited'
  },
  {
    id: 'maximalist',
    labelPl: 'Maksymalistyczny',
    labelEn: 'Maximalist',
    description: 'Bold patterns, rich colors, layered decor'
  },
  {
    id: 'eclectic',
    labelPl: 'Eklektyczny',
    labelEn: 'Eclectic',
    description: 'Mixed styles, curated chaos, artistic expression'
  },
  {
    id: 'gothic',
    labelPl: 'Gotycki',
    labelEn: 'Gothic',
    description: 'Dark and dramatic, ornate details, moody'
  },
  
  // === NATURAL & WARM ===
  {
    id: 'rustic',
    labelPl: 'Rustykalny',
    labelEn: 'Rustic',
    description: 'Natural wood, warm tones, countryside charm'
  },
  {
    id: 'farmhouse',
    labelPl: 'Farmhouse',
    labelEn: 'Farmhouse',
    description: 'Cozy countryside, shiplap, vintage touches'
  },
  {
    id: 'coastal',
    labelPl: 'Nadmorski',
    labelEn: 'Coastal',
    description: 'Beach house vibes, light and airy, nautical'
  },
  {
    id: 'mediterranean',
    labelPl: 'Śródziemnomorski',
    labelEn: 'Mediterranean',
    description: 'Warm terracotta, rustic elegance, sunny vibes'
  },
  {
    id: 'tropical',
    labelPl: 'Tropikalny',
    labelEn: 'Tropical',
    description: 'Exotic plants, vibrant colors, natural materials'
  }
];

// Helper to get label based on language
export function getStyleLabel(styleId: string, language: 'pl' | 'en' = 'pl'): string {
  const style = STYLE_OPTIONS.find(s => s.id === styleId);
  if (!style) return styleId;
  return language === 'pl' ? style.labelPl : style.labelEn;
}

