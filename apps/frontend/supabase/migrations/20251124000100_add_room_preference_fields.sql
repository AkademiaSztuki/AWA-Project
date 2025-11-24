-- Adds per-room preference metadata and richer activity context support

alter table if exists public.rooms
  add column if not exists preference_source text,
  add column if not exists room_preference_payload jsonb,
  add column if not exists activity_context jsonb;

comment on column public.rooms.preference_source is
  'Origin of room preferences: profile or questions';

comment on column public.rooms.room_preference_payload is
  'Raw answers captured during room setup preference selection';

comment on column public.rooms.activity_context is
  'Expanded activity metadata (frequency, time of day, mappings)';

