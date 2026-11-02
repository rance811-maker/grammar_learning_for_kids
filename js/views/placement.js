import { store } from '../store.js';
import { curriculum } from '../curriculum.js';
import { scrollToStart } from '../scrollToStart.js';
import { track } from '../analytics.js';
import { engine } from '../engine.js';
import { sound } from '../sound.js';
import { confetti } from '../celebrate.js';

let testState = null;

// 做过摸底的账号再做一次，学习计划会按新结果整个重排（计划进度从 0 算）。
// 这一步该由家长决定：家长专区「重新摸底」确认后发一张一次性的通行条，摸底页凭它放行。
// 孩子从「这是什么」页、旧链接等别的路进来，只看到一张「已经做过了」的说明，点不出摸底。
const RETAKE_KEY = 'gq-placement-retake';
export function allowPlacementRetake() {
  try { sessionStorage.setItem(RETAKE_KEY, store.account?.userId || '1'); } catch { /* */ }
}
// 读一次就作废：中途离开再进来，要家长重新点一次
function takeRetakePass() {
  try {
    const v = sessionStorage.getItem(RETAKE_KEY);
    sessionStorage.removeItem(RETAKE_KEY);
    return Boolean(v) && v === (store.account?.userId || '1');
  } catch { return false; }
}

function renderAlreadyDone() {
  return `
    <div id="placementRoot">
      <div class="view text-center" style="max-width:560px;margin:0 auto;padding:var(--space-lg) var(--space-md);">
        <div style="font-size:3rem;margin-bottom:var(--space-md);">✅</div>
        <h2 class="mb-md">你已经做过摸底啦</h2>
        <p style="color:var(--color-text-light);margin-bottom:var(--space-lg);line-height:1.8;">
          上次摸底的结果已经用来安排学习了，接着练就好。<br>
          重新摸底会把学习计划从头排一遍，要请家长在「家长专区」里操作。
        </p>
        <a class="btn btn--primary btn--large" href="#">回到学习地图</a>
        <div style="margin-top:var(--space-md);">
          <a href="#parent" style="font-size:var(--text-sm);color:var(--color-secondary);">家长专区 ›</a>
        </div>
      </div>
    </div>`;
}

function pickQuestions() {
  const questions = [];
  for (let id = 1; id <= 12; id++) {
    const unit = curriculum.getUnit(id);
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
  const retake = takeRetakePass();
  if (store.state.placementCompleted && !retake) {
    testState = null;
    return renderAlreadyDone();
  }
  const questions = pickQuestions();
  testState = { questions, currentIndex: 0, answers: [] };

  return `
    <div id="placementRoot">
      <div class="view text-center" style="max-width:560px;margin:0 auto;padding:var(--space-lg) var(--space-md);">
        <div style="font-size:3rem;margin-bottom:var(--space-md);">📝</div>
        <h2 class="mb-md">先花 3 分钟，看看孩子已经会了什么</h2>
        <p style="color:var(--color-text-light);margin-bottom:var(--space-lg);line-height:1.8;">
          Grammar Quest 不给所有孩子发同一套题。<br>
          这 ${questions.length} 道题每个单元一题，做完就知道哪些语法点已经掌握、哪些还要练——<br>
          后面的学习计划按这个结果来排。
          ${retake ? '<br><strong>这是重新摸底：做完会按新结果重新安排学习计划；中途离开的话，原来的计划不变。</strong>' : ''}
        </p>
        <button class="btn btn--primary btn--large" id="placementBeginBtn">开始摸底</button>
        <div style="margin-top:var(--space-md);">
          <a href="#about" style="font-size:var(--text-sm);color:var(--color-secondary);">先看看这是什么 ›</a>
        </div>
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
  scrollToStart(root);
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
  track('placement_done', { props: { c: results.filter((r) => r.correct).length, n: results.length } });
  // 摸底用的就是各单元 Lv.1 的第一道题，不记成"见过"的话，
  // 孩子几分钟后进 Lv.1 又会先碰到刚才那道。
  store.addPracticeShown(testState.questions.map((it) => it.question.id));

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
