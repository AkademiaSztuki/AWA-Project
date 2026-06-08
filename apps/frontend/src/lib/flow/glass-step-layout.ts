/**
 * Shared height hints for flow GlassCard steps.
 * Prefer GLASS_CARD_DESKTOP_GROW_STEP: card grows with content, page scrolls (no inner scrollbar).
 */

/** @deprecated Use GLASS_CARD_DESKTOP_GROW_STEP — max-h caused internal scroll in glass cards. */
export const GLASS_CARD_SCROLL_STEP = "min-h-0 xl:min-h-[min(480px,52vh)]";

/** @deprecated Use GLASS_CARD_DESKTOP_GROW_STEP — xl:max-h caused internal scroll on desktop. */
export const GLASS_CARD_MOBILE_PAGE_STEP = "min-h-0 xl:min-h-[min(480px,52vh)]";

/**
 * Desktop glass card that grows with content (no max-h, no internal scroll).
 * Pair with flatOnMobile + no scrollable prop so the page scrolls when content exceeds the viewport.
 */
export const GLASS_CARD_DESKTOP_GROW_STEP = "min-h-0 xl:min-h-[min(480px,52vh)]";

/**
 * Horizontal shell for main flow / setup GlassCard columns.
 * Matches CoreProfileWizard — avoids max-w-3xl (768px) so room/taste steps are not narrower than profile on tablet.
 */
export const FULL_FLOW_GLASS_SHELL = "w-full max-w-full lg:max-w-none mx-auto";

/**
 * Flow/setup wizard page column — avoid min-h-screen below AppContentFrame + progress bar
 * (nested 100vh shells leave a dead band on mobile).
 */
export const FLOW_WIZARD_PAGE_SHELL = "w-full flex flex-col";

/** Step body — content-height on mobile; flex-1 only on xl for desktop column balance. */
export const FLOW_WIZARD_BODY_SHELL =
  "w-full flex flex-col items-stretch xl:flex-1 xl:min-h-0";

/** Vertical gap between PartOneProgressBar and step content. */
export const FLOW_PROGRESS_CONTENT_GAP = "gap-2 sm:gap-3 lg:gap-6";
