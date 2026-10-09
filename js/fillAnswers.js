// 多空填空题：每个空的标准答案。判分、答错时的提示、家长预览、发给 AI 的题目描述都从这里取，
// 保证「哪个空该填什么」只有一种算法。
//
// 题库里多空题的答案有三种存法：
//   1. blankAnswers：每个空一组可接受的写法，[["had brought"], ["would not have got", "would not have gotten"]]。
//      某个空有不止一种写法（英式 / 美式）时只能用这种。
//   2. acceptableAnswers 一空一条：["has been confirmed", "was built"]，条数等于空数。题库里绝大多数是这种。
//   3. acceptableAnswers 每条是整题答案、用逗号分好空：["wrote, left", "wrote , left"]。
// 还有一种「整句作答」：一条答案横跨几个空、连空之间印好的词也写进去了（"Will you visit"），
// 没法拆到每个空，返回 null，判分走整句比对。

export function blankCount(sentence) {
  return (String(sentence || '').match(/_+/g) || []).length;
}

function acceptableOf(q) {
  return (q.acceptableAnswers?.length ? q.acceptableAnswers : [q.correctAnswer || q.answer])
    .filter((a) => typeof a === 'string' && a.trim());
}

// 比较用：小写、合并空格、去掉首尾的标点和引号（参考答案常带句号，孩子填空时不会打）
export function normFill(s) {
  return String(s ?? '').trim().toLowerCase().replace(/\s+/g, ' ')
    .replace(/^[\s"'“‘]+/, '')
    .replace(/[\s.,!?;:"'”’。！？；：]+$/, '')
    .replace(/\s*,\s*/g, ', ');
}

function uniqueForms(forms) {
  const seen = new Set();
  return forms.map((f) => f.trim()).filter((f) => {
    const k = normFill(f);
    if (!k || seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

// 一条答案是不是「整句作答」：空与空之间印好的词（去掉括号提示）它全都包含
function spansStaticText(answer, sentence) {
  const statics = String(sentence).split(/_+/).slice(1, -1)
    .map((p) => normFill(p.replace(/\([^)]*\)|（[^）]*）/g, ' ')))
    .filter((p) => /[a-z]{2,}/.test(p));
  if (!statics.length) return false;
  const a = ` ${normFill(answer)} `;
  return statics.every((p) => a.includes(` ${p} `));
}

// 返回 [[第 1 空可接受的写法…], [第 2 空…], …]；单空题、整句作答的题返回 null。
export function fillBlankSets(q) {
  const n = blankCount(q.sentence);
  if (n < 2) return null;

  const ba = q.blankAnswers;
  if (Array.isArray(ba) && ba.length === n
      && ba.every((forms) => Array.isArray(forms) && forms.some((f) => typeof f === 'string' && f.trim()))) {
    return ba.map((forms) => uniqueForms(forms.filter((f) => typeof f === 'string')));
  }

  const acc = acceptableOf(q);
  if (!acc.length) return null;

  if (acc.every((a) => a.split(',').length === n)) {
    return Array.from({ length: n }, (_, i) => uniqueForms(acc.map((a) => a.split(',')[i])));
  }

  if (acc.length === n && acc.every((a) => !a.includes(',') && !spansStaticText(a, q.sentence))) {
    return acc.map((a) => [a.trim()]);
  }
  return null;
}

// 孩子填的答案：多个空用 ", " 连起来（见 practice.js 的 collectFillAnswer）
export function splitUserBlanks(userAnswer) {
  return String(userAnswer ?? '').split(/\s*,\s*/).map((b) => b.trim());
}

// 逐空判分。空数对不上（比如在一个空里打了逗号）时每个空都算错。
export function gradeBlanks(sets, userAnswer) {
  const user = splitUserBlanks(userAnswer);
  const aligned = user.length === sets.length;
  return sets.map((forms, i) => {
    const mine = aligned ? user[i] : '';
    return { answers: forms, user: aligned ? mine : '', ok: aligned && !!normFill(mine) && forms.some((f) => normFill(f) === normFill(mine)) };
  });
}

// 一行可读的答案：多空题写成「第 1 空 … ｜ 第 2 空 …」，免得把每个空的答案看成「几种都行」
export function fillAnswerText(q) {
  const sets = fillBlankSets(q);
  if (sets) return sets.map((forms, i) => `第 ${i + 1} 空 ${forms.join(' / ')}`).join(' ｜ ');
  return uniqueForms(acceptableOf(q)).join(' / ');
}

// 自定义课程里 AI 生成的 blankAnswers：形状不对就丢掉，退回 acceptableAnswers
export function cleanBlankAnswers(ba, sentence) {
  const n = blankCount(sentence);
  if (n < 2 || !Array.isArray(ba) || ba.length !== n) return undefined;
  const out = ba.map((forms) => (Array.isArray(forms) ? forms : [forms]).filter((f) => typeof f === 'string' && f.trim()));
  return out.every((forms) => forms.length) ? out : undefined;
}
