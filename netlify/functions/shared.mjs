/* api.mjs 和 worker-background.mjs 共用的部分。
   两个函数各自打包成 zip，都会带上这个文件和 vendor/。 */

import { createHash } from "node:crypto";
import { getStore } from "./vendor/blobs/dist/main.js";

const ASR_MODEL = process.env.SG_ASR_MODEL || "nova-3";
const LLM_MODEL = process.env.SG_LLM_MODEL || "claude-opus-5";
// 批改用 Opus（误报致命，不省），「更地道的说法」用便宜档——改写是简单任务
const REWRITE_MODEL = process.env.SG_REWRITE_MODEL || "claude-sonnet-5";
// 每百万 token 单价，用来算钱；换模型时要一起改
const PRICE = { "claude-opus-5": [5, 25], "claude-sonnet-5": [2, 10], "claude-haiku-4-5": [1, 5] };
const QUOTA_RECORDINGS = Number(process.env.SG_QUOTA_RECORDINGS || 20);
const QUOTA_MINUTES = Number(process.env.SG_QUOTA_MINUTES || 90);
const QUOTA_REWRITES = Number(process.env.SG_QUOTA_REWRITES || 40);

/* 免费档：一共 3 次（不是每月），每次最长 10 分钟。
   这两个数字是按成本定的：3 次 × 10 分钟 ≈ $0.35/人（转写 + 批改 + 改写）。
   再长就顶不住陌生人涌入，再短用户看不出价值。 */
const FREE_TOTAL = Number(process.env.SG_FREE_TOTAL || 3);
const FREE_ONE_MINUTES = Number(process.env.SG_FREE_ONE_MINUTES || 10);
// 全月总花费上限，兜最坏情况（邀请码外流）。超了所有人一起停。
const MONTHLY_BUDGET_USD = Number(process.env.SG_MONTHLY_BUDGET_USD || 50);
const CONTACT = process.env.SG_CONTACT || process.env.SG_ADMIN_EMAIL || "";
const TOTALS_KEY = "_totals";
const MAX_WORDS_PER_CHUNK = Number(process.env.SG_CHUNK_WORDS || 1200);
// 单次录音的上限。后台任务上限 15 分钟，一段 2500 词大约要跑半分到一分半，
// 所以段数必须有个头；60 分钟也正好落在「一节课」这个真实场景里。
const MAX_ONE_MINUTES = Number(process.env.SG_MAX_ONE_MINUTES || 60);
const MAX_CHUNKS = Number(process.env.SG_MAX_CHUNKS || 8);

const CATS = ["articles","tense","number","preposition","agreement","modal","word_order","collocation"];

// 与 speakgrammar.py 的 ANALYZE_SYSTEM 保持逐字一致
const ANALYZE_SYSTEM = `你在分析一位中文母语者的英语口语转写文本。文本来自 verbatim ASR，保留了语气词和不流畅，**未经任何语法修正**。

你的任务：找出其中的语法错误，输出结构化 JSON。

只判定以下八类，不在此列的一律不报：
- articles: 冠词误用/缺失/多余（a/an/the/零冠词）
- tense: 时态错误、时态前后不一致
- number: 单复数、可数不可数
- preposition: 介词误用/缺失/多余
- agreement: 主谓一致
- modal: 情态动词误用（would/could/should/must/have to）
- word_order: 语序（疑问句、从句、副词位置）
- collocation: 动词+名词搭配、固定搭配错误

**必须排除的三类，它们都不是语法错误：**
1. 口语不流畅——重复、自我修正（"I go, I went"）、false start、填充词（um/uh/mhmm）、没说完的句子。口语里这些是正常现象，报出来只会制造噪音。
2. ASR 识别错误——如果某处更像是机器听错了（同音词、专有名词、断句错位），把 category 设为 "asr_suspect"，不要当成语法错误。
3. 语法正确但不够地道——表达生硬但语法没错，severity 设为 "style"。

每处错误输出这些字段：
- line: 这处错误所在的行号（行首方括号里的那个数字）
- original: 原句，照抄转写原文，一个字都不要改
- corrected: 只修语法错误后的句子，不做任何润色
- category: 上面八类之一，或 "asr_suspect"
- note: 一句中文说明，讲清规则本身，不超过 40 字
- confidence: 0 到 1，你对"这确实是语法错误、且原文确实是这么说的"的把握
- severity: "error" 或 "style"

**宁可漏报，不要误报。** 漏掉一个错误的代价远小于报错一个——误报会让使用者停止信任整个工具。

只输出一个 JSON 数组，不要任何其他文字，不要 markdown 代码块。`;

/* 「换个说法」用的 prompt。跟批改是两件事，必须分开：
   批改要的是"宁可漏报不误报"，这里要的是"母语者会怎么说"。
   结果不进错误库、不进跨课统计，否则语法数据会被表达建议污染。 */
const REWRITE_SYSTEM = `你在帮一位中文母语者改进英语口语表达。给你的是他说过的**一小段**原话，来自 verbatim 转写，保留了语气词、重复和说一半改口。

任务：把这一小段改写成更地道的口语，并说明关键改动。

规则：
- **只给一个版本。** 给三五个等于没给。
- 保持口语，不要改成书面语或正式文体。标准是"母语者在同样场合会怎么说"，不是"怎么写得漂亮"。
- 意思不能变，不要添加原话里没有的信息，长度大致相当。
- 语气词、重复、说一半改口这些口语杂质直接清掉，它们不是要点。
- 说明用中文，每条一句话，只讲这一小段里最值得学的 1 到 3 处改动，
  格式是"原说法 → 新说法：为什么"。没什么值得说的就给空数组。
- 只改写给你的这一小段，不要续写、不要补充背景、不要评论。
- **不要罗列语法错误**，那部分另有工具负责。这里只讲怎么说更自然。

只输出一个 JSON 对象：{"rewrite": "改写后的英文", "notes": ["说明一", "说明二"]}
不要任何其他文字，不要 markdown 代码块。`;

const json = (code, obj) => ({
  statusCode: code,
  headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  body: JSON.stringify(obj),
});
const month = () => {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
};
const words = t => t.split(/\s+/).filter(Boolean).length;

/* 用 API 接口访问 Blobs。
   这种上传方式（预先打好 zip 传上来）不会注入 NETLIFY_BLOBS_CONTEXT，所以手动给
   siteID + token。注意：运行时自带的 NETLIFY_FUNCTIONS_TOKEN 对 Blobs 接口是 401，
   必须用一个正式的 Netlify 个人访问令牌（环境变量 NETLIFY_API_TOKEN）。 */
const blobOpts = name => ({
  name,
  // SG_SITE_ID 指向老的 spoken-grammar 站：函数现在跑在 grammar-quest-pet 上，
  // 但所有用户和批改记录还存在老站名下的 Blobs 库里。不显式指过去，
  // Netlify 注入的 SITE_ID 会把我们带到一个空库，看起来就像"数据全没了"。
  siteID: process.env.SG_SITE_ID || process.env.SITE_ID,
  token: process.env.NETLIFY_API_TOKEN || process.env.NETLIFY_FUNCTIONS_TOKEN,
  consistency: "strong",
});
const users = () => getStore(blobOpts("users"));
const sessions = () => getStore(blobOpts("sessions"));

/* 注销账号后留下的墓碑：只存邮箱的单向哈希 + 已用掉的免费次数。
   不留这个，注销再注册就能无限刷免费额度。界面上有明说。 */
const tombKey = email => "_tomb_" + createHash("sha256")
  .update(String(email).trim().toLowerCase()).digest("hex").slice(0, 32);

async function loadUser(sub, email) {
  const st = users();
  let u = await st.get(sub, { type: "json" });
  if (!u) {
    u = { email, used: {} };
    const tomb = email ? await st.get(tombKey(email), { type: "json" }) : null;
    if (tomb?.free_used) u.free = { analyses: tomb.free_used };   // 注销过的，免费次数接着算
  }
  u.email = u.email || email;
  return u;
}
const usedNow = u => u.used[month()]
  || { recordings: 0, minutes: 0, rewrites: 0, in_tokens: 0, out_tokens: 0, cost_usd: 0 };

/* owner = 站长本人（SG_ADMIN_EMAIL）。他出钱，不该被自己的额度卡住：
   不限次数、不受全站预算开关影响，界面上只给他看花了多少钱。 */
const isOwner = u => u?.plan === "owner";
const isPaid = u => u?.plan === "paid" || u?.plan === "owner";
const freeUsed = u => (u.free && u.free.analyses) || 0;

// 这个账号当前的上限。免费档和付费档是两套数。
function planView(u) {
  const owner = isOwner(u);
  const paid = isPaid(u);
  const c = usedNow(u);
  return {
    plan: owner ? "owner" : paid ? "paid" : "free",
    one_minutes: paid ? MAX_ONE_MINUTES : FREE_ONE_MINUTES,
    // owner 没有次数上限，前端据此不显示额度，只显示花费
    left: owner ? null
        : paid ? Math.max(0, QUOTA_RECORDINGS - c.recordings)
               : Math.max(0, FREE_TOTAL - freeUsed(u)),
    total: owner ? null : paid ? QUOTA_RECORDINGS : FREE_TOTAL,
    free_total: FREE_TOTAL,
    free_used: freeUsed(u),
    spend_usd: Math.round((c.cost_usd || 0) * 1000) / 1000,
    contact: CONTACT,
  };
}

// 全站本月花费。为了不每次都遍历所有用户，单独记一个总数。
async function totalsGet() {
  return (await users().get(TOTALS_KEY, { type: "json" })) || {};
}
async function totalsAdd(cost) {
  const t = await totalsGet();
  const m = month();
  t[m] = Math.round(((t[m] || 0) + cost) * 100000) / 100000;
  await users().setJSON(TOTALS_KEY, t);
  return t;
}
async function overBudget() {
  const t = await totalsGet();
  return (t[month()] || 0) >= MONTHLY_BUDGET_USD;
}

function quotaView(u) {
  const c = usedNow(u);
  return {
    month: month(),
    recordings: c.recordings, recordings_limit: QUOTA_RECORDINGS,
    minutes: Math.round(c.minutes), minutes_limit: QUOTA_MINUTES,
    cost_usd: Math.round((c.cost_usd || 0) * 1000) / 1000,
    left: Math.max(0, QUOTA_RECORDINGS - c.recordings),
    rewrites: c.rewrites || 0, rewrites_limit: QUOTA_REWRITES,
  };
}

function parseJsonArray(s) {
  s = s.trim().replace(/^```(?:json)?|```$/gm, "").trim();
  const i = s.indexOf("["), j = s.lastIndexOf("]");
  if (i === -1 || j === -1) return [];
  try { const out = JSON.parse(s.slice(i, j + 1)); return Array.isArray(out) ? out : []; }
  catch { return []; }
}

function parseJsonObject(s) {
  s = s.trim().replace(/^```(?:json)?|```$/gm, "").trim();
  const i = s.indexOf("{"), j = s.lastIndexOf("}");
  if (i === -1 || j === -1) return null;
  try { const o = JSON.parse(s.slice(i, j + 1)); return o && typeof o === "object" ? o : null; }
  catch { return null; }
}

/* 「更地道的说法」按小段切，每段一两百词。
   整段 2500 词一次改写出来没法用——看的人没办法跟自己原话对上。
   小段才能做成"你说的 / 更自然的说法"对照，还能点时间戳回去听。 */
const REWRITE_BLOCK_WORDS = Number(process.env.SG_REWRITE_BLOCK_WORDS || 120);
const MAX_REWRITE_BLOCKS = Number(process.env.SG_MAX_REWRITE_BLOCKS || 25);

function blocks(lines, maxWords = REWRITE_BLOCK_WORDS) {
  const out = []; let buf = [], n = 0;
  for (const u of lines) {
    const w = words(u.text || "");
    if (buf.length && n + w > maxWords) { out.push(buf); buf = []; n = 0; }
    buf.push(u); n += w;
  }
  if (buf.length) out.push(buf);
  return out;
}

// 分块送检——一次喂太长，模型对后半段的召回会明显下降
function chunk(lines) {
  const out = []; let buf = [], n = 0;
  for (const u of lines) {
    const w = words(u.text || "");
    if (buf.length && n + w > MAX_WORDS_PER_CHUNK) { out.push(buf); buf = []; n = 0; }
    buf.push(u); n += w;
  }
  if (buf.length) out.push(buf);
  return out;
}

const sessKey = (sub, h) => `${sub}/${h}`;
const jobs = () => getStore(blobOpts("jobs"));
const jobKey = (sub, id) => `${sub}/${id}`;

function costOf(model, inTok, outTok) {
  const [pin, pout] = PRICE[model] || [5, 25];
  return (inTok * pin + outTok * pout) / 1e6;
}

// 记一次模型用量，顺便算钱
function addUsage(u, model, inTok, outTok, extra = {}) {
  const c = usedNow(u);
  u.used[month()] = {
    ...c, ...extra,
    in_tokens: c.in_tokens + inTok,
    out_tokens: c.out_tokens + outTok,
    cost_usd: (c.cost_usd || 0) + costOf(model, inTok, outTok),
  };
}

async function callClaude(key, model, system, content, maxTokens, effort) {
  const body = { model, max_tokens: maxTokens, system,
                 messages: [{ role: "user", content }] };
  // 限制思考深度：Opus 默认会先想一大段，想的字数也算在 max_tokens 里，
  // 想太久就没额度写 JSON 了，返回空文本——曾经被当成"没有错误"
  if (effort) body.output_config = { effort };
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const t = await r.text();
  if (!r.ok) throw new Error(`Claude 返回 ${r.status}：${t.slice(0, 300)}`);
  const d = JSON.parse(t);
  return {
    text: (d.content || []).filter(b => b.type === "text").map(b => b.text).join(""),
    inTok: d.usage?.input_tokens || 0,
    outTok: d.usage?.output_tokens || 0,
    stop: d.stop_reason || "",
  };
}

export {
  ASR_MODEL, LLM_MODEL, REWRITE_MODEL, PRICE, CATS,
  QUOTA_RECORDINGS, QUOTA_MINUTES, QUOTA_REWRITES, MAX_WORDS_PER_CHUNK,
  MAX_ONE_MINUTES, MAX_CHUNKS,
  ANALYZE_SYSTEM, REWRITE_SYSTEM,
  json, month, words, blobOpts, users, sessions, jobs, sessKey, jobKey,
  loadUser, usedNow, quotaView, parseJsonArray, parseJsonObject, chunk,
  addUsage, costOf, callClaude, blocks, MAX_REWRITE_BLOCKS,
  FREE_TOTAL, FREE_ONE_MINUTES, MONTHLY_BUDGET_USD, CONTACT,
  isPaid, isOwner, freeUsed, planView, totalsGet, totalsAdd, overBudget, tombKey,
};
