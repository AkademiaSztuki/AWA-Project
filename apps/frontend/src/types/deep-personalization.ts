// Deep Personalization Architecture - TypeScript Types
// Multi-session, multi-room, multi-household data structures

import { PRSMoodGridData } from '@/lib/questions/validated-scales';

// =========================
// LAYER 1: USER PROFILE (Global, answered once)
// =========================

export interface UserProfile {
  userHash: string;
  
  aestheticDNA: {
    implicit: {
      dominantStyles: string[];
      colors: string[];
      materials: string[];
      complexity: number;      // 0-1
      warmth: number;          // 0-1
      brightness: number;      // 0-1
      swipePatterns: SwipePattern[];
    };
    explicit: {
      selectedPalette: string;
      topMaterials: string[];
      warmthPreference: number;
      brightnessPreference: number;
      complexityPreference: number;
    };
  };
  
  psychologicalBaseline: {
    prsIdeal: PRSMoodGridData;
    biophiliaScore: number;  // 0-3
  };
  
  lifestyle: {
    vibe: string;            // busy, calm, chaotic, structured, social, private
    goals: string[];         // energy, calm, creativity, focus, connection, etc
    values: string[];        // from laddering
  };
  
  sensoryPreferences: {
    music: string;           // jazz, classical, electronic, nature, silence, lofi
    texture: string;         // soft_fabric, smooth_wood, cold_metal, etc
    light: string;           // warm_low, warm_bright, neutral, cool_bright
    natureMetaphor: string;  // ocean, forest, mountain, desert, garden, sunset
  };
  
  projectiveResponses?: {
    naturePlace: string;
    aspirationalSelf?: string; // Text description of ideal self
  };

  // Added: personality and inspirations (global, once, editable)
  personality?: {
    instrument: 'IPIP-60' | 'IPIP-NEO-120';
    version?: string;
    language?: 'pl' | 'en';
    domains?: {
      openness?: number;
      conscientiousness?: number;
      extraversion?: number;
      agreeableness?: number;
      neuroticism?: number;
      // IPIP-NEO-120 format
      O?: number;
      C?: number;
      E?: number;
      A?: number;
      N?: number;
    };
    facets?: {
      O: { [key: number]: number };
      C: { [key: number]: number };
      E: { [key: number]: number };
      A: { [key: number]: number };
      N: { [key: number]: number };
    };
    items?: Array<{
      id: string; // item key
      value: number; // raw response
      reversed?: boolean;
      domain: 'O' | 'C' | 'E' | 'A' | 'N';
    }>;
    completedAt?: string;
  };

  inspirations?: Array<{
    fileId?: string; // storage reference (when persisted)
    storagePath?: string;
    tags?: {
      styles?: string[];
      colors?: string[];
      materials?: string[];
      biophilia?: number; // 0–3
    };
    description?: string; // short VLM description for Kontext
    embedding?: number[]; // optional future use
    addedAt?: string;
  }>;
  
  profileCompletedAt?: string;
  profileVersion: number;
  createdAt: string;
  updatedAt: string;
}

export interface SwipePattern {
  category: string;
  count: number;
  percentage: number;
}

// =========================
// LAYER 2: HOUSEHOLD
// =========================

export interface Household {
  id: string;
  userHash: string;
  
  name: string;
  householdType: string;   // home, office, vacation, other
  
  livingSituation: string; // alone, partner, family, roommates
  
  householdDynamics?: {
    decisionMaker: string;  // me, together, other
    tasteAlignment: string; // very_similar, somewhat, quite_different
    conflicts?: string[];   // temperature, light, clutter, style, activities, timing
  };
  
  householdGoals: string[]; // connection, independence, productivity, relaxation, etc
  
  createdAt: string;
  updatedAt: string;
}

// =========================
// LAYER 3: ROOM
// =========================

export interface Room {
  id: string;
  householdId: string;
  
  name: string;
  roomType: string;        // bedroom, living_room, kitchen, etc
  
  usageType: 'solo' | 'shared';
  sharedWith?: string[];   // [partner, kids, guests]
  ownershipFeeling?: string; // my_territory, neutral_shared, someone_elses
  
  currentPhotos: RoomPhoto[];
  
  // RESEARCH: PRS pre-test
  prsCurrent: PRSMoodGridData;
  prsTarget: PRSMoodGridData;
  
  painPoints: string[];
  
  // RESEARCH: Functional context (PEO-based)
  activities: RoomActivity[];
  
  // RESEARCH: Room-specific implicit preferences
  roomVisualDNA?: {
    swipes: EnhancedSwipeData[];
    patterns: SwipePattern[];
    roomSpecificPreferences: {
      styles: string[];
      colors: string[];
    };
  };
  
  aspirationalState?: {
    prsTarget: PRSMoodGridData;
    moodDescription?: string;
    voiceRecordingUrl?: string;
  };
  
  createdAt: string;
  updatedAt: string;
}

export interface RoomPhoto {
  url: string;
  analysis: {
    clutter: number;         // 0-1
    dominantColors: string[];
    detectedObjects: string[];
    lightQuality: string;    // dark, dim, bright, very_bright
    aiComment: string;
    humanComment: string;    // IDA's comment in Polish
  };
  uploadedAt: string;
}

export interface RoomActivity {
  type: string;              // sleep, work, relax, cook, etc
  frequency: string;         // daily, few_times_week, weekly, occasionally, rarely
  satisfaction: string;      // great, ok, difficult
  timeOfDay?: string;        // morning, afternoon, evening, night, varies
  withWhom?: string;         // alone, partner, family, varies
}

// =========================
// LAYER 4: DESIGN SESSION
// =========================

export interface DesignSession {
  id: string;
  roomId: string;
  
  sessionNumber: number;     // 1st attempt, 2nd refinement, etc
  intent: string;            // new_direction, refinement, explore_variation
  
  promptUsed: string;
  promptSynthesisData: {
    weights: any;            // From scoring.ts
    components: any;         // From builder.ts
    isRefined: boolean;
    tokenCount: number;
  };
  
  parametersUsed: any;       // FLUX parameters
  
  generatedImages: GeneratedImageData[];
  selectedImageIndex?: number;
  
  // RESEARCH: PRS post-test
  prsPostTest?: PRSMoodGridData;
  
  // RESEARCH: Satisfaction metrics
  satisfactionScore?: number;        // 1-10
  reflectsIdentityScore?: number;    // 1-10
  implementationIntention?: string;  // yes, maybe, no
  
  feedbackText?: string;
  feedbackVoiceUrl?: string;
  whatLoved?: string;
  whatChange?: string;
  
  createdAt: string;
}

export interface GeneratedImageData {
  url: string;
  thumbnailUrl?: string;
  fluxParameters: any;
  ratings?: {
    aestheticMatch?: number;
    character?: number;
    harmony?: number;
  };
}

// =========================
// RESEARCH: Enhanced Swipe Tracking
// =========================

export interface EnhancedSwipeData {
  imageId: string;
  imageMetadata: {
    roomType?: string;
    style: string[];
    colors: string[];
    materials: string[];
    biophilia: number;
    complexity: number;
    warmth: number;
    brightness: number;
  };
  
  direction: 'left' | 'right';
  
  // Behavioral metrics
  reactionTimeMs: number;
  dwellTimeMs: number;       // How long looked before deciding
  hesitationCount: number;   // Number of false starts
  swipeVelocity: number;     // Speed of gesture
  
  timestamp: string;
}

// =========================
// SESSION DATA (extended from existing)
// =========================

export interface ExtendedSessionData {
  // Original fields
  userHash: string;
  consentTimestamp: string;
  
  // Path selection
  pathType?: 'fast' | 'full';
  pathSelectedAt?: string;
  
  // Fast Track specific
  fastTrack?: {
    photo?: string;
    roomAnalysis?: any;
    quickSwipes?: string[];
    generationCount?: number;
  };
  
  // Full Experience - references to new structure
  coreProfile?: {
    completedAt?: string;
    data: Partial<UserProfile>;
  };
  
  currentHouseholdId?: string;
  currentRoomId?: string;
  currentSessionId?: string;
  
  // Legacy fields (for backward compatibility)
  currentStep?: string;
  uploadedImage?: string;
  roomType?: string;
  tinderResults?: any[];
  visualDNA?: any;
  ladderResults?: any;
  generations?: any[];
}

// =========================
// COMPLETION STATUS
// =========================

export interface CompletionStatus {
  coreProfileComplete: boolean;
  hasHouseholds: boolean;
  householdCount: number;
  roomCount: number;
  sessionCount: number;
  nextStep: 'complete_profile' | 'add_household' | 'add_room' | 'ready';
}

// =========================
// API REQUEST/RESPONSE TYPES
// =========================

export interface SaveUserProfileRequest {
  userHash: string;
  profileData: Partial<UserProfile>;
}

export interface SaveHouseholdRequest {
  userHash: string;
  householdData: Omit<Household, 'id' | 'createdAt' | 'updatedAt'>;
}

export interface SaveRoomRequest {
  householdId: string;
  roomData: Omit<Room, 'id' | 'createdAt' | 'updatedAt'>;
}

export interface SaveDesignSessionRequest {
  roomId: string;
  sessionData: Omit<DesignSession, 'id' | 'sessionNumber' | 'createdAt'>;
}

