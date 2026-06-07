-- ============================================================================
-- Grammar Quest · Supabase 账号系统建表脚本
-- ----------------------------------------------------------------------------
-- 在 Supabase 控制台 -> SQL Editor 里，把本文件全部内容粘贴进去，点 "Run"。
-- 只需要运行一次。运行后会创建：
--   1. kids 表（保存每个小朋友的账号和学习数据）
--   2. 4 个安全函数：注册 / 登录 / 读取 / 保存
--
-- 安全说明：
--   - 密码用 bcrypt 加密存储，数据库里看不到明文。
--   - kids 表开启了 RLS 且不开放任何直接读写策略，所以即使别人拿到
--     公开的 anon key，也无法直接读取别人的密码或数据。
--   - 所有访问都只能通过下面 4 个 SECURITY DEFINER 函数进行。
-- ============================================================================

-- 用于密码加密的扩展
create extension if not exists pgcrypto;

-- 账号表
create table if not exists public.kids (
  name          text primary key,
  password_hash text not null,
  token         text not null default gen_random_uuid()::text,
  state         jsonb,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- 锁住表：开启 RLS，且不创建任何策略 -> anon / authenticated 角色无法直接读写。
alter table public.kids enable row level security;
revoke all on public.kids from anon, authenticated;

-- ----------------------------------------------------------------------------
-- 注册：成功返回登录令牌(token)，名字已存在则报错 NAME_TAKEN
-- ----------------------------------------------------------------------------
create or replace function public.kid_register(p_name text, p_password text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_token text;
  v_name  text := trim(p_name);
begin
  if length(v_name) = 0 then
    raise exception 'EMPTY_NAME';
  end if;
  if length(coalesce(p_password, '')) < 3 then
    raise exception 'WEAK_PASSWORD';
  end if;
  if exists (select 1 from public.kids where lower(name) = lower(v_name)) then
    raise exception 'NAME_TAKEN';
  end if;
  v_token := gen_random_uuid()::text;
  insert into public.kids (name, password_hash, token)
  values (v_name, crypt(p_password, gen_salt('bf')), v_token);
  return v_token;
end;
$$;

-- ----------------------------------------------------------------------------
-- 登录：成功返回令牌(token)，否则报错 NO_USER / BAD_PASSWORD
-- ----------------------------------------------------------------------------
create or replace function public.kid_login(p_name text, p_password text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.kids%rowtype;
begin
  select * into v_row from public.kids where lower(name) = lower(trim(p_name));
  if not found then
    raise exception 'NO_USER';
  end if;
  if v_row.password_hash <> crypt(p_password, v_row.password_hash) then
    raise exception 'BAD_PASSWORD';
  end if;
  return v_row.token;
end;
$$;

-- ----------------------------------------------------------------------------
-- 读取学习数据：需要正确的 name + token
-- ----------------------------------------------------------------------------
create or replace function public.kid_load(p_name text, p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.kids%rowtype;
begin
  select * into v_row from public.kids where lower(name) = lower(trim(p_name));
  if not found or v_row.token <> p_token then
    raise exception 'AUTH';
  end if;
  return v_row.state;
end;
$$;

-- ----------------------------------------------------------------------------
-- 保存学习数据：需要正确的 name + token
-- ----------------------------------------------------------------------------
create or replace function public.kid_save(p_name text, p_token text, p_state jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.kids%rowtype;
begin
  select * into v_row from public.kids where lower(name) = lower(trim(p_name));
  if not found or v_row.token <> p_token then
    raise exception 'AUTH';
  end if;
  update public.kids
     set state = p_state, updated_at = now()
   where name = v_row.name;
end;
$$;

-- 只把这 4 个函数的执行权限开放给公开(anon)和登录(authenticated)角色。
grant execute on function public.kid_register(text, text)         to anon, authenticated;
grant execute on function public.kid_login(text, text)            to anon, authenticated;
grant execute on function public.kid_load(text, text)             to anon, authenticated;
grant execute on function public.kid_save(text, text, jsonb)      to anon, authenticated;
