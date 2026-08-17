import { NextResponse } from 'next/server';
import { sniffImageMime } from '@/lib/share/image-mime';

function getGcpBaseUrl(): string | null {
  const url = process.env.NEXT_PUBLIC_GCP_API_BASE_URL;
  return url && url.length > 0 ? url.replace(/\/$/, '') : null;
}

export async function proxyGcpShareImage(
  gcpPath: string,
  options?: { cache?: RequestCache },
): Promise<NextResponse> {
  const base = getGcpBaseUrl();
  if (!base) {
    return new NextResponse('Not found', {
      status: 404,
      headers: { 'Cache-Control': 'no-store' },
    });
  }

  const cache = options?.cache ?? 'force-cache';
  const upstream = await fetch(`${base}${gcpPath.startsWith('/') ? gcpPath : `/${gcpPath}`}`, {
    cache,
  });
  if (!upstream.ok) {
    return new NextResponse('Not found', {
      status: 404,
      headers: { 'Cache-Control': 'no-store' },
    });
  }

  const buffer = Buffer.from(await upstream.arrayBuffer());
  const contentType = sniffImageMime(buffer);
  const cacheControl =
    cache === 'no-store' ? 'public, max-age=60, must-revalidate' : 'public, max-age=86400, immutable';
  return new NextResponse(buffer, {
    status: 200,
    headers: {
      'Content-Type': contentType,
      'Cache-Control': cacheControl,
      'Access-Control-Allow-Origin': '*',
    },
  });
}
