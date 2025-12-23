#!/usr/bin/env node

/**
 * Prosty eksport danych z Supabase do CSV
 * Użycie: node scripts/export-to-csv.js [--force-tables=table1,table2]
 * 
 * Wymaga zmiennych środowiskowych:
 * - NEXT_PUBLIC_SUPABASE_URL
 * - SUPABASE_SERVICE_ROLE_KEY (lub NEXT_PUBLIC_SUPABASE_ANON_KEY)
 * 
 * Opcje:
 * --force-tables=table1,table2 - Wymuś eksport konkretnych tabel (nawet jeśli nie zostały wykryte)
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

// Parsuj argumenty wiersza poleceń
const args = process.argv.slice(2);
const forceTablesArg = args.find(arg => arg.startsWith('--force-tables='));
const forceTables = forceTablesArg 
  ? forceTablesArg.split('=')[1].split(',').map(t => t.trim())
  : [];

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

// Funkcja do konwersji obiektu na CSV
function objectToCSV(data, headers) {
  if (!data || data.length === 0) {
    return headers.join(',') + '\n';
  }
  
  const rows = [headers.join(',')];
  
  for (const row of data) {
    const values = headers.map(header => {
      const value = row[header];
      if (value === null || value === undefined) {
        return '';
      }
      // Jeśli to obiekt/array, zamień na JSON string
      if (typeof value === 'object') {
        return JSON.stringify(value).replace(/"/g, '""');
      }
      // Escape przecinków i cudzysłowów
      const stringValue = String(value).replace(/"/g, '""');
      return `"${stringValue}"`;
    });
    rows.push(values.join(','));
  }
  
  return rows.join('\n');
}

// Funkcja do eksportu tabeli/widoku
async function exportTable(tableName, outputDir) {
  try {
    console.log(`📊 Eksportuję ${tableName}...`);
    
    // Sprawdź czy to widok czy tabela
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .limit(100000); // Limit dla bezpieczeństwa
    
    if (error) {
      console.error(`  ⚠️  Błąd przy ${tableName}:`, error.message);
      return false;
    }
    
    if (!data || data.length === 0) {
      console.log(`  ℹ️  ${tableName} jest puste`);
      return true;
    }
    
    // Pobierz nagłówki z pierwszego wiersza
    const headers = Object.keys(data[0]);
    const csv = objectToCSV(data, headers);
    
    // Zapisz do pliku
    const filePath = path.join(outputDir, `${tableName}.csv`);
    fs.writeFileSync(filePath, csv, 'utf8');
    
    console.log(`  ✅ Zapisano ${data.length} wierszy do ${filePath}`);
    return true;
  } catch (err) {
    console.error(`  ❌ Błąd przy eksporcie ${tableName}:`, err.message);
    return false;
  }
}

// Funkcja do sprawdzania, które tabele/widoki istnieją w bazie
async function getAvailableTables() {
  const tables = [];
  const views = [];

  // Lista wszystkich możliwych tabel/widoków do sprawdzenia
  const allPossible = [
    // Widoki research
    'research_participants_summary',
    'research_complete_export',
    'research_full_export_v2',
    'research_swipes_detailed',
    'research_bigfive_facets',
    'research_tinder_analysis',
    'research_style_preferences',
    'research_sus_scores',
    'research_clarity_scores',
    'research_big_five',
    'research_style_distribution',
    'research_reaction_times',
    'research_generation_analysis',
    // Tabele core
    'user_profiles',
    'sessions',
    'survey_results',
    'generation_feedback',
    'research_consents',
    'projects',
    'discovery_sessions',
    'generation_sets',
    'generated_images',
    'behavioral_logs',
    // Tabele research
    'device_context_snapshots',
    'page_views',
    'tinder_exposures',
    'tinder_swipes',
    'dna_snapshots',
    'ladder_paths',
    'ladder_summary',
    'generation_jobs',
    'image_ratings_history',
    'health_checks',
    'errors',
    // Tabele deep personalization
    'households',
    'rooms',
    'design_sessions',
    'enhanced_swipes',
    // Tabele spaces
    'spaces',
    'space_images',
    // Tabele generation matrix
    'generation_matrix_results',
    'generation_matrix_sessions',
    // Tabele regeneration
    'regeneration_events',
  ];

  // Sprawdź każdą tabelę/widok, próbując pobrać 1 wiersz
  console.log(`   Sprawdzam ${allPossible.length} możliwych tabel/widoków...`);
  let checked = 0;
  const notFound = [];
  
  for (const name of allPossible) {
    try {
      const { data, error } = await supabase
        .from(name)
        .select('*')
        .limit(1);
      
      // Sprawdź różne typy błędów
      if (error) {
        // Debug dla konkretnych tabel (np. rooms)
        if (name === 'rooms') {
          console.log(`   🔍 Debug rooms: code=${error.code}, message=${error.message}`);
        }
        
        // PGRST116 = relation does not exist (tabela nie istnieje)
        // PGRST301 = permission denied (może być RLS, ale tabela istnieje)
        const isNotFound = error.code === 'PGRST116' || 
                          (error.message?.toLowerCase().includes('does not exist') && 
                           error.message?.toLowerCase().includes('relation'));
        
        if (isNotFound) {
          // Tabela nie istnieje - pomiń
          notFound.push(name);
        } else {
          // Inny błąd (permission, RLS, pusta tabela, itp.) - dodaj do listy
          // Tabela prawdopodobnie istnieje, tylko mamy problem z dostępem lub jest pusta
          // Lepiej spróbować wyeksportować niż pominąć
          if (name.startsWith('research_')) {
            views.push(name);
          } else {
            tables.push(name);
          }
        }
      } else {
        // Brak błędu - tabela istnieje i mamy dostęp (nawet jeśli pusta)
        if (name.startsWith('research_')) {
          views.push(name);
        } else {
          tables.push(name);
        }
      }
    } catch (err) {
      // Wyjątek - spróbujmy dodać do listy, może tabela istnieje
      // (czasami Supabase zwraca wyjątek zamiast error object)
      if (name.startsWith('research_')) {
        views.push(name);
      } else {
        tables.push(name);
      }
    }
    checked++;
    if (checked % 10 === 0) {
      process.stdout.write(`   Sprawdzono ${checked}/${allPossible.length}...\r`);
    }
  }
  process.stdout.write('\n'); // Nowa linia po zakończeniu

  if (notFound.length > 0) {
    console.log(`   ⚠️  Nie znaleziono (${notFound.length}): ${notFound.slice(0, 5).join(', ')}${notFound.length > 5 ? '...' : ''}`);
  }

  return { tables, views };
}

// Główne widoki do eksportu (z research_views.sql) - jako fallback
const DEFAULT_RESEARCH_VIEWS = [
  'research_full_export_v2',
  'research_swipes_detailed',
  'research_bigfive_facets',
  'research_participants_summary',
  'research_complete_export',
  'research_tinder_analysis',
  'research_style_preferences',
  'research_sus_scores',
  'research_clarity_scores',
  'research_big_five',
  'research_style_distribution',
  'research_reaction_times',
  'research_generation_analysis',
];

// Tabele do eksportu - jako fallback
const DEFAULT_TABLES = [
  'generation_jobs',  // PRIORITY: Pełne prompty generacji
  'user_profiles',
  'sessions',
  'survey_results',
  'generation_feedback',
  'research_consents',
  'projects',
  'tinder_swipes',
  'dna_snapshots',
  'space_images',  // Obrazy z URL-ami
];

// Funkcja do eksportu zdjęć użytkowników (base64 -> JPG)
async function exportUserPhotos(outputDir) {
  try {
    console.log('\n📸 Eksportuję zdjęcia użytkowników...');
    
    // Utwórz folder na zdjęcia
    const imagesDir = path.join(outputDir, 'images');
    fs.mkdirSync(imagesDir, { recursive: true });
    
    // Pobierz wszystkie sesje z roomImage
    const { data: sessions, error } = await supabase
      .from('sessions')
      .select('user_hash, session_json')
      .not('session_json->roomImage', 'is', null)
      .limit(10000);
    
    if (error) {
      console.error(`  ⚠️  Błąd przy pobieraniu sesji:`, error.message);
      return 0;
    }
    
    if (!sessions || sessions.length === 0) {
      console.log(`  ℹ️  Brak zdjęć do eksportu`);
      return 0;
    }
    
    let exportedCount = 0;
    
    for (const session of sessions) {
      try {
        const userHash = session.user_hash;
        const sessionJson = session.session_json;
        
        // Eksportuj roomImage
        if (sessionJson.roomImage) {
          // Base64 może być z prefixem data:image/jpeg;base64, lub bez
          let base64Data = sessionJson.roomImage;
          if (base64Data.includes(',')) {
            base64Data = base64Data.split(',')[1];
          }
          
          const buffer = Buffer.from(base64Data, 'base64');
          const imagePath = path.join(imagesDir, `${userHash}_room.jpg`);
          fs.writeFileSync(imagePath, buffer);
          exportedCount++;
        }
        
        // Eksportuj roomImageEmpty (jeśli istnieje)
        if (sessionJson.roomImageEmpty) {
          let base64Data = sessionJson.roomImageEmpty;
          if (base64Data.includes(',')) {
            base64Data = base64Data.split(',')[1];
          }
          
          const buffer = Buffer.from(base64Data, 'base64');
          const imagePath = path.join(imagesDir, `${userHash}_room_empty.jpg`);
          fs.writeFileSync(imagePath, buffer);
          exportedCount++;
        }
      } catch (err) {
        console.error(`  ⚠️  Błąd przy eksporcie zdjęcia dla ${session.user_hash}:`, err.message);
      }
    }
    
    console.log(`  ✅ Zapisano ${exportedCount} zdjęć do ${imagesDir}`);
    return exportedCount;
  } catch (err) {
    console.error(`  ❌ Błąd przy eksporcie zdjęć:`, err.message);
    return 0;
  }
}

async function main() {
  console.log('🚀 Rozpoczynam eksport danych z Supabase...\n');
  
  // Sprawdź, które tabele/widoki istnieją
  console.log('🔍 Sprawdzam dostępne tabele i widoki...');
  const { tables, views } = await getAvailableTables();
  
  // Dodaj wymuszone tabele do listy
  if (forceTables.length > 0) {
    console.log(`\n   🔧 Wymuszam eksport: ${forceTables.join(', ')}`);
    for (const tableName of forceTables) {
      if (!tables.includes(tableName) && !views.includes(tableName)) {
        if (tableName.startsWith('research_')) {
          views.push(tableName);
        } else {
          tables.push(tableName);
        }
      }
    }
  }
  
  // Użyj wykrytych lub domyślnych
  const researchViews = views.length > 0 ? views : DEFAULT_RESEARCH_VIEWS;
  const tablesToExport = tables.length > 0 ? tables : DEFAULT_TABLES;
  
  console.log(`\n   ✅ Znaleziono ${researchViews.length} widoków i ${tablesToExport.length} tabel`);
  if (views.length > 0) {
    console.log(`   Widoki: ${views.join(', ')}`);
  }
  if (tables.length > 0) {
    console.log(`   Tabele: ${tables.slice(0, 5).join(', ')}${tables.length > 5 ? ` ... i ${tables.length - 5} więcej` : ''}`);
  }
  if (views.length === 0 && tables.length === 0) {
    console.log(`   ⚠️  Używam domyślnej listy (może nie wszystkie istnieją)\n`);
  } else {
    console.log('');
  }
  
  // Utwórz folder eksportu
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const outputDir = path.join(__dirname, '../exports', timestamp);
  fs.mkdirSync(outputDir, { recursive: true });
  
  console.log(`📁 Folder eksportu: ${outputDir}\n`);
  
  let successCount = 0;
  let failCount = 0;
  const exported = [];
  const skipped = [];
  
  // Eksportuj widoki
  console.log('📊 Eksportuję widoki badawcze...');
  for (const view of researchViews) {
    const success = await exportTable(view, outputDir);
    if (success) {
      successCount++;
      exported.push(view);
    } else {
      failCount++;
      skipped.push(view);
    }
  }
  
  console.log('\n📋 Eksportuję tabele...');
  for (const table of tablesToExport) {
    const success = await exportTable(table, outputDir);
    if (success) {
      successCount++;
      exported.push(table);
    } else {
      failCount++;
      skipped.push(table);
    }
  }
  
  // Eksportuj zdjęcia użytkowników
  const photosExported = await exportUserPhotos(outputDir);
  
  // Podsumowanie
  console.log('\n' + '='.repeat(50));
  console.log('✅ Eksport zakończony!');
  console.log(`   Sukces: ${successCount}`);
  console.log(`   Błędy: ${failCount}`);
  if (photosExported > 0) {
    console.log(`   Zdjęcia: ${photosExported}`);
  }
  console.log(`   Lokalizacja: ${outputDir}`);
  if (skipped.length > 0) {
    console.log(`\n⚠️  Pominięte (nie istnieją lub brak dostępu):`);
    skipped.forEach(name => console.log(`   - ${name}`));
  }
  console.log('='.repeat(50));
  
  // Utwórz plik README z informacjami
  const readme = `# Eksport danych - ${timestamp}

## Zawartość

Ten folder zawiera eksport danych z Supabase z dnia ${new Date().toLocaleString('pl-PL')}.

### Eksportowane widoki (${researchViews.length}):
${exported.filter(v => v.startsWith('research_')).map(v => `- ${v}.csv`).join('\n') || 'Brak'}

### Eksportowane tabele (${tablesToExport.length}):
${exported.filter(t => !t.startsWith('research_')).map(t => `- ${t}.csv`).join('\n') || 'Brak'}

${photosExported > 0 ? `\n### Zdjęcia użytkowników:
- ${photosExported} zdjęć w folderze \`images/\`` : ''}

${skipped.length > 0 ? `\n### Pominięte (nie istnieją lub brak dostępu):
${skipped.map(s => `- ${s}`).join('\n')}` : ''}

## Użycie

Otwórz pliki CSV w:
- Excel / Google Sheets
- Python (pandas): \`pd.read_csv('nazwa.csv')\`
- R: \`read.csv('nazwa.csv')\`
- SPSS: File → Import Data → CSV

## Uwagi

- Puste wartości są reprezentowane jako puste pola
- Obiekty JSON są zapisane jako stringi
- Daty są w formacie ISO 8601
`;

  fs.writeFileSync(path.join(outputDir, 'README.md'), readme, 'utf8');
  console.log('\n📝 Utworzono README.md z opisem eksportu');
  
  // Dodaj informację o zdjęciach do README
  if (photosExported > 0) {
    const photosInfo = `\n## Zdjęcia użytkowników\n\n${photosExported} zdjęć zostało wyeksportowanych do folderu \`images/\`:\n- Format: JPG\n- Nazwy: \`{userHash}_room.jpg\` (zdjęcie pokoju)\n- Nazwy: \`{userHash}_room_empty.jpg\` (zdjęcie bez mebli, jeśli dostępne)\n`;
    fs.appendFileSync(path.join(outputDir, 'README.md'), photosInfo, 'utf8');
  }
}

main().catch(err => {
  console.error('❌ Krytyczny błąd:', err);
  process.exit(1);
});

