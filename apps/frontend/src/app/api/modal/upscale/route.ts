// API Route: /api/modal/upscale
// Proxy to Modal API to avoid CORS issues with 303 redirects
// Server-side requests don't have CORS restrictions

import { NextRequest, NextResponse } from 'next/server';

const MODAL_API_URL = process.env.NEXT_PUBLIC_MODAL_API_URL || 'https://akademiasztuki--aura-flux-api-fastapi-app.modal.run';

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
  try {
    const body = await request.json();
    
    // Convert inspiration_images URLs to base64 if needed
    if (body.inspiration_images && Array.isArray(body.inspiration_images)) {
      const convertedImages = await Promise.all(
        body.inspiration_images.map(async (img: string) => {
          // If it's already base64 (starts with data: or is long base64 string), return as is
          if (img.startsWith('data:') || img.length > 1000) {
            return img;
          }
          // If it's a URL, convert to base64
          if (img.startsWith('http://') || img.startsWith('https://')) {
            console.log('Converting inspiration image URL to base64:', img.substring(0, 50));
            return await urlToBase64(img);
          }
          // Assume it's base64 without prefix
          return img;
        })
      );
      body.inspiration_images = convertedImages;
    }
    
    // Forward request to Modal API
    const response = await fetch(`${MODAL_API_URL}/upscale`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      // Server-side fetch can follow redirects without CORS issues
      redirect: 'follow',
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Modal API error (${response.status}):`, errorText);
      return NextResponse.json(
        { error: `Modal API error: ${response.status} ${response.statusText}`, details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Proxy error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Proxy request failed' },
      { status: 500 }
    );
  }
}

