import { cloud, cloudEnabled } from "./cloud.js";
import { isBuiltinId, BUILTIN_COURSES } from "./data/builtinCourses.js";

const BUILTIN_IDS = BUILTIN_COURSES.map((c) => c.id);

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
    activeCurriculumId: null,
    curricula: {},
    reviewCleared: [],
    reviewShown: [],
    practiceShown: [],
    variants: {},
  };
}

function toDateString(date) {
  // 用本地日期，不用 toISOString（那是 UTC）。国内用户早上 8 点前的练习
  // 会被记成"昨天"：连续天数误归零、"今日已完成"早上清零、见过记录窗口错位。
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function daysBetween(dateStrA, dateStrB) {
  const a = new Date(dateStrA + "T00:00:00");
  const b = new Date(dateStrB + "T00:00:00");
  return Math.round((b - a) / (1000 * 60 * 60 * 24));
}

export const store = {
  state: null,
  // 当前账号：{ name, email, userId } 表示已登录(云端)；null 表示访客(仅本机)。
  // 这是从云端会话派生的缓存，真正的会话(令牌)由 cloud.js 管理。
  account: null,
  _pushTimer: null,

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
      this._saveLocal();
    }
    this._migrate();
    this._refreshAccount();
    return this.state;
  },

  // Migration for existing saved states (run after any load).
  _migrate() {
    // 首页欢迎语要算"第几天"。云端账号有注册时间可用；访客模式没有账号，
    // 就以本机第一次打开的日期兜底。老用户此前没记过，用最早一条学习记录
    // 反推，避免把用了很久的人显示成"第 1 天"。
    // 通关判定修正：以前 0 星（能量耗尽）也会把 completed 置 true。
    // 老存档里这类关卡改成"尝试过、未通过"，否则修好判定后它们仍然自相矛盾。
    let fixed = false;
    for (const u of Object.values(this.state.units || {})) {
      for (const lv of Object.values(u?.practiceLevels || {})) {
        if (!lv) continue;
        if (lv.completed && (lv.bestStars || 0) < 1) { lv.completed = false; lv.attempted = true; fixed = true; }
        else if (lv.completed && !lv.attempted) { lv.attempted = true; fixed = true; }
      }
    }
    if (Array.isArray(this.state.history) && this.state.history.length > 500) {
      this.state.history = this.state.history.slice(-500);
      fixed = true;
    }
    if (fixed) this._saveLocal();

    if (!this.state.startedAt) {
      const first = this.state.history?.[0]?.date;
      this.state.startedAt = first || new Date().toISOString().slice(0, 10);
    }
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
    if (this.state.activeCurriculumId === undefined) {
      this.state.activeCurriculumId = null;
    }
    if (this.state.reviewCleared === undefined) {
      this.state.reviewCleared = [];
    }
    if (this.state.practiceShown === undefined) {
      this.state.practiceShown = [];
    }
    if (this.state.variants === undefined) {
      this.state.variants = {};
    }
    if (this.state.reviewShown === undefined) {
      this.state.reviewShown = [];
    }
    if (this.state.curricula === undefined) {
      this.state.curricula = {};
    }
  },

  // Write to localStorage only (no cloud push).
  _saveLocal() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch {
      console.warn("Failed to save state to localStorage");
    }
  },

  save() {
    this._saveLocal();
    // 记一个"本机有改动还没上传"的标记；cloud.saveState 成功后清掉。
    // 启动同步看到这个标记，就先把本地推上去，而不是拿云端整包覆盖本地。
    if (this.isLoggedIn()) { try { localStorage.setItem('gq-dirty', '1'); } catch { /* ignore */ } }
    this._scheduleCloudPush();
  },

  reset() {
    // "重置全部进度"只清进度，不删课程。AI 生成的课程是花钱做出来的内容，
    // 不是进度；变体、设置、起始日期同样保留。
    const old = this.state || {};
    const next = createDefaultState();
    if (old.settings) next.settings = old.settings;
    if (old.startedAt) next.startedAt = old.startedAt;
    if (old.variants) next.variants = old.variants;
    next.activeCurriculumId = old.activeCurriculumId || null;
    next.curricula = {};
    for (const [id, c] of Object.entries(old.curricula || {})) {
      if (!c) continue;
      const { progress, ...content } = c;
      if (Object.keys(content).length) next.curricula[id] = content;
    }
    this.state = next;
    this.save();
    return this.state;
  },

  // --- Accounts & Cloud Sync ---

  isLoggedIn() {
    return cloudEnabled() && cloud.hasSession();
  },

  // Refresh the cached account info from the cloud session.
  _refreshAccount() {
    const u = cloudEnabled() ? cloud.currentUser() : null;
    this.account = u && u.id
      ? { name: u.display_name || u.email, email: u.email, userId: u.id, createdAt: u.created_at || '' }
      : null;
  },

  // Debounced push so a burst of save() calls turns into a single upload.
  _scheduleCloudPush() {
    if (!this.isLoggedIn()) return;
    if (this._pushTimer) clearTimeout(this._pushTimer);
    this._pushTimer = setTimeout(() => this._pushNow(), 1500);
  },

  // 云端保存失败必须让人看见。
  //
  // 原来失败只有一行 console.warn：用户以为记录已经存到云端了，实际没有，
  // 换台设备登录就会发现进度少了一截，而且完全不知道是什么时候丢的。
  // 自己用还能忍，开放给别人之后这就是"别人家孩子的学习记录悄悄没了"。
  //
  // 做法：失败先自动重试两次（多数失败是网络抖动），仍然失败才提示，
  // 并且记下待同步状态——同一轮里不重复弹，避免变成骚扰。
  async _pushNow() {
    if (this._pushTimer) {
      clearTimeout(this._pushTimer);
      this._pushTimer = null;
    }
    if (!this.isLoggedIn()) return;

    let lastErr = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        await cloud.saveState(this.state);
        if (this._cloudSaveFailed) {
          this._cloudSaveFailed = false;
          this._notifyCloudSave({ ok: true });
        }
        return;
      } catch (e) {
        lastErr = e;
        if (attempt < 2) {
          await new Promise((r) => setTimeout(r, 800 * (attempt + 1)));
        }
      }
    }

    console.warn('Cloud save failed:', lastErr?.message);
    if (!this._cloudSaveFailed) {
      this._cloudSaveFailed = true;
      this._notifyCloudSave({ ok: false, message: lastErr?.message || '' });
    }
  },

  /** 云端保存状态变化时通知界面（app.js 挂的监听）。 */
  _notifyCloudSave(detail) {
    try {
      window.dispatchEvent(new CustomEvent('gq-cloud-save', { detail }));
    } catch { /* 非浏览器环境忽略 */ }
  },

  /** 是否有改动还没成功同步到云端。 */
  hasUnsyncedChanges() {
    return Boolean(this._cloudSaveFailed);
  },

  // Register a new account (email + password + 名字).
  // 返回 { needsConfirm }: true 表示需要去邮箱点确认链接后才能登录。
  async register(name, email, password) {
    const res = await cloud.signUp(email, password, name.trim());
    if (!res.confirmed) {
      return { needsConfirm: true };
    }
    this._refreshAccount();
    this.state.player.name = name.trim();
    this._saveLocal();
    await this._pushNow(); // seed the cloud with the guest's existing progress
    return { needsConfirm: false };
  },

  // Log in with email + password; the cloud copy becomes source of truth.
  async login(email, password) {
    try { localStorage.removeItem('gq-dirty'); } catch { /* ignore */ }
    await cloud.signIn(email, password);
    this._refreshAccount();
    const remote = await cloud.loadState();
    if (remote) {
      this.state = remote;
      this._migrate();
    } else {
      // First login on a fresh account -> seed it with local (guest) data.
      await this._pushNow();
    }
    if (this.account) this.state.player.name = this.account.name;
    this._saveLocal();
    return this.account;
  },

  // Pull the latest cloud state. Returns true if local state changed.
  async syncFromCloud() {
    if (!this.isLoggedIn()) return false;
    // 本机有还没成功上传的改动时，绝不能拿云端整包覆盖本地——
    // 那会把断网时做完的进度悄悄抹掉。此时反过来把本地推上去。
    let dirty = false;
    try { dirty = localStorage.getItem('gq-dirty') === '1'; } catch { /* ignore */ }
    if (dirty) { await this._pushNow(); return false; }
    try {
      const remote = await cloud.loadState();
      if (remote) {
        this.state = remote;
        this._migrate();
        if (this.account) this.state.player.name = this.account.name;
        this._saveLocal();
        return true;
      }
    } catch (e) {
      // Session gone/invalid -> drop back to guest mode.
      if (String(e.message).includes("NO_SESSION")) {
        this._refreshAccount();
      }
      console.warn("Cloud sync failed:", e.message);
    }
    return false;
  },

  // Log out and return to a clean guest state (so a shared device doesn't
  // leak the previous child's progress).
  async logout() {
    try { localStorage.removeItem('gq-dirty'); } catch { /* ignore */ }
    await cloud.signOut();
    this._refreshAccount();
    this.state = createDefaultState();
    this._saveLocal();
  },

  // --- Password recovery ---

  // 发送找回密码邮件到注册邮箱。
  requestPasswordReset(email) {
    const redirectTo = location.origin + location.pathname;
    return cloud.recover(email, redirectTo);
  },

  // 用户点了恢复邮件链接后，设置新密码并登录。
  async applyNewPassword(recovery, newPassword) {
    cloud.applyRecoverySession(recovery);
    await cloud.updatePassword(newPassword);
    await cloud.fetchUser();
    this._refreshAccount();
    const remote = await cloud.loadState();
    if (remote) {
      this.state = remote;
      this._migrate();
    }
    if (this.account) this.state.player.name = this.account.name;
    this._saveLocal();
    return this.account;
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

  // 通关 = 至少 1 星。所有"这关过了没"的判断都必须走这里，
  // 不要再读 completed——历史上 completed 在 0 星时也会被置 true。
  isLevelPassed(unitId, level) {
    return (this.state.units[unitId]?.practiceLevels[level]?.bestStars ?? 0) >= 1;
  },

  completeLevel(unitId, level, stars, score) {
    const unit = this.state.units[unitId];
    if (!unit) return;

    const lv = unit.practiceLevels[level];
    if (!lv) return;

    // 能量耗尽（答错 3 题）是 0 星，那是"没通过"，不是"已完成"。
    // 以前这里无条件置 completed=true，而下一关却按星数解锁，
    // 于是出现"已完成 ☆☆☆，下一关仍然锁着"的自相矛盾。
    lv.attempted = true;
    if (stars >= 1) lv.completed = true;
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
    if (level === 3 && this.isLevelPassed(unitId, 3)) {
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
    // 无上限会让每次 save 序列化、每次云端同步上传的体积一直涨
    if (this.state.history.length > 500) this.state.history = this.state.history.slice(-500);
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
    if (this.state.activeCurriculumId) return false;
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
      // 计划指向的关卡必须在生成那一刻就是解锁的：摸底只解锁了这些单元的 Lv.1，
      // 而复习从 Lv.2 起排，首页"开始今天的练习"会把孩子送进单元页上锁着的关。
      const mu = this.state.units[unitId];
      if (mu) {
        mu.unlocked = true;
        for (let l = 1; l <= reviewLevel; l++) if (mu.practiceLevels[l]) mu.practiceLevels[l].unlocked = true;
      }
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
    // 复习/BOSS/自定义包里答错的题，传进来的 unitId 是 'review'/'boss'/'custom'，
    // level 是 null，错题本和历史里会显示 "Unit review · Lv.null"。
    // 题目 id 本身带着真实归属（u-l-i / gen-u-l-i），从那里解析。
    if (typeof unitId !== 'number' || !level) {
      const m = String(question.id).match(/^(?:gen-)?(\d+)-(\d+)-\d+/);
      if (m) { unitId = Number(m[1]); level = Number(m[2]); }
    }
    const idx = this.state.mistakes.findIndex((m) => m.question.id === question.id);
    if (idx >= 0) {
      // 再次答错：刷新日期并挪到末尾。60 条上限从头淘汰，
      // 不挪位的话最常错的老题反而最先被挤掉。
      const [item] = this.state.mistakes.splice(idx, 1);
      item.date = toDateString(new Date());
      if (typeof unitId === 'number') item.unitId = unitId;
      if (level) item.level = level;
      this.state.mistakes.push(item);
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

  // --- Review Cleared (复习已掌握) ---

  addReviewCleared(questionId, sentence) {
    if (!this.state.reviewCleared) this.state.reviewCleared = [];
    const today = toDateString(new Date());
    const exists = this.state.reviewCleared.some(r => r.qid === questionId);
    if (!exists) {
      this.state.reviewCleared.push({
        qid: questionId,
        sentence: (sentence || '').trim().toLowerCase().replace(/\s+/g, ' ').slice(0, 120),
        date: today,
      });
    }
    if (this.state.reviewCleared.length > 200) {
      this.state.reviewCleared = this.state.reviewCleared.slice(-200);
    }
    this.save();
  },

  getReviewCleared() {
    if (!this.state.reviewCleared) return { ids: new Set(), sentences: new Set() };
    const now = new Date();
    const ids = new Set();
    const sentences = new Set();
    for (const r of this.state.reviewCleared) {
      const age = r.date ? daysBetween(r.date, toDateString(now)) : 0;
      if (age <= 7) {
        ids.add(r.qid);
        if (r.sentence) sentences.add(r.sentence);
      }
    }
    return { ids, sentences };
  },

  pruneReviewCleared() {
    if (!this.state.reviewCleared) return;
    const today = toDateString(new Date());
    const before = this.state.reviewCleared.length;
    this.state.reviewCleared = this.state.reviewCleared.filter(
      r => r.date && daysBetween(r.date, today) <= 7
    );
    if (this.state.reviewCleared.length !== before) this.save();
  },

  // --- Review Shown (复习已出现过的题) ---

  addReviewShown(questionIds) {
    if (!this.state.reviewShown) this.state.reviewShown = [];
    const today = toDateString(new Date());
    for (const qid of questionIds) {
      const exists = this.state.reviewShown.find(r => r.qid === qid);
      if (exists) {
        exists.date = today;
      } else {
        this.state.reviewShown.push({ qid, date: today });
      }
    }
    if (this.state.reviewShown.length > 300) {
      this.state.reviewShown.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
      this.state.reviewShown = this.state.reviewShown.slice(-300);
    }
    this.save();
  },

  getReviewShown() {
    if (!this.state.reviewShown) return new Set();
    const cutoff = toDateString(new Date(Date.now() - 30 * 86400000));
    return new Set(
      this.state.reviewShown.filter(r => r.date >= cutoff).map(r => r.qid)
    );
  },

  pruneReviewShown() {
    if (!this.state.reviewShown) return;
    const cutoff = toDateString(new Date(Date.now() - 30 * 86400000));
    const before = this.state.reviewShown.length;
    this.state.reviewShown = this.state.reviewShown.filter(r => r.date >= cutoff);
    if (this.state.reviewShown.length !== before) this.save();
  },

  // --- Practice Shown (普通练习出现过的题) ---
  // 普通练习原来完全没有"看过"的记忆：每次只是把该关固定的那几道题洗一次牌，
  // 所以反复练同一关，看到的永远是同一批题。这里记录出现过的题和时间，
  // 让选题时能优先挑没见过的、其次挑最久没见的。

  addPracticeShown(questionIds) {
    if (!this.state.practiceShown) this.state.practiceShown = [];
    const today = toDateString(new Date());
    for (const qid of questionIds) {
      if (!qid) continue;
      const exists = this.state.practiceShown.find(r => r.qid === qid);
      if (exists) {
        exists.date = today;
        exists.n = (exists.n || 1) + 1;
      } else {
        this.state.practiceShown.push({ qid, date: today, n: 1 });
      }
    }
    if (this.state.practiceShown.length > 500) {
      // 按日期淘汰最旧的，不按数组位置——更新时只改 date 不移位，
      // 按位置切会把今天刚见过的题先扔掉，明天就当"没见过"。
      this.state.practiceShown.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
      this.state.practiceShown = this.state.practiceShown.slice(-500);
    }
    this.save();
  },

  // 返回 Map: qid -> { date, n }。date 越早表示越久没见到。
  getPracticeShown() {
    const m = new Map();
    if (!this.state.practiceShown) return m;
    const cutoff = toDateString(new Date(Date.now() - 30 * 86400000));
    for (const r of this.state.practiceShown) {
      if (r.date >= cutoff) m.set(r.qid, { date: r.date, n: r.n || 1 });
    }
    return m;
  },

  prunePracticeShown() {
    if (!this.state.practiceShown) return;
    const cutoff = toDateString(new Date(Date.now() - 30 * 86400000));
    const before = this.state.practiceShown.length;
    this.state.practiceShown = this.state.practiceShown.filter(r => r.date >= cutoff);
    if (this.state.practiceShown.length !== before) this.save();
  },

  // --- Question Variants (同一知识点的不同问法) ---
  // 每关只有 8 道题，练几次就见完了。光靠去重躲不掉重复，必须能"换个说法"。
  // 变体按原题 id 存起来，累积复用，不必每次都重新生成。

  getVariants(qid) {
    if (!this.state.variants) return [];
    return this.state.variants[qid] || [];
  },

  addVariants(qid, list) {
    if (!qid || !Array.isArray(list) || !list.length) return;
    if (!this.state.variants) this.state.variants = {};
    const cur = this.state.variants[qid] || [];
    // 同一道原题最多留 4 个变体，够用且不会把存档撑爆
    this.state.variants[qid] = [...cur, ...list].slice(-4);
    this.save();
  },

  countVariants() {
    if (!this.state.variants) return 0;
    return Object.values(this.state.variants).reduce((n, a) => n + (a?.length || 0), 0);
  },

  // --- PET Mock Challenge (BOSS) & plan progress ---

  // The BOSS is unlocked once the child has cleared Lv.3 of enough units to
  // have broad grammar coverage.
  isBossUnlocked() {
    let lv3Count = 0;
    for (let i = 1; i <= 12; i++) {
      if (this.isLevelPassed(i, 3)) lv3Count++;
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

  // --- Curriculum Management ---

  switchCurriculum(newId) {
    const BUILT_IN = '__pet__';
    const currentId = this.state.activeCurriculumId || BUILT_IN;
    if (currentId === newId) return;

    if (!this.state.curricula) this.state.curricula = {};
    if (!this.state.curricula[currentId]) this.state.curricula[currentId] = {};
    this.state.curricula[currentId].progress = {
      units: this.state.units,
      mastery: this.state.mastery,
      history: this.state.history,
      mistakes: this.state.mistakes,
      badges: this.state.badges,
      portfolio: this.state.portfolio,
      learningPlan: this.state.learningPlan,
      placementCompleted: this.state.placementCompleted,
      bossCleared: this.state.bossCleared,
      bossBestAccuracy: this.state.bossBestAccuracy,
      reviewCleared: this.state.reviewCleared,
      reviewShown: this.state.reviewShown,
      practiceShown: this.state.practiceShown,
      variants: this.state.variants,
    };

    const saved = this.state.curricula[newId]?.progress;
    if (saved) {
      this.state.units = saved.units;
      this.state.mastery = saved.mastery;
      this.state.history = saved.history;
      this.state.mistakes = saved.mistakes;
      this.state.badges = saved.badges;
      this.state.portfolio = saved.portfolio;
      this.state.learningPlan = saved.learningPlan;
      this.state.placementCompleted = saved.placementCompleted ?? false;
      this.state.bossCleared = saved.bossCleared ?? false;
      this.state.bossBestAccuracy = saved.bossBestAccuracy ?? 0;
      this.state.reviewCleared = saved.reviewCleared ?? [];
      this.state.reviewShown = saved.reviewShown ?? [];
      this.state.practiceShown = saved.practiceShown ?? [];
      this.state.variants = saved.variants ?? {};
    } else {
      const def = createDefaultState();
      this.state.units = def.units;
      this.state.mastery = def.mastery;
      this.state.history = def.history;
      this.state.mistakes = def.mistakes;
      this.state.badges = def.badges;
      this.state.portfolio = def.portfolio;
      this.state.learningPlan = def.learningPlan;
      this.state.placementCompleted = def.placementCompleted;
      this.state.bossCleared = def.bossCleared;
      this.state.bossBestAccuracy = def.bossBestAccuracy;
      this.state.reviewCleared = def.reviewCleared;
      this.state.reviewShown = def.reviewShown;
      this.state.practiceShown = def.practiceShown;
      this.state.variants = def.variants;
    }

    this.state.activeCurriculumId = newId === BUILT_IN ? null : newId;
    this.save();
  },

  addCurriculum(id, data) {
    if (!this.state.curricula) this.state.curricula = {};
    this.state.curricula[id] = {
      title: data.title,
      description: data.description || '',
      goal: data.goal || '',
      material: data.material || '',
      profile: data.profile || null,
      syllabus: data.syllabus,
      unitsData: data.unitsData || {},
    };
    this.save();
  },

  /**
   * 把一套自定义课程的学习进度并到另一套（通常是内容相同的内置版），然后删掉副本。
   *
   * 为什么需要：这三套课程原本是用户自己生成的，后来做成了随代码发布的内置课程。
   * 两者 id 不同，于是同一个标题在课程列表里出现两行，而孩子的进度只在旧的那一份上。
   * 直接删旧的会连进度一起丢，直接用新的又等于从零开始——只能先搬再删。
   *
   * 返回 { ok, reason }。
   */
  mergeCurriculumProgress(fromId, toId) {
    if (!fromId || !toId || fromId === toId) return { ok: false, reason: 'BAD_ARGS' };
    if (!this.state.curricula?.[fromId]) return { ok: false, reason: 'NO_SOURCE' };

    // 正在学的那套，进度在 state 顶层而不在 curricula 里。先切走一次让它落盘，
    // 否则搬过去的会是一份过期快照。
    const active = this.state.activeCurriculumId || '__pet__';
    if (active === fromId || active === toId) {
      const parking = BUILTIN_IDS.find((x) => x !== fromId && x !== toId) || '__pet__';
      this.switchCurriculum(parking);
    }

    const from = this.state.curricula[fromId];
    if (!from.progress) return { ok: false, reason: 'NO_PROGRESS' };

    if (!this.state.curricula[toId]) this.state.curricula[toId] = {};
    this.state.curricula[toId].progress = from.progress;
    delete this.state.curricula[fromId];
    this.save();
    return { ok: true, reason: '' };
  },

  removeCurriculum(id) {
    // 内置课程的那条记录只存进度，删掉等于抹掉孩子在该课程上的学习记录。
    // 原先只挡了 __pet__，内置课程变成三套之后这条守卫就不够了。
    if (!this.state.curricula || isBuiltinId(id)) return;
    if (this.state.activeCurriculumId === id) {
      this.switchCurriculum('__pet__');
    }
    delete this.state.curricula[id];
    this.save();
  },

  // After finishing a practice/review/boss, advance the learning plan if the
  // completed activity matches the current planned session.
  advanceLearningPlan({ unitId, level, isBoss, passed }) {
    const cur = this.getCurrentSession();
    if (!cur) return;
    // 0 星（能量耗尽）不算完成这一天；综合测试不及格也不算。
    // 以前只比对单元/关卡就打勾，结果计划把孩子推进下一个仍然锁着的关，
    // 9 天全 0 星也能领"结业证书"。
    if (isBoss) {
      if (cur.type === '综合测试' && passed) this.completeSession(cur.id);
    } else if (cur.unitId === unitId && cur.level === level && this.isLevelPassed(unitId, level)) {
      this.completeSession(cur.id);
    }
  },
};
