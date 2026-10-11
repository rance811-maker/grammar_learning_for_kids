// 匿名访问与使用统计，写进 Supabase 的 gq_events 表（建表见 docs/analytics-setup.sql）。
//
// 记什么：随机生成的访客编号、一次访问的编号、页面名、设备类型、来源、
// 是否从桌面图标打开，以及完成摸底 / 完成一关时的单元和对错数。
// 不记什么：姓名、邮箱、答题内容、IP。登录用户会带上账号 id，用来在后台看
// 「这个账号最近一次来是什么时候」。
//
// 停留时长靠心跳估算：页面在前台、且最近 5 分钟内有过操作时，每分钟记一次。
// 一次访问的时长 = 最后一个事件 - 第一个事件。标签页开着人走了不会一直算下去。
//
// 只在正式域名上记，本机开发、PR 预览、自动化测试都不记。
// 管理后台可以把「本机不计入统计」打开，自己的访问就不会混进数据里。
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './supabaseConfig.js';
import { cloud, cloudEnabled } from './cloud.js';

const PROD_HOSTS = ['www.grammar-quest.net', 'grammar-quest.net'];
const VID_KEY = 'gq-vid';
const SESSION_KEY = 'gq-visit';
export const NO_TRACK_KEY = 'gq-no-track';

const SESSION_IDLE_MS = 30 * 60 * 1000;   // 30 分钟没动静，算新的一次访问
const HEARTBEAT_MS = 60 * 1000;
const ACTIVE_WINDOW_MS = 5 * 60 * 1000;   // 5 分钟没操作，就不再算停留
const FLUSH_DELAY_MS = 5000;

let enabled = false;
let queue = [];
let flushTimer = null;
let lastActive = Date.now();
let lastView = { key: '', at: 0 };

function lsGet(k) { try { return localStorage.getItem(k); } catch { return null; } }
function lsSet(k, v) { try { localStorage.setItem(k, v); } catch { /* 无痕模式存不了就算了 */ } }

function randomId() {
  const raw = (crypto.randomUUID ? crypto.randomUUID() : `${Math.random()}${Date.now()}`).replace(/[^a-z0-9]/gi, '');
  return raw.slice(0, 24);
}

function visitorId() {
  let v = lsGet(VID_KEY);
  if (!v || v.length < 8) { v = randomId(); lsSet(VID_KEY, v); }
  return v;
}

function device() {
  const ua = navigator.userAgent;
  if (/iPad|Tablet/i.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) return 'tablet';
  if (/iPhone|Android.+Mobile|Mobile/i.test(ua)) return 'phone';
  if (/Android/i.test(ua)) return 'tablet';
  return 'desktop';
}

function standalone() {
  return matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
}

// 这次访问从哪来。优先看链接参数（?from=xhs），其次看 App 内置浏览器，最后看上一个网址。
export function sourceOf(search, referrer, ua, host) {
  const q = new URLSearchParams(search || '');
  const tag = q.get('from') || q.get('utm_source');
  if (tag) return tag.toLowerCase().replace(/[^a-z0-9_.-]/g, '').slice(0, 40) || 'tagged';
  if (/MicroMessenger/i.test(ua)) return 'wechat';
  if (/XiaoHongShu/i.test(ua)) return 'xhs';
  if (/\bQQ\//i.test(ua)) return 'qq';
  if (/Weibo/i.test(ua)) return 'weibo';
  if (/aweme|BytedanceWebview/i.test(ua)) return 'douyin';
  let ref = '';
  try { ref = referrer ? new URL(referrer).hostname.replace(/^www\./, '') : ''; } catch { ref = ''; }
  if (!ref || ref === host.replace(/^www\./, '')) return 'direct';
  const known = [
    [/google\./, 'google'], [/baidu\.com/, 'baidu'], [/bing\.com/, 'bing'], [/sogou\.com/, 'sogou'],
    [/so\.com/, '360'], [/xiaohongshu\.com|xhslink\.com/, 'xhs'], [/weixin\.qq\.com|wx\.qq\.com/, 'wechat'],
    [/douyin\.com/, 'douyin'], [/zhihu\.com/, 'zhihu'], [/github\.com/, 'github'],
  ];
  for (const [re, name] of known) if (re.test(ref)) return name;
  return ref.slice(0, 60);
}

// 一次访问：多个标签页共用，30 分钟没动静就换一个新的
function session() {
  const now = Date.now();
  let s = null;
  try { s = JSON.parse(lsGet(SESSION_KEY)); } catch { s = null; }
  if (!s || !s.id || now - s.last > SESSION_IDLE_MS) {
    s = { id: randomId(), src: sourceOf(location.search, document.referrer, navigator.userAgent, location.hostname) };
  }
  s.last = now;
  lsSet(SESSION_KEY, JSON.stringify(s));
  return s;
}

export function track(kind, { route = null, props = null } = {}) {
  if (!enabled) return;
  const s = session();
  queue.push({
    vid: visitorId(),
    sid: s.id,
    uid: cloud.currentUser()?.id || null,
    kind,
    route: route ? String(route).slice(0, 40) : null,
    device: device(),
    src: s.src,
    pwa: standalone(),
    props,
    t: Date.now(),
  });
  if (!flushTimer) flushTimer = setTimeout(() => flush(false), FLUSH_DELAY_MS);
}

// 每次路由切换记一次页面访问。同一个地址 2 秒内重复渲染（比如云端同步完重画）不重复记。
export function trackView(route, params = []) {
  const key = `${route}/${params.join('/')}`;
  const now = Date.now();
  if (key === lastView.key && now - lastView.at < 2000) return;
  lastView = { key, at: now };
  const p = params.slice(0, 2).join('/');
  track('page_view', { route: route || 'map', props: p ? { p: p.slice(0, 40) } : null });
}

function flush(keepalive) {
  clearTimeout(flushTimer);
  flushTimer = null;
  if (!queue.length) return;
  const now = Date.now();
  const rows = queue.splice(0).map(({ t, ...r }) => ({ ...r, lag_ms: Math.min(3600000, Math.max(0, now - t)) }));
  // 带账号 id 的行必须用这个账号的令牌写；令牌过期了就去掉账号 id，用匿名身份写，数照样算
  const token = cloud.peekAccessToken();
  if (!token) rows.forEach((r) => { r.uid = null; });
  fetch(`${SUPABASE_URL}/rest/v1/gq_events`, {
    method: 'POST',
    keepalive,
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${token || SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify(rows),
  }).catch(() => { /* 统计失败不影响使用 */ });
}

export function initAnalytics() {
  const onProd = PROD_HOSTS.includes(location.hostname);
  enabled = cloudEnabled()
    && (onProd || window.__GQ_TRACK_FORCE === true)
    && (!navigator.webdriver || window.__GQ_TRACK_FORCE === true)
    && lsGet(NO_TRACK_KEY) !== '1';
  if (!enabled) return;

  const touch = () => { lastActive = Date.now(); };
  ['pointerdown', 'keydown', 'scroll', 'touchstart'].forEach((ev) =>
    window.addEventListener(ev, touch, { passive: true, capture: true }));

  setInterval(() => {
    if (document.visibilityState === 'visible' && Date.now() - lastActive < ACTIVE_WINDOW_MS) track('heartbeat');
  }, window.__GQ_HEARTBEAT_MS || HEARTBEAT_MS);

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flush(true);
    else touch();
  });
  window.addEventListener('pagehide', () => flush(true));
}
