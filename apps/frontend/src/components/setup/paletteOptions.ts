export type PaletteLabel = {
  pl: string;
  en: string;
};

export interface ColorPaletteOption {
  id: string;
  colors: string[];
  label: PaletteLabel;
}

export const COLOR_PALETTE_OPTIONS: ColorPaletteOption[] = [
  { 
    id: 'warm-earth', 
    colors: ['#8B7355', '#D4A574', '#F5DEB3', '#E6D5B8'],
    label: { pl: 'Ciepła Ziemia', en: 'Warm Earth' }
  },
  { 
    id: 'cool-nordic', 
    colors: ['#E8F1F5', '#B0C4DE', '#778899', '#A9B8C2'],
    label: { pl: 'Nordycki Chłód', en: 'Cool Nordic' }
  },
  { 
    id: 'vibrant-bold', 
    colors: ['#FF6B6B', '#4ECDC4', '#FFE66D', '#95E1D3'],
    label: { pl: 'Odważne Kolory', en: 'Vibrant Bold' }
  },
  { 
    id: 'natural-green', 
    colors: ['#6B8E23', '#8FBC8F', '#F5F5DC', '#DEB887'],
    label: { pl: 'Naturalna Zieleń', en: 'Natural Green' }
  },
  { 
    id: 'monochrome', 
    colors: ['#2C2C2C', '#5C5C5C', '#8C8C8C', '#E8E8E8'],
    label: { pl: 'Monochromatyczne', en: 'Monochrome' }
  },
  { 
    id: 'soft-pastels', 
    colors: ['#FFB6C1', '#E6E6FA', '#FFE4E1', '#F0E68C'],
    label: { pl: 'Miękkie Pastele', en: 'Soft Pastels' }
  }
];

export const getPaletteLabel = (paletteId?: string, language: 'pl' | 'en' = 'pl') =>
  COLOR_PALETTE_OPTIONS.find(p => p.id === paletteId)?.label[language];

