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
  name: {
    pl: 'Orientacja Biofiliczna (Test Wizualny)',
    en: 'Biophilic Orientation (Visual Dosage)'
  },
  source: 'Kellert (2008) - Patterns of Biophilic Design',
  type: 'visual_choice',
  question: {
    pl: 'Która wersja najbardziej TY?',
    en: 'Which version is most YOU?'
  }
};

export interface BiophiliaOption {
  id: string;
  score: number; // 0-3
  label: LocalizedText;
  description: LocalizedText;
  imageUrl: string;
}

export const BIOPHILIA_OPTIONS: BiophiliaOption[] = [
  {
    id: 'none',
    score: 0,
    label: { pl: 'Bez natury', en: 'No nature' },
    description: { 
      pl: 'Miejski, elegancki, bez elementów naturalnych',
      en: 'Urban, sleek, no natural elements'
    },
    imageUrl: '/research/biophilia/bio0.png'
  },
  {
    id: 'minimal',
    score: 1,
    label: { pl: 'Minimalna', en: 'Minimal' },
    description: { 
      pl: '1-2 rośliny, subtelne materiały naturalne',
      en: '1-2 plants, subtle natural materials'
    },
    imageUrl: '/research/biophilia/bio1.png'
  },
  {
    id: 'moderate',
    score: 2,
    label: { pl: 'Umiarkowana', en: 'Moderate' },
    description: { 
      pl: 'Kilka roślin, drewniane materiały, naturalne światło',
      en: 'Several plants, wood materials, natural light'
    },
    imageUrl: '/research/biophilia/bio2.png'
  },
  {
    id: 'maximum',
    score: 3,
    label: { pl: 'Maksymalna', en: 'Maximum' },
    description: { 
      pl: 'Miejska dżungla, obfite materiały, maksimum zieleni',
      en: 'Urban jungle, abundant materials, maximum greenery'
    },
    imageUrl: '/research/biophilia/bio3.png'
  }
];

// =========================
// Implicit Preferences - Tinder Swipes
// Based on: Implicit Association Test (IAT) methodology
// =========================

export const IMPLICIT_PREFERENCES_TEST: ValidatedScale = {
  id: 'implicit_tinder_swipes',
  name: {
    pl: 'Niejawne Preferencje Estetyczne',
    en: 'Implicit Aesthetic Preferences'
  },
  source: 'IAT methodology (Greenwald et al., 1998) adapted for interior design',
  type: 'binary_choice',
  question: {
    pl: 'Reaguj sercem, nie głową - leci!',
    en: 'React with your heart, not your head - go!'
  },
  description: {
    pl: 'Szybkie binarne wybory ujawniają niejawne preferencje lepiej niż samo-opis',
    en: 'Rapid binary choices reveal implicit preferences better than self-report'
  }
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
    label: { pl: 'Temperatura kolorów', en: 'Color temperature' },
    min: { value: 0, label: { pl: 'Zimne', en: 'Cool' } },
    max: { value: 1, label: { pl: 'Ciepłe', en: 'Warm' } }
  },
  {
    id: 'brightness',
    label: { pl: 'Jasność', en: 'Brightness' },
    min: { value: 0, label: { pl: 'Ciemne', en: 'Dark' } },
    max: { value: 1, label: { pl: 'Jasne', en: 'Bright' } }
  },
  {
    id: 'complexity',
    label: { pl: 'Złożoność', en: 'Complexity' },
    min: { value: 0, label: { pl: 'Proste', en: 'Simple' } },
    max: { value: 1, label: { pl: 'Złożone', en: 'Complex' } }
  },
  {
    id: 'texture',
    label: { pl: 'Tekstury', en: 'Textures' },
    min: { value: 0, label: { pl: 'Gładkie', en: 'Smooth' } },
    max: { value: 1, label: { pl: 'Teksturowane', en: 'Textured' } }
  }
];

// =========================
// Place Identity Scale - Gamified as Binary Word Pairs
// Based on: Lai et al. (2013) - Place Identity dimensions
// =========================

export const PLACE_IDENTITY_PAIRS = {
  structural: [ // Appearance dimension
    { 
      id: 'reflects_me', 
      left: { pl: 'Odzwierciedla mnie', en: 'Reflects me' }, 
      right: { pl: 'Nie do końca moje', en: 'Not quite me' }
    },
    { 
      id: 'my_style', 
      left: { pl: 'Mój styl', en: 'My style' }, 
      right: { pl: 'Cudzy styl', en: 'Someone else\'s style' }
    }
  ],
  functional: [ // Activities dimension
    { 
      id: 'supports_life', 
      left: { pl: 'Wspiera moje życie', en: 'Supports my life' }, 
      right: { pl: 'Utrudnia codzienność', en: 'Makes life harder' }
    },
    { 
      id: 'everything_place', 
      left: { pl: 'Wszystko ma miejsce', en: 'Everything has a place' }, 
      right: { pl: 'Ciągłe szukanie', en: 'Constantly searching' }
    }
  ],
  affective: [ // Emotional dimension
    { 
      id: 'proud', 
      left: { pl: 'Dumny z tego', en: 'Proud of it' }, 
      right: { pl: 'Wolę ukrywać', en: 'Prefer to hide it' }
    },
    { 
      id: 'feel_myself', 
      left: { pl: 'Czuję się sobą', en: 'Feel like myself' }, 
      right: { pl: 'Czuję się nie na miejscu', en: 'Feel out of place' }
    }
  ]
};

// =========================
// Sensory Preferences - Multi-modal Test
// Novel contribution: Multi-sensory profiling for interior design
// =========================

export interface SensoryOption {
  id: string;
  label: LocalizedText;
  audioUrl?: string;
  imageUrl?: string;
  description: LocalizedText;
}

export const MUSIC_PREFERENCES: SensoryOption[] = [
  { 
    id: 'jazz', 
    label: { pl: 'Jazz', en: 'Jazz' }, 
    audioUrl: '/research/sensory/music-jazz.mp3', 
    description: { pl: 'Gładki, wyrafinowany, zrelaksowany', en: 'Smooth, sophisticated, relaxed' }
  },
  { 
    id: 'classical', 
    label: { pl: 'Klasyczna', en: 'Classical' }, 
    audioUrl: '/research/sensory/music-classical.mp3', 
    description: { pl: 'Elegancka, ponadczasowa, spokojna', en: 'Elegant, timeless, calm' }
  },
  { 
    id: 'electronic', 
    label: { pl: 'Elektroniczna', en: 'Electronic' }, 
    audioUrl: '/research/sensory/music-electronic.mp3', 
    description: { pl: 'Nowoczesna, energetyczna, skoncentrowana', en: 'Modern, energetic, focused' }
  },
  { 
    id: 'rock', 
    label: { pl: 'Rock', en: 'Rock' }, 
    audioUrl: '/research/sensory/music-rock.mp3', 
    description: { pl: 'Energetyczna, dynamiczna, żywa', en: 'Energetic, dynamic, lively' }
  },
  { 
    id: 'funk', 
    label: { pl: 'Funk', en: 'Funk' }, 
    audioUrl: '/research/sensory/music-funk.mp3', 
    description: { pl: 'Rytmiczna, pełna życia, taneczna', en: 'Rhythmic, vibrant, danceable' }
  },
  { 
    id: 'pop', 
    label: { pl: 'Pop', en: 'Pop' }, 
    audioUrl: '/research/sensory/music-pop.mp3', 
    description: { pl: 'Chwytliwa, optymistyczna, uniwersalna', en: 'Catchy, upbeat, universal' }
  }
];

export const TEXTURE_PREFERENCES: SensoryOption[] = [
  { 
    id: 'soft_fabric', 
    label: { pl: 'Miękka tkanina', en: 'Soft fabric' }, 
    imageUrl: '/research/sensory/soft_fabric.jpeg', 
    description: { pl: 'Przytulna, komfortowa, ciepła', en: 'Cozy, comfort, warmth' }
  },
  { 
    id: 'smooth_wood', 
    label: { pl: 'Gładkie drewno', en: 'Smooth wood' }, 
    imageUrl: '/research/sensory/smooth_wood.jpeg', 
    description: { pl: 'Naturalne, ciepłe, organiczne', en: 'Natural, warm, organic' }
  },
  { 
    id: 'cold_metal', 
    label: { pl: 'Zimny metal', en: 'Cold metal' }, 
    imageUrl: '/research/sensory/cold_metal.jpeg', 
    description: { pl: 'Nowoczesny, elegancki, industrialny', en: 'Modern, sleek, industrial' }
  },
  { 
    id: 'rough_stone', 
    label: { pl: 'Szorstki kamień', en: 'Rough stone' }, 
    imageUrl: '/research/sensory/rough_stone.jpeg', 
    description: { pl: 'Solidny, uziemiony, surowy', en: 'Solid, grounded, raw' }
  },
  { 
    id: 'warm_leather', 
    label: { pl: 'Ciepła skóra', en: 'Warm leather' }, 
    imageUrl: '/research/sensory/warm_leather.jpeg', 
    description: { pl: 'Luksusowa, bogata, wyrafinowana', en: 'Luxurious, rich, sophisticated' }
  },
  { 
    id: 'glass', 
    label: { pl: 'Szkło', en: 'Glass' }, 
    imageUrl: '/research/sensory/glass.jpeg', 
    description: { pl: 'Czyste, przezroczyste, przestronne', en: 'Clean, transparent, airy' }
  }
];

export const LIGHT_PREFERENCES: SensoryOption[] = [
  { 
    id: 'warm_low', 
    label: { pl: 'Ciepłe, przyciemnione', en: 'Warm, dimmed' }, 
    imageUrl: '/research/sensory/warm_low.png', 
    description: { pl: '2700K, przytulny wieczorny nastrój', en: '2700K, cozy evening vibe' }
  },
  { 
    id: 'warm_bright', 
    label: { pl: 'Ciepłe, jasne', en: 'Warm, bright' }, 
    imageUrl: '/research/sensory/warm_bright.png', 
    description: { pl: '3000K, zachęcające i energetyzujące', en: '3000K, inviting and energizing' }
  },
  { 
    id: 'neutral', 
    label: { pl: 'Neutralne', en: 'Neutral' }, 
    imageUrl: '/research/sensory/neutral.png', 
    description: { pl: '4000K, zbalansowane światło dzienne', en: '4000K, balanced daylight' }
  },
  { 
    id: 'cool_bright', 
    label: { pl: 'Zimne, jasne', en: 'Cool, bright' }, 
    imageUrl: '/research/sensory/cool_bright.png', 
    description: { pl: '5000K+, skoncentrowane i ostre', en: '5000K+, focused and crisp' }
  }
];

// =========================
// Projective Techniques
// Novel contribution: Archetypal pattern discovery
// =========================

export const NATURE_METAPHOR_OPTIONS: SensoryOption[] = [
  { 
    id: 'ocean', 
    label: { pl: 'Ocean', en: 'Ocean' }, 
    imageUrl: '/research/sensory/ocean.jpeg', 
    description: { pl: 'Rozległy, płynny, kojący, tajemniczy', en: 'Vast, flowing, calming, mysterious' }
  },
  { 
    id: 'forest', 
    label: { pl: 'Las', en: 'Forest' }, 
    imageUrl: '/research/sensory/Las.jpeg', 
    description: { pl: 'Uziemiony, organiczny, spokojny, złożony', en: 'Grounded, organic, peaceful, complex' }
  },
  { 
    id: 'mountain', 
    label: { pl: 'Góry', en: 'Mountains' }, 
    imageUrl: '/research/sensory/gory.jpeg', 
    description: { pl: 'Silne, wyniosłe, inspirujące, solidne', en: 'Strong, elevated, inspiring, solid' }
  },
  { 
    id: 'desert', 
    label: { pl: 'Pustynia', en: 'Desert' }, 
    imageUrl: '/research/sensory/pustynia.jpeg', 
    description: { pl: 'Minimalistyczna, ciepła, przestronna', en: 'Minimal, warm, spacious' }
  },
  { 
    id: 'garden', 
    label: { pl: 'Ogród', en: 'Garden' }, 
    imageUrl: '/research/sensory/ogrod.jpeg', 
    description: { pl: 'Kultywowany, zbalansowany, żywy', en: 'Cultivated, balanced, alive' }
  },
  { 
    id: 'sunset', 
    label: { pl: 'Zachód słońca', en: 'Sunset' }, 
    imageUrl: '/research/sensory/Zachod.jpeg', 
    description: { pl: 'Ciepły, przejściowy, refleksyjny, miękki', en: 'Warm, transitional, reflective, soft' }
  }
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

// =========================
// Helper function to get localized text
// =========================

export function getLocalizedText(text: LocalizedText, lang: Language = 'pl'): string {
  return text[lang];
}

// Research note: All scales maintain construct validity while being gamified
// for improved completion rates and user experience

