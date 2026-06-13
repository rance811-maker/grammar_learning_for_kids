import { store } from '../store.js';
import { curriculum } from '../curriculum.js';
import { generateUnitContent, hasApiKey, friendlyAiError } from '../unitGenerator.js';

// 在元素里轮播一组提示文字，让等待时有"正在进行"的反馈。返回停止函数。
function startTicker(el, messages, interval = 2200) {
  if (!el) return () => {};
  let i = 0;
  const apply = () => {
    el.innerHTML = `<p style="color:var(--color-secondary-dark);font-size:var(--text-sm);">${messages[i % messages.length]}</p>`;
    i++;
  };
  apply();
  const t = setInterval(apply, interval);
  return () => clearInterval(t);
}

const UNIT_GEN_STEPS = [
  '🧠 正在构思单元故事…',
  '📖 正在编写阅读内容…',
  '📝 正在出 Lv.1–5 练习题…',
  '🎯 正在设计写作任务…',
  '🔍 正在校对内容…',
];

const LEVEL_NAMES = {
  1: 'Lv.1 认识',
  2: 'Lv.2 理解',
  3: 'Lv.3 运用',
  4: 'Lv.4 辨析',
  5: 'Lv.5 挑战',
};

function renderStars(count) {
  let html = '';
  for (let i = 0; i < 3; i++) {
    html += i < count ? '⭐' : '<span class="text-muted">☆</span>';
  }
  return html;
}

export function render(unitId) {
  unitId = Number(unitId);
  const units = curriculum.getUnits();
  const unitData = units[unitId];
  const unitState = store.state.units[unitId];

  if (!unitData || !unitState) {
    return `<div class="view view-unit"><p class="text-center text-muted mt-lg">单元不存在</p></div>`;
  }

  if (unitData._needsGeneration) {
    return `
      <div class="view view-unit">
        <div class="unit-header">
          <div class="unit-header__title">${unitData.title || 'Unit ' + unitId}</div>
          <div class="unit-header__subtitle">${unitData.description || ''}</div>
        </div>
        <div class="card" style="text-align:center;padding:var(--space-xl);" id="unitGenArea">
          <div style="font-size:2.5rem;margin-bottom:var(--space-md);">🤖</div>
          <div style="font-weight:700;font-size:1.1rem;margin-bottom:var(--space-sm);">课程内容待生成</div>
          <div style="font-size:var(--text-sm);color:var(--color-text-light);margin-bottom:var(--space-lg);">
            AI 会为这个单元生成故事、练习题和写作任务
          </div>
          <button class="btn btn--primary btn--large" id="genUnitBtn" style="width:100%;font-size:1rem;">
            🤖 生成本单元内容
          </button>
          <div id="genUnitMsg" style="margin-top:var(--space-md);"></div>
        </div>
      </div>`;
  }

  const discoverDone = unitState.discoverCompleted;
  const missionUnlocked = unitState.practiceLevels[3]?.completed || false;
  const missionDone = unitState.missionCompleted;

  // Discover card
  const discoverStatus = discoverDone ? '✅ 已完成' : '开始阅读';
  const discoverCard = `
    <div class="phase-card phase-card--discover" data-action="discover" data-unit="${unitId}">
      <div class="phase-card__icon">📖</div>
      <div class="phase-card__info">
        <div class="phase-card__title">发现</div>
        <div class="phase-card__desc">${discoverDone ? '故事已阅读完成' : '阅读故事，发现语法规律'}</div>
        <div class="phase-card__progress mt-sm">
          <span class="badge ${discoverDone ? 'badge--success' : ''}">${discoverStatus}</span>
        </div>
      </div>
      <div class="phase-card__chevron">›</div>
    </div>`;

  // Practice level cards
  let levelsHtml = '';
  for (let lv = 1; lv <= 5; lv++) {
    const lvState = unitState.practiceLevels[lv];
    const unlocked = lvState.unlocked;
    const completed = lvState.completed;
    const stars = lvState.bestStars;
    const lockedClass = unlocked ? '' : ' phase-card--locked';

    const statusBadge = !unlocked
      ? '<span class="badge-locked">🔒 未解锁</span>'
      : completed
        ? `<span class="badge badge--success">${renderStars(stars)}</span>`
        : '<span class="badge">开始练习</span>';

    levelsHtml += `
      <div class="phase-card phase-card--practice${lockedClass}" data-action="practice" data-unit="${unitId}" data-level="${lv}">
        <div class="phase-card__icon">${unlocked ? '📝' : '🔒'}</div>
        <div class="phase-card__info">
          <div class="phase-card__title">${LEVEL_NAMES[lv]}</div>
          <div class="phase-card__desc">${completed ? '已完成 - 再次挑战可提升星级' : unlocked ? '点击开始练习' : '完成前一关后解锁'}</div>
          <div class="phase-card__progress mt-sm">${statusBadge}</div>
        </div>
        <div class="phase-card__chevron">›</div>
      </div>`;
  }

  // Mission card
  const missionLockedClass = missionUnlocked ? '' : ' phase-card--locked';
  const missionStatus = missionDone
    ? '<span class="badge badge--success">✅ 已完成</span>'
    : missionUnlocked
      ? '<span class="badge badge--warning">开始任务</span>'
      : '<span class="badge-locked">🔒 完成 Lv.3 后解锁</span>';

  const missionTitle = unitData.mission?.title || '写作任务';
  const missionCard = `
    <div class="phase-card phase-card--mission${missionLockedClass}" data-action="mission" data-unit="${unitId}">
      <div class="phase-card__icon">🎯</div>
      <div class="phase-card__info">
        <div class="phase-card__title">${missionTitle}</div>
        <div class="phase-card__desc">${missionDone ? '任务已完成' : '运用所学语法完成写作'}</div>
        <div class="phase-card__progress mt-sm">${missionStatus}</div>
      </div>
      <div class="phase-card__chevron">›</div>
    </div>`;

  return `
    <div class="view view-unit">
      <div class="unit-header">
        <div class="unit-header__title">${unitData.title || 'Unit ' + unitId}</div>
        <div class="unit-header__subtitle">${unitData.description || ''}</div>
      </div>

      <div class="phase-list">
        ${discoverCard}
        ${levelsHtml}
        ${missionCard}
      </div>
    </div>`;
}

export function mount(unitId) {
  unitId = Number(unitId);

  const genBtn = document.getElementById('genUnitBtn');
  if (genBtn) {
    genBtn.addEventListener('click', async () => {
      if (!hasApiKey()) {
        const msg = document.getElementById('genUnitMsg');
        if (msg) msg.innerHTML = '<p style="color:var(--color-danger);font-size:var(--text-sm);">请先在家长专区 → AI 生成课程中配置 API key</p>';
        return;
      }
      genBtn.disabled = true;
      genBtn.innerHTML = '<span class="ce-spinner" style="display:inline-block;width:16px;height:16px;margin-right:8px;vertical-align:middle;"></span> 正在生成，请稍候…';
      const msg = document.getElementById('genUnitMsg');
      const stopTicker = startTicker(msg, UNIT_GEN_STEPS);
      try {
        await generateUnitContent(unitId);
        stopTicker();
        location.hash = `unit/${unitId}`;
        window.dispatchEvent(new HashChangeEvent('hashchange'));
      } catch (e) {
        stopTicker();
        genBtn.disabled = false;
        genBtn.textContent = '🤖 重试生成';
        if (msg) msg.innerHTML = `<p style="color:var(--color-danger);font-size:var(--text-sm);">生成失败：${friendlyAiError(e)}</p>`;
      }
    });
    return;
  }

  document.querySelectorAll('.phase-card:not(.phase-card--locked)').forEach(card => {
    card.addEventListener('click', () => {
      const action = card.dataset.action;
      const uid = card.dataset.unit;
      const level = card.dataset.level;

      if (action === 'discover') {
        location.hash = `discover/${uid}`;
      } else if (action === 'practice' && level) {
        location.hash = `practice/${uid}/${level}`;
      } else if (action === 'mission') {
        location.hash = `mission/${uid}`;
      }
    });
  });
}
