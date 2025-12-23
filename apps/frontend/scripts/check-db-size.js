#!/usr/bin/env node
/**
 * Check Database Size - Identify what's taking up space
 * 
 * Usage: node scripts/check-db-size.js
 */

const { createClient } = require('@supabase/supabase-js');
const path = require('path');

// Load env vars
try {
  require('dotenv').config({ path: path.join(__dirname, '../.env.local') });
} catch (e) {
  try {
    require('dotenv').config({ path: path.join(__dirname, '../.env') });
  } catch (e2) {
    // Env vars should be in process.env already
  }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function checkTableSizes() {
  console.log('📊 Checking table sizes...\n');
  
  // Get table sizes via SQL query
  const { data, error } = await supabase.rpc('exec_sql', {
    query: `
      SELECT 
        schemaname,
        tablename,
        pg_size_pretty(pg_total_relation_size(schemaname || '.' || tablename)) AS total_size,
        pg_size_pretty(pg_relation_size(schemaname || '.' || tablename)) AS table_size,
        pg_size_pretty(pg_total_relation_size(schemaname || '.' || tablename) - pg_relation_size(schemaname || '.' || tablename)) AS indexes_size,
        pg_total_relation_size(schemaname || '.' || tablename) AS size_bytes
      FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY pg_total_relation_size(schemaname || '.' || tablename) DESC
      LIMIT 20;
    `
  });
  
  if (error) {
    console.log('⚠️  Cannot use RPC. Trying direct queries...\n');
    return await checkTableCounts();
  }
  
  if (data && data.length > 0) {
    console.table(data);
    return data;
  }
  
  return await checkTableCounts();
}

async function checkTableCounts() {
  console.log('📊 Checking record counts in tables...\n');
  
  const tables = [
    'sessions',
    'behavioral_logs',
    'tinder_swipes',
    'tinder_exposures',
    'page_views',
    'health_checks',
    'errors',
    'projects',
    'user_profiles',
    'generation_jobs',
    'image_ratings_history',
    'dna_snapshots',
    'ladder_paths',
    'survey_results'
  ];
  
  const results = [];
  
  for (const table of tables) {
    try {
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });
      
      if (!error && count !== null) {
        results.push({ table, count });
        console.log(`   ${table.padEnd(25)} ${count.toLocaleString()} records`);
      }
    } catch (e) {
      // Table might not exist or RLS might block
    }
  }
  
  return results;
}

async function checkSessionsSize() {
  console.log('\n🔍 Analyzing sessions table (likely culprit)...\n');
  
  const { data, error } = await supabase
    .from('sessions')
    .select('user_hash, updated_at')
    .order('updated_at', { ascending: false })
    .limit(10);
  
  if (error) {
    console.error(`   ❌ Error: ${error.message}`);
    return;
  }
  
  console.log(`   Total sessions: ${data?.length || 0} (showing last 10)`);
  
  // Get full session size estimate
  const { count } = await supabase
    .from('sessions')
    .select('*', { count: 'exact', head: true });
  
  console.log(`   Total sessions in DB: ${count || 0}`);
  
  // Check for old sessions
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const { count: oldCount } = await supabase
    .from('sessions')
    .select('*', { count: 'exact', head: true })
    .lt('updated_at', thirtyDaysAgo.toISOString());
  
  console.log(`   Sessions older than 30 days: ${oldCount || 0}`);
}

async function main() {
  console.log('🔍 Database Size Analysis\n');
  console.log('='.repeat(50));
  
  await checkTableSizes();
  await checkSessionsSize();
  
  console.log('\n' + '='.repeat(50));
  console.log('\n💡 Recommendations:');
  console.log('   1. Check if sessions table has large JSONB data');
  console.log('   2. Consider archiving old sessions (>30 days)');
  console.log('   3. Check for duplicate data');
  console.log('   4. Run cleanup script: pnpm run db:cleanup');
}

main().catch(console.error);

