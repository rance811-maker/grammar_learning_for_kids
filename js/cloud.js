// 云端客户端：封装 Supabase Auth（注册/登录/找回密码）+ profiles 数据读写。
// 不依赖任何 SDK，直接用 fetch 调 Supabase 的 REST 接口。
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './supabaseConfig.js';

const AUTH = `${SUPABASE_URL}/auth/v1`;
const REST = `${SUPABASE_URL}/rest/v1`;
const SESSION_KEY = 'gq-session';

// 是否配置了云端。没配置时应用退化为纯本机模式。
export function cloudEnabled() {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}

// 把 Supabase 的错误码/消息翻译成对小朋友友好的中文。
export function friendlyError(err) {
  const raw = String((err && err.message) || err || '').toLowerCase();
  if (raw.includes('invalid login') || raw.includes('invalid_grant')) return '邮箱或密码不对哦，再想想？';
  if (raw.includes('already registered') || raw.includes('already been registered') || raw.includes('user_already_exists')) return '这个邮箱已经注册过啦，直接登录吧～';
  if (raw.includes('password should be at least') || raw.includes('weak') || raw.includes('at least 6')) return '密码太短啦，至少要 6 个字符';
  if (raw.includes('unable to validate email') || raw.includes('invalid email') || raw.includes('invalid format')) return '邮箱格式不太对，检查一下～';
  if (raw.includes('email not confirmed')) return '邮箱还没确认，请先去邮箱点确认链接～';
  if (raw.includes('for security purposes') || raw.includes('rate limit') || raw.includes('too many')) return '操作太频繁啦，等一小会儿再试～';
  if (raw.includes('failed to fetch') || raw.includes('networkerror')) return '网络连接不上，检查一下网络再试试～';
  return '出了点小问题，请稍后再试';
}

// --- 会话存取（localStorage） ---
function readSession() {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY));
  } catch {
    return null;
  }
}
function writeSession(s) {
  try {
    if (s) localStorage.setItem(SESSION_KEY, JSON.stringify(s));
    else localStorage.removeItem(SESSION_KEY);
  } catch {
    // ignore
  }
}
function sessionFromToken(r) {
  const u = r.user || {};
  return {
    access_token: r.access_token,
    refresh_token: r.refresh_token,
    expires_at: Date.now() + (r.expires_in ? r.expires_in * 1000 : 3600 * 1000),
    user: {
      id: u.id || '',
      email: u.email || '',
      display_name: (u.user_metadata && (u.user_metadata.display_name || u.user_metadata.name)) || '',
    },
  };
}

// --- 底层请求 ---
async function authFetch(path, { method = 'POST', body, token } = {}) {
  if (!cloudEnabled()) throw new Error('CLOUD_DISABLED');
  const headers = { apikey: SUPABASE_ANON_KEY, 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${AUTH}${path}`, {
    method,
    headers,
    body: body != null ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!res.ok) {
    const msg = (data && (data.msg || data.error_description || data.error || data.message)) || text || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return data;
}

// 取一个有效的 access token，必要时用 refresh token 续期。
async function validAccessToken() {
  let s = readSession();
  if (!s || !s.access_token) throw new Error('NO_SESSION');
  if (Date.now() < s.expires_at - 60000) return s.access_token;
  if (!s.refresh_token) throw new Error('NO_SESSION');
  const r = await authFetch('/token?grant_type=refresh_token', { body: { refresh_token: s.refresh_token } });
  const next = sessionFromToken(r);
  // refresh 响应可能不带 user，沿用旧的。
  if (!next.user.id && s.user) next.user = s.user;
  writeSession(next);
  return next.access_token;
}

async function restFetch(path, { method = 'GET', body, headers = {} } = {}) {
  const token = await validAccessToken();
  const res = await fetch(`${REST}${path}`, {
    method,
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...headers },
    body: body != null ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!res.ok) {
    const msg = (data && (data.message || data.hint || data.error)) || text || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return data;
}

export const cloud = {
  cloudEnabled,
  hasSession: () => Boolean(readSession() && readSession().access_token),
  currentUser: () => (readSession() ? readSession().user : null),

  // 注册。confirmed=true 表示已直接登录（项目关闭了邮箱确认）；
  // confirmed=false 表示需要去邮箱点确认链接后才能登录。
  async signUp(email, password, displayName) {
    const r = await authFetch('/signup', {
      body: { email, password, data: { display_name: displayName } },
    });
    if (r && r.access_token) {
      writeSession(sessionFromToken(r));
      return { confirmed: true };
    }
    return { confirmed: false };
  },

  async signIn(email, password) {
    const r = await authFetch('/token?grant_type=password', { body: { email, password } });
    writeSession(sessionFromToken(r));
    return readSession().user;
  },

  async signOut() {
    const s = readSession();
    if (s && s.access_token) {
      try { await authFetch('/logout', { token: s.access_token }); } catch { /* ignore */ }
    }
    writeSession(null);
  },

  // 发送找回密码邮件。redirectTo 必须在 Supabase 的 Redirect URLs 白名单里。
  recover(email, redirectTo) {
    const q = redirectTo ? `?redirect_to=${encodeURIComponent(redirectTo)}` : '';
    return authFetch(`/recover${q}`, { body: { email } });
  },

  // 用户点了邮件里的恢复链接后，把链接里的 token 作为当前会话。
  applyRecoverySession({ access_token, refresh_token }) {
    writeSession({
      access_token,
      refresh_token: refresh_token || '',
      expires_at: Date.now() + 3600 * 1000,
      user: { id: '', email: '', display_name: '' },
    });
  },

  // 修改当前登录用户的密码（用于找回流程的"设置新密码"）。
  async updatePassword(newPassword) {
    const token = await validAccessToken();
    const res = await fetch(`${AUTH}/user`, {
      method: 'PUT',
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: newPassword }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error((data && (data.msg || data.error_description || data.message)) || 'UPDATE_FAILED');
    return data;
  },

  // 拉取当前用户信息，刷新会话里的 user（找回流程拿到 id 用）。
  async fetchUser() {
    const token = await validAccessToken();
    const res = await fetch(`${AUTH}/user`, { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${token}` } });
    const u = await res.json().catch(() => null);
    if (!res.ok) throw new Error((u && (u.msg || u.message)) || 'USER_FETCH_FAILED');
    const s = readSession();
    s.user = {
      id: u.id || '',
      email: u.email || '',
      display_name: (u.user_metadata && (u.user_metadata.display_name || u.user_metadata.name)) || '',
    };
    writeSession(s);
    return s.user;
  },

  // 读取学习数据（profiles.state）。没有则返回 null。
  async loadState() {
    const u = readSession() && readSession().user;
    if (!u || !u.id) return null;
    const rows = await restFetch(`/profiles?id=eq.${u.id}&select=state`);
    return Array.isArray(rows) && rows[0] ? rows[0].state : null;
  },

  // 保存学习数据（upsert 到 profiles）。
  async saveState(state) {
    const u = readSession() && readSession().user;
    if (!u || !u.id) return;
    await restFetch('/profiles', {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: [{ id: u.id, state, updated_at: new Date().toISOString() }],
    });
  },
};
