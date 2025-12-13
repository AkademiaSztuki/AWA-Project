-- Add SUS survey support to survey_results table
-- Adds 'sus' type and sus_score column

-- First, drop the existing check constraint
ALTER TABLE public.survey_results 
DROP CONSTRAINT IF EXISTS survey_results_type_check;

-- Add the new check constraint including 'sus'
ALTER TABLE public.survey_results 
ADD CONSTRAINT survey_results_type_check 
CHECK (type IN ('satisfaction', 'clarity', 'sus'));

-- Add sus_score column if it doesn't exist
ALTER TABLE public.survey_results 
ADD COLUMN IF NOT EXISTS sus_score numeric;

