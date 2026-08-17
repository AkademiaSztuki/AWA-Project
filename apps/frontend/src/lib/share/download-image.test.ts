import { describe, it, expect } from 'vitest';
import { STORIES_ASPECT, storiesBrandLayout } from './download-image';

describe('storiesBrandLayout', () => {
  it('makes a square interior fill a 9:16 Stories frame', () => {
    const layout = storiesBrandLayout(1024, 1024);
    expect(layout.canvasWidth).toBe(1024);
    expect(layout.canvasHeight / layout.canvasWidth).toBeCloseTo(1 / STORIES_ASPECT, 2);
    expect(layout.imageWidth).toBeLessThanOrEqual(layout.canvasWidth);
    expect(layout.imageY).toBeGreaterThanOrEqual(layout.topBarHeight);
    expect(layout.imageY + layout.imageHeight).toBeLessThanOrEqual(
      layout.canvasHeight - layout.bottomBarHeight + 1,
    );
  });

  it('keeps branding bars on an already-tall source', () => {
    const layout = storiesBrandLayout(1080, 1920);
    expect(layout.canvasWidth).toBe(1080);
    expect(layout.canvasHeight).toBe(1920);
    expect(layout.topBarHeight).toBeGreaterThanOrEqual(64);
    expect(layout.bottomBarHeight).toBeGreaterThanOrEqual(110);
    expect(layout.imageHeight).toBeLessThan(1920);
  });

  it('clamps non-positive source to 1px', () => {
    const layout = storiesBrandLayout(0, 0);
    expect(layout.canvasWidth).toBe(1);
    expect(layout.canvasHeight).toBeGreaterThanOrEqual(1);
    expect(layout.imageWidth).toBeGreaterThanOrEqual(1);
  });
});
