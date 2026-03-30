#!/usr/bin/env node
/**
 * Delete generated_images via RPC function
 * Uses the delete_generated_images_batch function
 */

const { createClient } = require('@supabase/supabase-js');
const path = require('path');

// Load env vars
try {
  require('dotenv').config({ path: path.join(__dirname, '../../.env.local') });
} catch (e) {
  try {
    require('dotenv').config({ path: path.join(__dirname, '../../.env') });
  } catch (e2) {}
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function deleteViaRPC() {
  console.log('🗑️  Deleting generated_images via RPC function...\n');
  
  let totalDeleted = 0;
  let batchNumber = 0;
  const batchSize = 100;
  
  while (true) {
    batchNumber++;
    console.log(`🔄 Batch ${batchNumber}: Deleting up to ${batchSize} records...`);
    
    const { data, error } = await supabase.rpc('delete_generated_images_batch', {
      batch_size: batchSize
    });
    
    if (error) {
      // If function doesn't exist, tell user to create it first
      if (error.message.includes('function') && error.message.includes('does not exist')) {
        console.error('\n❌ Function not found!');
        console.error('Please run this SQL in Supabase SQL Editor first:');
        console.error('   apps/frontend/supabase/delete_generated_images_function.sql\n');
        return { error };
      }
      console.error(`   ❌ Error: ${error.message}`);
      break;
    }
    
    const deleted = data || 0;
    
    if (deleted === 0) {
      console.log('   ✅ No more records to delete\n');
      break;
    }
    
    totalDeleted += deleted;
    console.log(`   ✅ Deleted ${deleted} records (Total: ${totalDeleted})\n`);
    
    // Small delay
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  
  console.log(`\n✅ Completed! Deleted ${totalDeleted} records total`);
  return { count: totalDeleted };
}

async function main() {
  console.log('🧹 Delete Generated Images via RPC\n');
  
  await deleteViaRPC();
}

main().catch(console.error);

