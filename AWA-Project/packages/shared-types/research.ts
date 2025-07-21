// Research Through Design types
export interface ResearchSession {
  id: string;
  userHash: string;
  consentTimestamp: string;
  startedAt: string;
  completedAt?: string;
  status: 'started' | 'completed' | 'abandoned';
  data: SessionData;
}

export interface SessionData {
  demographics?: DemographicData;
  tinderResults: TinderSwipe[];
  visualDNA: VisualDNA;
  ladderResults: LadderStep[];
  generations: GenerationSet[];
  evaluations: ImageEvaluation[];
  surveys: SurveyResponses;
  behavioralData: BehavioralEvent[];
}

export interface DemographicData {
  ageRange: string;
  education: string;
  designExperience: string;
  livingSpace: string;
}

export interface TinderSwipe {
  imageId: string;
  imageTags: string[];
  direction: 'left' | 'right';
  reactionTimeMs: number;
  timestamp: string;
  confidence?: number; // How decisive was the swipe
}

export interface VisualDNA {
  dominantStyles: string[];
  colorPreferences: string[];
  materialPreferences: string[];
  lightingPreferences: string[];
  spacePreferences: string[];
  accuracyScore: number;
  confidence: number;
}

export interface LadderStep {
  level: 1 | 2 | 3;
  question: string;
  options: string[];
  selectedAnswer: string;
  timestamp: string;
  responseTimeMs: number;
}

export interface BehavioralEvent {
  type: 'mouse_move' | 'scroll' | 'focus' | 'interaction' | 'awa_look';
  timestamp: string;
  data: Record<string, any>;
  screenPosition?: { x: number; y: number };
  element?: string;
}

export interface SurveyResponses {
  satisfaction: LikertResponses;
  agency: LikertResponses;
  clarity: LikertResponses;
}

export interface LikertResponses {
  [question: string]: {
    value: number; // 1-7
    responseTimeMs: number;
    timestamp: string;
  };
}