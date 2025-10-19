-- Deep Personalization Architecture - Database Schema
-- Migration: Multi-session, multi-room, multi-household support

-- Enable extensions if needed
create extension if not exists "pgcrypto";

-- =========================
-- LAYER 1: USER PROFILES (Global, answered once)
-- =========================

create table if not exists public.user_profiles (
  id uuid primary key default gen_random_uuid(),
  user_hash text unique not null,
  auth_user_id uuid, -- Link to auth.users (null if anonymous)
  
  -- Core Profile (Tier 1 - answered ONCE)
  aesthetic_dna jsonb, -- { implicit: {swipes, patterns}, explicit: {colors, materials, styles} }
  psychological_baseline jsonb, -- { prs_ideal: {x, y}, biophilia_score: 0-3 }
  lifestyle_data jsonb, -- { vibe, goals, values }
  sensory_preferences jsonb, -- { music, texture, light }
  
  -- Projective data
  projective_responses jsonb, -- { nature_place, aspirational_self, etc }
  
  -- Metadata
  profile_completed_at timestamptz,
  profile_version int default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_user_profiles_user_hash on public.user_profiles(user_hash);
create index if not exists idx_user_profiles_created on public.user_profiles(created_at desc);

alter table public.user_profiles enable row level security;

do $$ begin
  create policy "user_profiles_anon_insert" on public.user_profiles for insert to anon with check (true);
  create policy "user_profiles_anon_select" on public.user_profiles for select to anon using (true);
  create policy "user_profiles_anon_update" on public.user_profiles for update to anon using (true) with check (true);
exception when duplicate_object then null; end $$;

-- =========================
-- LAYER 2: HOUSEHOLDS
-- =========================

create table if not exists public.households (
  id uuid primary key default gen_random_uuid(),
  user_hash text not null,
  
  name text not null, -- "Main Home", "Office", etc
  household_type text, -- home, office, vacation, other
  
  -- Social context
  living_situation text, -- alone, partner, family, roommates
  household_dynamics jsonb, -- { decision_maker, taste_alignment, conflicts }
  household_goals jsonb, -- [connection, independence, productivity, etc]
  
  -- Metadata
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  
  -- Add foreign key to user_profiles
  constraint fk_household_user foreign key (user_hash) 
    references public.user_profiles(user_hash) on delete cascade
);

create index if not exists idx_households_user_hash on public.households(user_hash);
create index if not exists idx_households_created on public.households(created_at desc);

alter table public.households enable row level security;

do $$ begin
  create policy "households_anon_insert" on public.households for insert to anon with check (true);
  create policy "households_anon_select" on public.households for select to anon using (true);
  create policy "households_anon_update" on public.households for update to anon using (true) with check (true);
  create policy "households_anon_delete" on public.households for delete to anon using (true);
exception when duplicate_object then null; end $$;

-- =========================
-- LAYER 3: ROOMS
-- =========================

create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  
  name text not null, -- "Master Bedroom", "Living Room", etc
  room_type text not null, -- bedroom, living_room, kitchen, bathroom, home_office, dining_room, other
  
  -- Social context
  usage_type text not null, -- solo, shared, mixed
  shared_with jsonb, -- ["partner", "kids", "guests"]
  ownership_feeling text, -- my_territory, neutral_shared, someone_elses
  
  -- Current state (RESEARCH: Photo Context Analysis)
  current_photos jsonb, -- [{url, analysis: {clutter, colors, objects, ai_comment}}]
  
  -- RESEARCH: PRS pre-test (current state)
  prs_pre_test jsonb, -- {x: -1 to 1 (energizing/calming), y: -1 to 1 (boring/inspiring)}
  
  -- Pain points
  pain_points text[], -- ["layout", "light", "color", "clutter", "storage", "comfort"]
  
  -- Activities (RESEARCH: Functional context, PEO-based)
  activities jsonb, -- [{type, frequency, satisfaction, time_of_day, with_whom}]
  
  -- RESEARCH: Room-specific implicit preferences
  room_visual_dna jsonb, -- {swipes: [...], patterns, room_specific_preferences}
  
  -- Aspirations
  aspirational_state jsonb, -- {prs_target: {x, y}, mood_description, voice_recording_url}
  
  -- Metadata
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_rooms_household on public.rooms(household_id);
create index if not exists idx_rooms_type on public.rooms(room_type);
create index if not exists idx_rooms_created on public.rooms(created_at desc);

alter table public.rooms enable row level security;

do $$ begin
  create policy "rooms_anon_insert" on public.rooms for insert to anon with check (true);
  create policy "rooms_anon_select" on public.rooms for select to anon using (true);
  create policy "rooms_anon_update" on public.rooms for update to anon using (true) with check (true);
  create policy "rooms_anon_delete" on public.rooms for delete to anon using (true);
exception when duplicate_object then null; end $$;

-- =========================
-- LAYER 4: DESIGN SESSIONS
-- =========================

create table if not exists public.design_sessions (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  
  session_number int not null, -- 1st attempt, 2nd refinement, etc
  intent text, -- new_direction, refinement, explore_variation, implement_feedback
  
  -- Generation data
  prompt_used text not null,
  prompt_synthesis_data jsonb, -- stores weights, sources, reasoning for research
  parameters_used jsonb, -- FLUX parameters
  generated_images jsonb, -- [{url, thumbnail_url, parameters, ratings}]
  
  -- User selection
  selected_image_index int, -- which of generated images user preferred
  
  -- RESEARCH: PRS post-test (for selected design)
  prs_post_test jsonb, -- {x, y} - where user places the DESIGN on mood grid
  
  -- RESEARCH: Satisfaction metrics
  satisfaction_score int, -- 1-10
  reflects_identity_score int, -- 1-10 ("Does this reflect who you are?")
  implementation_intention text, -- yes, maybe, no
  
  -- Qualitative feedback
  feedback_text text,
  feedback_voice_url text, -- optional voice recording
  what_loved text, -- "What you love most?"
  what_change text, -- "What would you change?"
  
  -- Metadata
  created_at timestamptz not null default now()
);

create index if not exists idx_design_sessions_room on public.design_sessions(room_id);
create index if not exists idx_design_sessions_created on public.design_sessions(created_at desc);
create index if not exists idx_design_sessions_room_number on public.design_sessions(room_id, session_number);

alter table public.design_sessions enable row level security;

do $$ begin
  create policy "design_sessions_anon_insert" on public.design_sessions for insert to anon with check (true);
  create policy "design_sessions_anon_select" on public.design_sessions for select to anon using (true);
  create policy "design_sessions_anon_update" on public.design_sessions for update to anon using (true) with check (true);
exception when duplicate_object then null; end $$;

-- =========================
-- RESEARCH: Enhanced Tinder Swipes Tracking
-- =========================

create table if not exists public.enhanced_swipes (
  id bigserial primary key,
  user_hash text not null,
  session_context text not null, -- "core_profile" or room_id
  
  image_id text not null,
  image_metadata jsonb, -- {room_type, style, colors, materials, tags}
  
  direction text not null check (direction in ('left','right')),
  
  -- RESEARCH: Enhanced behavioral metrics
  reaction_time_ms int,
  dwell_time_ms int, -- how long looked before deciding
  hesitation_count int default 0, -- number of false starts
  swipe_velocity numeric, -- speed of swipe gesture
  
  decided_at timestamptz not null default now()
);

create index if not exists idx_enhanced_swipes_user on public.enhanced_swipes(user_hash);
create index if not exists idx_enhanced_swipes_context on public.enhanced_swipes(session_context);
create index if not exists idx_enhanced_swipes_decided on public.enhanced_swipes(decided_at desc);

alter table public.enhanced_swipes enable row level security;

do $$ begin
  create policy "enhanced_swipes_anon_insert" on public.enhanced_swipes for insert to anon with check (true);
  create policy "enhanced_swipes_anon_select" on public.enhanced_swipes for select to anon using (true);
exception when duplicate_object then null; end $$;

-- =========================
-- HELPER FUNCTIONS
-- =========================

-- Get user's complete profile with all households, rooms, and sessions
create or replace function get_user_complete_profile(p_user_hash text)
returns jsonb
language plpgsql
as $$
declare
  result jsonb;
begin
  select jsonb_build_object(
    'profile', row_to_json(up.*),
    'households', (
      select jsonb_agg(
        jsonb_build_object(
          'household', row_to_json(h.*),
          'rooms', (
            select jsonb_agg(
              jsonb_build_object(
                'room', row_to_json(r.*),
                'sessions', (
                  select jsonb_agg(row_to_json(ds.*) order by ds.session_number)
                  from public.design_sessions ds
                  where ds.room_id = r.id
                )
              )
            )
            from public.rooms r
            where r.household_id = h.id
          )
        )
      )
      from public.households h
      where h.user_hash = p_user_hash
    )
  ) into result
  from public.user_profiles up
  where up.user_hash = p_user_hash;
  
  return result;
end;
$$;

-- Check what user needs to complete (onboarding status)
create or replace function get_completion_status(p_user_hash text)
returns jsonb
language plpgsql
as $$
declare
  result jsonb;
  profile_complete boolean;
  household_count int;
  room_count int;
  session_count int;
begin
  -- Check if core profile exists and is complete
  select (profile_completed_at is not null) into profile_complete
  from public.user_profiles
  where user_hash = p_user_hash;
  
  -- Count households
  select count(*) into household_count
  from public.households
  where user_hash = p_user_hash;
  
  -- Count rooms
  select count(*) into room_count
  from public.rooms r
  join public.households h on r.household_id = h.id
  where h.user_hash = p_user_hash;
  
  -- Count design sessions
  select count(*) into session_count
  from public.design_sessions ds
  join public.rooms r on ds.room_id = r.id
  join public.households h on r.household_id = h.id
  where h.user_hash = p_user_hash;
  
  result := jsonb_build_object(
    'core_profile_complete', coalesce(profile_complete, false),
    'has_households', household_count > 0,
    'household_count', household_count,
    'room_count', room_count,
    'session_count', session_count,
    'next_step', case
      when not coalesce(profile_complete, false) then 'complete_profile'
      when household_count = 0 then 'add_household'
      when room_count = 0 then 'add_room'
      else 'ready'
    end
  );
  
  return result;
end;
$$;

-- Get next session number for a room
create or replace function get_next_session_number(p_room_id uuid)
returns int
language plpgsql
as $$
declare
  next_num int;
begin
  select coalesce(max(session_number), 0) + 1 into next_num
  from public.design_sessions
  where room_id = p_room_id;
  
  return next_num;
end;
$$;

-- =========================
-- MIGRATION HELPERS (backward compatibility)
-- =========================

-- Function to migrate old session data to new structure (optional, for existing users)
create or replace function migrate_legacy_session(p_user_hash text, p_session_json jsonb)
returns jsonb
language plpgsql
as $$
declare
  profile_id uuid;
  household_id uuid;
  room_id uuid;
  result jsonb;
begin
  -- This function can be called to convert old single-session data
  -- to new multi-session structure
  -- Implementation depends on what fields exist in old sessions table
  
  result := jsonb_build_object(
    'success', true,
    'message', 'Migration helper - implement based on legacy data structure'
  );
  
  return result;
end;
$$;

-- Add comments for documentation
comment on table public.user_profiles is 'Layer 1: Global user profile, answered once and reused across all rooms';
comment on table public.households is 'Layer 2: User''s physical spaces (home, office, etc) with social context';
comment on table public.rooms is 'Layer 3: Individual rooms within households, with room-specific data';
comment on table public.design_sessions is 'Layer 4: Design generation attempts per room, tracks evolution';
comment on table public.enhanced_swipes is 'Research: Enhanced Tinder-style swipe tracking with behavioral metrics';

