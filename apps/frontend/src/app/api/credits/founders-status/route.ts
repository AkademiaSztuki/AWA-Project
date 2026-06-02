import { NextResponse } from 'next/server';
import { getFoundersProgramStatus } from '@/lib/credits';

export async function GET() {
  try {
    const status = await getFoundersProgramStatus();
    return NextResponse.json(status);
  } catch (error: unknown) {
    console.error('[API Credits Founders Status] Error:', error);
    return NextResponse.json(
      { error: 'Failed to load founders program status' },
      { status: 500 },
    );
  }
}
