import { store } from '../store.js';
import { units } from '../data/units.js';

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
    const maxStars = 15; // 5 levels * 3 stars
    const icon = UNIT_ICONS[idx] || '📗';

    // Connector line (not before the first node)
    if (idx > 0) {
      const connActive = status !== 'locked' ? ' skill-path__connector--active' : '';
      nodesHtml += `<div class="skill-path__connector${connActive}"></div>`;
    }

    const statusClass = `unit-node--${status}`;
    const circleContent = status === 'locked'
      ? '<span class="unit-node__lock-icon">🔒</span>'
      : `<span>${icon}</span>`;

    const starsHtml = status === 'locked'
      ? ''
      : `<div class="unit-node__stars">${renderStars(Math.min(Math.round(stars / 5), 3), 3)}</div>`;

    nodesHtml += `
      <div class="unit-node ${statusClass}" data-unit-id="${uid}">
        <div class="unit-node__circle">${circleContent}</div>
        <span class="unit-node__name">${unitData.title || 'Unit ' + uid}</span>
        ${starsHtml}
      </div>`;
  });

  const progressPct = Math.min(Math.round((todayLessons / dailyGoal) * 100), 100);

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

      <div class="card mb-md" style="text-align:center;">
        <div style="font-size:var(--text-sm);color:var(--color-text-light);margin-bottom:var(--space-sm);">
          今日已完成 <strong>${todayLessons}</strong> / ${dailyGoal}
        </div>
        <div class="progress-bar progress-bar--small">
          <div class="progress-bar__fill" style="width:${progressPct}%"></div>
        </div>
      </div>

      <div class="skill-path">
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
}
