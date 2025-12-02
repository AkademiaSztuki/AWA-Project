// Style options matching the ones used in /flow/style-selection/page.tsx
// This ensures data consistency across the application

export interface StyleOption {
  id: string;
  labelPl: string;
  labelEn: string;
  description: string;
}

export const STYLE_OPTIONS: StyleOption[] = [
  {
    id: 'modern',
    labelPl: 'Nowoczesny',
    labelEn: 'Modern',
    description: 'Clean lines, minimalist approach, neutral colors'
  },
  {
    id: 'scandinavian',
    labelPl: 'Skandynawski',
    labelEn: 'Scandinavian',
    description: 'Bright, natural light, wood accents, hygge'
  },
  {
    id: 'industrial',
    labelPl: 'Industrialny',
    labelEn: 'Industrial',
    description: 'Exposed brick, metal, raw materials'
  },
  {
    id: 'minimalist',
    labelPl: 'Minimalistyczny',
    labelEn: 'Minimalist',
    description: 'Less is more, simple forms, functional'
  },
  {
    id: 'rustic',
    labelPl: 'Rustykalny',
    labelEn: 'Rustic',
    description: 'Natural wood, warm tones, countryside charm'
  },
  {
    id: 'bohemian',
    labelPl: 'Bohemian',
    labelEn: 'Bohemian',
    description: 'Eclectic, colorful, artistic, free-spirited'
  },
  {
    id: 'contemporary',
    labelPl: 'Współczesny',
    labelEn: 'Contemporary',
    description: 'Current trends, balanced, sophisticated'
  },
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
  }
];

// Helper to get label based on language
export function getStyleLabel(styleId: string, language: 'pl' | 'en' = 'pl'): string {
  const style = STYLE_OPTIONS.find(s => s.id === styleId);
  if (!style) return styleId;
  return language === 'pl' ? style.labelPl : style.labelEn;
}

