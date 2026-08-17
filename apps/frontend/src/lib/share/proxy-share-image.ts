import { NextResponse } from 'next/server';
import { sniffImageMime } from '@/lib/share/image-mime';

function getGcpBaseUrl(): string | null {
  const url = process.env.NEXT_PUBLIC_GCP_API_BASE_URL;
  return url && url.length > 0 ? url.replace(/\/$/, '') : null;
}

export async function proxyGcpShareImage(gcpPath: string): Promise<NextResponse> {
  const base = getGcpBaseUrl();
  if (!base) {
    return new NextResponse('Not found', { status: 404 });
  }

  const upstream = await fetch(`${base}${gcpPath.startsWith('/') ? gcpPath : `/${gcpPath}`}`, {
    cache: 'force-cache',
  });
  if (!upstream.ok) {
    return new NextResponse('Not found', { status: 404 });
  }

  const buffer = Buffer.from(await upstream.arrayBuffer());
  const contentType = sniffImageMime(buffer);
  return new NextResponse(buffer, {
    status: 200,
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=86400, immutable',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
