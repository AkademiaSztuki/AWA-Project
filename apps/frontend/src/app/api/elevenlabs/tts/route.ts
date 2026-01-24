import { NextRequest, NextResponse } from 'next/server';

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const ELEVENLABS_VOICE_ID = process.env.ELEVENLABS_VOICE_ID;
const ELEVENLABS_MODEL_ID = process.env.ELEVENLABS_MODEL_ID || 'eleven_flash_v2_5';
const ELEVENLABS_OUTPUT_FORMAT = process.env.ELEVENLABS_OUTPUT_FORMAT || 'mp3_44100_128';

export async function POST(request: NextRequest) {
  try {
    if (!ELEVENLABS_API_KEY || !ELEVENLABS_VOICE_ID) {
      return NextResponse.json(
        { error: 'Missing ElevenLabs API configuration.' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const text = typeof body?.text === 'string' ? body.text.trim() : '';

    if (!text) {
      return NextResponse.json(
        { error: 'Text is required.' },
        { status: 400 }
      );
    }

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${ELEVENLABS_VOICE_ID}/stream?output_format=${ELEVENLABS_OUTPUT_FORMAT}`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': ELEVENLABS_API_KEY,
          'Content-Type': 'application/json',
          'Accept': 'audio/mpeg'
        },
        body: JSON.stringify({
          text,
          model_id: ELEVENLABS_MODEL_ID
        })
      }
    );

    if (!response.ok || !response.body) {
      const errorText = await response.text().catch(() => '');
      return NextResponse.json(
        { error: 'ElevenLabs API error.', details: errorText },
        { status: response.status || 500 }
      );
    }

    return new Response(response.body, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'no-store'
      }
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to generate speech.' },
      { status: 500 }
    );
  }
}
