-- Quick fix: Add personality and inspirations columns to user_profiles
-- Run this SQL directly in Supabase SQL Editor if migration hasn't been applied

alter table public.user_profiles 
  add column if not exists personality jsonb,
  add column if not exists inspirations jsonb;

comment on column public.user_profiles.personality is 'Big Five personality test results (IPIP-NEO-120 with domains and facets)';
comment on column public.user_profiles.inspirations is 'User-uploaded inspiration images with VLM tags';

