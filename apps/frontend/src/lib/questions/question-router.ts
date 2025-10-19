// Question Router - Logic for determining which questions to ask when
// Combines Tier 1 (validated scales) + Tier 2 (adaptive questions)
// Based on: room type, social context, household, user progress

import { QuestionContext, getQuestionsForRoom, getSocialDynamicsQuestions } from './adaptive-questions';
import { VALIDATED_SCALES } from './validated-scales';

// =========================
// QUESTION FLOW TYPES
// =========================

export type QuestionPhase = 
  | 'core_profile'      // One-time, global
  | 'household_setup'   // Per household
  | 'room_setup'        // Per room
  | 'design_feedback';  // Post-generation

export interface QuestionFlow {
  phase: QuestionPhase;
  steps: QuestionStep[];
}

export interface QuestionStep {
  id: string;
  type: 'validated_scale' | 'adaptive_question' | 'custom';
  required: boolean;
  condition?: (context: any) => boolean;
  scaleId?: string;  // If type === 'validated_scale'
  questionId?: string;  // If type === 'adaptive_question'
}

// =========================
// CORE PROFILE FLOW (One-time, 10-12 min)
// =========================

export const CORE_PROFILE_FLOW: QuestionFlow = {
  phase: 'core_profile',
  steps: [
    {
      id: 'lifestyle_intro',
      type: 'custom',
      required: true
    },
    {
      id: 'lifestyle_questions',
      type: 'custom',
      required: true
      // Questions: Living situation type, life vibe, goals
    },
    {
      id: 'implicit_preferences_mixed',
      type: 'validated_scale',
      scaleId: 'implicit_preferences',
      required: true
      // 50 mixed Tinder swipes
    },
    {
      id: 'semantic_differential',
      type: 'validated_scale',
      scaleId: 'semantic_differential',
      required: true
      // Color warmth, brightness, complexity sliders
    },
    {
      id: 'color_palette_ranking',
      type: 'custom',
      required: true
      // Drag-drop 6 color palettes
    },
    {
      id: 'material_preferences',
      type: 'custom',
      required: true
      // Multi-select favorite materials
    },
    {
      id: 'sensory_music',
      type: 'validated_scale',
      scaleId: 'sensory_music',
      required: true
      // Music preference test
    },
    {
      id: 'sensory_texture',
      type: 'validated_scale',
      scaleId: 'sensory_texture',
      required: true
      // Texture preference test
    },
    {
      id: 'sensory_light',
      type: 'validated_scale',
      scaleId: 'sensory_light',
      required: true
      // Light temperature preference
    },
    {
      id: 'projective_nature',
      type: 'validated_scale',
      scaleId: 'projective_nature',
      required: true
      // Nature metaphor
    },
    {
      id: 'prs_ideal_baseline',
      type: 'validated_scale',
      scaleId: 'prs_mood_grid',
      required: true
      // Where do you want your spaces to be ideally?
    },
    {
      id: 'biophilia_test',
      type: 'validated_scale',
      scaleId: 'biophilia_test',
      required: true
      // Visual dosage test 0-3
    }
  ]
};

// =========================
// HOUSEHOLD SETUP FLOW (2-3 min per household)
// =========================

export const HOUSEHOLD_SETUP_FLOW: QuestionFlow = {
  phase: 'household_setup',
  steps: [
    {
      id: 'household_name',
      type: 'custom',
      required: true
      // "What should we call this space?" - "My Home", "Office", etc
    },
    {
      id: 'household_type',
      type: 'custom',
      required: true
      // home, office, vacation, other
    },
    {
      id: 'living_situation',
      type: 'custom',
      required: true
      // alone, partner, family, roommates
    },
    {
      id: 'household_dynamics',
      type: 'custom',
      required: false,
      condition: (context) => context.livingSituation !== 'alone'
      // Who decides? Taste alignment? Conflicts?
    },
    {
      id: 'household_goals',
      type: 'custom',
      required: true
      // Multi-select: connection, independence, productivity, etc
    }
  ]
};

// =========================
// ROOM SETUP FLOW (8-10 min per room)
// =========================

export function getRoomSetupFlow(context: QuestionContext): QuestionFlow {
  const baseSteps: QuestionStep[] = [
    {
      id: 'room_basics',
      type: 'custom',
      required: true
      // Name, room type, who uses it
    },
    {
      id: 'photo_upload',
      type: 'custom',
      required: true
      // Upload 2-3 photos, AI analysis, IDA comments
    },
    {
      id: 'prs_current_state',
      type: 'validated_scale',
      scaleId: 'prs_mood_grid',
      required: true
      // "Where is THIS room now?" (pre-test)
    },
    {
      id: 'pain_points',
      type: 'custom',
      required: true
      // Multi-select from pain points list
    },
    {
      id: 'activities',
      type: 'adaptive_question',
      required: true
      // Room-specific activity selection
    },
    {
      id: 'activity_satisfaction',
      type: 'custom',
      required: true
      // Emoji rating per selected activity
    }
  ];

  // Add social dynamics questions if shared room
  if (context.socialContext === 'shared') {
    baseSteps.push({
      id: 'social_dynamics',
      type: 'adaptive_question',
      required: true
      // Similar needs? Conflicts? Solutions?
    });
  }

  // Add temporal/activity deep dive (conversational)
  baseSteps.push({
    id: 'temporal_mapping',
    type: 'custom',
    required: false
    // "Tell me about a typical day in this room" - conversational
  });

  // Room-specific visual DNA
  baseSteps.push({
    id: 'room_visual_dna',
    type: 'validated_scale',
    scaleId: 'implicit_preferences',
    required: true
    // 30 swipes, ONLY this room type
  });

  // Aspirational state
  baseSteps.push(
    {
      id: 'prs_target_state',
      type: 'validated_scale',
      scaleId: 'prs_mood_grid',
      required: true
      // "Where SHOULD this room be?" (target)
    },
    {
      id: 'aspirational_description',
      type: 'custom',
      required: false
      // "Imagine ideal version - what's happening?" (voice/text)
    }
  );

  return {
    phase: 'room_setup',
    steps: baseSteps
  };
}

// =========================
// DESIGN FEEDBACK FLOW (3-5 min post-generation)
// =========================

export const DESIGN_FEEDBACK_FLOW: QuestionFlow = {
  phase: 'design_feedback',
  steps: [
    {
      id: 'design_selection',
      type: 'custom',
      required: true
      // Which of 3-4 generated designs is closest?
    },
    {
      id: 'prs_design_rating',
      type: 'validated_scale',
      scaleId: 'prs_mood_grid',
      required: true
      // "Where is THIS DESIGN on the map?" (post-test)
    },
    {
      id: 'place_identity',
      type: 'validated_scale',
      scaleId: 'place_identity',
      required: true
      // Binary word pairs - does it reflect you?
    },
    {
      id: 'satisfaction_scores',
      type: 'custom',
      required: true
      // Overall 1-10, Reflects you 1-10
    },
    {
      id: 'implementation_intention',
      type: 'custom',
      required: true
      // Yes/Maybe/No + why
    },
    {
      id: 'qualitative_feedback',
      type: 'custom',
      required: false
      // What you love? What to change? (voice/text optional)
    },
    {
      id: 'refinement_options',
      type: 'custom',
      required: false
      // Quick options: lighter/darker/more nature/less clutter/etc
    }
  ]
};

// =========================
// ROUTER LOGIC
// =========================

export function getNextQuestion(
  currentPhase: QuestionPhase,
  completedSteps: string[],
  context: QuestionContext
): QuestionStep | null {
  let flow: QuestionFlow;

  switch (currentPhase) {
    case 'core_profile':
      flow = CORE_PROFILE_FLOW;
      break;
    case 'household_setup':
      flow = HOUSEHOLD_SETUP_FLOW;
      break;
    case 'room_setup':
      flow = getRoomSetupFlow(context);
      break;
    case 'design_feedback':
      flow = DESIGN_FEEDBACK_FLOW;
      break;
    default:
      return null;
  }

  // Find first incomplete required step
  for (const step of flow.steps) {
    if (completedSteps.includes(step.id)) continue;
    
    // Check condition if exists
    if (step.condition && !step.condition(context)) continue;
    
    if (step.required) {
      return step;
    }
  }

  // All required steps complete - look for optional
  for (const step of flow.steps) {
    if (completedSteps.includes(step.id)) continue;
    
    if (step.condition && !step.condition(context)) continue;
    
    return step;
  }

  // All steps complete
  return null;
}

export function getFlowProgress(
  currentPhase: QuestionPhase,
  completedSteps: string[],
  context: QuestionContext
): {
  totalSteps: number;
  completedSteps: number;
  percentComplete: number;
} {
  let flow: QuestionFlow;

  switch (currentPhase) {
    case 'core_profile':
      flow = CORE_PROFILE_FLOW;
      break;
    case 'household_setup':
      flow = HOUSEHOLD_SETUP_FLOW;
      break;
    case 'room_setup':
      flow = getRoomSetupFlow(context);
      break;
    case 'design_feedback':
      flow = DESIGN_FEEDBACK_FLOW;
      break;
    default:
      return { totalSteps: 0, completedSteps: 0, percentComplete: 0 };
  }

  // Count only applicable steps (considering conditions)
  const applicableSteps = flow.steps.filter(step => {
    if (step.condition) {
      return step.condition(context);
    }
    return true;
  });

  const total = applicableSteps.length;
  const completed = completedSteps.length;
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

  return {
    totalSteps: total,
    completedSteps: completed,
    percentComplete: percent
  };
}

// =========================
// SKIP LOGIC HELPERS
// =========================

export function shouldSkipQuestion(
  stepId: string,
  userProfile: any
): boolean {
  // Examples of skip logic:
  // - If user already completed core profile, skip it
  // - If returning to same room, offer to skip unchanged sections
  // - etc.

  // Core profile already complete?
  if (stepId === 'core_profile' && userProfile?.profile_completed_at) {
    return true;
  }

  return false;
}

export function canReuseData(
  dataType: 'aesthetic_dna' | 'psychological_baseline' | 'sensory_preferences',
  userProfile: any
): boolean {
  // Check if user has this data already
  if (!userProfile) return false;

  switch (dataType) {
    case 'aesthetic_dna':
      return !!userProfile.aesthetic_dna;
    case 'psychological_baseline':
      return !!userProfile.psychological_baseline;
    case 'sensory_preferences':
      return !!userProfile.sensory_preferences;
    default:
      return false;
  }
}

