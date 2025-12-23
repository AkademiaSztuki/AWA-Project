import { NextRequest, NextResponse } from 'next/server';
import { deductCredits } from '@/lib/credits';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userHash, generationId } = body;

    if (!userHash || !generationId) {
      return NextResponse.json(
        { error: 'Missing required fields: userHash, generationId' },
        { status: 400 }
      );
    }

    const success = await deductCredits(userHash, generationId);

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to deduct credits' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deducting credits:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to deduct credits' },
      { status: 500 }
    );
  }
}

