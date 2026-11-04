import { store } from '../store.js';
import { engine, questionTextKey } from '../engine.js';
import { cloud } from '../cloud.js';
import { curriculum } from '../curriculum.js';
import { track } from '../analytics.js';
import { displayForm, fillSentence, isZeroForm } from '../fillAnswers.js';
import { sound } from '../sound.js';
import { confetti } from '../celebrate.js';
import { scrollToStart } from '../scrollToStart.js';
import { pregenerateVariants } from '../variantGenerator.js';
import { skillName, skillEnglish, hasChineseName } from '../data/skill-names.js';

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
  // 人已经不在练习页了（比如用浏览器的后退离开）：别在后台接着跳题、把这一场跑完记成绩
  if (!document.getElementById('questionArea')) return;
  clearFeedback();
  if (sessionEnded) return;
  session.currentIndex += 1;
  renderCurrentQuestion();
}

// 从练习离开回到哪里：复习 → 复习中心，模拟挑战 / 测试题 → 首页，其余 → 所在单元
export function backTargetFor(unitId) {
  return unitId === 'review' ? 'review'
    : !unitId || unitId === 'boss' || unitId === 'demo' ? ''
    : `unit/${unitId}`;
}

// 要离开练习页时调用（✕、顶栏「← 返回」、导航）。正在答题就先确认，返回 false 表示孩子选了留下。
// 没在答题（锁着的关、已经出了结算页、被拦下的注册引导）直接放行。
export function confirmLeave() {
  const inProgress = session && !sessionEnded && session.questions?.length && document.getElementById('questionArea');
  // 取消时不停自动跳题：答对后点 ✕ 再取消，原来计时器已经被清掉，题目就卡在那儿不动了
  if (inProgress && !confirm('确定要退出练习吗？当前进度不会保存。')) return false;
  clearAdvanceTimer();
  return true;
}

export function render(unitId, level) {
  clearAdvanceTimer();   // 上一场答对后的自动跳题还没触发，别让它跳到这一场

  if (unitId === 'review') {
    session = engine.createReviewSession();
  } else if (unitId === 'boss') {
    session = engine.createBossSession();
  } else if (unitId === 'demo') {
    session = engine.createDemoSession(level);
  } else {
    const u = Number(unitId), l = Number(level);
    const lv = store.state.units?.[u]?.practiceLevels?.[l];
    if (!lv || !lv.unlocked) {
      // 直接通过 URL / 计划按钮进入锁着的关：以前这里不校验，解锁规则形同虚设，
      // 打完还会出现"已完成却 🔒 未解锁"的卡片。改为拦下并说明。
      session = { unitId: u, level: l, questions: [], answers: [], energy: 0, maxEnergy: 3,
        score: 0, combo: 0, maxCombo: 0, startTime: Date.now(), locked: true };
    } else {
      session = engine.createSession(u, l);
    }
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
          <p class="text-center text-muted mt-lg">${session.locked
            ? `这一关还没解锁。通过前一关（至少 1 星）后就能进来。`
            : '暂无练习题目'}</p>
          <button class="btn-secondary mt-md" id="practiceBackBtn">返回关卡</button>
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
  const backTarget = backTargetFor(unitId);
  stackHeaderBelowNav();

  // ✕ 在锁着的关、没题的页面上也要能用（以前这种页面只接了「返回关卡」，✕ 点了没反应）
  const closeBtn = document.getElementById('practiceClose');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      if (confirmLeave()) location.hash = backTarget;
    });
  }

  // Back button for empty sessions
  const backBtn = document.getElementById('practiceBackBtn');
  if (backBtn) {
    backBtn.addEventListener('click', () => {
      location.hash = backTarget;
    });
    return;
  }

  renderCurrentQuestion();
}

// 手机上顶部的图标导航（.sidebar）也是 sticky top:0。练习的进度条横栏原来同样贴 top:0，
// 滚动时压在导航上，图标只露出上半截。改成贴在导航正下方，两条栏上下叠放。
// 导航高度随字体、图标渲染略有不同，所以量出来再设，不在 CSS 里写死。宽屏上侧栏在左边，不用让。
function stackHeaderBelowNav() {
  const header = document.querySelector('.practice-header');
  const nav = document.querySelector('.sidebar');
  if (!header || !nav) return;
  const r = nav.getBoundingClientRect();
  const navOnTop = getComputedStyle(nav).position === 'sticky' && r.width >= window.innerWidth * 0.5;
  header.style.top = navOnTop ? `${Math.round(r.height)}px` : '';
}
window.addEventListener('resize', stackHeaderBelowNav);

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

  // 一道题真正显示出来，才算"见过"。以前在选题时就把 12 道全记上，
  // 能量耗尽 / 中途退出 / 刷新都会把没显示过的题烧掉，下次反而躲着它们。
  if (q && q.id && !session._marked?.has(q.id)) {
    (session._marked ||= new Set()).add(q.id);
    if (session.unitId === 'review') store.addReviewShown([q.id]);
    else if (typeof session.unitId === 'number') store.addPracticeShown([q.id]);
  }

  area.innerHTML = renderQuestion(q);
  updateProgress();
  attachQuestionListeners(q);
  stackHeaderBelowNav();   // 每题重量一次：网页字体晚到时导航条高度会变
  // 上一题看反馈时页面多半滚到了下面：新题从开头显示
  scrollToStart(area);
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

// 改写题（关键词转换）的原句原来藏在题目说明那行灰色小字的末尾，
// 学生一眼看到的只有「The painting (believe) ___ …」，以为是动词变形，
// 根本不知道要把原句里的 forged 也改写进去。所以把「原句：…」从说明里拆出来，
// 单独放一张醒目的卡片；说明里那句重复的「改写：…」题干也一并去掉。
const CJK = '\u3000-\u303f\u4e00-\u9fff\uff00-\uffef';
const SOURCE_RE = new RegExp(`原句[:：]\\s*([^${CJK}]+)`);
const REWRITE_RE = new RegExp(`改写句?(（[^）]*）)?[:：]\\s*[^${CJK}]+`);

function splitSource(instruction) {
  const m = instruction.match(SOURCE_RE);
  if (!m) return { text: instruction, source: '' };
  const source = m[1].trim().replace(/^['"\u2018\u201c]+|['"\u2019\u201d]+$/g, '').trim();
  if (!/[A-Za-z]{2,}/.test(source)) return { text: instruction, source: '' };
  const text = (instruction.slice(0, m.index) + instruction.slice(m.index + m[0].length))
    .replace(REWRITE_RE, (_, note) => note || '')
    .replace(/[：:]\s*$/, '')
    .trim();
  return { text, source };
}

function sourceCard(source) {
  return source
    ? `<div class="question-source"><span class="question-source__label">原句</span><span class="question-source__text">${source}</span></div>`
    : '';
}

// 改写题只有一个空、但要填好几个词时，告诉学生要填几个词——剑桥关键词转换题的通行做法。
// 不然像 is believed to have been forged 这种 6 个词的答案，谁也想不到要写这么长。
function wordCountHint(q, blankCount) {
  if (blankCount !== 1) return '';
  if (/[(（][^)）]*_+[^)）]*[)）]/.test(q.sentence || '')) return '';   // 括号里印了改写开头的，答案存的是整句，数不准
  const acceptable = q.acceptableAnswers?.length ? q.acceptableAnswers : [q.correctAnswer || q.answer].filter(Boolean);
  const counts = acceptable.map((a) => String(a).trim().split(/\s+/).length);
  if (!counts.length) return '';
  const lo = Math.min(...counts), hi = Math.max(...counts);
  if (hi < 2 || hi > 8) return '';
  return lo === hi ? `填 ${lo} 个词` : `填 ${lo}–${hi} 个词`;
}

function renderChoiceQuestion(q) {
  const sentence = q.sentence || '';
  const displaySentence = sentence.replace(/_+/g, '<span class="blank">______</span>');
  const { text: instruction, source } = splitSource(q.instruction || '选择正确答案');

  const optionsHtml = (q.options || []).map((opt, i) =>
    `<button class="choice-btn" data-type="choice" data-index="${i}">${opt}</button>`
  ).join('');

  // 选项是整句话时两列挤得一行只剩几个词，改成单列
  const long = (q.options || []).some((o) => optionWidth(o) > 38);
  return `
    <div class="question-instruction">${instruction}</div>
    ${sourceCard(source)}
    ${displaySentence ? `<div class="question-sentence">${displaySentence}</div>` : ''}
    <div class="choices-grid mt-md${long ? ' choices-grid--single' : ''}">${optionsHtml}</div>`;
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

// 找错题的改法是「删掉这个词」：(remove)、(delete)、（删除）、(no article) 这几种写法都算
const isRemoval = (c) => /^\s*[(（]\s*(remove|delete|删除|删掉|去掉|no article)[^)）]*[)）]\s*$/i.test(String(c));

function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function renderMatchQuestion(q) {
  const instruction = q.instruction || '将左右两列正确配对';
  const left = q.left || [];
  const original = q.right || [];
  const shuffled = shuffleArray(original);
  q.right = shuffled;

  const leftHtml = left.map((item, i) =>
    `<button class="match-item" data-type="match" data-side="left" data-index="${i}">${item}</button>`
  ).join('');

  const rightHtml = shuffled.map((item, i) =>
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

// 选项的显示宽度：中文一个字按两个英文字符算
const optionWidth = (o) => { const t = String(o).replace(/<[^>]*>/g, ''); return t.length + (t.match(/[\u3000-\u9fff\uff00-\uffef]/g) || []).length; };

const fillInput = (idx, hint) =>
  `<input type="text" class="fill-input" data-fill-idx="${idx}" placeholder="${hint}" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false">`;

function renderFillQuestion(q) {
  const { text: instruction, source } = splitSource(q.instruction || '填入正确的单词');
  const sentence = fillSentence(q);
  const parts = sentence.split(/_+/);
  const hint = q.hint || (source ? wordCountHint({ ...q, sentence }, parts.length - 1) : '');

  let sentenceHtml = '';
  let blankIdx = 0;
  for (let i = 0; i < parts.length; i++) {
    // 有些改写题把原句和改写句存在同一个 sentence 里，用换行隔开；HTML 会把换行吃成空格，两句挤成一句
    sentenceHtml += parts[i].replace(/\n/g, '<br>');
    if (i < parts.length - 1) {
      sentenceHtml += fillInput(blankIdx, hint);
      blankIdx++;
    }
  }
  // 题干里没有 ___（数据缺了句子）时也给一个输入框，不然没法作答、「检查答案」也点不动，孩子卡在这道题上
  if (blankIdx === 0) sentenceHtml += ` ${fillInput(0, hint)}`;

  return `
    <div class="question-instruction">${instruction}</div>
    ${sourceCard(source)}
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

  // matchPairs stores [leftIndex, rightIndex]; locate cards by index so that
  // duplicate right-side labels are still distinguishable.
  matchPairs.forEach((pair, i) => {
    const leftEl = container.querySelector(`.match-item[data-side="left"][data-index="${pair[0]}"]`);
    const rightEl = container.querySelector(`.match-item[data-side="right"][data-index="${pair[1]}"]`);
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

// Recompute every card's matched state from matchPairs, redraw the lines, and
// enable submit once every left item is connected.
function refreshMatchState(q) {
  const left = q.left || [];
  document.querySelectorAll('.match-item[data-type="match"]').forEach(el => {
    const side = el.dataset.side;
    const idx = Number(el.dataset.index);
    const mine = matchPairs
      .map((p, i) => ({ p, i }))
      .filter(({ p }) => (side === 'left' ? p[0] : p[1]) === idx);
    el.classList.toggle('match-item--matched', mine.length > 0);
    // 连好的两张卡片用和连线同一个颜色描边：小屏上两列只隔一道缝，光靠细线认不清谁连谁。
    // 右边一张卡被好几项连着（多对一）时没有单一颜色，保持默认的绿色。
    if (mine.length === 1) el.style.setProperty('--pair-color', PAIR_COLORS[mine[0].i % PAIR_COLORS.length]);
    else el.style.removeProperty('--pair-color');
  });
  drawMatchLines(q);
  const submitBtn = document.getElementById('matchSubmit');
  if (submitBtn) submitBtn.disabled = matchPairs.length < left.length;
}

function attachMatchListeners(q) {
  const left = q.left || [];
  const right = q.right || [];
  // When there are fewer right cards than left items, several left items share
  // a right card (e.g. 4 time markers → 2 tenses). In that mode a right card
  // stays a valid target after being connected, so it is not un-paired on click
  // — un-pair from the left side instead.
  const manyToOne = right.length < left.length;

  function clearSelection() {
    selectedMatch = null;
    document.querySelectorAll('.match-item--selected').forEach(el =>
      el.classList.remove('match-item--selected')
    );
  }

  document.querySelectorAll('.match-item[data-type="match"]').forEach(item => {
    item.addEventListener('click', () => {
      if (feedbackVisible) return;

      const side = item.dataset.side;
      const idx = Number(item.dataset.index);

      // Un-pair by clicking a connected card.
      if (side === 'left' && matchPairs.some(p => p[0] === idx)) {
        matchPairs = matchPairs.filter(p => p[0] !== idx);
        clearSelection();
        refreshMatchState(q);
        return;
      }
      if (side === 'right' && !manyToOne && matchPairs.some(p => p[1] === idx)) {
        matchPairs = matchPairs.filter(p => p[1] !== idx);
        clearSelection();
        refreshMatchState(q);
        return;
      }

      if (!selectedMatch) {
        clearSelection();
        selectedMatch = { side, index: idx };
        item.classList.add('match-item--selected');
      } else if (selectedMatch.side === side && selectedMatch.index === idx) {
        clearSelection();
      } else if (selectedMatch.side === side) {
        clearSelection();
        selectedMatch = { side, index: idx };
        item.classList.add('match-item--selected');
      } else {
        // Different side → form a pair. Each left maps to exactly one right,
        // so replace any existing pair for that left.
        const leftIdx = side === 'left' ? idx : selectedMatch.index;
        const rightIdx = side === 'right' ? idx : selectedMatch.index;
        matchPairs = matchPairs.filter(p => p[0] !== leftIdx);
        matchPairs.push([leftIdx, rightIdx]);
        clearSelection();
        refreshMatchState(q);
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

function collectFillAnswer() {
  const inputs = [...document.querySelectorAll('.fill-input')].sort(
    (a, b) => Number(a.dataset.fillIdx) - Number(b.dataset.fillIdx)
  );
  if (inputs.length === 1) return inputs[0].value;
  // 多个空用 ", " 连起来再逐空比对，所以先去掉孩子在某个空里自己打的逗号（比如照着句子写了 "However,"），
  // 不然空数对不上，每个空都会被判错
  return inputs.map(el => el.value.replace(/[,，]/g, ' ').replace(/\s+/g, ' ').trim()).join(', ');
}

function attachFillListeners(q) {
  const submitBtn = document.getElementById('fillSubmit');
  const inputs = document.querySelectorAll('.fill-input');

  // 一个空都没填就交：多半是手滑或者还没想好，不该白扣一颗心、记进错题本。
  // 按钮不能直接设成灰的——零冠词、省略关系代词这类「不填才对」的单空题，空着交就是正确作答。
  const acceptable = q.acceptableAnswers?.length ? q.acceptableAnswers : [q.correctAnswer || q.answer].filter(Boolean);
  const blankOk = inputs.length === 1 && acceptable.some(isZeroForm);
  function submitFill() {
    const empty = [...inputs].every((el) => !el.value.replace(/[,，\s]/g, ''));
    if (empty && !blankOk) {
      let tip = document.getElementById('fillEmptyTip');
      if (!tip) {
        tip = document.createElement('div');
        tip.id = 'fillEmptyTip';
        tip.className = 'fill-empty-tip';
        tip.setAttribute('role', 'alert');
        tip.textContent = '先在空里写上答案，再点「检查答案」';
        submitBtn.before(tip);
      }
      inputs[0].focus();
      return;
    }
    submitAnswer(q, collectFillAnswer());
  }

  if (submitBtn && inputs.length) {
    submitBtn.addEventListener('click', () => {
      if (feedbackVisible) return;
      submitFill();
    });
    inputs.forEach((input) => input.addEventListener('input', () => document.getElementById('fillEmptyTip')?.remove()));

    let composing = false;
    inputs.forEach((input, i) => {
      input.addEventListener('compositionstart', () => { composing = true; });
      input.addEventListener('compositionend', () => { composing = false; });
      input.addEventListener('keydown', (e) => {
        if (e.key !== 'Enter' || feedbackVisible) return;
        if (composing || e.isComposing || e.keyCode === 229) return;
        // 多空题：在前面的空按回车跳到下一个空，最后一个空按回车才交卷（多空题逐空判分后，
        // 没填完就交卷会白白丢一颗心）
        if (i < inputs.length - 1) { e.preventDefault(); inputs[i + 1].focus(); return; }
        submitFill();
      });
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
    store.addReviewCleared(question.id, questionTextKey(question));
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
    case 'match': {
      // 连错的那几对两张卡都标红，一眼看出错在哪儿。多对一时右边一张卡同时连着对的和错的，
      // 只标左边那张，右边那张不算错。
      const marks = result.userPairsOk || [];
      const rightOk = new Set(userAnswer.filter((_, i) => marks[i]).map((p) => p[1]));
      marks.forEach((ok, i) => {
        if (ok) return;
        const [l, r] = userAnswer[i] || [];
        document.querySelector(`.match-item[data-side="left"][data-index="${l}"]`)?.classList.add('match-item--wrong');
        if (!rightOk.has(r)) document.querySelector(`.match-item[data-side="right"][data-index="${r}"]`)?.classList.add('match-item--wrong');
      });
      break;
    }
    case 'fill': {
      // 多空题答错时逐空标对错，填错的空后面紧跟着写出正确答案，一眼看出是哪个空错了
      const inputs = [...document.querySelectorAll('.fill-input')];
      const per = perBlank(result, isCorrect, inputs.length);
      inputs.forEach((inp, i) => {
        inp.disabled = true;
        const ok = per ? per[i].ok : isCorrect;
        inp.classList.add(ok ? 'fill-input--correct' : 'fill-input--wrong');
        if (per && !ok) {
          const fix = document.createElement('span');
          fix.className = 'fill-fix';
          fix.textContent = displayForm(per[i].answers[0]);
          inp.after(fix);
        }
      });
      break;
    }
  }
}

// 多空填空题答错时的逐空结果；单空题、整句作答的题、或者答对了，返回 null
function perBlank(result, isCorrect, inputCount) {
  return !isCorrect && result.blanks && result.blanks.length === inputCount && inputCount > 1 ? result.blanks : null;
}

const escHtml = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// 「第 1 空 has been confirmed ✗ 你填的是 is confirmed」——多空题不再把第二个空的答案说成「也算对」
function blanksAnswerHtml(per) {
  const items = per.map((b, i) => {
    const alt = b.answers.length > 1 ? `<span class="fb-blank__alt">也可以写 ${b.answers.slice(1).map((f) => escHtml(displayForm(f))).join('、')}</span>` : '';
    const mine = b.user === null ? '' : b.user ? `你填的是 <s>${escHtml(b.user)}</s>` : '你空着没填';
    const mark = b.ok ? '<span class="fb-blank__mark">✓ 填对了</span>' : `<span class="fb-blank__mark">✗ ${mine}</span>`;
    return `<li class="fb-blank ${b.ok ? 'fb-blank--ok' : 'fb-blank--bad'}">
      <span class="fb-blank__no">第 ${i + 1} 空</span>
      <span class="fb-blank__ans">${escHtml(displayForm(b.answers[0]))}</span>${alt}${mark}
    </li>`;
  }).join('');
  return `<div class="feedback-banner__correct-answer">正确答案<ol class="fb-blanks">${items}</ol></div>`;
}

// 连线题答错：只列连错的那几对该怎么连，一对一行（连错的卡片已经标红，连对的不用再看一遍；
// 小屏上四对全列出来，横幅要占满大半个屏幕）
function pairsAnswerHtml(pairs) {
  const wrong = pairs.filter((p) => !p.ok);
  const items = (wrong.length ? wrong : pairs).map((p) => `<li class="fb-pair">${p.text}</li>`).join('');
  return `<div class="feedback-banner__correct-answer">${wrong.length ? '连错的这几对，应该这样连：' : '正确答案：'}<ol class="fb-blanks">${items}</ol></div>`;
}

const CORRECT_PHRASES = ['回答正确！', '答对了！', '没错！', '厉害！', '完全正确！', '漂亮！', 'Excellent!', 'Perfect!', 'Well done!'];
const WRONG_PHRASES = ['回答错误', '不太对哦', '再想想', '差一点点'];

// 反馈横幅 fixed 贴在屏幕底部，答错时连正确答案带解析能有半屏高。在页面底部垫出同样高的空白，
// 往下滚就能把被它挡住的题目（比如整块连线区）露出来，对照着看错在哪。
function reserveFeedbackSpace() {
  const area = document.getElementById('feedbackArea');
  const banner = area?.querySelector('.feedback-banner');
  if (area) area.style.height = banner ? `${banner.offsetHeight}px` : '';
}

function clearFeedback() {
  const area = document.getElementById('feedbackArea');
  if (!area) return;
  area.innerHTML = '';
  area.style.height = '';
}

function showFeedback(isCorrect, question, userAnswer, result) {
  const feedbackArea = document.getElementById('feedbackArea');
  if (!feedbackArea) return;

  const bannerClass = isCorrect ? 'feedback-banner--correct' : 'feedback-banner--wrong';
  const icon = isCorrect ? '✅' : '❌';
  const phrases = isCorrect ? CORRECT_PHRASES : WRONG_PHRASES;
  const title = phrases[Math.floor(Math.random() * phrases.length)];

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
    // 这个词本来就不该有（多了一个 will / to / the）：数据里记成 (remove)，显示成「删掉」，不让孩子看到一串英文
    correctionHtml = isRemoval(result.correction)
      ? `<div class="feedback-banner__correct-answer">正确写法：删掉 <s>${wrongWord}</s></div>`
      : `<div class="feedback-banner__correct-answer">正确写法：<s>${wrongWord}</s> → <strong>${result.correction}</strong></div>`;
  }

  // The plain "correct answer" line is only useful on wrong answers, and not for
  // error questions (whose answer is the wrong word — shown via correctionHtml).
  const altHtml = !isCorrect && result.altAnswers?.length
    ? `<div class="feedback-banner__alt">这样写也算对：${result.altAnswers.join('；')}</div>`
    : '';
  const per = question.type === 'fill' ? perBlank(result, isCorrect, document.querySelectorAll('.fill-input').length) : null;
  const correctAnswerHtml = per
    ? blanksAnswerHtml(per)
    : !isCorrect && question.type === 'match' && result.pairs?.length
      ? pairsAnswerHtml(result.pairs)
    : !isCorrect && result.correctAnswer && question.type !== 'error'
      ? `<div class="feedback-banner__correct-answer">正确答案：${result.correctAnswer}</div>${altHtml}`
      : '';

  // 答错直接给解析；答对也可以点「为什么？」看——猜对的人也该知道为什么对
  const explanationHtml = result.explanation
    ? (isCorrect
      ? `<button class="feedback-banner__why" id="whyBtn" type="button">为什么？</button><div class="feedback-banner__explanation" id="whyText" hidden>${result.explanation}</div>`
      : `<div class="feedback-banner__explanation">${result.explanation}</div>`)
    : '';

  // Correct → brief toast that auto-advances (no need to reach for a button).
  // Wrong → keep a manual 继续 button so there's time to read the explanation.
  const continueBtnHtml = isCorrect
    ? ''
    : `<button class="btn-primary" id="continueBtn" style="background:rgba(255,255,255,0.25);box-shadow:0 4px 0 rgba(0,0,0,0.15);">继续</button>`;

  // 正确答案和解析包在 __body 里：横幅有高度上限，太长时只有这一段在横幅里滚动，
  // 标题和「继续」一直看得见，不用先滚到底才找得到按钮
  feedbackArea.innerHTML = `
    <div class="feedback-banner ${bannerClass}">
      <div class="feedback-banner__header">
        <span class="feedback-banner__icon">${icon}</span>
        <span>${title}</span>
        ${scoreInfo}${comboInfo}
      </div>
      <div class="feedback-banner__body">
        ${correctionHtml}
        ${correctAnswerHtml}
        ${explanationHtml}
      </div>
      ${continueBtnHtml}
    </div>`;
  reserveFeedbackSpace();

  if (isCorrect) {
    clearAdvanceTimer();
    advanceTimer = setTimeout(advanceToNext, result.explanation ? AUTO_ADVANCE_MS + 1200 : AUTO_ADVANCE_MS);
    // 点开解析就停下自动跳题，等看完自己点「继续」
    document.getElementById('whyBtn')?.addEventListener('click', (e) => {
      clearAdvanceTimer();
      e.currentTarget.remove();
      const t = document.getElementById('whyText');
      if (t) t.hidden = false;
      const btn = document.createElement('button');
      btn.className = 'btn-primary';
      btn.id = 'continueBtn';
      btn.textContent = '继续';
      btn.style.cssText = 'background:rgba(255,255,255,0.25);box-shadow:0 4px 0 rgba(0,0,0,0.15);';
      btn.addEventListener('click', advanceToNext);
      feedbackArea.querySelector('.feedback-banner')?.append(btn);
      reserveFeedbackSpace();
    });
  } else {
    const continueBtn = document.getElementById('continueBtn');
    if (continueBtn) {
      continueBtn.addEventListener('click', advanceToNext);
    }
  }
}

// 结算页背后偷偷做的事：给这次做错的题、以及反复出现过的题，预先生成
// "同知识点、不同句子"的变体，存起来供下次选题使用。
// 放在这里是因为孩子正在看成绩，不赶时间——绝不能放在"开始练习"前面挡着。
function schedulePregenerateVariants(sess, results) {
  try {
    if (!sess || sess.unitId === 'demo') return;
    const wrongIds = new Set(
      (sess.answers || []).filter((a) => a && a.correct === false).map((a) => a.questionId)
    );
    const wrong = (sess.questions || []).filter((q) => wrongIds.has(q.id));
    // 做错的题最优先；这次没做错的也带上一两道，慢慢把题库铺开
    const others = (sess.questions || []).filter((q) => !wrongIds.has(q.id));
    const targets = [...wrong, ...others].slice(0, 3);
    if (!targets.length) return;

    const currId = store.state.activeCurriculumId;
    const cefr = store.state.curricula?.[currId]?.profile?.cefr || '';
    // 故意不 await：失败也不影响孩子看成绩
    pregenerateVariants(targets, { cefr, max: 3 }).catch(() => {});
  } catch (e) {
    console.warn('[variant] 预生成未启动:', e?.message);
  }
}

function showResults() {
  sessionEnded = true;
  const isReview = session.unitId === 'review';
  const isBoss = session.unitId === 'boss';
  const isDemo = session.unitId === 'demo';
  const results = engine.calculateResults(session);

  schedulePregenerateVariants(session, results);

  // Save results (demo/test sessions never touch level progress).
  let bossPassed = false;
  if (isDemo) {
    // no-op
  } else if (isBoss) {
    store.addScore(results.score);
    bossPassed = store.recordBossResult(results.accuracy);
    store.advanceLearningPlan({ isBoss: true, passed: bossPassed });
  } else if (isReview) {
    // Review still earns points, just no level/unit progression.
    store.addScore(results.score);
  } else {
    store.completeLevel(session.unitId, session.level, results.stars, results.score);
    store.advanceLearningPlan({ unitId: session.unitId, level: session.level });
  }
  if (!isDemo) {
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
    track('practice_done', { props: {
      u: session.unitId, l: session.level,
      c: session.answers.filter(a => a.correct).length, t: session.answers.length,
      cur: curriculum.isBuiltIn() ? curriculum.getActiveId() : 'custom',
    } });
  }

  const accuracyPct = Math.round(results.accuracy * 100);

  let titleText, subtitleText, starsHtml;
  if (isBoss) {
    starsHtml = `<div style="font-size:3.5rem;">${bossPassed ? '🎓' : '💪'}</div>`;
    titleText = bossPassed ? `${curriculum.examLabel()} 模拟通过！` : '再接再厉！';
    // 「还差一点」只在真的差得不多时说；0%、30% 也这么说就是哄人了
    subtitleText = bossPassed
      ? `综合正确率 ${accuracyPct}% · 已达标(≥70%)`
      : accuracyPct >= 60
        ? `综合正确率 ${accuracyPct}% · 距达标(≥70%)还差一点`
        : `综合正确率 ${accuracyPct}% · 达标需要 ≥70%`;
  } else {
    starsHtml = [1, 2, 3].map(i =>
      `<span class="result-star ${i <= results.stars ? 'result-star--earned' : ''}">⭐</span>`
    ).join('');
    titleText = results.stars === 3 ? '太棒了！完美通关！' :
      results.stars === 2 ? '做得不错！' :
      results.stars === 1 ? '通关成功！' : '这关还没过，再试一次吧';
    subtitleText = isReview ? '复习巩固' : `Unit ${session.unitId} - Lv.${session.level}`;
    // 0 星时把规则说清楚，别让孩子以为"已完成"却发现下一关锁着
    if (results.stars === 0 && !isReview) subtitleText += ' · 答错不超过 2 题就能通关';
  }

  // 出了做过的题时如实告诉孩子，而不是装作新题。选题现在先保证本关自己的题（见 engine.selectQuestions），
  // 本关的题做过也会再出，不再是「整个单元都做完一遍」才有旧题，所以不说「全部做过一遍」。
  const repeatHtml = session.repeatedCount > 0
    ? `<div class="result-note">这次有 ${session.repeatedCount} 道是之前做过的题，再练一遍记得更牢。</div>`
    : '';

  // 语法点原样是 mixed_tense_sequences 这样的英文 id，家长一眼看不懂。
  // 中文放大字，英文留成小字，方便对照课程大纲。
  const weakHtml = results.weakPoints.length > 0
    ? `<div class="result-weakness">
        <div class="result-weakness__title">⚠️ 需要加强</div>
        <div class="result-weakness__list">${results.weakPoints.map((s) => `
          <span class="result-weakness__item">${skillName(s)}${
            hasChineseName(s) ? `<span class="result-weakness__en">${skillEnglish(s)}</span>` : ''
          }</span>`).join('')}</div>
      </div>`
    : '';

  // Check for new achievement badges
  const newBadges = [];
  if (results.comboMax >= 10) {
    const b = { id: 'combo_king', name: '连击之王', icon: '⚡' };
    if (!store.getBadges().some(x => x.id === b.id)) { store.earnBadge(b); newBadges.push(b); }
  }
  if (results.stars === 3 && !isReview && !isBoss && !isDemo) {
    const b = { id: `perfect_${session.unitId}_${session.level}`, unitId: session.unitId, name: `Unit ${session.unitId} Lv.${session.level} 满星`, icon: '🌟' };
    if (!store.getBadges().some(x => x.id === b.id)) { store.earnBadge(b); newBadges.push(b); }
  }
  if (results.accuracy >= 1.0 && session.answers.length >= 5) {
    const b = { id: 'flawless', name: '完美无瑕', icon: '💎' };
    if (!store.getBadges().some(x => x.id === b.id)) { store.earnBadge(b); newBadges.push(b); }
  }
  const elapsed = (Date.now() - session.startTime) / 1000;
  if (elapsed <= 90 && session.answers.length >= 5 && results.stars >= 2) {
    const b = { id: 'speed_star', name: '速度之星', icon: '⏱️' };
    if (!store.getBadges().some(x => x.id === b.id)) { store.earnBadge(b); newBadges.push(b); }
  }
  const streak = store.state.player.currentStreak;
  if (streak >= 7) {
    const b = { id: 'streak_7', name: '七日坚持', icon: '🔥' };
    if (!store.getBadges().some(x => x.id === b.id)) { store.earnBadge(b); newBadges.push(b); }
  }
  if (streak >= 30) {
    const b = { id: 'streak_30', name: '月度达人', icon: '🏆' };
    if (!store.getBadges().some(x => x.id === b.id)) { store.earnBadge(b); newBadges.push(b); }
  }

  const badgeHtml = newBadges.length > 0
    ? `<div class="new-badges-banner">${newBadges.map(b => `<span class="new-badge-item">${b.icon} ${b.name}</span>`).join('')}</div>`
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
        ${badgeHtml}
        ${repeatHtml}
        ${weakHtml}
        <div class="result-actions">
          <button class="btn-primary" id="resultContinue">继续</button>
          <button class="btn-secondary" id="resultRetry">重试</button>
        </div>
      </div>`;
    scrollToStart(area);
  }

  // Hide feedback area
  clearFeedback();
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
  if (newBadges.length > 0) {
    confetti({ count: 60 });
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

const COMBO_TITLES = [
  { min: 15, label: '超神！', icon: '👑', cls: 'combo-display--legendary' },
  { min: 10, label: '无人能挡！', icon: '⚡', cls: 'combo-display--epic' },
  { min: 7,  label: '势不可挡！', icon: '💥', cls: 'combo-display--hot' },
  { min: 5,  label: '太强了！', icon: '🔥', cls: 'combo-display--fire' },
  { min: 3,  label: '连击！', icon: '⭐', cls: '' },
];

function showCombo(isCorrect) {
  const comboArea = document.getElementById('comboArea');
  if (!comboArea) return;

  if (isCorrect && session.combo >= 3) {
    const tier = COMBO_TITLES.find(t => session.combo >= t.min) || COMBO_TITLES[COMBO_TITLES.length - 1];
    comboArea.innerHTML = `
      <div class="combo-display ${tier.cls}">
        <span class="combo-display__fire">${tier.icon}</span>
        x${session.combo} ${tier.label}
      </div>`;
    if (session.combo >= 5) {
      document.body.classList.add('screen-shake');
      setTimeout(() => document.body.classList.remove('screen-shake'), 300);
    }
    setTimeout(() => {
      if (comboArea) comboArea.innerHTML = '';
    }, 1800);
  } else {
    comboArea.innerHTML = '';
  }
}
