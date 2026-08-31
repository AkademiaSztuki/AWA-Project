import type { ShareLanguage } from '@/lib/share/captions';

export function shareOgImageUrl(siteUrl: string, slug: string, language: ShareLanguage): string {
  const params = new URLSearchParams({ lang: language });
  return `${siteUrl}/api/share-og/${encodeURIComponent(slug)}?${params.toString()}`;
}
