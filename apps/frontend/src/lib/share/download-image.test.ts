import { describe, it, expect } from 'vitest';
import {
  STORIES_ASPECT,
  STORIES_CANVAS_HEIGHT,
  STORIES_CANVAS_WIDTH,
  STORIES_COLORS,
  storiesBrandLayout,
} from './download-image';

describe('storiesBrandLayout', () => {
  it('uses a fixed 9:16 Stories canvas in site colors, not source letterboxing', () => {
    const layout = storiesBrandLayout(1024, 1024, false);
    expect(layout.canvasWidth).toBe(STORIES_CANVAS_WIDTH);
    expect(layout.canvasHeight).toBe(STORIES_CANVAS_HEIGHT);
    expect(layout.canvasWidth / layout.canvasHeight).toBeCloseTo(STORIES_ASPECT, 5);
    expect(layout.afterSlot.height / layout.canvasHeight).toBeGreaterThan(0.72);
    expect(layout.beforeSlot).toBeNull();
    expect(STORIES_COLORS.background.toLowerCase()).not.toBe('#1a1612');
  });

  it('stacks before/after slots so both photos fill the 9:16 frame', () => {
    const layout = storiesBrandLayout(1600, 900, true);
    expect(layout.beforeSlot).not.toBeNull();
    if (!layout.beforeSlot) return;
    expect(layout.beforeSlot.height).toBeGreaterThan(layout.canvasHeight * 0.32);
    expect(layout.afterSlot.height).toBeGreaterThan(layout.canvasHeight * 0.32);
    expect(layout.afterSlot.y).toBeGreaterThan(layout.beforeSlot.y + layout.beforeSlot.height - 1);
    expect(layout.imageY + layout.imageHeight).toBeLessThanOrEqual(
      layout.canvasHeight - layout.bottomBarHeight + 2,
    );
  });

  it('keeps compact chrome on an already-tall source', () => {
    const layout = storiesBrandLayout(1080, 1920);
    expect(layout.topBarHeight).toBeLessThan(layout.canvasHeight * 0.1);
    expect(layout.bottomBarHeight).toBeLessThan(layout.canvasHeight * 0.14);
    expect(layout.afterSlot.width).toBeGreaterThan(layout.canvasWidth * 0.85);
  });

  it('clamps non-positive source without shrinking the Stories frame', () => {
    const layout = storiesBrandLayout(0, 0);
    expect(layout.canvasWidth).toBe(STORIES_CANVAS_WIDTH);
    expect(layout.canvasHeight).toBe(STORIES_CANVAS_HEIGHT);
    expect(layout.afterSlot.width).toBeGreaterThanOrEqual(1);
    expect(layout.afterSlot.height).toBeGreaterThanOrEqual(1);
  });
});
