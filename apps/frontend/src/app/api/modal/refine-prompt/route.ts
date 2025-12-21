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
  
  // Original implementation below (commented out as requested)
  /*
  try {
    const body = await request.json();
    const { prompt, targetTokens = 65, instructions = [] } = body;

    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      );
    }

    // Call Modal API for LLM refinement
    const response = await fetch(`${MODAL_API_URL}/refine-prompt`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt,
        target_tokens: targetTokens,
        instructions
      }),
    });

    if (!response.ok) {
      throw new Error(`Modal API error: ${response.statusText}`);
    }

    const data = await response.json();

    return NextResponse.json({
      refinedPrompt: data.refined_prompt || prompt,
      originalTokens: data.original_tokens,
      refinedTokens: data.refined_tokens,
      improvement: data.improvement
    });
  } catch (error) {
    console.error('Prompt refinement error:', error);
    
    // Fallback: return original prompt
    const body = await request.json();
    return NextResponse.json({
      refinedPrompt: body.prompt,
      error: error instanceof Error ? error.message : 'Refinement failed',
      fallback: true
    });
  }
}

