import { NextRequest, NextResponse } from 'next/server';
import { checkCreditsAvailable } from '@/lib/credits';
import { isGcpConfigured, gcpServerApi } from '@/lib/gcp-api-server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userHash, amount } = body;

    if (!userHash) {
      return NextResponse.json(
        { error: 'Missing required field: userHash' },
        { status: 400 }
      );
    }

    let available: boolean;
    if (isGcpConfigured()) {
      const r = await gcpServerApi.credits.check(userHash, amount);
      available = r.ok ? (r.data?.available ?? true) : true;
    } else {
      available = await checkCreditsAvailable(userHash, amount || 10);
    }

    return NextResponse.json({ available });
  } catch (error: any) {
    console.error('Error checking credits:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to check credits' },
      { status: 500 }
    );
  }
}

