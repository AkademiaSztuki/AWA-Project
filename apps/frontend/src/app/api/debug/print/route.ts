import { NextRequest, NextResponse } from 'next/server';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 });
  }

  try {
    const body = await req.json();
    console.log('\n===== DEBUG EVENT =====');
    console.log(JSON.stringify(body, null, 2));
    console.log('===== /DEBUG EVENT =====\n');
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('Failed to print debug', e);
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}
