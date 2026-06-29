import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const envPath = resolve(dirname(fileURLToPath(import.meta.url)), '../../frontend/.env.local');
const env = readFileSync(envPath, 'utf8');
const m = env.match(/^DATABASE_URL=(.+)$/m);
if (!m) throw new Error('DATABASE_URL missing');
let url = m[1].trim();
url = url.replace(/@[^/]+/, '@127.0.0.1:15432');

const client = new pg.Client({ connectionString: url });
await client.connect();
const q = async (sql) => (await client.query(sql)).rows;

const out = {
  participants: await q(`
    SELECT COUNT(*)::int AS total,
           COUNT(*) FILTER (WHERE core_profile_complete)::int AS core_complete,
           COUNT(*) FILTER (WHERE path_type = 'full')::int AS full_path,
           COUNT(*) FILTER (WHERE path_type = 'fast')::int AS fast_path
    FROM participants
  `),
  dataCoverage: await q(`
    SELECT
      COUNT(*) FILTER (WHERE big5_openness IS NOT NULL)::int AS big5,
      COUNT(*) FILTER (WHERE big5_facets IS NOT NULL)::int AS facets,
      COUNT(*) FILTER (WHERE implicit_dominant_style IS NOT NULL)::int AS implicit,
      COUNT(*) FILTER (WHERE explicit_style IS NOT NULL)::int AS explicit,
      COUNT(*) FILTER (WHERE preference_comparison_json IS NOT NULL)::int AS pref_cmp,
      COUNT(*) FILTER (WHERE style_match = true)::int AS style_match_true,
      COUNT(*) FILTER (WHERE style_match = false)::int AS style_match_false,
      COUNT(*) FILTER (WHERE prs_current_x IS NOT NULL)::int AS prs_current,
      COUNT(*) FILTER (WHERE prs_target_x IS NOT NULL)::int AS prs_target,
      COUNT(*) FILTER (WHERE prs_ideal_x IS NOT NULL)::int AS prs_ideal,
      COUNT(*) FILTER (WHERE blind_selection_made)::int AS blind,
      COUNT(*) FILTER (WHERE inspirations_count > 0)::int AS with_inspirations
    FROM participants
  `),
  matrixUsers: await q(`
    SELECT COUNT(DISTINCT user_hash)::int AS users_with_matrix
    FROM participant_matrix_entries
  `),
  blindVsMatrix: await q(`
    SELECT COUNT(*)::int AS complete_with_both
    FROM participants p
    WHERE p.core_profile_complete
      AND p.blind_selection_made
      AND EXISTS (SELECT 1 FROM participant_matrix_entries m WHERE m.user_hash = p.user_hash)
  `),
  selectedSources: await q(`
    SELECT selected_source, COUNT(*)::int AS n
    FROM generation_feedback
    WHERE selected_source IS NOT NULL
    GROUP BY selected_source ORDER BY n DESC
  `),
  matrixSelected: await q(`
    SELECT source, COUNT(*) FILTER (WHERE is_selected)::int AS picked, COUNT(*)::int AS shown
    FROM participant_matrix_entries
    GROUP BY source ORDER BY picked DESC NULLS LAST
  `),
  feedbackCount: await q(`
    SELECT COUNT(*)::int AS total,
           COUNT(*) FILTER (WHERE selected_source IS NOT NULL)::int AS with_pick,
           ROUND(AVG(selection_time_ms))::int AS avg_pick_ms
    FROM generation_feedback
  `),
  swipes: await q(`
    SELECT COUNT(DISTINCT user_hash)::int AS users,
           COUNT(*)::int AS rows,
           ROUND(AVG(reaction_time_ms))::int AS avg_rt,
           COUNT(*) FILTER (WHERE reaction_time_ms IS NULL)::int AS missing_rt
    FROM participant_swipes
  `),
  surveys: await q(`
    SELECT COUNT(*) FILTER (WHERE satisfaction_score IS NOT NULL)::int AS satisfaction,
           COUNT(*) FILTER (WHERE agency_score IS NOT NULL)::int AS agency,
           COUNT(*) FILTER (WHERE sus_score IS NOT NULL)::int AS sus
    FROM participants
  `),
  prsPostExists: await q(`
    SELECT column_name FROM information_schema.columns
    WHERE table_name = 'participants' AND column_name LIKE 'prs_post%'
  `),
};

console.log(JSON.stringify(out, null, 2));
await client.end();
