import { describe, it, expect } from 'vitest';
import {
  canAttemptNativeFileShare,
  isMobileShareClient,
  isMobileShareUserAgent,
} from './native-file-share';

const WINDOWS_CHROME =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const MAC_CHROME =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const IPHONE_SAFARI =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
const ANDROID_CHROME =
  'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36';

describe('native Instagram share gating', () => {
  it('does not use Web Share on Windows desktop even when canShare(files) is true', () => {
    expect(isMobileShareUserAgent(WINDOWS_CHROME)).toBe(false);
    expect(isMobileShareClient(WINDOWS_CHROME, false)).toBe(false);
    expect(isMobileShareClient(WINDOWS_CHROME, true)).toBe(false);
    expect(
      canAttemptNativeFileShare({
        canShareFiles: true,
        userAgent: WINDOWS_CHROME,
        coarsePointer: false,
      }),
    ).toBe(false);
  });

  it('does not use Web Share on Mac desktop', () => {
    expect(isMobileShareClient(MAC_CHROME, false)).toBe(false);
    expect(
      canAttemptNativeFileShare({
        canShareFiles: true,
        userAgent: MAC_CHROME,
        coarsePointer: false,
      }),
    ).toBe(false);
  });

  it('allows Web Share on phones when files can be shared', () => {
    expect(
      canAttemptNativeFileShare({
        canShareFiles: true,
        userAgent: IPHONE_SAFARI,
        coarsePointer: true,
      }),
    ).toBe(true);
    expect(
      canAttemptNativeFileShare({
        canShareFiles: true,
        userAgent: ANDROID_CHROME,
        coarsePointer: true,
      }),
    ).toBe(true);
  });

  it('skips Web Share when the OS cannot attach files', () => {
    expect(
      canAttemptNativeFileShare({
        canShareFiles: false,
        userAgent: IPHONE_SAFARI,
        coarsePointer: true,
      }),
    ).toBe(false);
  });
});
