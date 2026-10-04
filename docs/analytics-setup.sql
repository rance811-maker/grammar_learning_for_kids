-- ============================================================================
-- Grammar Quest · 运营后台建表脚本（访问 / 停留 / 使用统计 + 管理员统计函数）
-- ----------------------------------------------------------------------------
-- 用法：Supabase 控制台 → SQL Editor → New query，把本文件整个粘贴进去，点 Run。
--       可以重复运行，不会删除已有数据。
--
-- 运行完还要做一步：把你自己的账号设为管理员（只需做一次）。
-- 在 SQL Editor 里单独运行下面这句，把 你的邮箱 换成你登录网站用的邮箱：
--
--   insert into public.gq_admins (user_id)
--   select id from auth.users where email = '你的邮箱'
--   on conflict do nothing;
--
-- 然后打开 网站地址/admin.html 登录即可看到后台。
--
-- 数据说明：
--   - gq_events 只记匿名的访问和使用事件：随机生成的访客编号、页面名、设备类型、
--     来源、练习的单元和对错数。不记姓名、不记答题内容、不记 IP。
--   - 网站任何人都只能往里「写」，不能「读」；只有管理员通过 gq_admin_stats() 看汇总。
-- ============================================================================

-- 1. 事件表 ------------------------------------------------------------------
create table if not exists public.gq_events (
  id         bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  vid        text not null check (length(vid) between 8 and 40),   -- 访客编号（浏览器里随机生成）
  sid        text not null check (length(sid) between 8 and 40),   -- 一次访问的编号（30 分钟无操作算新的一次）
  uid        uuid,                                                 -- 登录用户的账号 id，未登录为空
  kind       text not null check (kind in (
               'page_view', 'heartbeat', 'signup', 'login',
               'placement_done', 'practice_done', 'install')),
  route      text check (length(route) <= 40),
  device     text check (device in ('phone', 'tablet', 'desktop')),
  src        text check (length(src) <= 60),                        -- 来源：搜索引擎、微信、小红书、直接打开……
  pwa        boolean not null default false,                       -- 是否从桌面图标打开
  props      jsonb check (props is null or pg_column_size(props) <= 2000)
);

-- 浏览器每 5 秒才批量发送一次，同一批的行如果都用「写入时刻」，时间会挤在一起、停留时长算短。
-- 所以浏览器带上「这个事件发生在多少毫秒之前」，写入时用服务器时间减掉它。
-- 不直接用浏览器的时钟：用户电脑的时间可能是错的。
alter table public.gq_events add column if not exists lag_ms integer
  check (lag_ms is null or lag_ms between 0 and 3600000);

create or replace function public.gq_events_set_time()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.created_at := now() - make_interval(secs => coalesce(new.lag_ms, 0) / 1000.0);
  return new;
end;
$$;

drop trigger if exists gq_events_set_time on public.gq_events;
create trigger gq_events_set_time before insert on public.gq_events
  for each row execute function public.gq_events_set_time();

create index if not exists gq_events_created_at_idx on public.gq_events (created_at);
create index if not exists gq_events_sid_idx on public.gq_events (sid);
create index if not exists gq_events_uid_idx on public.gq_events (uid) where uid is not null;

alter table public.gq_events enable row level security;

-- 只给「写」的权限，不给「读」。
revoke all on public.gq_events from anon, authenticated;
grant insert on public.gq_events to anon, authenticated;

-- 写的时候，账号 id 只能填空或者填自己，不能冒充别人。
drop policy if exists "gq_events_insert" on public.gq_events;
create policy "gq_events_insert" on public.gq_events
  for insert to anon, authenticated
  with check (uid is null or uid = (select auth.uid()));

-- 2. 管理员名单 --------------------------------------------------------------
-- 打开了行级安全、又没有任何策略：网站上谁都读写不了，只能在 SQL Editor 里改。
create table if not exists public.gq_admins (
  user_id uuid primary key references auth.users (id) on delete cascade
);
alter table public.gq_admins enable row level security;
revoke all on public.gq_admins from anon, authenticated;

-- 3. 管理员统计函数 ----------------------------------------------------------
-- 以函数所有者的身份运行（security definer），所以能读 auth.users 和 gq_events；
-- 第一行就检查调用者是不是管理员，不是就直接报错。
create or replace function public.gq_admin_stats(p_days int default 30)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  tz    constant text := 'Asia/Shanghai';   -- 北京时间和新加坡时间同为 UTC+8
  today date;
  d0    date;
  since timestamptz;
  v_out jsonb;
begin
  if not exists (select 1 from public.gq_admins a where a.user_id = auth.uid()) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  p_days := least(greatest(coalesce(p_days, 30), 1), 365);
  today  := (now() at time zone tz)::date;
  d0     := today - (p_days - 1);
  since  := d0::timestamp at time zone tz;

  with ev as (
    select e.*, (e.created_at at time zone tz)::date as d
    from public.gq_events e
    where e.created_at >= since
  ),
  sess as (
    select e.sid,
           min(e.vid) as vid,
           (min(e.created_at) at time zone tz)::date as d,
           extract(epoch from max(e.created_at) - min(e.created_at))::int as dur,
           bool_or(e.pwa) as pwa,
           (array_agg(e.src order by e.created_at))[1] as src,
           (array_agg(e.device order by e.created_at))[1] as device,
           count(*) filter (where e.kind = 'page_view') as pages
    from ev e
    group by e.sid
  ),
  days as (
    select generate_series(d0, today, interval '1 day')::date as d
  ),
  hist as (   -- 已登录用户的学习记录（上线埋点之前的练习也能看到）
    select (h ->> 'date')::date as d, count(*) as n
    from public.gq_profiles p
    cross join lateral jsonb_array_elements(
      case when jsonb_typeof(p.state -> 'history') = 'array' then p.state -> 'history' else '[]'::jsonb end) h
    where (h ->> 'date') ~ '^\d{4}-\d{2}-\d{2}$' and (h ->> 'date') >= d0::text
    group by 1
  ),
  daily as (
    select days.d,
      (select count(distinct e.vid) from ev e where e.d = days.d)                              as uv,
      (select count(*) from sess s where s.d = days.d)                                          as sessions,
      (select count(*) from ev e where e.d = days.d and e.kind = 'page_view')                   as pv,
      (select count(*) from ev e where e.d = days.d and e.kind = 'practice_done')               as practice,
      (select coalesce(sum(h.n), 0) from hist h where h.d = days.d)                             as practice_hist,
      (select count(*) from auth.users u where (u.created_at at time zone tz)::date = days.d)   as signups,
      (select coalesce(round(avg(s.dur)), 0) from sess s where s.d = days.d and s.dur > 0)      as avg_dur
    from days
  ),
  visitor_days as (
    select e.vid, count(distinct e.d) as nd from ev e group by e.vid
  ),
  users as (
    select u.id, u.email, u.created_at, u.last_sign_in_at,
           u.raw_user_meta_data ->> 'display_name' as name,
           p.updated_at,
           case when jsonb_typeof(p.state -> 'history') = 'array'
                then jsonb_array_length(p.state -> 'history') else 0 end as sessions_total,
           p.state #>> '{player,totalScore}'       as score,
           p.state #>> '{player,currentStreak}'    as streak,
           p.state #>> '{player,lastPracticeDate}' as last_practice,
           p.state ->> 'placementCompleted'        as placement,
           p.state ->> 'activeCurriculumId'        as course,
           (select max(e.created_at) from public.gq_events e where e.uid = u.id) as last_seen
    from auth.users u
    left join public.gq_profiles p on p.id = u.id
    order by u.created_at desc
    limit 300
  )
  select jsonb_build_object(
    'days', p_days,
    'from', d0,
    'to', today,
    'generated_at', now(),
    'first_event_at', (select min(e.created_at) from public.gq_events e),
    'totals', jsonb_build_object(
      'users_all',      (select count(*) from auth.users),
      'users_new',      (select count(*) from auth.users u where u.created_at >= since),
      'visitors',       (select count(distinct e.vid) from ev e),
      'returning',      (select count(*) from visitor_days v where v.nd >= 2),
      'sessions',       (select count(*) from sess),
      'pageviews',      (select count(*) from ev e where e.kind = 'page_view'),
      'avg_dur',        (select coalesce(round(avg(s.dur)), 0) from sess s where s.dur > 0),
      'median_dur',     (select coalesce(round(percentile_cont(0.5) within group (order by s.dur)), 0) from sess s where s.dur > 0),
      'bounce',         (select count(*) from sess s where s.dur < 10),
      'pwa_sessions',   (select count(*) from sess s where s.pwa),
      'practice',       (select count(*) from ev e where e.kind = 'practice_done'),
      'practice_hist',  (select coalesce(sum(h.n), 0) from hist h),
      'placement_done', (select count(*) from ev e where e.kind = 'placement_done'),
      'installs',       (select count(*) from ev e where e.kind = 'install')
    ),
    'daily', (select jsonb_agg(to_jsonb(x) order by x.d) from daily x),
    'dwell', (select jsonb_build_object(
                '<10秒',     count(*) filter (where s.dur < 10),
                '10秒–1分',  count(*) filter (where s.dur >= 10 and s.dur < 60),
                '1–3分',     count(*) filter (where s.dur >= 60 and s.dur < 180),
                '3–10分',    count(*) filter (where s.dur >= 180 and s.dur < 600),
                '10–30分',   count(*) filter (where s.dur >= 600 and s.dur < 1800),
                '30分以上',  count(*) filter (where s.dur >= 1800))
              from sess s),
    'funnel', (select jsonb_build_object(
                 'visitors',        count(distinct e.vid),
                 'placement_start', count(distinct e.vid) filter (where e.kind = 'page_view' and e.route = 'placement'),
                 'placement_done',  count(distinct e.vid) filter (where e.kind = 'placement_done'),
                 'practice_done',   count(distinct e.vid) filter (where e.kind = 'practice_done'),
                 'signup',          count(distinct e.vid) filter (where e.kind = 'signup'))
               from ev e),
    'routes',  (select coalesce(jsonb_agg(jsonb_build_object('route', r.route, 'n', r.n) order by r.n desc), '[]'::jsonb)
                from (select coalesce(e.route, '?') as route, count(*) as n from ev e
                      where e.kind = 'page_view' group by 1 order by 2 desc limit 12) r),
    'sources', (select coalesce(jsonb_agg(jsonb_build_object('src', r.src, 'n', r.n) order by r.n desc), '[]'::jsonb)
                from (select coalesce(s.src, 'direct') as src, count(*) as n from sess s group by 1 order by 2 desc limit 12) r),
    'devices', (select coalesce(jsonb_agg(jsonb_build_object('device', r.device, 'n', r.n) order by r.n desc), '[]'::jsonb)
                from (select coalesce(s.device, '?') as device, count(*) as n from sess s group by 1) r),
    'users',   (select coalesce(jsonb_agg(to_jsonb(x)), '[]'::jsonb) from users x)
  ) into v_out;

  return v_out;
end;
$$;

revoke all on function public.gq_admin_stats(int) from public, anon;
grant execute on function public.gq_admin_stats(int) to authenticated;
