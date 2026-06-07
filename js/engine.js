import { store } from "./store.js";
import { units } from "./data/units.js";

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function normalizeStr(s) {
  return String(s).trim().toLowerCase();
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

function getQuestionsForLevel(unitId, level) {
  const unit = units?.[unitId];
  if (!unit?.levels?.[level]) return [];
  return unit.levels[level].questions || [];
}

function getAllQuestionsForUnit(unitId) {
  const unit = units?.[unitId];
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

  for (const { skill } of weakSkills) {
    for (const [uid, unit] of Object.entries(units || {})) {
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

  selectQuestions(unitId, level, count) {
    const mainPool = shuffle(getQuestionsForLevel(unitId, level));
    const weakSkills = store.getWeakestSkills(5);
    const reviewCount = weakSkills.length > 0 ? Math.min(4, Math.floor(count * 0.3)) : 0;
    const mainCount = count - reviewCount;

    let mainQuestions = mainPool.slice(0, mainCount);

    // If not enough questions from the target level, pull from the whole unit
    if (mainQuestions.length < mainCount) {
      const unitPool = shuffle(getAllQuestionsForUnit(unitId));
      const seen = new Set(mainQuestions.map((q) => q.id));
      for (const q of unitPool) {
        if (mainQuestions.length >= mainCount) break;
        if (!seen.has(q.id)) {
          mainQuestions.push(q);
          seen.add(q.id);
        }
      }
    }

    let reviewQuestions = [];
    if (reviewCount > 0) {
      reviewQuestions = findReviewQuestions(unitId, weakSkills, reviewCount);
    }

    // If we still don't have enough, fill from main pool
    let combined = [...mainQuestions, ...reviewQuestions];
    if (combined.length < count) {
      const seen = new Set(combined.map((q) => q.id));
      for (const q of mainPool) {
        if (combined.length >= count) break;
        if (!seen.has(q.id)) {
          combined.push(q);
          seen.add(q.id);
        }
      }
    }

    return shuffle(combined).slice(0, count);
  },

  // Build a session from the error notebook + weakest skills, for focused review.
  createReviewSession(count = 12) {
    const mistakes = store.getMistakes();
    const seen = new Set();
    const questions = [];

    // Most recent mistakes first.
    for (let i = mistakes.length - 1; i >= 0 && questions.length < count; i--) {
      const q = mistakes[i].question;
      if (q && !seen.has(q.id)) {
        questions.push(q);
        seen.add(q.id);
      }
    }

    // Top up with questions targeting the weakest skills.
    if (questions.length < count) {
      const weakSkills = store.getWeakestSkills(8);
      const pool = [];
      for (const { skill } of weakSkills) {
        for (const [uid, unit] of Object.entries(units || {})) {
          if (!store.isUnitUnlocked(Number(uid))) continue;
          for (const level of Object.values(unit.levels || {})) {
            for (const q of level.questions || []) {
              if (q.subSkill === skill && !seen.has(q.id)) {
                pool.push(q);
              }
            }
          }
        }
      }
      for (const q of shuffle(pool)) {
        if (questions.length >= count) break;
        if (!seen.has(q.id)) {
          questions.push(q);
          seen.add(q.id);
        }
      }
    }

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
        const acceptable = question.acceptableAnswers || [
          question.correctAnswer,
        ];
        correct = acceptable.some(
          (ans) => normalizeStr(ans) === normalizeStr(userAnswer)
        );
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
      const lv3Done = unit.practiceLevels[3]?.completed;
      if (lv3Done && !unit.missionCompleted) {
        return { type: "mission", unitId, level: null };
      }

      // Find the next incomplete level
      for (let lv = 1; lv <= 5; lv++) {
        const level = unit.practiceLevels[lv];
        if (level.unlocked && !level.completed) {
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
