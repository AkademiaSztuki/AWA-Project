import { NextRequest, NextResponse } from 'next/server';
import { expireCredits } from '@/lib/credits';

// This endpoint should be called by a cron job (e.g., Vercel Cron or Supabase Edge Function)
export async function POST(request: NextRequest) {
  try {
    // Verify cron secret if needed
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const expiredCount = await expireCredits();

    return NextResponse.json({
      success: true,
      expiredCount,
      message: `Expired credits for ${expiredCount} users`,
    });
  } catch (error: any) {
    console.error('Error expiring credits:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to expire credits' },
      { status: 500 }
    );
  }
}

