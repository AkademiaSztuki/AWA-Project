import { SessionData } from '@/types';

// Wymiary, które chcemy porównywać: implicit (Tinder + inspiracje) vs explicit (deklaracje)
export type PreferenceDimensionId =
  | 'style'
  | 'colors'
  | 'materials'
  | 'lighting'
  | 'textures'
  | 'complexity'
  | 'mood';

export interface PreferenceDimensionEntry {
  id: PreferenceDimensionId;
  implicitTags: string[];
  explicitChoices: string[];
  // Dla wymiarów liczbowych (np. złożoność) możemy opcjonalnie przechowywać wartość 0-1
  explicitNumeric?: number | null;
}

export interface PreferenceMatrix {
  userHash: string;
  dimensions: PreferenceDimensionEntry[];
  // Źródła użyte do zbudowania macierzy – pomocne do badań / debugowania
  sources: {
    hasTinder: boolean;
    hasInspirations: boolean;
    hasExplicitProfile: boolean;
  };
}

// ========================
// NORMALIZACJA TAGÓW
// ========================

type NormalizeContext =
  | 'style'
  | 'color'
  | 'material'
  | 'lighting'
  | 'texture'
  | 'mood';

// Prosta normalizacja tagów z różnych źródeł do wspólnego, anglojęzycznego „słownika”.
// Na razie: lowercase + mapowanie kilku znanych ID-ów z UI na spójne tokeny.

function normalizeToken(raw: string | null | undefined, context?: NormalizeContext): string | null {
  if (!raw) return null;
  const v = raw.toString().trim().toLowerCase();

  // Materiały
  if (context === 'material') {
    switch (v) {
      case 'drewno':
      case 'wood':
        return 'wood';
      case 'metal':
        return 'metal';
      case 'tkaniny':
      case 'fabric':
        return 'fabric';
      case 'kamień':
      case 'stone':
        return 'stone';
      case 'szkło':
      case 'glass':
        return 'glass';
      case 'skóra':
      case 'leather':
        return 'leather';
      default:
        return v;
    }
  }

  // Palety kolorów (IDs z CoreProfileWizard)
  if (context === 'color') {
    switch (v) {
      case 'warm-earth':
        return 'warm_earth_palette';
      case 'cool-nordic':
        return 'cool_nordic_palette';
      case 'vibrant-bold':
        return 'vibrant_bold_palette';
      case 'natural-green':
        return 'natural_green_palette';
      case 'monochrome':
        return 'monochrome_palette';
      case 'soft-pastels':
        return 'soft_pastels_palette';
      default:
        return v;
    }
  }

  // Światło
  if (context === 'lighting') {
    switch (v) {
      case 'warm_low':
      case 'warm low':
        return 'warm_low';
      case 'warm_bright':
      case 'warm bright':
        return 'warm_bright';
      case 'neutral':
        return 'neutral';
      case 'cool_bright':
      case 'cool bright':
        return 'cool_bright';
      default:
        return v;
    }
  }

  // Tekstury – na razie tylko normalizacja tekstowa
  if (context === 'texture') {
    return v;
  }

  // Nastrój / feelings / lifestyle vibe
  if (context === 'mood' || context === 'style') {
    switch (v) {
      case 'spokojny':
      case 'calm':
        return 'calm';
      case 'chaotyczny':
      case 'chaotic':
        return 'chaotic';
      case 'kreatywny':
      case 'creative':
        return 'creative';
      case 'zorganizowany':
      case 'organized':
        return 'organized';
      case 'społeczny':
      case 'social':
        return 'social';
      case 'introwertyczny':
      case 'introverted':
        return 'introverted';
      case 'grounded':
      case 'uziemiony/a i zbalansowany/a':
        return 'grounded';
      default:
        return v;
    }
  }

  return v;
}

function normalizeTokens(
  list: Array<string | null | undefined> | undefined | null,
  context?: NormalizeContext
): string[] {
  if (!list) return [];
  const out = list
    .map((value) => normalizeToken(value, context))
    .filter((t): t is string => Boolean(t));

  // deduplikacja
  return Array.from(new Set(out));
}

export function buildPreferenceMatrixFromSession(sessionData: SessionData): PreferenceMatrix {
  const dimensions: PreferenceDimensionEntry[] = [];

  // =============== IMPLICIT ===============
  // Tinder swipes – bierzemy tylko polubione (right)
  const tinderSwipes = sessionData.tinderData?.swipes || [];
  const likedSwipes = tinderSwipes.filter((s: any) => s.direction === 'right');

  const implicitStylesFromTinder = normalizeTokens(
    likedSwipes.map((s: any) => s.categories?.style || null),
    'style'
  );

  const implicitColorsFromTinder = normalizeTokens(
    likedSwipes.flatMap((s: any) => s.categories?.colors || []),
    'color'
  );

  const implicitMaterialsFromTinder = normalizeTokens(
    likedSwipes.flatMap((s: any) => s.categories?.materials || []),
    'material'
  );

  const implicitLightingFromTinder = normalizeTokens(
    likedSwipes.flatMap((s: any) => s.categories?.lighting || []),
    'lighting'
  );

  const implicitMoodFromTinder = normalizeTokens(
    likedSwipes.flatMap((s: any) => s.categories?.mood || []),
    'mood'
  );

  // Inspiracje – tags.styles / colors / materials
  const inspirations = sessionData.inspirations || [];

  const implicitStylesFromInspirations = normalizeTokens(
    inspirations.flatMap((i) => i.tags?.styles || []),
    'style'
  );

  const implicitColorsFromInspirations = normalizeTokens(
    inspirations.flatMap((i) => i.tags?.colors || []),
    'color'
  );

  const implicitMaterialsFromInspirations = normalizeTokens(
    inspirations.flatMap((i) => i.tags?.materials || []),
    'material'
  );

  const implicitMoodFromInspirations: string[] = []; // na razie brak jawnych tagów mood z inspiracji

  // Łączny implicit dla poszczególnych wymiarów
  const implicitStyles = Array.from(
    new Set([...implicitStylesFromTinder, ...implicitStylesFromInspirations])
  );

  const implicitColors = Array.from(
    new Set([...implicitColorsFromTinder, ...implicitColorsFromInspirations])
  );

  const implicitMaterials = Array.from(
    new Set([...implicitMaterialsFromTinder, ...implicitMaterialsFromInspirations])
  );

  const implicitLighting = implicitLightingFromTinder;
  const implicitTextures: string[] = []; // tekstury implicit pojawią się, gdy dodamy osobne tagi

  const implicitMood = Array.from(
    new Set([...implicitMoodFromTinder, ...implicitMoodFromInspirations])
  );

  // =============== EXPLICIT ===============
  const colorsAndMaterials = sessionData.colorsAndMaterials;
  const semantic = sessionData.semanticDifferential;
  const sensory = sessionData.sensoryPreferences;
  const lifestyle = sessionData.lifestyle;
  const aspirationalSelf = sessionData.aspirationalSelf;

  // Style – na razie z lifestyle.lifeVibe + aspirationalSelf.feelings jako przybliżenie
  const explicitStyleChoices = normalizeTokens(
    [
      lifestyle?.lifeVibe,
      ...(aspirationalSelf?.feelings || []),
    ],
    'style'
  );

  // Kolory – z wybranej palety
  const explicitColorChoices = normalizeTokens(
    colorsAndMaterials?.selectedPalette ? [colorsAndMaterials.selectedPalette] : [],
    'color'
  );

  // Materiały – z topMaterials
  const explicitMaterialChoices = normalizeTokens(
    colorsAndMaterials?.topMaterials || [],
    'material'
  );

  // Oświetlenie – z sensory.light
  const explicitLightingChoices = normalizeTokens(
    sensory?.light ? [sensory.light] : [],
    'lighting'
  );

  // Tekstury – z sensory.texture
  const explicitTextureChoices = normalizeTokens(
    sensory?.texture ? [sensory.texture] : [],
    'texture'
  );

  // Złożoność – z semantic.complexity (0-1 lub 0.2/0.8 w obecnej implementacji)
  const explicitComplexity = semantic?.complexity ?? null;

  // Nastrój – z aspirationalSelf.feelings oraz lifestyle.goals
  const explicitMoodChoices = normalizeTokens(
    [
      ...(aspirationalSelf?.feelings || []),
      ...(lifestyle?.goals || []),
    ],
    'mood'
  );

  // =============== SKŁADANIE MACIERZY ===============
  const pushDimension = (
    id: PreferenceDimensionId,
    implicitTags: string[],
    explicitChoices: string[],
    explicitNumeric?: number | null
  ) => {
    dimensions.push({
      id,
      implicitTags,
      explicitChoices,
      explicitNumeric,
    });
  };

  pushDimension('style', implicitStyles, explicitStyleChoices);
  pushDimension('colors', implicitColors, explicitColorChoices);
  pushDimension('materials', implicitMaterials, explicitMaterialChoices);
  pushDimension('lighting', implicitLighting, explicitLightingChoices);
  pushDimension('textures', implicitTextures, explicitTextureChoices);
  pushDimension('complexity', [], [], explicitComplexity);
  pushDimension('mood', implicitMood, explicitMoodChoices);

  return {
    userHash: sessionData.userHash,
    dimensions,
    sources: {
      hasTinder: likedSwipes.length > 0,
      hasInspirations: inspirations.length > 0,
      hasExplicitProfile:
        Boolean(colorsAndMaterials) ||
        Boolean(semantic) ||
        Boolean(sensory) ||
        Boolean(lifestyle) ||
        Boolean(aspirationalSelf),
    },
  };
}


