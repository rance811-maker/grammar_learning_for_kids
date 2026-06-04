import { store } from '../store.js';
import { units } from '../data/units.js';
import { skillName } from '../data/skill-names.js';

const TYPE_LABELS = {
  choice: '选择',
  reorder: '排序',
  error: '找错',
  match: '配对',
  fill: '填空',
  scenario: '情境',
};

export function render() {
  const mistakes = store.getMistakes();
  const weakSkills = store.getWeakestSkills(5);

  // --- Error notebook list ---
  let mistakesHtml = '';
  if (mistakes.length > 0) {
    const items = mistakes.slice().reverse().map((m) => {
      const q = m.question;
      const typeLabel = TYPE_LABELS[q.type] || q.type;
      const unitTitle = units[m.unitId]?.title || `Unit ${m.unitId}`;
      const skill = q.subSkill ? skillName(q.subSkill) : '';
      const preview = (q.sentence || q.instruction || q.context || '')
        .replace(/_+/g, '____')
        .slice(0, 60);
      return `
        <div class="mistake-item">
          <div class="mistake-item__top">
            <span class="badge" style="font-size:var(--text-xs);">${typeLabel}</span>
            <span class="mistake-item__unit">${unitTitle}</span>
            <span class="mistake-item__date">${m.date || ''}</span>
          </div>
          ${skill ? `<div class="mistake-item__skill">📌 ${skill}</div>` : ''}
          ${preview ? `<div class="mistake-item__preview">${preview}</div>` : ''}
        </div>`;
    }).join('');

    mistakesHtml = `
      <div class="section-title">📕 错题本（${mistakes.length}）</div>
      <div class="mistake-list mb-lg">${items}</div>`;
  }

  // --- Weak skills list ---
  let weakHtml = '';
  if (weakSkills.length > 0) {
    const items = weakSkills.map((w) => {
      const pct = Math.round(w.mastery * 100);
      return `
        <div class="weakness-item" style="cursor:default;">
          <div>
            <div class="weakness-item__name">${skillName(w.skill)}</div>
            <div style="font-size:var(--text-xs);color:var(--color-muted);">练习 ${w.attempts} 次</div>
          </div>
          <div class="weakness-item__accuracy">${pct}%</div>
        </div>`;
    }).join('');

    weakHtml = `
      <div class="weakness-section mb-lg">
        <div class="weakness-section__title">⚠️ 我的薄弱点</div>
        ${items}
      </div>`;
  }

  const canReview = mistakes.length > 0 || weakSkills.length > 0;

  const heroHtml = canReview
    ? `
      <div class="card mb-lg" style="text-align:center;padding:var(--space-lg);">
        <div style="font-size:2.5rem;margin-bottom:var(--space-sm);">🎯</div>
        <div style="font-weight:700;font-size:1.1rem;margin-bottom:var(--space-xs);">专项复习</div>
        <div style="font-size:var(--text-sm);color:var(--color-text-light);margin-bottom:var(--space-md);">
          系统会优先挑出你的错题和薄弱语法点，集中突破。
        </div>
        <button class="btn btn--primary btn--large" id="startReviewBtn"
                style="width:100%;font-size:1rem;padding:var(--space-md);">
          开始复习我的薄弱点
        </button>
      </div>`
    : `
      <div class="card mb-lg" style="text-align:center;padding:var(--space-lg);">
        <div style="font-size:2.5rem;margin-bottom:var(--space-sm);">✨</div>
        <div style="font-weight:700;font-size:1.1rem;margin-bottom:var(--space-xs);">还没有错题</div>
        <div style="font-size:var(--text-sm);color:var(--color-text-light);">
          先去练习几关吧！答错的题目会自动收进错题本，方便你日后复习。
        </div>
      </div>`;

  return `
    <div class="view view-review">
      ${heroHtml}
      ${weakHtml}
      ${mistakesHtml}
    </div>`;
}

export function mount() {
  const startBtn = document.getElementById('startReviewBtn');
  if (startBtn) {
    startBtn.addEventListener('click', () => {
      location.hash = 'practice/review';
    });
  }
}
