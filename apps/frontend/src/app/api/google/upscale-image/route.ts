import { NextRequest, NextResponse } from 'next/server';
import { GoogleAIClient } from '@/lib/google-ai/client';
import { ImageUpscaleRequest, ImageUpscaleResponse } from '@/lib/google-ai/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { image, prompt, target_size } = body;

    if (!image) {
      return NextResponse.json(
        { error: 'Image is required' },
        { status: 400 }
      );
    }

    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      );
    }

    // Create client and upscale image
    const client = new GoogleAIClient();
    const upscaleRequest: ImageUpscaleRequest = {
      image,
      prompt,
      target_size: target_size || 1536,
    };

    const result = await client.upscaleWithNanoBananaPro(upscaleRequest);

    // Return in format compatible with Modal API response
    return NextResponse.json({
      image: result.image,
      generation_info: result.generation_info,
    });
  } catch (error: any) {
    console.error('[Google API] Error in upscale-image:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to upscale image' },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return NextResponse.json({ message: 'OK' });
}
