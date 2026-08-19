import { describe, it, expect } from 'vitest';
import { SHARE_SIGNUP_CREDITS } from './captions';
import {
  STORIES_ASPECT,
  STORIES_CANVAS_HEIGHT,
  STORIES_CANVAS_WIDTH,
  STORIES_COLORS,
  STORIES_DEFAULT_COPY,
  composeBrandedImageBlob,
  storiesBrandLayout,
} from './download-image';

describe('storiesBrandLayout', () => {
  it('uses a fixed 9:16 Stories canvas in site glass-gold colors', () => {
    const layout = storiesBrandLayout(1024, 1024);
    expect(layout.canvasWidth).toBe(STORIES_CANVAS_WIDTH);
    expect(layout.canvasHeight).toBe(STORIES_CANVAS_HEIGHT);
    expect(layout.canvasWidth / layout.canvasHeight).toBeCloseTo(STORIES_ASPECT, 5);
    expect(STORIES_COLORS.background.toLowerCase()).toBe('#f6efe3');
    expect(STORIES_COLORS.background.toLowerCase()).not.toBe('#1a1612');
    expect(STORIES_COLORS.goldFill.toLowerCase()).not.toContain('255, 80');
  });

  it('stacks Przed/Po and reserves chrome for header, headline, gold pill, and credits footer', () => {
    const layout = storiesBrandLayout(1600, 900);
    expect(layout.beforeSlot).toEqual(
      expect.objectContaining({
        width: layout.afterSlot.width,
        height: layout.afterSlot.height,
      }),
    );
    expect(layout.beforeSlot.height).toBeGreaterThan(layout.canvasHeight * 0.28);
    expect(layout.afterSlot.height).toBeGreaterThan(layout.canvasHeight * 0.28);
    expect(layout.afterSlot.y).toBeGreaterThan(layout.beforeSlot.y + layout.beforeSlot.height - 1);
    expect(layout.headlineY).toBeGreaterThan(layout.afterSlot.y + layout.afterSlot.height);
    expect(layout.pill.y).toBeGreaterThan(layout.headlineY);
    expect(layout.pill.width).toBeGreaterThan(layout.canvasWidth * 0.8);
    expect(layout.footerY).toBeGreaterThan(layout.pill.y + layout.pill.height - 1);
    expect(layout.footerY).toBeLessThan(layout.canvasHeight);
    expect(layout.topBarHeight).toBeGreaterThan(layout.badgeSize);
    expect(layout.bottomBarHeight).toBeGreaterThan(layout.canvasHeight * 0.16);
    expect(layout.bottomBarHeight).toBeLessThan(layout.canvasHeight * 0.3);
  });

  it('keeps photos as the majority of an already-tall Stories frame', () => {
    const layout = storiesBrandLayout(1080, 1920);
    expect(layout.topBarHeight).toBeLessThan(layout.canvasHeight * 0.12);
    expect(layout.afterSlot.width).toBeGreaterThan(layout.canvasWidth * 0.85);
    expect(layout.beforeSlot.height + layout.afterSlot.height).toBeGreaterThan(layout.canvasHeight * 0.55);
  });

  it('clamps non-positive source without shrinking the Stories frame', () => {
    const layout = storiesBrandLayout(0, 0);
    expect(layout.canvasWidth).toBe(STORIES_CANVAS_WIDTH);
    expect(layout.canvasHeight).toBe(STORIES_CANVAS_HEIGHT);
    expect(layout.beforeSlot.width).toBeGreaterThanOrEqual(1);
    expect(layout.beforeSlot.height).toBeGreaterThanOrEqual(1);
    expect(layout.afterSlot.width).toBeGreaterThanOrEqual(1);
    expect(layout.afterSlot.height).toBeGreaterThanOrEqual(1);
  });
});

describe('STORIES_DEFAULT_COPY', () => {
  it('matches the public /s card headline, gold pill CTA, and 500-credit footer', () => {
    expect(STORIES_DEFAULT_COPY.headline).toBe('Przed i po: tak IDA zmieniła ten pokój');
    expect(STORIES_DEFAULT_COPY.cta).toBe('Wygeneruj swoją koncepcję');
    expect(STORIES_DEFAULT_COPY.siteLabel).toBe('project-ida.com');
    expect(STORIES_DEFAULT_COPY.footer).toContain(String(SHARE_SIGNUP_CREDITS));
    expect(STORIES_DEFAULT_COPY.footer).toContain('project-ida.com');
  });
});

describe('composeBrandedImageBlob', () => {
  it('refuses to export an after-only Stories file when before is missing', async () => {
    await expect(composeBrandedImageBlob('https://example.com/after.jpg', 'CTA', null)).rejects.toThrow(
      'before_image_required',
    );
    await expect(composeBrandedImageBlob('https://example.com/after.jpg', 'CTA', '   ')).rejects.toThrow(
      'before_image_required',
    );
  });
});
