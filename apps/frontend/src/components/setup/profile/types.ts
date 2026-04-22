export type ProfileWizardStep =
  | "welcome"
  | "lifestyle"
  | "big_five"
  | "inspirations"
  | "tinder_swipes"
  | "semantic_diff"
  | "colors_materials"
  | "sensory_tests"
  | "nature_metaphor"
  | "aspirational_self"
  | "prs_ideal"
  | "biophilia"
  | "summary";

export interface CoreProfileData {
  lifestyle?: {
    livingSituation: string;
    lifeVibe: string;
    goals: string[];
  };
  bigFive?: {
    instrument?: 'IPIP-60' | 'IPIP-NEO-120';
    responses: Record<string, number>;
    scores: {
      // Legacy simple scores
      openness?: number;
      conscientiousness?: number;
      extraversion?: number;
      agreeableness?: number;
      neuroticism?: number;
      
      // New nested structure
      domains?: {
        O: number;
        C: number;
        E: number;
        A: number;
        N: number;
      };
      facets?: {
        O: Record<string, number>;
        C: Record<string, number>;
        E: Record<string, number>;
        A: Record<string, number>;
        N: Record<string, number>;
      };
    };
    completedAt: string;
  };
  inspirations?: Array<{
    id: string;
    fileId?: string;
    url?: string;
    tags?: {
      styles?: string[];
      colors?: string[];
      materials?: string[];
      biophilia?: number;
    };
    description?: string;
    addedAt: string;
  }>;
  tinderSwipes?: Array<{
    imageId: number;
    direction: "left" | "right";
    reactionTime: number;
    dwellTime: number;
  }>;
  semanticDifferential?: {
    warmth: number;
    brightness: number;
    complexity: number;
    texture: number;
    scaleValues?: Record<string, number>;
  };
  colorsAndMaterials?: {
    selectedPalette: string;
    topMaterials: string[];
  };
  sensoryPreferences?: {
    music: string;
    texture: string;
    light: string;
  };
  natureMetaphor?: string;
  aspirationalSelf?: {
    feelings: string[];
    rituals: string[];
  };
  prsIdeal?: { x: number; y: number };
  biophiliaScore?: number;
}
