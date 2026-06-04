import { store } from '../store.js';
import { units } from '../data/units.js';
import { engine } from '../engine.js';

const RANK_INFO = {
  bronze: { icon: '🥉', name: '青铜' },
  silver: { icon: '🥈', name: '白银' },
  gold: { icon: '🥇', name: '黄金' },
  diamond: { icon: '💎', name: '钻石' },
  master: { icon: '👑', name: '大师' },
};

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
  const rank = RANK_INFO[player.rank] || RANK_INFO.bronze;
  const todayLessons = store.getTodayLessons();
  const dailyGoal = store.state.settings.dailyGoal;

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

    nodesHtml += `
      <div class="unit-node ${statusClass}" data-unit-id="${uid}">
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

  return `
    <div class="view view-map">
      <div class="player-stats">
        <div class="player-stats__item">
          <span class="player-stats__value">${rank.icon}</span>
          <span class="player-stats__label">${rank.name}</span>
        </div>
        <div class="player-stats__item">
          <span class="player-stats__value">${player.totalScore}</span>
          <span class="player-stats__label">积分</span>
        </div>
        <div class="player-stats__item">
          <span class="player-stats__value">🔥 ${player.currentStreak}</span>
          <span class="player-stats__label">连续天数</span>
        </div>
      </div>

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

  const todayBtn = document.getElementById('todayPracticeBtn');
  if (todayBtn) {
    todayBtn.addEventListener('click', () => {
      const session = store.getCurrentSession();
      if (!session) return;
      if (session.type === '综合测试') {
        location.hash = 'practice/boss';
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
      if (rec.type === 'mission') {
        location.hash = `mission/${rec.unitId}`;
      } else {
        location.hash = `practice/${rec.unitId}/${rec.level}`;
      }
    });
  }
}
