// API Route: /api/setup/create-bucket
// Creates the aura-assets storage bucket if it doesn't exist

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: 'Missing Supabase credentials. Set SUPABASE_SERVICE_ROLE_KEY in environment.' },
        { status: 500 }
      );
    }
    
    // Use service role key for admin operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
    
    // Check if bucket exists
    const { data: buckets, error: listError } = await supabaseAdmin.storage.listBuckets();
    
    if (listError) {
      console.error('Error listing buckets:', listError);
      return NextResponse.json({ error: listError.message }, { status: 500 });
    }
    
    const bucketExists = buckets?.some(b => b.id === 'aura-assets');
    
    if (bucketExists) {
      return NextResponse.json({ 
        success: true, 
        message: 'Bucket aura-assets already exists',
        created: false 
      });
    }
    
    // Create the bucket
    const { data, error: createError } = await supabaseAdmin.storage.createBucket('aura-assets', {
      public: true,
      fileSizeLimit: 52428800, // 50MB
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/heic', 'image/heif']
    });
    
    if (createError) {
      console.error('Error creating bucket:', createError);
      return NextResponse.json({ error: createError.message }, { status: 500 });
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'Bucket aura-assets created successfully',
      created: true,
      data 
    });
    
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  // Check if bucket exists (read-only check)
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json({ exists: false, error: 'Missing credentials' });
    }
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    
    // Try to list files in the bucket - if it fails, bucket doesn't exist
    const { error } = await supabase.storage.from('aura-assets').list('', { limit: 1 });
    
    if (error) {
      return NextResponse.json({ exists: false, error: error.message });
    }
    
    return NextResponse.json({ exists: true });
    
  } catch (error) {
    return NextResponse.json({ 
      exists: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
}

