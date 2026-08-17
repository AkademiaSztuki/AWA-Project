/**
 * When the IDA 3D scene (AwaBackground) and other heavy extras may mount.
 *
 * Desktop (≥1280px, !isCompactLayout) never hides 3D because of a live slow
 * connection — Chrome's effectiveType flickers 4g↔3g and must not unmount the canvas.
 * Accessibility "Ukryj model 3D" still wins. Compact/mobile may skip 3D on 2G/3G/saveData.
 */

export type AwaSceneVisibilityInput = {
  hideModel3D: boolean;
  isCompactLayout: boolean;
  isMarketingPage: boolean;
  liveSlowConnection: boolean;
  decorationsReady: boolean;
  showMobileAwa: boolean;
};

type HeavyDecorationsInput = Pick<
  AwaSceneVisibilityInput,
  'hideModel3D' | 'isCompactLayout' | 'liveSlowConnection'
>;

type SceneDecorationsInput = HeavyDecorationsInput &
  Pick<AwaSceneVisibilityInput, 'isMarketingPage'>;

/** Particles / aurora / compact 3D. Desktop ignores live slow-connection. */
export function allowHeavyDecorations(input: HeavyDecorationsInput): boolean {
  if (input.hideModel3D) return false;
  if (!input.isCompactLayout) return true;
  return !input.liveSlowConnection;
}

export function sceneDecorationsOnViewport(input: SceneDecorationsInput): boolean {
  return allowHeavyDecorations(input) && (input.isMarketingPage || !input.isCompactLayout);
}

/**
 * Desktop ≥1280: does not depend on `liveSlowConnection`.
 * Compact (used with desktop chrome 1024–1279): homepage delayed 3D; network may hide.
 */
export function showAwaDesktop(input: AwaSceneVisibilityInput): boolean {
  if (input.hideModel3D || !input.decorationsReady) return false;
  if (!input.isCompactLayout) return true;
  return !input.liveSlowConnection && input.isMarketingPage && input.showMobileAwa;
}

export function showAwaMobile(
  input: Pick<
    AwaSceneVisibilityInput,
    'hideModel3D' | 'isCompactLayout' | 'liveSlowConnection' | 'isMarketingPage' | 'showMobileAwa'
  >,
): boolean {
  return sceneDecorationsOnViewport(input) && input.showMobileAwa && input.isMarketingPage;
}
