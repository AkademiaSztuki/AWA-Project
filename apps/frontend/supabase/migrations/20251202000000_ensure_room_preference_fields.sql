-- Ensures preference_source column exists in rooms table
-- This migration is idempotent (safe to re-run)

-- Add preference_source column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'rooms' 
        AND column_name = 'preference_source'
    ) THEN
        ALTER TABLE public.rooms ADD COLUMN preference_source text;
        COMMENT ON COLUMN public.rooms.preference_source IS 'Origin of room preferences: profile or questions';
    END IF;
END $$;

-- Add room_preference_payload column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'rooms' 
        AND column_name = 'room_preference_payload'
    ) THEN
        ALTER TABLE public.rooms ADD COLUMN room_preference_payload jsonb;
        COMMENT ON COLUMN public.rooms.room_preference_payload IS 'Raw answers captured during room setup preference selection';
    END IF;
END $$;

-- Add activity_context column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'rooms' 
        AND column_name = 'activity_context'
    ) THEN
        ALTER TABLE public.rooms ADD COLUMN activity_context jsonb;
        COMMENT ON COLUMN public.rooms.activity_context IS 'Expanded activity metadata (frequency, time of day, mappings)';
    END IF;
END $$;

