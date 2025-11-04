-- Add personality and inspirations support to user_profiles
alter table public.user_profiles 
  add column if not exists personality jsonb,
  add column if not exists inspirations jsonb;

comment on column public.user_profiles.personality is 'Big Five personality test results (IPIP-60)';
comment on column public.user_profiles.inspirations is 'User-uploaded inspiration images with VLM tags';

