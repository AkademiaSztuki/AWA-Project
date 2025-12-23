// API Route: /api/modal/generate
// Proxy to Modal API to avoid CORS issues with 303 redirects
// Server-side requests don't have CORS restrictions

import { NextRequest, NextResponse } from 'next/server';

// Increase timeout for image generation (up to 5 minutes)
// Vercel Hobby: max 60s, Vercel Pro: max 300s
export const maxDuration = 300; // 5 minutes
export const runtime = 'nodejs'; // Use Node.js runtime for longer timeouts

const MODAL_API_URL = process.env.NEXT_PUBLIC_MODAL_API_URL || 'https://akademiasztuki--aura-flux-api-renamed-fastapi-app.modal.run';

// Helper to convert image URL to base64
async function urlToBase64(url: string): Promise<string> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.statusText}`);
    }
    const buffer = await response.arrayBuffer();
    const base64 = Buffer.from(buffer).toString('base64');
    // Detect content type from response or URL
    const contentType = response.headers.get('content-type') || 'image/jpeg';
    return `data:${contentType};base64,${base64}`;
  } catch (error) {
    console.error('Error converting URL to base64:', error);
    throw error;
  }
}

export async function POST(request: NextRequest) {
  return NextResponse.json(
    { error: 'Modal API is deprecated. Please use Google Nano Banana API instead.' },
    { status: 410 } // Gone
  );
}

