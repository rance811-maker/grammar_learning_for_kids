const STORAGE_KEY = "grammar-quest-state";

const RANK_THRESHOLDS = [
  { rank: "master", min: 20000 },
  { rank: "diamond", min: 10000 },
  { rank: "gold", min: 5000 },
  { rank: "silver", min: 2000 },
  { rank: "bronze", min: 0 },
];

function createDefaultState() {
  const units = {};
  for (let i = 1; i <= 12; i++) {
    const practiceLevels = {};
    for (let lv = 1; lv <= 5; lv++) {
      practiceLevels[lv] = {
        unlocked: lv === 1 && i === 1,
        bestStars: 0,
        completed: false,
      };
    }
    units[i] = {
      unlocked: i === 1,
      discoverCompleted: false,
      practiceLevels,
      missionCompleted: false,
      missionContent: null,
      badgeEarned: false,
    };
  }

  return {
    player: {
      name: "",
      totalScore: 0,
      currentStreak: 0,
      lastPracticeDate: null,
      rank: "bronze",
    },
    units,
    mastery: {},
    history: [],
    badges: [],
    portfolio: [],
    settings: {
      dailyGoal: 2,
      soundEnabled: true,
    },
    placementCompleted: false,
    learningPlan: null,
    mistakes: [],
    bossCleared: false,
    bossBestAccuracy: 0,
  };
}

function toDateString(date) {
  return date.toISOString().split("T")[0];
}

function daysBetween(dateStrA, dateStrB) {
  const a = new Date(dateStrA + "T00:00:00");
  const b = new Date(dateStrB + "T00:00:00");
  return Math.round((b - a) / (1000 * 60 * 60 * 24));
}

export const store = {
  state: null,

  init() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        this.state = JSON.parse(saved);
      }
    } catch {
      // corrupted data, fall through to default
    }
    if (!this.state) {
      this.state = createDefaultState();
      this.save();
    }
    // Migration for existing saved states
    if (this.state.placementCompleted === undefined) {
      this.state.placementCompleted = false;
    }
    if (this.state.learningPlan === undefined) {
      this.state.learningPlan = null;
    }
    if (this.state.mistakes === undefined) {
      this.state.mistakes = [];
    }
    if (this.state.bossCleared === undefined) {
      this.state.bossCleared = false;
      this.state.bossBestAccuracy = 0;
    }
    return this.state;
  },

  save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch {
      console.warn("Failed to save state to localStorage");
    }
  },

  reset() {
    this.state = createDefaultState();
    this.save();
    return this.state;
  },

  // --- Player ---

  addScore(points) {
    this.state.player.totalScore += points;
    this.state.player.rank = this.getRank();
    this.save();
  },

  updateStreak() {
    const today = toDateString(new Date());
    const last = this.state.player.lastPracticeDate;

    if (!last) {
      this.state.player.currentStreak = 1;
    } else if (last === today) {
      // already practiced today, no change
    } else if (daysBetween(last, today) === 1) {
      this.state.player.currentStreak += 1;
    } else {
      this.state.player.currentStreak = 1;
    }

    this.state.player.lastPracticeDate = today;
    this.save();
  },

  getRank() {
    const score = this.state.player.totalScore;
    for (const { rank, min } of RANK_THRESHOLDS) {
      if (score >= min) return rank;
    }
    return "bronze";
  },

  // --- Units ---

  isUnitUnlocked(unitId) {
    return this.state.units[unitId]?.unlocked ?? false;
  },

  getUnitProgress(unitId) {
    const unit = this.state.units[unitId];
    if (!unit) return null;

    const levels = {};
    for (let lv = 1; lv <= 5; lv++) {
      levels[lv] = unit.practiceLevels[lv].bestStars;
    }

    return {
      discover: unit.discoverCompleted,
      levels,
      mission: unit.missionCompleted,
      badge: unit.badgeEarned,
    };
  },

  completeDiscover(unitId) {
    const unit = this.state.units[unitId];
    if (!unit) return;

    unit.discoverCompleted = true;
    // Unlock level 1 if not already
    unit.practiceLevels[1].unlocked = true;
    this.save();
  },

  completeLevel(unitId, level, stars, score) {
    const unit = this.state.units[unitId];
    if (!unit) return;

    const lv = unit.practiceLevels[level];
    if (!lv) return;

    lv.completed = true;
    if (stars > lv.bestStars) {
      lv.bestStars = stars;
    }

    this.addScore(score);
    this.unlockNextLevel(unitId, level);
    this._checkBadge(unitId);
    this.save();
  },

  unlockNextLevel(unitId, level) {
    const unit = this.state.units[unitId];
    if (!unit) return;

    const stars = unit.practiceLevels[level]?.bestStars ?? 0;
    if (stars < 1) return;

    const nextLevel = level + 1;
    if (nextLevel <= 5 && unit.practiceLevels[nextLevel]) {
      unit.practiceLevels[nextLevel].unlocked = true;
    }

    // Unit unlock: unit N+1 unlocks when Lv.3 of unit N is completed
    if (level === 3 && unit.practiceLevels[3].completed) {
      this.unlockNextUnit(unitId);
    }

    this.save();
  },

  unlockNextUnit(unitId) {
    const nextUnitId = unitId + 1;
    if (nextUnitId <= 12 && this.state.units[nextUnitId]) {
      this.state.units[nextUnitId].unlocked = true;
      this.state.units[nextUnitId].practiceLevels[1].unlocked = true;
      this.save();
    }
  },

  completeMission(unitId, content) {
    const unit = this.state.units[unitId];
    if (!unit) return;

    unit.missionCompleted = true;
    unit.missionContent = content;
    this._checkBadge(unitId);
    this.save();
  },

  _checkBadge(unitId) {
    const unit = this.state.units[unitId];
    if (!unit || unit.badgeEarned) return;

    const allLevelsCompleted = Object.values(unit.practiceLevels).every(
      (lv) => lv.completed
    );

    if (allLevelsCompleted && unit.missionCompleted) {
      unit.badgeEarned = true;
      this.earnBadge({
        id: `unit_${unitId}_complete`,
        unitId,
        name: `Unit ${unitId} Master`,
        date: toDateString(new Date()),
      });
    }
  },

  // --- Mastery ---

  recordAnswer(subSkill, isCorrect) {
    if (!this.state.mastery[subSkill]) {
      this.state.mastery[subSkill] = {
        attempts: 0,
        correct: 0,
        mastery: 0,
        lastSeen: null,
        errorCount: 0,
        reviewInterval: 1,
      };
    }

    const m = this.state.mastery[subSkill];
    m.attempts += 1;
    if (isCorrect) {
      m.correct += 1;
      m.reviewInterval = Math.min(m.reviewInterval * 2, 30);
    } else {
      m.errorCount += 1;
      m.reviewInterval = 1;
    }
    m.mastery = m.correct / m.attempts;
    m.lastSeen = toDateString(new Date());
    this.save();
  },

  getMastery(subSkill) {
    return this.state.mastery[subSkill] ?? null;
  },

  getWeakestSkills(n) {
    const entries = Object.entries(this.state.mastery);
    if (entries.length === 0) return [];

    return entries
      .filter(([, data]) => data.attempts >= 2)
      .sort((a, b) => a[1].mastery - b[1].mastery)
      .slice(0, n)
      .map(([skill, data]) => ({ skill, ...data }));
  },

  getAllMastery() {
    return { ...this.state.mastery };
  },

  // --- History ---

  recordSession(sessionData) {
    this.state.history.push({
      ...sessionData,
      date: sessionData.date || toDateString(new Date()),
    });
    this.save();
  },

  getRecentHistory(days) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const cutoffStr = toDateString(cutoff);

    return this.state.history.filter((entry) => entry.date >= cutoffStr);
  },

  getAccuracyRate() {
    if (this.state.history.length === 0) return 0;

    let totalCorrect = 0;
    let totalQuestions = 0;

    for (const session of this.state.history) {
      totalCorrect += session.correct;
      totalQuestions += session.total;
    }

    return totalQuestions > 0 ? totalCorrect / totalQuestions : 0;
  },

  getTodayLessons() {
    const today = toDateString(new Date());
    return this.state.history.filter((entry) => entry.date === today).length;
  },

  // --- Portfolio ---

  saveToPortfolio(entry) {
    this.state.portfolio.push({
      ...entry,
      date: entry.date || toDateString(new Date()),
    });
    this.save();
  },

  getPortfolio() {
    return [...this.state.portfolio];
  },

  // --- Badges ---

  earnBadge(badge) {
    const exists = this.state.badges.some((b) => b.id === badge.id);
    if (!exists) {
      this.state.badges.push({
        ...badge,
        date: badge.date || toDateString(new Date()),
      });
      this.save();
    }
  },

  getBadges() {
    return [...this.state.badges];
  },

  // --- Placement Test & Learning Plan ---

  isPlacementNeeded() {
    return !this.state.placementCompleted && this.state.history.length === 0;
  },

  completePlacement(results) {
    const correctUnitIds = new Set();

    for (const result of results) {
      const { unitId, correct, subSkill } = result;

      if (correct) {
        correctUnitIds.add(unitId);

        // Mark discover as completed and unlock the unit
        const unit = this.state.units[unitId];
        if (unit) {
          unit.unlocked = true;
          unit.discoverCompleted = true;
          unit.practiceLevels[1].unlocked = true;
        }

        // Also unlock the NEXT unit (child clearly knows the material)
        const nextUnitId = unitId + 1;
        if (nextUnitId <= 12 && this.state.units[nextUnitId]) {
          this.state.units[nextUnitId].unlocked = true;
          this.state.units[nextUnitId].practiceLevels[1].unlocked = true;
        }

        // Record mastery as correct
        this.recordAnswer(subSkill, true);
      } else {
        // Record mastery as incorrect
        this.recordAnswer(subSkill, false);
      }
    }

    // Unit 1 is always unlocked
    this.state.units[1].unlocked = true;
    this.state.units[1].practiceLevels[1].unlocked = true;

    this.state.placementCompleted = true;
    this.generateLearningPlan(results);
    this.save();
  },

  generateLearningPlan(placementResults) {
    const masteredUnits = [];
    const weakUnits = [];

    const correctSet = new Set();
    if (placementResults) {
      for (const r of placementResults) {
        if (r.correct) correctSet.add(r.unitId);
      }
    }

    for (let i = 1; i <= 12; i++) {
      if (correctSet.has(i)) {
        masteredUnits.push(i);
      } else {
        weakUnits.push(i);
      }
    }

    const sessions = [];
    let sessionId = 1;

    // Distribute weak units across sessions, progressing from level 1 to 3
    for (const unitId of weakUnits) {
      for (let level = 1; level <= 3; level++) {
        if (sessionId >= 10) break; // Reserve session 10 for comprehensive review
        sessions.push({
          id: sessionId,
          label: `第${sessionId}天`,
          unitId,
          level,
          type: "practice",
          completed: false,
        });
        sessionId++;
      }
      if (sessionId >= 10) break;
    }

    // If fewer than 9 sessions used, add review sessions for mastered units
    let masteredIndex = 0;
    let reviewLevel = 2; // Start reviews at higher levels
    while (sessionId < 10 && masteredUnits.length > 0) {
      const unitId = masteredUnits[masteredIndex % masteredUnits.length];
      sessions.push({
        id: sessionId,
        label: `第${sessionId}天`,
        unitId,
        level: reviewLevel,
        type: "review",
        completed: false,
      });
      sessionId++;
      masteredIndex++;
      if (masteredIndex % masteredUnits.length === 0) {
        reviewLevel = Math.min(reviewLevel + 1, 5);
      }
    }

    // Session 10: comprehensive review
    sessions.push({
      id: 10,
      label: "第10天",
      unitId: null,
      level: null,
      type: "综合测试",
      completed: false,
    });

    this.state.learningPlan = {
      totalSessions: 10,
      completedSessions: 0,
      sessions,
      masteredUnits,
      weakUnits,
      certificateEarned: false,
    };
  },

  completeSession(sessionId) {
    if (!this.state.learningPlan) return;

    const session = this.state.learningPlan.sessions.find(
      (s) => s.id === sessionId
    );
    if (session && !session.completed) {
      session.completed = true;
      this.state.learningPlan.completedSessions += 1;

      if (this.state.learningPlan.completedSessions >= 10) {
        this.state.learningPlan.certificateEarned = true;
      }
    }
    this.save();
  },

  getCurrentSession() {
    if (!this.state.learningPlan) return null;
    return (
      this.state.learningPlan.sessions.find((s) => !s.completed) || null
    );
  },

  // --- Error Notebook (错题本) ---

  addMistake(question, unitId, level) {
    if (!question || !question.id) return;
    // Avoid duplicates: if already in the notebook, just refresh the date.
    const existing = this.state.mistakes.find((m) => m.question.id === question.id);
    if (existing) {
      existing.date = toDateString(new Date());
      this.save();
      return;
    }
    this.state.mistakes.push({
      question,
      unitId,
      level,
      date: toDateString(new Date()),
    });
    // Cap the notebook so it stays focused on recent errors.
    if (this.state.mistakes.length > 60) {
      this.state.mistakes.shift();
    }
    this.save();
  },

  removeMistake(questionId) {
    this.state.mistakes = this.state.mistakes.filter(
      (m) => m.question.id !== questionId
    );
    this.save();
  },

  getMistakes() {
    return [...this.state.mistakes];
  },

  clearMistakes() {
    this.state.mistakes = [];
    this.save();
  },

  // --- PET Mock Challenge (BOSS) & plan progress ---

  // The BOSS is unlocked once the child has cleared Lv.3 of enough units to
  // have broad grammar coverage.
  isBossUnlocked() {
    let lv3Count = 0;
    for (let i = 1; i <= 12; i++) {
      if (this.state.units[i]?.practiceLevels[3]?.completed) lv3Count++;
    }
    return lv3Count >= 6;
  },

  recordBossResult(accuracy) {
    const passed = accuracy >= 0.7;
    if (accuracy > this.state.bossBestAccuracy) {
      this.state.bossBestAccuracy = accuracy;
    }
    if (passed && !this.state.bossCleared) {
      this.state.bossCleared = true;
      this.earnBadge({
        id: 'boss_pet_clear',
        unitId: 0,
        name: 'PET 模拟通关',
        icon: '🎓',
      });
    }
    this.save();
    return passed;
  },

  // After finishing a practice/review/boss, advance the learning plan if the
  // completed activity matches the current planned session.
  advanceLearningPlan({ unitId, level, isBoss }) {
    const cur = this.getCurrentSession();
    if (!cur) return;
    if (isBoss) {
      if (cur.type === '综合测试') this.completeSession(cur.id);
    } else if (cur.unitId === unitId && cur.level === level) {
      this.completeSession(cur.id);
    }
  },
};
