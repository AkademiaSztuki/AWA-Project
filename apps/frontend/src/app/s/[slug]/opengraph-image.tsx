import { gcpApi } from '@/lib/gcp-api-client';
import { buildShareOgImageResponse } from '@/lib/share/og-image';
import { parseShareLanguage } from '@/lib/share/resolve-language';

export const runtime = 'nodejs';
export const alt = 'IDA — before and after interior concept';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const revalidate = 86400;

async function loadCardLanguage(slug: string): Promise<'pl' | 'en' | null> {
  const result = await gcpApi.share.getCard(slug);
  if (!result.ok || !result.data?.language) return null;
  return parseShareLanguage(result.data.language);
}

export default async function ShareOpenGraphImage({
  params,
}: {
  params: { slug: string };
}) {
  const slug = params.slug?.trim();
  const language = (slug ? await loadCardLanguage(slug) : null) ?? 'en';
  return buildShareOgImageResponse(slug, language);
}
