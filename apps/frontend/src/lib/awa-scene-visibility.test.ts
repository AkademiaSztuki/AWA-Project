import { describe, expect, it } from 'vitest';
import {
  allowHeavyDecorations,
  sceneDecorationsOnViewport,
  showAwaDesktop,
  showAwaMobile,
} from './awa-scene-visibility';

const desktopReady = {
  hideModel3D: false,
  isCompactLayout: false,
  isMarketingPage: false,
  liveSlowConnection: false,
  decorationsReady: true,
  showMobileAwa: false,
};

describe('allowHeavyDecorations', () => {
  it('keeps desktop extras on even when Chrome reports 3G / save-data', () => {
    expect(
      allowHeavyDecorations({
        hideModel3D: false,
        isCompactLayout: false,
        liveSlowConnection: true,
      }),
    ).toBe(true);
  });

  it('lets accessibility hide win on desktop', () => {
    expect(
      allowHeavyDecorations({
        hideModel3D: true,
        isCompactLayout: false,
        liveSlowConnection: false,
      }),
    ).toBe(false);
  });

  it('skips compact extras on a live slow connection', () => {
    expect(
      allowHeavyDecorations({
        hideModel3D: false,
        isCompactLayout: true,
        liveSlowConnection: true,
      }),
    ).toBe(false);
  });
});

describe('sceneDecorationsOnViewport', () => {
  it('shows desktop extras on inner pages', () => {
    expect(
      sceneDecorationsOnViewport({
        hideModel3D: false,
        isCompactLayout: false,
        liveSlowConnection: true,
        isMarketingPage: false,
      }),
    ).toBe(true);
  });

  it('skips compact inner pages even on a fast connection', () => {
    expect(
      sceneDecorationsOnViewport({
        hideModel3D: false,
        isCompactLayout: true,
        liveSlowConnection: false,
        isMarketingPage: false,
      }),
    ).toBe(false);
  });

  it('allows compact homepage when the live link is not slow', () => {
    expect(
      sceneDecorationsOnViewport({
        hideModel3D: false,
        isCompactLayout: true,
        liveSlowConnection: false,
        isMarketingPage: true,
      }),
    ).toBe(true);
  });
});

describe('showAwaDesktop', () => {
  it('does not depend on liveSlowConnection on desktop', () => {
    expect(showAwaDesktop({ ...desktopReady, liveSlowConnection: true })).toBe(true);
    expect(showAwaDesktop({ ...desktopReady, liveSlowConnection: false })).toBe(true);
    expect(showAwaDesktop({ ...desktopReady, isMarketingPage: true, liveSlowConnection: true })).toBe(
      true,
    );
  });

  it('does not show until decorations are ready (no mount-then-unmount on first paint)', () => {
    expect(showAwaDesktop({ ...desktopReady, decorationsReady: false })).toBe(false);
  });

  it('still honors Ukryj model 3D on desktop', () => {
    expect(showAwaDesktop({ ...desktopReady, hideModel3D: true, liveSlowConnection: false })).toBe(
      false,
    );
  });

  it('keeps compact homepage 3D gated by network and the delayed mobile flag', () => {
    const compactHome = {
      ...desktopReady,
      isCompactLayout: true,
      isMarketingPage: true,
      showMobileAwa: true,
    };
    expect(showAwaDesktop(compactHome)).toBe(true);
    expect(showAwaDesktop({ ...compactHome, liveSlowConnection: true })).toBe(false);
    expect(showAwaDesktop({ ...compactHome, showMobileAwa: false })).toBe(false);
  });

  it('does not show 3D on compact inner pages', () => {
    expect(
      showAwaDesktop({
        ...desktopReady,
        isCompactLayout: true,
        isMarketingPage: false,
        showMobileAwa: true,
      }),
    ).toBe(false);
  });
});

describe('showAwaMobile', () => {
  it('allows delayed homepage 3D on a fast compact connection', () => {
    expect(
      showAwaMobile({
        hideModel3D: false,
        isCompactLayout: true,
        liveSlowConnection: false,
        isMarketingPage: true,
        showMobileAwa: true,
      }),
    ).toBe(true);
  });

  it('unmounts compact homepage 3D on 3G', () => {
    expect(
      showAwaMobile({
        hideModel3D: false,
        isCompactLayout: true,
        liveSlowConnection: true,
        isMarketingPage: true,
        showMobileAwa: true,
      }),
    ).toBe(false);
  });
});
