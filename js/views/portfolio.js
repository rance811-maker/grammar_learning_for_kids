import { store } from '../store.js';
import { curriculum } from '../curriculum.js';
import { reviewCardHtml } from './mission.js';

const UNIT_ICONS = ['📗', '📘', '📙', '📕', '📒', '📓', '📔', '📖', '🔖', '📚', '🏅', '🏆'];

function esc(t) {
  return String(t == null ? '' : t).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

// 每个单元取最新的一篇。现在保存会覆盖同单元的旧作品，但老存档（以前每次保存都追加）、
// 两台设备的进度合并后，同一单元仍可能有好几条：只算一篇，显示最新的。
function latestByUnit(portfolio) {
  const map = new Map();
  portfolio.forEach((p) => {
    const cur = map.get(p.unitId);
    if (!cur || String(p.date || '') >= String(cur.date || '')) map.set(p.unitId, p);
  });
  return map;
}

export function render() {
  const latest = latestByUnit(store.getPortfolio());
  const units = curriculum.getUnits();
  const unitIds = Object.keys(units).map(Number).sort((a, b) => a - b);
  const completedCount = unitIds.filter((uid) => latest.has(uid)).length;
  const totalCount = unitIds.length;

  let cardsHtml = '';

  unitIds.forEach((uid, idx) => {
    const unitData = units[uid];
    const entry = latest.get(uid);
    const icon = UNIT_ICONS[idx] || '📗';
    const missionTitle = unitData?.mission?.title || `Unit ${uid} 作品`;

    if (entry) {
      const preview = (entry.content || '').slice(0, 80);
      cardsHtml += `
        <div class="portfolio-card" data-unit-id="${uid}">
          <div style="font-size:1.5rem;">${icon}</div>
          <div class="portfolio-card__title">${esc(entry.title || missionTitle)}</div>
          <div class="portfolio-card__date">${esc(entry.date || '')}</div>
          <div class="portfolio-card__preview">${esc(preview)}${preview.length >= 80 ? '...' : ''}</div>
        </div>`;
    } else {
      cardsHtml += `
        <div class="portfolio-card portfolio-card--locked">
          <div style="font-size:1.5rem;">🔒</div>
          <div class="portfolio-card__title">${missionTitle}</div>
          <div class="portfolio-card__preview text-muted">完成任务后解锁</div>
        </div>`;
    }
  });

  return `
    <div class="view view-portfolio">
      <div class="portfolio-counter">
        已完成 <strong>${completedCount}</strong> / ${totalCount} 篇
      </div>
      <div class="portfolio-grid">
        ${cardsHtml}
      </div>
      <div id="portfolioModal"></div>
    </div>`;
}

export function mount() {
  const latest = latestByUnit(store.getPortfolio());

  document.querySelectorAll('.portfolio-card:not(.portfolio-card--locked)').forEach(card => {
    card.addEventListener('click', () => {
      const uid = Number(card.dataset.unitId);
      const entry = latest.get(uid);
      if (!entry) return;

      showModal(entry);
    });
  });
}

function showModal(entry) {
  const modalContainer = document.getElementById('portfolioModal');
  if (!modalContainer) return;

  // 保存时一起存下的 AI 批改（老作品没有）。批改卡片比较长，弹窗要能上下滚
  const review = entry.review && Array.isArray(entry.review.lines) ? entry.review : null;
  modalContainer.innerHTML = `
    <div class="modal-overlay" id="portfolioOverlay">
      <div class="modal" style="max-height:85vh;overflow-y:auto;">
        <div class="modal__title" style="font-size:var(--text-lg);">${esc(entry.title || '我的作品')}</div>
        <div style="font-size:var(--text-xs);color:var(--color-muted);margin-bottom:var(--space-md);">${esc(entry.date || '')}</div>
        <div style="text-align:left;font-size:var(--text-sm);line-height:1.8;padding:var(--space-md);background:var(--color-bg);border-radius:var(--radius-md);border-left:4px solid var(--color-primary);margin-bottom:var(--space-lg);">
          ${esc(entry.content || '')}
        </div>
        ${review ? `<div class="portfolio-review" style="text-align:left;margin-bottom:var(--space-lg);">${reviewCardHtml(review, review.lines)}</div>` : ''}
        <button class="btn-secondary" id="closePortfolioModal">关闭</button>
      </div>
    </div>`;

  const overlay = document.getElementById('portfolioOverlay');
  const closeBtn = document.getElementById('closePortfolioModal');

  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      modalContainer.innerHTML = '';
    });
  }

  if (overlay) {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        modalContainer.innerHTML = '';
      }
    });
  }
}
