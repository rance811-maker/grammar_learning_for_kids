/* 口语实战场的后端：一个函数带全部接口，路径 /.netlify/functions/api/<xxx>
 *
 * 这套代码原来是独立产品 Spoken Grammar（spoken-grammar.netlify.app），
 * 2026-11 并进 Grammar Quest 成为「🎙️ 口语实战场」。合并时后端只动了两处：
 * 身份从 Netlify Identity 换成 GQ 的 Supabase 账号，Blobs 的站点 id 改用 SG_SITE_ID
 * （数据还在原来那个站下面，没搬家）。其余逻辑原样照搬。
 *
 * 分工：
 *   - Deepgram 由这里发一张短命令牌，浏览器拿着它把录音直传 Deepgram
 *     （不走函数，因为函数请求体只有几 MB，一小时的课传不过来）
 *   - 调 Claude 的活**不在这里干**：普通云函数硬上限 30 秒，批改经常超。
 *     这里只负责建任务、触发 worker-background（上限 15 分钟）、回报进度。
 *   - 批改规则（ANALYZE_SYSTEM 等）在 shared.mjs 里，浏览器看不到
 *
 * 身份：见下面的 whoami()。
 *
 * speakgrammar/CLAUDE.md 里那些设计决定同样适用于这里。
 */

import {
  ASR_MODEL, LLM_MODEL, REWRITE_MODEL, CATS,
  QUOTA_RECORDINGS, QUOTA_MINUTES, QUOTA_REWRITES, MAX_ONE_MINUTES, MAX_CHUNKS,
  FREE_TOTAL, FREE_ONE_MINUTES, MONTHLY_BUDGET_USD, CONTACT,
  json, month, users, sessions, jobs, sessKey, jobKey,
  loadUser, usedNow, quotaView, chunk,
  isPaid, isOwner, freeUsed, planView, totalsGet, overBudget, tombKey,
} from "./lib/shared.mjs";

// 用完免费额度：不是报错，是引导去开通。402 让前端知道该显示开通页。
const upgradeMsg = () =>
  `免费体验的 ${FREE_TOTAL} 次用完了。想继续用，联系 ${CONTACT || "管理员"} 开通。`;

/* ------------------------------------------------------------------ 接口 */

// 中途关掉页面的任务记录会留下来，顺手清掉超过一天的
async function sweepJobs(sub) {
  try {
    const st = jobs();
    const { blobs } = await st.list({ prefix: `${sub}/` });
    if (blobs.length < 5) return;
    const cutoff = Date.now() - 24 * 3600 * 1000;
    for (const b of blobs) {
      const j = await st.get(b.key, { type: "json" });
      if (!j || Date.parse(j.updated || j.created || 0) < cutoff) await st.delete(b.key);
    }
  } catch { /* 清理失败无所谓 */ }
}

async function me(u, isAdmin) {
  return json(200, {
    email: u.email,
    activated: !!u.activated_at,
    admin: isAdmin,
    quota: quotaView(u),
    // 服务端 key 配没配好，前端用来给出人话提示而不是一个裸的 500
    configured: { asr: !!process.env.DEEPGRAM_API_KEY, llm: !!process.env.ANTHROPIC_API_KEY },
    model: LLM_MODEL,
    plan: planView(u),
    limits: { one_minutes: planView(u).one_minutes, chunks: MAX_CHUNKS },
  });
}

/* 邀请码是「只开放给朋友试用」那个阶段的产物。并进 Grammar Quest 之后，
   GQ 本来就是公开注册的，再加一道邀请码等于把自己的用户挡在门外。
   所以：没配 SG_INVITE_CODE = 不设门槛，谁登录谁能用，成本靠「3 次免费 +
   超了联系站长」和全站每月预算上限兜着。想重新收紧，把那个环境变量配上即可。*/
async function activate(sub, u, body) {
  const want = (process.env.SG_INVITE_CODE || "").trim().toLowerCase();
  if (!want) {
    u.activated_at = u.activated_at || new Date().toISOString();
    await users().setJSON(sub, u);
    return json(200, { ok: true, open: true });
  }
  const got = (body.code || "").trim().toLowerCase();
  if (!got) return json(400, { error: "邀请码是空的。" });
  // 大小写、首尾空格都不计，复制粘贴最容易带这些
  if (got !== want) return json(403, { error: "邀请码不对，跟分享链接给你的人再确认一下。" });
  u.activated_at = new Date().toISOString();
  await users().setJSON(sub, u);
  return json(200, { ok: true });
}

async function dgToken(sub, u, body) {
  const key = process.env.DEEPGRAM_API_KEY;
  if (!key) return json(503, { error: "服务端还没配置转写 key，管理员需要在 Netlify 里设置 DEEPGRAM_API_KEY。" });
  if (!isOwner(u) && await overBudget())
    return json(503, { error: "本月整站的用量额度用完了，下个月 1 号恢复。" +
      (CONTACT ? `急用可以联系 ${CONTACT}。` : "") });

  const c = usedNow(u);
  const paid = isPaid(u);
  const owner = isOwner(u);
  const oneMax = paid ? MAX_ONE_MINUTES : FREE_ONE_MINUTES;

  if (!paid && freeUsed(u) >= FREE_TOTAL) return json(402, { error: upgradeMsg(), upgrade: true });
  if (paid && !owner && c.recordings >= QUOTA_RECORDINGS)
    return json(429, { error: `本月的 ${QUOTA_RECORDINGS} 段额度用完了，下个月 1 号重置。` });

  const left = QUOTA_MINUTES - c.minutes;
  if (paid && !owner && left <= 0)
    return json(429, { error: `本月的 ${QUOTA_MINUTES} 分钟额度用完了，下个月 1 号重置。` });

  // 前端量到的时长。先拦住超额的，别等转写的钱花掉才发现
  const mins = Math.max(0, Number(body?.minutes) || 0);
  if (mins > oneMax)
    return json(413, { error: paid
      ? `单次最长 ${oneMax} 分钟，这段有 ${Math.round(mins)} 分钟。太长的录音分析跑不完，请先切成几段。`
      : `免费额度单次最长 ${oneMax} 分钟，这段有 ${Math.round(mins)} 分钟。`
        + `先切一段来试，或者联系 ${CONTACT || "管理员"} 开通。` });
  if (paid && !owner && mins > left)
    return json(429, { error: `这段有 ${Math.round(mins)} 分钟，本月只剩 ${Math.round(left)} 分钟额度。` });

  const r = await fetch("https://api.deepgram.com/v1/auth/grant", {
    method: "POST",
    headers: { Authorization: `Token ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ ttl_seconds: 600 }),   // 默认只有 30 秒，一小时的课传不完
  });
  const t = await r.text();
  if (!r.ok) return json(502, { error: `Deepgram 发令牌失败 ${r.status}：${t.slice(0, 300)}` });
  const d = JSON.parse(t);

  // 先扣一段，防止拿着令牌反复传。真实时长由后台任务完成时补记。
  u.used[month()] = { ...c, recordings: c.recordings + 1 };
  if (!paid) u.free = { ...(u.free || {}), analyses: freeUsed(u) + 1 };
  await users().setJSON(sub, u);
  return json(200, { token: d.access_token, expires_in: d.expires_in,
                     asr_model: ASR_MODEL, quota: quotaView(u) });
}

/* --------------------------------------------------------------- 后台任务 */

// 建任务 + 踢一脚后台函数。这里只做这两件事，必须在 30 秒内返回。
async function startJob(sub, email, host, job) {
  const secret = process.env.SG_JOB_SECRET;
  if (!secret) return json(500, { error: "服务端没设置 SG_JOB_SECRET，后台任务跑不起来。" });
  const id = (globalThis.crypto?.randomUUID?.() || String(Date.now() + Math.random())).slice(0, 36);
  await jobs().setJSON(jobKey(sub, id), {
    ...job, email, status: "queued", created: new Date().toISOString(), progress: null,
  });

  const r = await fetch(`https://${host}/.netlify/functions/worker-background`, {
    method: "POST",
    headers: { "x-job-secret": secret, "content-type": "application/json" },
    body: JSON.stringify({ sub, id }),
  });
  if (r.status !== 202 && !r.ok)
    return json(502, { error: `后台任务没起来（${r.status}）。稍后重试。` });
  return json(200, { job: id });
}

async function analyzeStart(sub, u, body, host) {
  if (!process.env.ANTHROPIC_API_KEY)
    return json(503, { error: "服务端还没配置批改 key。" });
  const s = body.session;
  if (!s || !s.hash || !Array.isArray(s.my_lines) || !s.my_lines.length)
    return json(400, { error: "没有要分析的内容。" });
  if (JSON.stringify(s).length > 4e6) return json(413, { error: "这节课的数据太大了。" });

  if (!isOwner(u) && await overBudget())
    return json(503, { error: "本月整站的用量额度用完了，下个月 1 号恢复。" });

  const c = usedNow(u);
  const paid = isPaid(u);
  // 批改任务本身也要记次数。否则可以绕过转写、拿自己编的文本反复刷模型。
  // 上限给几次余量，留给"批改失败重试"。
  const jobsDone = c.jobs || 0;
  const jobCap = isOwner(u) ? Infinity : (paid ? QUOTA_RECORDINGS : FREE_TOTAL) + 3;
  if (jobsDone >= jobCap)
    return json(429, { error: paid
      ? "本月的批改次数用完了，下个月 1 号重置。"
      : upgradeMsg(), upgrade: !paid });
  if (paid && !isOwner(u) && c.minutes >= QUOTA_MINUTES)
    return json(429, { error: `本月的 ${QUOTA_MINUTES} 分钟额度用完了，下个月 1 号重置。` });

  // 后台任务上限 15 分钟，段数太多跑不完，宁可在这里明确拒掉
  const n = chunk(s.my_lines).length;
  if (n > MAX_CHUNKS)
    return json(413, { error: `这段录音里你说了太多话（要分 ${n} 段送检，上限 ${MAX_CHUNKS} 段）。` +
      "请把录音切短一些再导入。" });

  u.used[month()] = { ...c, jobs: jobsDone + 1 };
  await users().setJSON(sub, u);
  return await startJob(sub, u.email, host, { type: "analyze", session: s, chunks: n });
}

async function rewriteStart(sub, u, body, host) {
  if (!process.env.ANTHROPIC_API_KEY)
    return json(503, { error: "服务端还没配置批改 key。" });
  const h = (body.hash || "").trim();
  if (!h) return json(400, { error: "缺少 hash。" });
  const d = await sessions().get(sessKey(sub, h), { type: "json" });
  if (!d) return json(404, { error: "没有这节课。" });
  if (d.rewrite && !body.force) return json(200, { done: true, rewrite: d.rewrite });

  if (!isOwner(u) && await overBudget())
    return json(503, { error: "本月整站的用量额度用完了，下个月 1 号恢复。" });
  const c = usedNow(u);
  const cap = isOwner(u) ? Infinity : isPaid(u) ? QUOTA_REWRITES : FREE_TOTAL;
  if ((c.rewrites || 0) >= cap)
    return json(429, { error: isPaid(u)
      ? `本月的 ${cap} 次「更地道的说法」用完了，下个月 1 号重置。`
      : `免费额度里的 ${cap} 次「更地道的说法」用完了。联系 ${CONTACT || "管理员"} 开通。`,
      upgrade: !isPaid(u) });

  return await startJob(sub, u.email, host, { type: "rewrite", hash: h });
}

async function jobStatus(sub, u, q) {
  const id = (q.id || "").trim();
  if (!id) return json(400, { error: "缺少 id。" });
  const j = await jobs().get(jobKey(sub, id), { type: "json" });
  if (!j) return json(404, { error: "没有这个任务。" });
  return json(200, {
    status: j.status, progress: j.progress || null, error: j.error || null,
    result: j.result || null, quota: quotaView(u),
  });
}

/* ------------------------------------------------------------------ 课程 */

async function listSessions(sub) {
  const st = sessions();
  const { blobs } = await st.list({ prefix: `${sub}/` });
  const out = [];
  for (const b of blobs) {
    const d = await st.get(b.key, { type: "json" });
    if (!d) continue;
    const real = (d.errors || []).filter(e => e.severity === "error"
      && CATS.includes(e.category) && Number(e.confidence || 0) >= 0.7);
    out.push({ hash: d.hash, name: d.audio_name, at: d.analyzed_at || "",
               words: d.my_words || 0, duration: d.duration || 0, errors: real.length });
  }
  out.sort((a, b) => String(b.at).localeCompare(String(a.at)));
  return json(200, out);
}

async function putSession(sub, body) {
  const s = body.session;
  if (!s || !s.hash || !Array.isArray(s.errors)) return json(400, { error: "数据格式不对。" });
  if (JSON.stringify(s).length > 4e6) return json(413, { error: "这节课的数据过大。" });
  await sessions().setJSON(sessKey(sub, s.hash), s);
  return json(200, { ok: true });
}

// 删掉这个账号名下所有课程。故意不删 users 里的用量记录——
// 否则「删数据」就成了重置配额的后门。
async function deleteAll(sub) {
  const st = sessions();
  const { blobs } = await st.list({ prefix: `${sub}/` });
  for (const b of blobs) await st.delete(b.key);
  return json(200, { deleted: blobs.length });
}

// 手动开通：用户付钱给你，你在管理页把他设成 paid
async function adminSetPlan(body) {
  const email = (body.email || "").trim().toLowerCase();
  const plan = body.plan === "paid" ? "paid" : "free";
  if (!email) return json(400, { error: "缺少 email。" });
  const st = users();
  const { blobs } = await st.list();
  for (const b of blobs) {
    if (b.key.startsWith("_")) continue;
    const u = await st.get(b.key, { type: "json" });
    if (!u || (u.email || "").toLowerCase() !== email) continue;
    u.plan = plan;
    if (plan === "paid") delete u.upgrade_requested_at;
    await st.setJSON(b.key, u);
    return json(200, { ok: true, email, plan });
  }
  return json(404, { error: "没找到这个邮箱的用户（他要先注册过）。" });
}

/* 注销账号：删课程、删任务、删用量记录，再把登录账号本身删掉。
   留一个只含邮箱哈希和免费次数的墓碑，防止注销再注册刷免费额度。 */
// 免费额度用完时点一下，管理页就能看到「待开通」，不用邮件来回
async function requestUpgrade(sub, u) {
  u.upgrade_requested_at = new Date().toISOString();
  await users().setJSON(sub, u);
  return json(200, { ok: true, contact: CONTACT });
}

async function deleteAccount(sub, email) {
  const ss = sessions();
  const { blobs } = await ss.list({ prefix: `${sub}/` });
  for (const b of blobs) await ss.delete(b.key);

  const js = jobs();
  const jb = await js.list({ prefix: `${sub}/` });
  for (const b of jb.blobs) await js.delete(b.key);

  const st = users();
  const u = await st.get(sub, { type: "json" });
  if (email) {
    await st.setJSON(tombKey(email), {
      free_used: freeUsed(u || {}), deleted_at: new Date().toISOString(),
    });
  }
  await st.delete(sub);

  // 登录账号本身不在这里删。合并之后那是 Grammar Quest 的 Supabase 账号，
  // 删掉它等于把人家的语法闯关进度、作品集一起删了——不是这个接口该管的事。
  // 这里只清口语实战场这一侧的数据。
  return json(200, { ok: true, sessions: blobs.length, login: "kept" });
}

async function adminUsage() {
  const st = users();
  const { blobs } = await st.list();
  const rows = [];
  for (const b of blobs) {
    if (b.key.startsWith("_")) continue;
    const u = await st.get(b.key, { type: "json" });
    if (!u) continue;
    const per = Object.entries(u.used || {}).map(([m, v]) => ({
      month: m, recordings: v.recordings, minutes: Math.round(v.minutes),
      rewrites: v.rewrites || 0, cost_usd: Math.round((v.cost_usd || 0) * 1000) / 1000,
    }));
    rows.push({ email: u.email, activated_at: u.activated_at || null, usage: per,
                plan: isOwner(u) ? "owner" : isPaid(u) ? "paid" : "free",
                free_used: freeUsed(u), requested_at: u.upgrade_requested_at || null });
  }
  const total = rows.reduce((s, r) => s + r.usage.reduce((x, v) => x + v.cost_usd, 0), 0);
  const t = await totalsGet();
  return json(200, { users: rows, total_cost_usd: Math.round(total * 1000) / 1000,
                     month_total_usd: t[month()] || 0, budget_usd: MONTHLY_BUDGET_USD });
}

/* -------------------------------------------------------------- 自检 */
/* 不需要登录，但要带 X-Selftest 头且与 SG_SELFTEST 环境变量一致。
   用来在没有账号的情况下确认存储和 key 是不是通的。 */
async function selftest() {
  const out = { blobs: "?", asr_key: !!process.env.DEEPGRAM_API_KEY,
                llm_key: !!process.env.ANTHROPIC_API_KEY,
                model: LLM_MODEL, rewrite_model: REWRITE_MODEL,
                invite_code_set: !!process.env.SG_INVITE_CODE,
                job_secret_set: !!process.env.SG_JOB_SECRET,
                admin_set: !!process.env.SG_ADMIN_EMAIL };
  try {
    const st = users();
    const probe = { at: new Date().toISOString() };
    await st.setJSON("_selftest", probe);
    const back = await st.get("_selftest", { type: "json" });
    await st.delete("_selftest");
    out.blobs = back?.at === probe.at ? "ok" : "读回来的值不对";
  } catch (e) { out.blobs = "失败：" + (e?.message || String(e)); }

  try {
    const st = users();
    const { blobs } = await st.list();
    let n = 0; const per = {};
    for (const b of blobs) {
      if (b.key.startsWith("_")) continue;
      const u = await st.get(b.key, { type: "json" });
      if (!u) continue;
      n++;
      for (const [m, v] of Object.entries(u.used || {})) {
        const a = per[m] ||= { recordings: 0, minutes: 0, rewrites: 0, cost_usd: 0 };
        a.recordings += v.recordings || 0;
        a.minutes += Math.round(v.minutes || 0);
        a.rewrites += v.rewrites || 0;
        a.cost_usd = Math.round((a.cost_usd + (v.cost_usd || 0)) * 10000) / 10000;
      }
    }
    out.users = n;
    out.usage = per;
  } catch (e) { out.usage = "读不到：" + e.message; }

  // 真打一次 Claude（8 个 token，几乎不要钱）。只看 key 配没配是不够的——
  // key 被吊销、改错、带了空格，都是「配了但用不了」。
  if (process.env.ANTHROPIC_API_KEY) {
    try {
      const r = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "x-api-key": process.env.ANTHROPIC_API_KEY,
                   "anthropic-version": "2023-06-01", "content-type": "application/json" },
        body: JSON.stringify({ model: LLM_MODEL, max_tokens: 8,
          messages: [{ role: "user", content: "回一个字：好" }] }),
      });
      const t = await r.text();
      out.llm_call = r.ok ? "ok" : `${r.status}：${t.slice(0, 200)}`;
    } catch (e) { out.llm_call = "失败：" + e.message; }
  }

  if (process.env.DEEPGRAM_API_KEY) {
    try {
      const r = await fetch("https://api.deepgram.com/v1/auth/grant", {
        method: "POST",
        headers: { Authorization: `Token ${process.env.DEEPGRAM_API_KEY}`,
                   "Content-Type": "application/json" },
        body: JSON.stringify({ ttl_seconds: 600 }),
      });
      const t = await r.text();
      out.dg_grant = r.ok ? `ok，有效期 ${JSON.parse(t).expires_in}s` : `${r.status}：${t.slice(0, 200)}`;
    } catch (e) { out.dg_grant = "失败：" + e.message; }
  }
  return json(200, out);
}

/* ------------------------------------------------------------------ 身份

   合并进 Grammar Quest 之后，登录认的是 GQ 的 Supabase 账号，不再是 Netlify Identity
   （一个产品里让人登两次是不能接受的）。前端带 Authorization: Bearer <supabase token>。

   为什么拿 token 去问 Supabase，而不是自己验签：验签要 JWT secret（又一个要配的密钥），
   而且验签只能证明"这串 token 当初是真的"，证明不了它没被吊销。问一次 ~100ms，
   跟后面动辄几十秒的批改比可以忽略。

   这两个值是公开的——前端 js/supabaseConfig.js 里本来就有同样的两个，
   anon key 本就设计成可公开，真正的安全由数据库的 RLS 保证。*/
const SUPABASE_URL = process.env.SUPABASE_URL
  || "https://womdtayzftvaggjyyaej.supabase.co";
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY
  || "sb_publishable_EMMRx_9BBdXO5vWoFApk4w_tLhg2sv1";

async function whoami(event) {
  const h = event.headers || {};
  const raw = h.authorization || h.Authorization || "";
  const token = raw.replace(/^Bearer\s+/i, "").trim();
  if (!token) return null;
  try {
    const r = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { Authorization: `Bearer ${token}`, apikey: SUPABASE_ANON_KEY },
    });
    if (!r.ok) return null;
    const u = await r.json();
    return u?.id ? { sub: u.id, email: u.email || "" } : null;
  } catch {
    return null;   // Supabase 挂了或者网络抖了，当成没登录，前端会提示重新登录
  }
}

/* ------------------------------------------------------------------ 入口 */

export const handler = async (event) => {
  const route = (event.path || "").split("/api/")[1] || "";
  const q = event.queryStringParameters || {};

  const st = process.env.SG_SELFTEST;
  if (route === "selftest") {
    if (!st || event.headers?.["x-selftest"] !== st) return json(404, { error: "没有这个接口。" });
    // ?slow=N 用来量平台允许函数跑多久（实测 30 秒封顶，所以才有后台任务）
    const slow = Number(q.slow || 0);
    if (slow > 0) {
      await new Promise(r => setTimeout(r, slow * 1000));
      return json(200, { slept: slow });
    }
    return await selftest();
  }

  const user = await whoami(event);
  if (!user) return json(401, { error: "请先登录。" });

  let body = {};
  if (event.body) {
    try { body = JSON.parse(event.body); } catch { return json(400, { error: "请求体不是 JSON。" }); }
  }

  const sub = user.sub;
  const email = user.email || "";
  const host = event.headers?.host || `${process.env.SITE_NAME}.netlify.app`;
  const admin = !!process.env.SG_ADMIN_EMAIL
    && email.toLowerCase() === process.env.SG_ADMIN_EMAIL.toLowerCase();

  try {
    const u = await loadUser(sub, email);

    // 站长本人自动升为 owner：不限额度，只看花费
    if (admin && u.plan !== "owner") { u.plan = "owner"; await users().setJSON(sub, u); }

    // 没配邀请码就等于不设门槛，第一次来直接放行。
    // 要在路由之前做掉——否则 me 会回 activated:false，前端照样弹一个激活页出来。
    if (!u.activated_at && !process.env.SG_INVITE_CODE) {
      u.activated_at = new Date().toISOString();
      await users().setJSON(sub, u);
    }

    if (route === "me") { await sweepJobs(sub); return await me(u, admin); }
    if (route === "activate") return await activate(sub, u, body);

    // 除了上面两个，其余都要先激活
    if (!u.activated_at) return json(403, { error: "这个账号还没激活，需要邀请码。" });

    if (route === "dg-token") return await dgToken(sub, u, body);
    if (route === "analyze-start") return await analyzeStart(sub, u, body, host);
    if (route === "rewrite-start") return await rewriteStart(sub, u, body, host);
    if (route === "job") {
      if (event.httpMethod === "DELETE") {
        await jobs().delete(jobKey(sub, (q.id || "").trim()));
        return json(200, { ok: true });
      }
      return await jobStatus(sub, u, q);
    }
    if (route === "sessions") return await listSessions(sub);
    if (route === "delete-all") return await deleteAll(sub);
    if (route === "request-upgrade") return await requestUpgrade(sub, u);
    if (route === "delete-account") return await deleteAccount(sub, email);
    if (route === "session") {
      if (event.httpMethod === "PUT") return await putSession(sub, body);
      const h = q.h;
      if (!h) return json(400, { error: "缺少 h 参数。" });
      if (event.httpMethod === "DELETE") {
        await sessions().delete(sessKey(sub, h));
        return json(200, { ok: true });
      }
      const d = await sessions().get(sessKey(sub, h), { type: "json" });
      return d ? json(200, d) : json(404, { error: "没有这节课。" });
    }
    if (route === "admin/usage") {
      if (!admin) return json(403, { error: "只有管理员能看。" });
      return await adminUsage();
    }
    if (route === "admin/set-plan") {
      if (!admin) return json(403, { error: "只有管理员能改。" });
      return await adminSetPlan(body);
    }
    return json(404, { error: "没有这个接口。" });
  } catch (err) {
    console.error("api error", route, err);
    return json(500, { error: "服务端出错了：" + (err?.message || String(err)) });
  }
};
