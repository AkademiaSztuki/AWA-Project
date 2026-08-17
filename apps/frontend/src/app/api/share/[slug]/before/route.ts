import { NextRequest, NextResponse } from 'next/server';

function getGcpBaseUrl(): string | null {
  const url = process.env.NEXT_PUBLIC_GCP_API_BASE_URL;
  return url && url.length > 0 ? url.replace(/\/$/, '') : null;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: { slug: string } },
) {
  const slug = params.slug?.trim();
  const base = getGcpBaseUrl();
  if (!slug || !base) {
    return new NextResponse('Not found', { status: 404 });
  }

  const upstream = await fetch(`${base}/api/share/cards/${encodeURIComponent(slug)}/before`, {
    cache: 'force-cache',
  });
  if (!upstream.ok) {
    return new NextResponse('Not found', { status: 404 });
  }

  const buffer = Buffer.from(await upstream.arrayBuffer());
  const contentType = upstream.headers.get('content-type') || 'image/webp';
  return new NextResponse(buffer, {
    status: 200,
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=86400, immutable',
    },
  });
}
