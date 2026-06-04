import { store } from '../store.js';
import { units } from '../data/units.js';
import { engine } from '../engine.js';
import { sound } from '../sound.js';
import { confetti } from '../celebrate.js';

let testState = null;

function pickQuestions() {
  const questions = [];
  for (let id = 1; id <= 12; id++) {
    const unit = units[id];
    if (!unit) continue;
    const lvl = unit.levels[1];
    if (!lvl || !lvl.questions.length) continue;
    const q = lvl.questions.find(q => q.type === 'choice') || lvl.questions[0];
    questions.push({ unitId: id, unitTitle: unit.title, unitDescription: unit.description, question: q });
  }
  return questions;
}

function renderQuestionCard() {
  const { questions, currentIndex } = testState;
  const item = questions[currentIndex];
  const q = item.question;
  const progress = currentIndex + 1;
  const total = questions.length;
  const pct = Math.round((currentIndex / total) * 100);

  const sentence = (q.sentence || '').replace(/_+/g, '<span class="blank">______</span>');
  const optionsHtml = (q.options || []).map((opt, i) =>
    `<button class="choice-btn" data-index="${i}">${opt}</button>`
  ).join('');

  return `
    <div class="view" style="max-width:560px;margin:0 auto;padding:var(--space-lg) var(--space-md);">
      <div class="mb-md">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--space-sm);">
          <span style="font-size:var(--text-sm);color:var(--color-text-light);">${progress} / ${total}</span>
          <span class="badge badge--success" style="font-size:var(--text-xs);">Unit ${item.unitId}</span>
        </div>
        <div class="progress-bar" style="height:8px;">
          <div class="progress-bar__fill" style="width:${pct}%;transition:width 0.3s ease;"></div>
        </div>
      </div>

      <div class="card" style="padding:var(--space-lg);">
        <div style="font-size:var(--text-xs);color:var(--color-text-light);margin-bottom:var(--space-sm);">
          ${item.unitTitle} · ${item.unitDescription}
        </div>
        <div style="font-size:var(--text-sm);color:var(--color-text);margin-bottom:var(--space-sm);">
          ${q.instruction || '选择正确的答案'}
        </div>
        <div style="font-size:1.1rem;line-height:1.6;margin-bottom:var(--space-lg);">${sentence}</div>
        <div class="choices-grid">${optionsHtml}</div>
      </div>

      <div id="placementFeedback" style="margin-top:var(--space-md);min-height:48px;"></div>
    </div>`;
}

function renderResults() {
  const { questions, answers } = testState;
  const correct = answers.filter(a => a.correct).length;

  const listHtml = questions.map((item, i) => {
    const passed = answers[i] && answers[i].correct;
    const icon = passed ? '✅' : '❌';
    const color = passed ? 'var(--color-primary)' : 'var(--color-danger)';
    return `
      <div style="display:flex;align-items:center;gap:var(--space-sm);padding:var(--space-sm) 0;border-bottom:1px solid var(--color-muted);">
        <span style="font-size:1.2rem;">${icon}</span>
        <span style="flex:1;font-size:var(--text-sm);">
          <strong style="color:${color};">Unit ${item.unitId}</strong> · ${item.unitTitle}
        </span>
        <span style="font-size:var(--text-xs);color:var(--color-text-light);">${item.unitDescription}</span>
      </div>`;
  }).join('');

  return `
    <div class="view" style="max-width:560px;margin:0 auto;padding:var(--space-lg) var(--space-md);">
      <div class="text-center mb-lg">
        <div style="font-size:2.5rem;margin-bottom:var(--space-sm);">🎯</div>
        <h2 style="margin-bottom:var(--space-sm);">摸底测试完成！</h2>
        <p style="font-size:1.1rem;color:var(--color-text-light);">
          你已经掌握了 <strong style="color:var(--color-primary);font-size:1.3rem;">${correct}</strong> / ${questions.length} 个语法点！
        </p>
      </div>

      <div class="card mb-lg" style="padding:var(--space-md);">
        ${listHtml}
      </div>

      <div class="text-center">
        <button class="btn btn--primary btn--large" id="placementStartBtn">开始学习</button>
      </div>
    </div>`;
}

export function render() {
  const questions = pickQuestions();
  testState = { questions, currentIndex: 0, answers: [] };

  return `
    <div id="placementRoot">
      <div class="view text-center" style="max-width:560px;margin:0 auto;padding:var(--space-lg) var(--space-md);">
        <div style="font-size:3rem;margin-bottom:var(--space-md);">📝</div>
        <h2 class="mb-md">摸底测试</h2>
        <p style="color:var(--color-text-light);margin-bottom:var(--space-lg);line-height:1.6;">
          让我们看看你已经掌握了哪些语法！<br>
          <span style="font-size:var(--text-sm);color:var(--color-muted);">共 ${questions.length} 题，每单元 1 题，轻松作答即可</span>
        </p>
        <button class="btn btn--primary btn--large" id="placementBeginBtn">开始测试</button>
      </div>
    </div>`;
}

export function mount() {
  const beginBtn = document.getElementById('placementBeginBtn');
  if (beginBtn) {
    beginBtn.addEventListener('click', () => {
      showCurrentQuestion();
    });
  }
}

function showCurrentQuestion() {
  const root = document.getElementById('placementRoot');
  if (!root) return;

  if (testState.currentIndex >= testState.questions.length) {
    showResultsScreen();
    return;
  }

  root.innerHTML = renderQuestionCard();
  attachChoiceListeners();
}

function attachChoiceListeners() {
  document.querySelectorAll('.choice-btn[data-index]').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = Number(btn.dataset.index);
      handleAnswer(idx);
    });
  });
}

function handleAnswer(userAnswer) {
  const item = testState.questions[testState.currentIndex];
  const q = item.question;
  const result = engine.checkAnswer(q, userAnswer);

  testState.answers.push({
    unitId: item.unitId,
    correct: result.correct,
  });

  if (result.correct) sound.correct();
  else sound.wrong();

  document.querySelectorAll('.choice-btn[data-index]').forEach(btn => {
    const idx = Number(btn.dataset.index);
    btn.disabled = true;
    if (idx === q.correctIndex) {
      btn.classList.add('choice-btn--correct');
    }
    if (idx === userAnswer && !result.correct) {
      btn.classList.add('choice-btn--wrong');
    }
  });

  const feedback = document.getElementById('placementFeedback');
  if (feedback) {
    const icon = result.correct ? '✅' : '❌';
    const msg = result.correct ? '回答正确！' : '回答错误';
    const color = result.correct ? 'var(--color-primary)' : 'var(--color-danger)';
    feedback.innerHTML = `
      <div style="text-align:center;color:${color};font-weight:600;font-size:var(--text-sm);">
        ${icon} ${msg}
      </div>`;
  }

  setTimeout(() => {
    testState.currentIndex++;
    showCurrentQuestion();
  }, 1200);
}

function showResultsScreen() {
  const root = document.getElementById('placementRoot');
  if (!root) return;

  const results = testState.answers.map((a, i) => ({
    unitId: a.unitId,
    correct: a.correct,
    subSkill: testState.questions[i].question.subSkill || '',
  }));

  store.completePlacement(results);

  root.innerHTML = renderResults();
  sound.finish(3);
  confetti({ count: 100 });

  const startBtn = document.getElementById('placementStartBtn');
  if (startBtn) {
    startBtn.addEventListener('click', () => {
      location.hash = '';
    });
  }
}
