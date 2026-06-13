import { store } from '../store.js';
import { curriculum } from '../curriculum.js';
import { engine } from '../engine.js';
import { cloud } from '../cloud.js';

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
      return `<button class="curr-switch-btn${active ? ' curr-switch-btn--active' : ''}" data-curr-id="${c.id}">
        ${active ? '✅ ' : ''}${escapeHtml(c.title)}${c.builtIn ? ' (内置)' : ''}
      </button>`;
    }).join('');
    switcherHtml = `
      <div class="card mb-md curr-switcher">
        <div class="curr-switcher__header">
          <span class="curr-switcher__label">📚 当前课程体系</span>
          <strong>${escapeHtml(currTitle)}</strong>
        </div>
        <div class="curr-switcher__list">${options}</div>
      </div>`;
  } else if (!isBuiltIn) {
    switcherHtml = `
      <div class="card mb-md curr-switcher">
        <div class="curr-switcher__header">
          <span class="curr-switcher__label">📚 当前课程体系</span>
          <strong>${escapeHtml(currTitle)}</strong>
        </div>
      </div>`;
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

      <div id="customPacksArea"></div>
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
        location.hash = 'practice/boss';
      } else if (!curriculum.isUnitGenerated(session.unitId)) {
        // Unit content not generated yet — send to the unit page (which has the
        // "generate content" button) instead of an empty practice session.
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

  loadCustomPacks();
}

async function loadCustomPacks() {
  if (!store.isLoggedIn()) return;
  const area = document.getElementById('customPacksArea');
  if (!area) return;

  try {
    const packs = await cloud.listCoursePacks();
    if (!packs || packs.length === 0) return;

    const cardsHtml = packs.map(p => {
      const qCount = Array.isArray(p.questions) ? p.questions.length : 0;
      const desc = p.description ? `<div class="custom-pack-card__desc">${escapeHtml(p.description)}</div>` : '';
      return `
        <div class="custom-pack-card" data-pack-id="${p.id}">
          <div class="custom-pack-card__icon">📝</div>
          <div class="custom-pack-card__info">
            <div class="custom-pack-card__title">${escapeHtml(p.title)}</div>
            ${desc}
            <div class="custom-pack-card__meta">${qCount} 道题</div>
          </div>
          <div class="custom-pack-card__play">开始练习 ›</div>
        </div>`;
    }).join('');

    area.innerHTML = `
      <div class="custom-packs-section">
        <div class="custom-packs-section__header">
          <span>📝 家长自定义课程</span>
          <span style="font-size:0.8rem;color:var(--color-text-light);font-weight:400;">${packs.length} 个课程包</span>
        </div>
        ${cardsHtml}
      </div>`;

    area.querySelectorAll('.custom-pack-card').forEach(card => {
      card.addEventListener('click', () => {
        location.hash = `practice/pack/${card.dataset.packId}`;
      });
    });
  } catch {
    // silently fail — custom packs are optional
  }
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}
