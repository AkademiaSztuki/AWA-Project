import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json({
    success: true,
    message: 'Storage is managed by GCP – Supabase buckets no longer needed.',
    created: false,
  });
}

export async function GET() {
  return NextResponse.json({
    exists: false,
    message: 'Storage is managed by GCP – Supabase buckets no longer needed.',
  });
}
