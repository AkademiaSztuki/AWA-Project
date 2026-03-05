import { NextRequest, NextResponse } from 'next/server';
import { getCreditBalance, CreditBalance } from '@/lib/credits';
import { isGcpConfigured, gcpServerApi } from '@/lib/gcp-api-server';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userHash = searchParams.get('userHash');

    if (!userHash) {
      return NextResponse.json(
        { error: 'Missing required parameter: userHash' },
        { status: 400 }
      );
    }

    let balance: CreditBalance;
    if (isGcpConfigured()) {
      const r = await gcpServerApi.credits.balance(userHash);
      balance = r.ok && r.data
        ? r.data
        : { balance: 0, generationsAvailable: 0, hasActiveSubscription: false, subscriptionCreditsRemaining: 0 };
    } else {
      balance = await getCreditBalance(userHash);
    }

    return NextResponse.json(balance);
  } catch (error: any) {
    console.error('Error getting credit balance:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get credit balance' },
      { status: 500 }
    );
  }
}

