-- ============================================================================
-- Grammar Quest · Supabase 账号系统建表脚本（v4：基于 Supabase Auth）
-- ----------------------------------------------------------------------------
-- 用法：Supabase 控制台 → SQL Editor → New query，把本文件整个粘贴进去，点 "Run"。
-- 可以重复运行：已有的表和用户数据原样保留，只补上缺的部分。
--
-- 运行时 Supabase 可能提示「包含破坏性操作」：指的是下面三句 drop policy，
-- 删掉的是权限规则（紧接着原样重建），不是数据。整段脚本在一个事务里执行，
-- 中途出错会整体撤销。
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

-- 学习数据表：id 直接引用 Auth 用户，删号时级联删除数据。
-- 以前这里先 drop table 再重建，已有注册用户时照着「可重复运行」再跑一次，
-- 所有人的学习进度都会被删光。现在只在表不存在时才建。
create table if not exists public.gq_profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  state      jsonb,
  updated_at timestamptz not null default now()
);

-- 家长专区密码的哈希（docs/parent-zone-setup.sql 也会加这一列，两边都写，哪个先跑都行）。
alter table public.gq_profiles add column if not exists parent_pin_hash text;

-- 打开行级安全。
alter table public.gq_profiles enable row level security;

-- 让登录用户(authenticated)能对表做读写（具体哪一行由下面的策略限制）。
grant select, insert, update on public.gq_profiles to authenticated;

-- 策略：每个人只能读/写/建自己的那一行。
-- 用 (select auth.uid())::uuid 显式声明类型，杜绝任何类型歧义。
-- create policy 没有 if not exists，所以先删同名策略再建，重复运行也不会报「已存在」。
drop policy if exists "gq_profiles_select_own" on public.gq_profiles;
create policy "gq_profiles_select_own" on public.gq_profiles
  for select to authenticated
  using ((select auth.uid())::uuid = id);

drop policy if exists "gq_profiles_insert_own" on public.gq_profiles;
create policy "gq_profiles_insert_own" on public.gq_profiles
  for insert to authenticated
  with check ((select auth.uid())::uuid = id);

drop policy if exists "gq_profiles_update_own" on public.gq_profiles;
create policy "gq_profiles_update_own" on public.gq_profiles
  for update to authenticated
  using ((select auth.uid())::uuid = id)
  with check ((select auth.uid())::uuid = id);
