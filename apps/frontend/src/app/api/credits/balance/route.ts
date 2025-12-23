import { NextRequest, NextResponse } from 'next/server';
import { getCreditBalance } from '@/lib/credits';

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

    const balance = await getCreditBalance(userHash);

    return NextResponse.json(balance);
  } catch (error: any) {
    console.error('Error getting credit balance:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get credit balance' },
      { status: 500 }
    );
  }
}

