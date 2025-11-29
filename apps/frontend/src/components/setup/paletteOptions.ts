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
    id: 'biophilic-restoration', 
    colors: ['#2D4A3E', '#8FBC8F', '#8B5A2B', '#E6DCC8'],
    label: { pl: 'Regeneracja Biofiliczna', en: 'Biophilic Restoration' }
  },
  { 
    id: 'cognitive-calm', 
    colors: ['#1B3B5F', '#6B8EAE', '#B0C4DE', '#F0F8FF'],
    label: { pl: 'Spokój Umysłu', en: 'Cognitive Calm' }
  },
  { 
    id: 'social-warmth', 
    colors: ['#C05640', '#D99E32', '#F2C94C', '#FFF8E7'],
    label: { pl: 'Ciepło Społeczne', en: 'Social Warmth' }
  },
  { 
    id: 'focus-minimalism', 
    colors: ['#2C2C2C', '#757575', '#CFCFC4', '#FAFAFA'],
    label: { pl: 'Minimalizm Skupienia', en: 'Focus Minimalism' }
  },
  { 
    id: 'vital-energy', 
    colors: ['#D72638', '#FF6B6B', '#FFD93D', '#EEEEEE'],
    label: { pl: 'Energia Witalna', en: 'Vital Energy' }
  },
  { 
    id: 'analogous-harmony', 
    colors: ['#4A2C40', '#8E6C88', '#C98CA7', '#FADADD'],
    label: { pl: 'Harmonia Analogiczna', en: 'Analogous Harmony' }
  },
  {
    id: 'earthen-balance',
    colors: ['#3E2723', '#8D6E63', '#556B2F', '#D7CCC8'],
    label: { pl: 'Równowaga Ziemi', en: 'Earthen Balance' }
  },
  {
    id: 'nordic-light',
    colors: ['#A8DADC', '#F1FAEE', '#E0D6CC', '#9E9E9E'],
    label: { pl: 'Światło Nordyckie', en: 'Nordic Light' }
  },
  {
    id: 'deep-luxury',
    colors: ['#121212', '#C5A059', '#1A3C34', '#5D101D'],
    label: { pl: 'Luksusowa Głębia', en: 'Deep Luxury' }
  }
];

export const getPaletteLabel = (paletteId?: string, language: 'pl' | 'en' = 'pl') =>
  COLOR_PALETTE_OPTIONS.find(p => p.id === paletteId)?.label[language];
