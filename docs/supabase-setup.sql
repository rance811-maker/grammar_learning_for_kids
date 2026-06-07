-- ============================================================================
-- Grammar Quest · Supabase 账号系统建表脚本（v2：基于 Supabase Auth）
-- ----------------------------------------------------------------------------
-- 在 Supabase 控制台 -> SQL Editor 里，把本文件全部内容粘贴进去，点 "Run"。
-- 可以重复运行（幂等）。
--
-- 这一版改用 Supabase 自带的账号系统（Auth）：
--   - 注册/登录/找回密码都由 Supabase Auth 负责，找回密码邮件原生发送。
--   - 学习数据存在 profiles 表，每行对应一个账号(auth.users.id)。
--   - 靠行级安全(RLS)保证：每个人只能读写自己的那一行。
--
-- 运行完这段 SQL 后，还需要在控制台做两个设置（详见 docs/账号系统说明.md）：
--   1. Authentication -> URL Configuration -> Site URL 填成站点网址
--   2. （建议）Authentication -> Providers -> Email -> 关闭 "Confirm email"，
--      这样小朋友注册后可以立即开始玩。
-- ============================================================================

-- 学习数据表：id 直接引用 Auth 用户，删号时级联删除数据。
create table if not exists public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  state      jsonb,
  updated_at timestamptz not null default now()
);

-- 打开行级安全。
alter table public.profiles enable row level security;

-- 让登录用户(authenticated)能对 profiles 做读写（具体哪一行由下面的策略限制）。
grant select, insert, update on public.profiles to authenticated;

-- 策略：每个人只能读/写/建自己的那一行（auth.uid() = id）。
-- 先 drop 再 create，保证脚本可重复运行。
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- ----------------------------------------------------------------------------
-- 可选清理：v1 的自建账号表/函数已不再使用，可取消下面注释来删除它们。
-- ----------------------------------------------------------------------------
-- drop function if exists public.kid_register(text, text);
-- drop function if exists public.kid_login(text, text);
-- drop function if exists public.kid_load(text, text);
-- drop function if exists public.kid_save(text, text, jsonb);
-- drop table if exists public.kids;
