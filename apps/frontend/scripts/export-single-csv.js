#!/usr/bin/env node

/**
 * Eksport wszystkich danych z Supabase do JEDNEGO pliku CSV
 * Gotowy do importu w Google Looker Studio
 * 
 * Użycie: node scripts/export-single-csv.js
 * 
 * Wymaga zmiennych środowiskowych:
 * - NEXT_PUBLIC_SUPABASE_URL
 * - SUPABASE_SERVICE_ROLE_KEY (lub NEXT_PUBLIC_SUPABASE_ANON_KEY)
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

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

// Funkcja do formatowania wartości dla CSV
function formatValue(value) {
  if (value === null || value === undefined) {
    return '';
  }
  
  // Jeśli to array, zamień na tekst rozdzielony średnikami
  if (Array.isArray(value)) {
    return value.join('; ');
  }
  
  // Jeśli to obiekt, zamień na JSON string
  if (typeof value === 'object') {
    return JSON.stringify(value).replace(/"/g, '""');
  }
  
  // Escape przecinków, cudzysłowów i nowych linii
  const stringValue = String(value)
    .replace(/"/g, '""')
    .replace(/\n/g, ' ')
    .replace(/\r/g, ' ');
  
  // Jeśli zawiera przecinek, cudzysłów lub zaczyna się od spacji, owiń w cudzysłowy
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.startsWith(' ') || stringValue.endsWith(' ')) {
    return `"${stringValue}"`;
  }
  
  return stringValue;
}

// Funkcja do konwersji danych na CSV
function dataToCSV(rows, headers) {
  if (!rows || rows.length === 0) {
    return headers.join(',') + '\n';
  }
  
  const csvRows = [headers.join(',')];
  
  for (const row of rows) {
    const values = headers.map(header => formatValue(row[header]));
    csvRows.push(values.join(','));
  }
  
  return csvRows.join('\n');
}

// Funkcja do eksportu participants
async function exportParticipants() {
  console.log('📊 Eksportuję participants...');
  
  const { data, error } = await supabase
    .from('participants')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error(`  ⚠️  Błąd:`, error.message);
    return [];
  }
  
  if (!data || data.length === 0) {
    console.log('  ℹ️  Brak danych');
    return [];
  }
  
  // Przekształć dane do wspólnego formatu
  return data.map(row => ({
    record_type: 'participant',
    record_id: row.user_hash,
    user_hash: row.user_hash,
    
    // Demografia
    age_range: row.age_range || '',
    gender: row.gender || '',
    country: row.country || '',
    education: row.education || '',
    path_type: row.path_type || '',
    
    // Big Five
    big5_openness: row.big5_openness || '',
    big5_conscientiousness: row.big5_conscientiousness || '',
    big5_extraversion: row.big5_extraversion || '',
    big5_agreeableness: row.big5_agreeableness || '',
    big5_neuroticism: row.big5_neuroticism || '',
    big5_completed_at: row.big5_completed_at || '',
    
    // Implicit
    implicit_style_1: row.implicit_style_1 || '',
    implicit_style_2: row.implicit_style_2 || '',
    implicit_style_3: row.implicit_style_3 || '',
    implicit_color_1: row.implicit_color_1 || '',
    implicit_color_2: row.implicit_color_2 || '',
    implicit_color_3: row.implicit_color_3 || '',
    implicit_material_1: row.implicit_material_1 || '',
    implicit_material_2: row.implicit_material_2 || '',
    implicit_material_3: row.implicit_material_3 || '',
    dna_accuracy_score: row.dna_accuracy_score || '',
    
    // Explicit
    explicit_style: row.explicit_style || '',
    explicit_palette: row.explicit_palette || '',
    explicit_material_1: row.explicit_material_1 || '',
    explicit_material_2: row.explicit_material_2 || '',
    explicit_material_3: row.explicit_material_3 || '',
    explicit_warmth: row.explicit_warmth || '',
    explicit_brightness: row.explicit_brightness || '',
    explicit_complexity: row.explicit_complexity || '',
    explicit_texture: row.explicit_texture || '',
    
    // Sensory/Biophilia
    biophilia_score: row.biophilia_score || '',
    nature_metaphor: row.nature_metaphor || '',
    sensory_music: row.sensory_music || '',
    sensory_texture: row.sensory_texture || '',
    sensory_light: row.sensory_light || '',
    
    // Lifestyle
    living_situation: row.living_situation || '',
    life_vibe: row.life_vibe || '',
    life_goals: row.life_goals || '',
    
    // PRS
    prs_ideal_x: row.prs_ideal_x || '',
    prs_ideal_y: row.prs_ideal_y || '',
    prs_current_x: row.prs_current_x || '',
    prs_current_y: row.prs_current_y || '',
    
    // Laddering
    ladder_core_need: row.ladder_core_need || '',
    ladder_path: row.ladder_path || '',
    
    // Surveys
    sus_score: row.sus_score || '',
    clarity_score: row.clarity_score || '',
    agency_score: row.agency_score || '',
    satisfaction_score: row.satisfaction_score || '',
    
    // Room
    room_type: row.room_type || '',
    room_name: row.room_name || '',
    room_usage_type: row.room_usage_type || '',
    
    // Stats
    tinder_total_swipes: row.tinder_total_swipes || 0,
    tinder_likes: row.tinder_likes || 0,
    tinder_dislikes: row.tinder_dislikes || 0,
    generations_count: row.generations_count || 0,
    inspirations_count: row.inspirations_count || 0,
    
    // Inspiration tags
    inspiration_style_1: row.inspiration_style_1 || '',
    inspiration_color_1: row.inspiration_color_1 || '',
    inspiration_material_1: row.inspiration_material_1 || '',
    
    // Timestamps
    consent_timestamp: row.consent_timestamp || '',
    created_at: row.created_at || '',
    updated_at: row.updated_at || '',
    
    // Swipe-specific fields (puste dla participants)
    swipe_id: '',
    swipe_direction: '',
    swipe_reaction_time_ms: '',
    swipe_image_id: '',
    swipe_image_styles: '',
    swipe_image_colors: '',
    swipe_image_materials: '',
    swipe_timestamp: '',
    
    // Image-specific fields (puste dla participants)
    image_id: '',
    image_type: '',
    image_public_url: '',
    image_is_favorite: '',
    image_tags_styles: '',
    image_tags_colors: '',
    image_tags_materials: '',
    image_source: '',
    
    // Generation-specific fields (puste dla participants)
    generation_id: '',
    generation_job_type: '',
    generation_prompt: '',
    generation_source: '',
    generation_status: '',
    generation_latency_ms: '',
    generation_has_base_image: '',
    generation_modification_label: '',
    generation_started_at: '',
    generation_finished_at: '',
  }));
}

// Funkcja do eksportu swipes
async function exportSwipes() {
  console.log('📊 Eksportuję participant_swipes...');
  
  const { data, error } = await supabase
    .from('participant_swipes')
    .select('*')
    .order('swipe_timestamp', { ascending: false });
  
  if (error) {
    console.error(`  ⚠️  Błąd:`, error.message);
    return [];
  }
  
  if (!data || data.length === 0) {
    console.log('  ℹ️  Brak danych');
    return [];
  }
  
  return data.map(row => ({
    record_type: 'swipe',
    record_id: row.id.toString(),
    user_hash: row.user_hash || '',
    
    // Swipe-specific
    swipe_id: row.id.toString(),
    swipe_direction: row.direction || '',
    swipe_reaction_time_ms: row.reaction_time_ms || '',
    swipe_image_id: row.image_id || '',
    swipe_image_styles: row.image_styles || '',
    swipe_image_colors: row.image_colors || '',
    swipe_image_materials: row.image_materials || '',
    swipe_timestamp: row.swipe_timestamp || '',
    
    // Timestamps
    created_at: row.created_at || '',
    
    // Wszystkie inne pola puste
    age_range: '', gender: '', country: '', education: '', path_type: '',
    big5_openness: '', big5_conscientiousness: '', big5_extraversion: '',
    big5_agreeableness: '', big5_neuroticism: '', big5_completed_at: '',
    implicit_style_1: '', implicit_style_2: '', implicit_style_3: '',
    implicit_color_1: '', implicit_color_2: '', implicit_color_3: '',
    implicit_material_1: '', implicit_material_2: '', implicit_material_3: '',
    dna_accuracy_score: '', explicit_style: '', explicit_palette: '',
    explicit_material_1: '', explicit_material_2: '', explicit_material_3: '',
    explicit_warmth: '', explicit_brightness: '', explicit_complexity: '',
    explicit_texture: '', biophilia_score: '', nature_metaphor: '',
    sensory_music: '', sensory_texture: '', sensory_light: '',
    living_situation: '', life_vibe: '', life_goals: '',
    prs_ideal_x: '', prs_ideal_y: '', prs_current_x: '', prs_current_y: '',
    ladder_core_need: '', ladder_path: '', sus_score: '', clarity_score: '',
    agency_score: '', satisfaction_score: '', room_type: '', room_name: '',
    room_usage_type: '', tinder_total_swipes: '', tinder_likes: '',
    tinder_dislikes: '', generations_count: '', inspirations_count: '',
    inspiration_style_1: '', inspiration_color_1: '', inspiration_material_1: '',
    consent_timestamp: '', updated_at: '',
    image_id: '', image_type: '', image_public_url: '', image_is_favorite: '',
    image_tags_styles: '', image_tags_colors: '', image_tags_materials: '',
    image_source: '', generation_id: '', generation_job_type: '',
    generation_prompt: '', generation_source: '', generation_status: '',
    generation_latency_ms: '', generation_has_base_image: '',
    generation_modification_label: '', generation_started_at: '',
    generation_finished_at: '',
  }));
}

// Funkcja do eksportu images
async function exportImages() {
  console.log('📊 Eksportuję participant_images...');
  
  const { data, error } = await supabase
    .from('participant_images')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error(`  ⚠️  Błąd:`, error.message);
    return [];
  }
  
  if (!data || data.length === 0) {
    console.log('  ℹ️  Brak danych');
    return [];
  }
  
  return data.map(row => ({
    record_type: 'image',
    record_id: row.id,
    user_hash: row.user_hash || '',
    
    // Image-specific
    image_id: row.id,
    image_type: row.type || '',
    image_public_url: row.public_url || '',
    image_is_favorite: row.is_favorite ? 'true' : 'false',
    image_tags_styles: row.tags_styles || '',
    image_tags_colors: row.tags_colors || '',
    image_tags_materials: row.tags_materials || '',
    image_source: row.source || '',
    
    // Timestamps
    created_at: row.created_at || '',
    
    // Wszystkie inne pola puste
    age_range: '', gender: '', country: '', education: '', path_type: '',
    big5_openness: '', big5_conscientiousness: '', big5_extraversion: '',
    big5_agreeableness: '', big5_neuroticism: '', big5_completed_at: '',
    implicit_style_1: '', implicit_style_2: '', implicit_style_3: '',
    implicit_color_1: '', implicit_color_2: '', implicit_color_3: '',
    implicit_material_1: '', implicit_material_2: '', implicit_material_3: '',
    dna_accuracy_score: '', explicit_style: '', explicit_palette: '',
    explicit_material_1: '', explicit_material_2: '', explicit_material_3: '',
    explicit_warmth: '', explicit_brightness: '', explicit_complexity: '',
    explicit_texture: '', biophilia_score: '', nature_metaphor: '',
    sensory_music: '', sensory_texture: '', sensory_light: '',
    living_situation: '', life_vibe: '', life_goals: '',
    prs_ideal_x: '', prs_ideal_y: '', prs_current_x: '', prs_current_y: '',
    ladder_core_need: '', ladder_path: '', sus_score: '', clarity_score: '',
    agency_score: '', satisfaction_score: '', room_type: '', room_name: '',
    room_usage_type: '', tinder_total_swipes: '', tinder_likes: '',
    tinder_dislikes: '', generations_count: '', inspirations_count: '',
    inspiration_style_1: '', inspiration_color_1: '', inspiration_material_1: '',
    consent_timestamp: '', updated_at: '',
    swipe_id: '', swipe_direction: '', swipe_reaction_time_ms: '',
    swipe_image_id: '', swipe_image_styles: '', swipe_image_colors: '',
    swipe_image_materials: '', swipe_timestamp: '',
    generation_id: '', generation_job_type: '', generation_prompt: '',
    generation_source: '', generation_status: '', generation_latency_ms: '',
    generation_has_base_image: '', generation_modification_label: '',
    generation_started_at: '', generation_finished_at: '',
  }));
}

// Funkcja do eksportu generations
async function exportGenerations() {
  console.log('📊 Eksportuję participant_generations...');
  
  const { data, error } = await supabase
    .from('participant_generations')
    .select('*')
    .order('started_at', { ascending: false });
  
  if (error) {
    console.error(`  ⚠️  Błąd:`, error.message);
    return [];
  }
  
  if (!data || data.length === 0) {
    console.log('  ℹ️  Brak danych');
    return [];
  }
  
  return data.map(row => ({
    record_type: 'generation',
    record_id: row.id,
    user_hash: row.user_hash || '',
    
    // Generation-specific
    generation_id: row.id,
    generation_job_type: row.job_type || '',
    generation_prompt: row.prompt || '',
    generation_source: row.source || '',
    generation_status: row.status || '',
    generation_latency_ms: row.latency_ms || '',
    generation_has_base_image: row.has_base_image ? 'true' : 'false',
    generation_modification_label: row.modification_label || '',
    generation_started_at: row.started_at || '',
    generation_finished_at: row.finished_at || '',
    
    // Timestamps
    created_at: row.created_at || '',
    
    // Wszystkie inne pola puste
    age_range: '', gender: '', country: '', education: '', path_type: '',
    big5_openness: '', big5_conscientiousness: '', big5_extraversion: '',
    big5_agreeableness: '', big5_neuroticism: '', big5_completed_at: '',
    implicit_style_1: '', implicit_style_2: '', implicit_style_3: '',
    implicit_color_1: '', implicit_color_2: '', implicit_color_3: '',
    implicit_material_1: '', implicit_material_2: '', implicit_material_3: '',
    dna_accuracy_score: '', explicit_style: '', explicit_palette: '',
    explicit_material_1: '', explicit_material_2: '', explicit_material_3: '',
    explicit_warmth: '', explicit_brightness: '', explicit_complexity: '',
    explicit_texture: '', biophilia_score: '', nature_metaphor: '',
    sensory_music: '', sensory_texture: '', sensory_light: '',
    living_situation: '', life_vibe: '', life_goals: '',
    prs_ideal_x: '', prs_ideal_y: '', prs_current_x: '', prs_current_y: '',
    ladder_core_need: '', ladder_path: '', sus_score: '', clarity_score: '',
    agency_score: '', satisfaction_score: '', room_type: '', room_name: '',
    room_usage_type: '', tinder_total_swipes: '', tinder_likes: '',
    tinder_dislikes: '', generations_count: '', inspirations_count: '',
    inspiration_style_1: '', inspiration_color_1: '', inspiration_material_1: '',
    consent_timestamp: '', updated_at: '',
    swipe_id: '', swipe_direction: '', swipe_reaction_time_ms: '',
    swipe_image_id: '', swipe_image_styles: '', swipe_image_colors: '',
    swipe_image_materials: '', swipe_timestamp: '',
    image_id: '', image_type: '', image_public_url: '', image_is_favorite: '',
    image_tags_styles: '', image_tags_colors: '', image_tags_materials: '',
    image_source: '',
  }));
}

// Wszystkie nagłówki kolumn (wspólne dla wszystkich typów rekordów)
const ALL_HEADERS = [
  'record_type', 'record_id', 'user_hash',
  // Demografia
  'age_range', 'gender', 'country', 'education', 'path_type',
  // Big Five
  'big5_openness', 'big5_conscientiousness', 'big5_extraversion',
  'big5_agreeableness', 'big5_neuroticism', 'big5_completed_at',
  // Implicit
  'implicit_style_1', 'implicit_style_2', 'implicit_style_3',
  'implicit_color_1', 'implicit_color_2', 'implicit_color_3',
  'implicit_material_1', 'implicit_material_2', 'implicit_material_3',
  'dna_accuracy_score',
  // Explicit
  'explicit_style', 'explicit_palette', 'explicit_material_1',
  'explicit_material_2', 'explicit_material_3', 'explicit_warmth',
  'explicit_brightness', 'explicit_complexity', 'explicit_texture',
  // Sensory/Biophilia
  'biophilia_score', 'nature_metaphor', 'sensory_music',
  'sensory_texture', 'sensory_light',
  // Lifestyle
  'living_situation', 'life_vibe', 'life_goals',
  // PRS
  'prs_ideal_x', 'prs_ideal_y', 'prs_current_x', 'prs_current_y',
  // Laddering
  'ladder_core_need', 'ladder_path',
  // Surveys
  'sus_score', 'clarity_score', 'agency_score', 'satisfaction_score',
  // Room
  'room_type', 'room_name', 'room_usage_type',
  // Stats
  'tinder_total_swipes', 'tinder_likes', 'tinder_dislikes',
  'generations_count', 'inspirations_count',
  // Inspiration tags
  'inspiration_style_1', 'inspiration_color_1', 'inspiration_material_1',
  // Timestamps
  'consent_timestamp', 'created_at', 'updated_at',
  // Swipe fields
  'swipe_id', 'swipe_direction', 'swipe_reaction_time_ms',
  'swipe_image_id', 'swipe_image_styles', 'swipe_image_colors',
  'swipe_image_materials', 'swipe_timestamp',
  // Image fields
  'image_id', 'image_type', 'image_public_url', 'image_is_favorite',
  'image_tags_styles', 'image_tags_colors', 'image_tags_materials',
  'image_source',
  // Generation fields
  'generation_id', 'generation_job_type', 'generation_prompt',
  'generation_source', 'generation_status', 'generation_latency_ms',
  'generation_has_base_image', 'generation_modification_label',
  'generation_started_at', 'generation_finished_at',
];

async function main() {
  console.log('🚀 Rozpoczynam eksport do JEDNEGO pliku CSV...\n');
  
  // Utwórz folder eksportu
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const outputDir = path.join(__dirname, '../exports', timestamp);
  fs.mkdirSync(outputDir, { recursive: true });
  
  console.log(`📁 Folder eksportu: ${outputDir}\n`);
  
  // Eksportuj wszystkie tabele
  const [participants, swipes, images, generations] = await Promise.all([
    exportParticipants(),
    exportSwipes(),
    exportImages(),
    exportGenerations(),
  ]);
  
  // Połącz wszystkie dane
  const allData = [
    ...participants,
    ...swipes,
    ...images,
    ...generations,
  ];
  
  console.log(`\n📊 Podsumowanie:`);
  console.log(`   Participants: ${participants.length}`);
  console.log(`   Swipes: ${swipes.length}`);
  console.log(`   Images: ${images.length}`);
  console.log(`   Generations: ${generations.length}`);
  console.log(`   RAZEM: ${allData.length} rekordów\n`);
  
  if (allData.length === 0) {
    console.log('⚠️  Brak danych do eksportu!');
    return;
  }
  
  // Konwertuj na CSV
  console.log('💾 Zapisuję do pliku CSV...');
  const csv = dataToCSV(allData, ALL_HEADERS);
  const filePath = path.join(outputDir, 'all_data.csv');
  fs.writeFileSync(filePath, csv, 'utf8');
  
  console.log(`✅ Zapisano ${allData.length} rekordów do: ${filePath}`);
  console.log(`\n📊 Plik gotowy do importu w Google Looker Studio!`);
  console.log(`   - Otwórz: https://lookerstudio.google.com`);
  console.log(`   - Create → Data Source → Upload file`);
  console.log(`   - Wybierz plik: ${filePath}`);
  console.log(`\n💡 Wskazówka: Użyj kolumny "record_type" do filtrowania typów rekordów`);
  console.log(`   - record_type = 'participant' - dane uczestników`);
  console.log(`   - record_type = 'swipe' - swipe'y`);
  console.log(`   - record_type = 'image' - obrazy`);
  console.log(`   - record_type = 'generation' - generacje`);
}

main().catch(err => {
  console.error('❌ Krytyczny błąd:', err);
  process.exit(1);
});

