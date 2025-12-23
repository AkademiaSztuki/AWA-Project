#!/usr/bin/env node
/**
 * Direct deletion of generated_images via SQL
 * Bypasses RLS by using service role key
 */

const { createClient } = require('@supabase/supabase-js');
const path = require('path');

// Load env vars
try {
  require('dotenv').config({ path: path.join(__dirname, '../.env.local') });
} catch (e) {
  try {
    require('dotenv').config({ path: path.join(__dirname, '../.env') });
  } catch (e2) {}
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing SUPABASE_SERVICE_ROLE_KEY!');
  console.error('Get it from: Supabase Dashboard → Settings → API → service_role key');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function deleteAllGeneratedImages() {
  console.log('🗑️  Deleting ALL generated_images...\n');
  
  // First, check count
  const { count: initialCount } = await supabase
    .from('generated_images')
    .select('*', { count: 'exact', head: true });
  
  console.log(`📊 Found ${initialCount || 0} records to delete\n`);
  
  if (initialCount === 0) {
    console.log('✅ No records to delete');
    return { count: 0 };
  }
  
  let totalDeleted = 0;
  let batchNumber = 0;
  const batchSize = 50; // Small batches
  
  while (true) {
    batchNumber++;
    console.log(`🔄 Batch ${batchNumber}: Fetching ${batchSize} records...`);
    
    // Get batch of IDs
    const { data: batch, error: fetchError } = await supabase
      .from('generated_images')
      .select('id')
      .limit(batchSize);
    
    if (fetchError) {
      console.error(`   ❌ Error fetching: ${fetchError.message}`);
      break;
    }
    
    if (!batch || batch.length === 0) {
      console.log('   ✅ No more records to delete');
      break;
    }
    
    const ids = batch.map(r => r.id);
    console.log(`   🗑️  Deleting ${ids.length} records...`);
    
    // Delete this batch
    const { error, count } = await supabase
      .from('generated_images')
      .delete()
      .in('id', ids)
      .select('*', { count: 'exact', head: true });
    
    if (error) {
      console.error(`   ❌ Error: ${error.message}`);
      // Try to continue with next batch
      await new Promise(resolve => setTimeout(resolve, 1000));
      continue;
    }
    
    totalDeleted += count || ids.length;
    console.log(`   ✅ Deleted ${count || ids.length} records (Total: ${totalDeleted})\n`);
    
    // Delay between batches
    await new Promise(resolve => setTimeout(resolve, 200));
    
    // If we got fewer than batchSize, we're done
    if (batch.length < batchSize) {
      break;
    }
  }
  
  console.log(`\n✅ Completed! Deleted ${totalDeleted} records total`);
  return { count: totalDeleted };
}

async function main() {
  console.log('🧹 Direct Generated Images Deletion\n');
  console.log('⚠️  This will DELETE ALL generated_images!\n');
  
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  const answer = await new Promise(resolve => {
    rl.question('Continue? (yes/no): ', resolve);
  });
  rl.close();
  
  if (answer.toLowerCase() !== 'yes') {
    console.log('❌ Cancelled.');
    process.exit(0);
  }
  
  await deleteAllGeneratedImages();
}

main().catch(console.error);

