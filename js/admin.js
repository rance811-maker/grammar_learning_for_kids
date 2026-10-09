// 运营后台：调用数据库函数 gq_admin_stats（只有管理员能调），把结果画成图表。
// 建表和授权见 docs/analytics-setup.sql。
import { cloud, cloudEnabled, friendlyError } from './cloud.js';
import { NO_TRACK_KEY } from './analytics.js';

const $ = (id) => document.getElementById(id);
const NS = 'http://www.w3.org/2000/svg';

const ROUTE_NAMES = {
  map: '学习地图', unit: '关卡详情', discover: '发现', practice: '练习', mission: '任务',
  portfolio: '作品集', stats: '我的进度', placement: '摸底测试', review: '复习中心',
  account: '账号', parent: '家长专区', syllabus: '语法提纲', feedback: '意见反馈',
  about: '这是什么', install: '添加到桌面',
};
const SOURCE_NAMES = {
  direct: '直接打开', google: 'Google', baidu: '百度', bing: 'Bing', sogou: '搜狗', 360: '360 搜索',
  xhs: '小红书', wechat: '微信', qq: 'QQ', weibo: '微博', douyin: '抖音', zhihu: '知乎', github: 'GitHub',
};
const DEVICE_NAMES = { phone: '手机', tablet: '平板', desktop: '电脑' };
const COURSE_NAMES = { __pet__: 'PET', 'preset-ielts6': '雅思 6 分', 'preset-ielts7': '雅思 7 分' };

let days = 30;

// ---------- 小工具 ----------
function el(tag, attrs = {}, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') e.className = v;
    else if (k === 'style') e.style.cssText = v;
    else e.setAttribute(k, v);
  }
  for (const c of kids) e.append(c instanceof Node ? c : document.createTextNode(c ?? ''));
  return e;
}
function svg(tag, attrs = {}) {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  return e;
}
const n = (x) => Number(x) || 0;
const fmt = (x) => n(x).toLocaleString('zh-CN');
const pct = (a, b) => (b ? `${Math.round((a / b) * 100)}%` : '–');
function dur(sec) {
  sec = Math.round(n(sec));
  if (sec < 60) return `${sec} 秒`;
  const m = Math.floor(sec / 60), s = sec % 60;
  if (m < 60) return s ? `${m} 分 ${s} 秒` : `${m} 分`;
  return `${Math.floor(m / 60)} 小时 ${m % 60} 分`;
}
const shortDate = (d) => String(d).slice(5).replace('-', '/');
function when(ts) {
  if (!ts) return '–';
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return String(ts);
  const p = (x) => String(x).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}
// 纵轴刻度：步长取 1、2、5 × 10ⁿ 的整数，最多 4 格，人数和次数不会出现小数
function niceScale(v) {
  const raw = Math.max(1, v) / 4;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = Math.max(1, [1, 2, 5, 10].map((m) => m * mag).find((x) => x >= raw));
  return { step, max: step * Math.max(1, Math.ceil(v / step)) };
}
// 图表按容器的实际像素宽度画，文字始终是真实的 11px
const widthOf = (host) => Math.max(280, Math.round(host.getBoundingClientRect().width));
// 横轴标签：大约每 70px 一个，最后一个总是显示，太挤就去掉它前面那个
function labelIdx(count, width) {
  const every = Math.max(1, Math.ceil(count / Math.max(2, Math.floor(width / 70))));
  const idx = [];
  for (let i = 0; i < count; i += every) idx.push(i);
  if (idx[idx.length - 1] !== count - 1) {
    if (count - 1 - idx[idx.length - 1] < every * 0.6) idx.pop();
    idx.push(count - 1);
  }
  return new Set(idx);
}
function message(kind, ...parts) {
  const box = $('msg');
  box.replaceChildren();
  if (!kind) return;
  box.append(el('div', { class: `note ${kind}` }, ...parts));
}

// ---------- 提示框 ----------
function tipFor(card) {
  let t = card.querySelector('.tip');
  if (!t) { t = el('div', { class: 'tip', role: 'status' }); t.hidden = true; card.append(t); }
  return t;
}
function showTip(card, x, y, title, rows) {
  const t = tipFor(card);
  t.replaceChildren(el('b', {}, title), ...rows.map(([color, label, value]) =>
    el('div', { class: 'row' }, el('i', { style: `background:${color}` }), label, el('strong', {}, value))));
  t.hidden = false;
  const cw = card.clientWidth;
  const left = Math.min(Math.max(8, x + 12), cw - t.offsetWidth - 8);
  t.style.left = `${left}px`;
  t.style.top = `${Math.max(8, y - t.offsetHeight - 10)}px`;
}
const hideTip = (card) => { const t = card.querySelector('.tip'); if (t) t.hidden = true; };

// ---------- 折线图：每日访客 / 访问次数 ----------
function lineChart(host, rows, series) {
  host.replaceChildren();
  const W = widthOf(host), H = 220, L = 36, R = 14, T = 10, B = 26;
  const { step, max } = niceScale(Math.max(...rows.flatMap((r) => series.map((s) => n(r[s.key])))));
  const x = (i) => L + (rows.length === 1 ? (W - L - R) / 2 : (i * (W - L - R)) / (rows.length - 1));
  const y = (v) => T + (H - T - B) * (1 - v / max);
  const g = svg('svg', { class: 'chart', viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': '每日访客与访问次数折线图' });
  for (let v = 0; v <= max; v += step) {
    g.append(svg('line', { class: v ? 'gridline' : 'axis', x1: L, x2: W - R, y1: y(v), y2: y(v) }));
    const t = svg('text', { x: L - 6, y: y(v) + 4, 'text-anchor': 'end' }); t.textContent = fmt(v); g.append(t);
  }
  const show1 = labelIdx(rows.length, W - L - R);
  rows.forEach((r, i) => {
    if (!show1.has(i)) return;
    const anchor = i === rows.length - 1 && rows.length > 1 ? 'end' : i === 0 ? 'start' : 'middle';
    const t = svg('text', { x: x(i), y: H - 8, 'text-anchor': anchor }); t.textContent = shortDate(r.d); g.append(t);
  });
  for (const s of series) {
    const d = rows.map((r, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(n(r[s.key])).toFixed(1)}`).join(' ');
    g.append(svg('path', { d, fill: 'none', stroke: s.color, 'stroke-width': 2, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }));
    const last = rows.length - 1;
    g.append(svg('circle', { cx: x(last), cy: y(n(rows[last][s.key])), r: 4, fill: s.color, stroke: 'var(--card)', 'stroke-width': 2 }));
  }
  const cross = svg('line', { class: 'cross', y1: T, y2: H - B, visibility: 'hidden' });
  const dots = series.map((s) => svg('circle', { r: 4.5, fill: s.color, stroke: 'var(--card)', 'stroke-width': 2, visibility: 'hidden' }));
  g.append(cross, ...dots);
  const hit = svg('rect', { x: L, y: T, width: W - L - R, height: H - T - B, fill: 'transparent', tabindex: 0 });
  g.append(hit);
  host.append(g);
  const card = host.closest('.card');
  const pick = (clientX) => {
    const box = g.getBoundingClientRect();
    const vx = ((clientX - box.left) / box.width) * W;
    return Math.max(0, Math.min(rows.length - 1, Math.round(((vx - L) / (W - L - R)) * (rows.length - 1))));
  };
  const show = (i) => {
    const r = rows[i];
    cross.setAttribute('x1', x(i)); cross.setAttribute('x2', x(i)); cross.setAttribute('visibility', 'visible');
    dots.forEach((d, k) => { d.setAttribute('cx', x(i)); d.setAttribute('cy', y(n(r[series[k].key]))); d.setAttribute('visibility', 'visible'); });
    const box = g.getBoundingClientRect(), cb = card.getBoundingClientRect();
    showTip(card, box.left - cb.left + (x(i) / W) * box.width, box.top - cb.top + 20, r.d,
      series.map((s) => [s.color, s.name, fmt(r[s.key])]));
  };
  let cur = rows.length - 1;
  hit.addEventListener('pointermove', (e) => { cur = pick(e.clientX); show(cur); });
  hit.addEventListener('pointerleave', () => { hideTip(card); cross.setAttribute('visibility', 'hidden'); dots.forEach((d) => d.setAttribute('visibility', 'hidden')); });
  hit.addEventListener('focus', () => show(cur));
  hit.addEventListener('blur', () => hideTip(card));
  hit.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') { cur = Math.max(0, cur - 1); show(cur); }
    if (e.key === 'ArrowRight') { cur = Math.min(rows.length - 1, cur + 1); show(cur); }
  });
  host.append(dataTable(['日期', ...series.map((s) => s.name)], rows.map((r) => [r.d, ...series.map((s) => fmt(r[s.key]))])));
}

// ---------- 柱状图：单系列或两系列并排 ----------
function barChart(host, labels, series, { ariaLabel, valueFmt = fmt } = {}) {
  host.replaceChildren();
  const W = widthOf(host), H = 190, L = 36, R = 8, T = 10, B = 26;
  const { step, max } = niceScale(Math.max(...series.flatMap((s) => s.values.map(n))));
  const y = (v) => T + (H - T - B) * (1 - v / max);
  const slot = (W - L - R) / labels.length;
  const gap = 2, groupW = Math.min(slot * 0.72, 46), bw = (groupW - gap * (series.length - 1)) / series.length;
  const g = svg('svg', { class: 'chart', viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': ariaLabel });
  for (let v = 0; v <= max; v += step) {
    g.append(svg('line', { class: v ? 'gridline' : 'axis', x1: L, x2: W - R, y1: y(v), y2: y(v) }));
    const t = svg('text', { x: L - 6, y: y(v) + 4, 'text-anchor': 'end' }); t.textContent = fmt(v); g.append(t);
  }
  const show1 = labelIdx(labels.length, W - L - R);
  const card = host.closest('.card');
  labels.forEach((lab, i) => {
    const gx = L + slot * i + (slot - groupW) / 2;
    series.forEach((s, k) => {
      const v = n(s.values[i]);
      if (!v) return;
      const top = y(v), h = Math.max(1, y(0) - top), r = Math.min(4, bw / 2, h);
      const bx = gx + k * (bw + gap);
      g.append(svg('path', { fill: s.color,
        d: `M${bx} ${y(0)} V${top + r} Q${bx} ${top} ${bx + r} ${top} H${bx + bw - r} Q${bx + bw} ${top} ${bx + bw} ${top + r} V${y(0)} Z` }));
    });
    if (show1.has(i)) {
      const t = svg('text', { x: L + slot * i + slot / 2, y: H - 8, 'text-anchor': 'middle' }); t.textContent = lab; g.append(t);
    }
    const hit = svg('rect', { x: L + slot * i, y: T, width: slot, height: H - T - B, fill: 'transparent', tabindex: 0 });
    const show = () => {
      const box = g.getBoundingClientRect(), cb = card.getBoundingClientRect();
      showTip(card, box.left - cb.left + ((L + slot * i + slot / 2) / W) * box.width, box.top - cb.top + 20, lab,
        series.map((s) => [s.color, s.name, valueFmt(s.values[i])]));
    };
    hit.addEventListener('pointerenter', show);
    hit.addEventListener('focus', show);
    hit.addEventListener('pointerleave', () => hideTip(card));
    hit.addEventListener('blur', () => hideTip(card));
    g.append(hit);
  });
  host.append(g);
  host.append(dataTable(['', ...series.map((s) => s.name)], labels.map((lab, i) => [lab, ...series.map((s) => valueFmt(s.values[i]))])));
}

// ---------- 横向条形列表（来源、设备、页面、漏斗）----------
function barList(host, items, { total, showPct = true } = {}) {
  host.replaceChildren();
  if (!items.length || items.every((it) => !n(it.n))) { host.append(el('div', { class: 'empty' }, '还没有数据')); return; }
  const max = Math.max(...items.map((it) => n(it.n)), 1);
  const sum = total ?? items.reduce((a, it) => a + n(it.n), 0);
  host.append(el('div', { class: 'bars' }, ...items.map((it) => el('div', { class: 'bar' },
    el('span', { class: 'lab', title: it.label }, it.label),
    el('span', { class: 'track' }, el('span', { class: 'fill', style: `width:${(n(it.n) / max) * 100}%;display:block` })),
    el('span', { class: 'num' }, fmt(it.n), showPct ? el('small', {}, pct(n(it.n), sum)) : '')))));
}

function dataTable(head, rows) {
  const d = el('details', { class: 'data' }, el('summary', {}, '查看数据表'));
  const t = el('table', {}, el('thead', {}, el('tr', {}, ...head.map((h, i) => el('th', { class: i ? 'num' : '' }, h)))),
    el('tbody', {}, ...rows.map((r) => el('tr', {}, ...r.map((c, i) => el('td', { class: i ? 'num' : '' }, String(c)))))));
  d.append(el('div', { class: 'tablewrap' }, t));
  return d;
}

// ---------- 渲染 ----------
function render(data) {
  $('dash').hidden = false;   // 先显示出来，图表才量得到容器宽度
  const t = data.totals || {};
  const kpis = [
    ['访客', fmt(t.visitors), `其中 ${fmt(t.returning)} 位来过不止一天`],
    ['访问次数', fmt(t.sessions), `页面访问 ${fmt(t.pageviews)} 次`],
    ['平均停留', dur(t.avg_dur), `中位数 ${dur(t.median_dur)} · 10 秒内离开 ${pct(n(t.bounce), n(t.sessions))}`],
    ['新注册', fmt(t.users_new), `累计注册 ${fmt(t.users_all)} 人`],
    ['完成练习', fmt(t.practice), `已登录用户学习记录 ${fmt(t.practice_hist)} 次`],
    ['完成摸底', fmt(t.placement_done), `桌面图标打开 ${fmt(t.pwa_sessions)} 次 · 新装 ${fmt(t.installs)}`],
  ];
  $('kpis').replaceChildren(...kpis.map(([k, v, d]) => el('div', { class: 'kpi' }, el('div', { class: 'k' }, k), el('div', { class: 'v' }, v), el('div', { class: 'd' }, d))));

  const daily = data.daily || [];
  lineChart($('chartVisits'), daily, [
    { key: 'uv', name: '访客', color: 'var(--s1)' },
    { key: 'sessions', name: '访问次数', color: 'var(--s2)' },
  ]);
  const labels = daily.map((r) => shortDate(r.d));
  barChart($('chartPractice'), labels, [
    { name: '埋点', color: 'var(--s1)', values: daily.map((r) => r.practice) },
    { name: '学习记录', color: 'var(--s2)', values: daily.map((r) => r.practice_hist) },
  ], { ariaLabel: '每日练习次数柱状图' });
  barChart($('chartSignups'), labels, [{ name: '新注册', color: 'var(--s1)', values: daily.map((r) => r.signups) }],
    { ariaLabel: '每日新注册柱状图' });
  const dw = data.dwell || {};
  const dwKeys = Object.keys(dw).sort((a, b) => ['<10秒', '10秒–1分', '1–3分', '3–10分', '10–30分', '30分以上'].indexOf(a)
    - ['<10秒', '10秒–1分', '1–3分', '3–10分', '10–30分', '30分以上'].indexOf(b));
  barChart($('chartDwell'), dwKeys, [{ name: '访问次数', color: 'var(--s1)', values: dwKeys.map((k) => dw[k]) }],
    { ariaLabel: '停留时长分布柱状图' });

  const f = data.funnel || {};
  barList($('funnel'), [
    { label: '来访', n: f.visitors },
    { label: '打开摸底测试', n: f.placement_start },
    { label: '完成摸底', n: f.placement_done },
    { label: '完成至少一关', n: f.practice_done },
    { label: '注册账号', n: f.signup },
  ], { total: n(f.visitors) });

  barList($('sources'), (data.sources || []).map((s) => ({ label: SOURCE_NAMES[s.src] || s.src, n: s.n })));
  barList($('devices'), (data.devices || []).map((s) => ({ label: DEVICE_NAMES[s.device] || s.device, n: s.n })));
  barList($('routes'), (data.routes || []).map((s) => ({ label: ROUTE_NAMES[s.route] || s.route, n: s.n })));

  const users = data.users || [];
  $('usersSub').textContent = `共 ${fmt(t.users_all)} 人，按注册时间从新到旧${users.length < n(t.users_all) ? `，显示最近 ${users.length} 人` : ''}。「最近来访」只在埋点上线后才有。`;
  const head = ['账号', '名字', '注册时间', '最近登录', '最近来访', '最近练习', '练习次数', '积分', '连续天数', '摸底', '当前课程'];
  $('users').replaceChildren(
    el('thead', {}, el('tr', {}, ...head.map((h, i) => el('th', { class: i >= 6 && i <= 8 ? 'num' : '' }, h)))),
    el('tbody', {}, ...users.map((u) => el('tr', {},
      el('td', {}, u.email || '–'),
      el('td', {}, u.name || '–'),
      el('td', {}, when(u.created_at)),
      el('td', {}, when(u.last_sign_in_at)),
      el('td', {}, when(u.last_seen)),
      el('td', {}, u.last_practice || '–'),
      el('td', { class: 'num' }, fmt(u.sessions_total)),
      el('td', { class: 'num' }, fmt(u.score)),
      el('td', { class: 'num' }, fmt(u.streak)),
      el('td', {}, el('span', { class: `pill${u.placement === 'true' ? ' on' : ''}` }, u.placement === 'true' ? '已完成' : '未完成')),
      el('td', {}, u.course ? (COURSE_NAMES[u.course] || '自定义课程') : (u.email ? 'PET' : '–')),
    ))),
  );

  const first = data.first_event_at;
  $('foot').textContent = `统计时间：${data.from} 至 ${data.to}（北京 / 新加坡时间）· 生成于 ${when(data.generated_at)}`
    + (first ? ` · 访问数据从 ${when(first)} 开始记录` : '');
  if (!first) {
    message('warn', '还没有访问数据。访问、停留和练习埋点在网站更新上线后才开始记录；注册用户和他们存在云端的学习记录已经可以看到。');
  } else {
    message(null);
  }
}

let lastData = null;
let resizeTimer = null;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => { if (lastData && !$('dash').hidden) render(lastData); }, 150);
});

async function load() {
  $('refresh').disabled = true;
  try {
    const data = await cloud.rpc('gq_admin_stats', { p_days: days });
    lastData = data;
    render(data);
    // 管理员第一次打开后台时，自动把这台设备排除出统计，免得自己的访问混进数据
    try {
      if (localStorage.getItem(NO_TRACK_KEY) === null) { localStorage.setItem(NO_TRACK_KEY, '1'); $('notrack').checked = true; }
    } catch { /* ignore */ }
  } catch (e) {
    const m = String(e.message || e);
    $('dash').hidden = true;
    if (m === 'NO_SESSION') { showLogin(); return; }
    if (/forbidden/i.test(m)) {
      message('err', '这个账号不是管理员。请在 Supabase 的 SQL Editor 里把它加进 gq_admins 表（做法见 docs/analytics-setup.sql 开头），或者退出换管理员账号登录。');
    } else if (/gq_admin_stats|could not find the function|PGRST202|404/i.test(m)) {
      message('err', '数据库里还没有统计函数。请先在 Supabase 的 SQL Editor 里运行 docs/analytics-setup.sql。');
    } else {
      message('err', `读取数据失败：${friendlyError(e)}（${m.slice(0, 120)}）`);
    }
  } finally {
    $('refresh').disabled = false;
  }
}

function showLogin() {
  $('loginForm').hidden = false;
  $('dash').hidden = true;
  $('logout').hidden = true;
  $('who').textContent = '';
}

function showUser() {
  const u = cloud.currentUser();
  $('loginForm').hidden = true;
  $('logout').hidden = false;
  $('who').textContent = u?.email ? `· ${u.email}` : '';
}

function init() {
  try { $('notrack').checked = localStorage.getItem(NO_TRACK_KEY) === '1'; } catch { /* ignore */ }
  $('notrack').addEventListener('change', (e) => {
    try { e.target.checked ? localStorage.setItem(NO_TRACK_KEY, '1') : localStorage.setItem(NO_TRACK_KEY, '0'); } catch { /* ignore */ }
  });
  $('range').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-days]');
    if (!b) return;
    days = Number(b.dataset.days);
    $('range').querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    load();
  });
  $('refresh').addEventListener('click', load);
  $('logout').addEventListener('click', async () => { await cloud.signOut(); showLogin(); message(null); });
  $('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    $('loginBtn').disabled = true;
    try {
      await cloud.signIn($('email').value.trim(), $('password').value);
      showUser();
      await load();
    } catch (err) {
      message('err', friendlyError(err));
    } finally {
      $('loginBtn').disabled = false;
    }
  });

  if (!cloudEnabled()) { message('err', '没有配置 Supabase，后台无法使用。'); return; }
  if (cloud.hasSession()) { showUser(); load(); } else showLogin();
}

init();
