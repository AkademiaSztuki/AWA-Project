// TIER 1: Validated Research Scales
// These questions are IMMUTABLE - required for research validity
// Based on established environmental psychology instruments
// Bilingual support: PL (Polish) / EN (English)

export type Language = 'pl' | 'en';

export interface LocalizedText {
  pl: string;
  en: string;
}

export interface ValidatedScale {
  id: string;
  name: LocalizedText;
  source: string; // Academic citation (always English)
  type: 'spatial' | 'visual_choice' | 'binary_choice' | 'slider' | 'multi_select';
  question: LocalizedText;
  description?: LocalizedText;
}

// =========================
// PRS (Perceived Restorativeness Scale) - Gamified as 2D Mood Grid
// Based on: Pasini et al. (2014), Hartig et al. (1997)
// =========================

export const PRS_MOOD_GRID: ValidatedScale = {
  id: 'prs_mood_grid',
  name: {
    pl: 'Odczuwana Regeneracyjność (Mapa Nastroju 2D)',
    en: 'Perceived Restorativeness (2D Mood Grid)'
  },
  source: 'Pasini et al. (2014) - PRS-11 adapted as spatial mapping',
  type: 'spatial',
  question: {
    pl: 'Gdzie jest ten pokój na tej mapie?',
    en: 'Where is this room on this map?'
  },
  description: {
    pl: 'Mierzy: Fascynacja (oś Y) + Oderwanie / Spójność (kombinacja osi X)',
    en: 'Measures: Fascination (y-axis) + Being Away / Coherence (x-axis combination)'
  }
};

export interface PRSMoodGridData {
  x: number; // -1 to 1: Energizing (-1) ←→ Calming (1)
  y: number; // -1 to 1: Boring (-1) ←→ Inspiring (1)
}

export const PRS_MOOD_GRID_CONFIG = {
  axes: {
    x: {
      label: {
        pl: 'Energetyzujący ←→ Uspokajający',
        en: 'Energizing ←→ Calming'
      },
      min: -1,
      max: 1,
      labels: {
        min: { pl: 'Energetyzujący', en: 'Energizing' },
        max: { pl: 'Uspokajający', en: 'Calming' }
      }
    },
    y: {
      label: {
        pl: 'Nudny ←→ Inspirujący',
        en: 'Boring ←→ Inspiring'
      },
      min: -1,
      max: 1,
      labels: {
        min: { pl: 'Nudny', en: 'Boring' },
        max: { pl: 'Inspirujący', en: 'Inspiring' }
      }
    }
  },
  // Mapping to PRS-11 dimensions:
  // x-axis: Being Away (negative = energizing/arousing, positive = calming/restful)
  // y-axis: Fascination (negative = boring, positive = inspiring/interesting)
  // Coherence & Extent are captured in overall pattern
};

// =========================
// Biophilic Orientation - Visual Dosage Test
// Based on: Kellert (2008) - 14 Patterns of Biophilic Design
// =========================

export const BIOPHILIA_TEST: ValidatedScale = {
  id: 'biophilia_visual_dosage',
  name: 'Biophilic Orientation (Visual Dosage)',
  source: 'Kellert (2008) - Patterns of Biophilic Design',
  type: 'visual_choice',
  question: 'Która wersja najbardziej TY?'
};

export interface BiophiliaOption {
  id: string;
  score: number; // 0-3
  label: string;
  description: string;
  imageUrl: string;
}

export const BIOPHILIA_OPTIONS: BiophiliaOption[] = [
  {
    id: 'none',
    score: 0,
    label: 'Bez natury',
    description: 'Urban, sleek, no natural elements',
    imageUrl: '/research/biophilia/level-0-none.jpg'
  },
  {
    id: 'minimal',
    score: 1,
    label: 'Minimalna',
    description: '1-2 plants, subtle natural materials',
    imageUrl: '/research/biophilia/level-1-minimal.jpg'
  },
  {
    id: 'moderate',
    score: 2,
    label: 'Umiarkowana',
    description: 'Several plants, wood materials, natural light',
    imageUrl: '/research/biophilia/level-2-moderate.jpg'
  },
  {
    id: 'maximum',
    score: 3,
    label: 'Maksymalna',
    description: 'Urban jungle, abundant organic materials, maximum greenery',
    imageUrl: '/research/biophilia/level-3-maximum.jpg'
  }
];

// =========================
// Implicit Preferences - Tinder Swipes
// Based on: Implicit Association Test (IAT) methodology
// =========================

export const IMPLICIT_PREFERENCES_TEST: ValidatedScale = {
  id: 'implicit_tinder_swipes',
  name: 'Implicit Aesthetic Preferences',
  source: 'IAT methodology (Greenwald et al., 1998) adapted for interior design',
  type: 'binary_choice',
  question: 'Reaguj sercem, nie głową - leci!',
  description: 'Rapid binary choices reveal implicit preferences better than self-report'
};

export interface SwipeMetadata {
  imageId: string;
  roomType?: string;
  style: string[];
  colors: string[];
  materials: string[];
  biophilia: number; // 0-3
  complexity: number; // 0-1
  warmth: number; // 0-1 (cool to warm)
  brightness: number; // 0-1 (dark to bright)
}

// =========================
// Semantic Differential - Gamified as Sliders
// Based on: Osgood (1957) - Semantic Differential methodology
// =========================

export const SEMANTIC_DIFFERENTIAL_DIMENSIONS = [
  {
    id: 'warmth',
    label: 'Temperatura kolorów',
    min: { value: 0, label: 'Zimne' },
    max: { value: 1, label: 'Ciepłe' }
  },
  {
    id: 'brightness',
    label: 'Jasność',
    min: { value: 0, label: 'Ciemne' },
    max: { value: 1, label: 'Jasne' }
  },
  {
    id: 'complexity',
    label: 'Złożoność',
    min: { value: 0, label: 'Proste' },
    max: { value: 1, label: 'Złożone' }
  },
  {
    id: 'texture',
    label: 'Tekstury',
    min: { value: 0, label: 'Gładkie' },
    max: { value: 1, label: 'Teksturowane' }
  }
];

// =========================
// Place Identity Scale - Gamified as Binary Word Pairs
// Based on: Lai et al. (2013) - Place Identity dimensions
// =========================

export const PLACE_IDENTITY_PAIRS = {
  structural: [ // Appearance dimension
    { id: 'reflects_me', left: 'Odzwierciedla mnie', right: 'Nie do końca moje' },
    { id: 'my_style', left: 'Mój styl', right: 'Cudzy styl' }
  ],
  functional: [ // Activities dimension
    { id: 'supports_life', left: 'Wspiera moje życie', right: 'Utrudnia codzienność' },
    { id: 'everything_place', left: 'Wszystko ma miejsce', right: 'Ciągłe szukanie' }
  ],
  affective: [ // Emotional dimension
    { id: 'proud', left: 'Dumny z tego', right: 'Wolę ukrywać' },
    { id: 'feel_myself', left: 'Czuję się sobą', right: 'Czuję się nie na miejscu' }
  ]
};

// =========================
// Sensory Preferences - Multi-modal Test
// Novel contribution: Multi-sensory profiling for interior design
// =========================

export interface SensoryOption {
  id: string;
  label: string;
  audioUrl?: string;
  imageUrl?: string;
  description: string;
}

export const MUSIC_PREFERENCES: SensoryOption[] = [
  { id: 'jazz', label: 'Jazz', audioUrl: '/research/sensory/music-jazz.mp3', description: 'Smooth, sophisticated, relaxed' },
  { id: 'classical', label: 'Klasyczna', audioUrl: '/research/sensory/music-classical.mp3', description: 'Elegant, timeless, calm' },
  { id: 'electronic', label: 'Elektroniczna', audioUrl: '/research/sensory/music-electronic.mp3', description: 'Modern, energetic, focused' },
  { id: 'nature', label: 'Dźwięki natury', audioUrl: '/research/sensory/music-nature.mp3', description: 'Organic, peaceful, grounding' },
  { id: 'silence', label: 'Cisza', audioUrl: '', description: 'Quiet, minimal, meditative' },
  { id: 'lofi', label: 'Lo-fi', audioUrl: '/research/sensory/music-lofi.mp3', description: 'Cozy, creative, ambient' }
];

export const TEXTURE_PREFERENCES: SensoryOption[] = [
  { id: 'soft_fabric', label: 'Miękka tkanina', imageUrl: '/research/sensory/texture-soft-fabric.jpg', description: 'Cozy, comfort, warmth' },
  { id: 'smooth_wood', label: 'Gładkie drewno', imageUrl: '/research/sensory/texture-smooth-wood.jpg', description: 'Natural, warm, organic' },
  { id: 'cold_metal', label: 'Zimny metal', imageUrl: '/research/sensory/texture-cold-metal.jpg', description: 'Modern, sleek, industrial' },
  { id: 'rough_stone', label: 'Szorstki kamień', imageUrl: '/research/sensory/texture-rough-stone.jpg', description: 'Solid, grounded, raw' },
  { id: 'warm_leather', label: 'Ciepła skóra', imageUrl: '/research/sensory/texture-warm-leather.jpg', description: 'Luxurious, rich, sophisticated' },
  { id: 'glass', label: 'Szkło', imageUrl: '/research/sensory/texture-glass.jpg', description: 'Clean, transparent, airy' }
];

export const LIGHT_PREFERENCES: SensoryOption[] = [
  { id: 'warm_low', label: 'Ciepłe, przyciemnione', imageUrl: '/research/sensory/light-warm-low.jpg', description: '2700K, cozy evening vibe' },
  { id: 'warm_bright', label: 'Ciepłe, jasne', imageUrl: '/research/sensory/light-warm-bright.jpg', description: '3000K, inviting and energizing' },
  { id: 'neutral', label: 'Neutralne', imageUrl: '/research/sensory/light-neutral.jpg', description: '4000K, balanced daylight' },
  { id: 'cool_bright', label: 'Zimne, jasne', imageUrl: '/research/sensory/light-cool-bright.jpg', description: '5000K+, focused and crisp' }
];

// =========================
// Projective Techniques
// Novel contribution: Archetypal pattern discovery
// =========================

export const NATURE_METAPHOR_OPTIONS: SensoryOption[] = [
  { id: 'ocean', label: 'Ocean', imageUrl: '/research/projective/nature-ocean.jpg', description: 'Vast, flowing, calming, mysterious' },
  { id: 'forest', label: 'Las', imageUrl: '/research/projective/nature-forest.jpg', description: 'Grounded, organic, peaceful, complex' },
  { id: 'mountain', label: 'Góry', imageUrl: '/research/projective/nature-mountain.jpg', description: 'Strong, elevated, inspiring, solid' },
  { id: 'desert', label: 'Pustynia', imageUrl: '/research/projective/nature-desert.jpg', description: 'Minimal, warm, spacious, serene' },
  { id: 'garden', label: 'Ogród', imageUrl: '/research/projective/nature-garden.jpg', description: 'Cultivated, balanced, nurturing, alive' },
  { id: 'sunset', label: 'Zachód słońca', imageUrl: '/research/projective/nature-sunset.jpg', description: 'Warm, transitional, reflective, soft' }
];

// =========================
// Export all validated scales
// =========================

export const VALIDATED_SCALES = {
  prs_mood_grid: PRS_MOOD_GRID,
  biophilia_test: BIOPHILIA_TEST,
  implicit_preferences: IMPLICIT_PREFERENCES_TEST,
  semantic_differential: SEMANTIC_DIFFERENTIAL_DIMENSIONS,
  place_identity: PLACE_IDENTITY_PAIRS,
  sensory_music: MUSIC_PREFERENCES,
  sensory_texture: TEXTURE_PREFERENCES,
  sensory_light: LIGHT_PREFERENCES,
  projective_nature: NATURE_METAPHOR_OPTIONS
};

// Research note: All scales maintain construct validity while being gamified
// for improved completion rates and user experience

