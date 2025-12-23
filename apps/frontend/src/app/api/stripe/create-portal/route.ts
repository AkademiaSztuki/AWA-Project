import { NextRequest, NextResponse } from 'next/server';
import { createPortalSession } from '@/lib/stripe';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { customerId, returnUrl } = body;

    if (!customerId) {
      return NextResponse.json(
        { error: 'Missing required field: customerId' },
        { status: 400 }
      );
    }

    const portalUrl = await createPortalSession({
      customerId,
      returnUrl: returnUrl || `${request.nextUrl.origin}/dashboard`,
    });

    return NextResponse.json({ url: portalUrl });
  } catch (error: any) {
    console.error('Error creating portal session:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create portal session' },
      { status: 500 }
    );
  }
}

