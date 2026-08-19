/** UA tokens that usually mean a phone/tablet share sheet (Instagram can appear). */
const MOBILE_SHARE_UA = /Android|iPhone|iPad|iPod|Mobile/i;

export function isMobileShareUserAgent(userAgent: string | null | undefined): boolean {
  if (!userAgent) return false;
  return MOBILE_SHARE_UA.test(userAgent);
}

/** Windows 11 desktop: navigator.share({ files }) opens Nearby Share, not Instagram. */
export function isDesktopWindowsUserAgent(userAgent: string | null | undefined): boolean {
  if (!userAgent) return false;
  return /Windows NT/i.test(userAgent) && !/Mobile/i.test(userAgent);
}

export function readCoarsePointer(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  try {
    return window.matchMedia('(pointer: coarse)').matches;
  } catch {
    return false;
  }
}

/**
 * Phone/tablet: Web Share with a JPEG can surface Instagram.
 * Windows desktop: never use navigator.share — the OS sheet is Nearby Share / Outlook.
 */
export function isMobileShareClient(
  userAgent: string | null | undefined,
  coarsePointer: boolean,
): boolean {
  if (isDesktopWindowsUserAgent(userAgent)) return false;
  return coarsePointer || isMobileShareUserAgent(userAgent);
}

export function canAttemptNativeFileShare(params: {
  canShareFiles: boolean;
  userAgent: string | null | undefined;
  coarsePointer: boolean;
}): boolean {
  return params.canShareFiles && isMobileShareClient(params.userAgent, params.coarsePointer);
}

export function shouldUseNativeFileShare(file: File): boolean {
  if (typeof navigator === 'undefined' || typeof navigator.share !== 'function') return false;
  if (typeof navigator.canShare !== 'function') return false;

  let canShareFiles = false;
  try {
    canShareFiles = navigator.canShare({ files: [file] });
  } catch {
    canShareFiles = false;
  }

  return canAttemptNativeFileShare({
    canShareFiles,
    userAgent: navigator.userAgent,
    coarsePointer: readCoarsePointer(),
  });
}
