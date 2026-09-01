import { curriculum } from './curriculum.js';
import { store } from './store.js';

const PROVIDERS = {
  gemini: { keyStorageKey: 'gq-ai-key-gemini' },
  claude: { keyStorageKey: 'gq-ai-key-claude' },
};

function getProvider() {
  try { return localStorage.getItem('gq-ai-provider') || 'gemini'; } catch { return 'gemini'; }
}

function getAiKey() {
  const p = getProvider();
  const info = PROVIDERS[p];
  if (!info) return null;
  if (p === 'gemini') {
    try {
      const old = localStorage.getItem('gq-ai-key');
      if (old && !localStorage.getItem(info.keyStorageKey)) {
        localStorage.setItem(info.keyStorageKey, old);
        localStorage.removeItem('gq-ai-key');
      }
    } catch { /* */ }
  }
  try { return localStorage.getItem(info.keyStorageKey); } catch { return null; }
}

export function hasApiKey() { return !!getAiKey(); }

const SYLLABUS_PROMPT = `You are an English GRAMMAR curriculum designer for Chinese learners.

SCOPE — read carefully:
- This product trains WRITTEN GRAMMAR ACCURACY ONLY (grammar as used in writing and reading). Do NOT design listening or speaking practice.
- Anchor the grammar SCOPE strictly to the target CEFR level and the Cambridge English Grammar Profile (EGP) grammar points for that level. Only include grammar structures a learner AT that CEFR level is expected to master. Do NOT include structures from a higher CEFR level.
- Every unit's topic must be a GRAMMAR structure/skill (tenses, clauses, conditionals, articles, etc.), not vocabulary, listening, or speaking.

COVERAGE — the 12 units together MUST span these four systems. Do NOT drop high-frequency items (articles, quantifiers, comparatives, word formation):
- Verb system: tenses & aspect, modals, passive & causatives, conditionals
- Clause system: relative clauses, reported speech, participle clauses
- Phrase system: gerunds & infinitives, articles & determiners, quantifiers, comparatives, adjectives/adverbs, prepositions & collocations
- Applied grammar (B1 and above): open cloze, word formation, key-word transformation — put these in a final "Use of English" unit

HONESTY: this is a GRAMMAR teaching blueprint aligned to the CEFR level (referencing the Cambridge English Grammar Profile), NOT an official exam syllabus — Cambridge does not publish a fixed grammar checklist. Never label a unit as an "official" exam point.

Based on the learning goal and its CEFR level, create a 12-unit grammar syllabus, ordered from foundational to advanced WITHIN that level. If reference material is provided below, derive the units FROM the grammar system in that material (still within the CEFR level).

Return a JSON array of exactly 12 objects:
- "title": Grammar/skill topic in English (e.g. "Present Simple Tense")
- "description": Brief Chinese description (e.g. "一般现在时的基本用法")
- "skills": Array of 3-5 sub-skill identifiers in snake_case (e.g. ["third_person_s","negative_forms"])

Return ONLY the JSON array, no markdown code blocks, no other text.`;

// 一个完整单元(故事 + 40 题 + 写作任务)一次性生成体量过大，易截断/超时。
// 拆成两个独立请求并行生成再合并：A = discover + mission + 关卡 1-3；B = 关卡 4-5。
// 二者共享下面这段「角色 + 题型 + 质量规则 + 严格 JSON」的核心说明。
const UNIT_CORE = `You are an English GRAMMAR practice designer for Chinese learners. Generate content for ONE grammar unit.
SCOPE: WRITTEN grammar accuracy only (writing/reading) — no listening/speaking tasks. Keep the grammar difficulty at the unit's stated CEFR level (per the Cambridge English Grammar Profile); do not exceed it.

Question formats:
- choice: { "type":"choice", "instruction":"(Chinese)", "sentence":"She ___ to school.", "options":["go","goes","going","went"], "correctIndex":1, "explanation":"(Chinese)", "subSkill":"skill_id" }
- fill: { "type":"fill", "instruction":"(Chinese)", "sentence":"He (play) ___ now.", "acceptableAnswers":["is playing"], "explanation":"(Chinese)", "subSkill":"skill_id" }
  - PREFER a SINGLE blank (one ___). If the sentence truly needs multiple blanks, put ONE answer per blank in "acceptableAnswers", in the SAME order as the blanks — e.g. sentence "It (be) ___ cold in 1900 but (be) ___ warm now." → "acceptableAnswers":["was","is"]. The number of entries MUST equal the number of ___ blanks. Do NOT put the whole phrase or the static words in the answers.
- reorder: { "type":"reorder", "instruction":"(Chinese)", "words":["she","is","reading"], "correctSentence":"She is reading.", "explanation":"(Chinese)", "subSkill":"skill_id" }
- error: { "type":"error", "instruction":"(Chinese)", "words":["She","go","to","school"], "errorIndex":1, "correction":"goes", "explanation":"(Chinese)", "subSkill":"skill_id" }

QUALITY RULES (critical — follow all):
- Each question MUST contain a clear context clue that determines the answer; there should ideally be exactly ONE best answer.
- If both British and American English are correct, include BOTH in "acceptableAnswers".
- Explanations must explain the MEANING/why (e.g. "by 2031 = completed before a future point → future perfect"), not just point at a surface word.
- Keep timelines, tenses and characters logically consistent across all questions.
- For B1 and above, include a few key-word-transformation style items (rewrite a sentence keeping the meaning, testing the target structure) among the fill questions where natural.
- Do NOT invent coverage percentages or claim official exam status anywhere in the content.

STRICT JSON: the whole output must be ONE valid JSON value. Return ONLY the JSON, no markdown code blocks, no other text. Inside every string, escape double quotes as \\" and never put a raw line break — keep each string on a single line (write the story as one continuous paragraph). Do not use smart/curly quotes ("" '') anywhere; use straight quotes only. No trailing commas.`;

// A 部分：discover(故事+3题+tip) + mission(写作任务) + 关卡 1-3。
const UNIT_PROMPT_A = `${UNIT_CORE}

Generate ONLY these parts for the given unit topic:
1. "discover":
   - "story": { "title": string, "text": string (150-250 word English story demonstrating the grammar, ONE single-line paragraph), "highlights": [key grammar words] }
   - "questions": array of 3 objects { "question": string, "options": [4 strings], "correctIndex": number, "explanation": string (Chinese) }
   - "tip": string — a real mini-lesson (contrast the unit's target structures and list 1-2 common errors), not a one-liner.
2. "levels": object with keys "1","2","3", each an array of 8 practice questions, progressively harder:
   - Level 1: Mostly "choice" (easy recognition)
   - Level 2: "choice" + "fill"
   - Level 3: "fill" + "reorder"
3. "mission": { "title": string, "description": string (Chinese), "scenario": string (Chinese), "grammarType": main subSkill ID, "scaffolds": array of 2-3 { "prefix":"", "suffix":"", "hint":"", "grammarCheck":"skill_id", "example":"" } }
CONSISTENCY: every target grammar structure in the "story" MUST be explained in "tip" AND practiced in at least one question across levels 1-3. Never explain a DIFFERENT structure than the story shows.

Return ONLY this JSON: { "discover":{...}, "levels":{ "1":[...], "2":[...], "3":[...] }, "mission":{...} }`;

// B 部分：只生成更难的关卡 4-5。
const UNIT_PROMPT_B = `${UNIT_CORE}

Generate ONLY the two HARDEST practice levels for the given unit topic, as "levels" with keys "4","5", each an array of 8 practice questions:
- Level 4: "choice" + "fill" + "error"
- Level 5: Mixed types, hardest (still within the stated CEFR level)

Return ONLY this JSON: { "levels":{ "4":[...], "5":[...] } }`;

// 单次 AI 请求的超时上限。整套单元(40 题+故事+写作任务)在手机上直连生成较慢，
// 给足 5 分钟，避免大单元/慢网络下被过早掐断（超时了才会提示"响应超时"）。
const REQUEST_TIMEOUT_MS = 300000;

// 把底层错误翻译成对家长友好的中文提示。已经友好的错误(.friendly)原样返回。
export function friendlyAiError(err) {
  if (err && err.friendly) return err.message;
  const status = err && err.status;
  const raw = String((err && err.message) || err || '').toLowerCase();
  if (raw.includes('abort') || raw.includes('timeout') || raw.includes('timed out')) return 'AI 响应超时了，请检查网络后重试';
  if (raw.includes('failed to fetch') || raw.includes('networkerror') || raw.includes('network request') || raw.includes('load failed')) return '网络连接不上，检查一下网络再试试';
  if (status === 401 || status === 403 || raw.includes('api key') || raw.includes('api_key') || raw.includes('unauthorized') || raw.includes('permission denied') || raw.includes('api key not valid')) return 'API key 无效或没有权限，请检查 key 是否填对';
  if (status === 429 || raw.includes('rate limit') || raw.includes('quota') || raw.includes('resource_exhausted') || raw.includes('too many requests')) return 'AI 调用太频繁或额度用完了，等一会儿再试';
  if ((status && status >= 500) || raw.includes('overloaded') || raw.includes('unavailable') || raw.includes('try again later')) return 'AI 服务暂时繁忙，请稍后重试';
  if (raw.includes('json') || raw.includes('unexpected token') || raw.includes('格式')) return 'AI 返回的内容格式有误，请重试';
  return (err && err.message) || '生成失败，请重试';
}

// 构造一个"已友好"的错误：friendlyAiError 会原样透传其 message。
function friendlyErr(msg) {
  const e = new Error(msg);
  e.friendly = true;
  return e;
}

// 输出被 max_tokens 截断时抛出：generateValidated 会自动重试一次，
// 若仍截断，家长看到的是这条明确的提示，而不是含糊的"格式有误"。
function truncatedErr() {
  const e = friendlyErr('AI 生成的内容太长被截断了，已自动重试；若多次失败，建议换用 Claude key 再试');
  e.truncated = true;
  return e;
}

// 带超时的 fetch，避免请求卡住后界面一直转圈。
async function fetchWithTimeout(url, opts) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, { ...opts, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function callAI(systemPrompt, userText) {
  const provider = getProvider();
  const apiKey = getAiKey();
  if (!apiKey) throw friendlyErr('请先在家长专区配置 AI API key');

  if (provider === 'claude') {
    const res = await fetchWithTimeout('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        // 一个完整单元(故事 + 3 道 discover 题 + 5 关×8 题 + 写作任务 + 中文解析)
        // 体量很大，8192 常常不够、JSON 会被截断。给足输出预算。
        max_tokens: 16000,
        system: systemPrompt,
        messages: [{ role: 'user', content: userText }],
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => null);
      const e = new Error(err?.error?.message || `API 返回 ${res.status}`);
      e.status = res.status;
      throw e;
    }
    const data = await res.json();
    if (data?.stop_reason === 'max_tokens') throw truncatedErr();
    return data?.content?.find(b => b.type === 'text')?.text || '';
  }

  const res = await fetchWithTimeout(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: systemPrompt + '\n\n' + userText }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 8192 },
      }),
    }
  );
  if (!res.ok) {
    const err = await res.json().catch(() => null);
    const e = new Error(err?.error?.message || `API 返回 ${res.status}`);
    e.status = res.status;
    throw e;
  }
  const data = await res.json();
  const cand = data?.candidates?.[0];
  if (cand?.finishReason === 'MAX_TOKENS') throw truncatedErr();
  return cand?.content?.parts?.[0]?.text || '';
}

// 对一个候选字符串做若干「修复」后尝试解析，任一成功即返回结果。
// 常见问题：字符串里夹了原始换行/制表符(非法控制字符)、结尾多了逗号。
function tryParseVariants(s) {
  const variants = [
    s,
    // 把字符串内的原始控制字符(换行/制表符等)替换成空格 —— 这些在 JSON 里非法，
    // 而模型写的小故事常带对话换行，是「格式有误」的头号元凶。
    s.replace(/[\u0000-\u001F]/g, ' '),
  ];
  // 再对每个变体额外尝试「去掉对象/数组结尾多余的逗号」。
  for (const v of variants.slice()) variants.push(v.replace(/,(\s*[}\]])/g, '$1'));
  for (const v of variants) {
    try { return { ok: true, data: JSON.parse(v) }; } catch { /* next */ }
  }
  return { ok: false };
}

// 解析 AI 返回的 JSON。依次尝试：整段 → 去围栏 → 抽取首个 {…}/[…]，
// 每步都配合 tryParseVariants 的容错修复。全失败时把原始开头带进报错，便于排查。
function parseJSON(raw) {
  const stripped = String(raw).trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '');

  const candidates = [stripped];
  const arr = stripped.match(/\[[\s\S]*\]/);
  const obj = stripped.match(/\{[\s\S]*\}/);
  if (arr && obj) candidates.push(arr.index <= obj.index ? arr[0] : obj[0]);
  else if (arr) candidates.push(arr[0]);
  else if (obj) candidates.push(obj[0]);

  for (const c of candidates) {
    const r = tryParseVariants(c);
    if (r.ok) return r.data;
  }

  // 全部失败：把原始返回打到控制台 + 摘一小段放进报错，方便定位到底返回了什么。
  try { console.error('[unitGenerator] 无法解析的 AI 返回：', raw); } catch { /* */ }
  const snippet = String(raw).replace(/\s+/g, ' ').trim().slice(0, 80);
  throw friendlyErr(`AI 返回的内容格式有误，请重试（返回开头：${snippet || '空'}）`);
}

// 调用 + 解析 + 校验，必要时自动重试一次。
// 仅对"格式/结构"类问题重试；鉴权/额度类问题(401/403/429)直接失败，不浪费配额。
async function generateValidated(systemPrompt, userText, validate, attempts = 2) {
  let lastErr;
  for (let i = 0; i < attempts; i++) {
    try {
      const raw = await callAI(systemPrompt, userText);
      const data = parseJSON(raw);
      validate(data);
      return data;
    } catch (e) {
      lastErr = e;
      if (e.status === 401 || e.status === 403 || e.status === 429) break;
    }
  }
  throw lastErr;
}

// ---- Material extraction (PDF text + photo transcription) ----
// Turns uploaded files (PDF / images) + a typed description into one text blob
// that drives syllabus + unit generation. PDFs are read locally via pdf.js;
// photos are transcribed by one vision call.
let _pdfjs = null;
function loadPdfJs() {
  if (_pdfjs) return _pdfjs;
  _pdfjs = import('https://cdn.jsdelivr.net/npm/pdfjs-dist@4.4.168/build/pdf.min.mjs').then(lib => {
    lib.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.4.168/build/pdf.worker.min.mjs';
    return lib;
  });
  return _pdfjs;
}

export async function extractPdfText(file) {
  const lib = await loadPdfJs();
  const buf = await file.arrayBuffer();
  const pdf = await lib.getDocument({ data: buf }).promise;
  const pages = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const tc = await page.getTextContent();
    pages.push(tc.items.map(it => it.str).join(' '));
  }
  return pages.join('\n\n');
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

const VISION_INSTRUCTION = '这是学习素材（课本/讲义/题目截图）。请把图中所有英文文本和语法要点完整转写成纯文本，保留知识点结构，供后续生成练习题使用。只输出转写内容，不要解释。';

async function callVision(dataUrl) {
  const provider = getProvider();
  const apiKey = getAiKey();
  if (!apiKey) throw friendlyErr('请先配置 AI API key');
  const [header, base64] = String(dataUrl).split(',');
  const mime = (header.match(/:(.*?);/) || [])[1] || 'image/jpeg';
  if (!base64) return '';

  if (provider === 'claude') {
    const res = await fetchWithTimeout('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json', 'x-api-key': apiKey,
        'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6', max_tokens: 4096,
        messages: [{ role: 'user', content: [
          { type: 'image', source: { type: 'base64', media_type: mime, data: base64 } },
          { type: 'text', text: VISION_INSTRUCTION },
        ] }],
      }),
    });
    if (!res.ok) { const e = new Error(`API 返回 ${res.status}`); e.status = res.status; throw e; }
    const data = await res.json();
    return data?.content?.find(b => b.type === 'text')?.text || '';
  }

  const res = await fetchWithTimeout(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [
        { inlineData: { mimeType: mime, data: base64 } },
        { text: VISION_INSTRUCTION },
      ] }] }) }
  );
  if (!res.ok) { const e = new Error(`API 返回 ${res.status}`); e.status = res.status; throw e; }
  const data = await res.json();
  return data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

// Build a single material text blob from a typed description + uploaded files.
// onStatus(msg) reports progress; a single file failing does not abort the rest.
export async function buildMaterial({ description = '', files = [], onStatus } = {}) {
  const parts = [];
  if (description.trim()) parts.push(description.trim());
  for (const file of files) {
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    const isImage = file.type.startsWith('image/');
    try {
      if (isPdf) {
        onStatus?.(`正在读取 ${file.name}…`);
        const t = await extractPdfText(file);
        if (t.trim()) parts.push(t.trim());
      } else if (isImage) {
        onStatus?.(`正在识别 ${file.name}…`);
        const url = await fileToDataUrl(file);
        const t = await callVision(url);
        if (t.trim()) parts.push(t.trim());
      }
    } catch (e) {
      console.warn('material extract failed:', file.name, e.message);
    }
  }
  return parts.join('\n\n');
}

const MATERIAL_CAP_SYLLABUS = 8000;
const MATERIAL_CAP_UNIT = 3500;

export async function generateSyllabus(goal, material = '') {
  const matBlock = material
    ? `\n\nReference material (base the 12-unit progression and sub-skills on the grammar system below):\n${String(material).slice(0, MATERIAL_CAP_SYLLABUS)}`
    : '';
  const userText = `Learning goal: ${goal || '(derive from the reference material below)'}${matBlock}`;
  return generateValidated(SYLLABUS_PROMPT, userText, (syllabus) => {
    if (!Array.isArray(syllabus) || syllabus.length < 12) {
      throw friendlyErr('AI 返回的大纲不完整，请重试');
    }
  }).then(s => s.slice(0, 12));
}

// 取一道题的「预期答案」，供校验用。
function answerOf(q) {
  if (q.type === 'choice' || q.type === 'scenario') return (q.options || [])[q.correctIndex] ?? '';
  if (q.type === 'fill') return (q.acceptableAnswers && q.acceptableAnswers.length ? q.acceptableAnswers : [q.answer || q.correctAnswer]).filter(Boolean).join(' / ');
  if (q.type === 'reorder') return q.correctSentence || '';
  if (q.type === 'error') return q.correction || '';
  return '(见题目)';
}

// 自动校验 pass：用一个独立的 AI「校验员」以全新上下文逐题审查，
// 标出「答案错/有歧义/超纲/逻辑不一致」的题并剔除。返回校验报告；生成失败不阻断。
const VERIFY_PROMPT = `You are a STRICT English grammar answer-checker. You are given practice questions from a grammar unit, each with its INTENDED answer, at a CEFR level.
For EACH question INDEPENDENTLY, decide whether the intended answer is truly correct AND the item is well-formed: clear context clue, a single best answer, no timeline/logic errors, difficulty not clearly above the CEFR level.
List ONLY the questions that are genuinely WRONG, ambiguous, or broken — do NOT list good ones.
Return ONLY JSON (no markdown): { "drop": [ { "level":"1", "index":2, "reason":"中文原因" } ], "summary":"中文一句话，如：18题通过，2题有误已剔除" }
Each drop item's "level" and "index" MUST exactly match the [L{level} #{index}] tag shown.`;

async function verifyAndFilter(data, cefr) {
  const levels = data.levels || {};
  const items = [];
  for (const lk of Object.keys(levels)) {
    (levels[lk] || []).forEach((q, i) => {
      const body = q.sentence || q.instruction || (Array.isArray(q.words) ? q.words.join(' ') : '') || '';
      const opts = Array.isArray(q.options) ? ` 选项:[${q.options.join(' / ')}]` : '';
      items.push(`[L${lk} #${i}] ${q.type} | ${body}${opts} | 答案: ${answerOf(q)}`);
    });
  }
  if (!items.length) return { checked: 0, dropped: 0, summary: '本单元暂无练习题' };
  const userText = `CEFR: ${cefr || '(unspecified)'}\nQUESTIONS:\n${items.join('\n')}`;
  const res = await generateValidated(VERIFY_PROMPT, userText, (d) => {
    if (!d || !Array.isArray(d.drop)) throw friendlyErr('校验返回格式有误');
  });
  const dropSet = new Set((res.drop || []).map((x) => `${x.level}#${x.index}`));
  let dropped = 0;
  for (const lk of Object.keys(levels)) {
    levels[lk] = (levels[lk] || []).filter((q, i) => {
      const kill = dropSet.has(`${lk}#${i}`);
      if (kill) dropped++;
      return !kill;
    });
  }
  return { checked: items.length, dropped, summary: res.summary || `${items.length - dropped} 题通过，${dropped} 题剔除` };
}

// 生成一个单元的内容数据（不落库）。unitId 只用于提示词里的编号；cefr 供校验判难度。
async function genUnitData(sylItem, material, unitId = 1, cefr = '') {
  const matBlock = material
    ? `\nReference material (align the questions' style and content to this):\n${String(material).slice(0, MATERIAL_CAP_UNIT)}`
    : '';
  const userText = [
    `Unit ${unitId}: ${sylItem.title}`,
    `Description: ${sylItem.description}`,
    `Sub-skills to use: ${(sylItem.skills || []).join(', ')}`,
    matBlock,
  ].join('\n');
  // 拆分为两个更小的请求并行生成：A=discover+mission+关卡1-3，B=关卡4-5。
  // 每个请求体量减半，既不易截断也不易超时；并行发出后总耗时约等于单个请求。
  const [partA, partB] = await Promise.all([
    generateValidated(UNIT_PROMPT_A, userText, (d) => {
      if (!d || !d.discover || !d.levels) throw friendlyErr('AI 返回的内容结构不完整，请重试');
    }),
    generateValidated(UNIT_PROMPT_B, userText, (d) => {
      if (!d || !d.levels) throw friendlyErr('AI 返回的内容结构不完整，请重试');
    }),
  ]);
  const data = {
    discover: partA.discover,
    mission: partA.mission,
    levels: { ...(partA.levels || {}), ...(partB.levels || {}) },
  };
  // 独立校验 pass（best-effort：校验失败不影响单元本身）
  try {
    data._verify = await verifyAndFilter(data, cefr);
  } catch (e) {
    data._verify = { error: friendlyAiError(e) };
  }
  return data;
}

export async function generateUnitContent(unitId) {
  const id = store.state.activeCurriculumId;
  const curr = store.state.curricula?.[id];
  if (!curr) throw friendlyErr('无活跃课程体系');

  const sylItem = curr.syllabus[unitId - 1];
  if (!sylItem) throw friendlyErr('单元不在大纲中');

  const data = await genUnitData(sylItem, curr.material, unitId, curr.profile?.cefr || '');
  // 校验报告只用于家长过目，不必落进关卡数据里。
  const { _verify, ...clean } = data;
  curriculum.saveUnitData(unitId, clean);
  return data;
}

// 试生成：在课程尚未创建时，先生成一个单元的真实内容给家长过目（不落库）。
export async function generateUnitPreview(sylItem, material, cefr = '') {
  return genUnitData(sylItem, material, 1, cefr);
}

// 语法覆盖核对：对照剑桥 EGP 中该 CEFR 等级应掌握的书面语法点，核对大纲是否覆盖、在第几单元、有无缺漏。
const COVERAGE_PROMPT = `You are a grammar-curriculum auditor. Given a GOAL, its CEFR LEVEL, and a 12-unit grammar SYLLABUS, do two things:
1. List the 8-12 CORE WRITTEN-GRAMMAR points a learner AT that CEFR level must master according to the Cambridge English Grammar Profile (EGP). Grammar only (no vocabulary/listening/speaking). Concise Chinese names.
2. For each point, judge whether the syllabus covers it, and in which unit number.
Then note any obvious GAPS (required grammar points not covered) and give a one-sentence Chinese summary.

Return ONLY this JSON (no markdown):
{ "points": [ { "point": "中文语法点名", "covered": true, "unit": 3 } ], "gaps": ["中文缺漏项"], "summary": "中文一句话总评" }`;

export async function generateCoverage(goal, cefr, syllabus) {
  const sylText = (syllabus || []).map((s, i) =>
    `${i + 1}. ${s.title}｜${s.description}｜skills: ${(s.skills || []).join(',')}`
  ).join('\n');
  const userText = `GOAL: ${goal || '(未指定)'}\nCEFR LEVEL: ${cefr || '(请据目标推断)'}\n\nSYLLABUS:\n${sylText}`;
  return generateValidated(COVERAGE_PROMPT, userText, (d) => {
    if (!d || !Array.isArray(d.points)) {
      throw friendlyErr('AI 返回的覆盖核对结构不完整，请重试');
    }
  });
}

// ---- 内置 CEFR 语法蓝图（EGP 派生的教学蓝图，用于确定性覆盖比对，不再让 AI 自评）----
// 每个语法点带一组匹配关键词（中文语法术语 / 英文短语 / snake_case），
// 只要某单元的「标题+描述+skills」包含任一关键词即判为已覆盖。
const EGP_BLUEPRINT = {
  A2: [
    { point: '一般现在时（三单 -s）', keys: ['一般现在', 'present simple', 'present_simple', '第三人称', 'third_person'] },
    { point: '现在进行时', keys: ['现在进行', 'present continuous', 'present_continuous'] },
    { point: '一般过去时', keys: ['一般过去', 'past simple', 'past_simple', '过去式'] },
    { point: '过去进行时', keys: ['过去进行', 'past continuous', 'past_continuous'] },
    { point: '将来：will / be going to', keys: ['一般将来', '将来时', 'going to', 'be_going_to', 'future simple'] },
    { point: '基础情态（can/must/should）', keys: ['情态', 'modal', '情态动词'] },
    { point: '可数不可数与量词', keys: ['可数', '不可数', 'countable', 'uncountable', 'quantifier', '量词'] },
    { point: '冠词 a/an/the', keys: ['冠词', 'article'] },
    { point: '比较级与最高级', keys: ['比较级', '最高级', 'comparative', 'superlative'] },
    { point: '形容词与副词', keys: ['形容词', '副词', 'adjective', 'adverb'] },
    { point: '常见介词（in/on/at）', keys: ['介词', 'preposition'] },
    { point: '基础连词（and/but/because/so）', keys: ['连词', '连接词', 'conjunction'] },
  ],
  B1: [
    { point: '现在完成时', keys: ['现在完成', 'present perfect', 'present_perfect'] },
    { point: '过去完成时', keys: ['过去完成', 'past perfect', 'past_perfect'] },
    { point: '将来表达对比', keys: ['将来', 'future forms', 'future_forms', '将来时'] },
    { point: '第一条件句', keys: ['第一条件', 'first conditional', '条件句', 'conditional'] },
    { point: '第二条件句', keys: ['第二条件', 'second conditional', 'second_conditional'] },
    { point: '情态（可能性/义务）', keys: ['情态', 'modal', 'have to', 'might'] },
    { point: '被动语态（现在/过去）', keys: ['被动', 'passive', 'passive_voice'] },
    { point: '定语从句', keys: ['定语从句', 'relative clause', 'relative_clause', '关系从句'] },
    { point: '动名词与不定式', keys: ['动名词', '不定式', 'gerund', 'infinitive'] },
    { point: '间接引语（转述）', keys: ['间接引语', '转述', 'reported speech', 'reported_speech'] },
    { point: '比较结构（as...as/too/enough）', keys: ['比较结构', 'as...as', '程度'] },
    { point: '让步与对比连接', keys: ['让步', '连接词', 'although', 'however', '对比'] },
  ],
  B2: [
    { point: '现在与过去时态（含 used to/would）', keys: ['时态', 'used to', 'tenses', '过去习惯', '一般现在', '一般过去', 'present simple', 'past simple', 'present_simple', 'past_simple'] },
    { point: '完成时与叙事时态', keys: ['完成时', 'perfect', '叙事', 'narrative'] },
    { point: '将来表达（含将来完成/进行）', keys: ['将来', 'future', '将来完成', 'future perfect'] },
    { point: '情态动词（全范围+完成式）', keys: ['情态', 'modal', '情态完成'] },
    { point: '被动语态与使役', keys: ['被动', 'passive', '使役', 'causative', 'have something done'] },
    { point: '条件句与非真实表达（wish/if only）', keys: ['条件句', 'conditional', 'wish', 'if only', '虚拟'] },
    { point: '间接引语与转述动词', keys: ['间接引语', '转述', 'reported speech', 'reporting verbs'] },
    { point: '定语从句与分词结构', keys: ['定语从句', 'relative clause', '分词', 'participle'] },
    { point: '动名词与不定式', keys: ['动名词', '不定式', 'gerund', 'infinitive'] },
    { point: '名词短语（冠词/量词/一致）', keys: ['名词短语', '冠词', '量词', '主谓一致', 'noun phrase', 'agreement'] },
    { point: '句子准确性与修饰（比较/语序/连接）', keys: ['比较', '语序', '连接', '修饰', 'word order'] },
    { point: 'Use of English 综合（构词/关键词转换）', keys: ['use of english', '构词', '关键词转换', 'word formation', 'key word', '转换'] },
  ],
  C1: [
    { point: '高级倒装', keys: ['倒装', 'inversion'] },
    { point: '强调与信息结构（cleft/fronting）', keys: ['强调句', 'cleft', 'fronting', '强调'] },
    { point: '复杂条件/虚拟', keys: ['虚拟', '复杂条件', 'were to', 'conditional'] },
    { point: '复杂被动/非人称结构', keys: ['被动', 'impersonal', '非人称'] },
    { point: '高级分词/独立主格', keys: ['分词', '独立主格', 'participle', 'absolute'] },
    { point: '语篇衔接（指代/替代）', keys: ['衔接', 'cohesion', 'referencing', 'substitution', '指代'] },
    { point: '名词化学术句式', keys: ['名词化', 'nominal', '学术句式'] },
    { point: 'hedging 情态（tend to / be likely to）', keys: ['hedging', 'tend to', 'be likely to', '委婉', '推测'] },
    { point: '嵌套关系从句', keys: ['关系从句', 'relative', '嵌套'] },
    { point: '叙述/假设时态细微用法', keys: ['叙述时态', '假设', 'narrative tense'] },
    { point: '抽象名词的冠词用法', keys: ['抽象名词', '冠词', 'article'] },
    { point: '复杂句标点与准确性', keys: ['标点', 'punctuation', '复杂句', '准确性'] },
  ],
};

export function hasBlueprint(cefr) { return !!EGP_BLUEPRINT[cefr]; }

// 确定性覆盖比对：对照固定蓝图逐条检查大纲是否覆盖，无需 AI。
export function deterministicCoverage(cefr, syllabus) {
  const pts = EGP_BLUEPRINT[cefr] || [];
  const units = (syllabus || []).map((s, i) => ({
    idx: i + 1,
    text: `${s.title || ''} ${s.description || ''} ${(s.skills || []).join(' ')}`.toLowerCase(),
  }));
  const points = pts.map((p) => {
    const keys = p.keys.map((k) => k.toLowerCase());
    let unit = null;
    for (const u of units) {
      if (keys.some((k) => u.text.includes(k))) { unit = u.idx; break; }
    }
    return { point: p.point, covered: unit != null, unit };
  });
  const gaps = points.filter((p) => !p.covered).map((p) => p.point);
  const coveredN = points.length - gaps.length;
  const summary = gaps.length === 0
    ? `已覆盖 ${cefr} 蓝图全部 ${points.length} 项核心语法点。`
    : `覆盖 ${coveredN}/${points.length} 项，${gaps.length} 项待补齐（见下）。`;
  return { points, gaps, summary, cefr };
}

// 批量生成当前课程体系中尚未生成的全部单元。
// - onProgress(results, uid, kind) 在每个单元处理后回调，kind ∈ 'ok'|'skip'|'fail'
// - 单个单元失败不会中断整体，错误收集在 results.failed 里
// - 单元间留出小间隔，降低触发限流的概率
export async function generateAllUnits({ onProgress } = {}) {
  const id = store.state.activeCurriculumId;
  const curr = store.state.curricula?.[id];
  if (!curr) throw friendlyErr('无活跃课程体系');

  const total = Math.min((curr.syllabus || []).length, 12);
  const results = { total, done: 0, generated: 0, failed: [] };

  for (let uid = 1; uid <= total; uid++) {
    if (curriculum.isUnitGenerated(uid)) {
      results.done++;
      onProgress?.(results, uid, 'skip');
      continue;
    }
    try {
      await generateUnitContent(uid);
      results.generated++;
      results.done++;
      onProgress?.(results, uid, 'ok');
    } catch (e) {
      results.failed.push({ uid, message: friendlyAiError(e) });
      results.done++;
      onProgress?.(results, uid, 'fail');
    }
    if (uid < total) await new Promise(r => setTimeout(r, 700));
  }
  return results;
}
