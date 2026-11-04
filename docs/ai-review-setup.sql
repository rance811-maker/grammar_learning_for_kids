-- ============================================================================
-- Grammar Quest · 作文批改用量表（配合云函数 supabase/functions/gq-review-writing）
-- ----------------------------------------------------------------------------
-- 每个账号每个自然月（北京时间）能免费批改几篇，上限由云函数里的 MONTHLY_LIMIT 决定；
-- 这里只负责按月计数。可以重复运行，不会删数据。
--
-- 「day」这一列存的是计数周期的第一天：现在按月计，存的是当月 1 号（北京时间）。
-- 想改回按天计，把下面两个函数里的 public.gq_ai_period() 改成按天的日期即可，表不用动。
-- ============================================================================

create table if not exists public.gq_ai_usage (
  user_id uuid not null references auth.users (id) on delete cascade,
  day     date not null,            -- 计数周期的第一天（按月计时 = 当月 1 号）
  kind    text not null default 'writing' check (length(kind) <= 20),
  used    integer not null default 0 check (used >= 0),
  primary key (user_id, day, kind)
);

alter table public.gq_ai_usage enable row level security;
revoke all on public.gq_ai_usage from anon, authenticated;

-- 用户只能看自己的用量（以后页面上要显示「本月还剩几篇」时用），不能改
grant select on public.gq_ai_usage to authenticated;
drop policy if exists "gq_ai_usage_select_own" on public.gq_ai_usage;
create policy "gq_ai_usage_select_own" on public.gq_ai_usage
  for select to authenticated
  using ((select auth.uid()) = user_id);

-- 当前计数周期：北京时间的当月 1 号
create or replace function public.gq_ai_period()
returns date
language sql
stable
set search_path = ''
as $$
  select date_trunc('month', now() at time zone 'Asia/Shanghai')::date;
$$;

-- 占用一次额度。返回占用后本月已用的次数；已到上限时返回 null（不加计数）。
-- 只给云函数（service_role）调用。
create or replace function public.gq_ai_take(p_user uuid, p_kind text, p_limit integer)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_day  date := public.gq_ai_period();
  v_used integer;
begin
  insert into public.gq_ai_usage (user_id, day, kind, used)
  values (p_user, v_day, p_kind, 1)
  on conflict (user_id, day, kind) do update
    set used = public.gq_ai_usage.used + 1
    where public.gq_ai_usage.used < p_limit
  returning used into v_used;
  return v_used;
end;
$$;

-- 批改没成功：退回本月的一次额度
create or replace function public.gq_ai_refund(p_user uuid, p_kind text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.gq_ai_usage
     set used = greatest(used - 1, 0)
   where user_id = p_user
     and kind = p_kind
     and day = public.gq_ai_period();
end;
$$;

revoke all on function public.gq_ai_period() from public, anon, authenticated;
revoke all on function public.gq_ai_take(uuid, text, integer) from public, anon, authenticated;
revoke all on function public.gq_ai_refund(uuid, text) from public, anon, authenticated;
grant execute on function public.gq_ai_period() to service_role;
grant execute on function public.gq_ai_take(uuid, text, integer) to service_role;
grant execute on function public.gq_ai_refund(uuid, text) to service_role;
