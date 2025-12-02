import { PromptInputs } from './scoring';

// =========================
// LEGACY GENERATION MODES (kept for backward compatibility)
// =========================

export enum GenerationMode {
  Profile = 1,
  ProfileWithRoom = 2,
  Contextual = 3,
  Behavioral = 4,
  Complete = 5,
}

export const GENERATION_MODE_LABELS: Record<GenerationMode, string> = {
  [GenerationMode.Profile]: 'Profil',
  [GenerationMode.ProfileWithRoom]: 'Profil + zdjęcie',
  [GenerationMode.Contextual]: 'Kontekst domowy',
  [GenerationMode.Behavioral]: 'Rytuały',
  [GenerationMode.Complete]: 'Complete Mode'
};

// =========================
// NEW: 5-IMAGE GENERATION SOURCES
// =========================

/**
 * Generation sources for the 5-image matrix.
 * Each source uses different data to build the prompt.
 */
export enum GenerationSource {
  /** Image 1: Only Tinder swipes + Inspirations (behavioral/implicit data) */
  Implicit = 'implicit',
  
  /** Image 2: Only explicit preferences (CoreProfile or room-specific) */
  Explicit = 'explicit',
  
  /** Image 3: Only Big Five personality facets mapped to design */
  Personality = 'personality',
  
  /** Image 4: All aesthetic sources combined with weights */
  Mixed = 'mixed',
  
  /** Image 5: Mixed + functional data (activities, pain_points, PRS gap) */
  MixedFunctional = 'mixed_functional',
  
  /** Image 6: Multi-reference with inspiration images */
  InspirationReference = 'inspiration_reference'
}

export const GENERATION_SOURCE_LABELS: Record<GenerationSource, { pl: string; en: string }> = {
  [GenerationSource.Implicit]: { 
    pl: 'Dane behawioralne', 
    en: 'Behavioral data' 
  },
  [GenerationSource.Explicit]: { 
    pl: 'Deklarowane preferencje', 
    en: 'Stated preferences' 
  },
  [GenerationSource.Personality]: { 
    pl: 'Profil osobowości', 
    en: 'Personality profile' 
  },
  [GenerationSource.Mixed]: { 
    pl: 'Mix estetyczny', 
    en: 'Aesthetic mix' 
  },
  [GenerationSource.MixedFunctional]: { 
    pl: 'Mix + funkcjonalność', 
    en: 'Mix + functionality' 
  },
  [GenerationSource.InspirationReference]: { 
    pl: 'Inspiracje referencyjne', 
    en: 'Inspiration references' 
  }
};

/**
 * Weight configuration for Mixed source
 */
export const MIXED_SOURCE_WEIGHTS = {
  implicit: 0.40,     // Tinder + Inspirations
  explicit: 0.30,     // CoreProfile / room preferences
  personality: 0.30   // Big Five facets
};

export function filterInputsByMode(inputs: PromptInputs, mode: GenerationMode): PromptInputs {
  const clone: PromptInputs = {
    ...inputs,
    householdContext: { ...inputs.householdContext },
    activities: [...(inputs.activities || [])],
    painPoints: [...(inputs.painPoints || [])],
    roomVisualDNA: { ...inputs.roomVisualDNA },
    currentRoomAnalysis: inputs.currentRoomAnalysis ? { ...inputs.currentRoomAnalysis } : undefined,
    activityContext: inputs.activityContext
  };

  if (mode === GenerationMode.Profile) {
    clone.householdContext.householdGoals = [];
    clone.socialContext = 'solo';
    clone.sharedWith = undefined;
    clone.activities = [];
    clone.painPoints = [];
    clone.roomVisualDNA = { styles: [], colors: [] };
    clone.currentRoomAnalysis = undefined;
    clone.activityContext = undefined;
    clone.prsCurrent = inputs.psychologicalBaseline.prsIdeal;
    clone.prsTarget = inputs.psychologicalBaseline.prsIdeal;
  }

  if (mode === GenerationMode.ProfileWithRoom) {
    clone.activities = [];
    clone.painPoints = [];
    clone.activityContext = undefined;
  }

  if (mode === GenerationMode.Contextual) {
    clone.activities = [];
    clone.activityContext = undefined;
  }

  if (mode === GenerationMode.Behavioral) {
    clone.activities = clone.activities.slice(0, 3);
  }

  return clone;
}

// =========================
// NEW: FILTER BY GENERATION SOURCE
// =========================

/**
 * Creates a deep clone of PromptInputs for safe modification.
 */
function cloneInputs(inputs: PromptInputs): PromptInputs {
  return {
    aestheticDNA: {
      implicit: { ...inputs.aestheticDNA.implicit },
      explicit: { ...inputs.aestheticDNA.explicit }
    },
    psychologicalBaseline: { ...inputs.psychologicalBaseline },
    lifestyle: { ...inputs.lifestyle },
    sensory: { ...inputs.sensory },
    personality: inputs.personality ? { 
      ...inputs.personality,
      facets: inputs.personality.facets ? {
        O: { ...inputs.personality.facets.O },
        C: { ...inputs.personality.facets.C },
        E: { ...inputs.personality.facets.E },
        A: { ...inputs.personality.facets.A },
        N: { ...inputs.personality.facets.N }
      } : undefined
    } : undefined,
    inspirations: inputs.inspirations ? [...inputs.inspirations] : undefined,
    householdContext: { ...inputs.householdContext },
    roomType: inputs.roomType,
    socialContext: inputs.socialContext,
    sharedWith: inputs.sharedWith ? [...inputs.sharedWith] : undefined,
    activities: [...inputs.activities],
    painPoints: [...inputs.painPoints],
    prsCurrent: { ...inputs.prsCurrent },
    prsTarget: { ...inputs.prsTarget },
    roomVisualDNA: { ...inputs.roomVisualDNA },
    currentRoomAnalysis: inputs.currentRoomAnalysis ? { ...inputs.currentRoomAnalysis } : undefined,
    activityContext: inputs.activityContext ? { ...inputs.activityContext } : undefined
  };
}

/**
 * Creates empty/default values for PromptInputs fields.
 */
const EMPTY_AESTHETIC_DNA = {
  implicit: {
    dominantStyles: [],
    colors: [],
    materials: [],
    complexity: 0.5,
    warmth: 0.5,
    brightness: 0.5
  },
  explicit: {
    selectedPalette: '',
    topMaterials: [],
    warmthPreference: 0.5,
    brightnessPreference: 0.5,
    complexityPreference: 0.5
  }
};

/**
 * Default neutral PRS values (balanced mood, no strong direction)
 */
const NEUTRAL_PRS = { x: 0, y: 0 };

/**
 * Empty roomVisualDNA
 */
const EMPTY_ROOM_VISUAL_DNA = { styles: [], colors: [] };

/**
 * Filters PromptInputs based on the GenerationSource.
 * Each source includes only relevant data for that prompt type.
 * 
 * IMPORTANT: This function aggressively zeros out data that shouldn't
 * influence each source type, ensuring truly different prompts.
 * 
 * @param inputs - Full PromptInputs with all data
 * @param source - Which generation source to filter for
 * @returns Filtered PromptInputs with only relevant data
 */
export function filterInputsBySource(inputs: PromptInputs, source: GenerationSource): PromptInputs {
  const clone = cloneInputs(inputs);
  
  switch (source) {
    case GenerationSource.Implicit:
      // Image 1: ONLY behavioral/implicit data (Tinder + Inspirations)
      // This should produce a prompt based PURELY on what user swiped right on
      
      // ZERO: Everything except implicit aesthetic data
      clone.aestheticDNA.explicit = EMPTY_AESTHETIC_DNA.explicit;
      clone.personality = undefined;
      clone.lifestyle = { vibe: '', goals: [], values: [] };
      clone.sensory = { music: '', texture: '', light: '', natureMetaphor: '' };
      clone.activities = [];
      clone.painPoints = [];
      clone.activityContext = undefined;
      // ZERO PRS - implicit doesn't care about mood transformations
      clone.prsCurrent = { ...NEUTRAL_PRS };
      clone.prsTarget = { ...NEUTRAL_PRS };
      // For Implicit source, use implicitBiophiliaScore from Tinder instead of global biophiliaScore
      const implicitBiophilia = clone.psychologicalBaseline.implicitBiophiliaScore ?? 0;
      clone.psychologicalBaseline = { 
        ...clone.psychologicalBaseline, 
        prsIdeal: { ...NEUTRAL_PRS },
        biophiliaScore: implicitBiophilia  // Use Tinder-derived biophilia for implicit source
      };
      // ZERO roomVisualDNA - use only implicit colors/styles
      clone.roomVisualDNA = { ...EMPTY_ROOM_VISUAL_DNA };
      // ZERO social context for implicit
      clone.socialContext = 'solo';
      clone.sharedWith = undefined;
      clone.householdContext = { livingSituation: '', householdGoals: [] };
      break;
      
    case GenerationSource.Explicit:
      // Image 2: ONLY explicit/declared preferences
      // This should produce a prompt based PURELY on what user explicitly stated
      
      // ZERO: All implicit and behavioral data
      clone.aestheticDNA.implicit = EMPTY_AESTHETIC_DNA.implicit;
      clone.inspirations = undefined;
      clone.personality = undefined;
      clone.activities = [];
      clone.painPoints = [];
      clone.activityContext = undefined;
      // ZERO PRS for pure explicit
      clone.prsCurrent = { ...NEUTRAL_PRS };
      clone.prsTarget = { ...NEUTRAL_PRS };
      clone.psychologicalBaseline = { ...clone.psychologicalBaseline, prsIdeal: { ...NEUTRAL_PRS } };
      // ZERO roomVisualDNA - use only explicit palette/materials
      clone.roomVisualDNA = { ...EMPTY_ROOM_VISUAL_DNA };
      // ZERO social context
      clone.socialContext = 'solo';
      clone.sharedWith = undefined;
      clone.householdContext = { livingSituation: '', householdGoals: [] };
      break;
      
    case GenerationSource.Personality:
      // Image 3: ONLY Big Five personality mapping
      // This should produce a prompt based PURELY on personality traits
      
      // ZERO: ALL aesthetic data - personality should drive everything
      clone.aestheticDNA = { 
        implicit: { ...EMPTY_AESTHETIC_DNA.implicit },
        explicit: { ...EMPTY_AESTHETIC_DNA.explicit }
      };
      clone.inspirations = undefined;
      clone.lifestyle = { vibe: '', goals: [], values: [] };
      clone.sensory = { music: '', texture: '', light: '', natureMetaphor: '' };
      clone.activities = [];
      clone.painPoints = [];
      clone.activityContext = undefined;
      clone.roomVisualDNA = { ...EMPTY_ROOM_VISUAL_DNA };
      // ZERO PRS - personality is the only driver
      clone.prsCurrent = { ...NEUTRAL_PRS };
      clone.prsTarget = { ...NEUTRAL_PRS };
      // ZERO biophiliaScore - personality source should not use user's biophilia preference
      // (Could derive from Big Five in future, but for now zero it to keep personality pure)
      clone.psychologicalBaseline = { 
        ...clone.psychologicalBaseline, 
        prsIdeal: { ...NEUTRAL_PRS },
        biophiliaScore: 0  // Zero biophilia for personality source
      };
      // ZERO social
      clone.socialContext = 'solo';
      clone.sharedWith = undefined;
      clone.householdContext = { livingSituation: '', householdGoals: [] };
      // KEEP: personality - this is the ONLY source for this image
      break;
      
    case GenerationSource.Mixed:
      // Image 4: All aesthetic sources combined WITH weights
      // Combines implicit, explicit, personality - but NO functional data
      
      // ZERO only functional data
      clone.activities = [];
      clone.painPoints = [];
      clone.activityContext = undefined;
      // KEEP: aestheticDNA (both), inspirations, personality, lifestyle, sensory
      // KEEP: PRS for mood guidance
      // KEEP: social context for layout
      break;
      
    case GenerationSource.MixedFunctional:
      // Image 5: Mixed + all functional data
      // KEEP: everything - this is the most complete prompt
      break;
      
    case GenerationSource.InspirationReference:
      // Image 6: Multi-reference with inspiration images
      // Uses all aesthetic data + inspiration images as visual references
      // KEEP: all aesthetic data (implicit, explicit, personality, inspirations)
      // KEEP: functional data for context
      // Inspiration images will be passed separately as multi-reference
      break;
  }
  
  return clone;
}

/**
 * Checks if a generation source has sufficient data to generate.
 * Returns true if there's enough data, false if should be skipped.
 */
export function hasDataForSource(inputs: PromptInputs, source: GenerationSource): boolean {
  switch (source) {
    case GenerationSource.Implicit:
      // Need at least some Tinder swipes OR inspirations
      const hasImplicitStyles = inputs.aestheticDNA.implicit.dominantStyles.length > 0;
      const hasImplicitColors = inputs.aestheticDNA.implicit.colors.length > 0;
      const hasInspirations = (inputs.inspirations?.length || 0) > 0;
      return hasImplicitStyles || hasImplicitColors || hasInspirations;
      
    case GenerationSource.Explicit:
      // Need at least some explicit preferences
      const hasExplicitPalette = !!inputs.aestheticDNA.explicit.selectedPalette;
      const hasExplicitMaterials = inputs.aestheticDNA.explicit.topMaterials.length > 0;
      const hasLifestyle = !!inputs.lifestyle.vibe || inputs.lifestyle.goals.length > 0;
      const hasSensory = !!inputs.sensory.light || !!inputs.sensory.texture;
      return hasExplicitPalette || hasExplicitMaterials || hasLifestyle || hasSensory;
      
    case GenerationSource.Personality:
      // Need Big Five scores
      return !!inputs.personality && (
        typeof inputs.personality.openness === 'number' ||
        typeof inputs.personality.conscientiousness === 'number'
      );
      
    case GenerationSource.Mixed:
      // Mixed requires BOTH implicit AND explicit data
      const hasImplicit = hasDataForSource(inputs, GenerationSource.Implicit);
      const hasExplicit = hasDataForSource(inputs, GenerationSource.Explicit);
      return hasImplicit && hasExplicit;
      
    case GenerationSource.MixedFunctional:
      // MixedFunctional requires Mixed data PLUS functional data
      const hasMixed = hasDataForSource(inputs, GenerationSource.Mixed);
      const hasFunctional = 
        (inputs.activities && inputs.activities.length > 0) ||
        (inputs.painPoints && inputs.painPoints.length > 0);
      return hasMixed && hasFunctional;
      
    case GenerationSource.InspirationReference:
      // Need at least some inspiration images for multi-reference
      return (inputs.inspirations?.length || 0) > 0;
  }
}

/**
 * Gets the list of sources that have sufficient data for generation.
 */
export function getAvailableSources(inputs: PromptInputs): GenerationSource[] {
  const allSources = [
    GenerationSource.Implicit,
    GenerationSource.Explicit,
    GenerationSource.Personality,
    GenerationSource.Mixed,
    GenerationSource.MixedFunctional,
    GenerationSource.InspirationReference
  ];
  
  return allSources.filter(source => hasDataForSource(inputs, source));
}

