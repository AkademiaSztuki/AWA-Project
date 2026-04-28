/**
 * Shared height hints for GlassCard + scrollable (AwaScrollArea) flow steps.
 * Avoid rigid min-h-[700px]: it fights max-h on short viewports and makes long pages feel "cut off".
 */
export const GLASS_CARD_SCROLL_STEP =
  "min-h-[min(360px,40vh)] md:min-h-[min(480px,52vh)] max-h-[min(92vh,960px)]";

/**
 * Horizontal shell for main flow / setup GlassCard columns.
 * Matches CoreProfileWizard — avoids max-w-3xl (768px) so room/taste steps are not narrower than profile on tablet.
 */
export const FULL_FLOW_GLASS_SHELL = "w-full max-w-full lg:max-w-none mx-auto";
