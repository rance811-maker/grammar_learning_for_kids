import { store } from '../store.js';
import { curriculum } from '../curriculum.js';
import { engine } from '../engine.js';
import { cloud } from '../cloud.js';

// 段位从低到高。顺序即是段位阶梯，别的地方要按序展示就靠它。
const RANK_LADDER = [
  { key: 'bronze', icon: '🥉', name: '青铜', min: 0 },
  { key: 'silver', icon: '🥈', name: '白银', min: 2000 },
  { key: 'gold', icon: '🥇', name: '黄金', min: 5000 },
  { key: 'diamond', icon: '💎', name: '钻石', min: 10000 },
  { key: 'master', icon: '👑', name: '大师', min: 20000 },
];

const RANK_INFO = Object.fromEntries(RANK_LADDER.map((r) => [r.key, r]));

// 鼓励语按当天轮换，同一天进来看到的是同一句，不会每次刷新都换一句。
const CHEERS = [
  '今天也来一小步，积累就是这么攒出来的。',
  '慢一点没关系，别停下就行。',
  '错的题才是真正在教你东西。',
  '每天二十分钟，一年就是一百多个小时。',
  '昨天不会的，今天可能就会了。',
  '坚持这件事，本身就很厉害。',
  '一次练不完也没关系，先开个头。',
];

/** 从起始日期算到今天是第几天（含起始当天，所以最小是 1）。 */
function daysSince(dateStr) {
  if (!dateStr) return 1;
  const start = new Date(dateStr);
  if (Number.isNaN(start.getTime())) return 1;
  const d0 = Date.UTC(start.getFullYear(), start.getMonth(), start.getDate());
  const now = new Date();
  const d1 = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.max(1, Math.floor((d1 - d0) / 86400000) + 1);
}

/**
 * 首页顶部：左边是给孩子的欢迎语，右边是段位/积分/连续天数。
 * 段位那几个数是次要信息（参照多邻国把排位放在独立页面），
 * 所以压成一行、靠右、点开进「我的进度」看完整阶梯。
 */
function renderHeader(player) {
  const rank = RANK_INFO[player.rank] || RANK_INFO.bronze;
  // 注册时填的「名字（昵称）」是小朋友的名字，没登录就不称呼具体的人。
  const name = store.account?.name || '';
  const day = daysSince(store.account?.createdAt || store.state.startedAt);
  const cheer = CHEERS[day % CHEERS.length];

  const greet = name ? `亲爱的 ${escapeHtml(name)}，` : '亲爱的同学，';
  const sinceLine = name
    ? `这是你注册 Grammar Quest 并学习的第 <strong>${day}</strong> 天。`
    : `这是你使用 Grammar Quest 的第 <strong>${day}</strong> 天。`;

  return `
    <div class="home-header">
      <div class="home-header__hello">
        <div class="home-header__greet">${greet}</div>
        <div class="home-header__sub">${sinceLine}${cheer}</div>
      </div>
      <a class="status-strip" href="#stats" title="查看完整进度">
        <span class="status-strip__item">${rank.icon} ${rank.name}</span>
        <span class="status-strip__item">⭐ ${player.totalScore}</span>
        <span class="status-strip__item">🔥 ${player.currentStreak}</span>
        <span class="status-strip__more">详情 ›</span>
      </a>
    </div>`;
}

const UNIT_ICONS = ['📗', '📘', '📙', '📕', '📒', '📓', '📔', '📖', '🔖', '📚', '🏅', '🏆'];

function getUnitStatus(unitId) {
  const state = store.state.units[unitId];
  if (!state) return 'locked';
  if (!state.unlocked) return 'locked';

  const allCompleted = Object.values(state.practiceLevels).every(lv => lv.completed);
  if (allCompleted && state.missionCompleted) return 'completed';

  const anyStarted = state.discoverCompleted ||
    Object.values(state.practiceLevels).some(lv => lv.completed);
  if (anyStarted) return 'in-progress';

  return 'available';
}

function getTotalStars(unitId) {
  const state = store.state.units[unitId];
  if (!state) return 0;
  let total = 0;
  for (const lv of Object.values(state.practiceLevels)) {
    total += lv.bestStars;
  }
  return total;
}

function renderStars(earned, max) {
  let html = '';
  for (let i = 0; i < max; i++) {
    html += i < earned
      ? '<span class="star--earned">⭐</span>'
      : '<span class="star--empty">⭐</span>';
  }
  return html;
}

export function render() {
  const { player } = store.state;
  const todayLessons = store.getTodayLessons();
  const dailyGoal = store.state.settings.dailyGoal;
  const units = curriculum.getUnits();
  const currTitle = curriculum.getActiveTitle();
  const isBuiltIn = curriculum.isBuiltIn();
  const allCurricula = curriculum.listAll();

  let nodesHtml = '';
  const unitIds = Object.keys(units).map(Number).sort((a, b) => a - b);

  unitIds.forEach((uid, idx) => {
    const unitData = units[uid];
    const status = getUnitStatus(uid);
    const stars = getTotalStars(uid);
    const icon = UNIT_ICONS[idx] || '📗';

    const statusClass = `unit-node--${status}`;
    const circleContent = status === 'locked'
      ? '<span class="unit-node__lock-icon">🔒</span>'
      : `<span>${icon}</span>`;

    const statusLabel = {
      'locked': '未解锁',
      'available': '开始学习',
      'in-progress': '学习中',
      'completed': '已完成',
    }[status] || '';

    const starsHtml = status === 'locked'
      ? `<div class="unit-node__status">🔒 ${statusLabel}</div>`
      : `<div class="unit-node__stars">${renderStars(Math.min(Math.round(stars / 5), 3), 3)}</div>`;

    const needsGen = unitData._needsGeneration ? ' unit-node--needs-gen' : '';
    nodesHtml += `
      <div class="unit-node ${statusClass}${needsGen}" data-unit-id="${uid}">
        <div class="unit-node__circle">${circleContent}</div>
        <div class="unit-node__no">Unit ${uid}</div>
        <span class="unit-node__name">${unitData.title || 'Unit ' + uid}</span>
        ${starsHtml}
      </div>`;
  });

  const progressPct = Math.min(Math.round((todayLessons / dailyGoal) * 100), 100);

  // Learning plan section
  let planHtml = '';
  const plan = store.state.learningPlan;
  if (plan && !plan.certificateEarned) {
    const currentSession = store.getCurrentSession();
    const masteredCount = plan.masteredUnits.length;
    const planPct = Math.round((plan.completedSessions / plan.totalSessions) * 100);

    let sessionBtnHtml = '';
    if (currentSession) {
      const sessionLabel = currentSession.type === '综合测试'
        ? '综合测试'
        : `Unit ${currentSession.unitId} · Lv.${currentSession.level}`;
      sessionBtnHtml = `
        <button class="btn btn--primary btn--large" id="todayPracticeBtn"
                style="width:100%;margin-top:var(--space-md);font-size:1rem;padding:var(--space-md);">
          开始今天的练习 — ${sessionLabel}
        </button>`;
    }

    planHtml = `
      <div class="card mb-md" style="padding:var(--space-lg);background:linear-gradient(135deg, var(--color-surface), var(--color-bg));">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--space-sm);">
          <div style="font-weight:700;font-size:1.05rem;">学习计划</div>
          <span class="badge badge--success" style="font-size:var(--text-xs);">已掌握 ${masteredCount}/12 语法点</span>
        </div>
        <div style="font-size:var(--text-sm);color:var(--color-text-light);margin-bottom:var(--space-sm);">
          计划进度 <strong>${plan.completedSessions}</strong> / ${plan.totalSessions}
        </div>
        <div class="progress-bar">
          <div class="progress-bar__fill" style="width:${planPct}%;"></div>
        </div>
        ${sessionBtnHtml}
      </div>`;
  } else if (plan && plan.certificateEarned) {
    planHtml = `
      <div class="card mb-md" style="padding:var(--space-lg);text-align:center;background:linear-gradient(135deg,#fff9db,#ffe8a1);">
        <div style="font-size:2.5rem;margin-bottom:var(--space-sm);">🎓</div>
        <div style="font-weight:700;font-size:1.1rem;margin-bottom:var(--space-xs);">恭喜结业！</div>
        <div style="font-size:var(--text-sm);color:var(--color-text-light);">你已完成 Think 2 语法冲刺计划！</div>
      </div>`;
  }

  // PET mock challenge (BOSS) card — appears once enough units are cleared.
  let bossHtml = '';
  if (store.isBossUnlocked()) {
    const cleared = store.state.bossCleared;
    const bestPct = Math.round((store.state.bossBestAccuracy || 0) * 100);
    bossHtml = `
      <div class="card mb-md boss-card" id="bossCard">
        <div class="boss-card__icon">${cleared ? '🎓' : '👹'}</div>
        <div class="boss-card__info">
          <div class="boss-card__title">PET 模拟挑战 ${cleared ? '✅' : ''}</div>
          <div class="boss-card__desc">
            ${cleared
              ? `已通关！最佳正确率 ${bestPct}%，可再次挑战刷新纪录`
              : '跨单元综合大考，正确率达 70% 即通关，检验你的真实水平！'}
          </div>
        </div>
        <div class="boss-card__chevron">›</div>
      </div>`;
  }

  // Quick start button (when no plan or plan completed)
  let quickStartHtml = '';
  if (!plan || plan.certificateEarned) {
    const rec = engine.getRecommendation();
    if (rec) {
      const recLabel = rec.type === 'mission'
        ? `Unit ${rec.unitId} 写作任务`
        : `Unit ${rec.unitId} · Lv.${rec.level}`;
      quickStartHtml = `
        <div class="card mb-md" style="text-align:center;padding:var(--space-md);">
          <button class="btn btn--primary btn--large" id="quickStartBtn"
                  style="width:100%;font-size:1rem;padding:var(--space-md);">
            开始今天的练习 — ${recLabel}
          </button>
        </div>`;
    }
  }

  // Curriculum switcher
  let switcherHtml = '';
  if (allCurricula.length > 1) {
    const options = allCurricula.map(c => {
      const active = c.id === curriculum.getActiveId();
      const label = `${escapeHtml(c.title)}${c.builtIn ? ' (内置)' : ''}`;
      return `<button class="curr-switch-btn${active ? ' curr-switch-btn--active' : ''}" data-curr-id="${c.id}" title="${label}">
        ${active ? '✅ ' : ''}${label}
      </button>`;
    }).join('');
    switcherHtml = `
      <div class="card mb-md curr-switcher">
        <div class="curr-switcher__header">
          <span class="curr-switcher__label">📚 当前课程体系</span>
          <a class="curr-switcher__current curr-syllabus-link" href="#syllabus" title="查看这套课程的语法提纲">${escapeHtml(currTitle)} <span class="curr-syllabus-link__hint">查看语法提纲 ›</span></a>
        </div>
        <div class="curr-switcher__list">${options}</div>
      </div>`;
  } else if (!isBuiltIn) {
    switcherHtml = `
      <div class="card mb-md curr-switcher">
        <div class="curr-switcher__header">
          <span class="curr-switcher__label">📚 当前课程体系</span>
          <a class="curr-switcher__current curr-syllabus-link" href="#syllabus" title="查看这套课程的语法提纲">${escapeHtml(currTitle)} <span class="curr-syllabus-link__hint">查看语法提纲 ›</span></a>
        </div>
      </div>`;
  }

  return `
    <div class="view view-map">
      ${renderHeader(player)}
      ${switcherHtml}
      ${planHtml}
      ${quickStartHtml}
      ${bossHtml}

      <div class="card mb-md" style="text-align:center;">
        <div style="font-size:var(--text-sm);color:var(--color-text-light);margin-bottom:var(--space-sm);">
          今日已完成 <strong>${todayLessons}</strong> / ${dailyGoal}
        </div>
        <div class="progress-bar progress-bar--small">
          <div class="progress-bar__fill" style="width:${progressPct}%"></div>
        </div>
      </div>

      <div class="unit-grid">
        ${nodesHtml}
      </div>

    </div>`;
}

export function mount() {
  document.querySelectorAll('.unit-node:not(.unit-node--locked)').forEach(node => {
    node.addEventListener('click', () => {
      const unitId = node.dataset.unitId;
      if (unitId) {
        location.hash = `unit/${unitId}`;
      }
    });
  });

  document.querySelectorAll('.curr-switch-btn:not(.curr-switch-btn--active)').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.currId;
      if (id) {
        store.switchCurriculum(id);
        location.hash = '';
        window.dispatchEvent(new HashChangeEvent('hashchange'));
      }
    });
  });

  const todayBtn = document.getElementById('todayPracticeBtn');
  if (todayBtn) {
    todayBtn.addEventListener('click', () => {
      const session = store.getCurrentSession();
      if (!session) return;
      if (session.type === '综合测试') {
        // 计划到了综合测试那天，但 BOSS 还没解锁（Lv.3 通过的单元不够 6 个）
        if (!store.isBossUnlocked()) {
          alert('综合测试还没解锁：先把 6 个单元的 Lv.3 通关（至少 1 星）。');
          return;
        }
        location.hash = 'practice/boss';
      } else if (!curriculum.isUnitGenerated(session.unitId)) {
        // Unit content not generated yet — send to the unit page (which has the
        // "generate content" button) instead of an empty practice session.
        location.hash = `unit/${session.unitId}`;
      } else if (!store.state.units[session.unitId]?.practiceLevels?.[session.level]?.unlocked) {
        // 计划指向的关卡还锁着（比如前一天 0 星没过）——去单元页，让孩子看到该先过哪一关
        location.hash = `unit/${session.unitId}`;
      } else {
        location.hash = `practice/${session.unitId}/${session.level}`;
      }
    });
  }

  const bossCard = document.getElementById('bossCard');
  if (bossCard) {
    bossCard.addEventListener('click', () => {
      location.hash = 'practice/boss';
    });
  }

  const quickBtn = document.getElementById('quickStartBtn');
  if (quickBtn) {
    quickBtn.addEventListener('click', () => {
      const rec = engine.getRecommendation();
      if (!rec) return;
      if (!curriculum.isUnitGenerated(rec.unitId)) {
        location.hash = `unit/${rec.unitId}`;
      } else if (rec.type === 'mission') {
        location.hash = `mission/${rec.unitId}`;
      } else {
        location.hash = `practice/${rec.unitId}/${rec.level}`;
      }
    });
  }

}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}
