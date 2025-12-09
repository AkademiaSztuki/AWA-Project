-- Spaces & Space Images (persistent storage)
-- Creates relational tables, storage bucket and RPC helpers for spaces/images
-- Idempotent where possible

-- Ensure required extension
create extension if not exists "pgcrypto";

-- ================
-- TABLE: spaces
-- ================
create table if not exists public.spaces (
  id uuid primary key default gen_random_uuid(),
  user_hash text not null,
  name text not null,
  type text default 'personal',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint fk_spaces_user_hash foreign key (user_hash) references public.user_profiles(user_hash) on delete cascade
);

create index if not exists idx_spaces_user_hash on public.spaces(user_hash);
create index if not exists idx_spaces_created on public.spaces(created_at desc);

alter table public.spaces enable row level security;

-- RLS: allow anon/auth, scoped by user_hash when claim present
do $$ begin
  create policy "spaces_select_owner" on public.spaces
    for select to anon, authenticated
    using (coalesce(current_setting('request.jwt.claims.user_hash', true), user_hash) = user_hash);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "spaces_insert_owner" on public.spaces
    for insert to anon, authenticated
    with check (coalesce(current_setting('request.jwt.claims.user_hash', true), user_hash) = user_hash);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "spaces_update_owner" on public.spaces
    for update to anon, authenticated
    using (coalesce(current_setting('request.jwt.claims.user_hash', true), user_hash) = user_hash)
    with check (coalesce(current_setting('request.jwt.claims.user_hash', true), user_hash) = user_hash);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "spaces_delete_owner" on public.spaces
    for delete to anon, authenticated
    using (coalesce(current_setting('request.jwt.claims.user_hash', true), user_hash) = user_hash);
exception when duplicate_object then null; end $$;

-- ================
-- TABLE: space_images
-- ================
create table if not exists public.space_images (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.spaces(id) on delete cascade,
  user_hash text not null,
  url text not null,
  thumbnail_url text,
  type text not null check (type in ('generated','inspiration')),
  tags jsonb,
  is_favorite boolean default false,
  source text,
  generation_set_id uuid,
  created_at timestamptz not null default now()
);

create index if not exists idx_space_images_space on public.space_images(space_id, created_at desc);
create index if not exists idx_space_images_user on public.space_images(user_hash, created_at desc);
create index if not exists idx_space_images_type on public.space_images(type);

alter table public.space_images enable row level security;

do $$ begin
  create policy "space_images_select_owner" on public.space_images
    for select to anon, authenticated
    using (coalesce(current_setting('request.jwt.claims.user_hash', true), user_hash) = user_hash);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "space_images_insert_owner" on public.space_images
    for insert to anon, authenticated
    with check (coalesce(current_setting('request.jwt.claims.user_hash', true), user_hash) = user_hash);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "space_images_update_owner" on public.space_images
    for update to anon, authenticated
    using (coalesce(current_setting('request.jwt.claims.user_hash', true), user_hash) = user_hash)
    with check (coalesce(current_setting('request.jwt.claims.user_hash', true), user_hash) = user_hash);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "space_images_delete_owner" on public.space_images
    for delete to anon, authenticated
    using (coalesce(current_setting('request.jwt.claims.user_hash', true), user_hash) = user_hash);
exception when duplicate_object then null; end $$;

-- ================
-- STORAGE BUCKET
-- ================
-- Bucket for space images (generated + inspirations)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'space-images',
  'space-images',
  true,
  52428800, -- 50MB
  array['image/jpeg','image/png','image/webp','image/gif','image/heic','image/heif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'space_images_insert_policy'
  ) then
    create policy space_images_insert_policy on storage.objects
      for insert to anon, authenticated
      with check (bucket_id = 'space-images');
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'space_images_select_policy'
  ) then
    create policy space_images_select_policy on storage.objects
      for select to anon, authenticated
      using (bucket_id = 'space-images');
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'space_images_update_policy'
  ) then
    create policy space_images_update_policy on storage.objects
      for update to anon, authenticated
      using (bucket_id = 'space-images')
      with check (bucket_id = 'space-images');
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'space_images_delete_policy'
  ) then
    create policy space_images_delete_policy on storage.objects
      for delete to anon, authenticated
      using (bucket_id = 'space-images');
  end if;
end $$;

-- ================
-- RPC HELPERS
-- ================
-- Get spaces with limited images
create or replace function public.get_spaces_with_images(
  p_user_hash text,
  p_limit_per_space int default 6,
  p_offset int default 0
) returns jsonb
language sql
stable
as $$
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'space', to_jsonb(s),
        'images',
          coalesce(
            (
              select jsonb_agg(to_jsonb(si) order by si.created_at desc)
              from (
                select *
                from public.space_images si
                where si.space_id = s.id
                order by si.created_at desc
                limit greatest(p_limit_per_space, 0)
                offset greatest(p_offset, 0)
              ) si
            ),
            '[]'::jsonb
          )
      )
    ),
    '[]'::jsonb
  )
  from public.spaces s
  where s.user_hash = p_user_hash;
$$;

-- Add a space and return the row
create or replace function public.add_space(
  p_user_hash text,
  p_name text,
  p_type text default 'personal'
) returns public.spaces
language plpgsql
security definer
set search_path = public
as $$
declare
  v_space public.spaces;
begin
  insert into public.spaces (user_hash, name, type)
  values (p_user_hash, p_name, coalesce(p_type, 'personal'))
  returning * into v_space;
  return v_space;
end;
$$;

-- Add images to a space (batch)
create or replace function public.add_space_images(
  p_user_hash text,
  p_space_id uuid,
  p_images jsonb -- [{url, thumbnail_url, type, tags, is_favorite, source, generation_set_id}]
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inserted jsonb;
begin
  insert into public.space_images (
    space_id,
    user_hash,
    url,
    thumbnail_url,
    type,
    tags,
    is_favorite,
    source,
    generation_set_id
  )
  select
    p_space_id,
    p_user_hash,
    (img->>'url')::text,
    (img->>'thumbnail_url')::text,
    coalesce(img->>'type','generated')::text,
    img->'tags',
    coalesce((img->>'is_favorite')::boolean, false),
    img->>'source',
    (img->>'generation_set_id')::uuid
  from jsonb_array_elements(p_images) as img
  where (img->>'url') is not null
  returning jsonb_agg(to_jsonb(space_images)) into v_inserted;

  return coalesce(v_inserted, '[]'::jsonb);
end;
$$;

-- Toggle favorite
create or replace function public.toggle_space_image_favorite(
  p_user_hash text,
  p_image_id uuid,
  p_is_favorite boolean
) returns public.space_images
language plpgsql
security definer
set search_path = public
as $$
declare
  v_img public.space_images;
begin
  update public.space_images
    set is_favorite = coalesce(p_is_favorite, false)
  where id = p_image_id
    and user_hash = p_user_hash
  returning * into v_img;

  return v_img;
end;
$$;

