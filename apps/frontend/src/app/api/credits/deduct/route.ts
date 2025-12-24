import { NextRequest, NextResponse } from 'next/server';
import { deductCredits } from '@/lib/credits';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userHash, generationId } = body;

    console.log('[API Credits Deduct] Received request:', { userHash, generationId });

    if (!userHash || !generationId) {
      console.error('[API Credits Deduct] Missing required fields:', { userHash: !!userHash, generationId: !!generationId });
      return NextResponse.json(
        { error: 'Missing required fields: userHash, generationId' },
        { status: 400 }
      );
    }

    // Sprawdź czy SUPABASE_SERVICE_ROLE_KEY jest ustawione
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('[API Credits Deduct] SUPABASE_SERVICE_ROLE_KEY is not set!');
      return NextResponse.json(
        { error: 'Server configuration error: SUPABASE_SERVICE_ROLE_KEY is missing' },
        { status: 500 }
      );
    }

    const success = await deductCredits(userHash, generationId);

    if (!success) {
      console.error('[API Credits Deduct] deductCredits returned false');
      return NextResponse.json(
        { error: 'Failed to deduct credits' },
        { status: 500 }
      );
    }

    console.log('[API Credits Deduct] Successfully deducted credits');
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[API Credits Deduct] Exception caught:', error);
    console.error('[API Credits Deduct] Error stack:', error?.stack);
    return NextResponse.json(
      { error: error.message || 'Failed to deduct credits', details: error?.toString() },
      { status: 500 }
    );
  }
}

