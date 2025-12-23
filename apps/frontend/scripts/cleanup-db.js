#!/usr/bin/env node
/**
 * Database Cleanup Script
 * Executes cleanup queries via Supabase REST API
 * 
 * Usage: node scripts/cleanup-db.js
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Load env vars (Next.js style - try .env.local first, then .env)
try {
  require('dotenv').config({ path: path.join(__dirname, '../.env.local') });
} catch (e) {
  try {
    require('dotenv').config({ path: path.join(__dirname, '../.env') });
  } catch (e2) {
    // Env vars should be in process.env already (Vercel, etc.)
  }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials!');
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function deleteOldHealthChecks() {
  console.log('🗑️  Deleting health_checks older than 7 days...');
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  
  const { data, error, count } = await supabase
    .from('health_checks')
    .delete()
    .lt('checked_at', sevenDaysAgo.toISOString())
    .select('*', { count: 'exact', head: true });
  
  if (error) {
    console.error(`   ❌ Error: ${error.message}`);
    return { error };
  }
  console.log(`   ✅ Deleted ${count || 0} records`);
  return { count };
}

async function deleteOldErrors() {
  console.log('🗑️  Deleting errors older than 7 days...');
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  
  const { data, error, count } = await supabase
    .from('errors')
    .delete()
    .lt('occurred_at', sevenDaysAgo.toISOString())
    .select('*', { count: 'exact', head: true });
  
  if (error) {
    console.error(`   ❌ Error: ${error.message}`);
    return { error };
  }
  console.log(`   ✅ Deleted ${count || 0} records`);
  return { count };
}

async function deleteAllPageViews() {
  console.log('🗑️  Deleting all page_views...');
  
  // Delete all by selecting all IDs first, then deleting
  const { data: allIds } = await supabase
    .from('page_views')
    .select('id')
    .limit(10000); // Safety limit
  
  if (!allIds || allIds.length === 0) {
    console.log(`   ✅ No records to delete`);
    return { count: 0 };
  }
  
  const ids = allIds.map(r => r.id);
  const { data, error, count } = await supabase
    .from('page_views')
    .delete()
    .in('id', ids)
    .select('*', { count: 'exact', head: true });
  
  if (error) {
    console.error(`   ❌ Error: ${error.message}`);
    return { error };
  }
  console.log(`   ✅ Deleted ${count || 0} records`);
  return { count };
}

async function deleteOldBehavioralLogs() {
  console.log('🗑️  Deleting behavioral_logs older than 30 days...');
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const { data, error, count } = await supabase
    .from('behavioral_logs')
    .delete()
    .lt('created_at', thirtyDaysAgo.toISOString())
    .select('*', { count: 'exact', head: true });
  
  if (error) {
    console.error(`   ❌ Error: ${error.message}`);
    return { error };
  }
  console.log(`   ✅ Deleted ${count || 0} records`);
  return { count };
}

async function deleteTestSessions() {
  console.log('🗑️  Deleting test sessions...');
  
  const { data, error, count } = await supabase
    .from('sessions')
    .delete()
    .or('user_hash.ilike.test%,user_hash.ilike.TEST%')
    .select('*', { count: 'exact', head: true });
  
  if (error) {
    console.error(`   ❌ Error: ${error.message}`);
    return { error };
  }
  console.log(`   ✅ Deleted ${count || 0} records`);
  return { count };
}

async function deleteTestProjects() {
  console.log('🗑️  Deleting test projects...');
  
  const { data, error, count } = await supabase
    .from('projects')
    .delete()
    .or('user_hash.ilike.test%,user_hash.ilike.TEST%')
    .select('*', { count: 'exact', head: true });
  
  if (error) {
    console.error(`   ❌ Error: ${error.message}`);
    return { error };
  }
  console.log(`   ✅ Deleted ${count || 0} records`);
  return { count };
}

async function deleteTestUserProfiles() {
  console.log('🗑️  Deleting test user_profiles...');
  
  const { data, error, count } = await supabase
    .from('user_profiles')
    .delete()
    .or('user_hash.ilike.test%,user_hash.ilike.TEST%')
    .select('*', { count: 'exact', head: true });
  
  if (error) {
    console.error(`   ❌ Error: ${error.message}`);
    return { error };
  }
  console.log(`   ✅ Deleted ${count || 0} records`);
  return { count };
}

async function deleteOldSessions() {
  console.log('🗑️  Deleting sessions older than 30 days...');
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const { data, error, count } = await supabase
    .from('sessions')
    .delete()
    .lt('updated_at', thirtyDaysAgo.toISOString())
    .select('*', { count: 'exact', head: true });
  
  if (error) {
    console.error(`   ❌ Error: ${error.message}`);
    return { error };
  }
  console.log(`   ✅ Deleted ${count || 0} records`);
  return { count };
}

async function deleteOldGeneratedImages() {
  console.log('🗑️  Deleting ALL generated_images (in small batches to avoid timeout)...');
  
  // Delete in smaller batches with delays to avoid timeout
  let totalDeleted = 0;
  let hasMore = true;
  const batchSize = 100; // Smaller batches to avoid timeout
  
  while (hasMore) {
    // Get batch of IDs to delete
    const { data: batch, error: fetchError } = await supabase
      .from('generated_images')
      .select('id')
      .limit(batchSize);
    
    if (fetchError) {
      console.error(`   ❌ Error fetching: ${fetchError.message}`);
      return { error: fetchError };
    }
    
    if (!batch || batch.length === 0) {
      hasMore = false;
      break;
    }
    
    const ids = batch.map(r => r.id);
    
    // Delete in even smaller chunks (50 at a time)
    for (let i = 0; i < ids.length; i += 50) {
      const chunk = ids.slice(i, i + 50);
      
      const { error, count } = await supabase
        .from('generated_images')
        .delete()
        .in('id', chunk)
        .select('*', { count: 'exact', head: true });
      
      if (error) {
        console.error(`   ❌ Error deleting chunk: ${error.message}`);
        // Continue with next chunk instead of failing completely
        continue;
      }
      
      totalDeleted += count || 0;
      console.log(`   ... Deleted ${totalDeleted} so far...`);
      
      // Small delay to avoid overwhelming the database
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    if (batch.length < batchSize) {
      hasMore = false;
    } else {
      // Delay between batches
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  
  console.log(`   ✅ Deleted ${totalDeleted} records total`);
  return { count: totalDeleted };
}

function askQuestion(query) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  return new Promise(resolve => {
    rl.question(query, answer => {
      rl.close();
      resolve(answer);
    });
  });
}

async function main() {
  console.log('🧹 Database Cleanup Script\n');
  console.log('⚠️  This will DELETE data from your database!\n');
  
  const answer = await askQuestion('Continue? (yes/no): ');
  
  if (answer.toLowerCase() !== 'yes') {
    console.log('❌ Cancelled.');
    process.exit(0);
  }
  
  console.log('\n🔄 Starting cleanup...\n');
  
  const results = {
    healthChecks: await deleteOldHealthChecks(),
    errors: await deleteOldErrors(),
    pageViews: await deleteAllPageViews(),
    behavioralLogs: await deleteOldBehavioralLogs(),
    oldSessions: await deleteOldSessions(),
    oldGeneratedImages: await deleteOldGeneratedImages(),
    testSessions: await deleteTestSessions(),
    testProjects: await deleteTestProjects(),
    testUserProfiles: await deleteTestUserProfiles()
  };
  
  console.log('\n✅ Cleanup completed!\n');
  console.log('📊 Summary:');
  console.log(`   health_checks: ${results.healthChecks.count || 0} deleted`);
  console.log(`   errors: ${results.errors.count || 0} deleted`);
  console.log(`   page_views: ${results.pageViews.count || 0} deleted`);
  console.log(`   behavioral_logs: ${results.behavioralLogs.count || 0} deleted`);
  console.log(`   old sessions (>30 days): ${results.oldSessions.count || 0} deleted`);
  console.log(`   generated_images (ALL): ${results.oldGeneratedImages.count || 0} deleted`);
  console.log(`   test sessions: ${results.testSessions.count || 0} deleted`);
  console.log(`   test projects: ${results.testProjects.count || 0} deleted`);
  console.log(`   test user_profiles: ${results.testUserProfiles.count || 0} deleted`);
  
  console.log('\n📝 Next steps:');
  console.log('   1. Check disk usage in Supabase Dashboard → Settings → Database');
  console.log('   2. Space will be reclaimed automatically within 24 hours');
  console.log('   3. Or run vacuum_full.sql manually if needed');
}

main().catch(console.error);

