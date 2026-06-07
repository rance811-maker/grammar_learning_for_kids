-- ============================================================================
-- Grammar Quest · Supabase 账号系统建表脚本（v3：基于 Supabase Auth）
-- ----------------------------------------------------------------------------
-- 用法：先把 SQL Editor 里的内容【全部清空】，再把本文件整个粘贴进去，点 "Run"。
-- 可以重复运行。
--
-- 说明：
--   - 注册/登录/找回密码都由 Supabase Auth 负责，找回密码邮件原生发送。
--   - 学习数据存在 gq_profiles 表（特意不叫 profiles，避开项目里已有的同名表）。
--   - 靠行级安全(RLS)保证：每个人只能读写自己的那一行。
--
-- 运行完还需要在控制台做两个设置（详见 docs/账号系统说明.md）：
--   1. Authentication -> URL Configuration -> Site URL 填站点网址
--   2. （建议）Authentication -> Providers -> Email -> 关闭 "Confirm email"
-- ============================================================================

-- 先删掉旧的（如果存在），保证下面重建的 id 一定是 uuid 类型。
-- 只会删除我们自己的表，不影响你项目里其它的表。
drop table if exists public.gq_profiles cascade;

-- 学习数据表：id 直接引用 Auth 用户，删号时级联删除数据。
create table public.gq_profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  state      jsonb,
  updated_at timestamptz not null default now()
);

-- 打开行级安全。
alter table public.gq_profiles enable row level security;

-- 让登录用户(authenticated)能对表做读写（具体哪一行由下面的策略限制）。
grant select, insert, update on public.gq_profiles to authenticated;

-- 策略：每个人只能读/写/建自己的那一行。
-- 用 (select auth.uid())::uuid 显式声明类型，杜绝任何类型歧义。
create policy "gq_profiles_select_own" on public.gq_profiles
  for select to authenticated
  using ((select auth.uid())::uuid = id);

create policy "gq_profiles_insert_own" on public.gq_profiles
  for insert to authenticated
  with check ((select auth.uid())::uuid = id);

create policy "gq_profiles_update_own" on public.gq_profiles
  for update to authenticated
  using ((select auth.uid())::uuid = id)
  with check ((select auth.uid())::uuid = id);
