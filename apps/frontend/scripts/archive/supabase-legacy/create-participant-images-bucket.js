#!/usr/bin/env node

/**
 * Skrypt do utworzenia bucket'a 'participant-images' w Supabase Storage
 * Użycie: node scripts/create-participant-images-bucket.js
 */

const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Błąd: Brak zmiennych środowiskowych!');
  console.error('Upewnij się, że masz w .env.local:');
  console.error('  - NEXT_PUBLIC_SUPABASE_URL');
  console.error('  - SUPABASE_SERVICE_ROLE_KEY (lub NEXT_PUBLIC_SUPABASE_ANON_KEY)');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function createBucket() {
  console.log('🚀 Tworzenie bucket\'a participant-images...\n');
  
  try {
    // Sprawdź czy bucket już istnieje
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      console.error('❌ Błąd przy sprawdzaniu bucketów:', listError.message);
      process.exit(1);
    }
    
    const bucketExists = buckets?.some(b => b.id === 'participant-images');
    
    if (bucketExists) {
      console.log('✅ Bucket participant-images już istnieje');
      return;
    }
    
    // Utwórz bucket
    const { data, error } = await supabase.storage.createBucket('participant-images', {
      public: true,
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
      fileSizeLimit: 10485760 // 10MB
    });
    
    if (error) {
      console.error('❌ Błąd przy tworzeniu bucket\'a:', error.message);
      process.exit(1);
    }
    
    console.log('✅ Bucket participant-images utworzony pomyślnie!');
    console.log('   - Publiczny: TAK');
    console.log('   - Dozwolone typy: image/jpeg, image/png, image/webp');
    console.log('   - Limit rozmiaru: 10MB');
    
  } catch (err) {
    console.error('❌ Krytyczny błąd:', err);
    process.exit(1);
  }
}

createBucket();

