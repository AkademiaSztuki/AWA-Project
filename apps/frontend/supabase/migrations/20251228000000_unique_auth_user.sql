-- Fix multiple users for same account
-- Migration: Add UNIQUE constraint to auth_user_id and clean up duplicates

DO $$ 
DECLARE 
    r RECORD;
BEGIN
    -- 1. Znajdź i usuń duplikaty auth_user_id, zachowując najnowszy rekord
    FOR r IN (
        SELECT auth_user_id, COUNT(*) 
        FROM public.participants 
        WHERE auth_user_id IS NOT NULL 
        GROUP BY auth_user_id 
        HAVING COUNT(*) > 1
    ) LOOP
        -- Zachowaj najnowszy user_hash dla tego auth_user_id
        -- Inne rekordy zostaną usunięte (kaskadowo usuną swipes/images/itp.)
        DELETE FROM public.participants 
        WHERE auth_user_id = r.auth_user_id 
        AND user_hash NOT IN (
            SELECT user_hash 
            FROM public.participants 
            WHERE auth_user_id = r.auth_user_id 
            ORDER BY updated_at DESC 
            LIMIT 1
        );
    END LOOP;
END $$;

-- 2. Dodaj UNIQUE constraint
ALTER TABLE public.participants 
ADD CONSTRAINT participants_auth_user_id_key UNIQUE (auth_user_id);

COMMENT ON CONSTRAINT participants_auth_user_id_key ON public.participants IS 'Gwarantuje, że jedno konto auth ma tylko jeden rekord uczestnika (user_hash)';
