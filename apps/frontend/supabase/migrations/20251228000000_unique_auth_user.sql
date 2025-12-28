-- Fix multiple users for same account
-- Migration: Add UNIQUE constraint to auth_user_id and clean up duplicates

DO $$ 
DECLARE 
    r RECORD;
BEGIN
    -- 1. Znajdź i usuń duplikaty auth_user_id, zachowując najnowszy rekord (updated_at)
    -- Używamy tymczasowej tabeli aby obejść ograniczenia subkwerend w starszych wersjach Postgres
    CREATE TEMP TABLE latest_participants AS
    SELECT DISTINCT ON (auth_user_id) user_hash
    FROM public.participants
    WHERE auth_user_id IS NOT NULL
    ORDER BY auth_user_id, updated_at DESC, user_hash ASC;

    DELETE FROM public.participants
    WHERE auth_user_id IS NOT NULL
    AND user_hash NOT IN (SELECT user_hash FROM latest_participants);

    DROP TABLE latest_participants;

END $$;

-- 2. Dodaj UNIQUE constraint
ALTER TABLE public.participants 
ADD CONSTRAINT participants_auth_user_id_key UNIQUE (auth_user_id);

COMMENT ON CONSTRAINT participants_auth_user_id_key ON public.participants IS 'Gwarantuje, że jedno konto auth ma tylko jeden rekord uczestnika (user_hash)';
