import { store } from '../store.js';
import { curriculum } from '../curriculum.js';
import { renderTip } from '../tipFormat.js';

// 选项的显示宽度：中文一个字按两个英文字符算
const optionWidth = (o) => { const t = String(o).replace(/<[^>]*>/g, ''); return t.length + (t.match(/[\u3000-\u9fff\uff00-\uffef]/g) || []).length; };

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

    const long = (q.options || []).some((o) => optionWidth(o) > 38);
    questionsHtml += `
      <div class="card mb-md discover-question" data-q="${idx}">
        <div class="question-instruction">问题 ${idx + 1}</div>
        <div class="question-prompt" style="font-size:var(--text-base);margin-bottom:var(--space-md);">${q.question}</div>
        <div class="choices-grid${long ? ' choices-grid--single' : ''}">${optionsHtml}</div>
        <div class="discover-nudge" data-q="${idx}" hidden></div>
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
        <details class="card mb-lg tip-card" id="discoverTip"${questions.length ? '' : ' open'}>
          <summary class="tip-card__label">💡 语法小贴士${questions.length ? '<span class="tip-card__wait">（做完上面的题再看，印象更深）</span>' : ''}</summary>
          <div class="tip-body">${renderTip(tip)}</div>
        </details>` : ''}

        <button class="btn-primary discover-complete-btn" id="discoverCompleteBtn">
          ${store.state.units[unitId]?.discoverCompleted ? '返回关卡' : '完成阅读 ✅'}
        </button>
      </div>
    </div>`;
}

export function mount(unitId) {
  unitId = Number(unitId);
  const answeredQuestions = new Set();

  // 先懂意思、再看规则：答错时给一句提示（nudge）让孩子回原文再找一找、可以重选；
  // 没有 nudge 的老题保持原样（点一次就揭晓）。所有题做完后自动展开小贴士做总结。
  const total = document.querySelectorAll('.discover-question').length;
  const openTipIfDone = () => {
    if (answeredQuestions.size < total) return;
    const tipEl = document.getElementById('discoverTip');
    if (tipEl && !tipEl.open) { tipEl.open = true; tipEl.querySelector('.tip-card__wait')?.remove(); }
  };

  document.querySelectorAll('.discover-option').forEach(btn => {
    btn.addEventListener('click', () => {
      const qIdx = btn.dataset.q;
      const optIdx = Number(btn.dataset.opt);

      if (answeredQuestions.has(qIdx)) return;

      const unitData = curriculum.getUnit(unitId);
      const question = unitData.discover.questions[Number(qIdx)];
      const correctIdx = question.correctIndex ?? 0;

      const nudgeEl = document.querySelector(`.discover-nudge[data-q="${qIdx}"]`);
      if (optIdx !== correctIdx && question.nudge && !btn.dataset.tried) {
        btn.dataset.tried = '1';
        btn.disabled = true;
        btn.classList.add('choice-btn--wrong');
        if (nudgeEl) { nudgeEl.innerHTML = `🤔 ${question.nudge}`; nudgeEl.hidden = false; }
        return;
      }
      answeredQuestions.add(qIdx);
      if (nudgeEl) nudgeEl.hidden = true;

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
      openTipIfDone();
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
