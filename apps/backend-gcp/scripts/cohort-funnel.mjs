import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const envPath = resolve(dirname(fileURLToPath(import.meta.url)), '../../frontend/.env.local');
const env = readFileSync(envPath, 'utf8');
let url = env.match(/^DATABASE_URL=(.+)$/m)[1].trim().replace(/@[^/]+/, '@127.0.0.1:15432');
const c = new pg.Client({ connectionString: url });
await c.connect();

const funnel = await c.query(`
  SELECT
    COUNT(*) FILTER (WHERE core_profile_complete)::int AS core_complete,
    COUNT(*) FILTER (WHERE EXISTS (SELECT 1 FROM participant_matrix_entries m WHERE m.user_hash = p.user_hash))::int AS has_matrix,
    COUNT(*) FILTER (WHERE blind_selection_made)::int AS blind_flag,
    COUNT(*) FILTER (WHERE EXISTS (
      SELECT 1 FROM generation_feedback gf WHERE gf.project_id = p.user_hash AND gf.selected_source IS NOT NULL
    ))::int AS has_feedback_pick,
    COUNT(*) FILTER (WHERE generations_count > 0)::int AS has_generations
  FROM participants p
`);

const gap = await c.query(`
  SELECT p.user_hash, p.blind_selection_made, p.current_step, p.path_type,
         (SELECT COUNT(*)::int FROM participant_matrix_entries m WHERE m.user_hash=p.user_hash) AS matrix_rows,
         (SELECT COUNT(*)::int FROM generation_feedback gf WHERE gf.project_id=p.user_hash) AS feedback_rows
  FROM participants p
  WHERE p.core_profile_complete = true AND NOT COALESCE(p.blind_selection_made, false)
  ORDER BY p.updated_at DESC
  LIMIT 12
`);

const blindNoFlag = await c.query(`
  SELECT COUNT(DISTINCT gf.project_id)::int AS users_with_feedback_but_no_flag
  FROM generation_feedback gf
  JOIN participants p ON p.user_hash = gf.project_id
  WHERE gf.selected_source IS NOT NULL AND COALESCE(p.blind_selection_made, false) = false
`);

console.log(JSON.stringify({ funnel: funnel.rows[0], blindNoFlag: blindNoFlag.rows[0], dropped: gap.rows }, null, 2));
await c.end();
