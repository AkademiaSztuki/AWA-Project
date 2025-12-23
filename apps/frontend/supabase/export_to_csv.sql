-- ============================================
-- EXPORT DATA TO CSV FOR ANALYSIS
-- ============================================
-- Use these queries to export data for R/Python/SPSS
-- In Supabase SQL Editor, run query, then click "Export" button
-- ============================================

-- Export 1: Complete participant data
SELECT * FROM research_complete_export;

-- Export 2: Tinder swipe analysis
SELECT * FROM research_tinder_analysis;

-- Export 3: Style preferences
SELECT * FROM research_style_preferences;

-- Export 4: Survey results
SELECT * FROM research_sus_scores
UNION ALL
SELECT 
  session_id,
  clarity_score as sus_score,  -- Rename for consistency
  answers,
  timestamp,
  CASE 
    WHEN clarity_score >= 4 THEN 'Excellent'
    WHEN clarity_score >= 3 THEN 'Good'
    WHEN clarity_score >= 2 THEN 'OK'
    ELSE 'Poor'
  END as usability_rating
FROM research_clarity_scores;

-- Export 5: Big Five personality
SELECT * FROM research_big_five;

-- Export 6: Generation feedback (if table exists)
-- Uncomment if generation_feedback table exists:
-- SELECT * FROM research_generation_analysis;

-- Export 7: Style distribution (summary)
SELECT * FROM research_style_distribution;

-- Export 8: Reaction times
SELECT * FROM research_reaction_times;

