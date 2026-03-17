import { NextRequest, NextResponse } from 'next/server';
import { GoogleAIClient } from '@/lib/google-ai/client';
import { InspirationAnalysisResponse } from '@/lib/google-ai/types';

// Simple in-memory cache to avoid calling Google AI multiple times
// for the same inspiration image within a single server process
const inspirationCache = new Map<string, InspirationAnalysisResponse>();
const MAX_CACHE_ENTRIES = 50;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { image } = body;

    if (!image) {
      return NextResponse.json(
        { error: 'Image is required' },
        { status: 400 }
      );
    }

    // Use a stable key for the image payload
    const cacheKey = typeof image === 'string' ? image : JSON.stringify(image);
    if (inspirationCache.has(cacheKey)) {
      return NextResponse.json(inspirationCache.get(cacheKey)!);
    }

    const client = new GoogleAIClient();
    const result = await client.analyzeInspirationWithFlashLite(image);

    inspirationCache.set(cacheKey, result);
    if (inspirationCache.size > MAX_CACHE_ENTRIES) {
      const firstKey = inspirationCache.keys().next().value as string | undefined;
      if (firstKey !== undefined) {
        inspirationCache.delete(firstKey);
      }
    }

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
