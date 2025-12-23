# Supabase Database Cleanup

This script helps free up space in your Supabase database by removing unnecessary logs and test data.

## ⚠️ Important Warnings

1. **Backup first**: Make sure you have backups of important data before running cleanup
2. **Review carefully**: Check each DELETE statement before running
3. **Test data**: The script removes all test sessions (user_hash starting with 'test')
4. **CASCADE deletes**: Deleting projects will cascade delete related data

## 📋 How to Use

### Option 1: Run All at Once (Recommended for first time)

1. Open **Supabase Dashboard**
2. Go to **SQL Editor** (left sidebar)
3. Click **New Query**
4. Open `cleanup_database.sql` from this directory
5. Copy the entire file
6. Paste into SQL Editor
7. **Review each section** before running
8. Click **Run** (or press Ctrl+Enter)

### Option 2: Run Step by Step (Safer)

1. Open `cleanup_database.sql`
2. Run **STEP 1** first (diagnostics) to see current sizes
3. Review the results
4. Run **STEP 2** (system logs)
5. Continue with each step, reviewing results between steps
6. Run **STEP 7** last (VACUUM FULL)

## 📊 What Gets Deleted

| Data Type | Retention | Impact |
|-----------|-----------|--------|
| `health_checks` | Last 7 days | Low - system monitoring only |
| `errors` | Last 7 days | Low - error logs only |
| `page_views` | All | Low - tracking data, not needed for research |
| `behavioral_logs` | Last 30 days | Medium - older behavioral data |
| Test sessions | All | Medium - test data only |

## 🔍 After Cleanup

1. Check table sizes again (STEP 7)
2. **Run VACUUM FULL separately** (see below)
3. Verify important research data is still intact
4. Check Supabase Dashboard → Settings → Database for new size

## 💾 Reclaiming Disk Space

### Option 1: Automatic (Recommended)
Supabase automatically runs `VACUUM` in the background. The space will be reclaimed within 24 hours after deletions. Check disk usage in:
- Dashboard → Settings → Database

### Option 2: Manual VACUUM (Optional)
If you want to reclaim space immediately:

1. Open a **NEW query** in Supabase SQL Editor
2. Open `vacuum_full.sql` from this directory
3. Copy and paste into the new query
4. Run it separately

**Note**: `VACUUM FULL` may not work in Supabase (requires superuser permissions). The script uses regular `VACUUM` which should work, but if it fails, just wait for automatic cleanup.

## ⚠️ Automated Cleanup - DISABLED

**DO NOT enable automatic cleanup during research!**

Automatic cleanup has been removed from this script because it could delete data you need for your thesis. Always run cleanup manually and only when you're certain you don't need the data.

## 📦 Storage Cleanup

Storage (images) must be cleaned manually:

1. Go to **Storage** in Supabase Dashboard
2. Select bucket `aura-assets`
3. Delete old/test files manually
4. Or use the SQL query in STEP 6 to check size first

## 💡 Tips

- Run diagnostics (STEP 1) regularly to monitor growth
- Consider setting up automated cleanup for logs
- Keep at least 30 days of behavioral_logs for research
- Test data can always be regenerated, so safe to delete

