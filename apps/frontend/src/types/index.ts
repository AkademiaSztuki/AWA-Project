// Typy dla aplikacji Aura
export interface SessionData {
  userHash: string;
  consentTimestamp: string;
  currentStep: FlowStep;
  pathType?: 'fast' | 'full';
  uploadedImage?: string;
  roomType?: string;
  tinderResults: TinderSwipe[];
  visualDNA: VisualDNA;
  ladderResults?: LadderResults;
  usagePattern?: UsagePattern;
  emotionalPreference?: EmotionalPreference;
  demographics?: Record<string, string>;
  ladderCompleteTime?: string;
  // Optional simplified ladder fields used by lightweight UI
  ladderPath?: string[];
  coreNeed?: string;
  generations: GenerationSet[];
  finalSurvey: SurveyResults;
  surveyData?: {
    agencyScore?: number;
    satisfactionScore?: number;
    clarityScore?: number;
    agencyAnswers?: Record<string, number>;
    satisfactionAnswers?: Record<string, number>;
    clarityAnswers?: Record<string, number>;
    survey1Completed?: number;
    survey2Completed?: number;
    sessionCompleted?: number;
  };
  tinderData?: {
    swipes: any[];
    currentProgress?: number;
    totalImages?: number;
  };
  dnaAccuracyScore?: number;
  dnaFeedbackTime?: string;
  dnaAnalysisComplete?: boolean;
  roomImage?: string; // Base64 encoded image
  detectedRoomType?: string; // Automatycznie wykryty typ pokoju
  roomAnalysis?: {
    detected_room_type: string;
    confidence: number;
    room_description: string;
    suggestions: string[];
    comment?: string; // MiniCPM-o-2.6 generated comment (English)
    human_comment?: string; // Human Polish comment from IDA
  };
  // Optional UI state for simple generation screen
  generatedImages?: string[];
  selectedImage?: string | null;
  imageRatings?: Record<string, any>;
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
  // Optional convenience fields for UI/prompt building
  dominantStyle?: string;
  colorPalette?: string;
  materialsSummary?: string;
  lightingSummary?: string;
  moodSummary?: string;
}

export interface LadderStep {
  level: number;
  question: string;
  selectedAnswer: string;
  timestamp: string;
}

export interface LadderResults {
  path: Array<{
    level: number;
    question: string;
    selectedAnswer: string;
    selectedId: string;
    timestamp: string;
  }>;
  coreNeed: string;
  promptElements: {
    atmosphere: string;
    colors: string;
    lighting: string;
    materials: string;
    layout: string;
    mood: string;
  };
}

export interface UsagePattern {
  timeOfDay: string;
  description: string;
  timestamp: string;
}

export interface EmotionalPreference {
  emotion: string;
  description: string;
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

// Three/Model related types used by three-utils
export interface MouseTrackingConfig {
  sensitivity: {
    horizontal: number;
    vertical: number;
  };
  smoothing: boolean;
  limits: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
  };
}

export interface AwaModelState {
  model?: unknown;
  headBone?: unknown;
  isLoaded: boolean;
  isTracking: boolean;
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