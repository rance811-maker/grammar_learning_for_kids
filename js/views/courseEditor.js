import { cloud } from '../cloud.js';

let pack = null;
let editIdx = -1;
let formType = '';
let saving = false;
let container = null;
let uploadedFiles = [];   // { name, type:'pdf'|'image', text, dataUrl }
let materialText = '';
let extracting = false;

export async function init(el, packId) {
  container = el;
  editIdx = -1;
  formType = '';
  saving = false;
  uploadedFiles = [];
  materialText = '';
  extracting = false;

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

// --- PDF text extraction via pdf.js (loaded on demand from CDN) ---

let pdfjsLoaded = null;
async function loadPdfJs() {
  if (pdfjsLoaded) return pdfjsLoaded;
  pdfjsLoaded = import('https://cdn.jsdelivr.net/npm/pdfjs-dist@4.4.168/build/pdf.min.mjs').then(lib => {
    lib.GlobalWorkerOptions.workerSrc =
      'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.4.168/build/pdf.worker.min.mjs';
    return lib;
  });
  return pdfjsLoaded;
}

async function extractPdfText(file) {
  const pdfjsLib = await loadPdfJs();
  const buf = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
  const pages = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const tc = await page.getTextContent();
    pages.push(tc.items.map(it => it.str).join(' '));
  }
  return pages.join('\n\n');
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

async function handleFiles(files) {
  extracting = true;
  rerender();

  for (const file of files) {
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    const isImage = file.type.startsWith('image/');

    if (isPdf) {
      try {
        const text = await extractPdfText(file);
        uploadedFiles.push({ name: file.name, type: 'pdf', text, dataUrl: null });
        materialText += (materialText ? '\n\n' : '') + text;
      } catch (e) {
        uploadedFiles.push({ name: file.name, type: 'pdf', text: '', dataUrl: null });
        alert(`PDF 提取失败（${file.name}）：${e.message}`);
      }
    } else if (isImage) {
      const dataUrl = await fileToDataUrl(file);
      uploadedFiles.push({ name: file.name, type: 'image', text: '', dataUrl });
    }
  }

  extracting = false;
  rerender();
}

// --- Render ---

function renderEditor() {
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
    ${renderUploadSection()}
    ${renderQuestionList()}
    ${formType ? renderQuestionForm() : ''}
    ${!formType ? renderAddButtons() : ''}
    <div class="ce-save">
      <div class="parent-msg" id="ceMsg"></div>
      <button class="btn btn--primary btn--block" id="ceSave">${saving ? '保存中…' : '保存课程包'}</button>
    </div>
  </div>`;
}

function renderUploadSection() {
  const previews = uploadedFiles.map((f, i) => {
    if (f.type === 'image') {
      return `<div class="ce-file-preview">
        <img src="${f.dataUrl}" alt="${esc(f.name)}">
        <span class="ce-file-name">${esc(f.name)}</span>
        <button class="ce-file-remove" data-remove-file="${i}">✕</button>
      </div>`;
    }
    return `<div class="ce-file-preview ce-file-preview--pdf">
      <span class="ce-file-icon">📄</span>
      <span class="ce-file-name">${esc(f.name)}</span>
      <button class="ce-file-remove" data-remove-file="${i}">✕</button>
    </div>`;
  }).join('');

  return `<div class="ce-upload-section">
    <h3>📎 上传学习素材</h3>
    <p class="ce-upload-hint">上传课本照片、练习册或 PDF，系统提取内容后可生成练习题</p>
    <div class="ce-upload-zone" id="dropZone">
      <input type="file" id="fileInput" accept=".pdf,.jpg,.jpeg,.png,.webp,.heic,image/*" multiple hidden>
      <input type="file" id="cameraInput" accept="image/*" capture="environment" hidden>
      <button class="btn btn--outline" id="uploadBtn">📁 选择文件</button>
      <button class="btn btn--outline" id="cameraBtn">📷 拍照上传</button>
      <span class="ce-upload-formats">PDF / JPG / PNG / WebP / HEIC</span>
    </div>
    ${extracting ? '<p class="ce-extracting">⏳ 正在提取文字内容…</p>' : ''}
    ${previews ? `<div class="ce-file-list">${previews}</div>` : ''}
    <div class="parent-field" style="margin-top:var(--space-md)">
      <label>素材文字内容（自动提取或手动粘贴）</label>
      <textarea id="materialText" rows="5" placeholder="上传 PDF 后自动提取文字；也可以直接粘贴课文或题目内容…">${esc(materialText)}</textarea>
    </div>
    <button class="btn btn--secondary btn--block" id="generateBtn" disabled>
      🤖 AI 从素材生成题目（配置 AI 服务后可用）
    </button>
  </div>`;
}

function renderQuestionList() {
  const qList = pack.questions.map((q, i) => {
    const typeLabel = { choice: '选择题', fill: '填空题', match: '配对题', reorder: '排序题', error: '纠错题', scenario: '情景题' }[q.type] || q.type;
    const preview = q.sentence || q.instruction || '';
    return `<div class="ce-q-item">
      <span class="ce-q-num">${i + 1}</span>
      <span class="ce-q-badge">${typeLabel}</span>
      <span class="ce-q-text">${esc(preview.slice(0, 60))}</span>
      <span class="ce-q-actions">
        <button class="btn btn--tiny" data-edit="${i}">编辑</button>
        <button class="btn btn--tiny btn--danger-text" data-del="${i}">删除</button>
      </span>
    </div>`;
  }).join('');

  return `<div class="ce-section">
    <h3>题目列表${pack.questions.length ? ' (' + pack.questions.length + ' 题)' : ''}</h3>
    ${qList || '<p class="ce-empty">还没有题目，上传素材用 AI 生成，或手动添加</p>'}
  </div>`;
}

function renderAddButtons() {
  return `<div class="ce-add-btns">
    <span class="ce-add-label">手动添加：</span>
    <button class="btn btn--outline btn--small" id="ceAddChoice">+ 选择题</button>
    <button class="btn btn--outline btn--small" id="ceAddFill">+ 填空题</button>
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
      <label>选项（2~4 个，勾选正确答案）</label>
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
      <label>可接受的答案（逗号分隔多个）</label>
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

// --- Mount ---

function mountEditor() {
  const $ = id => document.getElementById(id);

  $('ceBack')?.addEventListener('click', () => { location.hash = 'parent'; });

  // File upload
  const fileInput = $('fileInput');
  const cameraInput = $('cameraInput');
  $('uploadBtn')?.addEventListener('click', () => fileInput?.click());
  $('cameraBtn')?.addEventListener('click', () => cameraInput?.click());
  fileInput?.addEventListener('change', () => { if (fileInput.files.length) handleFiles([...fileInput.files]); });
  cameraInput?.addEventListener('change', () => { if (cameraInput.files.length) handleFiles([...cameraInput.files]); });

  // Drag and drop
  const dropZone = $('dropZone');
  if (dropZone) {
    dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('ce-drag-over'); });
    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('ce-drag-over'));
    dropZone.addEventListener('drop', e => {
      e.preventDefault();
      dropZone.classList.remove('ce-drag-over');
      const files = [...e.dataTransfer.files].filter(f =>
        f.type === 'application/pdf' || f.type.startsWith('image/')
      );
      if (files.length) handleFiles(files);
    });
  }

  // Remove uploaded file
  container.querySelectorAll('[data-remove-file]').forEach(btn => {
    btn.addEventListener('click', () => {
      const i = Number(btn.dataset.removeFile);
      const removed = uploadedFiles.splice(i, 1)[0];
      if (removed?.text) {
        materialText = materialText.replace(removed.text, '').trim();
      }
      rerender();
    });
  });

  // Sync textarea edits to state
  const textArea = $('materialText');
  if (textArea) textArea.addEventListener('input', () => { materialText = textArea.value; });

  // Manual question buttons
  $('ceAddChoice')?.addEventListener('click', () => { editIdx = -1; formType = 'choice'; rerender(); });
  $('ceAddFill')?.addEventListener('click', () => { editIdx = -1; formType = 'fill'; rerender(); });

  // Edit/delete questions
  container.querySelectorAll('[data-edit]').forEach(btn => {
    btn.addEventListener('click', () => {
      editIdx = Number(btn.dataset.edit);
      formType = pack.questions[editIdx].type;
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
