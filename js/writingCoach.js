import { hasApiKey, friendlyAiError, aiJson } from './unitGenerator.js';

// 写作批改：孩子提交写作任务后，由 AI 逐句批改并给整体评价。
//
// 为什么需要它：mission.js 里原来的 checkGrammar() 是一组硬编码正则，
// 只认 present_simple / past_simple 等 7 个固定的 grammarType。
// AI 生成的课程里 grammarType 几乎不可能命中这 7 个，于是全部落到
// default 分支直接返回"正确"——孩子写完什么反馈都拿不到。

const PROMPT = `You are a kind but precise English writing coach for a Chinese child (about 10-12 years old).
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

export function hasWritingCoach() {
  return hasApiKey();
}

/**
 * @param {Array<{prefix:string, text:string, suffix:string}>} lines 学生写的每一行
 * @param {object} ctx { grammarType, unitTitle, cefr }
 */
export async function reviewWriting(lines, ctx = {}) {
  const body = lines
    .map((l, i) =>
      `[${i}] 提示词:"${l.prefix || '(无)'}"　孩子写的:"${l.text}"　结尾:"${l.suffix || '(无)'}"`
    )
    .join('\n');

  const userText = [
    ctx.unitTitle ? `单元主题：${ctx.unitTitle}` : '',
    ctx.grammarType ? `本单元的目标语法点：${ctx.grammarType}` : '',
    ctx.cefr ? `学生的 CEFR 等级：${ctx.cefr}` : '',
    '',
    '学生的写作：',
    body,
  ]
    .filter(Boolean)
    .join('\n');

  const data = await aiJson(PROMPT, userText, (d) => {
    if (!d || !Array.isArray(d.lines)) {
      const e = new Error('批改返回的格式有误，请重试');
      e.friendly = true;
      throw e;
    }
  });

  // 补齐可能缺失的字段，避免渲染时到处判空
  return {
    lines: lines.map((_, i) => {
      const found = (data.lines || []).find((l) => Number(l.index) === i) || {};
      return {
        index: i,
        ok: found.ok !== false,
        issue: found.issue || '',
        fixed: found.fixed || '',
      };
    }),
    overall: data.overall || '',
    improve: Array.isArray(data.improve) ? data.improve.filter(Boolean) : [],
    score: Number(data.score) || 0,
  };
}

export { friendlyAiError };
