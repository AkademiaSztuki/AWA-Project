import { NextRequest, NextResponse } from 'next/server';
import { grantFreeCredits } from '@/lib/credits';

export async function POST(request: NextRequest) {
  try {
    const { userHash } = await request.json();

    if (!userHash) {
      return NextResponse.json(
        { error: 'Missing userHash' },
        { status: 400 }
      );
    }

    const success = await grantFreeCredits(userHash);

    if (success) {
      return NextResponse.json({ success: true, message: 'Free credits granted' });
    } else {
      return NextResponse.json({ success: false, message: 'Free credits already granted or failed to grant' });
    }
  } catch (error: any) {
    console.error('[API Credits Grant] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to grant free credits' },
      { status: 500 }
    );
  }
}
