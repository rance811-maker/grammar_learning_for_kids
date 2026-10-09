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

// 题干。有些 AI 生成的改写题把「改写：___ … ___」写进了说明、sentence 留空——从说明里把它找回来，
// 不然页面只能给一个输入框，孩子看不到要填哪几处。
export function fillSentence(q) {
  const s = String(q?.sentence || '');
  if (blankCount(s)) return s;
  const m = String(q?.instruction || '').match(/改写句?(?:（[^）]*）)?[:：]\s*([^\u4e00-\u9fff]*_+[^\u4e00-\u9fff]*)/);
  return m ? m[1].replace(/[\s（(]+$/, '').trim() : s;
}

const hintless = (p) => String(p).replace(/\([^)]*\)|（[^）]*）/g, '').trim();
// 第 i 个空和下一个空是不是紧挨着（中间只有空格或括号提示：___ (overlook) ___）
const adjacentAfter = (sentence, i) => !hintless(String(sentence).split(/_+/)[i + 1] ?? 'x');

// 第 i 个空是不是在倒装位置（反意疑问句「…, ___ she?」、否定疑问句「___ you like it?」）：
// 这里 isn't 和 is not 不能互换，缩写不能按全写算
export function invertedBlank(sentence, i) {
  const after = String(sentence).split(/_+/)[i + 1] ?? '';
  const rest = after.replace(/^\s*(\([^)]*\)|（[^）]*）)\s*/, '');
  return /^\s*(i|you|he|she|it|we|they|there)\b/i.test(rest) && /^[^.!。！]*\?/.test(rest);
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

// 「不填」：零冠词常写成 X / Ø / -，省略关系代词存成空串。孩子留空、写这些符号、或照着提示写「不填」都算对
const ZERO_FORM = /^(x|ø|∅|-|–|—|不填|无)$/i;
export const isZeroForm = (f) => !normFill(f) || ZERO_FORM.test(normFill(f));
export const displayForm = (f) => (isZeroForm(f) ? '不填' : String(f).trim());

// 缩写和全写算同一个答案：wouldn't = would not，can't = cannot = can not
export function expandContractions(s) {
  return s.replace(/\bcan't\b/g, 'cannot').replace(/\bwon't\b/g, 'will not').replace(/\bshan't\b/g, 'shall not')
    .replace(/\b(\w+)n't\b/g, '$1 not').replace(/\bcan not\b/g, 'cannot');
}

// 判分用的比较键：在 normFill 的基础上折叠缩写，「不填」一律记成空串，空里的逗号不算。
// fold=false 时不折叠缩写（倒装位置用）。
export function fillKey(s, fold = true) {
  if (isZeroForm(s)) return '';
  const n = normFill(s);
  return (fold ? expandContractions(n) : n).replace(/,/g, ' ').replace(/\s+/g, ' ').trim();
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

const wordSet = (s) => new Set(normFill(s).replace(/,/g, ' ').split(' ').filter(Boolean));
function overlap(a, b) {
  const x = wordSet(a), y = wordSet(b);
  const inter = [...x].filter((w) => y.has(w)).length;
  const union = new Set([...x, ...y]).size;
  return union ? inter / union : 0;
}

// 几条答案是不是「同一个整句答案的几种写法」（cannot have overlooked / can't have overlooked）。
// 只有空和空紧挨着（___ (overlook) ___、___ ___）时才可能——中间印着别的词，答案就只能一空一条。
// 两条一字不差（can / can）说明是两个空碰巧同一个答案；缩写 / 全写算同一种答案的两种写法。
function looksLikeAlternatives(acc, sentence) {
  const n = blankCount(sentence);
  if (acc.length < 2 || n < 2) return false;
  for (let i = 0; i < n - 1; i++) if (!adjacentAfter(sentence, i)) return false;
  for (let i = 0; i < acc.length; i++) {
    for (let j = i + 1; j < acc.length; j++) {
      if (normFill(acc[i]) === normFill(acc[j])) return false;
      if (fillKey(acc[i]) === fillKey(acc[j])) continue;
      if (overlap(acc[i], acc[j]) < 0.5) return false;
    }
  }
  return true;
}

// 返回 [[第 1 空可接受的写法…], [第 2 空…], …]；单空题、整句作答的题返回 null。
export function fillBlankSets(q) {
  const sentence = fillSentence(q);
  const n = blankCount(sentence);
  if (n < 2) return null;

  const ba = q.blankAnswers;
  if (Array.isArray(ba) && ba.length === n && ba.every((forms) => Array.isArray(forms) && forms.length
      && forms.every((f) => typeof f === 'string'))) {
    return ba.map((forms) => uniqueForms(forms));
  }

  const acc = acceptableOf(q).filter((a) => a.trim());
  if (!acc.length) return null;
  // 括号里印着改写开头的题（(If I ___, I ___ the test.)），答案存的是整句，交给整句比对
  if (/[(（][^)）]*_+[^)）]*[)）]/.test(sentence)) return null;

  if (acc.every((a) => a.split(',').length === n && !spansStaticText(a, sentence))) {
    return Array.from({ length: n }, (_, i) => uniqueForms(acc.map((a) => a.split(',')[i])));
  }

  const plain = acc.every((a) => !a.includes(',') && !spansStaticText(a, sentence));
  if (!plain || looksLikeAlternatives(acc, sentence)) return null;
  if (acc.length === n) return acc.map((a) => [a.trim()]);
  // 老格式：一空一条之后又追加了某个空的另一种写法（had brought / would not have got / would not have gotten）。
  // 多出来的每一条挂到最像的那个空上；有一条挂不上就不猜，交给整句比对。
  if (acc.length > n) {
    const sets = acc.slice(0, n).map((a) => [a.trim()]);
    for (const extra of acc.slice(n)) {
      let best = -1, score = 0;
      sets.forEach((forms, i) => { const o = overlap(forms[0], extra); if (o > score) { score = o; best = i; } });
      if (best < 0 || score < 0.5) return null;
      sets[best].push(extra.trim());
    }
    return sets.map(uniqueForms);
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
// 紧挨着的几个空（___ (overlook) ___）怎么拆都行：cannot | have overlooked 和 cannot have | overlooked 都对。
export function gradeBlanks(sets, userAnswer, sentence = '') {
  const user = splitUserBlanks(userAnswer);
  if (user.length !== sets.length) return sets.map((forms) => ({ answers: forms, user: null, ok: false }));
  const fold = sets.map((_, i) => !invertedBlank(sentence, i));
  const res = sets.map((forms, i) => {
    const mine = fillKey(user[i], fold[i]);
    const ok = forms.some((f) => fillKey(f, fold[i]) === mine) && (mine !== '' || forms.some(isZeroForm));
    return { answers: forms, user: user[i], ok };
  });
  for (let i = 0; i < sets.length; ) {
    let j = i;
    while (j < sets.length - 1 && adjacentAfter(sentence, j)) j++;
    if (j > i && res.slice(i, j + 1).some((r) => !r.ok)) {
      const f = fold.slice(i, j + 1).every(Boolean);
      const mine = fillKey(user.slice(i, j + 1).join(' '), f);
      let combos = [''];
      for (const forms of sets.slice(i, j + 1)) {
        combos = combos.flatMap((c) => forms.map((x) => `${c} ${x}`)).slice(0, 256);
      }
      if (mine && user.slice(i, j + 1).every((u) => u.trim()) && combos.some((c) => fillKey(c, f) === mine)) {
        for (let k = i; k <= j; k++) res[k].ok = true;
      }
    }
    i = j + 1;
  }
  return res;
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
