/**
 * One-off: run 03_auth_user_id_to_text.sql on Cloud SQL.
 * Usage: node run-auth-migration.js
 * Requires: DATABASE_URL in env (or pass as first arg).
 */
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const databaseUrl = process.argv[2] || process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('Set DATABASE_URL or pass connection string as first argument.');
  process.exit(1);
}

const sqlPath = path.join(__dirname, '../../infra/gcp/sql/03_auth_user_id_to_text.sql');
const sql = fs.readFileSync(sqlPath, 'utf8');

const pool = new Pool({ connectionString: databaseUrl });

pool.query(sql)
  .then(() => {
    console.log('Migration 03_auth_user_id_to_text.sql completed.');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Migration failed:', err.message);
    process.exit(1);
  })
  .finally(() => pool.end());
