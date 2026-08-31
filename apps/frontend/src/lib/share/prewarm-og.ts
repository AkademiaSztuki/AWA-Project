import { shareOgImageUrl } from '@/lib/share/og-image-url';
import type { ShareLanguage } from '@/lib/share/captions';

/** Warm OG image cache before opening X/Facebook so crawlers see the before/after card. */
export async function prewarmShareOgImage(
  siteUrl: string,
  slug: string,
  language: ShareLanguage,
): Promise<void> {
  const url = shareOgImageUrl(siteUrl, slug, language);
  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) {
      console.warn('[share] OG prewarm failed', { slug, status: res.status });
    }
  } catch (error) {
    console.warn('[share] OG prewarm error', { slug, error: String(error) });
  }
}
