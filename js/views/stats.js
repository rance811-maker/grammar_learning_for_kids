import { store } from '../store.js';
import { units } from '../data/units.js';

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

const SUB_SKILL_NAMES = {
  // Unit 1 - Present Simple & Continuous
  'third_person_s': '一般现在时 - 第三人称单数',
  'state_verbs': '状态动词（不用进行时）',
  'time_markers': '时态时间标志词',
  'negative_forms': '否定句构成',
  'question_forms': '疑问句构成',
  // Unit 2 - Past Simple & Continuous
  'irregular_verbs': '不规则动词过去式',
  'was_were': 'was / were 的用法',
  'when_while': 'when / while 引导时间',
  'negative_past': '一般过去时 - 否定句',
  'question_past': '一般过去时 - 疑问句',
  // Unit 3 - Present Perfect vs Past Simple
  'past_participle': '过去分词',
  'ever_never': 'ever / never 的用法',
  'already_yet': 'already / yet 的用法',
  'for_since': 'for / since 的用法',
  'specific_time_marker': '具体时间标志词',
  // Unit 4 - Comparatives & Superlatives
  'short_adj_er_est': '短形容词 -er / -est',
  'long_adj_more_most': '长形容词 more / most',
  'irregular_comparison': '不规则比较级',
  'as_as': 'as ... as 同级比较',
  'than_usage': 'than 的用法',
  // Unit 5 - Modal Verbs
  'ability_can_could': 'can / could 表能力',
  'obligation_must_haveto': 'must / have to 表义务',
  'advice_should': 'should 表建议',
  'possibility_might': 'might / may 表可能',
  'permission': '请求许可',
  // Unit 6 - Future Forms
  'will_prediction': 'will 表预测',
  'will_spontaneous': 'will 表临时决定',
  'going_to_plans': 'going to 表计划',
  'present_cont_future': '现在进行时表将来安排',
  'shall_offers': 'shall 表提议',
  // Unit 7 - Conditionals
  'first_conditional': '第一条件句',
  'second_conditional': '第二条件句',
  'unless': 'unless 的用法',
  'mixed_conditionals': '混合条件句',
  'wish': 'wish 句型',
  // Unit 8 - Passive Voice
  'present_passive': '一般现在时被动语态',
  'past_passive': '一般过去时被动语态',
  'by_agent': 'by + 动作执行者',
  'passive_questions': '被动语态疑问句',
  'active_vs_passive': '主动与被动转换',
  // Unit 9 - Relative Clauses
  'who_people': 'who 指人',
  'which_things': 'which 指物',
  'that_usage': 'that 的用法',
  'where_places': 'where 指地点',
  'whose_possession': 'whose 表所属',
  // Unit 10 - Gerunds & Infinitives
  'verb_plus_ing': '动词 + -ing',
  'verb_plus_to': '动词 + to do',
  'both_forms': '两种形式皆可',
  'preposition_plus_ing': '介词 + -ing',
  'as_subject': '动名词作主语',
  // Unit 11 - Reported Speech
  'tense_shift': '时态后移',
  'say_tell': 'say / tell 的用法',
  'reported_questions': '转述疑问句',
  'time_place_change': '时间地点状语变化',
  'reporting_verbs': '转述动词',
  // Unit 12 - Articles & Quantifiers
  'a_an_the': '冠词 a / an / the',
  'zero_article': '零冠词',
  'some_any': 'some / any 的用法',
  'much_many': 'much / many 的用法',
  'few_little': 'few / little 的用法',
};

const BADGE_ICONS = ['🌟', '💪', '🎯', '🏅', '🔥', '📚', '✨', '🎓', '💡', '🏆', '🎖️', '👑'];

export function render() {
  const { player } = store.state;
  const rank = RANK_INFO[player.rank] || RANK_INFO.bronze;
  const accuracy = store.getAccuracyRate();
  const accuracyPct = Math.round(accuracy * 100);
  const weakSkills = store.getWeakestSkills(3);
  const allMastery = store.getAllMastery();
  const badges = store.getBadges();
  const history = store.state.history.slice(-10).reverse();

  // Completed units count
  const unitIds = Object.keys(units).map(Number);
  let completedLessons = 0;
  for (const uid of unitIds) {
    const u = store.state.units[uid];
    if (u) {
      for (const lv of Object.values(u.practiceLevels)) {
        if (lv.completed) completedLessons++;
      }
    }
  }

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
        <div class="weakness-section__title">⚠️ 我的弱点</div>
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
    const earned = badges.find(b => b.unitId === i);
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
  badgesHtml = `
    <div class="badge-collection">
      <div class="badge-collection__title">🏅 徽章收集</div>
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
            <div style="font-size:var(--text-sm);font-weight:600;">Unit ${h.unitId} - Lv.${h.level}</div>
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

      <div class="card mb-lg">${rankProgressHtml}</div>

      <div class="stats-cards">
        <div class="stat-card">
          <div class="stat-card__value">${player.totalScore}</div>
          <div class="stat-card__label">总积分</div>
        </div>
        <div class="stat-card">
          <div class="stat-card__value">🔥 ${player.currentStreak}</div>
          <div class="stat-card__label">连续天数</div>
        </div>
        <div class="stat-card">
          <div class="stat-card__value">${accuracyPct}%</div>
          <div class="stat-card__label">正确率</div>
        </div>
      </div>

      <div class="stats-cards mb-lg">
        <div class="stat-card" style="grid-column:span 3;">
          <div class="stat-card__value">${completedLessons}</div>
          <div class="stat-card__label">已完成课程</div>
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

      for (const [uid, unitData] of Object.entries(units)) {
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
