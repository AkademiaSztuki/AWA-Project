-- Views for append-only explicit preference history (migration 20).
-- Apply after infra/gcp/sql/20_participant_preference_snapshots.sql

CREATE OR REPLACE VIEW public.v_preference_snapshot_timeline AS
SELECT
  s.id,
  s.user_hash,
  s.created_at,
  s.source,
  s.milestone,
  s.space_id,
  s.content_hash,
  s.explicit_style,
  s.explicit_palette,
  s.explicit_warmth,
  s.explicit_brightness,
  s.explicit_complexity,
  s.explicit_texture,
  s.explicit_material_1,
  s.explicit_material_2,
  s.explicit_material_3,
  s.sensory_light,
  s.sensory_music,
  s.sensory_texture,
  s.biophilia_score,
  s.nature_metaphor,
  s.room_preference_source,
  s.implicit_style_1,
  s.preference_comparison_json,
  LAG(s.explicit_style) OVER (PARTITION BY s.user_hash ORDER BY s.created_at, s.id) AS prev_explicit_style,
  LAG(s.explicit_palette) OVER (PARTITION BY s.user_hash ORDER BY s.created_at, s.id) AS prev_explicit_palette,
  LAG(s.sensory_light) OVER (PARTITION BY s.user_hash ORDER BY s.created_at, s.id) AS prev_sensory_light,
  LAG(s.explicit_brightness) OVER (PARTITION BY s.user_hash ORDER BY s.created_at, s.id) AS prev_explicit_brightness,
  LAG(s.explicit_complexity) OVER (PARTITION BY s.user_hash ORDER BY s.created_at, s.id) AS prev_explicit_complexity,
  LAG(s.biophilia_score) OVER (PARTITION BY s.user_hash ORDER BY s.created_at, s.id) AS prev_biophilia_score
FROM public.participant_preference_snapshots s;

COMMENT ON VIEW public.v_preference_snapshot_timeline IS
  'Chronological explicit preference versions per user_hash with LAG for prior values.';

CREATE OR REPLACE VIEW public.v_preference_snapshot_transitions AS
SELECT *
FROM public.v_preference_snapshot_timeline t
WHERE t.prev_explicit_style IS NOT NULL
  AND (
    t.explicit_style IS DISTINCT FROM t.prev_explicit_style
    OR t.explicit_palette IS DISTINCT FROM t.prev_explicit_palette
    OR t.sensory_light IS DISTINCT FROM t.prev_sensory_light
    OR t.explicit_brightness IS DISTINCT FROM t.prev_explicit_brightness
    OR t.explicit_complexity IS DISTINCT FROM t.prev_explicit_complexity
    OR t.biophilia_score IS DISTINCT FROM t.prev_biophilia_score
  );

COMMENT ON VIEW public.v_preference_snapshot_transitions IS
  'Rows where explicit preference fields changed vs previous snapshot (or milestone anchor).';

CREATE OR REPLACE VIEW public.v_preference_snapshot_vs_implicit AS
WITH latest AS (
  SELECT DISTINCT ON (user_hash)
    user_hash,
    id,
    created_at,
    explicit_style,
    implicit_style_1,
    preference_comparison_json
  FROM public.participant_preference_snapshots
  ORDER BY user_hash, created_at DESC, id DESC
)
SELECT
  l.user_hash,
  l.id AS snapshot_id,
  l.created_at AS snapshot_at,
  l.explicit_style,
  l.implicit_style_1 AS snapshot_implicit_style_1,
  p.implicit_style_1 AS current_implicit_style_1,
  l.preference_comparison_json AS snapshot_comparison_json,
  p.preference_comparison_json AS current_comparison_json
FROM latest l
JOIN public.participants p ON p.user_hash = l.user_hash;

COMMENT ON VIEW public.v_preference_snapshot_vs_implicit IS
  'Latest snapshot per user vs current participants implicit/comparison columns.';
