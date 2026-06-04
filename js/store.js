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
};
