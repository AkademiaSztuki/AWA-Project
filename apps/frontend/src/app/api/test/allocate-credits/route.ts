import { NextRequest, NextResponse } from 'next/server';
import { allocateSubscriptionCredits } from '@/lib/credits';
import { gcpApi } from '@/lib/gcp-api-client';

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

    const subscriptionId = `test_sub_${Date.now()}`;
    const isGcpPrimaryEnabled =
      gcpApi.isConfigured() && (process.env.NEXT_PUBLIC_GCP_PERSISTENCE_MODE ?? 'off') === 'primary';

    // Przydziel kredyty
    const success = isGcpPrimaryEnabled
      ? (await gcpApi.billing.checkoutCompleted({
          eventId: `test_evt_${Date.now()}`,
          userHash,
          subscriptionId,
          customerId: `test_customer_${Date.now()}`,
          planId,
          billingPeriod,
          credits,
          status: 'active',
          currentPeriodStart: new Date().toISOString(),
          currentPeriodEnd: expiresAt.toISOString(),
          cancelAtPeriodEnd: false,
        })).ok
      : await allocateSubscriptionCredits(
          userHash,
          planId as 'basic' | 'pro' | 'studio',
          billingPeriod as 'monthly' | 'yearly',
          credits,
          expiresAt,
          subscriptionId
        );

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to allocate credits' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Przydzielono ${credits} kredytów (${credits / 10} obrazów)`,
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

