/**
 * Layout viewport width — matches the content box (respects scrollbar gutter).
 * Prefer over `100vw` / `window.innerWidth` for full-bleed breakout on Windows Chrome.
 */
export function getLayoutViewportWidth(): number {
  if (typeof document === 'undefined') return 0;
  return document.documentElement.clientWidth;
}
