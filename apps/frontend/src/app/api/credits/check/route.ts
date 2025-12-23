import { NextRequest, NextResponse } from 'next/server';
import { checkCreditsAvailable } from '@/lib/credits';

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

    const available = await checkCreditsAvailable(userHash, amount || 10);

    return NextResponse.json({ available });
  } catch (error: any) {
    console.error('Error checking credits:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to check credits' },
      { status: 500 }
    );
  }
}

