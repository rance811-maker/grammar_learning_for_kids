import { store } from '../store.js';
import { curriculum } from '../curriculum.js';

export function render(unitId) {
  unitId = Number(unitId);
  const unitData = curriculum.getUnit(unitId);

  if (!unitData || !unitData.discover) {
    return `<div class="view"><p class="text-center text-muted mt-lg">内容不存在</p></div>`;
  }

  const discover = unitData.discover;
  const story = discover.story || {};
  const questions = discover.questions || [];
  const tip = discover.tip || '';

  // Render story text with highlighted grammar words
  let storyHtml = story.text || '';
  const highlights = story.highlights || [];
  // Sort highlights by length descending to avoid partial replacements
  const sortedHighlights = [...highlights].sort((a, b) => b.length - a.length);
  for (const word of sortedHighlights) {
    const regex = new RegExp(`\\b(${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})\\b`, 'gi');
    storyHtml = storyHtml.replace(regex, '<strong class="text-secondary">$1</strong>');
  }

  // Wrap paragraphs
  storyHtml = storyHtml.split('\n').filter(p => p.trim()).map(p =>
    `<p style="margin-bottom:var(--space-md);line-height:1.8;">${p}</p>`
  ).join('');

  // Render questions
  let questionsHtml = '';
  questions.forEach((q, idx) => {
    const optionsHtml = (q.options || []).map((opt, oi) =>
      `<button class="choice-btn discover-option" data-q="${idx}" data-opt="${oi}">${opt}</button>`
    ).join('');

    questionsHtml += `
      <div class="card mb-md discover-question" data-q="${idx}">
        <div class="question-instruction">问题 ${idx + 1}</div>
        <div class="question-prompt" style="font-size:var(--text-base);margin-bottom:var(--space-md);">${q.question}</div>
        <div class="choices-grid">${optionsHtml}</div>
        <div class="discover-explanation" data-q="${idx}" style="display:none;margin-top:var(--space-md);padding:var(--space-md);background:rgba(88,204,2,0.08);border-radius:var(--radius-md);font-size:var(--text-sm);line-height:1.6;color:var(--color-primary-dark);">
          ${q.explanation || ''}
        </div>
      </div>`;
  });

  return `
    <div class="view">
      <div style="padding:var(--space-md);">
        <div class="card mb-lg">
          <div style="font-size:var(--text-xl);font-weight:800;margin-bottom:var(--space-md);">📖 ${story.title || unitData.title}</div>
          <div style="font-family:var(--font-sans);font-size:var(--text-base);color:var(--color-text);">
            ${storyHtml}
          </div>
        </div>

        ${questions.length > 0 ? `
        <div class="mb-lg">
          <div class="section-title">🤔 你注意到了吗？</div>
          ${questionsHtml}
        </div>` : ''}

        ${tip ? `
        <div class="card mb-lg" style="border-left:4px solid var(--color-warning);background:rgba(255,200,0,0.06);">
          <div style="font-weight:700;margin-bottom:var(--space-sm);">💡 语法小贴士</div>
          <div style="font-size:var(--text-sm);line-height:1.8;color:var(--color-text-light);">${tip}</div>
        </div>` : ''}

        <button class="btn-primary discover-complete-btn" id="discoverCompleteBtn">
          ${store.state.units[unitId]?.discoverCompleted ? '返回关卡' : '完成阅读 ✅'}
        </button>
      </div>
    </div>`;
}

export function mount(unitId) {
  unitId = Number(unitId);
  const answeredQuestions = new Set();

  // Handle question option clicks
  document.querySelectorAll('.discover-option').forEach(btn => {
    btn.addEventListener('click', () => {
      const qIdx = btn.dataset.q;
      const optIdx = Number(btn.dataset.opt);

      if (answeredQuestions.has(qIdx)) return;
      answeredQuestions.add(qIdx);

      const unitData = curriculum.getUnit(unitId);
      const question = unitData.discover.questions[Number(qIdx)];
      const correctIdx = question.correctIndex ?? 0;

      // Mark correct/wrong
      const siblings = document.querySelectorAll(`.discover-option[data-q="${qIdx}"]`);
      siblings.forEach(sib => {
        sib.disabled = true;
        const sibIdx = Number(sib.dataset.opt);
        if (sibIdx === correctIdx) {
          sib.classList.add('choice-btn--correct');
        }
        if (sibIdx === optIdx && sibIdx !== correctIdx) {
          sib.classList.add('choice-btn--wrong');
        }
      });

      // Show explanation
      const explanation = document.querySelector(`.discover-explanation[data-q="${qIdx}"]`);
      if (explanation) {
        explanation.style.display = 'block';
      }
    });
  });

  // Handle complete button
  const completeBtn = document.getElementById('discoverCompleteBtn');
  if (completeBtn) {
    completeBtn.addEventListener('click', () => {
      store.completeDiscover(unitId);
      location.hash = `unit/${unitId}`;
    });
  }
}
