/* 后台任务：批改和「更地道的说法」都在这里跑。
 *
 * 为什么要有它：Netlify 的普通云函数**硬上限 30 秒**（超了返回一个 HTML 超时页，
 * 前端只会看到"返回的不是 JSON"）。Opus 5 批改几百词经常要跑一分钟以上，
 * 一整节课分好几段更久。后台函数上限 15 分钟。
 *
 * 文件名必须以 -background 结尾，Netlify 靠这个识别（异步调用，立刻回 202）。
 *
 * 顺带一个好处：结果由服务端自己保存，用户中途关掉页面，
 * 批改照样会出现在「历史」里。
 */

import {
  LLM_MODEL, REWRITE_MODEL, CATS, ANALYZE_SYSTEM, REWRITE_SYSTEM,
  users, sessions, jobs, sessKey, jobKey, loadUser, usedNow,
  parseJsonArray, parseJsonObject, chunk, blocks, MAX_REWRITE_BLOCKS,
  addUsage, costOf, callClaude, month, totalsAdd,
} from "./lib/shared.mjs";

async function setJob(sub, id, patch) {
  const st = jobs();
  const cur = (await st.get(jobKey(sub, id), { type: "json" })) || {};
  const next = { ...cur, ...patch, updated: new Date().toISOString() };
  await st.setJSON(jobKey(sub, id), next);
  return next;
}

async function runAnalyze(sub, job, key) {
  const s = job.session;
  const all = chunk(s.my_lines || []);
  const errors = [];
  const diag = [];          // 每段都留痕，否则"0 条错误"到底是真没错还是模型没回，看不出来
  let inTok = 0, outTok = 0;

  for (let i = 0; i < all.length; i++) {
    const ch = all[i];
    await setJob(sub, job.id, { status: "running", progress: { done: i, total: all.length } });
    const body = "以下是这位学习者在一节英语课上说的话。行首方括号是行号，"
      + "一行可能包含多句，也可能是一段被停顿切开后重新拼起来的话——"
      + "判断语法时请把整行当作完整语境，不要因为断句而误判。"
      + "\n\n" + ch.map((l, k) => `[${k}] ${l.text}`).join("\n");
    const out = await callClaude(key, LLM_MODEL, ANALYZE_SYSTEM, body, 16000, "medium");
    inTok += out.inTok; outTok += out.outTok;
    const got = parseJsonArray(out.text);
    diag.push({ chunk: i + 1, lines: ch.length, stop: out.stop,
                out_tokens: out.outTok, text_len: out.text.length, parsed: got.length,
                head: out.text.slice(0, 120) });
    // 文本空 / 被 max_tokens 截断 / 一条都解析不出来——这些以前都会静默变成"没有错误"
    if (!got.length && (out.stop === "max_tokens" || out.text.trim().length === 0))
      throw new Error(`第 ${i + 1} 段模型没给出结果（stop=${out.stop || "空"}，`
        + `输出 ${out.outTok} token）。重试一次通常就好。`);
    for (const e of got) {
      // 时间戳链路（CLAUDE.md 第 7 条）：LLM 返回 line → 映射成 at
      const k = Number(e.line);
      e.at = Number.isInteger(k) && ch[k] ? ch[k].start : null;   // 行号没回来就不给，不猜
      if (e.category !== "asr_suspect" && !CATS.includes(e.category)) continue;
      errors.push(e);
    }
  }
  // 全部段落都解析不出东西 = 肯定是哪里不对，不能当成"这节课很完美"
  if (!errors.length && diag.every(d => d.parsed === 0))
    throw new Error("模型一条结果都没返回。这不代表你没犯错，是批改没跑成。"
      + `诊断：${diag.map(d => `第${d.chunk}段 stop=${d.stop} 输出${d.out_tokens}token`).join("；")}`);

  const payload = { ...s, errors, analyzed_at: s.analyzed_at || new Date().toISOString() };
  await sessions().setJSON(sessKey(sub, s.hash), payload);

  const u = await loadUser(sub, job.email);
  const c = usedNow(u);
  addUsage(u, LLM_MODEL, inTok, outTok,
           { minutes: c.minutes + Math.max(0, Number(s.duration) || 0) / 60 });
  await users().setJSON(sub, u);
  await totalsAdd(costOf(LLM_MODEL, inTok, outTok));   // 全站本月花费，给总开关用

  return { hash: s.hash, errors: errors.length, diag };
}

async function runRewrite(sub, job, key) {
  const d = await sessions().get(sessKey(sub, job.hash), { type: "json" });
  if (!d) throw new Error("这节课不在了。");
  const all = blocks(d.my_lines || []);
  const use = all.slice(0, MAX_REWRITE_BLOCKS);
  const parts = [];
  let inTok = 0, outTok = 0;

  for (let i = 0; i < use.length; i++) {
    await setJob(sub, job.id, { status: "running", progress: { done: i, total: use.length } });
    const original = use[i].map(l => l.text).join(" ");
    const out = await callClaude(key, REWRITE_MODEL, REWRITE_SYSTEM, original, 1500);
    inTok += out.inTok; outTok += out.outTok;
    const o = parseJsonObject(out.text);
    if (o?.rewrite) parts.push({
      at: use[i][0]?.start ?? null,          // 能点回录音那一秒
      original,                              // 跟改写并排显示，不然没法对照
      rewrite: String(o.rewrite),
      notes: Array.isArray(o.notes) ? o.notes.map(String).slice(0, 3) : [],
    });
  }
  if (!parts.length) throw new Error("模型没给出可用的改写，再试一次。");

  d.rewrite = { parts, made_at: new Date().toISOString(),
                truncated: all.length > MAX_REWRITE_BLOCKS };
  await sessions().setJSON(sessKey(sub, job.hash), d);

  const u = await loadUser(sub, job.email);
  const c = usedNow(u);
  addUsage(u, REWRITE_MODEL, inTok, outTok, { rewrites: (c.rewrites || 0) + 1 });
  await users().setJSON(sub, u);
  await totalsAdd(costOf(REWRITE_MODEL, inTok, outTok));

  return { hash: job.hash, rewrite: d.rewrite };
}

export const handler = async (event) => {
  // 这个地址是公开的，靠共享密钥挡住外人
  if (!process.env.SG_JOB_SECRET
      || event.headers?.["x-job-secret"] !== process.env.SG_JOB_SECRET)
    return { statusCode: 401, body: "no" };

  let sub, id;
  try { ({ sub, id } = JSON.parse(event.body || "{}")); }
  catch { return { statusCode: 400, body: "bad body" }; }
  if (!sub || !id) return { statusCode: 400, body: "missing sub/id" };

  const job = await jobs().get(jobKey(sub, id), { type: "json" });
  if (!job) return { statusCode: 404, body: "no job" };

  try {
    const key = process.env.ANTHROPIC_API_KEY;
    if (!key) throw new Error("服务端没配置批改 key。");
    const result = job.type === "rewrite"
      ? await runRewrite(sub, { ...job, id }, key)
      : await runAnalyze(sub, { ...job, id }, key);
    // 结果存好后把大块输入丢掉，别让任务记录一直占着空间
    await setJob(sub, id, { status: "done", result, session: undefined, progress: null });
  } catch (e) {
    console.error("job failed", id, e);
    await setJob(sub, id, { status: "error", error: e?.message || String(e), session: undefined });
  }
  return { statusCode: 200, body: "ok" };
};
