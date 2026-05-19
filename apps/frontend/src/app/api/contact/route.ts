import { NextRequest, NextResponse } from 'next/server';
import { sendContactEmail } from '@/lib/contact-email';

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      name?: string;
      email?: string;
      subject?: string;
      message?: string;
      website?: string;
    };

    const result = await sendContactEmail(body);

    if (!result.ok) {
      const status = result.error.startsWith('invalid_') ? 400 : result.error === 'email_not_configured' ? 503 : 500;
      return NextResponse.json({ error: result.error }, { status });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[api/contact]', error);
    return NextResponse.json({ error: 'send_failed' }, { status: 500 });
  }
}
