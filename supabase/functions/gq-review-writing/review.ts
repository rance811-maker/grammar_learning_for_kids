// 作文批改的提示词、输入校验和结果解析。只放纯函数，不碰 Deno / 网络，便于本地测试。
//
// 提示词和 js/writingCoach.js 里那份是同一套（那份给「家长自备 key」的浏览器直连用）。
// 改其中一份时，记得同步另一份。

export const PROMPT = `You are a kind but precise English writing coach for a Chinese child (about 10-12 years old).
The child completed a guided writing task: the app gave some fixed prompt words, and the child filled in the rest.

For each line you get three parts: the fixed PROMPT words, what the CHILD wrote, and a fixed ENDING.

RULES:
- Judge ONLY the child's own words. Never rewrite their ideas, opinions or content.
- Fix only: grammar, verb tense/form, spelling, word choice, and articles/prepositions.
- Also check CONSISTENCY across lines (e.g. the child says "dinner" in one line but "lunch" in the next, or the timeline contradicts itself). This kind of mistake matters and single-sentence checking misses it.
- "ok" means the child's part is genuinely acceptable English. Do NOT mark something ok just to be nice.

For EACH line return:
- index: the line number given to you
- ok: true / false
- issue: 中文一句话，说清错在哪、为什么错（讲原理，不要只说"这里错了"）。ok 为 true 时给空字符串。
- fixed: 改正后的完整英文句子（提示词 + 改正后的孩子部分 + 结尾）。ok 为 true 时照抄原句。

Then overall:
- overall: 中文 2–3 句整体评价。先具体说做得好的地方，再说主要问题。鼓励，但绝不把错的说成对的。
- improve: 1–2 条中文建议，必须针对这次写作的具体问题，不要泛泛而谈（❌"多练习" ✅"时间状语是 last week 时，整句要用过去时"）
- score: 1–5 的整数（5 = 完全正确且表达自然；3 = 意思通但有明显语法错误）

STRICT JSON, no markdown, no extra text. Escape quotes inside strings, never use a raw line break inside a string:
{"lines":[{"index":0,"ok":false,"issue":"中文说明","fixed":"Corrected sentence."}],"overall":"中文整体评价","improve":["建议一"],"score":4}`;

export const EXAM_PROMPT = `You are an experienced IELTS writing teacher. The student is a Chinese teenager or adult preparing for IELTS, aiming for band 7 in Grammatical Range and Accuracy.
Band 7 GRA (official wording): "A variety of complex structures is used with some flexibility and accuracy. Grammar and punctuation are generally well controlled, and error-free sentences are frequent."
The student completed a guided writing task: the app gave some fixed prompt words, and the student filled in the rest.

For each line you get three parts: the fixed PROMPT words, what the STUDENT wrote, and a fixed ENDING.

RULES:
- Judge ONLY the student's own words. Keep their ideas, opinions and content.
- Fix grammar, verb tense/form, articles, prepositions, word form, punctuation and agreement. Check that the target structure of the unit is used correctly (e.g. the time reference of each half of a conditional).
- Check consistency across lines (timeline, referents).
- "ok" means the student's part is accurate, natural written English. Do NOT mark something ok just to be nice.
- upgrade: when the (corrected) sentence is accurate but plain (band 6 style), give ONE band-7 version that keeps the meaning and uses a more complex structure naturally (ideally the unit's target structure). If the sentence is already band-7 quality, give "".

For EACH line return:
- index: the line number given to you
- ok: true / false
- issue: 中文一句话，说清错在哪、为什么错（讲原理）。ok 为 true 时给空字符串。
- fixed: 改正后的完整英文句子（提示词 + 改正后的学生部分 + 结尾）。ok 为 true 时照抄原句。
- upgrade: 7 分写法（完整英文句子）或 ""。

Then overall:
- overall: 中文 2–3 句，按雅思 GRA 口径评价：语法多样性（用了哪些复杂结构）和准确性（错误多不多、影不影响理解）。先说做得好的，再说主要问题。
- improve: 1–2 条中文建议，针对这次写作的具体问题，说明怎么练（❌"多练习" ✅"条件句两半各看各的时间：结果说 now 就用 would + 原形"）
- score: 1–5 的整数（5 = 准确且结构多样，接近 7 分以上；3 = 意思清楚但有反复出现的语法错误，约 6 分）

STRICT JSON, no markdown, no extra text. Escape quotes inside strings, never use a raw line break inside a string:
{"lines":[{"index":0,"ok":false,"issue":"中文说明","fixed":"Corrected sentence.","upgrade":""}],"overall":"中文整体评价","improve":["建议一"],"score":4}`;

export interface Line { prefix: string; text: string; suffix: string }
export interface ReviewInput {
  lines: Line[];
  unitTitle: string;
  grammarType: string;
  cefr: string;
  exam: '' | 'ielts';
}

// 只接受写作任务该有的形状和长度：这个接口用的是网站自己的 key，
// 不能让人拿它当一个通用的免费 AI 接口。
const MAX_LINES = 10;
const MAX_PART = 300;   // 提示词 / 结尾
const MAX_TEXT = 600;   // 学生写的一行
const MAX_TOTAL = 4000;
const MAX_CTX = 120;

const str = (v: unknown) => (typeof v === 'string' ? v : '');

export function validateInput(body: unknown): { input?: ReviewInput; error?: string } {
  const b = (body && typeof body === 'object' ? body : {}) as Record<string, unknown>;
  const rawLines = Array.isArray(b.lines) ? b.lines : null;
  if (!rawLines || rawLines.length < 1 || rawLines.length > MAX_LINES) return { error: 'bad_lines' };
  const lines: Line[] = [];
  let total = 0;
  for (const l of rawLines) {
    const o = (l && typeof l === 'object' ? l : {}) as Record<string, unknown>;
    const line = { prefix: str(o.prefix), text: str(o.text), suffix: str(o.suffix) };
    if (line.prefix.length > MAX_PART || line.suffix.length > MAX_PART || line.text.length > MAX_TEXT) return { error: 'too_long' };
    total += line.prefix.length + line.text.length + line.suffix.length;
    lines.push(line);
  }
  if (total > MAX_TOTAL) return { error: 'too_long' };
  if (!lines.some((l) => l.text.trim())) return { error: 'empty' };
  const ctx = (b.ctx && typeof b.ctx === 'object' ? b.ctx : {}) as Record<string, unknown>;
  const clip = (v: unknown) => str(v).slice(0, MAX_CTX);
  return {
    input: {
      lines,
      unitTitle: clip(ctx.unitTitle),
      grammarType: clip(ctx.grammarType),
      cefr: clip(ctx.cefr),
      exam: ctx.exam === 'ielts' ? 'ielts' : '',
    },
  };
}

export function systemPromptFor(input: ReviewInput): string {
  return input.exam === 'ielts' ? EXAM_PROMPT : PROMPT;
}

export function buildUserText(input: ReviewInput): string {
  const body = input.lines
    .map((l, i) => `[${i}] 提示词:"${l.prefix || '(无)'}"　孩子写的:"${l.text}"　结尾:"${l.suffix || '(无)'}"`)
    .join('\n');
  return [
    input.unitTitle ? `单元主题：${input.unitTitle}` : '',
    input.grammarType ? `本单元的目标语法点：${input.grammarType}` : '',
    input.cefr ? `学生的 CEFR 等级：${input.cefr}` : '',
    '',
    '学生的写作：',
    body,
  ].filter(Boolean).join('\n');
}

// 模型偶尔会在 JSON 外面包一层 ```json，或在字符串里夹真的换行：都容忍。
function tryParse(s: string): unknown {
  try { return JSON.parse(s); } catch { /* next */ }
  try { return JSON.parse(s.replace(/[\r\n]+/g, ' ')); } catch { /* next */ }
  return undefined;
}

export interface Review {
  lines: { index: number; ok: boolean; issue: string; fixed: string; upgrade: string }[];
  overall: string;
  improve: string[];
  score: number;
}

export function parseReview(raw: string, lineCount: number): Review {
  const stripped = String(raw).trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
  let data = tryParse(stripped) as Record<string, unknown> | undefined;
  if (!data) {
    const m = stripped.match(/\{[\s\S]*\}/);
    if (m) data = tryParse(m[0]) as Record<string, unknown> | undefined;
  }
  if (!data || !Array.isArray(data.lines)) throw new Error('bad_format');
  const got = data.lines as Record<string, unknown>[];
  const score = Math.round(Number(data.score));
  return {
    lines: Array.from({ length: lineCount }, (_, i) => {
      const f = got.find((l) => Number(l && l.index) === i) || {};
      return { index: i, ok: f.ok !== false, issue: str(f.issue), fixed: str(f.fixed), upgrade: str(f.upgrade) };
    }),
    overall: str(data.overall),
    improve: Array.isArray(data.improve) ? (data.improve as unknown[]).map(str).filter(Boolean).slice(0, 3) : [],
    score: Number.isFinite(score) ? Math.min(5, Math.max(1, score)) : 0,
  };
}
