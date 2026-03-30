import { NextRequest, NextResponse } from 'next/server';
import { logBehavioralEvent } from '@/lib/gcp-data';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectId, userHash, eventType, eventData } = body as {
      projectId?: string;
      userHash?: string;
      eventType?: string;
      eventData?: Record<string, unknown>;
    };

    const hash = userHash ?? projectId;
    if (!hash || !eventType) {
      return NextResponse.json(
        { error: 'Missing required fields (userHash or projectId, and eventType)' },
        { status: 400 }
      );
    }

    if (eventType === 'session_persist_failed') {
      console.error('[api/log] session_persist_failed', { userHash: hash, eventData });
    }

    await logBehavioralEvent(hash, eventType, eventData ?? {});

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
