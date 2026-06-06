import { store } from '../store.js';
import { units } from '../data/units.js';

function escapeHtml(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

const UNIT_ICONS = ['📗', '📘', '📙', '📕', '📒', '📓', '📔', '📖', '🔖', '📚', '🏅', '🏆'];

export function render() {
  const portfolio = store.getPortfolio();
  const unitIds = Object.keys(units).map(Number).sort((a, b) => a - b);
  const completedCount = portfolio.length;
  const totalCount = unitIds.length;

  let cardsHtml = '';

  unitIds.forEach((uid, idx) => {
    const unitData = units[uid];
    const entry = portfolio.find(p => p.unitId === uid);
    const icon = UNIT_ICONS[idx] || '📗';
    const missionTitle = unitData?.mission?.title || `Unit ${uid} 作品`;

    if (entry) {
      const preview = escapeHtml((entry.content || '').slice(0, 80));
      cardsHtml += `
        <div class="portfolio-card" data-unit-id="${uid}">
          <div style="font-size:1.5rem;">${icon}</div>
          <div class="portfolio-card__title">${escapeHtml(entry.title || missionTitle)}</div>
          <div class="portfolio-card__date">${entry.date || ''}</div>
          <div class="portfolio-card__preview">${preview}${preview.length >= 80 ? '...' : ''}</div>
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
  const portfolio = store.getPortfolio();

  document.querySelectorAll('.portfolio-card:not(.portfolio-card--locked)').forEach(card => {
    card.addEventListener('click', () => {
      const uid = Number(card.dataset.unitId);
      const entry = portfolio.find(p => p.unitId === uid);
      if (!entry) return;

      showModal(entry);
    });
  });
}

function showModal(entry) {
  const modalContainer = document.getElementById('portfolioModal');
  if (!modalContainer) return;

  modalContainer.innerHTML = `
    <div class="modal-overlay" id="portfolioOverlay">
      <div class="modal">
        <div class="modal__title" style="font-size:var(--text-lg);">${escapeHtml(entry.title || '我的作品')}</div>
        <div style="font-size:var(--text-xs);color:var(--color-muted);margin-bottom:var(--space-md);">${entry.date || ''}</div>
        <div style="text-align:left;font-size:var(--text-sm);line-height:1.8;padding:var(--space-md);background:var(--color-bg);border-radius:var(--radius-md);border-left:4px solid var(--color-primary);margin-bottom:var(--space-lg);">
          ${escapeHtml(entry.content || '')}
        </div>
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
