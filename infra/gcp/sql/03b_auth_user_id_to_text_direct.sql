-- Direct ALTER (no DO block) for gcloud sql import - change auth_user_id to TEXT for Google OAuth sub.
ALTER TABLE public.participants
  ALTER COLUMN auth_user_id TYPE TEXT USING auth_user_id::TEXT;
