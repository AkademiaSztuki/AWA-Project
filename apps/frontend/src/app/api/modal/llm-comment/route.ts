import { NextRequest, NextResponse } from 'next/server';

const MODAL_API_URL = process.env.NEXT_PUBLIC_MODAL_API_URL || 'https://akademiasztuki--aura-flux-api-renamed-fastapi-app.modal.run';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    console.log('[LLM Comment Proxy] Forwarding request to Modal API:', { 
      room_type: body.room_type,
      has_description: !!body.room_description,
      context: body.context 
    });

    const response = await fetch(`${MODAL_API_URL}/llm-comment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[LLM Comment Proxy] Modal API error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText
      });
      return NextResponse.json(
        { error: `Modal API error: ${response.statusText}`, details: errorText },
        { status: response.status }
      );
    }

    const result = await response.json();
    console.log('[LLM Comment Proxy] Successfully forwarded request');
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('[LLM Comment Proxy] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to forward request to Modal API' },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

