import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const envPath = resolve(dirname(fileURLToPath(import.meta.url)), '../../frontend/.env.local');
const env = readFileSync(envPath, 'utf8');
const m = env.match(/^DATABASE_URL=(.+)$/m);
let url = m[1].trim().replace(/@[^/]+/, '@127.0.0.1:15432');
const client = new pg.Client({ connectionString: url });
await client.connect();
const q = async (sql) => (await client.query(sql)).rows;

const out = {
  blindByStyleMatch: await q(`
    SELECT p.style_match,
           gf.selected_source,
           COUNT(*)::int AS n
    FROM generation_feedback gf
    JOIN participants p ON p.user_hash = gf.project_id
    WHERE gf.selected_source IS NOT NULL AND p.style_match IS NOT NULL
    GROUP BY p.style_match, gf.selected_source
    ORDER BY p.style_match, n DESC
  `),
  completeFunnel: await q(`
    SELECT
      COUNT(*) FILTER (WHERE core_profile_complete)::int AS step_profile,
      COUNT(*) FILTER (WHERE core_profile_complete AND big5_openness IS NOT NULL)::int AS step_big5,
      COUNT(*) FILTER (WHERE core_profile_complete AND prs_target_x IS NOT NULL)::int AS step_room_prs,
      COUNT(*) FILTER (WHERE blind_selection_made)::int AS step_blind,
      COUNT(*) FILTER (WHERE satisfaction_score IS NOT NULL)::int AS step_survey
    FROM participants
    WHERE path_type = 'full' OR path_type IS NULL
  `),
  implicitWins: await q(`
    SELECT COUNT(*)::int AS n_implicit_picks,
           COUNT(*) FILTER (WHERE selected_source != 'implicit')::int AS n_not_implicit
    FROM generation_feedback WHERE selected_source IS NOT NULL
  `),
  mixedNeverTop: await q(`
    SELECT selected_source, COUNT(*)::int n
    FROM generation_feedback
    GROUP BY selected_source
    ORDER BY n DESC
  `),
  usersMultiplePicks: await q(`
    SELECT project_id, COUNT(*)::int AS picks, array_agg(selected_source) AS sources
    FROM generation_feedback
    WHERE project_id IS NOT NULL AND selected_source IS NOT NULL
    GROUP BY project_id
    HAVING COUNT(*) > 1
    ORDER BY picks DESC
    LIMIT 10
  `),
};

console.log(JSON.stringify(out, null, 2));
await client.end();
