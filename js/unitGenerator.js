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

const SYLLABUS_PROMPT = `You are an English language education expert designing curricula for Chinese students (elementary school, grades 3-6).

Based on the learning goal, create a 12-unit curriculum syllabus. Units progress from basic to advanced within the topic scope.

Return a JSON array of exactly 12 objects:
- "title": Grammar/skill topic in English (e.g. "Present Simple Tense")
- "description": Brief Chinese description (e.g. "一般现在时的基本用法")
- "skills": Array of 3-5 sub-skill identifiers in snake_case (e.g. ["third_person_s","negative_forms"])

Return ONLY the JSON array, no markdown code blocks, no other text.`;

const UNIT_PROMPT = `You are an English language education expert. Generate practice content for one unit of a curriculum for Chinese students (elementary grades 3-6).

Generate the following for the given unit topic:

1. "discover": A learning story section:
   - "story": { "title": string, "text": string (150-250 word English story demonstrating the grammar), "highlights": [key grammar words] }
   - "questions": array of 3 objects { "question": string, "options": [4 strings], "correctIndex": number, "explanation": string (Chinese) }
   - "tip": string (a concise Chinese grammar tip)

2. "levels": An object with keys "1" through "5", each is an array of 8 practice questions. Progressively harder:
   - Level 1: Mostly "choice" (easy recognition)
   - Level 2: "choice" + "fill"
   - Level 3: "fill" + "reorder"
   - Level 4: "choice" + "fill" + "error"
   - Level 5: Mixed types, harder

Question formats:
- choice: { "type":"choice", "instruction":"(Chinese)", "sentence":"She ___ to school.", "options":["go","goes","going","went"], "correctIndex":1, "explanation":"(Chinese)", "subSkill":"skill_id" }
- fill: { "type":"fill", "instruction":"(Chinese)", "sentence":"He (play) ___ now.", "acceptableAnswers":["is playing"], "explanation":"(Chinese)", "subSkill":"skill_id" }
- reorder: { "type":"reorder", "instruction":"(Chinese)", "words":["she","is","reading"], "correctSentence":"She is reading.", "explanation":"(Chinese)", "subSkill":"skill_id" }
- error: { "type":"error", "instruction":"(Chinese)", "words":["She","go","to","school"], "errorIndex":1, "correction":"goes", "explanation":"(Chinese)", "subSkill":"skill_id" }

3. "mission": A writing task:
   - "title": string, "description": string (Chinese), "scenario": string (Chinese)
   - "grammarType": main subSkill ID
   - "scaffolds": array of 2-3 { "prefix":"", "suffix":"", "hint":"", "grammarCheck":"skill_id", "example":"" }

Return a single JSON object { "discover":{...}, "levels":{...}, "mission":{...} }.
Return ONLY the JSON, no markdown code blocks, no other text.`;

// 单次 AI 请求的超时上限。整套单元内容较大，给足时间但不至于无限挂起。
const REQUEST_TIMEOUT_MS = 90000;

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
        max_tokens: 8192,
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
  return data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

// 解析 AI 返回的 JSON。先去掉代码块围栏；若仍失败，尝试抽取首个 {…} 或 […]
// 片段（模型偶尔会在 JSON 前后多带一两句话）。
function parseJSON(raw) {
  let text = String(raw).trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '');
  try {
    return JSON.parse(text);
  } catch {
    const arr = text.match(/\[[\s\S]*\]/);
    const obj = text.match(/\{[\s\S]*\}/);
    let cand = null;
    if (arr && obj) cand = arr.index <= obj.index ? arr[0] : obj[0];
    else cand = (arr && arr[0]) || (obj && obj[0]) || null;
    if (cand) {
      try { return JSON.parse(cand); } catch { /* fall through */ }
    }
    throw friendlyErr('AI 返回的内容格式有误，请重试');
  }
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

export async function generateSyllabus(goal) {
  return generateValidated(SYLLABUS_PROMPT, `Learning goal: ${goal}`, (syllabus) => {
    if (!Array.isArray(syllabus) || syllabus.length < 12) {
      throw friendlyErr('AI 返回的大纲不完整，请重试');
    }
  }).then(s => s.slice(0, 12));
}

export async function generateUnitContent(unitId) {
  const id = store.state.activeCurriculumId;
  const curr = store.state.curricula?.[id];
  if (!curr) throw friendlyErr('无活跃课程体系');

  const sylItem = curr.syllabus[unitId - 1];
  if (!sylItem) throw friendlyErr('单元不在大纲中');

  const userText = [
    `Unit ${unitId}: ${sylItem.title}`,
    `Description: ${sylItem.description}`,
    `Sub-skills to use: ${(sylItem.skills || []).join(', ')}`,
  ].join('\n');

  const data = await generateValidated(UNIT_PROMPT, userText, (d) => {
    if (!d || !d.discover || !d.levels) {
      throw friendlyErr('AI 返回的内容结构不完整，请重试');
    }
  });

  curriculum.saveUnitData(unitId, data);
  return data;
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
