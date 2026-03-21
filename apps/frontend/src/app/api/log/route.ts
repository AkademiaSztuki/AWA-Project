import { NextRequest, NextResponse } from 'next/server';
import { logBehavioralEvent } from '@/lib/gcp-data';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectId, eventType, eventData } = body;

    if (!projectId || !eventType) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (eventType === 'session_persist_failed') {
      console.error('[api/log] session_persist_failed', { projectId, eventData });
    }

    await logBehavioralEvent(projectId, eventType, eventData);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error logging event:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json(
        { error: 'Missing projectId parameter' },
        { status: 400 }
      );
    }

    // Legacy analytics tables removed after radical refactor
    return NextResponse.json({ logs: [] });
  } catch (error) {
    console.error('Error fetching logs:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
