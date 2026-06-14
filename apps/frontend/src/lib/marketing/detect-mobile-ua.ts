/** Coarse mobile UA check for SSR — aligns with hero compact breakpoint strategy. */
export function isLikelyMobileUserAgent(userAgent: string | null | undefined): boolean {
  if (!userAgent) return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile/i.test(
    userAgent
  );
}
