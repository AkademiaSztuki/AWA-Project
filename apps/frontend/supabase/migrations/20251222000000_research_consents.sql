-- Migration: research_consents table for GDPR consent tracking
-- Created: 2025-12-22

create table if not exists public.research_consents (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,  -- user_hash from session
  consent_version text not null,
  consent_research boolean not null,
  consent_processing boolean not null,
  acknowledged_art13 boolean not null,
  locale text not null,
  created_at timestamptz not null default now()
);

-- Index for querying by user_id
create index if not exists idx_research_consents_user_id on public.research_consents(user_id);

-- Index for querying by created_at
create index if not exists idx_research_consents_created_at on public.research_consents(created_at desc);

-- Enable RLS
alter table public.research_consents enable row level security;

-- RLS Policies: allow anonymous insert and select
do $$ begin
  create policy "research_consents_anon_insert" on public.research_consents 
    for insert to anon with check (true);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "research_consents_anon_select" on public.research_consents 
    for select to anon using (true);
exception when duplicate_object then null; end $$;





