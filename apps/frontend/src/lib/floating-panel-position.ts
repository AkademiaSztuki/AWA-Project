/** Matches `w-[min(360px,92vw)]` on ColorAdjustmentPanel anchored layout. */
export function getA11yAnchoredPanelWidth(viewportWidth: number): number {
  return Math.min(360, viewportWidth * 0.92);
}

/** Matches `h-[min(85vh,calc(100vh-6rem))]` on ColorAdjustmentPanel anchored layout. */
export function getA11yAnchoredPanelHeight(viewportHeight: number): number {
  return Math.min(viewportHeight * 0.85, viewportHeight - 96);
}

export type AnchoredPanelPosition = {
  top: number;
  left: number;
};

/**
 * Position a floating panel below (or above) an anchor, right-aligned to the anchor,
 * clamped inside the viewport. Returns null when neither above nor below fits.
 */
export function resolveAnchoredPanelPosition(
  anchorRect: DOMRect,
  panelSize: { width: number; height: number },
  options?: {
    viewportWidth?: number;
    viewportHeight?: number;
    margin?: number;
    gap?: number;
  }
): AnchoredPanelPosition | null {
  const viewportWidth = options?.viewportWidth ?? window.innerWidth;
  const viewportHeight = options?.viewportHeight ?? window.innerHeight;
  const margin = options?.margin ?? 16;
  const gap = options?.gap ?? 8;
  const { width: panelWidth, height: panelHeight } = panelSize;

  const topBelow = anchorRect.bottom + gap;
  const topAbove = anchorRect.top - gap - panelHeight;
  const fitsBelow = topBelow + panelHeight <= viewportHeight - margin;
  const fitsAbove = topAbove >= margin;

  if (!fitsBelow && !fitsAbove) {
    return null;
  }

  const top = fitsBelow ? topBelow : topAbove;

  let left = anchorRect.right - panelWidth;
  const minLeft = margin;
  const maxLeft = Math.max(margin, viewportWidth - panelWidth - margin);
  left = Math.max(minLeft, Math.min(left, maxLeft));

  return { top, left };
}
