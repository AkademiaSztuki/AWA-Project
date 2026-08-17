import { NextRequest, NextResponse } from 'next/server';
import { gcpApi } from '@/lib/gcp-api-client';
import { checkRateLimit, getClientIP } from '@/lib/rate-limit';
import { looksLikeImageBase64 } from '@/lib/share/source-image';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      userHash?: string;
      pathType?: 'fast' | 'full';
      base64Image?: string;
      base64BeforeImage?: string | null;
      styleLabel?: string | null;
      roomType?: string | null;
      personalityLabels?: string[] | null;
    };

    if (!body.userHash || !body.pathType || !body.base64Image) {
      return NextResponse.json(
        { error: 'userHash, pathType and base64Image are required' },
        { status: 400 },
      );
    }
    // JPEG base64 always starts with `/9j/` — that is image bytes, not a site path.
    if (!looksLikeImageBase64(body.base64BeforeImage)) {
      return NextResponse.json({ error: 'before_image_required' }, { status: 400 });
    }
    if (body.pathType !== 'fast' && body.pathType !== 'full') {
      return NextResponse.json({ error: 'invalid_path_type' }, { status: 400 });
    }

    const rateLimit = await checkRateLimit(body.userHash || getClientIP(request), 8, 60 * 1000);
    if (!rateLimit.success) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const result = await gcpApi.share.createCard({
      userHash: body.userHash,
      pathType: body.pathType,
      base64Image: body.base64Image,
      base64BeforeImage: body.base64BeforeImage,
      styleLabel: body.styleLabel,
      roomType: body.roomType,
      personalityLabels: body.personalityLabels,
    });

    if (!result.ok || !result.data) {
      const status = result.status === 404 ? 404 : result.status || 502;
      return NextResponse.json(
        { error: result.error || 'create_failed' },
        { status },
      );
    }
    return NextResponse.json(result.data);
  } catch (error) {
    console.error('[API share create]', error);
    return NextResponse.json({ error: 'create_failed' }, { status: 500 });
  }
}
