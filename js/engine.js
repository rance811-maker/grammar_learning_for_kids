import { store } from "./store.js";
import { curriculum } from "./curriculum.js";

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function normalizeStr(s) {
  return String(s).trim().toLowerCase().replace(/\s+/g, ' ');
}

// Robustly compare a learner's fill-in answer against the accepted answers.
// Multi-blank questions are collected as blanks joined by ", " (e.g. "Will, visit").
// But AI-authored answers may store the full phrase spanning the blanks, INCLUDING
// the static words printed between them (e.g. "Will you visit" — where "you" is not
// a blank). So we compare several representations of the learner's answer:
//   1. the comma-joined form            → "will, visit"
//   2. the blanks joined by a space     → "will visit"
//   3. the blanks re-interleaved with   → "will you visit"
//      the sentence's static text between blanks (parenthetical hints stripped)
function matchFillAnswer(userAnswer, acceptable, sentence) {
  const norm = (s) => normalizeStr(s);
  const normComma = (s) => norm(s).replace(/\s*,\s*/g, ', ');

  const blanks = String(userAnswer).split(/\s*,\s*/).map((b) => b.trim());

  // Per-blank convention: AI-authored multi-blank fills often store one answer
  // per blank as separate array entries (e.g. blanks ["will become","was","is"]
  // vs acceptableAnswers ["will become","was","is"]). When the entry count lines
  // up with the blank count, match each blank against the entry in the same
  // position — every blank must match its own answer.
  if (blanks.length > 1 && acceptable.length === blanks.length) {
    const allMatch = blanks.every((b, i) => normalizeStr(b) === normalizeStr(acceptable[i]));
    if (allMatch) return true;
  }

  const candidates = new Set();
  candidates.add(normComma(userAnswer));      // comma form
  candidates.add(norm(blanks.join(' ')));     // plain space-join

  // Reconstruct using the static words between blanks, taken from the sentence.
  if (sentence) {
    const parts = String(sentence).split(/_+/);
    if (parts.length - 1 === blanks.length && blanks.length > 1) {
      const stripHint = (s) => s.replace(/\([^)]*\)/g, ' ').trim();
      let rebuilt = blanks[0];
      for (let i = 1; i < blanks.length; i++) {
        const mid = stripHint(parts[i] || '');
        rebuilt += (mid ? ' ' + mid + ' ' : ' ') + blanks[i];
      }
      candidates.add(norm(rebuilt));
    }
  }

  return acceptable.some((ans) => {
    const a = norm(ans);
    const ac = normComma(ans);
    return candidates.has(a) || candidates.has(ac);
  });
}

const COMBO_MULTIPLIERS = [
  { threshold: 10, multiplier: 3 },
  { threshold: 5, multiplier: 2 },
  { threshold: 3, multiplier: 1.5 },
];

function getComboMultiplier(combo) {
  for (const { threshold, multiplier } of COMBO_MULTIPLIERS) {
    if (combo >= threshold) return multiplier;
  }
  return 1;
}

function calculateStars(wrongCount, energyRemaining) {
  if (energyRemaining <= 0) return 0;
  if (wrongCount === 0) return 3;
  if (wrongCount <= 2) return 2;
  return 1;
}

function getUnits() {
  return curriculum.getUnits();
}

// 题目的"内容键"，用来判断两道题是不是同一句话。
// 只看题干本身（句子 / 正确句 / 词块 / 配对项 / 情境），绝不用 instruction——
// 那是"选择正确的形式"这类通用提示语，拿它去重会把整关同类型的题当成一道，
// 一次练习里找错题、排序题、配对题各只能出 1 道。
export function questionTextKey(q) {
  if (!q) return '';
  let t = q.sentence || q.correctSentence || q.context || '';
  if (!t && Array.isArray(q.words)) t = q.words.join(' ');
  if (!t && Array.isArray(q.left)) t = [...q.left, ...(q.right || [])].join(' | ');
  if (!t && Array.isArray(q.dialogue)) {
    t = q.dialogue.map((d) => (typeof d === 'string' ? d : (d && d.text) || '')).join(' ');
  }
  return String(t).trim().toLowerCase().replace(/\s+/g, ' ').slice(0, 120);
}

function getQuestionsForLevel(unitId, level) {
  const unit = getUnits()[unitId];
  if (!unit?.levels?.[level]) return [];
  return unit.levels[level].questions || [];
}

function getAllQuestionsForUnit(unitId) {
  const unit = getUnits()[unitId];
  if (!unit?.levels) return [];
  const all = [];
  for (const level of Object.values(unit.levels)) {
    if (level.questions) {
      all.push(...level.questions);
    }
  }
  return all;
}

function findReviewQuestions(excludeUnitId, weakSkills, count) {
  const candidates = [];
  const units = getUnits();

  for (const { skill } of weakSkills) {
    for (const [uid, unit] of Object.entries(units)) {
      const unitId = Number(uid);
      if (unitId === excludeUnitId) continue;
      if (!store.isUnitUnlocked(unitId)) continue;

      for (const level of Object.values(unit.levels || {})) {
        for (const q of level.questions || []) {
          if (q.subSkill === skill) {
            candidates.push(q);
          }
        }
      }
    }
  }

  return shuffle(candidates).slice(0, count);
}

export const engine = {
  createSession(unitId, level) {
    const questions = this.selectQuestions(unitId, level, 12);

    return {
      unitId,
      level,
      questions,
      repeatedCount: questions.repeatedCount || 0,
      currentIndex: 0,
      answers: [],
      energy: 3,
      maxEnergy: 3,
      score: 0,
      combo: 0,
      maxCombo: 0,
      startTime: Date.now(),
    };
  },

  // Test helper: build a session for one specific question (by id, e.g. "1-2-4")
  // or all questions of one type (e.g. "match"). Used by the #practice/demo/<x>
  // route to jump straight to a question without playing through a level.
  createDemoSession(query) {
    const all = [];
    for (const unitId of Object.keys(getUnits())) {
      all.push(...getAllQuestionsForUnit(Number(unitId)));
    }
    const TYPES = ["choice", "match", "fill", "reorder", "error", "scenario"];
    const questions = TYPES.includes(query)
      ? all.filter((q) => q.type === query)
      : all.filter((q) => q.id === query);

    return {
      unitId: "demo",
      level: 0,
      questions,
      currentIndex: 0,
      answers: [],
      energy: 99,
      maxEnergy: 99,
      score: 0,
      combo: 0,
      maxCombo: 0,
      startTime: Date.now(),
    };
  },

  selectQuestions(unitId, level, count) {
    store.prunePracticeShown();
    const shown = store.getPracticeShown();   // Map: qid -> { date, n }

    function byStaleness(a, b) {
      const sa = shown.get(a.id) || { date: '', n: 0 };
      const sb = shown.get(b.id) || { date: '', n: 0 };
      if (sa.date !== sb.date) return sa.date < sb.date ? -1 : 1;
      return (sa.n || 0) - (sb.n || 0);
    }

    // 一道题最近见过，就看它有没有"没见过的变体"顶上；原题和变体都见过，
    // 就挑其中最久没见的那个，而不是永远回到原题。
    function freshest(q) {
      if (!q || !shown.has(q.id)) return q;
      const vs = store.getVariants(q.id).filter((v) => v && v.id);
      const unseenVariant = vs.find((v) => !shown.has(v.id));
      if (unseenVariant) return unseenVariant;
      return [q, ...vs].sort(byStaleness)[0];
    }

    const picked = [];
    const pickedIds = new Set();
    const usedText = new Set();
    function take(q) {
      if (!q || pickedIds.has(q.id)) return false;
      const k = questionTextKey(q);
      if (k && usedText.has(k)) return false;
      picked.push(q);
      pickedIds.add(q.id);
      if (k) usedText.add(k);
      return true;
    }

    // 候选池 = 整个单元，按"离本关多远"分层，近层优先。
    // 原来是先把本关 8 题全部取走再补别的关的题——于是立刻重试时本关 8 题原样
    // 再来一遍。现在的规则：只要单元里还有没见过的题，就绝不出已经见过的；
    // 见过的题只在整个单元都做完一遍之后才会重新出现，并且如实告诉孩子。
    const unit = getUnits()[unitId];
    const tiers = [];
    for (const [lk, lv] of Object.entries(unit?.levels || {})) {
      const dist = Math.abs(Number(lk) - Number(level));
      (tiers[dist] ||= []).push(...(lv.questions || []));
    }
    const seen = [];
    for (const pool of tiers) {
      if (!pool) continue;
      const mapped = pool.map(freshest);
      // 1) 本单元没见过的题，离本关近的先出，同一层内打乱
      for (const q of shuffle(mapped.filter((q) => !shown.has(q.id)))) {
        if (picked.length >= count) break;
        take(q);
      }
      for (const q of mapped) if (shown.has(q.id)) seen.push(q);
    }

    // 2) 薄弱技能的复习题（来自其它单元），同样只要没见过的，最多占三成
    const weakSkills = store.getWeakestSkills(5);
    if (weakSkills.length && picked.length < count) {
      const reviewCount = Math.min(4, Math.floor(count * 0.3));
      const before = picked.length;
      for (const q of findReviewQuestions(unitId, weakSkills, reviewCount * 3).map(freshest)) {
        if (picked.length >= count || picked.length - before >= reviewCount) break;
        if (!shown.has(q.id)) take(q);
      }
    }

    // 3) 全部见过了才允许重复：挑最久没见的，并记下重复了几道
    let repeated = 0;
    if (picked.length < count) {
      for (const q of seen.sort(byStaleness)) {
        if (picked.length >= count) break;
        if (take(q)) repeated++;
      }
    }

    // 不在这里记"见过"——那会把没显示过的题也烧掉（能量耗尽、中途退出、刷新）。
    // 改为每道题真正显示出来时再记（practice.js renderCurrentQuestion）。
    const final = shuffle(picked).slice(0, count);
    final.repeatedCount = Math.min(repeated, final.length);
    return final;
  },

  // Build a session from the error notebook + weakest skills, for focused review.
  // Excludes questions answered correctly in recent reviews (7-day window) and
  // deduplicates by sentence text so the same sentence never appears twice.
  createReviewSession(count = 12) {
    store.pruneReviewCleared();
    store.pruneReviewShown();
    const { ids: clearedIds, sentences: clearedSentences } = store.getReviewCleared();
    const shownIds = store.getReviewShown();
    const mistakes = store.getMistakes();
    const seenIds = new Set();
    const seenSentences = new Set(clearedSentences);
    const questions = [];

    function sentenceKey(q) {
      return questionTextKey(q);
    }

    function canAdd(q) {
      if (!q || seenIds.has(q.id) || clearedIds.has(q.id)) return false;
      const sk = sentenceKey(q);
      if (sk && seenSentences.has(sk)) return false;
      return true;
    }

    function add(q) {
      questions.push(q);
      seenIds.add(q.id);
      const sk = sentenceKey(q);
      if (sk) seenSentences.add(sk);
    }

    function findAlternative(subSkill) {
      const candidates = [];
      for (const [uid, unit] of Object.entries(getUnits())) {
        if (!store.isUnitUnlocked(Number(uid))) continue;
        for (const level of Object.values(unit.levels || {})) {
          for (const q of level.questions || []) {
            if (q.subSkill === subSkill && canAdd(q) && !shownIds.has(q.id)) {
              candidates.push(q);
            }
          }
        }
      }
      return candidates.length ? candidates[Math.floor(Math.random() * candidates.length)] : null;
    }

    for (let i = mistakes.length - 1; i >= 0 && questions.length < count; i--) {
      const q = mistakes[i].question;
      if (!canAdd(q)) continue;
      if (shownIds.has(q.id) && q.subSkill) {
        const alt = findAlternative(q.subSkill);
        if (alt) { add(alt); continue; }
      }
      add(q);
    }

    if (questions.length < count) {
      const weakSkills = store.getWeakestSkills(8);
      const pool = [];
      for (const { skill } of weakSkills) {
        for (const [uid, unit] of Object.entries(getUnits())) {
          if (!store.isUnitUnlocked(Number(uid))) continue;
          for (const level of Object.values(unit.levels || {})) {
            for (const q of level.questions || []) {
              if (q.subSkill === skill && canAdd(q)) {
                pool.push(q);
              }
            }
          }
        }
      }
      for (const q of shuffle(pool)) {
        if (questions.length >= count) break;
        if (canAdd(q)) add(q);
      }
    }

    // "见过"改为显示时再记，见 practice.js renderCurrentQuestion

    return {
      unitId: 'review',
      level: null,
      questions: shuffle(questions),
      currentIndex: 0,
      answers: [],
      energy: 3,
      maxEnergy: 3,
      score: 0,
      combo: 0,
      maxCombo: 0,
      startTime: Date.now(),
    };
  },

  createCustomSession(questions) {
    const pool = shuffle(questions).slice(0, 15);
    return {
      unitId: 'custom',
      level: null,
      questions: pool,
      currentIndex: 0,
      answers: [],
      energy: 3,
      maxEnergy: 3,
      score: 0,
      combo: 0,
      maxCombo: 0,
      startTime: Date.now(),
    };
  },

  // Comprehensive PET mock: pull a balanced spread of questions from every
  // unlocked unit, cross-grammar, as the final milestone challenge.
  createBossSession(count = 15) {
    const unlockedUnits = [];
    for (let unitId = 1; unitId <= 12; unitId++) {
      if (store.isUnitUnlocked(unitId) && getAllQuestionsForUnit(unitId).length) {
        unlockedUnits.push(unitId);
      }
    }

    const questions = [];
    const seen = new Set();

    // Round-robin one question per unit until we reach the target count.
    const perUnitPools = unlockedUnits.map((uid) =>
      shuffle(getAllQuestionsForUnit(uid))
    );
    let added = true;
    while (questions.length < count && added) {
      added = false;
      for (const pool of perUnitPools) {
        if (questions.length >= count) break;
        const q = pool.find((x) => !seen.has(x.id));
        if (q) {
          questions.push(q);
          seen.add(q.id);
          added = true;
        }
      }
    }

    return {
      unitId: 'boss',
      level: null,
      questions: shuffle(questions),
      currentIndex: 0,
      answers: [],
      energy: 5,
      maxEnergy: 5,
      score: 0,
      combo: 0,
      maxCombo: 0,
      startTime: Date.now(),
    };
  },

  checkAnswer(question, userAnswer) {
    const type = question.type;
    let correct = false;
    let correctAnswer = "";
    const explanation = question.explanation || "";
    // For "error" (click-the-wrong-word) questions, the word that should
    // replace the mistake — surfaced so learners always see the right word.
    const correction = question.correction || "";

    switch (type) {
      case "choice":
      case "scenario":
        correct = userAnswer === question.correctIndex;
        correctAnswer = question.options?.[question.correctIndex] ?? "";
        break;

      case "reorder": {
        const clean = (s) =>
          String(s).trim().toLowerCase()
            .replace(/[.,!?;:'"，。！？；：''""]+/g, "")
            .replace(/\s+/g, " ")
            .trim();
        correct = clean(userAnswer) === clean(question.correctSentence);
        correctAnswer = question.correctSentence;
        break;
      }

      case "error":
        correct = userAnswer === question.errorIndex;
        correctAnswer = question.words?.[question.errorIndex] ?? "";
        break;

      case "match": {
        const userPairs = Array.isArray(userAnswer) ? userAnswer : [];
        const expected = question.correctPairs || [];
        const left = question.left || [];
        const right = question.right || [];
        // Compare by the DISPLAYED values, not the card indices. This way, when
        // two right-side cards show the same thing (e.g. two "Present
        // Continuous"), connecting a left item to EITHER matching card counts as
        // correct — so the right column only needs to explain the concept and
        // never has to give away which specific card the answer is.
        const stripTags = (s) => String(s).replace(/<[^>]*>/g, " ");
        const leftVal = (i) => normalizeStr(stripTags(left[i] ?? i));
        const rightVal = (i) => normalizeStr(stripTags(right[i] ?? i));
        correct =
          userPairs.length === expected.length &&
          expected.every((pair) =>
            userPairs.some(
              (up) =>
                leftVal(up[0]) === leftVal(pair[0]) &&
                rightVal(up[1]) === rightVal(pair[1])
            )
          );
        correctAnswer = expected
          .map((p) => `${stripTags(left[p[0]] ?? p[0]).trim()} → ${stripTags(right[p[1]] ?? p[1]).trim()}`)
          .join(", ");
        break;
      }

      case "fill": {
        const acceptable = question.acceptableAnswers?.length
          ? question.acceptableAnswers
          : [question.correctAnswer || question.answer].filter(Boolean);
        correct = matchFillAnswer(userAnswer, acceptable, question.sentence);
        correctAnswer = acceptable[0] || "";
        break;
      }

      default:
        correct = false;
        correctAnswer = "";
    }

    return { correct, correctAnswer, explanation, correction };
  },

  calculateResults(session) {
    let wrongCount = 0;
    let totalScore = 0;
    let combo = 0;
    let maxCombo = 0;
    const weakPoints = [];

    for (const answer of session.answers) {
      if (answer.correct) {
        combo += 1;
        if (combo > maxCombo) maxCombo = combo;
        const multiplier = getComboMultiplier(combo);
        totalScore += Math.round(10 * multiplier);
      } else {
        wrongCount += 1;
        combo = 0;
        if (answer.subSkill) {
          weakPoints.push(answer.subSkill);
        }
      }
    }

    const stars = calculateStars(wrongCount, session.energy);
    const total = session.answers.length;
    const correctCount = total - wrongCount;

    return {
      stars,
      score: totalScore,
      comboMax: maxCombo,
      accuracy: total > 0 ? correctCount / total : 0,
      weakPoints: [...new Set(weakPoints)],
    };
  },

  getRecommendation() {
    for (let unitId = 1; unitId <= 12; unitId++) {
      if (!store.isUnitUnlocked(unitId)) continue;

      const unit = store.state.units[unitId];

      // Check if mission is available but not done
      const lv3Done = store.isLevelPassed(unitId, 3);
      if (lv3Done && !unit.missionCompleted) {
        return { type: "mission", unitId, level: null };
      }

      // Find the next incomplete level
      for (let lv = 1; lv <= 5; lv++) {
        const level = unit.practiceLevels[lv];
        // 0 星的关 completed 曾为 true 被跳过，推荐从此退化成永远指回 Lv.1
        if (level.unlocked && (level.bestStars ?? 0) < 1) {
          return { type: "level", unitId, level: lv };
        }
      }
    }

    // All done or need review - recommend weakest skill review
    const weak = store.getWeakestSkills(1);
    if (weak.length > 0) {
      return { type: "review", unitId: 1, level: 1 };
    }

    return { type: "level", unitId: 1, level: 1 };
  },
};
