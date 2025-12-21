import { NextRequest, NextResponse } from 'next/server';
import { GoogleAIClient } from '@/lib/google-ai/client';
import { InspirationAnalysisResponse } from '@/lib/google-ai/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { image } = body;

    // #region agent log
    console.log('[analyze-inspiration] Received request, image length:', image?.length || 0);
    // #endregion

    if (!image) {
      return NextResponse.json(
        { error: 'Image is required' },
        { status: 400 }
      );
    }

    // Create client and analyze inspiration
    const client = new GoogleAIClient();
    const result = await client.analyzeInspirationWithFlashLite(image);

    // #region agent log
    console.log('[analyze-inspiration] Result from Gemini:', JSON.stringify(result));
    // #endregion

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('[Google API] Error in analyze-inspiration:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to analyze inspiration' },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return NextResponse.json({ message: 'OK' });
}
