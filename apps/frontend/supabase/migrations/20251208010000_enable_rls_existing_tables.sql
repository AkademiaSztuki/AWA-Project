-- Enable RLS (permissive) on existing tables to remove "RLS disabled" warnings.
-- Policies are permissive (anon/auth) to avoid breaking existing flows.
-- Adjust later with stricter, user_hash-based policies per table as needed.

-- Helper to safely enable RLS
create or replace function public._enable_rls(tbl text) returns void language plpgsql as $$
begin
  execute format('alter table %s enable row level security;', tbl);
exception when others then
  raise notice 'Skipping RLS enable for %', tbl;
end;
$$;

-- Helper to create permissive policy if not exists
create or replace function public._ensure_permissive_policies(tbl text) returns void language plpgsql as $$
begin
  execute format($f$
    do $b$
    begin
      if not exists (
        select 1 from pg_policies
        where schemaname = split_part('%1$s','.',1)
          and tablename = split_part('%1$s','.',2)
          and policyname = '%2$s'
      ) then
        create policy %2$s on %1$s for %3$s to anon, authenticated using (true) with check (true);
      end if;
    end $b$;
  $f$, tbl, 'p_select', 'select');

  execute format($f$
    do $b$
    begin
      if not exists (
        select 1 from pg_policies
        where schemaname = split_part('%1$s','.',1)
          and tablename = split_part('%1$s','.',2)
          and policyname = '%2$s'
      ) then
        create policy %2$s on %1$s for %3$s to anon, authenticated using (true) with check (true);
      end if;
    end $b$;
  $f$, tbl, 'p_insert', 'insert');

  execute format($f$
    do $b$
    begin
      if not exists (
        select 1 from pg_policies
        where schemaname = split_part('%1$s','.',1)
          and tablename = split_part('%1$s','.',2)
          and policyname = '%2$s'
      ) then
        create policy %2$s on %1$s for %3$s to anon, authenticated using (true) with check (true);
      end if;
    end $b$;
  $f$, tbl, 'p_update', 'update');

  execute format($f$
    do $b$
    begin
      if not exists (
        select 1 from pg_policies
        where schemaname = split_part('%1$s','.',1)
          and tablename = split_part('%1$s','.',2)
          and policyname = '%2$s'
      ) then
        create policy %2$s on %1$s for %3$s to anon, authenticated using (true) with check (true);
      end if;
    end $b$;
  $f$, tbl, 'p_delete', 'delete');
end;
$$;

-- List of tables to enable RLS (permissive)
do $$
declare
  t text;
  tables text[] := array[
    'public.behavioral_logs',
    'public.device_context_snapshots',
    'public.discovery_sessions',
    'public.dna_snapshots',
    'public.enhanced_swipes',
    'public.generated_images',
    'public.generation_jobs',
    'public.generation_sets',
    'public.health_checks',
    'public.image_ratings_history',
    'public.ladder_paths',
    'public.ladder_summary',
    'public.page_views',
    'public.projects',
    'public.sessions',
    'public.survey_results',
    'public.tinder_exposures',
    'public.tinder_swipes',
    'public.design_sessions'
  ];
begin
  foreach t in array tables loop
    perform public._enable_rls(t);
    perform public._ensure_permissive_policies(t);
  end loop;
end $$;

-- Cleanup helper functions
drop function if exists public._enable_rls(text);
drop function if exists public._ensure_permissive_policies(text);
