import { NextResponse } from 'next/server';
import { sniffImageMime } from '@/lib/share/image-mime';
import {
  SHARE_IMAGE_CACHE_CONTROL,
  SHARE_IMAGE_MISS_CACHE_CONTROL,
  isImageContentType,
} from '@/lib/share/share-image-cache';

function getGcpBaseUrl(): string | null {
  const url = process.env.NEXT_PUBLIC_GCP_API_BASE_URL;
  return url && url.length > 0 ? url.replace(/\/$/, '') : null;
}

export async function proxyGcpShareImage(gcpPath: string): Promise<NextResponse> {
  const base = getGcpBaseUrl();
  if (!base) {
    return new NextResponse('Not found', {
      status: 404,
      headers: { 'Cache-Control': SHARE_IMAGE_MISS_CACHE_CONTROL },
    });
  }

  const upstream = await fetch(`${base}${gcpPath.startsWith('/') ? gcpPath : `/${gcpPath}`}`, {
    cache: 'force-cache',
    next: { revalidate: 86400 },
  });
  if (!upstream.ok) {
    return new NextResponse('Not found', {
      status: 404,
      headers: { 'Cache-Control': SHARE_IMAGE_MISS_CACHE_CONTROL },
    });
  }

  const cacheHeaders = {
    'Cache-Control': SHARE_IMAGE_CACHE_CONTROL,
    'Access-Control-Allow-Origin': '*',
  };
  const upstreamType = upstream.headers.get('content-type');
  if (upstream.body && isImageContentType(upstreamType)) {
    return new NextResponse(upstream.body, {
      status: 200,
      headers: {
        ...cacheHeaders,
        'Content-Type': upstreamType as string,
      },
    });
  }

  const buffer = Buffer.from(await upstream.arrayBuffer());
  return new NextResponse(buffer, {
    status: 200,
    headers: {
      ...cacheHeaders,
      'Content-Type': sniffImageMime(buffer),
    },
  });
}
