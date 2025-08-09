-- Research-grade schema migration
-- This migration mirrors apps/frontend/supabase/schema_full.sql

create extension if not exists "pgcrypto";

-- Core tables
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  user_hash text not null,
  timestamp_consent_given timestamptz not null,
  project_id text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.discovery_sessions (
  id uuid primary key default gen_random_uuid(),
  project_id text not null,
  visual_dna jsonb not null,
  dna_accuracy_score numeric not null,
  laddering_path jsonb not null,
  core_need text not null,
  created_at timestamptz not null default now()
);
create index if not exists idx_discovery_sessions_project on public.discovery_sessions(project_id);

create table if not exists public.generation_sets (
  id uuid primary key default gen_random_uuid(),
  project_id text not null,
  prompt text not null,
  created_at timestamptz not null default now()
);
create index if not exists idx_generation_sets_project_created on public.generation_sets(project_id, created_at desc);

create table if not exists public.generated_images (
  id uuid primary key default gen_random_uuid(),
  generation_set_id uuid not null references public.generation_sets(id) on delete cascade,
  parent_image_id uuid null,
  image_url text not null,
  prompt_fragment text not null,
  aesthetic_match_score numeric null,
  character_score numeric null,
  harmony_score numeric null,
  created_at timestamptz not null default now()
);
create index if not exists idx_generated_images_genset on public.generated_images(generation_set_id);

create table if not exists public.behavioral_logs (
  id bigserial primary key,
  project_id text not null,
  event_type text not null,
  event_data jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_behavioral_logs_project_created on public.behavioral_logs(project_id, created_at desc);

create table if not exists public.sessions (
  user_hash text primary key,
  session_json jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.survey_results (
  id bigserial primary key,
  session_id text not null,
  type text not null check (type in ('satisfaction','clarity')),
  answers jsonb,
  agency_score numeric,
  satisfaction_score numeric,
  clarity_score numeric,
  timestamp timestamptz not null default now()
);
create index if not exists idx_survey_results_session on public.survey_results(session_id, timestamp desc);

-- Research-grade tables
create table if not exists public.device_context_snapshots (
  id uuid primary key default gen_random_uuid(),
  project_id text not null,
  context jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists public.page_views (
  id uuid primary key default gen_random_uuid(),
  project_id text not null,
  page text not null,
  entered_at timestamptz not null,
  exited_at timestamptz null,
  meta jsonb null
);
create index if not exists idx_page_views_project_entered on public.page_views(project_id, entered_at desc);

create table if not exists public.tinder_exposures (
  id bigserial primary key,
  project_id text not null,
  image_id integer not null,
  filename text not null,
  order_index integer not null,
  shown_at timestamptz not null,
  tags jsonb,
  categories jsonb
);
create index if not exists idx_tinder_exposures_project_order on public.tinder_exposures(project_id, order_index);

create table if not exists public.tinder_swipes (
  id bigserial primary key,
  project_id text not null,
  image_id integer not null,
  filename text not null,
  direction text not null check (direction in ('left','right')),
  reaction_time_ms integer,
  drag_distance numeric,
  drag_velocity numeric,
  decided_at timestamptz not null,
  tags jsonb,
  categories jsonb
);
create index if not exists idx_tinder_swipes_project_decided on public.tinder_swipes(project_id, decided_at desc);

create table if not exists public.dna_snapshots (
  id uuid primary key default gen_random_uuid(),
  project_id text not null,
  weights jsonb not null,
  top jsonb not null,
  confidence numeric not null,
  parser_version text not null,
  created_at timestamptz not null default now()
);
create index if not exists idx_dna_snapshots_project_created on public.dna_snapshots(project_id, created_at desc);

create table if not exists public.ladder_paths (
  id bigserial primary key,
  project_id text not null,
  level integer not null,
  question text not null,
  selected_answer text not null,
  selected_id text not null,
  timestamp timestamptz not null,
  time_spent_ms integer
);
create index if not exists idx_ladder_paths_project_level on public.ladder_paths(project_id, level);

create table if not exists public.ladder_summary (
  id uuid primary key default gen_random_uuid(),
  project_id text not null,
  core_need text not null,
  prompt_elements jsonb not null,
  created_at timestamptz not null default now()
);
create index if not exists idx_ladder_summary_project_created on public.ladder_summary(project_id, created_at desc);

create table if not exists public.generation_jobs (
  id uuid primary key default gen_random_uuid(),
  project_id text not null,
  job_type text not null check (job_type in ('initial','micro','macro')),
  prompt text not null,
  parameters jsonb not null,
  has_base_image boolean not null,
  modification_label text,
  started_at timestamptz not null,
  finished_at timestamptz,
  status text check (status in ('success','error')),
  latency_ms integer,
  error_message text
);
create index if not exists idx_generation_jobs_project_started on public.generation_jobs(project_id, started_at desc);

create table if not exists public.image_ratings_history (
  id bigserial primary key,
  project_id text not null,
  local_image_id text not null,
  rating_key text not null,
  value integer not null,
  occurred_at timestamptz not null
);
create index if not exists idx_ratings_history_project_time on public.image_ratings_history(project_id, occurred_at desc);

create table if not exists public.health_checks (
  id bigserial primary key,
  project_id text not null,
  ok boolean not null,
  latency_ms integer,
  checked_at timestamptz not null
);
create index if not exists idx_health_checks_project_time on public.health_checks(project_id, checked_at desc);

create table if not exists public.errors (
  id bigserial primary key,
  project_id text not null,
  source text not null,
  message text not null,
  stack text,
  meta jsonb,
  occurred_at timestamptz not null
);
create index if not exists idx_errors_project_time on public.errors(project_id, occurred_at desc);


