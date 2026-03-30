#!/usr/bin/env node

/**
 * Alternatywny skrypt - tworzy bucket przez API route (jeśli dostępne)
 * Użycie: node scripts/create-bucket-via-api.js
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

if (!supabaseUrl) {
  console.error('❌ Brak NEXT_PUBLIC_SUPABASE_URL w .env.local');
  process.exit(1);
}

async function createBucketViaAPI() {
  console.log('🚀 Próba utworzenia bucket\'a przez API route...\n');
  
  try {
    // Sprawdź czy serwer dev działa
    const response = await fetch('http://localhost:3000/api/setup/create-bucket', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (!response.ok) {
      throw new Error(`API returned ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.success) {
      console.log('✅ Bucket utworzony pomyślnie przez API!');
      return true;
    } else {
      console.error('❌ API zwróciło błąd:', data.error);
      return false;
    }
  } catch (err) {
    if (err.message.includes('ECONNREFUSED') || err.message.includes('fetch failed')) {
      console.error('❌ Nie można połączyć się z serwerem dev (localhost:3000)');
      console.error('   Uruchom najpierw: npm run dev');
    } else {
      console.error('❌ Błąd:', err.message);
    }
    return false;
  }
}

// Główna funkcja
async function main() {
  const success = await createBucketViaAPI();
  
  if (!success) {
    console.log('\n📋 Alternatywa: Utwórz bucket ręcznie w Supabase Dashboard:');
    console.log('   1. Otwórz: https://supabase.com/dashboard');
    console.log('   2. Wybierz swój projekt');
    console.log('   3. Storage → Create bucket');
    console.log('   4. Nazwa: participant-images');
    console.log('   5. Public: ✅ TAK');
    console.log('   6. File size limit: 10485760 (10MB)');
    console.log('   7. Allowed MIME types: image/jpeg, image/png, image/webp');
    console.log('\nLub dodaj SUPABASE_SERVICE_ROLE_KEY do .env.local:');
    console.log('   1. Dashboard → Settings → API');
    console.log('   2. Skopiuj "service_role" key');
    console.log('   3. Dodaj: SUPABASE_SERVICE_ROLE_KEY=...');
  }
}

main();

