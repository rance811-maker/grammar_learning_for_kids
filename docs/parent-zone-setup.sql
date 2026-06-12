-- ============================================================================
-- Grammar Quest · 家长专区建表脚本
-- 在 Supabase 控制台 → SQL Editor 运行此脚本（可重复运行）
-- ============================================================================

-- 1) gq_profiles 加 parent_pin_hash 列（如果还没有）
ALTER TABLE public.gq_profiles
  ADD COLUMN IF NOT EXISTS parent_pin_hash text;

-- 2) 课程包表
create table if not exists public.gq_course_packs (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references auth.users(id) on delete cascade,
  title       text not null,
  description text not null default '',
  questions   jsonb not null default '[]',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.gq_course_packs enable row level security;
grant select, insert, update, delete on public.gq_course_packs to authenticated;

do $$ begin
  if not exists (select 1 from pg_policies where policyname = 'course_packs_select_own') then
    create policy "course_packs_select_own" on public.gq_course_packs
      for select to authenticated using ((select auth.uid())::uuid = owner_id);
  end if;
  if not exists (select 1 from pg_policies where policyname = 'course_packs_insert_own') then
    create policy "course_packs_insert_own" on public.gq_course_packs
      for insert to authenticated with check ((select auth.uid())::uuid = owner_id);
  end if;
  if not exists (select 1 from pg_policies where policyname = 'course_packs_update_own') then
    create policy "course_packs_update_own" on public.gq_course_packs
      for update to authenticated
      using ((select auth.uid())::uuid = owner_id) with check ((select auth.uid())::uuid = owner_id);
  end if;
  if not exists (select 1 from pg_policies where policyname = 'course_packs_delete_own') then
    create policy "course_packs_delete_own" on public.gq_course_packs
      for delete to authenticated using ((select auth.uid())::uuid = owner_id);
  end if;
end $$;
