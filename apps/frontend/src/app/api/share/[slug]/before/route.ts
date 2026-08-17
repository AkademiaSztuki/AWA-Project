import { NextRequest, NextResponse } from 'next/server';
import { proxyGcpShareImage } from '@/lib/share/proxy-share-image';

export const runtime = 'nodejs';

export async function GET(
  _request: NextRequest,
  { params }: { params: { slug: string } },
) {
  const slug = params.slug?.trim();
  if (!slug) {
    return new NextResponse('Not found', { status: 404 });
  }
  return proxyGcpShareImage(`/api/share/cards/${encodeURIComponent(slug)}/before`);
}
