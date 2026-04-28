import { STYLE_OPTIONS } from '@/lib/questions/style-options';

export type PaletteLabel = {
  pl: string;
  en: string;
};

export interface ColorPaletteOption {
  id: string;
  colors: string[];
  label: PaletteLabel;
}

/** Classic interior palettes — length must match `STYLE_OPTIONS` (see check below). */
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
  },
  {
    id: 'warm-greige',
    colors: ['#B8B5B0', '#E8E6E1', '#9A9590', '#F5F3EF'],
    label: { pl: 'Ciepły greige', en: 'Warm Greige' }
  },
  {
    id: 'terracotta-olive',
    colors: ['#C4624D', '#E5D4C5', '#6B7F5A', '#FAF6F0'],
    label: { pl: 'Terakota i oliwka', en: 'Terracotta & Olive' }
  },
  {
    id: 'coastal-hamptons',
    colors: ['#4A6FA5', '#9EC5E8', '#E8DCC8', '#FEFEFE'],
    label: { pl: 'Wybrzeże (Hamptons)', en: 'Coastal (Hamptons)' }
  },
  {
    id: 'sage-cream',
    colors: ['#8FA68E', '#F4F1E8', '#C9B8A4', '#4A5A45'],
    label: { pl: 'Szałwia i krem', en: 'Sage & Cream' }
  },
  {
    id: 'monochrome-bw',
    colors: ['#1A1A1A', '#F7F7F7', '#757575', '#E0E0E0'],
    label: { pl: 'Czerń i biel', en: 'Black & White' }
  },
  {
    id: 'dusty-rose',
    colors: ['#B89090', '#F0E4E4', '#9E6B6B', '#FFFAFA'],
    label: { pl: 'Róż brudny', en: 'Dusty Rose' }
  },
  {
    id: 'forest-walnut',
    colors: ['#2A3D32', '#5D4037', '#6D775C', '#D8D0C4'],
    label: { pl: 'Las i orzech', en: 'Forest & Walnut' }
  },
  {
    id: 'ochre-sand',
    colors: ['#C9A227', '#EDE4CF', '#7D6E52', '#FFF9E6'],
    label: { pl: 'Ochra i piasek', en: 'Ochre & Sand' }
  },
  {
    id: 'cool-slate',
    colors: ['#455A64', '#90A4AE', '#CFD8DC', '#ECEFF1'],
    label: { pl: 'Chłodny grafit', en: 'Cool Slate' }
  }
];

if (COLOR_PALETTE_OPTIONS.length !== STYLE_OPTIONS.length) {
  console.warn(
    `[paletteOptions] Expected ${STYLE_OPTIONS.length} palettes (STYLE_OPTIONS), found ${COLOR_PALETTE_OPTIONS.length}.`
  );
}

export const getPaletteLabel = (paletteId?: string, language: 'pl' | 'en' = 'pl') =>
  COLOR_PALETTE_OPTIONS.find(p => p.id === paletteId)?.label[language];
