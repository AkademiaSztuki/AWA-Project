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
    responses: Record<string, number>;
    scores: {
      openness: number;
      conscientiousness: number;
      extraversion: number;
      agreeableness: number;
      neuroticism: number;
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
