// API Route: /api/modal/refine-prompt
// Uses MiniCPM (via Modal) to refine prompts for FLUX
// Only polishes syntax, doesn't change content

import { NextRequest, NextResponse } from 'next/server';

const MODAL_API_URL = process.env.NEXT_PUBLIC_MODAL_API_URL || 'https://your-modal-endpoint.modal.run';

export async function POST(request: NextRequest) {
  return NextResponse.json(
    { error: 'Modal API (refine-prompt) is deprecated. Please use Google Nano Banana API instead.' },
    { status: 410 } // Gone
  );
}
