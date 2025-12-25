import { NextRequest, NextResponse } from 'next/server';
import { GoogleAIClient } from '@/lib/google-ai/client';
import { RoomAnalysisResponse } from '@/lib/google-ai/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { image } = body;

    console.log('[analyze-room] Received request, image length:', image?.length || 0);

    if (!image) {
      return NextResponse.json(
        { error: 'Image is required' },
        { status: 400 }
      );
    }

    // Create client and analyze room
    const client = new GoogleAIClient();
    const result = await client.analyzeRoomWithFlashLite(image);

    console.log('[analyze-room] Result from Gemini:', JSON.stringify(result));

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('[Google API] Error in analyze-room:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to analyze room' },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return NextResponse.json({ message: 'OK' });
}



