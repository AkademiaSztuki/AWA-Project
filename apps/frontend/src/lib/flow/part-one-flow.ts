/**
 * Legacy re-exports — prefer `full-flow-progress` for new code.
 */
export {
  isFullFlowJourneyPath,
  isFullFlowJourneyPath as isPartOneFlowPath,
  getFullFlowProgressIndex,
  getFullFlowProgressPercent,
  getActiveFullFlowStep,
  FULL_FLOW_USER_STEPS,
  FULL_FLOW_STEP_COUNT,
  type FullFlowUserStep,
} from './full-flow-progress';
