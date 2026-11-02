import { store } from '../store.js';
import { curriculum } from '../curriculum.js';
import { SUB_SKILL_NAMES } from '../data/skill-names.js';

const RANK_INFO = {
  bronze: { icon: '🥉', name: '青铜', next: 'silver', nextMin: 2000 },
  silver: { icon: '🥈', name: '白银', next: 'gold', nextMin: 5000 },
  gold: { icon: '🥇', name: '黄金', next: 'diamond', nextMin: 10000 },
  diamond: { icon: '💎', name: '钻石', next: 'master', nextMin: 20000 },
  master: { icon: '👑', name: '大师', next: null, nextMin: null },
};

const RANK_THRESHOLDS = {
  bronze: 0,
  silver: 2000,
  gold: 5000,
  diamond: 10000,
  master: 20000,
};

const RANK_ORDER = ['bronze', 'silver', 'gold', 'diamond', 'master'];

// 完整的段位阶梯。放在「我的进度」而不是首页：首页的主角是"今天练什么"，
// 段位是次要信息，摊开五档会喧宾夺主。
function renderRankLadder(currentRank) {
  let idx = RANK_ORDER.indexOf(currentRank);
  if (idx < 0) idx = 0;
  const steps = RANK_ORDER.map((key, i) => {
    const r = RANK_INFO[key];
    const state = i < idx ? 'done' : i === idx ? 'current' : 'todo';
    return `
      <div class="rank-step rank-step--${state}" title="${r.name}｜${RANK_THRESHOLDS[key]} 积分">
        <span class="rank-step__icon">${r.icon}</span>
        <span class="rank-step__name">${r.name}</span>
      </div>`;
  }).join('<span class="rank-step__sep"></span>');

  return `
    <div class="rank-ladder__head">
      <span class="rank-ladder__pos">第 ${idx + 1} / ${RANK_ORDER.length} 段</span>
    </div>
    <div class="rank-ladder__track">${steps}</div>`;
}

const BADGE_ICONS = ['🌟', '💪', '🎯', '🏅', '🔥', '📚', '✨', '🎓', '💡', '🏆', '🎖️', '👑'];

// 历史记录一行的名字。专项复习、模拟挑战记进历史时 unitId 是 'review' / 'boss'、level 是 null，
// 直接拼会显示成「Unit review - Lv.null」。
function historyName(h) {
  if (h.unitId === 'review') return '专项复习';
  if (h.unitId === 'boss') return `${curriculum.examLabel()} 模拟挑战`;
  return `Unit ${h.unitId} - Lv.${h.level}`;
}

export function render() {
  const { player } = store.state;
  const rank = RANK_INFO[player.rank] || RANK_INFO.bronze;
  const accuracy = store.getAccuracyRate();
  const accuracyPct = Math.round(accuracy * 100);
  // 「我的弱点」只列掌握度 < 80% 的，别把下面「语法掌握度」里已经是绿条的也标红
  const weakSkills = store.getWeakSkills(3);
  const allMastery = store.getAllMastery();
  const badges = store.getBadges();
  const history = store.state.history.slice(-10).reverse();

  const units = curriculum.getUnits();
  const unitIds = Object.keys(units).map(Number);
  // 数的是「通过了几关」（每单元 5 关，至少 1 星算通过），不是课程。
  // 用 isLevelPassed 而不是 completed：老存档里 0 星也可能被记成 completed。
  let completedLessons = 0;
  for (const uid of unitIds) {
    for (let lv = 1; lv <= 5; lv++) {
      if (store.isLevelPassed(uid, lv)) completedLessons++;
    }
  }
  const totalLessons = unitIds.length * 5;

  // Next rank progress
  let rankProgressHtml = '';
  if (rank.next) {
    const currentMin = RANK_THRESHOLDS[player.rank] || 0;
    const nextMin = rank.nextMin;
    const progress = Math.min(Math.round(((player.totalScore - currentMin) / (nextMin - currentMin)) * 100), 100);
    const nextRank = RANK_INFO[rank.next];
    rankProgressHtml = `
      <div style="text-align:center;font-size:var(--text-sm);color:var(--color-text-light);margin-bottom:var(--space-sm);">
        距离 ${nextRank.icon} ${nextRank.name} 还需 ${nextMin - player.totalScore} 积分
      </div>
      <div class="progress-bar progress-bar--warning">
        <div class="progress-bar__fill" style="width:${progress}%"></div>
      </div>`;
  } else {
    rankProgressHtml = `<div style="text-align:center;font-size:var(--text-sm);color:var(--color-warning);">已达最高段位！</div>`;
  }

  // Weakness section
  let weakHtml = '';
  if (weakSkills.length > 0) {
    const weakItems = weakSkills.map(w => {
      const name = SUB_SKILL_NAMES[w.skill] || w.skill;
      const pct = Math.round(w.mastery * 100);
      return `
        <div class="weakness-item" data-skill="${w.skill}">
          <div>
            <div class="weakness-item__name">${name}</div>
            <div style="font-size:var(--text-xs);color:var(--color-muted);">练习 ${w.attempts} 次</div>
          </div>
          <div class="weakness-item__accuracy">${pct}%</div>
        </div>`;
    }).join('');

    weakHtml = `
      <div class="weakness-section">
        <div class="weakness-section__title">⚠️ ${store.isDemo() ? 'TA 的弱点' : '我的弱点'}</div>
        ${weakItems}
      </div>`;
  }

  // Mastery section grouped by unit
  let masteryHtml = '';
  const masteryEntries = Object.entries(allMastery);
  if (masteryEntries.length > 0) {
    const masteryItems = masteryEntries.map(([skill, data]) => {
      const name = SUB_SKILL_NAMES[skill] || skill;
      const pct = Math.round(data.mastery * 100);
      const barColor = pct >= 80 ? 'var(--color-primary)' : pct >= 50 ? 'var(--color-warning)' : 'var(--color-danger)';
      return `
        <div style="margin-bottom:var(--space-sm);">
          <div style="display:flex;justify-content:space-between;font-size:var(--text-sm);margin-bottom:var(--space-xs);">
            <span>${name}</span>
            <span style="font-weight:700;">${pct}%</span>
          </div>
          <div class="progress-bar progress-bar--small">
            <div class="progress-bar__fill mastery-bar" style="width:${pct}%;background:${barColor};"></div>
          </div>
        </div>`;
    }).join('');

    masteryHtml = `
      <div class="mb-lg">
        <div class="section-title">📊 语法掌握度</div>
        <div class="card">${masteryItems}</div>
      </div>`;
  }

  // Badges
  let badgesHtml = '';
  const badgeItems = [];
  for (let i = 1; i <= 12; i++) {
    // 只认"单元大师"徽章。满星徽章也带 unitId，不过滤的话任意一关 3 星就把整个单元点亮。
    const earned = badges.find(b => b.unitId === i && String(b.id || '').startsWith('unit_'));
    const icon = BADGE_ICONS[i - 1] || '🏅';
    const unitData = units[i];
    const name = unitData ? `Unit ${i}` : `Unit ${i}`;

    if (earned) {
      badgeItems.push(`
        <div class="badge-item">
          <div class="badge-item__icon">${icon}</div>
          <div class="badge-item__name">${name}</div>
        </div>`);
    } else {
      badgeItems.push(`
        <div class="badge-item badge-item--locked">
          <div class="badge-item__icon">🔒</div>
          <div class="badge-item__name">${name}</div>
        </div>`);
    }
  }
  // 结算页发的成就徽章（连击之王、完美无瑕、速度之星、满星、连续打卡、模拟通关）以前只在结算页闪一下，
  // 这里只画单元徽章，拿到了也找不到。排在单元徽章前面：单元那 12 格大多还锁着，别让刚拿的被挤到下面。
  // 满星是每关一枚，最多 60 枚，逐个摆会把页面撑得很长，合成一格写数量。
  const achievements = badges.filter(b => !String(b.id || '').startsWith('unit_'));
  const perfect = achievements.filter(b => String(b.id).startsWith('perfect_'));
  const achItems = achievements.filter(b => !String(b.id).startsWith('perfect_')).map(b => `
        <div class="badge-item" title="${b.name}${b.date ? `｜${b.date}` : ''}">
          <div class="badge-item__icon">${b.icon || '🏅'}</div>
          <div class="badge-item__name">${b.name}</div>
        </div>`);
  if (perfect.length) {
    achItems.push(`
        <div class="badge-item" title="${perfect.map(b => b.name).join('、')}">
          <div class="badge-item__icon">🌟</div>
          <div class="badge-item__name">满星 ×${perfect.length}</div>
        </div>`);
  }
  const subTitle = (t) => `<div style="font-size:var(--text-sm);color:var(--color-text-light);margin-bottom:var(--space-sm);">${t}</div>`;
  badgesHtml = `
    <div class="badge-collection">
      <div class="badge-collection__title">🏅 徽章收集</div>
      ${achItems.length ? `${subTitle('成就徽章')}
      <div class="badge-grid" id="achievementBadges" style="margin-bottom:var(--space-lg);">${achItems.join('')}</div>
      ${subTitle('单元徽章')}` : ''}
      <div class="badge-grid">${badgeItems.join('')}</div>
    </div>`;

  // History
  let historyHtml = '';
  if (history.length > 0) {
    const rows = history.map(h => {
      const stars = '⭐'.repeat(h.stars || 0);
      const pct = h.total > 0 ? Math.round((h.correct / h.total) * 100) : 0;
      return `
        <div style="display:flex;justify-content:space-between;align-items:center;padding:var(--space-sm) 0;border-bottom:1px solid var(--color-border);">
          <div>
            <div style="font-size:var(--text-sm);font-weight:600;">${historyName(h)}</div>
            <div style="font-size:var(--text-xs);color:var(--color-muted);">${h.date || ''}</div>
          </div>
          <div style="text-align:right;">
            <div>${stars || '☆'}</div>
            <div style="font-size:var(--text-xs);color:var(--color-text-light);">${pct}% 正确</div>
          </div>
        </div>`;
    }).join('');

    historyHtml = `
      <div class="mb-lg">
        <div class="section-title">📋 历史记录</div>
        <div class="card">${rows}</div>
      </div>`;
  }

  return `
    <div class="view view-stats">
      <div class="rank-badge-display">
        <div class="rank-badge-display__icon rank-badge-display__icon--${player.rank}">
          ${rank.icon}
        </div>
        <div class="rank-badge-display__name">${rank.name}</div>
        <div class="rank-badge-display__sub">当前段位</div>
      </div>

      <div class="card mb-lg rank-ladder">
        ${renderRankLadder(player.rank)}
        ${rankProgressHtml}
      </div>

      <div class="stats-cards">
        <div class="stat-card">
          <div class="stat-card__value">${player.totalScore}</div>
          <div class="stat-card__label">总积分</div>
        </div>
        <div class="stat-card">
          <div class="stat-card__value">🔥 ${store.getDisplayStreak()}</div>
          <div class="stat-card__label">连续天数</div>
        </div>
        <div class="stat-card">
          <div class="stat-card__value">${accuracyPct}%</div>
          <div class="stat-card__label">正确率</div>
        </div>
      </div>

      <div class="stats-cards mb-lg">
        <div class="stat-card" style="grid-column:span 3;">
          <div class="stat-card__value">${completedLessons} <span style="font-size:var(--text-base);color:var(--color-muted);">/ ${totalLessons}</span></div>
          <div class="stat-card__label">已通过关卡</div>
        </div>
      </div>

      ${weakHtml}
      ${masteryHtml}
      ${badgesHtml}
      ${historyHtml}
    </div>`;
}

export function mount() {
  // Click weak skill to navigate to practice
  document.querySelectorAll('.weakness-item').forEach(item => {
    item.addEventListener('click', () => {
      // Find which unit/level this skill belongs to
      const skill = item.dataset.skill;
      if (!skill) return;

      for (const [uid, unitData] of Object.entries(curriculum.getUnits())) {
        const unitId = Number(uid);
        if (!store.isUnitUnlocked(unitId)) continue;
        for (const [lv, levelData] of Object.entries(unitData.levels || {})) {
          const questions = levelData.questions || [];
          if (questions.some(q => q.subSkill === skill)) {
            location.hash = `practice/${unitId}/${lv}`;
            return;
          }
        }
      }
    });
  });
}
