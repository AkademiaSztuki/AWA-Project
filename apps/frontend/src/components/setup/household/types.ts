export interface HouseholdData {
  name: string;
  type: string;
  livingSituation: string;
  householdDynamics?: {
    decisionMaker: string;
    tasteAlignment: string;
    conflicts?: string[];
  };
  goals: string[];
}

export type HouseholdWizardStep = "name" | "living" | "goals";
