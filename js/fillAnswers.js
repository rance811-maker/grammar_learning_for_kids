// 填空题的答案比对。判分、答错时的提示、家长预览、发给 AI 的题目描述都从这里取，
// 保证「哪个空该填什么」「哪些写法算一样」只有一种算法。
//
// 多空题的答案在题库里有三种存法：
//   1. blankAnswers：每个空一组可接受的写法，[["had brought"], ["would not have got", "would not have gotten"]]。
//      某个空有不止一种写法（英式 / 美式）时只能用这种。
//   2. acceptableAnswers 一空一条：["has been confirmed", "was built"]，条数等于空数。题库里绝大多数是这种。
//   3. acceptableAnswers 每条是整题答案、用逗号分好空：["wrote, left", "wrote , left"]。
// 还有一种「整句作答」：一条答案横跨几个空（"Will you visit"、"cannot have overlooked"），
// 没法拆到每个空，fillBlankSets 返回 null，判分走 engine.js 里的整句比对。

export function blankCount(sentence) {
  return (String(sentence || '').match(/_+/g) || []).length;
}

function acceptableOf(q) {
  return (q.acceptableAnswers?.length ? q.acceptableAnswers : [q.correctAnswer || q.answer])
    .filter((a) => typeof a === 'string');
}

// iPhone 的「智能标点」和中文输入法会把 ' 打成 ’。haven’t 和 haven't 在孩子眼里是同一个词
export function foldText(s) {
  return String(s ?? '').replace(/[‘’ʼ＇`]/g, "'").replace(/[“”＂]/g, '"');
}

// 显示和去重用：小写、合并空格、去掉首尾的标点和引号（参考答案常带句号，孩子填空时不会打）
export function normFill(s) {
  return foldText(s).trim().toLowerCase().replace(/\s+/g, ' ')
    .replace(/^[\s"'、，]+/, '')
    .replace(/[\s.,!?;:"'。！？；：，]+$/, '')
    .replace(/\s*,\s*/g, ', ');
}

// 「不填」：零冠词常写成 X / Ø / -，省略关系代词存成空串。孩子留空、或写这些符号都算对
const ZERO_FORM = /^(x|ø|∅|-|–|—)$/i;
export const isZeroForm = (f) => !normFill(f) || ZERO_FORM.test(normFill(f));
export const displayForm = (f) => (isZeroForm(f) ? '不填' : String(f).trim());

// 缩写和全写算同一个答案：wouldn't = would not，can't = cannot = can not
export function expandContractions(s) {
  return s.replace(/\bcan't\b/g, 'cannot').replace(/\bwon't\b/g, 'will not').replace(/\bshan't\b/g, 'shall not')
    .replace(/\b(\w+)n't\b/g, '$1 not').replace(/\bcan not\b/g, 'cannot');
}

// 判分用的比较键：在 normFill 的基础上折叠缩写，「不填」一律记成空串，空里的逗号不算
export function fillKey(s) {
  if (isZeroForm(s)) return '';
  return expandContractions(normFill(s)).replace(/,/g, ' ').replace(/\s+/g, ' ').trim();
}

function uniqueForms(forms) {
  const seen = new Set();
  return forms.map((f) => String(f).trim()).filter((f) => {
    const k = isZeroForm(f) ? '∅' : normFill(f);
    if (seen.has(k)) return false;
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

// 几条答案是不是「同一个整句答案的几种写法」（cannot have overlooked / can't have overlooked）：
// 两两之间词的重合度都过半、但又不完全一样才算。一空一条的答案（has been confirmed / was built）几乎不重合；
// 两个空答案碰巧相同（can / can、The more / the more）时一字不差——几种写法不会一字不差。
function looksLikeAlternatives(acc) {
  const keys = acc.map(fillKey);
  const words = keys.map((k) => new Set(k.split(' ').filter(Boolean)));
  if (words.length < 2) return false;
  for (let i = 0; i < words.length; i++) {
    for (let j = i + 1; j < words.length; j++) {
      if (keys[i] === keys[j]) return false;
      const inter = [...words[i]].filter((w) => words[j].has(w)).length;
      const union = new Set([...words[i], ...words[j]]).size;
      if (!union || inter / union < 0.5) return false;
    }
  }
  return true;
}

// 返回 [[第 1 空可接受的写法…], [第 2 空…], …]；单空题、整句作答的题返回 null。
export function fillBlankSets(q) {
  const n = blankCount(q.sentence);
  if (n < 2) return null;

  const ba = q.blankAnswers;
  if (Array.isArray(ba) && ba.length === n && ba.every((forms) => Array.isArray(forms) && forms.length
      && forms.every((f) => typeof f === 'string'))) {
    return ba.map((forms) => uniqueForms(forms));
  }

  const acc = acceptableOf(q).filter((a) => a.trim());
  if (!acc.length) return null;
  // 括号里印着改写开头的题（(If I ___, I ___ the test.)），答案存的是整句，交给整句比对
  if (/[(（][^)）]*_+[^)）]*[)）]/.test(q.sentence)) return null;

  if (acc.every((a) => a.split(',').length === n && !spansStaticText(a, q.sentence))) {
    return Array.from({ length: n }, (_, i) => uniqueForms(acc.map((a) => a.split(',')[i])));
  }

  if (acc.length === n && acc.every((a) => !a.includes(',') && !spansStaticText(a, q.sentence))
      && !looksLikeAlternatives(acc)) {
    return acc.map((a) => [a.trim()]);
  }
  return null;
}

// 孩子填的答案：多个空用 ", " 连起来（practice.js 的 collectFillAnswer 会先去掉每个空里自己打的逗号）。
// 也接受直接传每个空的数组。
export function splitUserBlanks(userAnswer) {
  if (Array.isArray(userAnswer)) return userAnswer.map((b) => String(b ?? '').trim());
  return String(userAnswer ?? '').split(/\s*,\s*/).map((b) => b.trim());
}

// 逐空判分。空数对不上时每个空都算错，user 记成 null（不是「空着」，是没法对齐）。
export function gradeBlanks(sets, userAnswer) {
  const user = splitUserBlanks(userAnswer);
  const aligned = user.length === sets.length;
  return sets.map((forms, i) => {
    if (!aligned) return { answers: forms, user: null, ok: false };
    const mine = fillKey(user[i]);
    const ok = forms.some((f) => fillKey(f) === mine) && (mine !== '' || forms.some(isZeroForm));
    return { answers: forms, user: user[i], ok };
  });
}

// 一行可读的答案：多空题写成「第 1 空 … ｜ 第 2 空 …」，免得把每个空的答案看成「几种都行」
export function fillAnswerText(q) {
  const sets = fillBlankSets(q);
  if (sets) return sets.map((forms, i) => `第 ${i + 1} 空 ${forms.map(displayForm).join(' / ')}`).join(' ｜ ');
  return uniqueForms(acceptableOf(q)).map(displayForm).join(' / ');
}

// 自定义课程里 AI 生成的 blankAnswers：形状不对就丢掉，退回 acceptableAnswers。
// 写法里带逗号也没关系：比对时两边的逗号都不算（见 fillKey）。
export function cleanBlankAnswers(ba, sentence) {
  const n = blankCount(sentence);
  if (n < 2 || !Array.isArray(ba) || ba.length !== n) return undefined;
  const out = ba.map((forms) => (Array.isArray(forms) ? forms : [forms]).filter((f) => typeof f === 'string'));
  return out.every((forms) => forms.length) ? out : undefined;
}
