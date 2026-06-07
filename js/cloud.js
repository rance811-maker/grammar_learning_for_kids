// 云端客户端：对 Supabase 的 4 个安全函数(RPC)做一层薄封装。
// 不依赖任何 SDK，直接用 fetch 调 PostgREST 的 /rpc 接口。
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './supabaseConfig.js';

// 是否配置了云端。没配置时应用退化为纯本机模式。
export function cloudEnabled() {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}

// 把数据库函数抛出的错误码翻译成对小朋友友好的中文。
const ERROR_MESSAGES = {
  NAME_TAKEN: '这个名字已经被注册啦，换一个，或者直接登录吧～',
  EMPTY_NAME: '请先输入名字哦',
  WEAK_PASSWORD: '密码太短啦，至少要 3 个字符',
  NO_USER: '没有找到这个名字，先去注册一个吧～',
  BAD_PASSWORD: '密码不对哦，再想想？',
  AUTH: '登录已过期，请重新登录',
};

export function friendlyError(err) {
  const raw = String((err && err.message) || err || '');
  for (const code of Object.keys(ERROR_MESSAGES)) {
    if (raw.includes(code)) return ERROR_MESSAGES[code];
  }
  if (raw.includes('Failed to fetch') || raw.includes('NetworkError')) {
    return '网络连接不上，检查一下网络再试试～';
  }
  return '出了点小问题，请稍后再试';
}

async function rpc(fn, args) {
  if (!cloudEnabled()) throw new Error('CLOUD_DISABLED');
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(args),
  });

  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!res.ok) {
    const msg =
      (data && (data.message || data.error_description || data.error || data.hint)) ||
      text ||
      `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return data;
}

export const cloud = {
  register: (name, password) => rpc('kid_register', { p_name: name, p_password: password }),
  login: (name, password) => rpc('kid_login', { p_name: name, p_password: password }),
  load: (name, token) => rpc('kid_load', { p_name: name, p_token: token }),
  save: (name, token, state) => rpc('kid_save', { p_name: name, p_token: token, p_state: state }),
};
