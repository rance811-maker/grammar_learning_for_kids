import { cloud } from '../cloud.js';

let pack = null;
let editIdx = -1;
let formType = '';
let saving = false;
let container = null;

export async function init(el, packId) {
  container = el;
  editIdx = -1;
  formType = '';
  saving = false;

  if (packId) {
    container.innerHTML = '<p>加载中…</p>';
    pack = await cloud.loadCoursePack(packId);
    if (!pack) { container.innerHTML = '<p>课程包未找到</p>'; return; }
  } else {
    pack = { id: null, title: '', description: '', questions: [] };
  }
  rerender();
}

function rerender() {
  if (!container) return;
  container.innerHTML = renderEditor();
  mountEditor();
}

function renderEditor() {
  const qList = pack.questions.map((q, i) => {
    const typeLabel = q.type === 'choice' ? '选择题' : q.type === 'fill' ? '填空题' : q.type;
    const preview = q.sentence || q.instruction || '';
    return `<div class="ce-q-item">
      <span class="ce-q-badge">${typeLabel}</span>
      <span class="ce-q-text">${esc(preview.slice(0, 60))}</span>
      <span class="ce-q-actions">
        <button class="btn btn--tiny" data-edit="${i}">编辑</button>
        <button class="btn btn--tiny btn--danger-text" data-del="${i}">删除</button>
      </span>
    </div>`;
  }).join('');

  const form = formType ? renderQuestionForm() : '';

  return `<div class="parent-card parent-card--wide">
    <div class="parent-header">
      <h2>${pack.id ? '编辑课程包' : '创建课程包'}</h2>
      <button class="btn btn--small btn--outline" id="ceBack">← 返回</button>
    </div>
    <div class="ce-meta">
      <div class="parent-field">
        <label>课程名称</label>
        <input type="text" id="ceTitle" value="${esc(pack.title)}" placeholder="例如：一般现在时选择练习">
      </div>
      <div class="parent-field">
        <label>课程描述（选填）</label>
        <input type="text" id="ceDesc" value="${esc(pack.description)}" placeholder="简单说明这个课程包的内容">
      </div>
    </div>
    <div class="ce-section">
      <h3>题目列表${pack.questions.length ? ' (' + pack.questions.length + '题)' : ''}</h3>
      ${qList || '<p class="ce-empty">还没有题目，点下方按钮添加</p>'}
    </div>
    ${form}
    ${!formType ? `<div class="ce-add-btns">
      <button class="btn btn--outline" id="ceAddChoice">+ 选择题</button>
      <button class="btn btn--outline" id="ceAddFill">+ 填空题</button>
    </div>` : ''}
    <div class="ce-save">
      <div class="parent-msg" id="ceMsg"></div>
      <button class="btn btn--primary btn--block" id="ceSave">${saving ? '保存中…' : '保存课程包'}</button>
    </div>
  </div>`;
}

function renderQuestionForm() {
  const q = editIdx >= 0 ? pack.questions[editIdx] : null;
  if (formType === 'choice') return renderChoiceForm(q);
  if (formType === 'fill') return renderFillForm(q);
  return '';
}

function renderChoiceForm(q) {
  return `<div class="ce-form">
    <h3>${q ? '编辑选择题' : '添加选择题'}</h3>
    <div class="parent-field">
      <label>题目指令</label>
      <input type="text" id="qfInstruction" value="${esc(q?.instruction || '选择正确的答案')}" placeholder="选择正确的答案">
    </div>
    <div class="parent-field">
      <label>题目句子（用 ___ 表示空格）</label>
      <input type="text" id="qfSentence" value="${esc(q?.sentence || '')}" placeholder="She ___ to school every day.">
    </div>
    <div class="parent-field">
      <label>选项（2-4个，勾选正确答案）</label>
      ${[0,1,2,3].map(i => {
        const val = q?.options?.[i] || '';
        const checked = q ? q.correctIndex === i : i === 0;
        return `<div class="ce-option-row">
          <input type="radio" name="qfCorrect" value="${i}" ${checked ? 'checked' : ''}>
          <input type="text" class="qf-opt" data-opt="${i}" value="${esc(val)}" placeholder="选项${String.fromCharCode(65+i)}">
        </div>`;
      }).join('')}
    </div>
    <div class="parent-field">
      <label>解释（答对/答错后显示）</label>
      <input type="text" id="qfExplanation" value="${esc(q?.explanation || '')}" placeholder="为什么这个答案是对的">
    </div>
    <div class="ce-form-btns">
      <button class="btn btn--primary" id="qfSave">确认</button>
      <button class="btn btn--outline" id="qfCancel">取消</button>
    </div>
  </div>`;
}

function renderFillForm(q) {
  return `<div class="ce-form">
    <h3>${q ? '编辑填空题' : '添加填空题'}</h3>
    <div class="parent-field">
      <label>题目指令</label>
      <input type="text" id="qfInstruction" value="${esc(q?.instruction || '用括号中单词的正确形式填空')}" placeholder="用括号中单词的正确形式填空">
    </div>
    <div class="parent-field">
      <label>题目句子（用 ___ 表示空格）</label>
      <input type="text" id="qfSentence" value="${esc(q?.sentence || '')}" placeholder="She (watch) ___ a cartoon now.">
    </div>
    <div class="parent-field">
      <label>可接受的答案（逗号分隔多个，如：is watching, is looking）</label>
      <input type="text" id="qfAnswers" value="${esc((q?.acceptableAnswers || []).join(', '))}" placeholder="is watching">
    </div>
    <div class="parent-field">
      <label>解释</label>
      <input type="text" id="qfExplanation" value="${esc(q?.explanation || '')}" placeholder="为什么这个答案是对的">
    </div>
    <div class="ce-form-btns">
      <button class="btn btn--primary" id="qfSave">确认</button>
      <button class="btn btn--outline" id="qfCancel">取消</button>
    </div>
  </div>`;
}

function mountEditor() {
  const $ = id => document.getElementById(id);

  $('ceBack')?.addEventListener('click', () => { location.hash = 'parent'; });

  $('ceAddChoice')?.addEventListener('click', () => { editIdx = -1; formType = 'choice'; rerender(); });
  $('ceAddFill')?.addEventListener('click', () => { editIdx = -1; formType = 'fill'; rerender(); });

  container.querySelectorAll('[data-edit]').forEach(btn => {
    btn.addEventListener('click', () => {
      const i = Number(btn.dataset.edit);
      editIdx = i;
      formType = pack.questions[i].type;
      rerender();
    });
  });

  container.querySelectorAll('[data-del]').forEach(btn => {
    btn.addEventListener('click', () => {
      const i = Number(btn.dataset.del);
      if (confirm(`确定删除第 ${i+1} 题？`)) {
        pack.questions.splice(i, 1);
        if (editIdx === i) { editIdx = -1; formType = ''; }
        rerender();
      }
    });
  });

  $('qfSave')?.addEventListener('click', saveQuestion);
  $('qfCancel')?.addEventListener('click', () => { editIdx = -1; formType = ''; rerender(); });

  $('ceSave')?.addEventListener('click', savePack);
}

function saveQuestion() {
  const $ = id => document.getElementById(id);
  const instruction = $('qfInstruction')?.value.trim();
  const sentence = $('qfSentence')?.value.trim();
  const explanation = $('qfExplanation')?.value.trim();

  if (!sentence) { alert('请填写题目句子'); return; }

  let q;
  if (formType === 'choice') {
    const opts = [];
    document.querySelectorAll('.qf-opt').forEach(inp => {
      if (inp.value.trim()) opts.push(inp.value.trim());
    });
    if (opts.length < 2) { alert('至少填写2个选项'); return; }
    const correctIndex = Number(document.querySelector('input[name="qfCorrect"]:checked')?.value || 0);
    if (correctIndex >= opts.length) { alert('正确答案超出选项范围'); return; }
    q = { type: 'choice', instruction, sentence, options: opts, correctIndex, explanation, subSkill: 'custom' };
  } else if (formType === 'fill') {
    const raw = $('qfAnswers')?.value || '';
    const answers = raw.split(',').map(s => s.trim()).filter(Boolean);
    if (!answers.length) { alert('请填写至少一个可接受的答案'); return; }
    q = { type: 'fill', instruction, sentence, acceptableAnswers: answers, explanation, subSkill: 'custom' };
  }

  if (editIdx >= 0) {
    pack.questions[editIdx] = q;
  } else {
    pack.questions.push(q);
  }
  editIdx = -1;
  formType = '';
  rerender();
}

async function savePack() {
  const title = document.getElementById('ceTitle')?.value.trim();
  const desc = document.getElementById('ceDesc')?.value.trim() || '';
  const msg = document.getElementById('ceMsg');

  if (!title) { msg.textContent = '请填写课程名称'; msg.className = 'parent-msg parent-msg--error'; return; }
  if (!pack.questions.length) { msg.textContent = '请至少添加一道题目'; msg.className = 'parent-msg parent-msg--error'; return; }

  pack.title = title;
  pack.description = desc;

  const btn = document.getElementById('ceSave');
  btn.disabled = true;
  btn.textContent = '保存中…';
  msg.textContent = '';

  try {
    if (pack.id) {
      await cloud.updateCoursePack(pack.id, pack);
    } else {
      const created = await cloud.createCoursePack(pack);
      pack.id = created.id;
    }
    msg.textContent = '已保存';
    msg.className = 'parent-msg parent-msg--success';
    setTimeout(() => { location.hash = 'parent'; }, 600);
  } catch (e) {
    msg.textContent = '保存失败：' + e.message;
    msg.className = 'parent-msg parent-msg--error';
    btn.disabled = false;
    btn.textContent = '保存课程包';
  }
}

function esc(s) {
  return String(s || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
