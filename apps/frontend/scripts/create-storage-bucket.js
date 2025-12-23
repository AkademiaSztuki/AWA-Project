#!/usr/bin/env node

/**
 * Skrypt do utworzenia bucket'a Storage dla participant-images
 * Użycie: node scripts/create-storage-bucket.js
 * 
 * Wymaga zmiennych środowiskowych:
 * - NEXT_PUBLIC_SUPABASE_URL
 * - SUPABASE_SERVICE_ROLE_KEY
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

// Sprawdź tylko URL - SERVICE_ROLE_KEY będzie używany przez API route na serwerze
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 
                    process.env.SUPABASE_URL ||
                    process.env.VITE_SUPABASE_URL;

if (!supabaseUrl) {
  console.error('❌ Błąd: Brak NEXT_PUBLIC_SUPABASE_URL w .env.local');
  process.exit(1);
}

async function createBucket() {
  console.log('🚀 Tworzenie bucket\'a participant-images przez API route...\n');
  
  try {
    // Najpierw sprawdź czy serwer dev działa
    console.log('📡 Sprawdzanie połączenia z serwerem dev...');
    
    const checkResponse = await fetch('http://localhost:3000/api/setup/create-participant-images-bucket', {
      method: 'GET'
    });
    
    if (checkResponse.ok) {
      const checkData = await checkResponse.json();
      if (checkData.exists) {
        console.log('✅ Bucket participant-images już istnieje');
        return;
      }
    }
    
    // Utwórz bucket przez API route (serwer ma dostęp do SERVICE_ROLE_KEY)
    console.log('📤 Wysyłanie żądania utworzenia bucket\'a...');
    
    const createResponse = await fetch('http://localhost:3000/api/setup/create-participant-images-bucket', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (!createResponse.ok) {
      let errorData;
      let errorText = '';
      
      try {
        const contentType = createResponse.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          errorData = await createResponse.json();
        } else {
          errorText = await createResponse.text();
        }
      } catch (e) {
        errorText = `Nie można odczytać odpowiedzi: ${e.message}`;
      }
      
      const errorMsg = errorData?.error || errorText || `HTTP ${createResponse.status}`;
      console.error('❌ Szczegóły błędu:', errorMsg);
      
      // Jeśli brak SERVICE_ROLE_KEY lub ogólny błąd 500, pokaż instrukcje
      if (createResponse.status === 500 || 
          errorMsg.includes('SERVICE_ROLE_KEY') || 
          errorMsg.includes('Missing Supabase credentials') ||
          errorMsg.includes('Missing')) {
        console.error('\n⚠️  API route wymaga SUPABASE_SERVICE_ROLE_KEY na serwerze');
        console.error('   (może być w zmiennych środowiskowych Vercel/Netlify, nie tylko .env.local)');
        console.error('\n📋 Najprostsze rozwiązanie: Utwórz bucket ręcznie w Dashboard\n');
        showManualInstructions();
        process.exit(1);
      }
      
      throw new Error(errorMsg);
    }
    
    const result = await createResponse.json();
    
    if (result.success) {
      if (result.created) {
        console.log('✅ Bucket participant-images utworzony pomyślnie!');
      } else {
        console.log('✅ Bucket participant-images już istnieje');
      }
      console.log('\n📋 Konfiguracja:');
      console.log('  - Publiczny: TAK');
      console.log('  - Limit pliku: 10MB');
      console.log('  - Dozwolone typy: JPEG, PNG, WebP');
    } else {
      throw new Error(result.error || 'Unknown error');
    }
    
  } catch (err) {
    if (err.message.includes('ECONNREFUSED') || err.message.includes('fetch failed') || err.code === 'ECONNREFUSED') {
      console.error('❌ Nie można połączyć się z serwerem dev (localhost:3000)');
      console.error('\n📋 Rozwiązanie:');
      console.error('   1. Uruchom serwer dev w osobnym terminalu:');
      console.error('      npm run dev');
      console.error('   2. Poczekaj aż serwer się uruchomi');
      console.error('   3. Uruchom ponownie: npm run storage:create-bucket\n');
      showManualInstructions();
    } else {
      console.error('❌ Błąd:', err.message);
      if (err.message.includes('SERVICE_ROLE_KEY')) {
        showServiceRoleKeyInstructions();
      }
    }
    process.exit(1);
  }
}

function showManualInstructions() {
  console.error('📋 Utwórz bucket ręcznie w Supabase Dashboard:\n');
  console.error('   1. Otwórz: https://supabase.com/dashboard/project/zcaaqbbcqpkzunepnhpb/storage/buckets');
  console.error('   2. Kliknij "New bucket"');
  console.error('   3. Nazwa: participant-images');
  console.error('   4. Public: ✅ TAK');
  console.error('   5. File size limit: 10485760 (10MB)');
  console.error('   6. Allowed MIME types: image/jpeg, image/png, image/webp');
  console.error('   7. Kliknij "Create bucket"\n');
}

function showServiceRoleKeyInstructions() {
  console.error('\n⚠️  PROBLEM: Brak SUPABASE_SERVICE_ROLE_KEY');
  console.error('   Masz tylko ANON_KEY/PUBLISHABLE_KEY - one nie mają uprawnień do tworzenia bucketów.');
  console.error('   SERVICE_ROLE_KEY jest wymagany (omija RLS).\n');
  console.error('📋 Jak znaleźć SERVICE_ROLE_KEY:\n');
  console.error('   1. Otwórz Supabase Dashboard:');
  console.error('      https://supabase.com/dashboard/project/zcaaqbbcqpkzunepnhpb/settings/api\n');
  console.error('   2. W sekcji "Project API keys" znajdź:');
  console.error('      - "anon" / "public" key (to masz jako NEXT_PUBLIC_SUPABASE_ANON_KEY)');
  console.error('      - "service_role" key ← TO POTRZEBUJESZ!\n');
  console.error('   3. Kliknij "Reveal" przy "service_role" i skopiuj klucz');
  console.error('   4. Dodaj do .env.local:');
  console.error('      SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...\n');
  console.error('   ⚠️  UWAGA: Service Role Key jest bardzo wrażliwy - NIE commituj go do git!\n');
  console.error('📋 ALTERNATYWA (szybsze): Utwórz bucket ręcznie w Dashboard:\n');
  console.error('   1. Otwórz: https://supabase.com/dashboard/project/zcaaqbbcqpkzunepnhpb/storage/buckets');
  console.error('   2. Kliknij "New bucket"');
  console.error('   3. Nazwa: participant-images');
  console.error('   4. Public: ✅ TAK');
  console.error('   5. File size limit: 10485760 (10MB)');
  console.error('   6. Allowed MIME types: image/jpeg, image/png, image/webp');
  console.error('   7. Kliknij "Create bucket"\n');
}

createBucket();

