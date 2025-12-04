// API Route: /api/modal/generate
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
    console.log('[API] /api/modal/generate - Received request');
    const body = await request.json();
    console.log('[API] Request body keys:', Object.keys(body));
    console.log('[API] Has base_image:', !!body.base_image, 'Length:', body.base_image?.length || 0);
    console.log('[API] Prompt preview:', body.prompt?.substring(0, 100) || 'N/A');
    
    // CRITICAL DEBUG: Check if image_size is in body
    const hasImageSize = 'image_size' in body;
    const debugImageSizeValue = body.image_size;
    const imageSizeType = typeof body.image_size;
    console.log('[API] 🔍 CRITICAL DEBUG image_size:', {
      inBody: hasImageSize,
      value: debugImageSizeValue,
      type: imageSizeType,
      isUndefined: body.image_size === undefined,
      isNull: body.image_size === null,
      rawValue: body.image_size,
      allBodyKeys: Object.keys(body),
      bodyStringified: JSON.stringify(body).substring(0, 500)
    });
    
    console.log('[API] RAW body values:', {
      image_size: body.image_size,
      steps: body.steps,
      guidance: body.guidance,
      width: body.width,
      height: body.height,
      num_inference_steps: body.num_inference_steps,
      guidance_scale: body.guidance_scale
    });
    
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
    // CRITICAL: Ensure image_size, steps, and guidance are explicitly set from body
    // Backend expects: image_size (or width/height), steps (or num_inference_steps), guidance (or guidance_scale)
    const requestBody: any = {
      prompt: body.prompt,
      base_image: body.base_image,
      style: body.style,
      modifications: body.modifications || [],
      strength: body.strength,
      num_images: body.num_images || 1,
      // Explicitly set only what we need - DO NOT copy width/height
    };
    
    // Add inspiration_images if present
    if (body.inspiration_images) {
      requestBody.inspiration_images = body.inspiration_images;
    }
    
    // Explicitly set image_size - prioritize image_size from body, then default to 512 for preview
    // CRITICAL: Always set image_size - default to 512 for preview mode (faster generation)
    let finalImageSize = 512; // Default to 512 for preview
    if ('image_size' in body && body.image_size !== null && body.image_size !== undefined) {
      // Ensure it's a number
      const parsedSize = typeof body.image_size === 'number' ? body.image_size : parseInt(String(body.image_size), 10);
      if (!isNaN(parsedSize) && parsedSize > 0) {
        finalImageSize = parsedSize;
        console.log('[API] ✓ Setting image_size from body:', finalImageSize);
      } else {
        console.warn('[API] ⚠ image_size is not a valid number, using default 512');
      }
    } else {
      console.log('[API] ⚠ image_size NOT in body or is null/undefined. Using default 512. Body keys:', Object.keys(body));
    }
    // ALWAYS set image_size - never leave it undefined
    requestBody.image_size = finalImageSize;
    console.log('[API] 🔍 Final image_size in requestBody:', requestBody.image_size);
    
    // Explicitly set steps - prioritize steps, then num_inference_steps, then default
    if (body.steps !== undefined && body.steps !== null) {
      requestBody.steps = body.steps;
      requestBody.num_inference_steps = body.steps; // Also set for backend compatibility
    } else if (body.num_inference_steps !== undefined && body.num_inference_steps !== null) {
      requestBody.steps = body.num_inference_steps;
      requestBody.num_inference_steps = body.num_inference_steps;
    } else {
      requestBody.steps = 35;
      requestBody.num_inference_steps = 35;
    }
    
    // Explicitly set guidance - prioritize guidance, then guidance_scale, then default
    if (body.guidance !== undefined && body.guidance !== null) {
      requestBody.guidance = body.guidance;
      requestBody.guidance_scale = body.guidance; // Also set for backend compatibility
    } else if (body.guidance_scale !== undefined && body.guidance_scale !== null) {
      requestBody.guidance = body.guidance_scale;
      requestBody.guidance_scale = body.guidance_scale;
    } else {
      requestBody.guidance = 4.0;
      requestBody.guidance_scale = 4.0;
    }
    
    console.log('[API] Forwarding to Modal API:', `${MODAL_API_URL}/generate`);
    console.log('[API] Request body (final):', JSON.stringify({
      image_size: requestBody.image_size,
      steps: requestBody.steps,
      guidance: requestBody.guidance,
      num_inference_steps: requestBody.num_inference_steps,
      guidance_scale: requestBody.guidance_scale,
      has_base_image: !!requestBody.base_image,
      has_width: 'width' in requestBody,
      has_height: 'height' in requestBody,
      width: requestBody.width,
      height: requestBody.height,
    }, null, 2));
    
    // CRITICAL: Verify image_size is in requestBody before sending and is a valid number
    const finalRequestBody = { ...requestBody };
    if (!('image_size' in finalRequestBody) || finalRequestBody.image_size === undefined || finalRequestBody.image_size === null) {
      console.error('[API] ❌ ERROR: image_size is missing in final requestBody! Setting to 512 as fallback.');
      finalRequestBody.image_size = 512;
    } else {
      // Ensure it's a number, not a string
      const imageSizeNum = typeof finalRequestBody.image_size === 'number' 
        ? finalRequestBody.image_size 
        : parseInt(finalRequestBody.image_size, 10);
      if (isNaN(imageSizeNum)) {
        console.error('[API] ❌ ERROR: image_size is not a valid number! Setting to 512 as fallback.');
        finalRequestBody.image_size = 512;
      } else {
        finalRequestBody.image_size = imageSizeNum;
      }
    }
    console.log('[API] 🔍 Final requestBody.image_size before sending:', finalRequestBody.image_size, '(type:', typeof finalRequestBody.image_size, ')');
    console.log('[API] 🔍 Final requestBody keys:', Object.keys(finalRequestBody));
    
    // CRITICAL: Verify image_size is in JSON string before sending
    let jsonBody = JSON.stringify(finalRequestBody);
    const parsedBack = JSON.parse(jsonBody);
    if (!('image_size' in parsedBack) || parsedBack.image_size === undefined || parsedBack.image_size === null) {
      console.error('[API] ❌ CRITICAL ERROR: image_size is missing after JSON serialization!');
      console.error('[API] ❌ JSON body preview:', jsonBody.substring(0, 500));
      // Force add it
      parsedBack.image_size = 512;
      jsonBody = JSON.stringify(parsedBack);
      console.log('[API] ✅ Corrected JSON body (added image_size=512)');
    } else {
      console.log('[API] ✅ Verified: image_size is in JSON:', parsedBack.image_size, '(type:', typeof parsedBack.image_size, ')');
    }
    
    // Final verification - parse again to ensure image_size is there
    const finalCheck = JSON.parse(jsonBody);
    if (!finalCheck.image_size || finalCheck.image_size !== 512) {
      console.warn('[API] ⚠ Final check: image_size is', finalCheck.image_size, '- expected 512 for preview');
    }
    
    const response = await fetch(`${MODAL_API_URL}/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: jsonBody,
      // Server-side fetch can follow redirects without CORS issues
      redirect: 'follow',
    });
    
    console.log('[API] Modal API response status:', response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Modal API error (${response.status}):`, errorText);
      return NextResponse.json(
        { error: `Modal API error: ${response.status} ${response.statusText}`, details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('[API] Modal API response received, images count:', data.images?.length || 0);
    return NextResponse.json(data);
  } catch (error) {
    console.error('Proxy error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Proxy request failed' },
      { status: 500 }
    );
  }
}

