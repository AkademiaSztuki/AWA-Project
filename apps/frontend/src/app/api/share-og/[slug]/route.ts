import { NextRequest } from 'next/server';
import { buildShareOgImageResponse } from '@/lib/share/og-image';
import { parseShareLanguage } from '@/lib/share/resolve-language';

export const runtime = 'nodejs';
export const revalidate = 86400;

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } },
): Promise<Response> {
  const slug = params.slug?.trim();
  if (!slug) {
    return new Response('Missing slug', { status: 400 });
  }

  const language = parseShareLanguage(request.nextUrl.searchParams.get('lang')) ?? 'en';
  return buildShareOgImageResponse(slug, language);
}
