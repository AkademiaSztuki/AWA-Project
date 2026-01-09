// Google AI Client - Server-side only
// This file should only be used in Next.js API routes (server-side)
// Uses Gemini API (generativelanguage.googleapis.com) with API key for text models
// Uses Vertex AI with OAuth 2.0/ADC for image generation models
// See: https://ai.google.dev/api/generate-images
// See: https://cloud.google.com/vertex-ai/generative-ai/docs/image/generate-images

import {
  InspirationAnalysisResponse,
  RoomAnalysisResponse,
  ImageGenerationRequest,
  ImageGenerationResponse,
  ImageUpscaleRequest,
  ImageUpscaleResponse,
} from './types';
import { GoogleAuth } from 'google-auth-library';

const GOOGLE_AI_API_KEY = process.env.GOOGLE_AI_API_KEY;
const GOOGLE_CLOUD_PROJECT = process.env.GOOGLE_CLOUD_PROJECT;
const GOOGLE_CLOUD_LOCATION = process.env.GOOGLE_CLOUD_LOCATION || 'global';
const GOOGLE_APPLICATION_CREDENTIALS_JSON = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
// Vertex AI endpoint for image generation (requires OAuth 2.0)
const VERTEX_AI_API_BASE = 'https://aiplatform.googleapis.com/v1';
// Google AI Studio endpoint for text-only models (works with API key)
const GOOGLE_AI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta';

export class GoogleAIClient {
  private apiKey: string;
  private projectId: string | undefined;
  private location: string;
  private auth: GoogleAuth | undefined;

  constructor() {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'google-ai/client.ts:constructor',message:'Constructor called',data:{hasApiKey:!!GOOGLE_AI_API_KEY,apiKeyLength:GOOGLE_AI_API_KEY?.length||0,hasProjectId:!!GOOGLE_CLOUD_PROJECT,location:GOOGLE_CLOUD_LOCATION},timestamp:Date.now(),sessionId:'debug-session',runId:'google-debug',hypothesisId:'H2'})}).catch(()=>{});
    // #endregion
    if (!GOOGLE_AI_API_KEY) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'google-ai/client.ts:constructor:no-key',message:'API key missing',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'google-debug',hypothesisId:'H2'})}).catch(()=>{});
      // #endregion
      throw new Error('GOOGLE_AI_API_KEY environment variable is not set');
    }
    this.apiKey = GOOGLE_AI_API_KEY;
    this.projectId = GOOGLE_CLOUD_PROJECT;
    this.location = GOOGLE_CLOUD_LOCATION;
    
    // Initialize Google Auth for Vertex AI (OAuth 2.0)
    if (this.projectId) {
      const authOptions: any = {
        scopes: ['https://www.googleapis.com/auth/cloud-platform'],
        projectId: this.projectId,
      };

      // If service account JSON is provided as environment variable (for Vercel/production)
      if (GOOGLE_APPLICATION_CREDENTIALS_JSON) {
        try {
          const credentials = JSON.parse(GOOGLE_APPLICATION_CREDENTIALS_JSON);
          authOptions.credentials = credentials;
          console.log('[GoogleAI] Using service account credentials from GOOGLE_APPLICATION_CREDENTIALS_JSON');
        } catch (error) {
          console.error('[GoogleAI] Failed to parse GOOGLE_APPLICATION_CREDENTIALS_JSON:', error);
          // Fall back to default credentials
        }
      }

      this.auth = new GoogleAuth(authOptions);
    }
  }

  /**
   * Get OAuth 2.0 access token for Vertex AI
   */
  private async getAccessToken(): Promise<string> {
    if (!this.auth) {
      throw new Error('GoogleAuth not initialized. GOOGLE_CLOUD_PROJECT is required for image generation.');
    }
    const client = await this.auth.getClient();
    const accessTokenResponse = await client.getAccessToken();
    if (!accessTokenResponse.token) {
      throw new Error('Failed to obtain access token');
    }
    return accessTokenResponse.token;
  }

  /**
   * Analyze inspiration image using Gemini 2.5 Flash Lite via Vertex AI
   * Uses cheaper, faster model optimized for text analysis (not image generation)
   * Uses OAuth2 authentication (same as Nano Banana image generation)
   */
  async analyzeInspirationWithFlashLite(
    imageBase64: string
  ): Promise<InspirationAnalysisResponse> {
    try {
      if (!this.projectId) {
        throw new Error('GOOGLE_CLOUD_PROJECT environment variable is required for inspiration analysis');
      }

      // Get OAuth 2.0 access token (same as Nano Banana)
      const accessToken = await this.getAccessToken();
      
      // Use Gemini 2.5 Flash Lite - cheaper and faster for text analysis
      // This is different from Nano Banana (gemini-2.5-flash-image) which is for image generation
      const MODEL_ID = 'gemini-2.5-flash-lite';
      const url = `${VERTEX_AI_API_BASE}/projects/${this.projectId}/locations/${this.location}/publishers/google/models/${MODEL_ID}:generateContent`;
      
      console.log(`[GoogleAI] Using ${MODEL_ID} for inspiration analysis (cheaper, faster model)`);

      // Clean base64 - remove data URI prefix if present
      let cleanBase64 = imageBase64;
      if (cleanBase64.includes(',')) {
        cleanBase64 = cleanBase64.split(',')[1];
      }

      // Return tags in JSON format for consistency with prompt building
      const prompt = `Analyze this interior photo and extract key design elements. Return ONLY a valid JSON object.

REQUIREMENTS:
- styles: Array of 1-3 styles from: modern, scandinavian, industrial, bohemian, minimalist, rustic, contemporary, traditional, mid-century, art-deco, eclectic, maximalist, japandi, coastal, farmhouse, mediterranean, hygge, zen, vintage, transitional, japanese, gothic, tropical
- colors: Array of 2-4 hex colors (#RRGGBB format). If unsure, use: ["#FFFFFF", "#F5F5F5", "#36454F", "#8B7355"]
- materials: Array of 2-4 materials from: wood, metal, glass, stone, fabric, leather, concrete, ceramic, velvet, marble, rug
- biophilia: Integer 0-3 (0=no plants, 1=1-2 plants, 2=3-5 plants, 3=lush/6+)
- description: Short description (max 80 words) with specific visual cues

OUTPUT: Return ONLY valid JSON, no markdown, no explanation:
{"styles":["style1","style2"],"colors":["#RRGGBB","#RRGGBB"],"materials":["mat1","mat2"],"biophilia":N,"description":"..."}

EXAMPLE:
{"styles":["modern","scandinavian"],"colors":["#FFFFFF","#F5F5DC","#36454F","#8B7355"],"materials":["wood","fabric","metal"],"biophilia":2,"description":"Modern Scandinavian living room with light wood furniture, white walls, and natural textiles. Minimalist design with clean lines and warm neutral tones."}`;

      // Vertex AI requires 'role' field in contents (same format as Nano Banana)
      const payload = {
        contents: {
          role: 'user',
          parts: [
            {
              inlineData: {
                mimeType: 'image/jpeg',
                data: cleanBase64,
              },
            },
            {
              text: prompt,
            },
          ],
        },
        generationConfig: {
          temperature: 1.0,
          maxOutputTokens: 500,
          responseModalities: ['TEXT'], // Only text output for analysis (not image)
        },
      };

      console.log('[GoogleAI] Analyzing inspiration via Vertex AI (Gemini 2.5 Flash Lite)...');
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Vertex AI API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      
      // Parse response from Gemini
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      
      // #region agent log
      console.log('[GoogleAI] RAW Gemini text response:', text);
      console.log('[GoogleAI] Full API response structure:', JSON.stringify(data).substring(0, 1000));
      // #endregion
      
      // Parse the structured response
      return this.parseInspirationAnalysis(text);
    } catch (error) {
      console.error('[GoogleAI] Error analyzing inspiration:', error);
      throw error;
    }
  }

  /**
   * Analyze room image using Gemini 2.5 Flash Lite via Vertex AI
   * Uses cheaper, faster model optimized for text analysis (not image generation)
   * Returns room type, description, and suggestions
   */
  async analyzeRoomWithFlashLite(
    imageBase64: string
  ): Promise<RoomAnalysisResponse> {
    try {
      if (!this.projectId) {
        throw new Error('GOOGLE_CLOUD_PROJECT environment variable is required for room analysis');
      }

      // Get OAuth 2.0 access token
      const accessToken = await this.getAccessToken();
      
      // Use Gemini 2.5 Flash Lite - cheaper and faster for text analysis
      // This is different from Nano Banana (gemini-2.5-flash-image) which is for image generation
      const MODEL_ID = 'gemini-2.5-flash-lite';
      const url = `${VERTEX_AI_API_BASE}/projects/${this.projectId}/locations/${this.location}/publishers/google/models/${MODEL_ID}:generateContent`;
      
      console.log(`[GoogleAI] Using ${MODEL_ID} for room analysis (cheaper, faster model)`);

      // Clean base64 - remove data URI prefix if present
      let cleanBase64 = imageBase64;
      if (cleanBase64.includes(',')) {
        cleanBase64 = cleanBase64.split(',')[1];
      }

      const prompt = `Analyze this interior photo and identify the room type and characteristics. Return ONLY a valid JSON object.

REQUIREMENTS:
- detected_room_type: One of: kitchen, bedroom, living_room, bathroom, dining_room, office, empty_room
- confidence: Number 0-1 (confidence in room type detection)
- room_description: Detailed description (100-200 words) of the room including: furniture, colors, materials, lighting, style, layout, condition
- suggestions: Array of 3-5 improvement suggestions (short phrases, max 20 words each)
- comment: Friendly, encouraging comment in Polish (2-3 sentences) that SPECIFICALLY describes what you see in THIS exact room. Mention specific details like: furniture pieces, colors, materials, lighting, architectural features (windows, doors), style elements. Make it personal and concrete - show that you're looking at THIS specific interior. Example: "Widzę w Twoim salonie dużą szarą kanapę narożną, białą ścianę z oknem, drewniany stolik kawowy i minimalistyczne dekoracje. Naturalne światło wpadające przez okno tworzy przytulną atmosferę."

OUTPUT: Return ONLY valid JSON, no markdown, no explanation:
{"detected_room_type":"room_type","confidence":0.9,"room_description":"...","suggestions":["suggestion1","suggestion2"],"comment":"..."}

EXAMPLE:
{"detected_room_type":"living_room","confidence":0.95,"room_description":"Modern living room with a large gray sectional sofa, white walls, wooden coffee table, and large windows providing natural light. The space features minimalist decor with a few plants and abstract wall art.","suggestions":["Add more lighting for evening ambiance","Introduce warmer color accents","Consider area rug for texture","Add storage solutions","Enhance biophilic elements"],"comment":"Widzę w Twoim salonie dużą szarą kanapę narożną, białą ścianę z oknem i drewniany stolik kawowy. Naturalne światło wpadające przez okno tworzy przytulną atmosferę - to świetna baza do stworzenia przestrzeni, która odzwierciedli Twoje preferencje!"}`;

      const payload = {
        contents: [
          {
            role: 'user',
            parts: [
              {
                inlineData: {
                  mimeType: 'image/jpeg',
                  data: cleanBase64,
                },
              },
              {
                text: prompt,
              },
            ],
          }
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1000,
          responseModalities: ['TEXT'], // Only text output for analysis (not image)
        },
      };

      console.log('[GoogleAI] Analyzing room via Vertex AI...');
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Vertex AI API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      
      // Parse response from Gemini
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      
      console.log('[GoogleAI] RAW Gemini text response:', text);
      
      // Parse the structured response
      return this.parseRoomAnalysis(text);
    } catch (error) {
      console.error('[GoogleAI] Error analyzing room:', error);
      throw error;
    }
  }

  /**
   * Parse room analysis JSON response from Gemini
   */
  private parseRoomAnalysis(text: string): RoomAnalysisResponse {
    try {
      // Try to extract JSON from markdown code blocks if present
      let jsonText = text.trim();
      const jsonMatch = jsonText.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
      if (jsonMatch) {
        jsonText = jsonMatch[1];
      }
      
      // Try to find JSON object in text
      const jsonObjectMatch = jsonText.match(/\{[\s\S]*\}/);
      if (jsonObjectMatch) {
        jsonText = jsonObjectMatch[0];
      }
      
      const parsed = JSON.parse(jsonText);
      
      // Validate and return with defaults
      return {
        detected_room_type: parsed.detected_room_type || 'empty_room',
        confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.8,
        room_description: parsed.room_description || 'Room analysis completed.',
        suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : [],
        comment: parsed.comment || 'Pomieszczenie zostało przeanalizowane!',
        human_comment: parsed.human_comment,
      };
    } catch (error) {
      console.error('[GoogleAI] Failed to parse room analysis JSON:', error);
      console.error('[GoogleAI] Raw text:', text);
      
      // Fallback response
      return {
        detected_room_type: 'empty_room',
        confidence: 0.5,
        room_description: 'Unable to parse room analysis. Please try again.',
        suggestions: [],
        comment: 'Wystąpił problem podczas analizy. Spróbuj ponownie.',
      };
    }
  }

  /**
   * Generate image using Gemini 2.5 Flash Image via Vertex AI
   * Requires OAuth 2.0/ADC (Application Default Credentials)
   * See: https://cloud.google.com/vertex-ai/generative-ai/docs/image/generate-images
   */
  async generateImageWithNanoBanana(
    request: ImageGenerationRequest
  ): Promise<ImageGenerationResponse> {
    try {
      console.log('[GoogleAI] generateImageWithNanoBanana called with:', {
        hasPrompt: !!request.prompt,
        hasBaseImage: !!request.base_image,
        baseImageLength: request.base_image?.length || 0,
        width: request.width,
        height: request.height,
        hasProjectId: !!this.projectId,
      });

      if (!this.projectId) {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'google-ai/client.ts:generateImageWithNanoBanana:no-project',message:'Missing GOOGLE_CLOUD_PROJECT',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'google-debug',hypothesisId:'H6'})}).catch(()=>{});
        // #endregion
        throw new Error('GOOGLE_CLOUD_PROJECT environment variable is required for image generation');
      }

      // Get OAuth 2.0 access token
      const accessToken = await this.getAccessToken();
      
      // Vertex AI endpoint for image generation
      // Nano Banana Pro (higher quality, supports higher resolutions; we keep current app resolutions)
      const MODEL_ID = 'gemini-3-pro-image-preview';
      const url = `${VERTEX_AI_API_BASE}/projects/${this.projectId}/locations/${this.location}/publishers/google/models/${MODEL_ID}:generateContent`;
      console.log('[GoogleAI] Vertex AI URL:', url);

      const parts: any[] = [];

      // Add base image if provided (for image-to-image)
      // Clean base64 - remove data URI prefix if present
      let baseImageData = request.base_image;
      if (baseImageData && baseImageData.includes(',')) {
        baseImageData = baseImageData.split(',')[1];
        console.log('[GoogleAI] Cleaned base64 image (removed data URI prefix)');
      }

      if (baseImageData) {
        parts.push({
          inlineData: {
            mimeType: 'image/jpeg',
            data: baseImageData,
          },
        });
        console.log('[GoogleAI] Added base image to request');
      }

         // Add inspiration images if provided (for multi-reference style transfer)
         // Google's Gemini 2.5 Flash Image supports multiple reference images
         if (request.inspiration_images && request.inspiration_images.length > 0) {
           console.log(`[GoogleAI] Adding ${request.inspiration_images.length} inspiration images for multi-reference`);
           console.log(`[GoogleAI] Inspiration images details:`, request.inspiration_images.map((img, i) => ({
             index: i,
             hasImage: !!img,
             length: img?.length || 0,
             startsWithData: img?.startsWith('data:')
           })));
           for (let i = 0; i < Math.min(request.inspiration_images.length, 6); i++) {
          let inspImageData = request.inspiration_images[i];
          // Clean base64 - remove data URI prefix if present
          if (inspImageData && inspImageData.includes(',')) {
            inspImageData = inspImageData.split(',')[1];
          }
          if (inspImageData) {
            parts.push({
              inlineData: {
                mimeType: 'image/jpeg',
                data: inspImageData,
              },
            });
            console.log(`[GoogleAI] Added inspiration image ${i + 1} to request`);
          }
        }
      }

      // Add text prompt
      parts.push({
        text: request.prompt,
      });

      // Detect if this is furniture removal mode (empty room generation)
      const isFurnitureRemoval = request.prompt.includes('EMPTY ARCHITECTURAL SHELL') || 
                                  request.prompt.includes('Remove EVERYTHING') ||
                                  request.prompt.includes('empty room') ||
                                  request.prompt.includes('bare room');

      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'google-ai/client.ts:generateImageWithNanoBanana:detection',message:'Furniture removal detection',data:{isFurnitureRemoval,promptSnippet:request.prompt.substring(0,100)},timestamp:Date.now(),sessionId:'debug-session',runId:'removal-debug',hypothesisId:'H1'})}).catch(()=>{});
      // #endregion

      // Vertex AI payload format with response_modalities for image output
      // Add system instruction - different for furniture removal vs normal generation
      const system_instruction = isFurnitureRemoval ? {
        parts: [{
          text: `SYSTEM ROLE: Architectural Image Editor.
CORE TASK: DELETE ALL furniture, decorative elements, and objects from the room.
RESULT: A completely EMPTY bare architectural shell.

DELETE COMPLETELY:
- Furniture: sofas, chairs, tables, beds, wardrobes, cabinets, shelves, all furniture
- Decorative items: rugs, carpets, curtains, drapes, blinds, pillows, cushions, throws
- Lighting: lamps, ceiling lights, chandeliers, wall sconces, all lighting fixtures
- Plants: potted plants, vases, planters, all vegetation
- Art and decor: paintings, pictures, frames, mirrors, sculptures, decorative objects
- Electronics: TVs, speakers, devices, cables
- All other objects, accessories, and clutter

INSTRUCTIONS:
1. ERASE every object, piece of furniture, decoration, plant, lamp, and accessory.
2. PAINT OVER the removed areas with clean, seamless wall and floor textures.
3. Keep ONLY the empty walls, floor, ceiling, windows (without curtains/blinds), and doors.`
        }]
      } : {
        parts: [{
          text: `You are a professional Interior Architect AI creating editorial photography for prestigious architectural magazines like Architectural Digest, Dwell, Elle Decoration, or Wallpaper*.

EDITORIAL PUBLICATION STANDARDS:
This image must meet the quality standards of top-tier architectural publications:
- Editorial photography quality (professional composition, studio lighting)
- Publication-grade material textures and details
- Magazine-worthy curated design aesthetic
- Perfect attention to detail suitable for print publication
- No artifacts, floating objects, or unrealistic elements

CRITICAL CONSTRAINTS:
- Preserve walls, windows, doors 100% IDENTICAL to input. NO structural changes.
- Maintain exact camera perspective and viewpoint.

CORE TASK:
1. Remove all existing furniture, decor, and objects completely
2. Reconstruct floor/wall surfaces seamlessly where items were removed
3. Add NEW furniture and decor matching user's requested style, colors, and materials

DESIGN EXCELLENCE:
- Blend conflicting materials artistically for style cohesion
- Create realistic botanical arrangements for plant counts
- Use professional architectural photography techniques (natural daylight, soft shadows, realistic reflections)
- Ensure photorealistic textures, lighting, and spatial relationships

OUTPUT: Publication-ready interior photography suitable for a prestigious architectural magazine.`
        }]
      };

      // Low temperature for removal to ensure strict adherence to removal instructions
      const temperature = isFurnitureRemoval ? 0.3 : 0.7;

      const payload = {
        system_instruction, // Use snake_case for Vertex AI REST API
        contents: [
          {
            role: 'user',
            parts,
          }
        ],
        generation_config: {
          response_modalities: ['TEXT', 'IMAGE'],
          temperature, // Lower for furniture removal, balanced for normal generation
        },
      };

      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'google-ai/client.ts:generateImageWithNanoBanana:payload',message:'Full payload sent to Vertex AI',data:{systemInstructionText:system_instruction.parts[0].text,prompt:request.prompt.substring(0,500),temperature:payload.generation_config.temperature,hasSystemInstruction:!!payload.system_instruction},timestamp:Date.now(),sessionId:'debug-session',runId:'geometry-debug',hypothesisId:'H2'})}).catch(()=>{});
      // #endregion

      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'google-ai/client.ts:generateImageWithNanoBanana:final-payload-check',message:'VERIFYING PAYLOAD STRUCTURE',data:{fullPayload:JSON.stringify(payload).substring(0,2000)},timestamp:Date.now(),sessionId:'debug-session',runId:'vertex-payload-debug',hypothesisId:'H2'})}).catch(()=>{});
      // #endregion

      console.log('[GoogleAI] Sending request to Vertex AI with OAuth 2.0...');
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'google-ai/client.ts:generateImageWithNanoBanana:before-fetch',message:'About to call Vertex AI',data:{url,hasBaseImage:!!baseImageData,promptLength:request.prompt?.length||0,hasAccessToken:!!accessToken},timestamp:Date.now(),sessionId:'debug-session',runId:'google-debug',hypothesisId:'H8'})}).catch(()=>{});
      // #endregion
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      console.log('[GoogleAI] Response status:', response.status, response.statusText);
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'google-ai/client.ts:generateImageWithNanoBanana:response',message:'Vertex AI response',data:{status:response.status,statusText:response.statusText,ok:response.ok},timestamp:Date.now(),sessionId:'debug-session',runId:'google-debug',hypothesisId:'H8'})}).catch(()=>{});
      // #endregion

      if (!response.ok) {
        const errorText = await response.text();
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'google-ai/client.ts:generateImageWithNanoBanana:response-error',message:'Vertex AI returned error',data:{status:response.status,statusText:response.statusText,errorText:errorText.substring(0,1000)},timestamp:Date.now(),sessionId:'debug-session',runId:'google-debug',hypothesisId:'H8'})}).catch(()=>{});
        // #endregion
        console.error('[GoogleAI] Vertex AI error response:', errorText);
        throw new Error(`Vertex AI API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log('[GoogleAI] Response data structure:', {
        hasCandidates: !!data.candidates,
        candidatesLength: data.candidates?.length || 0,
        hasContent: !!data.candidates?.[0]?.content,
        hasParts: !!data.candidates?.[0]?.content?.parts,
        partsLength: data.candidates?.[0]?.content?.parts?.length || 0,
      });
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'google-ai/client.ts:generateImageWithNanoBanana:response-parsed',message:'Response parsed',data:{hasCandidates:!!data.candidates,partsCount:data.candidates?.[0]?.content?.parts?.length||0},timestamp:Date.now(),sessionId:'debug-session',runId:'google-debug',hypothesisId:'H8'})}).catch(()=>{});
      // #endregion
      
      // Extract image from response - Vertex AI uses inlineData or inline_data
      const imagePart = data.candidates?.[0]?.content?.parts?.find(
        (part: any) => part.inlineData || part.inline_data
      );
      
      console.log('[GoogleAI] Image part found:', !!imagePart);
      
      const imageData = imagePart?.inlineData?.data || imagePart?.inline_data?.data;
      
      if (!imageData) {
        console.error('[GoogleAI] No image data in response. Full response:', JSON.stringify(data, null, 2));
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'google-ai/client.ts:generateImageWithNanoBanana:no-image',message:'No image in response',data:{response:JSON.stringify(data).substring(0,500)},timestamp:Date.now(),sessionId:'debug-session',runId:'google-debug',hypothesisId:'H5'})}).catch(()=>{});
        // #endregion
        throw new Error('No image data in response');
      }

      console.log('[GoogleAI] Successfully extracted image data, length:', imageData.length);
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'google-ai/client.ts:generateImageWithNanoBanana:success',message:'Image generated successfully',data:{imageLength:imageData.length},timestamp:Date.now(),sessionId:'debug-session',runId:'google-debug',hypothesisId:'H8'})}).catch(()=>{});
      // #endregion

      return {
        image: imageData,
        generation_info: {
          model: MODEL_ID,
          prompt: request.prompt,
          width: request.width || 1024,
          height: request.height || 1024,
        },
      };
    } catch (error) {
      console.error('[GoogleAI] Error generating image:', error);
      throw error;
    }
  }

  /**
   * Upscale/improve image using Gemini 2.5 Flash Image (higher quality settings)
   * Used for second generation step after user selects an image
   * Note: Using same model but with enhanced prompt for upscaling
   */
  async upscaleWithNanoBananaPro(
    request: ImageUpscaleRequest
  ): Promise<ImageUpscaleResponse> {
    try {
      if (!this.projectId) {
        throw new Error('GOOGLE_CLOUD_PROJECT environment variable is required for image generation');
      }

      // Clean base64 - remove data URI prefix if present
      let imageData = request.image;
      if (imageData && imageData.includes(',')) {
        imageData = imageData.split(',')[1];
      }

      // Get OAuth 2.0 access token
      const accessToken = await this.getAccessToken();

      // Vertex AI endpoint for image generation
      // Nano Banana Pro (we keep current output sizes; no 2K/4K imageConfig)
      const MODEL_ID = 'gemini-3-pro-image-preview';
      const url = `${VERTEX_AI_API_BASE}/projects/${this.projectId}/locations/${this.location}/publishers/google/models/${MODEL_ID}:generateContent`;

      const payload = {
        contents: {
          role: 'user',
          parts: [
            {
              inlineData: {
                mimeType: 'image/jpeg',
                data: imageData,
              },
            },
            {
              text: `ENHANCE AND REFINE: High-fidelity interior design enhancement.
1. QUALITY: Increase sharpness, refine textures, improve lighting/shadows, and enhance photorealism.
2. PRESERVE: Keep the EXACT composition, camera perspective, walls, windows, doors, and furniture layout from this image.
3. STYLE: Maintain the same aesthetic and color palette.
4. DETAIL: Add crispness to materials like wood, fabric, and metal.
Make it look like professional architectural photography.
Original context: ${request.prompt}`,
            },
          ],
        },
        generation_config: {
          response_modalities: ['TEXT', 'IMAGE'],
          temperature: 0.6,
        },
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Vertex AI API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      
      // Extract image from response - Vertex AI uses inlineData or inline_data
      const imagePart = data.candidates?.[0]?.content?.parts?.find(
        (part: any) => part.inlineData || part.inline_data
      );
      
      const outputImageData = imagePart?.inlineData?.data || imagePart?.inline_data?.data;
      
      if (!outputImageData) {
        throw new Error('No image data in response');
      }

      return {
        image: outputImageData,
        generation_info: {
          model: MODEL_ID,
          prompt: request.prompt,
          target_size: request.target_size || 1536,
        },
      };
    } catch (error) {
      console.error('[GoogleAI] Error upscaling image:', error);
      throw error;
    }
  }

  /**
   * Parse inspiration analysis response from Gemini
   * Matches the format from Gemma 3 Modal endpoint
   */
  private parseInspirationAnalysis(text: string): InspirationAnalysisResponse {
    // #region agent log
    console.log('[GoogleAI] parseInspirationAnalysis input:', text.substring(0, 500));
    // #endregion
    
    // Try JSON parsing first (new format)
    try {
      // Clean up text - remove markdown code blocks if present
      let cleanText = text.trim();
      if (cleanText.startsWith('```json')) {
        cleanText = cleanText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (cleanText.startsWith('```')) {
        cleanText = cleanText.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }
      
      // #region agent log
      console.log('[GoogleAI] Cleaned text for JSON parsing:', cleanText.substring(0, 500));
      // #endregion
      
      const parsed = JSON.parse(cleanText);
      
      // Validate and extract fields
      const styles = Array.isArray(parsed.styles) 
        ? parsed.styles.map((s: string) => String(s).toLowerCase().trim()).filter(Boolean)
        : ['modern'];
      
      const colors = Array.isArray(parsed.colors)
        ? parsed.colors.filter((c: string) => typeof c === 'string' && c.startsWith('#'))
        : ['#FFFFFF', '#F5F5F5', '#36454F', '#8B7355'];
      
      const materials = Array.isArray(parsed.materials)
        ? parsed.materials.map((m: string) => String(m).toLowerCase().trim()).filter(Boolean)
        : ['wood', 'fabric'];
      
      const biophilia = typeof parsed.biophilia === 'number'
        ? Math.max(0, Math.min(3, parsed.biophilia))
        : 0;
      
      const description = typeof parsed.description === 'string'
        ? parsed.description.trim()
        : 'Interior design inspiration';
      
      console.log('[GoogleAI] Parsed JSON tags:', { styles, colors, materials, biophilia });
      
      return { styles, colors, materials, biophilia, description };
    } catch (jsonError) {
      // Fallback to legacy text parsing
      console.warn('[GoogleAI] JSON parsing failed, falling back to text parsing:', jsonError);
      return this.parseInspirationAnalysisLegacy(text);
    }
  }
  
  // Legacy text format parser (fallback)
  private parseInspirationAnalysisLegacy(text: string): InspirationAnalysisResponse {
    const lines = text.split('\n');
    let styles: string[] = [];
    let colors: string[] = [];
    let materials: string[] = [];
    let biophilia = 0;
    let description = '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('STYLE:')) {
        const stylesText = trimmed.replace('STYLE:', '').trim();
        styles = stylesText.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
      } else if (trimmed.startsWith('COLORS:')) {
        const colorsText = trimmed.replace('COLORS:', '').trim();
        colors = colorsText
          .split(',')
          .map((c) => c.trim())
          .filter((c) => c.startsWith('#'));
      } else if (trimmed.startsWith('MATERIALS:')) {
        const materialsText = trimmed.replace('MATERIALS:', '').trim();
        materials = materialsText.split(',').map((m) => m.trim().toLowerCase()).filter(Boolean);
      } else if (trimmed.startsWith('BIOPHILIA:')) {
        const biophiliaText = trimmed.replace('BIOPHILIA:', '').trim();
        const parsed = parseInt(biophiliaText, 10);
        biophilia = isNaN(parsed) ? 0 : Math.max(0, Math.min(3, parsed));
      } else if (trimmed.startsWith('DESCRIPTION:')) {
        description = trimmed.replace('DESCRIPTION:', '').trim();
      }
    }

    // Fallback values if parsing failed
    if (styles.length === 0) styles = ['modern'];
    if (colors.length === 0) colors = ['#FFFFFF', '#F5F5F5', '#36454F', '#8B7355'];
    if (materials.length === 0) materials = ['wood', 'fabric'];
    if (!description) description = 'Interior design inspiration';

    return { styles, colors, materials, biophilia, description };
  }
}
