import { store } from './store.js';
import { hasApiKey, aiJson } from './unitGenerator.js';

// 题目变体：给一道题生成"考同一个知识点、但句子完全不同"的新题。
//
// 为什么需要：每关只有 8 道题，反复练几次就见完了，光靠去重躲不掉重复。
// 而且从学习本身来说，把同一道题原封不动再考一遍，孩子记住的是答案的位置，
// 不是那条规则——换个情境才能检验他是不是真的会迁移。

const VARIANT_PROMPT = `You are an English grammar exercise writer for Chinese learners.
You are given ONE existing practice question. Write a NEW question that tests EXACTLY THE SAME grammar point, but is otherwise completely different.

MUST keep the same:
- "type" (choice / fill / reorder / error)
- the grammar point being tested
- roughly the same difficulty
- "subSkill" (copy it verbatim)

MUST change:
- the sentence, the situation, the characters, the vocabulary
- it must NOT be a light edit of the original (don't just swap a name or a number)

QUALITY RULES:
- Exactly ONE best answer, with a clear context clue in the sentence that forces it
- "explanation" in Chinese, explaining the MEANING/why (e.g. "last week 是过去时间 → 用过去式"), not just naming the rule
- Keep it age-appropriate (about 10-12 years old) and natural English
- If both British and American forms are correct, include both in acceptableAnswers

Question formats (return exactly the shape matching "type"):
- choice: {"type":"choice","instruction":"(中文)","sentence":"She ___ to school.","options":["go","goes","going","went"],"correctIndex":1,"explanation":"(中文)","subSkill":"..."}
- fill: {"type":"fill","instruction":"(中文)","sentence":"He (play) ___ now.","acceptableAnswers":["is playing"],"explanation":"(中文)","subSkill":"..."}
  PREFER a single blank. If multiple blanks, put ONE answer per blank, in order, and the count must equal the number of ___ .
- reorder: {"type":"reorder","instruction":"(中文)","words":["she","is","reading"],"correctSentence":"She is reading.","explanation":"(中文)","subSkill":"..."}
- error: {"type":"error","instruction":"(中文)","words":["She","go","to","school"],"errorIndex":1,"correction":"goes","explanation":"(中文)","subSkill":"..."}

STRICT JSON, no markdown, no extra text. Escape quotes inside strings; never put a raw line break inside a string.
Return: {"question": { ...the new question... }}`;

function describe(q) {
  const parts = [`type: ${q.type}`];
  if (q.subSkill) parts.push(`subSkill: ${q.subSkill}`);
  if (q.instruction) parts.push(`instruction: ${q.instruction}`);
  if (q.sentence) parts.push(`sentence: ${q.sentence}`);
  if (Array.isArray(q.words) && q.words.length) parts.push(`words: ${q.words.join(' ')}`);
  if (Array.isArray(q.options) && q.options.length) parts.push(`options: ${q.options.join(' / ')}`);
  if (q.correctIndex !== undefined) parts.push(`correctIndex: ${q.correctIndex}`);
  if (q.acceptableAnswers?.length) parts.push(`answers: ${q.acceptableAnswers.join(' / ')}`);
  if (q.correctSentence) parts.push(`correctSentence: ${q.correctSentence}`);
  if (q.correction) parts.push(`correction: ${q.correction}`);
  if (q.explanation) parts.push(`explanation: ${q.explanation}`);
  return parts.join('\n');
}

// 变体沿用原题 id 加后缀，保证：① 与原题不同 id，能被"看过"逻辑区分开；
// ② 一眼能看出它是从哪道题派生的。
function variantId(originalId, n) {
  return `${originalId}~v${n}`;
}

/** 给一道题生成一个变体。失败返回 null（调用方按 best-effort 处理）。 */
export async function generateVariant(q, cefr = '') {
  if (!q || !hasApiKey()) return null;
  const userText = [
    cefr ? `CEFR level: ${cefr}` : '',
    '',
    'EXISTING QUESTION:',
    describe(q),
  ].filter(Boolean).join('\n');

  const data = await aiJson(VARIANT_PROMPT, userText, (d) => {
    if (!d || !d.question || !d.question.type) {
      const e = new Error('变体返回格式有误');
      e.friendly = true;
      throw e;
    }
  });

  const v = data.question;
  const existing = store.getVariants(q.id).length;
  return {
    ...v,
    subSkill: v.subSkill || q.subSkill || '',
    id: variantId(q.id, existing + 1),
    _from: q.id,
  };
}

/**
 * 后台批量生成变体（best-effort，任何一道失败都不影响其它）。
 * 刻意做成串行 + 限量：这是在结算页背后偷偷跑的，不该占满带宽或烧掉一堆额度。
 */
export async function pregenerateVariants(questions, { cefr = '', max = 3 } = {}) {
  if (!hasApiKey()) return { made: 0, skipped: questions.length };

  // 已经攒够变体的题就别再生成了
  const targets = questions
    .filter((q) => q && q.id && !String(q.id).includes('~v'))
    .filter((q) => store.getVariants(q.id).length < 2)
    .slice(0, max);

  let made = 0;
  for (const q of targets) {
    try {
      const v = await generateVariant(q, cefr);
      if (v) {
        store.addVariants(q.id, [v]);
        made++;
      }
    } catch (e) {
      // 静默失败：这是后台增强，不该打扰正在看成绩的孩子
      console.warn('[variant] 生成失败:', q.id, e?.message);
    }
  }
  return { made, skipped: targets.length - made };
}
