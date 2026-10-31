-- ============================================================================
-- Grammar Quest · 作文批改用量表（配合云函数 supabase/functions/gq-review-writing）
-- ----------------------------------------------------------------------------
-- 每个账号每天（北京时间）能免费批改几篇，由云函数里的 DAILY_LIMIT 决定；
-- 这里只负责计数。可以重复运行，不会删数据。
-- ============================================================================

create table if not exists public.gq_ai_usage (
  user_id uuid not null references auth.users (id) on delete cascade,
  day     date not null,
  kind    text not null default 'writing' check (length(kind) <= 20),
  used    integer not null default 0 check (used >= 0),
  primary key (user_id, day, kind)
);

alter table public.gq_ai_usage enable row level security;
revoke all on public.gq_ai_usage from anon, authenticated;

-- 用户只能看自己的用量（以后页面上要显示「今天还剩几篇」时用），不能改
grant select on public.gq_ai_usage to authenticated;
drop policy if exists "gq_ai_usage_select_own" on public.gq_ai_usage;
create policy "gq_ai_usage_select_own" on public.gq_ai_usage
  for select to authenticated
  using ((select auth.uid()) = user_id);

-- 占用一次额度。返回占用后今天已用的次数；已到上限时返回 null（不加计数）。
-- 只给云函数（service_role）调用。
create or replace function public.gq_ai_take(p_user uuid, p_kind text, p_limit integer)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_day  date := (now() at time zone 'Asia/Shanghai')::date;
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

-- 批改没成功：退回今天的一次额度
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
     and day = (now() at time zone 'Asia/Shanghai')::date;
end;
$$;

revoke all on function public.gq_ai_take(uuid, text, integer) from public, anon, authenticated;
revoke all on function public.gq_ai_refund(uuid, text) from public, anon, authenticated;
grant execute on function public.gq_ai_take(uuid, text, integer) to service_role;
grant execute on function public.gq_ai_refund(uuid, text) to service_role;
