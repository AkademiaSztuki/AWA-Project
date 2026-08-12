import { NextRequest, NextResponse } from 'next/server';
import { gcpApi } from '@/lib/gcp-api-client';
import { checkRateLimit, getClientIP } from '@/lib/rate-limit';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      userHash?: string;
      pathType?: 'fast' | 'full';
      base64Image?: string;
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
      styleLabel: body.styleLabel,
      roomType: body.roomType,
      personalityLabels: body.personalityLabels,
    });

    if (!result.ok || !result.data) {
      return NextResponse.json(
        { error: result.error || 'create_failed' },
        { status: result.status || 502 },
      );
    }
    return NextResponse.json(result.data);
  } catch (error) {
    console.error('[API share create]', error);
    return NextResponse.json({ error: 'create_failed' }, { status: 500 });
  }
}
