import { store } from '../store.js';
import { curriculum } from '../curriculum.js';
import { hasWritingCoach, reviewWriting, friendlyAiError } from '../writingCoach.js';

let submitted = false;

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
        ></textarea>
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

    if (!text) {
      if (feedbackEl) {
        feedbackEl.style.display = 'block';
        feedbackEl.className = 'writing-line__feedback writing-line__feedback--suggestion';
        feedbackEl.textContent = '⚠️ 请填写内容';
      }
      allOk = false;
      submitted = false;
      return;
    }

    if (feedbackEl) {
      feedbackEl.style.display = 'none';
      feedbackEl.textContent = '';
    }
    input.disabled = true;
  });

  if (!allOk) return;

  // Build the completed article
  const articleParts = [];
  scaffolds.forEach((scaffold, idx) => {
    const prefix = scaffold.prefix || '';
    const text = userTexts[idx] || '';
    const suffix = scaffold.suffix || '';
    articleParts.push(`${prefix} ${text} ${suffix}`.trim());
  });

  const fullArticle = articleParts.join(' ');

  // Show result
  const resultArea = document.getElementById('missionResult');
  if (resultArea) {
    resultArea.innerHTML = `
      <div class="mission-complete-card mt-lg">
        <div class="mission-complete-card__title">🎉 你的作品</div>
        <div class="mission-complete-card__article">${fullArticle}</div>
      </div>
      <div id="writingReview" class="mt-md"></div>
      <div class="mt-md">
        <button class="btn-primary" id="missionSaveBtn">保存到作品集 📁</button>
        <button class="btn-secondary mt-sm" id="missionBackBtn">返回关卡</button>
      </div>`;

    // 逐句 AI 批改（异步，不挡住"保存作品"）
    runWritingReview(unitId, mission, scaffolds, userTexts);

    const saveBtn = document.getElementById('missionSaveBtn');
    if (saveBtn) {
      saveBtn.addEventListener('click', () => {
        store.completeMission(unitId, fullArticle);
        store.saveToPortfolio({
          unitId,
          title: mission.title || `Unit ${unitId} 作品`,
          content: fullArticle,
          grammarType: mission.grammarType || '',
        });

        saveBtn.disabled = true;
        saveBtn.textContent = '已保存 ✅';

        setTimeout(() => {
          location.hash = `unit/${unitId}`;
        }, 800);
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

// ---------------------------------------------------------------
// AI 写作批改
// ---------------------------------------------------------------

function esc(t) {
  return String(t == null ? '' : t).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

async function runWritingReview(unitId, mission, scaffolds, userTexts) {
  const host = document.getElementById('writingReview');
  if (!host) return;

  if (!hasWritingCoach()) {
    host.innerHTML = `
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
        看看有没有语法问题、哪里可以写得更好（约 10–20 秒）
      </div>
    </div>`;

  const lines = scaffolds.map((sc, i) => ({
    prefix: sc.prefix || '',
    text: userTexts[i] || '',
    suffix: sc.suffix || '',
  }));

  const unit = curriculum.getUnit(unitId);
  const currId = store.state.activeCurriculumId;
  const cefr = store.state.curricula?.[currId]?.profile?.cefr || '';

  try {
    const res = await reviewWriting(lines, {
      grammarType: mission.grammarType || '',
      unitTitle: unit?.title || '',
      cefr,
    });
    renderWritingReview(host, res, lines);
  } catch (e) {
    host.innerHTML = `
      <div class="card" style="border-left:3px solid var(--color-danger,#C1553A);">
        <div style="font-weight:700;margin-bottom:4px;">批改没跑成功</div>
        <div style="font-size:var(--text-sm);color:var(--color-text-light);">
          ${esc(friendlyAiError(e))}
        </div>
        <button class="btn-secondary mt-sm" id="reviewRetryBtn">重试批改</button>
      </div>`;
    document.getElementById('reviewRetryBtn')?.addEventListener('click', () => {
      runWritingReview(unitId, mission, scaffolds, userTexts);
    });
  }
}

function renderWritingReview(host, res, lines) {
  const stars = '★'.repeat(Math.max(0, Math.min(5, res.score))) +
                '☆'.repeat(Math.max(0, 5 - Math.min(5, res.score)));
  const wrong = res.lines.filter((l) => !l.ok).length;

  const lineHtml = res.lines.map((l, i) => {
    const written = lines[i]?.text || '';
    if (l.ok) {
      return `
        <div style="padding:8px 0;border-top:1px solid var(--color-border,#eee);">
          <div style="font-size:var(--text-sm);"><span style="color:var(--color-success,#2E6F52);">✅</span> ${esc(written)}</div>
        </div>`;
    }
    return `
      <div style="padding:8px 0;border-top:1px solid var(--color-border,#eee);">
        <div style="font-size:var(--text-sm);"><span style="color:var(--color-danger,#C1553A);">✍️</span>
          <span style="text-decoration:line-through;color:var(--color-text-light);">${esc(written)}</span>
        </div>
        ${l.fixed ? `<div style="font-size:var(--text-sm);font-weight:600;margin-top:3px;">→ ${esc(l.fixed)}</div>` : ''}
        ${l.issue ? `<div style="font-size:var(--text-xs,0.8rem);color:var(--color-text-light);margin-top:3px;line-height:1.6;">${esc(l.issue)}</div>` : ''}
      </div>`;
  }).join('');

  const improveHtml = res.improve.length
    ? `<div style="margin-top:10px;padding:10px 12px;border-radius:8px;background:var(--color-bg-soft,#FBF3E8);">
         <div style="font-weight:700;font-size:var(--text-sm);margin-bottom:4px;">💡 下次可以更好</div>
         ${res.improve.map((t) => `<div style="font-size:var(--text-sm);line-height:1.7;">· ${esc(t)}</div>`).join('')}
       </div>`
    : '';

  host.innerHTML = `
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
    </div>`;
}
