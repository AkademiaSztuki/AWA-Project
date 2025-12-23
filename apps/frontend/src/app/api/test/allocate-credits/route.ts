import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { allocateSubscriptionCredits } from '@/lib/credits';

/**
 * TEST ONLY - Ręczne przydzielenie kredytów dla testów
 * Użyj tylko w development!
 * 
 * POST /api/test/allocate-credits
 * Body: { userHash, planId, billingPeriod }
 */
export async function POST(request: NextRequest) {
  // Tylko w development
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'This endpoint is only available in development' },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const { userHash, planId, billingPeriod } = body;

    if (!userHash || !planId || !billingPeriod) {
      return NextResponse.json(
        { error: 'Missing required fields: userHash, planId, billingPeriod' },
        { status: 400 }
      );
    }

    // Pobierz konfigurację planu
    const { getPlanCredits } = await import('@/lib/stripe');
    const credits = getPlanCredits(planId as any, billingPeriod as any);

    // Oblicz datę wygaśnięcia (1 miesiąc lub 1 rok od teraz)
    const expiresAt = new Date();
    if (billingPeriod === 'monthly') {
      expiresAt.setMonth(expiresAt.getMonth() + 1);
    } else {
      expiresAt.setFullYear(expiresAt.getFullYear() + 1);
    }

    // Przydziel kredyty
    const success = await allocateSubscriptionCredits(
      userHash,
      planId as 'basic' | 'pro' | 'studio',
      billingPeriod as 'monthly' | 'yearly',
      credits,
      expiresAt,
      `test_sub_${Date.now()}` // Test subscription ID
    );

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to allocate credits' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Przydzielono ${credits} kredytów (${credits / 10} generacji)`,
      credits,
      expiresAt: expiresAt.toISOString(),
    });
  } catch (error: any) {
    console.error('Error allocating test credits:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to allocate credits' },
      { status: 500 }
    );
  }
}

