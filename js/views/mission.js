import { store } from '../store.js';
import { cloud } from '../cloud.js';
import { curriculum } from '../curriculum.js';
import { hasWritingCoach, reviewWriting, friendlyAiError, isQuotaError, quotaWords } from '../writingCoach.js';

let submitted = false;

// 学生写的一行最多多少个字符：和云函数 review.ts 的 MAX_TEXT 一致，超了云函数直接拒（too_long）
const MAX_LINE = 600;

const DRAFT_KEPT = '写的内容已经帮你留着了，下次打开这一页还在，直接提交就行。';

// 草稿：批改没做成（额度用完、登录过期、网络不通……）时，写好的内容留在本机，
// 下次打开这一页自动填回去，不用重写。批改成功后删掉。
// 按账号分开存：同一台设备换个账号登录，看不到、也交不了上一个人写的。
function draftKey(unitId) {
  const who = (store.account && store.account.userId) || 'local';
  return `gq-mission-draft:${who}:${curriculum.getActiveId()}:${unitId}`;
}
function loadDraft(key) {
  try {
    const d = JSON.parse(localStorage.getItem(key) || 'null');
    return Array.isArray(d) ? d : null;
  } catch {
    return null;
  }
}
function saveDraft(key, texts) {
  try { localStorage.setItem(key, JSON.stringify(texts)); } catch { /* 存不了就算了，不挡提交 */ }
}
function clearDraft(key) {
  try { localStorage.removeItem(key); } catch { /* ignore */ }
}

export function render(unitId) {
  unitId = Number(unitId);
  const unitData = curriculum.getUnit(unitId);
  const unitState = store.state.units[unitId];

  if (!unitData || !unitData.mission) {
    return `<div class="view view-mission"><p class="text-center text-muted mt-lg">任务不存在</p></div>`;
  }

  submitted = false;
  const mission = unitData.mission;
  const scaffolds = mission.scaffolds || [];
  const draft = loadDraft(draftKey(unitId));

  let scaffoldsHtml = '';
  scaffolds.forEach((scaffold, idx) => {
    const prefix = scaffold.prefix || '';
    const suffix = scaffold.suffix || '';
    const hint = scaffold.hint || '';

    scaffoldsHtml += `
      <div class="writing-line mission-scaffold" data-index="${idx}">
        ${prefix ? `<div class="writing-line__fixed">${prefix}</div>` : ''}
        <textarea
          class="writing-line__input scaffold-input"
          data-index="${idx}"
          placeholder="${hint}"
          rows="2"
        >${esc((draft && draft[idx]) || '')}</textarea>
        ${suffix ? `<div class="writing-line__fixed">${suffix}</div>` : ''}
        <div class="writing-line__feedback" id="feedback-${idx}" style="display:none;"></div>
      </div>`;
  });

  // 做过一次不等于以后不能再写。输入框既然还能打字，按钮就必须能按——
  // 之前这里把按钮永久 disabled 掉，页面看着可以写，写完却提交不了。
  const alreadyDone = unitState?.missionCompleted;
  const lastArticle = unitState?.missionContent || '';

  return `
    <div class="view view-mission">
      <div class="mission-task-card">
        <div class="mission-task-card__title">🎯 ${mission.title || '写作任务'}</div>
        <div class="mission-task-card__desc">${mission.description || ''}</div>
      </div>

      ${alreadyDone ? `
      <div class="card mb-lg" style="border-left:4px solid var(--color-success,#4caf50);">
        <div style="font-weight:700;margin-bottom:var(--space-sm);">✅ 这个任务你已经完成过</div>
        ${lastArticle ? `<div style="font-size:var(--text-sm);color:var(--color-text-light);line-height:1.8;">上次写的：${esc(lastArticle)}</div>` : ''}
        <div style="font-size:var(--text-sm);color:var(--color-text-light);margin-top:var(--space-sm);">可以再写一遍，看看这次能不能写得更好。</div>
      </div>` : ''}

      ${mission.scenario ? `
      <div class="card mb-lg">
        <div style="font-weight:700;margin-bottom:var(--space-sm);">📝 任务情境</div>
        <div style="font-size:var(--text-sm);color:var(--color-text-light);line-height:1.8;">${mission.scenario}</div>
      </div>` : ''}

      ${draft ? `
      <div class="mb-md" id="missionDraftNote" style="font-size:var(--text-sm);color:var(--color-text-light);">
        📝 上次写的还没批改，已经帮你填回来了，改一改再交就行。
      </div>` : ''}

      <div class="writing-area mb-lg" id="writingArea">
        ${scaffoldsHtml}
      </div>

      <div id="missionActions">
        <button class="btn-primary" id="missionSubmitBtn">
          ${alreadyDone ? '重新提交 ✏️' : '提交作品 ✏️'}
        </button>
      </div>

      <div id="missionResult"></div>
    </div>`;
}

export function mount(unitId) {
  unitId = Number(unitId);
  const unitData = curriculum.getUnit(unitId);
  const mission = unitData?.mission;
  if (!mission) return;

  const submitBtn = document.getElementById('missionSubmitBtn');
  if (submitBtn) {
    submitBtn.addEventListener('click', () => {
      if (submitted) return;
      handleSubmit(unitId, mission);
    });
  }
}

function handleSubmit(unitId, mission) {
  submitted = true;
  const scaffolds = mission.scaffolds || [];
  const inputs = document.querySelectorAll('.scaffold-input');
  const userTexts = [];
  let allOk = true;

  // 这里只做"填了没有"的检查。批改统一交给下面的 AI，一处出结果——
  // 之前这里还跑一套硬编码正则，几乎一律判"✅ 语法正确"，
  // 和下面 AI 给出的真实批改直接打架。
  inputs.forEach((input, idx) => {
    const text = input.value.trim();
    userTexts.push(text);
    const feedbackEl = document.getElementById(`feedback-${idx}`);

    const problem = !text ? '⚠️ 请填写内容'
      : text.length > MAX_LINE ? `⚠️ 这一行太长了，最多 ${MAX_LINE} 个字符，删短一点`
      : '';
    if (problem) {
      if (feedbackEl) {
        feedbackEl.style.display = 'block';
        feedbackEl.className = 'writing-line__feedback writing-line__feedback--suggestion';
        feedbackEl.textContent = problem;
      }
      allOk = false;
      submitted = false;
      return;
    }

    if (feedbackEl) {
      feedbackEl.style.display = 'none';
      feedbackEl.textContent = '';
    }
  });

  // 有一行没填好就整篇先不交：已经写好的行不能锁，孩子可能还要回去改
  if (!allOk) return;
  inputs.forEach((input) => { input.disabled = true; });

  // Build the completed article
  const articleParts = [];
  scaffolds.forEach((scaffold, idx) => {
    articleParts.push(joinLine(scaffold.prefix || '', userTexts[idx] || '', scaffold.suffix || ''));
  });

  const fullArticle = articleParts.join(' ');

  // 这一次提交。批改要十几秒，孩子可能先点了「保存」：批改出来后补进作品集那一条，
  // 不让这次批改（占一次免费额度）白跑。owner / currId 用来确认补的时候还是同一个账号、同一套课。
  const sub = {
    unitId,
    article: fullArticle,
    review: null,
    pending: false,
    saved: false,
    owner: (store.account && store.account.userId) || null,
    currId: curriculum.getActiveId(),
    draftKey: draftKey(unitId),
  };
  // 先存草稿，批改成功再删：额度用完、登录过期、断网时，写的东西都还在
  saveDraft(sub.draftKey, userTexts);

  // Show result
  const resultArea = document.getElementById('missionResult');
  if (resultArea) {
    resultArea.innerHTML = `
      <div class="mission-complete-card mt-lg">
        <div class="mission-complete-card__title">🎉 你的作品</div>
        <div class="mission-complete-card__article">${esc(fullArticle)}</div>
      </div>
      ${referenceHtml(scaffolds)}
      <div id="writingReview" class="mt-md"></div>
      <div class="mt-md">
        <button class="btn-primary" id="missionSaveBtn">保存到作品集 📁</button>
        <button class="btn-secondary mt-sm" id="missionBackBtn">返回关卡</button>
      </div>`;

    // 逐句 AI 批改（异步，不挡住"保存作品"）
    runWritingReview(unitId, mission, scaffolds, userTexts, sub);

    const saveBtn = document.getElementById('missionSaveBtn');
    sub.saveBtn = saveBtn;
    if (saveBtn) {
      saveBtn.addEventListener('click', () => {
        store.completeMission(unitId, fullArticle);
        store.saveToPortfolio({
          unitId,
          title: mission.title || `Unit ${unitId} 作品`,
          content: fullArticle,
          grammarType: mission.grammarType || '',
          ...(sub.review ? { review: sub.review } : {}),
        });
        sub.saved = true;
        // 保存后留在这一页：以前 0.8 秒后自动跳回关卡，批改还没出来就被带走，结果再也看不到。
        // 离开交给下面的「返回关卡」。
        saveBtn.disabled = true;
        updateSaveBtn(sub);
      });
    }

    const backBtn = document.getElementById('missionBackBtn');
    if (backBtn) {
      backBtn.addEventListener('click', () => {
        location.hash = `unit/${unitId}`;
      });
    }
  }

  // Hide original submit button
  const actionsArea = document.getElementById('missionActions');
  if (actionsArea) actionsArea.style.display = 'none';
}

// 拼一行：提示词 + 孩子写的 + 结尾。结尾多半以标点开头（"."、", something funny happened."），
// 标点前不能加空格；提示词末尾自带空格（'Every morning, I '），也不能再叠一个。
// 孩子自己在句末打了句号、结尾又只是一个句号时，不再补第二个。
function joinLine(prefix, text, suffix) {
  const head = [prefix.trim(), text].filter(Boolean).join(' ');
  const tail = suffix.trim();
  if (!tail) return head;
  if (/^[.!?]$/.test(tail) && /[.!?]$/.test(head)) return head;
  return /^[.,!?;:]/.test(tail) ? head + tail : `${head} ${tail}`;
}

// 每个写作框都配了参考句（scaffolds.example），原来从没显示过。写完之后给出来对照。
function referenceHtml(scaffolds) {
  const ex = scaffolds.map((s) => s.example).filter(Boolean);
  if (!ex.length) return '';
  return `
    <details class="card mt-md mission-ref">
      <summary style="font-weight:700;cursor:pointer;">📝 看看参考句（写完再对照）</summary>
      ${ex.map((t) => `<div class="mission-ref__line">${esc(t)}</div>`).join('')}
    </details>`;
}

// ---------------------------------------------------------------
// AI 写作批改
// ---------------------------------------------------------------

function esc(t) {
  return String(t == null ? '' : t).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

async function runWritingReview(unitId, mission, scaffolds, userTexts, sub) {
  const host = document.getElementById('writingReview');
  if (!host) return;

  if (!hasWritingCoach()) {
    // 网站开着云端时作文是免费批改的，走到这里只会是登录没了（续期被拒等），跟 key 无关。
    // 只有纯本机版（没配云端）才需要家长自己配 key。
    host.innerHTML = cloud.cloudEnabled() ? loginExpiredHtml('✍️ 这次没有批改', '登录已过期，重新登录后就能批改。') : `
      <div class="card" style="border-left:3px solid var(--color-warning,#C08A2E);">
        <div style="font-weight:700;margin-bottom:4px;">✍️ 这次没有批改</div>
        <div style="font-size:var(--text-sm);color:var(--color-text-light);line-height:1.7;">
          逐句批改要调用 AI，需要家长在「家长专区 → 学习设置 → AI 服务」里配一个 API key（配一次即可）。
          没配也不影响练习和闯关，只是这篇作文暂时没有批改。
          配好之后，每次写完都会逐句指出问题、给整体点评和提升建议。
        </div>
      </div>`;
    return;
  }

  host.innerHTML = `
    <div class="card">
      <div style="font-weight:700;">✍️ 正在批改…</div>
      <div style="font-size:var(--text-sm);color:var(--color-text-light);margin-top:4px;">
        看看有没有语法问题、哪里可以写得更好（约 10–20 秒，先别离开这一页）
      </div>
    </div>`;

  const lines = scaffolds.map((sc, i) => ({
    prefix: sc.prefix || '',
    text: userTexts[i] || '',
    suffix: sc.suffix || '',
  }));

  const unit = curriculum.getUnit(unitId);
  const currId = curriculum.getActiveId();
  // 内置课程（PET / 雅思）原来拿不到 CEFR，批改不知道学生的水平；雅思课按成人雅思口径批改
  const cefr = curriculum.getCefrOf(currId);
  const exam = /^preset-ielts/.test(currId) ? 'ielts' : '';

  sub.pending = true;
  try {
    const res = await reviewWriting(lines, {
      grammarType: mission.grammarType || '',
      unitTitle: unit?.title || '',
      cefr,
      exam,
    });
    sub.pending = false;
    sub.review = keepReview(res, lines);
    clearDraft(sub.draftKey);
    // 批改出来前已经点了保存：补进作品集那一条
    if (sub.saved) attachReview(sub);
    updateSaveBtn(sub);
    renderWritingReview(host, res, lines);
  } catch (e) {
    sub.pending = false;
    updateSaveBtn(sub);
    const quota = isQuotaError(e);
    if (e && e.code === 'login_required') {
      host.innerHTML = loginExpiredHtml('批改没跑成功', friendlyAiError(e));
      return;
    }
    // 太长 / 没内容：要改的是作文本身，原样重试只会再失败——把输入框和提交按钮还回去
    const editable = e && (e.code === 'too_long' || e.code === 'empty');
    if (editable && host.isConnected) unlockEditing();
    host.innerHTML = `
      <div class="card" style="border-left:3px solid var(--color-danger,#C1553A);">
        <div style="font-weight:700;margin-bottom:4px;">${quota ? `${quotaWords(e.data && e.data.period).this}的免费批改用完了` : '批改没跑成功'}</div>
        <div style="font-size:var(--text-sm);color:var(--color-text-light);">
          ${esc(friendlyAiError(e))}
        </div>
        ${quota ? `<div style="font-size:var(--text-sm);color:var(--color-text-light);margin-top:4px;">${DRAFT_KEPT}</div>` : ''}
        ${quota || editable ? '' : '<button class="btn-secondary mt-sm" id="reviewRetryBtn">重试批改</button>'}
      </div>`;
    host.querySelector('#reviewRetryBtn')?.addEventListener('click', () => {
      runWritingReview(unitId, mission, scaffolds, userTexts, sub);
    });
  }
}

// 登录没了：重试永远不会成功，给「重新登录」。写的内容已经存成草稿，登录回来还在。
function loginExpiredHtml(title, text) {
  return `
    <div class="card" style="border-left:3px solid var(--color-warning,#C08A2E);">
      <div style="font-weight:700;margin-bottom:4px;">${esc(title)}</div>
      <div style="font-size:var(--text-sm);color:var(--color-text-light);line-height:1.7;">
        ${esc(text)}${DRAFT_KEPT}
      </div>
      <a class="btn btn--primary mt-sm" href="#account">重新登录</a>
    </div>`;
}

function unlockEditing() {
  document.querySelectorAll('.scaffold-input').forEach((i) => { i.disabled = false; });
  const actions = document.getElementById('missionActions');
  if (actions) actions.style.display = '';
  submitted = false;
}

// 存进作品集的批改：去掉「还剩几篇」这类只在当下有用的字段，每行带上孩子写的原句
function keepReview(res, lines) {
  return {
    score: res.score,
    overall: res.overall,
    improve: res.improve,
    lines: res.lines.map((l, i) => ({
      text: lines[i]?.text || '', ok: l.ok, issue: l.issue, fixed: l.fixed, upgrade: l.upgrade,
    })),
  };
}

// 只往当初那个账号、那套课程的作品集里补：等批改的这十几秒里，可能已经退出、换了账号或课程
function attachReview(sub) {
  if (((store.account && store.account.userId) || null) !== sub.owner) return;
  if (curriculum.getActiveId() !== sub.currId) return;
  store.setPortfolioReview(sub.unitId, sub.article, sub.review);
}

function updateSaveBtn(sub) {
  if (sub.saved && sub.saveBtn) sub.saveBtn.textContent = sub.pending ? '已保存 ✅ 批改出来后也会存进去' : '已保存 ✅';
}

// 「7 分写法」：句子写对了但还是 6 分的平铺直叙时，给一句更紧凑、更有变化的写法
function upgradeHtml(l) {
  return l.upgrade
    ? `<div class="mission-upgrade"><span class="mission-upgrade__tag">⬆ 7 分写法</span>${esc(l.upgrade)}</div>`
    : '';
}

function renderWritingReview(host, res, lines) {
  host.innerHTML = reviewCardHtml(res, lines, quotaNote(res));
}

// 批改卡片。作品集里打开存下来的批改也用它（那里没有 footer：「还剩几篇」只在当下有用）
export function reviewCardHtml(res, lines, footer = '') {
  const score = Number(res.score) || 0;
  const stars = '★'.repeat(Math.max(0, Math.min(5, score))) +
                '☆'.repeat(Math.max(0, 5 - Math.min(5, score)));
  const resLines = Array.isArray(res.lines) ? res.lines : [];
  const improve = Array.isArray(res.improve) ? res.improve : [];
  const wrong = resLines.filter((l) => !l.ok).length;

  const lineHtml = resLines.map((l, i) => {
    const written = lines[i]?.text || '';
    if (l.ok) {
      return `
        <div style="padding:8px 0;border-top:1px solid var(--color-border,#eee);">
          <div style="font-size:var(--text-sm);"><span style="color:var(--color-success,#2E6F52);">✅</span> ${esc(written)}</div>
          ${upgradeHtml(l)}
        </div>`;
    }
    return `
      <div style="padding:8px 0;border-top:1px solid var(--color-border,#eee);">
        <div style="font-size:var(--text-sm);"><span style="color:var(--color-danger,#C1553A);">✍️</span>
          <span style="text-decoration:line-through;color:var(--color-text-light);">${esc(written)}</span>
        </div>
        ${l.fixed ? `<div style="font-size:var(--text-sm);font-weight:600;margin-top:3px;">→ ${esc(l.fixed)}</div>` : ''}
        ${l.issue ? `<div style="font-size:var(--text-xs,0.8rem);color:var(--color-text-light);margin-top:3px;line-height:1.6;">${esc(l.issue)}</div>` : ''}
        ${upgradeHtml(l)}
      </div>`;
  }).join('');

  const improveHtml = improve.length
    ? `<div style="margin-top:10px;padding:10px 12px;border-radius:8px;background:var(--color-bg-soft,#FBF3E8);">
         <div style="font-weight:700;font-size:var(--text-sm);margin-bottom:4px;">💡 下次可以更好</div>
         ${improve.map((t) => `<div style="font-size:var(--text-sm);line-height:1.7;">· ${esc(t)}</div>`).join('')}
       </div>`
    : '';

  return `
    <div class="card">
      <div style="display:flex;align-items:baseline;gap:10px;flex-wrap:wrap;">
        <div style="font-weight:700;">✍️ 批改结果</div>
        <div style="color:var(--color-warning,#C08A2E);letter-spacing:2px;">${stars}</div>
        <div style="font-size:var(--text-xs,0.8rem);color:var(--color-text-light);margin-left:auto;">
          ${wrong === 0 ? '全部正确' : `${wrong} 处需要改`}
        </div>
      </div>
      ${res.overall ? `<div style="font-size:var(--text-sm);color:var(--color-text-light);line-height:1.7;margin-top:6px;">${esc(res.overall)}</div>` : ''}
      <div style="margin-top:8px;">${lineHtml}</div>
      ${improveHtml}
      ${footer}
    </div>`;
}

// 用网站的免费批改时，告诉孩子本月还剩几篇（家长自己配了 key 时没有这个限制，不显示）
function quotaNote(res) {
  if (typeof res.remaining !== 'number') return '';
  const p = quotaWords(res.period);
  const n = res.limit || p.defaultLimit;
  const text = res.remaining > 0
    ? `${p.this}还可以免费批改 ${res.remaining} 篇（${p.every} ${n} 篇）`
    : `${p.this}的 ${n} 篇免费批改已用完，${p.reset}`;
  return `<div style="font-size:var(--text-xs,0.8rem);color:var(--color-text-light);margin-top:10px;text-align:right;">${text}</div>`;
}
