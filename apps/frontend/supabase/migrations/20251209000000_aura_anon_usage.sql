-- Optional reference: anonymous usage counters if you store them in Postgres (e.g. Cloud SQL).
-- The current frontend enforces limits in-process (see src/lib/anon-request-helpers.ts), not via this schema.
-- This is unrelated to sign-in: auth is Google + backend-gcp (participants / linkAuth).

create table if not exists public.aura_anon_generation_usage (
  anon_session_id uuid primary key,
  generate_count int not null default 0,
  first_generate_at timestamptz,
  last_generate_at timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists public.aura_ip_generation_usage (
  id bigserial primary key,
  ip_hash text not null,
  window_start timestamptz not null,
  count int not null default 0,
  updated_at timestamptz not null default now(),
  unique (ip_hash, window_start)
);

create index if not exists idx_aura_ip_window on public.aura_ip_generation_usage (ip_hash, window_start desc);

comment on table public.aura_anon_generation_usage is 'Tracks free image generations per anonymous browser session (HttpOnly cookie id)';
comment on table public.aura_ip_generation_usage is 'Rolling 24h windows of generation counts per hashed client IP';

alter table public.aura_anon_generation_usage enable row level security;
alter table public.aura_ip_generation_usage enable row level security;
-- RLS: no policies for anon/authenticated keys — only service_role (server) can read/write

-- Optional: link to Supabase auth when user later signs in
create table if not exists public.aura_anon_sessions (
  id uuid primary key,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  ip_hash text,
  user_agent text,
  linked_auth_user_id text
);

create index if not exists idx_aura_anon_sessions_linked on public.aura_anon_sessions (linked_auth_user_id);

alter table public.aura_anon_sessions enable row level security;

-- Sliding 24h window per IP (one row per ip_hash; server updates window_start + count)
create table if not exists public.aura_ip_rate (
  ip_hash text primary key,
  window_start timestamptz not null,
  count int not null default 0,
  updated_at timestamptz not null default now()
);

comment on table public.aura_ip_rate is 'Sliding 24h generation count per hashed client IP';

alter table public.aura_ip_rate enable row level security;

-- Idempotency: one successful deduct per generation_id (anon)
create table if not exists public.aura_anon_dedup (
  generation_id text primary key,
  anon_session_id uuid not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_aura_anon_dedup_session on public.aura_anon_dedup (anon_session_id);

alter table public.aura_anon_dedup enable row level security;
