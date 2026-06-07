import { store } from '../store.js';
import { engine } from '../engine.js';
import { sound } from '../sound.js';
import { confetti } from '../celebrate.js';

let session = null;
let feedbackVisible = false;
let sessionEnded = false;
let selectedMatch = null; // for match questions: { side, index }
let matchPairs = [];      // completed match pairs
let reorderAnswer = [];   // current reorder answer word indices
let selectedErrorIdx = null;
let advanceTimer = null;  // auto-advance timer for correct answers

// How long the "correct" toast stays before auto-advancing to the next question.
const AUTO_ADVANCE_MS = 1600;

function clearAdvanceTimer() {
  if (advanceTimer) {
    clearTimeout(advanceTimer);
    advanceTimer = null;
  }
}

function advanceToNext() {
  clearAdvanceTimer();
  const feedbackArea = document.getElementById('feedbackArea');
  if (feedbackArea) feedbackArea.innerHTML = '';
  if (sessionEnded) return;
  session.currentIndex += 1;
  renderCurrentQuestion();
}

export function render(unitId, level) {
  if (unitId === 'review') {
    session = engine.createReviewSession();
  } else if (unitId === 'boss') {
    session = engine.createBossSession();
  } else {
    session = engine.createSession(Number(unitId), Number(level));
  }
  feedbackVisible = false;
  sessionEnded = false;
  selectedMatch = null;
  matchPairs = [];
  reorderAnswer = [];
  selectedErrorIdx = null;

  if (!session.questions || session.questions.length === 0) {
    return `
      <div class="view view-practice">
        <div class="practice-header">
          <button class="practice-header__close" id="practiceClose">✕</button>
          <div class="practice-header__progress" style="flex:1;"></div>
        </div>
        <div class="question-area">
          <p class="text-center text-muted mt-lg">暂无练习题目</p>
          <button class="btn-secondary mt-md" id="practiceBackBtn">返回</button>
        </div>
      </div>`;
  }

  return `
    <div class="view view-practice">
      <div class="practice-header">
        <button class="practice-header__close" id="practiceClose">✕</button>
        <div class="practice-header__progress" style="flex:1;">
          <div class="progress-bar progress-bar--secondary progress-bar--small">
            <div class="progress-bar__fill" id="practiceProgressFill" style="width:0%"></div>
          </div>
        </div>
        <div class="energy-bar" id="energyBar">
          ${renderHearts(session.energy, session.maxEnergy)}
        </div>
        <div class="practice-header__score" id="practiceScore">⭐ 0</div>
      </div>
      <div class="question-area" id="questionArea"></div>
      <div id="comboArea"></div>
      <div id="feedbackArea"></div>
    </div>`;
}

export function mount(unitId, level) {
  const backTarget = unitId === 'review' ? 'review'
    : unitId === 'boss' ? ''
    : `unit/${unitId}`;

  // Back button for empty sessions
  const backBtn = document.getElementById('practiceBackBtn');
  if (backBtn) {
    backBtn.addEventListener('click', () => {
      location.hash = backTarget;
    });
    return;
  }

  const closeBtn = document.getElementById('practiceClose');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      clearAdvanceTimer();
      if (sessionEnded) {
        location.hash = backTarget;
        return;
      }
      if (confirm('确定要退出练习吗？当前进度不会保存。')) {
        location.hash = backTarget;
      }
    });
  }

  renderCurrentQuestion();
}

function renderCurrentQuestion() {
  if (!session) return;
  if (session.currentIndex >= session.questions.length || session.energy <= 0) {
    showResults();
    return;
  }

  clearAdvanceTimer();
  feedbackVisible = false;
  selectedMatch = null;
  matchPairs = [];
  reorderAnswer = [];
  selectedErrorIdx = null;

  const q = session.questions[session.currentIndex];
  const area = document.getElementById('questionArea');
  if (!area) return;

  area.innerHTML = renderQuestion(q);
  updateProgress();
  attachQuestionListeners(q);
}

function renderQuestion(q) {
  switch (q.type) {
    case 'choice': return renderChoiceQuestion(q);
    case 'reorder': return renderReorderQuestion(q);
    case 'error': return renderErrorQuestion(q);
    case 'match': return renderMatchQuestion(q);
    case 'fill': return renderFillQuestion(q);
    case 'scenario': return renderScenarioQuestion(q);
    default: return `<p class="text-muted text-center">未知题型</p>`;
  }
}

function renderChoiceQuestion(q) {
  const sentence = q.sentence || '';
  const displaySentence = sentence.replace(/_+/g, '<span class="blank">______</span>');
  const instruction = q.instruction || '选择正确答案';

  const optionsHtml = (q.options || []).map((opt, i) =>
    `<button class="choice-btn" data-type="choice" data-index="${i}">${opt}</button>`
  ).join('');

  return `
    <div class="question-instruction">${instruction}</div>
    <div class="question-sentence">${displaySentence}</div>
    <div class="choices-grid mt-md">${optionsHtml}</div>`;
}

function renderReorderQuestion(q) {
  const instruction = q.instruction || '将单词排列成正确的句子';
  const words = q.words || [];

  const chipsHtml = words.map((w, i) =>
    `<button class="word-chip" data-type="reorder-word" data-word-index="${i}">${w}</button>`
  ).join('');

  return `
    <div class="question-instruction">${instruction}</div>
    <div class="mb-md">
      <div style="font-size:var(--text-sm);color:var(--color-text-light);margin-bottom:var(--space-xs);">你的答案：</div>
      <div class="answer-area" id="answerArea"></div>
    </div>
    <div>
      <div style="font-size:var(--text-sm);color:var(--color-text-light);margin-bottom:var(--space-xs);">可用单词：</div>
      <div class="word-bank" id="wordBank">${chipsHtml}</div>
    </div>
    <div class="practice-action mt-md">
      <button class="btn-primary" id="reorderSubmit" disabled>检查答案</button>
    </div>`;
}

function renderErrorQuestion(q) {
  const instruction = q.instruction || '点击句子中的错误单词';
  const words = q.words || [];

  const wordsHtml = words.map((w, i) =>
    `<button class="error-word" data-type="error-word" data-word-index="${i}">${w}</button>`
  ).join(' ');

  return `
    <div class="question-instruction">${instruction}</div>
    <div class="error-sentence mt-md">${wordsHtml}</div>
    <div class="practice-action mt-md">
      <button class="btn-primary" id="errorSubmit" disabled>确认选择</button>
    </div>`;
}

function renderMatchQuestion(q) {
  const instruction = q.instruction || '将左右两列正确配对';
  const left = q.left || [];
  const right = q.right || [];

  const leftHtml = left.map((item, i) =>
    `<button class="match-item" data-type="match" data-side="left" data-index="${i}">${item}</button>`
  ).join('');

  const rightHtml = right.map((item, i) =>
    `<button class="match-item" data-type="match" data-side="right" data-index="${i}">${item}</button>`
  ).join('');

  return `
    <div class="question-instruction">${instruction}</div>
    <div class="match-columns mt-md">
      <div class="match-column" id="matchLeft">${leftHtml}</div>
      <svg class="match-lines" id="matchLines"></svg>
      <div class="match-column" id="matchRight">${rightHtml}</div>
    </div>
    <div class="practice-action mt-md">
      <button class="btn-primary" id="matchSubmit" disabled>检查配对</button>
    </div>`;
}

function renderFillQuestion(q) {
  const instruction = q.instruction || '填入正确的单词';
  const sentence = q.sentence || '';
  const hint = q.hint || '';

  // Replace blank marker with input
  const parts = sentence.split(/_+/);
  let sentenceHtml = '';
  for (let i = 0; i < parts.length; i++) {
    sentenceHtml += parts[i];
    if (i < parts.length - 1) {
      sentenceHtml += `<input type="text" class="fill-input" id="fillInput" placeholder="${hint}" autocomplete="off" autocapitalize="off" spellcheck="false">`;
    }
  }

  return `
    <div class="question-instruction">${instruction}</div>
    <div class="question-sentence mt-md">${sentenceHtml}</div>
    <div class="practice-action mt-md">
      <button class="btn-primary" id="fillSubmit">检查答案</button>
    </div>`;
}

function renderScenarioQuestion(q) {
  const context = q.context || '';
  const dialogue = q.dialogue || [];
  const instruction = q.instruction || '选择最合适的回答';

  let bubblesHtml = '';
  for (const line of dialogue) {
    const bubbleClass = line.speaker === 'player' ? 'chat-bubble--player' : 'chat-bubble--npc';
    bubblesHtml += `<div class="chat-bubble ${bubbleClass}">${line.text}</div>`;
  }

  const optionsHtml = (q.options || []).map((opt, i) =>
    `<button class="chat-choice-btn" data-type="scenario" data-index="${i}">${opt}</button>`
  ).join('');

  return `
    <div class="question-instruction">${instruction}</div>
    ${context ? `<div class="card mb-md" style="font-size:var(--text-sm);color:var(--color-text-light);">🎭 ${context}</div>` : ''}
    <div class="chat-area">${bubblesHtml}</div>
    <div class="chat-choices mt-md">${optionsHtml}</div>`;
}

function attachQuestionListeners(q) {
  switch (q.type) {
    case 'choice': attachChoiceListeners(q); break;
    case 'reorder': attachReorderListeners(q); break;
    case 'error': attachErrorListeners(q); break;
    case 'match': attachMatchListeners(q); break;
    case 'fill': attachFillListeners(q); break;
    case 'scenario': attachScenarioListeners(q); break;
  }
}

function attachChoiceListeners(q) {
  document.querySelectorAll('.choice-btn[data-type="choice"]').forEach(btn => {
    btn.addEventListener('click', () => {
      if (feedbackVisible) return;
      const idx = Number(btn.dataset.index);
      submitAnswer(q, idx);
    });
  });
}

function attachReorderListeners(q) {
  const words = q.words || [];

  // Click word in bank to add to answer
  document.querySelectorAll('.word-chip[data-type="reorder-word"]').forEach(chip => {
    chip.addEventListener('click', () => {
      if (feedbackVisible) return;
      const wordIdx = Number(chip.dataset.wordIndex);

      if (reorderAnswer.includes(wordIdx)) return;
      reorderAnswer.push(wordIdx);
      updateReorderDisplay(words);
    });
  });

  const submitBtn = document.getElementById('reorderSubmit');
  if (submitBtn) {
    submitBtn.addEventListener('click', () => {
      if (feedbackVisible) return;
      const answer = reorderAnswer.map(i => words[i]).join(' ');
      submitAnswer(q, answer);
    });
  }
}

function updateReorderDisplay(words) {
  const answerArea = document.getElementById('answerArea');
  const wordBank = document.getElementById('wordBank');
  const submitBtn = document.getElementById('reorderSubmit');

  if (answerArea) {
    answerArea.innerHTML = reorderAnswer.map(idx =>
      `<button class="word-chip word-chip--in-answer" data-remove-index="${idx}">${words[idx]}</button>`
    ).join('');

    // Click to remove from answer
    answerArea.querySelectorAll('.word-chip--in-answer').forEach(chip => {
      chip.addEventListener('click', () => {
        if (feedbackVisible) return;
        const removeIdx = Number(chip.dataset.removeIndex);
        reorderAnswer = reorderAnswer.filter(i => i !== removeIdx);
        updateReorderDisplay(words);
      });
    });
  }

  // Update word bank: dim placed words
  if (wordBank) {
    wordBank.querySelectorAll('.word-chip').forEach(chip => {
      const idx = Number(chip.dataset.wordIndex);
      if (reorderAnswer.includes(idx)) {
        chip.classList.add('word-chip--placed');
      } else {
        chip.classList.remove('word-chip--placed');
      }
    });
  }

  if (submitBtn) {
    submitBtn.disabled = reorderAnswer.length < words.length;
  }
}

function attachErrorListeners(q) {
  document.querySelectorAll('.error-word[data-type="error-word"]').forEach(word => {
    word.addEventListener('click', () => {
      if (feedbackVisible) return;
      const idx = Number(word.dataset.wordIndex);

      // Deselect previous
      document.querySelectorAll('.error-word--selected').forEach(el =>
        el.classList.remove('error-word--selected')
      );

      word.classList.add('error-word--selected');
      selectedErrorIdx = idx;

      const submitBtn = document.getElementById('errorSubmit');
      if (submitBtn) submitBtn.disabled = false;
    });
  });

  const submitBtn = document.getElementById('errorSubmit');
  if (submitBtn) {
    submitBtn.addEventListener('click', () => {
      if (feedbackVisible || selectedErrorIdx === null) return;
      submitAnswer(q, selectedErrorIdx);
    });
  }
}

const PAIR_COLORS = ['#1CB0F6', '#58CC02', '#CE82FF', '#FF9600', '#FF4B4B', '#00CD9C'];

function drawMatchLines(q) {
  const svg = document.getElementById('matchLines');
  if (!svg) return;
  const container = svg.closest('.match-columns');
  if (!container) return;
  const rect = container.getBoundingClientRect();
  svg.setAttribute('width', rect.width);
  svg.setAttribute('height', rect.height);
  svg.innerHTML = '';

  matchPairs.forEach((pair, i) => {
    const leftIdx = (q.left || []).indexOf(pair[0]);
    const rightIdx = (q.right || []).indexOf(pair[1]);
    const leftEl = container.querySelector(`.match-item[data-side="left"][data-index="${leftIdx}"]`);
    const rightEl = container.querySelector(`.match-item[data-side="right"][data-index="${rightIdx}"]`);
    if (!leftEl || !rightEl) return;

    const lr = leftEl.getBoundingClientRect();
    const rr = rightEl.getBoundingClientRect();
    const x1 = lr.right - rect.left;
    const y1 = lr.top + lr.height / 2 - rect.top;
    const x2 = rr.left - rect.left;
    const y2 = rr.top + rr.height / 2 - rect.top;

    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    const color = PAIR_COLORS[i % PAIR_COLORS.length];
    line.setAttribute('x1', x1);
    line.setAttribute('y1', y1);
    line.setAttribute('x2', x2);
    line.setAttribute('y2', y2);
    line.setAttribute('stroke', color);
    line.setAttribute('stroke-width', '3');
    line.setAttribute('stroke-linecap', 'round');
    line.setAttribute('opacity', '0.7');
    svg.appendChild(line);
  });
}

function attachMatchListeners(q) {
  const totalPairs = (q.correctPairs || []).length;

  document.querySelectorAll('.match-item[data-type="match"]').forEach(item => {
    item.addEventListener('click', () => {
      if (feedbackVisible) return;

      const side = item.dataset.side;
      const idx = Number(item.dataset.index);

      // Click on a matched item → un-pair it
      if (item.classList.contains('match-item--matched')) {
        const itemText = side === 'left' ? (q.left || [])[idx] : (q.right || [])[idx];
        const pairIdx = matchPairs.findIndex(p =>
          side === 'left' ? p[0] === itemText : p[1] === itemText
        );
        if (pairIdx !== -1) {
          const pair = matchPairs[pairIdx];
          const leftIdx = (q.left || []).indexOf(pair[0]);
          const rightIdx = (q.right || []).indexOf(pair[1]);
          const leftEl = document.querySelector(`.match-item[data-side="left"][data-index="${leftIdx}"]`);
          const rightEl = document.querySelector(`.match-item[data-side="right"][data-index="${rightIdx}"]`);
          if (leftEl) leftEl.classList.remove('match-item--matched');
          if (rightEl) rightEl.classList.remove('match-item--matched');
          matchPairs.splice(pairIdx, 1);
          const submitBtn = document.getElementById('matchSubmit');
          if (submitBtn) submitBtn.disabled = true;
        }
        selectedMatch = null;
        document.querySelectorAll('.match-item--selected').forEach(el =>
          el.classList.remove('match-item--selected')
        );
        drawMatchLines(q);
        return;
      }

      if (!selectedMatch) {
        // First selection
        document.querySelectorAll('.match-item--selected').forEach(el =>
          el.classList.remove('match-item--selected')
        );
        selectedMatch = { side, index: idx };
        item.classList.add('match-item--selected');
      } else if (selectedMatch.side === side && selectedMatch.index === idx) {
        // Click same item again → deselect
        item.classList.remove('match-item--selected');
        selectedMatch = null;
      } else if (selectedMatch.side === side) {
        // Same side, switch selection
        document.querySelectorAll('.match-item--selected').forEach(el =>
          el.classList.remove('match-item--selected')
        );
        selectedMatch = { side, index: idx };
        item.classList.add('match-item--selected');
      } else {
        // Different side - make a pair
        const leftIdx = side === 'left' ? idx : selectedMatch.index;
        const rightIdx = side === 'right' ? idx : selectedMatch.index;
        const leftText = (q.left || [])[leftIdx];
        const rightText = (q.right || [])[rightIdx];

        matchPairs.push([leftText, rightText]);

        // Mark both as matched
        const leftEl = document.querySelector(`.match-item[data-side="left"][data-index="${leftIdx}"]`);
        const rightEl = document.querySelector(`.match-item[data-side="right"][data-index="${rightIdx}"]`);

        if (leftEl) {
          leftEl.classList.remove('match-item--selected');
          leftEl.classList.add('match-item--matched');
        }
        if (rightEl) {
          rightEl.classList.remove('match-item--selected');
          rightEl.classList.add('match-item--matched');
        }

        document.querySelectorAll('.match-item--selected').forEach(el =>
          el.classList.remove('match-item--selected')
        );
        selectedMatch = null;

        // Enable submit if all paired
        const submitBtn = document.getElementById('matchSubmit');
        if (submitBtn && matchPairs.length >= totalPairs) {
          submitBtn.disabled = false;
        }

        drawMatchLines(q);
      }
    });
  });

  const submitBtn = document.getElementById('matchSubmit');
  if (submitBtn) {
    submitBtn.addEventListener('click', () => {
      if (feedbackVisible) return;
      submitAnswer(q, matchPairs);
    });
  }
}

function attachFillListeners(q) {
  const submitBtn = document.getElementById('fillSubmit');
  const input = document.getElementById('fillInput');

  if (submitBtn && input) {
    submitBtn.addEventListener('click', () => {
      if (feedbackVisible) return;
      submitAnswer(q, input.value);
    });

    // Ignore Enter while an IME composition is active — when typing English
    // through a Chinese input method, the Enter that confirms the composition
    // would otherwise submit the answer before the user has finished.
    let composing = false;
    input.addEventListener('compositionstart', () => { composing = true; });
    input.addEventListener('compositionend', () => { composing = false; });

    input.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' || feedbackVisible) return;
      if (composing || e.isComposing || e.keyCode === 229) return; // IME in progress
      submitAnswer(q, input.value);
    });
  }
}

function attachScenarioListeners(q) {
  document.querySelectorAll('.chat-choice-btn[data-type="scenario"]').forEach(btn => {
    btn.addEventListener('click', () => {
      if (feedbackVisible) return;
      const idx = Number(btn.dataset.index);
      submitAnswer(q, idx);
    });
  });
}

function submitAnswer(question, userAnswer) {
  if (feedbackVisible || sessionEnded) return;
  feedbackVisible = true;

  const result = engine.checkAnswer(question, userAnswer);
  const isCorrect = result.correct;

  // Update session
  if (isCorrect) {
    session.combo += 1;
    if (session.combo > session.maxCombo) session.maxCombo = session.combo;
    const multiplier = session.combo >= 10 ? 3 : session.combo >= 5 ? 2 : session.combo >= 3 ? 1.5 : 1;
    const points = Math.round(10 * multiplier);
    session.score += points;
    if (session.combo >= 3) sound.combo(session.combo);
    else sound.correct();
  } else {
    session.combo = 0;
    session.energy -= 1;
    sound.wrong();
  }

  session.answers.push({
    questionId: question.id,
    subSkill: question.subSkill,
    correct: isCorrect,
    userAnswer,
  });

  // Record mastery
  if (question.subSkill) {
    store.recordAnswer(question.subSkill, isCorrect);
  }

  // Error notebook (错题本): collect wrong answers, retire them once answered
  // correctly during a review session.
  if (!isCorrect) {
    store.addMistake(question, session.unitId, session.level);
  } else if (session.unitId === 'review') {
    store.removeMistake(question.id);
  }

  // Visual feedback on the question elements
  showAnswerFeedback(question, userAnswer, isCorrect, result);

  // Update UI elements
  updateScore();
  updateEnergy(isCorrect);
  showCombo(isCorrect);
  showFeedback(isCorrect, question, userAnswer, result);
}

function showAnswerFeedback(question, userAnswer, isCorrect, result) {
  switch (question.type) {
    case 'choice':
    case 'scenario': {
      const selector = question.type === 'choice'
        ? '.choice-btn[data-type="choice"]'
        : '.chat-choice-btn[data-type="scenario"]';
      document.querySelectorAll(selector).forEach(btn => {
        const idx = Number(btn.dataset.index);
        btn.disabled = true;
        if (idx === question.correctIndex) {
          btn.classList.add('choice-btn--correct');
        }
        if (idx === userAnswer && !isCorrect) {
          btn.classList.add('choice-btn--wrong');
        }
      });
      break;
    }
    case 'error': {
      document.querySelectorAll('.error-word').forEach(w => {
        const idx = Number(w.dataset.wordIndex);
        if (idx === question.errorIndex) {
          w.classList.add('error-word--correct-target');
        }
      });
      break;
    }
    case 'fill': {
      const input = document.getElementById('fillInput');
      if (input) {
        input.disabled = true;
        input.classList.add(isCorrect ? 'fill-input--correct' : 'fill-input--wrong');
      }
      break;
    }
  }
}

function showFeedback(isCorrect, question, userAnswer, result) {
  const feedbackArea = document.getElementById('feedbackArea');
  if (!feedbackArea) return;

  const bannerClass = isCorrect ? 'feedback-banner--correct' : 'feedback-banner--wrong';
  const icon = isCorrect ? '✅' : '❌';
  const title = isCorrect ? '回答正确！' : '回答错误';

  const scoreInfo = isCorrect
    ? `<span style="font-size:var(--text-lg);font-weight:800;">+${Math.round(10 * (session.combo >= 10 ? 3 : session.combo >= 5 ? 2 : session.combo >= 3 ? 1.5 : 1))}分</span>`
    : '';

  const comboInfo = isCorrect && session.combo >= 3
    ? `<span style="margin-left:var(--space-sm);">🔥 x${session.combo} 连击!</span>`
    : '';

  // For "error" (click-the-wrong-word) questions, always reveal the right word
  // — even when the learner answered correctly — so they learn the fix.
  let correctionHtml = '';
  if (question.type === 'error' && result.correction) {
    const wrongWord = question.words?.[question.errorIndex] ?? '';
    correctionHtml = `<div class="feedback-banner__correct-answer">正确写法：<s>${wrongWord}</s> → <strong>${result.correction}</strong></div>`;
  }

  // The plain "correct answer" line is only useful on wrong answers, and not for
  // error questions (whose answer is the wrong word — shown via correctionHtml).
  const correctAnswerHtml = !isCorrect && result.correctAnswer && question.type !== 'error'
    ? `<div class="feedback-banner__correct-answer">正确答案：${result.correctAnswer}</div>`
    : '';

  const explanationHtml = !isCorrect && result.explanation
    ? `<div class="feedback-banner__explanation">${result.explanation}</div>`
    : '';

  // Correct → brief toast that auto-advances (no need to reach for a button).
  // Wrong → keep a manual 继续 button so there's time to read the explanation.
  const continueBtnHtml = isCorrect
    ? ''
    : `<button class="btn-primary" id="continueBtn" style="background:rgba(255,255,255,0.25);box-shadow:0 4px 0 rgba(0,0,0,0.15);">继续</button>`;

  feedbackArea.innerHTML = `
    <div class="feedback-banner ${bannerClass}">
      <div class="feedback-banner__header">
        <span class="feedback-banner__icon">${icon}</span>
        <span>${title}</span>
        ${scoreInfo}${comboInfo}
      </div>
      ${correctionHtml}
      ${correctAnswerHtml}
      ${explanationHtml}
      ${continueBtnHtml}
    </div>`;

  if (isCorrect) {
    clearAdvanceTimer();
    advanceTimer = setTimeout(advanceToNext, AUTO_ADVANCE_MS);
  } else {
    const continueBtn = document.getElementById('continueBtn');
    if (continueBtn) {
      continueBtn.addEventListener('click', advanceToNext);
    }
  }
}

function showResults() {
  sessionEnded = true;
  const isReview = session.unitId === 'review';
  const isBoss = session.unitId === 'boss';
  const results = engine.calculateResults(session);

  // Save results
  let bossPassed = false;
  if (isBoss) {
    store.addScore(results.score);
    bossPassed = store.recordBossResult(results.accuracy);
    store.advanceLearningPlan({ isBoss: true });
  } else if (isReview) {
    // Review still earns points, just no level/unit progression.
    store.addScore(results.score);
  } else {
    store.completeLevel(session.unitId, session.level, results.stars, results.score);
    store.advanceLearningPlan({ unitId: session.unitId, level: session.level });
  }
  store.updateStreak();
  store.recordSession({
    unitId: session.unitId,
    level: session.level,
    score: results.score,
    stars: results.stars,
    correct: session.answers.filter(a => a.correct).length,
    total: session.answers.length,
    accuracy: results.accuracy,
    maxCombo: results.comboMax,
  });

  const accuracyPct = Math.round(results.accuracy * 100);

  let titleText, subtitleText, starsHtml;
  if (isBoss) {
    starsHtml = `<div style="font-size:3.5rem;">${bossPassed ? '🎓' : '💪'}</div>`;
    titleText = bossPassed ? 'PET 模拟通过！' : '再接再厉！';
    subtitleText = bossPassed
      ? `综合正确率 ${accuracyPct}% · 已达标(≥70%)`
      : `综合正确率 ${accuracyPct}% · 距达标还差一点`;
  } else {
    starsHtml = [1, 2, 3].map(i =>
      `<span class="result-star ${i <= results.stars ? 'result-star--earned' : ''}">⭐</span>`
    ).join('');
    titleText = results.stars === 3 ? '太棒了！完美通关！' :
      results.stars === 2 ? '做得不错！' :
      results.stars === 1 ? '通关成功！' : '再试一次吧';
    subtitleText = isReview ? '复习巩固' : `Unit ${session.unitId} - Lv.${session.level}`;
  }

  const weakHtml = results.weakPoints.length > 0
    ? `<div class="result-weakness">
        <div class="result-weakness__title">⚠️ 需要加强</div>
        <div class="result-weakness__list">${results.weakPoints.join('、')}</div>
      </div>`
    : '';

  const area = document.getElementById('questionArea');
  if (area) {
    area.innerHTML = `
      <div class="view-result">
        <div class="result-stars">${starsHtml}</div>
        <div class="result-title">${titleText}</div>
        <div class="result-subtitle">${subtitleText}</div>
        <div class="result-xp">+${results.score} 积分</div>
        <div class="result-breakdown">
          <div class="result-breakdown__row">
            <span class="result-breakdown__label">正确率</span>
            <span class="result-breakdown__value">${accuracyPct}%</span>
          </div>
          <div class="result-breakdown__row">
            <span class="result-breakdown__label">最高连击</span>
            <span class="result-breakdown__value">🔥 ${results.comboMax}</span>
          </div>
          <div class="result-breakdown__row">
            <span class="result-breakdown__label">答对题数</span>
            <span class="result-breakdown__value">${session.answers.filter(a => a.correct).length} / ${session.answers.length}</span>
          </div>
        </div>
        ${weakHtml}
        <div class="result-actions">
          <button class="btn-primary" id="resultContinue">继续</button>
          <button class="btn-secondary" id="resultRetry">重试</button>
        </div>
      </div>`;
  }

  // Hide feedback area
  const feedbackArea = document.getElementById('feedbackArea');
  if (feedbackArea) feedbackArea.innerHTML = '';
  const comboArea = document.getElementById('comboArea');
  if (comboArea) comboArea.innerHTML = '';

  // Celebrate strong finishes.
  if (isBoss && bossPassed) {
    sound.victory();
    confetti({ count: 140, duration: 3200 });
  } else if (!isBoss && results.stars >= 3) {
    sound.finish(results.stars);
    confetti({ count: 90 });
  } else if (results.stars >= 1) {
    sound.finish(results.stars);
  }

  // Attach result button listeners
  setTimeout(() => {
    const continueBtn = document.getElementById('resultContinue');
    const retryBtn = document.getElementById('resultRetry');

    if (continueBtn) {
      continueBtn.addEventListener('click', () => {
        location.hash = isBoss ? '' : isReview ? 'review' : `unit/${session.unitId}`;
      });
    }
    if (retryBtn) {
      retryBtn.addEventListener('click', () => {
        location.hash = isBoss ? 'practice/boss'
          : isReview ? 'practice/review'
          : `practice/${session.unitId}/${session.level}`;
        // Force re-render by triggering hashchange
        window.dispatchEvent(new HashChangeEvent('hashchange'));
      });
    }
  }, 0);
}

function renderHearts(count, max = 3) {
  let html = '';
  for (let i = 0; i < max; i++) {
    const lostClass = i >= count ? ' energy-bar__heart--lost' : '';
    html += `<span class="energy-bar__heart${lostClass}" data-heart="${i}">❤️</span>`;
  }
  return html;
}

function updateProgress() {
  const fill = document.getElementById('practiceProgressFill');
  if (fill && session) {
    const pct = Math.round((session.currentIndex / session.questions.length) * 100);
    fill.style.width = pct + '%';
  }
}

function updateScore() {
  const scoreEl = document.getElementById('practiceScore');
  if (scoreEl && session) {
    scoreEl.textContent = `⭐ ${session.score}`;
  }
}

function updateEnergy(isCorrect) {
  if (isCorrect) return;
  const energyBar = document.getElementById('energyBar');
  if (energyBar && session) {
    energyBar.innerHTML = renderHearts(session.energy, session.maxEnergy);
    // Trigger breaking animation on the lost heart
    const hearts = energyBar.querySelectorAll('.energy-bar__heart');
    const lostIdx = session.energy; // the one that just broke
    if (hearts[lostIdx]) {
      hearts[lostIdx].classList.add('energy-bar__heart--breaking');
    }
  }
}

function showCombo(isCorrect) {
  const comboArea = document.getElementById('comboArea');
  if (!comboArea) return;

  if (isCorrect && session.combo >= 3) {
    comboArea.innerHTML = `
      <div class="combo-display">
        <span class="combo-display__fire">⭐</span>
        x${session.combo} 连击!
      </div>`;
    setTimeout(() => {
      if (comboArea) comboArea.innerHTML = '';
    }, 1500);
  } else {
    comboArea.innerHTML = '';
  }
}
