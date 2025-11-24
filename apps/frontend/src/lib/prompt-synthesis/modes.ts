import { PromptInputs } from './scoring';

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

