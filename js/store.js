import { cloud, cloudEnabled } from "./cloud.js";
import { track } from "./analytics.js";
import { isBuiltinId, BUILTIN_COURSES } from "./data/builtinCourses.js";
import { buildDemoState } from "./demoState.js";

const BUILTIN_IDS = BUILTIN_COURSES.map((c) => c.id);

const STORAGE_KEY = "grammar-quest-state";
// 本机存档是哪个账号的缓存（登录过就记上，退出登录清掉）。没有它，本机存档就是没注册时做的练习。
const OWNER_KEY = "gq-owner";
// 本机有哪个账号的改动还没传上云端（存账号 id；老版本存的是 "1"）。上传成功后清掉。
const DIRTY_KEY = "gq-dirty";
// 本机存档要被别的进度换掉、又没法确定已经在云端时，先留一份在这里，免得一点就没
const BACKUP_KEY = "grammar-quest-backup";
// 在这台设备注册、要先去邮箱点确认链接：记下注册邮箱，第一次登录时把这里没注册时做的练习带进账号
const PENDING_KEY = "gq-pending-signup";

function lsGet(k) { try { return localStorage.getItem(k); } catch { return null; } }
function lsSet(k, v) { try { localStorage.setItem(k, v); } catch { /* ignore */ } }
function lsDel(k) { try { localStorage.removeItem(k); } catch { /* ignore */ } }

function hasProgress(p) {
  return Boolean(p && ((p.history && p.history.length) || p.placementCompleted));
}

// 把本机没注册时的进度并进账号已有的进度（同一套课程时）。用于：在这台设备注册、
// 去别的设备点了确认链接并练过几次，再回这台设备登录——两边的练习都要留下。
// 课程不同就不并（返回 null），由调用方以账号为准、本机留备份。
function mergeProgress(remote, local) {
  if ((remote.activeCurriculumId || null) !== (local.activeCurriculumId || null)) return null;
  const out = JSON.parse(JSON.stringify(remote));
  const byDate = (a, b) => String(a.date || '').localeCompare(String(b.date || ''));
  out.history = [...(local.history || []), ...(out.history || [])].sort(byDate).slice(-500);
  out.player = out.player || {};
  out.player.totalScore = (out.player.totalScore || 0) + (local.player?.totalScore || 0);
  for (const [id, lu] of Object.entries(local.units || {})) {
    const ru = out.units?.[id];
    if (!ru) { (out.units = out.units || {})[id] = lu; continue; }
    for (const k of ['unlocked', 'discoverCompleted', 'missionCompleted', 'badgeEarned']) ru[k] = Boolean(ru[k] || lu[k]);
    if (!ru.missionContent && lu.missionContent) ru.missionContent = lu.missionContent;
    for (const [lv, ll] of Object.entries(lu.practiceLevels || {})) {
      const rl = ru.practiceLevels?.[lv];
      if (!rl) { (ru.practiceLevels = ru.practiceLevels || {})[lv] = ll; continue; }
      for (const k of ['unlocked', 'completed', 'attempted']) rl[k] = Boolean(rl[k] || ll[k]);
      rl.bestStars = Math.max(rl.bestStars || 0, ll.bestStars || 0);
    }
  }
  out.mastery = out.mastery || {};
  for (const [k, lm] of Object.entries(local.mastery || {})) {
    const rm = out.mastery[k];
    if (!rm) { out.mastery[k] = lm; continue; }
    rm.attempts = (rm.attempts || 0) + (lm.attempts || 0);
    rm.correct = (rm.correct || 0) + (lm.correct || 0);
    rm.errorCount = (rm.errorCount || 0) + (lm.errorCount || 0);
    rm.mastery = rm.attempts ? rm.correct / rm.attempts : 0;
    if (String(lm.lastSeen || '') > String(rm.lastSeen || '')) rm.lastSeen = lm.lastSeen;
    rm.reviewInterval = Math.min(rm.reviewInterval || 1, lm.reviewInterval || 1);
  }
  const union = (a, b, key) => { const seen = new Set((a || []).map(key)); return [...(a || []), ...(b || []).filter((x) => !seen.has(key(x)))]; };
  out.badges = union(out.badges, local.badges, (b) => b.id);
  out.portfolio = union(out.portfolio, local.portfolio, (p) => `${p.unitId}|${p.date}|${String(p.content || '').slice(0, 40)}`);
  out.mistakes = union(out.mistakes, local.mistakes, (m) => m.question?.id).slice(-60);
  out.placementCompleted = Boolean(out.placementCompleted || local.placementCompleted);
  if (!out.learningPlan && local.learningPlan) out.learningPlan = local.learningPlan;
  out.bossCleared = Boolean(out.bossCleared || local.bossCleared);
  out.bossBestAccuracy = Math.max(out.bossBestAccuracy || 0, local.bossBestAccuracy || 0);
  return out;
}

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
  // 本机存档（localStorage 里那份；登录后就是账号的进度）。界面一律读 store.state。
  _state: null,
  // 未登录时给人看的示例数据，只在内存里（见 demoState.js）。
  _demoState: null,
  // 当前账号：{ name, email, userId } 表示已登录(云端)；null 表示没登录。
  // 这是从云端会话派生的缓存，真正的会话(令牌)由 cloud.js 管理。
  account: null,
  _pushTimer: null,

  // 网站要注册后才能用：没登录时 store.state 给的是示例数据，各页面照常渲染，
  // 但写到的都是这份示例，不会落盘。本机真实存档（以前没注册时做过的练习）留在 _state，
  // 注册 / 登录时带进账号。没配置云端（纯本机版）时不拦，直接用本机存档。
  get state() {
    if (!this.isDemo()) return this._state;
    if (!this._demoState) this._demoState = buildDemoState(createDefaultState);
    // 音效开关这类设置跟着本机走：没登录时关了声音，刷新后也还是关的
    if (this._state) this._demoState.settings = this._state.settings;
    return this._demoState;
  },
  set state(v) {
    this._state = v;
  },

  /** 没登录、看的是示例数据。 */
  isDemo() {
    return cloudEnabled() && !this.account;
  },

  /**
   * 这台设备上有没注册时做过的练习（不是某个账号的缓存）：示例横条要告诉他「你的记录还在」，
   * 注册时带进新账号。任何一套课程（包括没在学的、自定义的）里有进度都算。
   */
  hasLocalProgress() {
    const s = this._state;
    if (!s || lsGet(OWNER_KEY)) return false;
    if (hasProgress(s)) return true;
    return Object.entries(s.curricula || {}).some(([id, c]) => hasProgress(c && c.progress) || !isBuiltinId(id));
  },

  /** 本机存档是某个账号的，但现在没登录（登录过期）：横条和引导页要说「请重新登录」。 */
  sessionExpired() {
    return this.isDemo() && Boolean(lsGet(OWNER_KEY));
  },

  /** 本机存档里有这个账号还没上传的改动（老版本的 "1"：设备不属于别的账号时也算）。 */
  _dirtyFor(uid) {
    if (!uid) return false;
    const d = lsGet(DIRTY_KEY);
    const o = lsGet(OWNER_KEY);
    return d === uid || (d === '1' && (!o || o === uid));
  },

  _markDirty() {
    if (!cloudEnabled() || !this.account) return;
    // 本机存档是另一个账号的缓存（还没认到这个账号名下）：它的改动不算这个账号的
    const o = lsGet(OWNER_KEY);
    if (o && o !== this.account.userId) return;
    lsSet(DIRTY_KEY, this.account.userId);
  },

  /** 本机存档要被换掉前留一份（只在里面真有进度时）。 */
  _backupLocal() {
    const s = this._state;
    if (!s || !(hasProgress(s) || Object.values(s.curricula || {}).some((c) => hasProgress(c && c.progress)))) return;
    lsSet(BACKUP_KEY, JSON.stringify({ savedAt: new Date().toISOString(), owner: lsGet(OWNER_KEY) || null, state: s }));
  },

  init() {
    let saved = null;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) saved = JSON.parse(raw);
    } catch {
      // corrupted data, fall through to default
    }
    this._state = saved || createDefaultState();
    if (!saved) this._saveLocal();
    this._migrate();
    this._refreshAccount();
    // 老版本登录着的设备没记过 gq-owner：启动时就带着会话，本机存档就是这个账号的缓存
    if (this.account && !lsGet(OWNER_KEY)) {
      const d = lsGet(DIRTY_KEY);
      if (!d || d === '1' || d === this.account.userId) lsSet(OWNER_KEY, this.account.userId);
    }
    // 启动同步完成前不往云端传。页面刚打开时本机存档可能比云端旧（别的设备上练过），
    // 这时候存的一下不能被当成「本机有新改动」，把旧存档推上去盖掉云端。
    this._dirtyAtLoad = lsGet(DIRTY_KEY);
    this._startupSync = this.isLoggedIn();
    return this.state;
  },

  // Migration for existing saved states (run after any load).
  _migrate() {
    const st = this._state;
    // 首页欢迎语要算"第几天"。云端账号有注册时间可用；访客模式没有账号，
    // 就以本机第一次打开的日期兜底。老用户此前没记过，用最早一条学习记录
    // 反推，避免把用了很久的人显示成"第 1 天"。
    // 通关判定修正：以前 0 星（能量耗尽）也会把 completed 置 true。
    // 老存档里这类关卡改成"尝试过、未通过"，否则修好判定后它们仍然自相矛盾。
    let fixed = false;
    for (const u of Object.values(st.units || {})) {
      for (const lv of Object.values(u?.practiceLevels || {})) {
        if (!lv) continue;
        if (lv.completed && (lv.bestStars || 0) < 1) { lv.completed = false; lv.attempted = true; fixed = true; }
        else if (lv.completed && !lv.attempted) { lv.attempted = true; fixed = true; }
      }
    }
    if (Array.isArray(st.history) && st.history.length > 500) {
      st.history = st.history.slice(-500);
      fixed = true;
    }
    if (fixed) this._saveLocal();

    if (!st.startedAt) {
      const first = st.history?.[0]?.date;
      st.startedAt = first || new Date().toISOString().slice(0, 10);
    }
    if (st.placementCompleted === undefined) {
      st.placementCompleted = false;
    }
    if (st.learningPlan === undefined) {
      st.learningPlan = null;
    }
    if (st.mistakes === undefined) {
      st.mistakes = [];
    }
    if (st.bossCleared === undefined) {
      st.bossCleared = false;
      st.bossBestAccuracy = 0;
    }
    if (st.activeCurriculumId === undefined) {
      st.activeCurriculumId = null;
    }
    if (st.reviewCleared === undefined) {
      st.reviewCleared = [];
    }
    if (st.practiceShown === undefined) {
      st.practiceShown = [];
    }
    if (st.variants === undefined) {
      st.variants = {};
    }
    if (st.reviewShown === undefined) {
      st.reviewShown = [];
    }
    if (st.curricula === undefined) {
      st.curricula = {};
    }
  },

  // Write to localStorage only (no cloud push).
  // 返回是否真的写进去了。配额写满时浏览器会抛异常，以前只 console.warn，
  // 调用方无从知道，界面照样显示"已保存"。
  _saveLocal() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this._state));
      return true;
    } catch {
      console.warn("Failed to save state to localStorage");
      return false;
    }
  },

  save() {
    if (this.isDemo()) {
      // 没登录时页面改的是内存里的示例数据，不落盘。这个标签页手里的本机存档也不能写回去：
      // 另一个标签页可能刚登录、已经把账号的进度写进了 localStorage。只把音效开关并进去。
      try {
        const cur = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
        if (cur && this._state && cur.settings?.soundEnabled !== this._state.settings?.soundEnabled) {
          cur.settings = { ...(cur.settings || {}), soundEnabled: this._state.settings.soundEnabled };
          localStorage.setItem(STORAGE_KEY, JSON.stringify(cur));
        }
      } catch { /* ignore */ }
      return true;
    }
    const ok = this._saveLocal();
    // 记下"这个账号有改动还没上传"；上传成功、且上传期间没有新改动时才清掉（见 _pushNow）。
    // 按缓存的账号记、不按会话：登录过期后做的练习也要记着，重新登录时先把它们传上去，
    // 而不是拿云端整包覆盖本地。
    this._saveGen = (this._saveGen || 0) + 1;
    this._markDirty();
    this._scheduleCloudPush();
    return ok;
  },

  // 只记在本机、不算「有新进度要上传」：哪些题出现过这类出题用的记录。
  // 打开练习页就会写一次，要是也标成「未上传」，启动同步还没完成（或失败）时，
  // 这一下会让本机的旧缓存被当成新进度推上去，盖掉别的设备上更新的进度。
  // 这些记录会跟着下一次真正的保存一起上传。
  _saveQuiet() {
    if (this.isDemo()) return true;
    return this._saveLocal();
  },

  reset() {
    // "重置全部进度"只清进度，不删课程。AI 生成的课程是花钱做出来的内容，
    // 不是进度；变体、设置、起始日期同样保留。
    const old = this._state || {};
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
    const prev = this.account ? this.account.userId : null;
    const u = cloudEnabled() ? cloud.currentUser() : null;
    this.account = u && u.id
      ? { name: u.display_name || u.email, email: u.email, userId: u.id, createdAt: u.created_at || '' }
      : null;
    // 换了账号（含退出）：还在重试的旧上传全部作废，见 _pushNow
    if ((this.account ? this.account.userId : null) !== prev) this._acctEpoch = (this._acctEpoch || 0) + 1;
  },

  // 本机存档从现在起是这个账号的（登录 / 注册 / 同步后调用）
  _adopt() {
    if (this.account) lsSet(OWNER_KEY, this.account.userId);
    if (this.account) this._state.player.name = this.account.name;
    this._saveLocal();
  },

  // Debounced push so a burst of save() calls turns into a single upload.
  _scheduleCloudPush() {
    if (!cloudEnabled() || !this.account || this._startupSync || this._syncing) return;
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
  // 登录过期（NO_SESSION）重试没用，直接提示重新登录；改动记在本机，登录后先传。
  async _pushNow() {
    if (this._pushTimer) {
      clearTimeout(this._pushTimer);
      this._pushTimer = null;
    }
    if (!cloud.cloudEnabled() || !this.account) return;
    const uid = this.account.userId;
    // 别的标签页登录了另一个账号：这个标签页手里的进度不能写进人家的账号
    const u = cloud.currentUser();
    if (u && u.id && u.id !== uid) return;
    // 本机存档还记在另一个账号名下（同步还没认下来）：绝不能当成这个账号的进度传上去
    const owner = lsGet(OWNER_KEY);
    if (owner && owner !== uid) return;
    // 正在从云端取存档：等取完再说（取回来可能整份换掉），没上传的标记留着
    if (this._syncing) return;

    // 上传在重试的间隙里，家长可能已经退出、甚至换了别的账号登录：这时手里的存档和会话都不是
    // 当初那个账号的了，继续传会把它写进新账号。每次动手前都确认账号没变，变了就悄悄停下。
    const epoch = this._acctEpoch;
    const stale = () => {
      if (epoch !== this._acctEpoch || !this.account || this.account.userId !== uid) return true;
      const cu = cloud.currentUser();
      return Boolean(cu && cu.id && cu.id !== uid);
    };
    let lastErr = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      if (stale()) return;
      try {
        const gen = this._saveGen;
        const snap = JSON.stringify(this._state);
        await cloud.saveState(this._state);   // 只传本机/账号的真实存档，绝不传示例数据
        if (stale()) return;
        // 上传期间又存过（这个标签页、或同一账号的另一个标签页）：那些改动还没传上去，标记留着。
        // 本机 localStorage 里的那份和刚传上去的一字不差，才算真的都传完了。
        const d = lsGet(DIRTY_KEY);
        if (this._saveGen === gen && !this._pushTimer && (d === uid || d === '1') && lsGet(STORAGE_KEY) === snap) lsDel(DIRTY_KEY);
        this._resetSaveBanner();
        return;
      } catch (e) {
        lastErr = e;
        if (String(e?.message).includes('NO_SESSION')) break;
        if (attempt < 2) {
          await new Promise((r) => setTimeout(r, 800 * (attempt + 1)));
        }
      }
    }

    if (stale()) return;
    console.warn('Cloud save failed:', lastErr?.message);
    const expired = String(lastErr?.message).includes('NO_SESSION');
    const kind = expired ? 'expired' : 'network';
    if (this._cloudSaveFailed !== kind) {
      this._cloudSaveFailed = kind;
      this._notifyCloudSave({ ok: false, expired, message: lastErr?.message || '' });
    }
  },

  /** 云端保存状态变化时通知界面（app.js 挂的监听）。 */
  _notifyCloudSave(detail) {
    try {
      window.dispatchEvent(new CustomEvent('gq-cloud-save', { detail }));
    } catch { /* 非浏览器环境忽略 */ }
  },

  // 「没存到云端」的提示收起来（上传成功、退出、换了账号之后都不再适用）
  _resetSaveBanner() {
    if (!this._cloudSaveFailed) return;
    this._cloudSaveFailed = false;
    this._notifyCloudSave({ ok: true });
  },

  /** 是否有改动还没成功同步到云端。 */
  hasUnsyncedChanges() {
    return Boolean(this._cloudSaveFailed) || Boolean(this.account && this._dirtyFor(this.account.userId));
  },

  // Register a new account (email + password + 名字).
  // 返回 { needsConfirm }: true 表示需要去邮箱点确认链接后才能登录。
  async register(name, email, password) {
    const res = await cloud.signUp(email, password, name.trim());
    track("signup");
    if (!res.confirmed) {
      // 要先去邮箱确认。确认链接常在另一台设备（手机邮箱）里打开，这台设备上的旧进度
      // 要等这里第一次登录时才带进去——记下是这台设备、用这个邮箱注册的。
      if (this.hasLocalProgress()) lsSet(PENDING_KEY, email.trim().toLowerCase());
      else lsDel(PENDING_KEY);
      return { needsConfirm: true };
    }
    this._startupSync = false;
    this._refreshAccount();
    // 本机存档是别的账号的缓存（登录过期后没退出）：不能带进新账号，留个备份，新账号从头开始
    const owner = lsGet(OWNER_KEY);
    if (owner && owner !== this.account?.userId) {
      this._backupLocal();
      this._state = createDefaultState();
    }
    lsDel(PENDING_KEY);
    this._state.player.name = name.trim();
    this._resetSaveBanner();
    this._adopt();
    this._markDirty();     // 传失败的话下次启动接着传，不会被别的设备的存档盖掉
    await this._pushNow(); // seed the cloud with the guest's existing progress
    return { needsConfirm: false };
  },

  // Log in with email + password; the cloud copy becomes source of truth.
  async login(email, password) {
    await cloud.signIn(email, password);
    // 先把云端存档取到手，再认这个账号。取不到（网络断了等）就退回没登录，
    // 不然账号认了、手里却还是本机旧存档，下一次保存会把它当成账号进度覆盖到云端。
    let remote;
    try {
      remote = await cloud.loadState();
    } catch (e) {
      await cloud.signOut();
      this._refreshAccount();
      throw e;
    }
    this._startupSync = false;
    this._refreshAccount();
    track("login");
    await this._takeAccount(remote, email);
    return this.account;
  },

  // 登录 / 找回密码后决定这台设备用哪份进度。remote 是云端存档（没有就是 null）。
  async _takeAccount(remote, email = '') {
    const uid = this.account?.userId || '';
    const owner = lsGet(OWNER_KEY);
    const guest = this.hasLocalProgress();
    const pending = lsGet(PENDING_KEY);
    lsDel(PENDING_KEY);

    if (owner === uid && this._dirtyFor(uid)) {
      // 本机有这个账号登录过期后做的、还没上传的练习：以本机为准传上去
      this._adopt();
      this._markDirty();
      await this._pushNow();
      return;
    }
    // 在这台设备注册、去邮箱确认后第一次登录：照注册时答应的，带上这台设备没注册时做的练习。
    // 账号里还没练过（可能只在别的设备点确认链接时开过一下）就直接用本机的；
    // 别的设备上已经练过了，就把两边并起来。
    const fromHere = guest && pending && email && pending === String(email).trim().toLowerCase();
    const remoteUsed = Boolean(remote && Array.isArray(remote.history) && remote.history.length);
    if (fromHere && remoteUsed) {
      const merged = mergeProgress(remote, this._state);
      if (merged) {
        this._backupLocal();
        this.state = merged;
        this._migrate();
        this._state.player.rank = this.getRank();
        lsDel(DIRTY_KEY);
        this._resetSaveBanner();
        this._adopt();
        this._markDirty();
        await this._pushNow();
        return;
      }
    }
    const carry = fromHere && !remoteUsed;
    if (remote && !carry) {
      // 换成账号里的进度。本机存档要是没注册时做的练习、或别的账号没传上去的改动，先留一份备份
      if (owner !== uid && (guest || (owner && this._dirtyFor(owner)))) this._backupLocal();
      this.state = remote;
      this._migrate();
      lsDel(DIRTY_KEY);
      this._resetSaveBanner();
      this._adopt();
      return;
    }
    // 账号在云端还没有存档（或要带上本机进度）：本机是没注册时的练习就带进去；是别的账号的缓存就从头开始
    if (owner && owner !== uid) {
      this._backupLocal();
      this._state = createDefaultState();
    }
    lsDel(DIRTY_KEY);
    this._resetSaveBanner();
    this._adopt();
    this._markDirty();
    await this._pushNow();
  },

  // Pull the latest cloud state. Returns true if local state changed.
  async syncFromCloud() {
    const startup = this._startupSync;
    this._startupSync = false;
    if (!this.isLoggedIn()) return false;
    const uid = this.account?.userId;
    // 本机有这个账号还没成功上传的改动时，绝不能拿云端整包覆盖本地——
    // 那会把断网时做完的进度悄悄抹掉。此时反过来把本地推上去。
    // 启动时看的是页面打开那一刻的标记：打开后、同步前存的那一下不算。
    const d = startup ? this._dirtyAtLoad : lsGet(DIRTY_KEY);
    const o = lsGet(OWNER_KEY);
    if (uid && (!o || o === uid) && (d === uid || d === '1')) {
      lsSet(OWNER_KEY, uid);
      lsSet(DIRTY_KEY, uid);   // 老版本的 "1" 改记成账号 id，登录 / 退出时才认得出
      await this._pushNow();
      return false;
    }
    try {
      // 取存档期间别往云端传：这时候手里的可能是旧缓存、甚至另一个账号的
      let remote;
      this._syncing = true;
      try {
        remote = await cloud.loadState();
      } finally {
        this._syncing = false;
      }
      if (remote) {
        // 取存档期间排下的上传（手里是旧缓存）作废
        if (this._pushTimer) { clearTimeout(this._pushTimer); this._pushTimer = null; }
        this.state = remote;
        this._migrate();
        this._adopt();
        lsDel(DIRTY_KEY);
        return true;
      }
      // 账号在云端还没有存档（比如注册时要先去邮箱点确认链接，点完才第一次登录）：
      // 只有这台设备上真有没注册时做的练习，才传上去当作起点。确认链接常常是在另一台设备
      // （手机邮箱）里打开的，那里是空白存档，传上去会盖掉注册那台设备之后登录时要带进来的进度。
      if (this.account) {
        const guest = this.hasLocalProgress();
        // 本机存档是另一个账号的缓存：不能算进这个新账号
        if (o && o !== uid) { this._backupLocal(); this._state = createDefaultState(); }
        this._adopt();
        if (guest) {
          lsDel(PENDING_KEY);
          this._markDirty();
          await this._pushNow();
        }
      }
    } catch (e) {
      if (String(e.message).includes("NO_SESSION")) {
        // Session gone/invalid -> drop back to not-logged-in (the page shows the sample data and asks to log in).
        this._refreshAccount();
      } else if (this.account && o && o !== this.account.userId) {
        // 云端存档没读到，本机存档又是另一个账号的缓存：和 login() 一样退回没登录，
        // 不能让这个账号带着别人的进度继续保存、上传。
        await cloud.signOut();
        this._refreshAccount();
      }
      console.warn("Cloud sync failed:", e.message);
    }
    return false;
  },

  // 退出登录，本机回到空白存档（共用设备上不把上一个孩子的进度留给下一个人）。
  // 还有改动没传上去时先传；仍然传不上去就返回 { unsynced: true }，由界面问家长要不要硬退。
  async logout({ force = false } = {}) {
    if (this.account && (this._pushTimer || this._cloudSaveFailed || this._dirtyFor(this.account.userId))) {
      // 没上传的标记是整台设备共用的，改动可能是另一个标签页做的：localStorage 里是各标签页最新写入的那份
      if (lsGet(OWNER_KEY) === this.account.userId) {
        try { const raw = localStorage.getItem(STORAGE_KEY); if (raw) this._state = JSON.parse(raw); } catch { /* 用内存里的 */ }
      }
      await this._pushNow();
      if (!force && (this._cloudSaveFailed || this._dirtyFor(this.account.userId))) return { unsynced: true };
      if (this._cloudSaveFailed || this._dirtyFor(this.account.userId)) this._backupLocal();
    }
    lsDel(DIRTY_KEY);
    lsDel(OWNER_KEY);
    await cloud.signOut();
    this._refreshAccount();
    this._resetSaveBanner();
    this.state = createDefaultState();
    this._saveLocal();
    return { unsynced: false };
  },

  // --- Password recovery ---

  // 发送找回密码邮件到注册邮箱。
  requestPasswordReset(email) {
    const redirectTo = location.origin + location.pathname;
    return cloud.recover(email, redirectTo);
  },

  // 用户点了恢复邮件链接后，设置新密码并登录。
  // 和 login() 一样：网络步骤全部成功、拿到云端存档后才认这个账号；中途失败就撤掉会话。
  async applyNewPassword(recovery, newPassword) {
    cloud.applyRecoverySession(recovery, { pending: true });
    let remote;
    try {
      await cloud.updatePassword(newPassword);
      await cloud.fetchUser();
      remote = await cloud.loadState();
    } catch (e) {
      await cloud.signOut();   // 会话还只在内存里：作废链接里的令牌，不碰 localStorage
      cloud.dropPendingSession();
      this._refreshAccount();
      throw e;
    }
    cloud.commitSession();
    this._startupSync = false;
    this._refreshAccount();
    await this._takeAccount(remote, this.account?.email || '');
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
      item.question = question;   // 换成最新的题目副本，题库修过的数据（如 blankAnswers）才能带进错题本
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
    if (this.state.reviewCleared.length !== before) this._saveQuiet();
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
    this._saveQuiet();
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
    if (this.state.reviewShown.length !== before) this._saveQuiet();
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
    this._saveQuiet();
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
    if (this.state.practiceShown.length !== before) this._saveQuiet();
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
        name: `${{ __pet__: 'PET', 'preset-ielts6': '雅思 6 分', 'preset-ielts7': '雅思 7 分' }[this.state.activeCurriculumId || '__pet__'] || '综合'} 模拟通关`,
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
    // 存不下时把刚加的这套摘掉，别让内存里有、刷新后没有。
    const ok = this.save();
    if (!ok) delete this.state.curricula[id];
    return ok;
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
