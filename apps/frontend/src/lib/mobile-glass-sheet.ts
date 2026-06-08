/** Matches Tailwind `md` — same breakpoint as mobile header (`md:hidden`). */
export const MOBILE_GLASS_SHEET_BREAKPOINT = 768;

export function isMobileGlassSheetViewport(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia(`(max-width: ${MOBILE_GLASS_SHEET_BREAKPOINT - 1}px)`).matches;
}

/** Full-viewport overlay shell — scrolls as one page, not inside the glass panel. */
export const MOBILE_GLASS_SHEET_SHELL =
  "fixed inset-0 overflow-y-auto overscroll-y-contain";

export const MOBILE_GLASS_SHEET_BACKDROP =
  "fixed inset-0 bg-black/20 backdrop-blur-sm";

export const MOBILE_GLASS_SHEET_PANEL =
  "glass-panel flex flex-col rounded-[24px] p-4 shadow-2xl sm:p-6";

/** Same safe-area margins for menu drawer and accessibility sheet (top-aligned, not bottom sheet). */
export const MOBILE_GLASS_SHEET_FRAME =
  "relative z-[1] ml-[max(0.75rem,env(safe-area-inset-left,0px))] mr-[max(0.75rem,env(safe-area-inset-right,0px))] mt-[max(0.75rem,env(safe-area-inset-top,0px))] mb-[max(0.75rem,env(safe-area-inset-bottom,0px))] sm:ml-[max(1rem,env(safe-area-inset-left,0px))] sm:mr-[max(1rem,env(safe-area-inset-right,0px))]";

export const MOBILE_GLASS_SHEET_ROOT = `${MOBILE_GLASS_SHEET_FRAME} ${MOBILE_GLASS_SHEET_PANEL}`;

export const MOBILE_GLASS_SHEET_SCROLL = "flex flex-col gap-2";

export const MOBILE_GLASS_SHEET_HEADER =
  "mb-3 flex shrink-0 items-center justify-between gap-2";

export const MOBILE_GLASS_SHEET_CLOSE_BUTTON =
  "flex h-8 w-8 shrink-0 items-center justify-center rounded-full glass-panel text-pearl-50 transition-all hover:bg-white/10 active:bg-white/20 touch-target focus:outline-none focus:ring-2 focus:ring-gold-400";

export const MOBILE_GLASS_SHEET_CLOSE_ICON_SIZE = 16;
