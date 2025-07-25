// Typy dla aplikacji Aura
export interface SessionData {
  userHash: string;
  consentTimestamp: string;
  currentStep: FlowStep;
  uploadedImage?: string;
  tinderResults: TinderSwipe[];
  visualDNA: VisualDNA;
  ladderResults: LadderStep[];
  generations: GenerationSet[];
  finalSurvey: SurveyResults;
  tinderData?: {
    swipes: any[];
    currentProgress?: number;
    totalImages?: number;
  };
  dnaAccuracyScore?: number;
  dnaFeedbackTime?: string;
  dnaAnalysisComplete?: boolean;
  roomImage?: string; // Base64 encoded image
}

export type FlowStep = 
  | 'landing'
  | 'onboarding' 
  | 'upload'
  | 'tinder'
  | 'dna'
  | 'ladder'
  | 'generation'
  | 'survey_satisfaction'
  | 'survey_clarity'
  | 'thanks';

export interface TinderSwipe {
  imageId: string;
  direction: 'left' | 'right';
  reactionTimeMs: number;
  timestamp: string;
}

export interface VisualDNA {
  dominantTags: string[];
  preferences: {
    colors: string[];
    materials: string[];
    styles: string[];
    lighting: string[];
  };
  accuracyScore: number;
}

export interface LadderStep {
  level: number;
  question: string;
  selectedAnswer: string;
  timestamp: string;
}

export interface GenerationSet {
  id: string;
  prompt: string;
  images: GeneratedImage[];
  timestamp: string;
}

export interface GeneratedImage {
  id: string;
  url: string;
  parameters: FluxParameters;
  evaluations: ImageEvaluation;
}

export interface FluxParameters {
  model: 'flux-1-kontext';
  prompt: string;
  baseImage?: string;
  strength?: number;
  steps: number;
  guidance: number;
}

export interface ImageEvaluation {
  aestheticMatch: number;  // 1-7
  character: number;       // 1-7
  harmony: number;        // 1-7
}

export interface SurveyResults {
  satisfaction: {
    easeOfUse: number;
    engagement: number;
    clarity: number;
    overall: number;
  };
  agency: {
    control: number;
    collaboration: number;
    creativity: number;
    ownership: number;
  };
  preferences: {
    evolution: number;
    crystallization: number;
    discovery: number;
  };
}

// Modal API typy
export interface GenerateRequest {
  prompt: string;
  baseImage?: string;
  style: string;
  modifications?: string[];
}

export interface GenerateResponse {
  images: {
    url: string;
    parameters: FluxParameters;
  }[];
  processingTime: number;
  cost: number;
}