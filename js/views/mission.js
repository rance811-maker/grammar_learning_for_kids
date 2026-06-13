import { store } from '../store.js';
import { curriculum } from '../curriculum.js';

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

  const alreadyDone = unitState?.missionCompleted;

  return `
    <div class="view view-mission">
      <div class="mission-task-card">
        <div class="mission-task-card__title">🎯 ${mission.title || '写作任务'}</div>
        <div class="mission-task-card__desc">${mission.description || ''}</div>
      </div>

      ${mission.scenario ? `
      <div class="card mb-lg">
        <div style="font-weight:700;margin-bottom:var(--space-sm);">📝 任务情境</div>
        <div style="font-size:var(--text-sm);color:var(--color-text-light);line-height:1.8;">${mission.scenario}</div>
      </div>` : ''}

      <div class="writing-area mb-lg" id="writingArea">
        ${scaffoldsHtml}
      </div>

      <div id="missionActions">
        <button class="btn-primary" id="missionSubmitBtn" ${alreadyDone ? 'disabled' : ''}>
          ${alreadyDone ? '已完成' : '提交作品 ✏️'}
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
  const grammarType = mission.grammarType || '';
  const inputs = document.querySelectorAll('.scaffold-input');
  const userTexts = [];
  let allOk = true;

  inputs.forEach((input, idx) => {
    const text = input.value.trim();
    userTexts.push(text);
    const scaffold = scaffolds[idx];
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

    const result = checkGrammar(text, grammarType);

    if (feedbackEl) {
      feedbackEl.style.display = 'block';
      if (result.ok) {
        feedbackEl.className = 'writing-line__feedback writing-line__feedback--correct';
        feedbackEl.textContent = '✅ 语法正确';
      } else {
        feedbackEl.className = 'writing-line__feedback writing-line__feedback--suggestion';
        feedbackEl.textContent = `⚠️ ${result.suggestion}`;
      }
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
      <div class="mt-md">
        <button class="btn-primary" id="missionSaveBtn">保存到作品集 📁</button>
        <button class="btn-secondary mt-sm" id="missionBackBtn">返回关卡</button>
      </div>`;

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

function checkGrammar(text, grammarType) {
  const lower = text.toLowerCase().trim();

  switch (grammarType) {
    case 'present_simple': {
      // Check for common third person -s errors
      const thirdPersonPatterns = /\b(he|she|it)\s+(go|do|have|play|like|want|need|make|take|come|run|eat|drink|write|read|work|live|study)\b/i;
      if (thirdPersonPatterns.test(lower)) {
        const match = lower.match(thirdPersonPatterns);
        return {
          ok: false,
          suggestion: `提示：第三人称单数 "${match[1]}" 后面的动词需要加 -s 或 -es，例如 "${match[2]}s"`,
        };
      }
      // Check for "don't" with third person instead of "doesn't"
      if (/\b(he|she|it)\s+don't\b/i.test(lower)) {
        return {
          ok: false,
          suggestion: '提示：第三人称单数否定应该用 "doesn\'t" 而不是 "don\'t"',
        };
      }
      return { ok: true, suggestion: '' };
    }

    case 'present_continuous': {
      // Check for missing "be" verb
      if (/\b(i|he|she|it|we|they|you)\s+\w+ing\b/i.test(lower) &&
          !/\b(am|is|are)\s+\w+ing\b/i.test(lower)) {
        return {
          ok: false,
          suggestion: '提示：现在进行时需要 "be 动词 + 动词-ing"，例如 "is playing"',
        };
      }
      // Check "I is" or "He are" type errors
      if (/\bi\s+(is|are)\b/i.test(lower)) {
        return {
          ok: false,
          suggestion: '提示：主语 "I" 应该搭配 "am"',
        };
      }
      if (/\b(he|she|it)\s+are\b/i.test(lower)) {
        return {
          ok: false,
          suggestion: '提示：第三人称单数应该搭配 "is"',
        };
      }
      return { ok: true, suggestion: '' };
    }

    case 'past_simple': {
      // Check for common irregular verb base form after "yesterday/last"
      const pastIndicators = /\b(yesterday|last\s+(week|month|year|night|monday|tuesday|wednesday|thursday|friday|saturday|sunday))\b/i;
      if (pastIndicators.test(lower)) {
        // Check if common verbs are in base form (not past tense)
        const commonErrors = /\b(go|eat|drink|see|come|run|take|make|write|give|buy|think|know|find|tell|say)\b/i;
        if (commonErrors.test(lower)) {
          const match = lower.match(commonErrors);
          const irregulars = {
            go: 'went', eat: 'ate', drink: 'drank', see: 'saw', come: 'came',
            run: 'ran', take: 'took', make: 'made', write: 'wrote', give: 'gave',
            buy: 'bought', think: 'thought', know: 'knew', find: 'found',
            tell: 'told', say: 'said',
          };
          const past = irregulars[match[1].toLowerCase()];
          if (past) {
            return {
              ok: false,
              suggestion: `提示：描述过去的事情时 "${match[1]}" 应变为 "${past}"`,
            };
          }
        }
      }
      // Check "did + past form" error
      if (/\bdid\s+\w+ed\b/i.test(lower)) {
        return {
          ok: false,
          suggestion: '提示："did" 后面应该用动词原形，不需要加 -ed',
        };
      }
      return { ok: true, suggestion: '' };
    }

    case 'future_simple': {
      if (/\b(i|he|she|it|we|they|you)\s+will\s+\w+s\b/i.test(lower)) {
        return {
          ok: false,
          suggestion: '提示："will" 后面应该用动词原形，不需要加 -s',
        };
      }
      if (/\b(i|he|she|it|we|they|you)\s+will\s+\w+ed\b/i.test(lower)) {
        return {
          ok: false,
          suggestion: '提示："will" 后面应该用动词原形，不需要加 -ed',
        };
      }
      return { ok: true, suggestion: '' };
    }

    case 'comparatives': {
      if (/\bmore\s+\w+er\b/i.test(lower)) {
        return {
          ok: false,
          suggestion: '提示：不需要同时使用 "more" 和 "-er"，二选一即可',
        };
      }
      if (/\bmost\s+\w+est\b/i.test(lower)) {
        return {
          ok: false,
          suggestion: '提示：不需要同时使用 "most" 和 "-est"，二选一即可',
        };
      }
      return { ok: true, suggestion: '' };
    }

    case 'articles': {
      if (/\ba\s+[aeiou]/i.test(lower)) {
        return {
          ok: false,
          suggestion: '提示：元音开头的单词前应该用 "an" 而不是 "a"',
        };
      }
      return { ok: true, suggestion: '' };
    }

    case 'prepositions': {
      if (/\bat\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday|january|february|march)/i.test(lower)) {
        return {
          ok: false,
          suggestion: '提示：星期和月份前应该用 "on" 或 "in"，不是 "at"',
        };
      }
      return { ok: true, suggestion: '' };
    }

    default:
      return { ok: true, suggestion: '' };
  }
}
