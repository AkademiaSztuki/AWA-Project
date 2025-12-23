import { NextRequest, NextResponse } from 'next/server';
import { createCheckoutSession, PlanId, BillingPeriod } from '@/lib/stripe';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userHash, planId, billingPeriod, successUrl, cancelUrl } = body;

    if (!userHash || !planId || !billingPeriod) {
      return NextResponse.json(
        { error: 'Missing required fields: userHash, planId, billingPeriod' },
        { status: 400 }
      );
    }

    if (!['basic', 'pro', 'studio'].includes(planId)) {
      return NextResponse.json(
        { error: 'Invalid planId. Must be: basic, pro, or studio' },
        { status: 400 }
      );
    }

    if (!['monthly', 'yearly'].includes(billingPeriod)) {
      return NextResponse.json(
        { error: 'Invalid billingPeriod. Must be: monthly or yearly' },
        { status: 400 }
      );
    }

    const checkoutUrl = await createCheckoutSession({
      userHash,
      planId: planId as PlanId,
      billingPeriod: billingPeriod as BillingPeriod,
      successUrl: successUrl || `${request.nextUrl.origin}/subscription/success`,
      cancelUrl: cancelUrl || `${request.nextUrl.origin}/subscription/cancel`,
    });

    return NextResponse.json({ url: checkoutUrl });
  } catch (error: any) {
    console.error('Error creating checkout session:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}

