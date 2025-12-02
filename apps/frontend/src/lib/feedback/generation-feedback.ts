import { GenerationSource } from '@/lib/prompt-synthesis/modes';
import { DataStatus } from '@/lib/prompt-synthesis/data-quality';
import { ImplicitQualityMetrics } from '@/lib/prompt-synthesis/implicit-quality';
import { SourceConflictAnalysis } from '@/lib/prompt-synthesis/conflict-analysis';

/**
 * Feedback from user's image selection
 * This is the KEY data for validating our hypotheses
 */
export interface GenerationFeedback {
  sessionId: string;
  projectId?: string;
  timestamp: string;
  
  // What we generated
  generatedSources: GenerationSource[];
  sourceQuality: Record<string, string | DataStatus>;
  
  // What user selected
  selectedSource: GenerationSource | null;
  selectionTime: number;  // ms from display to selection
  
  // User input context (for correlation analysis)
  hasCompleteBigFive: boolean;
  tinderSwipeCount: number;
  explicitAnswerCount: number;
  
  // Quality metrics
  implicitQuality?: ImplicitQualityMetrics;
  conflictAnalysis?: SourceConflictAnalysis;
  
  // Optional: user rating
  userRating?: 1 | 2 | 3 | 4 | 5;
  
  // Optional: which sources were rejected (if user explicitly rejected)
  rejectedSources?: GenerationSource[];
}

/**
 * Regeneration event (negative feedback signal)
 * Tracks when user clicks "regenerate" - indicates dissatisfaction
 */
export type RegenerationInterpretation = 
  | 'exploring_options'     // First time - normal behavior
  | 'dissatisfied'          // 2-3 times - something wrong
  | 'very_dissatisfied';    // 4+ times - serious problem

export interface RegenerationEvent {
  sessionId: string;
  projectId?: string;
  timestamp: string;
  
  // What was shown before regeneration
  previousSources: GenerationSource[];
  previousSelected: GenerationSource | null;
  
  // Context
  regenerationCount: number;  // Which regeneration (1st, 2nd, 3rd...)
  timeSinceLastGen: number;   // ms since last generation
  
  // Interpretation
  interpretation: RegenerationInterpretation;
  
  // Quality context
  sourceQuality?: Record<string, string | DataStatus>;
  implicitQuality?: ImplicitQualityMetrics;
}

/**
 * Interprets regeneration count
 */
export function getRegenerationInterpretation(count: number): RegenerationInterpretation {
  if (count === 1) return 'exploring_options';
  if (count <= 3) return 'dissatisfied';
  return 'very_dissatisfied';
}

/**
 * Helper to count explicit answers from session data
 */
export function countExplicitAnswers(sessionData: any): number {
  let count = 0;
  
  if (sessionData.colorsAndMaterials?.selectedStyle) count++;
  if (sessionData.colorsAndMaterials?.selectedPalette) count++;
  if (sessionData.colorsAndMaterials?.topMaterials?.length > 0) count++;
  if (sessionData.sensoryPreferences?.music && sessionData.sensoryPreferences.music !== 'silence') count++;
  if (sessionData.sensoryPreferences?.texture) count++;
  if (sessionData.sensoryPreferences?.light) count++;
  if (sessionData.sensoryPreferences?.natureMetaphor) count++;
  if (sessionData.biophiliaScore !== undefined) count++;
  
  return count;
}

