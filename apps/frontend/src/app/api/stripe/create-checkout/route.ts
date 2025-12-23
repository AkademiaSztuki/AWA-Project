import { NextRequest, NextResponse } from 'next/server';
import { createCheckoutSession, PlanId, BillingPeriod } from '@/lib/stripe';

export async function POST(request: NextRequest) {
  let planId: string | undefined;
  let billingPeriod: string | undefined;
  
  try {
    const body = await request.json();
    const { userHash, planId: bodyPlanId, billingPeriod: bodyBillingPeriod, successUrl, cancelUrl } = body;
    planId = bodyPlanId;
    billingPeriod = bodyBillingPeriod;

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

    if (!checkoutUrl || checkoutUrl === '') {
      console.error('[API] Checkout session created but URL is empty');
      return NextResponse.json(
        { error: 'Stripe checkout session created but no URL returned. Check Stripe logs.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ url: checkoutUrl });
  } catch (error: any) {
    console.error('[API] Error creating checkout session:', error);
    console.error('[API] Error details:', {
      message: error.message,
      stack: error.stack,
      planId,
      billingPeriod,
    });
    
    return NextResponse.json(
      { 
        error: error.message || 'Failed to create checkout session',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

