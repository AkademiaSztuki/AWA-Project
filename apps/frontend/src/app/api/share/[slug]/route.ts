import { NextRequest, NextResponse } from 'next/server';
import { gcpApi } from '@/lib/gcp-api-client';

export async function GET(
  _request: NextRequest,
  { params }: { params: { slug: string } },
) {
  const slug = params.slug?.trim();
  if (!slug) {
    return NextResponse.json({ error: 'slug is required' }, { status: 400 });
  }

  const result = await gcpApi.share.getCard(slug);
  if (!result.ok || !result.data) {
    return NextResponse.json(
      { error: result.error || 'not_found' },
      { status: result.status || 404 },
    );
  }
  return NextResponse.json(result.data);
}
