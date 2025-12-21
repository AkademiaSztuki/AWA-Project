// API Route: /api/modal/generate-previews
// Proxy to Modal API to avoid CORS issues with 303 redirects
// Server-side requests don't have CORS restrictions

import { NextRequest, NextResponse } from 'next/server';

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
    { error: 'Modal API (previews) is deprecated. Please use Google Nano Banana API instead.' },
    { status: 410 } // Gone
  );
  
  // Original implementation below (commented out as requested)
  /*
  try {
    const body = await request.json();
    
    // Log base_image for debugging
    console.log('[generate-previews] base_image present:', !!body.base_image);
    console.log('[generate-previews] base_image length:', body.base_image?.length || 0);
    console.log('[generate-previews] base_image starts with:', body.base_image?.substring(0, 50) || 'N/A');
    
    // Ensure base_image is present
    if (!body.base_image) {
      console.error('[generate-previews] ERROR: base_image is missing!');
      return NextResponse.json(
        { error: 'base_image is required for FLUX 2 image-to-image generation' },
        { status: 400 }
      );
    }
    
    // Convert base_image URL to base64 if needed (similar to inspiration_images)
    if (body.base_image && !body.base_image.startsWith('data:') && body.base_image.length < 1000) {
      if (body.base_image.startsWith('http://') || body.base_image.startsWith('https://')) {
        console.log('[generate-previews] Converting base_image URL to base64:', body.base_image.substring(0, 50));
        body.base_image = await urlToBase64(body.base_image);
      } else if (!body.base_image.includes(',')) {
        // If it's base64 without prefix, add data URI prefix
        console.log('[generate-previews] Adding data URI prefix to base64 image');
        body.base_image = `data:image/jpeg;base64,${body.base_image}`;
      }
    }
    
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
    const response = await fetch(`${MODAL_API_URL}/generate-previews`, {
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

