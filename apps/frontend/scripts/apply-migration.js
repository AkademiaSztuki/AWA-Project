#!/usr/bin/env node

/**
 * Skrypt do zastosowania migracji przez Supabase client
 * Użycie: node scripts/apply-migration.js
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Błąd: Brak zmiennych środowiskowych!');
  console.error('Upewnij się, że masz w .env.local:');
  console.error('  - NEXT_PUBLIC_SUPABASE_URL');
  console.error('  - SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyMigration() {
  console.log('🚀 Zastosowywanie migracji refaktoru...\n');
  
  try {
    // Wczytaj plik migracji
    const migrationPath = path.join(__dirname, '../supabase/migrations/20250123000000_radical_refactor.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Podziel na pojedyncze komendy (rozdzielone przez ;)
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));
    
    console.log(`📝 Znaleziono ${statements.length} komend SQL\n`);
    
    // Wykonaj każdą komendę
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.length < 10) continue; // Pomiń bardzo krótkie komendy
      
      try {
        console.log(`  [${i + 1}/${statements.length}] Wykonywanie komendy...`);
        const { error } = await supabase.rpc('exec_sql', { sql: statement });
        
        if (error) {
          // Niektóre błędy są OK (np. "already exists")
          if (error.message.includes('already exists') || 
              error.message.includes('duplicate') ||
              error.message.includes('does not exist')) {
            console.log(`    ⚠️  ${error.message.substring(0, 60)}...`);
          } else {
            console.error(`    ❌ Błąd: ${error.message}`);
          }
        } else {
          console.log(`    ✅ OK`);
        }
      } catch (err) {
        console.warn(`    ⚠️  ${err.message.substring(0, 60)}...`);
      }
    }
    
    console.log('\n✅ Migracja zakończona!');
    
  } catch (err) {
    console.error('❌ Krytyczny błąd:', err.message);
    process.exit(1);
  }
}

// Alternatywnie: użyj bezpośrednio query
async function applyMigrationDirect() {
  console.log('🚀 Zastosowywanie migracji refaktoru (bezpośrednio)...\n');
  
  try {
    const migrationPath = path.join(__dirname, '../supabase/migrations/20250123000000_radical_refactor.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Usuń komentarze i puste linie
    const cleanSQL = migrationSQL
      .split('\n')
      .filter(line => !line.trim().startsWith('--') && line.trim().length > 0)
      .join('\n');
    
    // Wykonaj przez REST API (POST /rest/v1/rpc/exec_sql)
    // Lub użyj bezpośrednio query jeśli dostępne
    console.log('📝 Wykonywanie migracji...');
    console.log('⚠️  Uwaga: Wymaga bezpośredniego dostępu do bazy danych.');
    console.log('   Użyj Supabase Dashboard → SQL Editor lub psql\n');
    
    console.log('📋 Skopiuj poniższy SQL do Supabase Dashboard:\n');
    console.log('='.repeat(60));
    console.log(cleanSQL.substring(0, 500) + '...');
    console.log('='.repeat(60));
    console.log('\nLub uruchom: psql <connection_string> < migration.sql\n');
    
  } catch (err) {
    console.error('❌ Błąd:', err.message);
    process.exit(1);
  }
}

// Sprawdź czy mamy dostęp do exec_sql
applyMigration().catch(() => {
  console.log('\n⚠️  Nie można wykonać przez RPC, wyświetlam instrukcje...\n');
  applyMigrationDirect();
});

