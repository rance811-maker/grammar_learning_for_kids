import { cloud } from '../cloud.js';

let pack = null;
let saving = false;
let container = null;
let uploadedFiles = [];
let materialText = '';
let extracting = false;
let generating = false;
let showKeyInput = false;
let genError = '';

const AI_KEY_STORAGE = 'gq-ai-key';
function getAiKey() { try { return localStorage.getItem(AI_KEY_STORAGE); } catch { return null; } }
function setAiKey(k) { try { localStorage.setItem(AI_KEY_STORAGE, k); } catch { /* */ } }

export async function init(el, packId) {
  container = el;
  saving = false;
  uploadedFiles = [];
  materialText = '';
  extracting = false;
  generating = false;
  showKeyInput = false;
  genError = '';

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

// --- PDF text extraction ---

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

// --- Gemini AI ---

const SYSTEM_PROMPT = `你是一个英语语法教学专家，专门为小学3-6年级的中国学生设计练习题。

请根据用户提供的素材或描述，生成 8-10 道英语语法练习题。

规则：
1. 题型混合使用：选择题(choice)、填空题(fill)、排序题(reorder)，比例大约 5:3:2
2. 题目和选项用英文，instruction 和 explanation 用中文
3. 难度循序渐进，从简单到中等
4. explanation 要简洁，帮助孩子理解语法规则
5. 返回严格的 JSON 数组（不要用 markdown 代码块包裹）

格式示例：
[
  {
    "type": "choice",
    "instruction": "选择正确的答案",
    "sentence": "She ___ to school every day.",
    "options": ["go", "goes", "going", "went"],
    "correctIndex": 1,
    "explanation": "she 是第三人称单数，一般现在时动词加 -es → goes",
    "subSkill": "present_simple"
  },
  {
    "type": "fill",
    "instruction": "用括号中单词的正确形式填空",
    "sentence": "He (play) ___ football now.",
    "acceptableAnswers": ["is playing"],
    "explanation": "now 表示正在进行，用现在进行时 is + doing",
    "subSkill": "present_continuous"
  },
  {
    "type": "reorder",
    "instruction": "把单词排列成正确的句子",
    "words": ["is", "she", "reading", "a", "book"],
    "correctSentence": "She is reading a book.",
    "explanation": "现在进行时：主语 + is/are + 动词-ing + 宾语",
    "subSkill": "present_continuous"
  }
]

请直接输出 JSON 数组，不要包含任何其他文字、解释或 markdown 标记。`;

async function callGemini(apiKey, userParts) {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: userParts }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 8192 },
      }),
    }
  );
  if (!res.ok) {
    const err = await res.json().catch(() => null);
    const msg = err?.error?.message || `API 返回 ${res.status}`;
    if (res.status === 400 && msg.includes('API key')) throw new Error('API key 无效，请检查后重新输入');
    if (res.status === 429) throw new Error('请求太频繁，请稍后再试');
    throw new Error(msg);
  }
  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('AI 未返回内容');
  return text;
}

function buildUserParts() {
  const parts = [];
  // Add images (Gemini reads them natively)
  for (const f of uploadedFiles) {
    if (f.type === 'image' && f.dataUrl) {
      const [header, base64] = f.dataUrl.split(',');
      const mimeMatch = header.match(/:(.*?);/);
      if (mimeMatch && base64) {
        parts.push({ inlineData: { mimeType: mimeMatch[1], data: base64 } });
      }
    }
  }
  const userText = materialText.trim();
  if (userText) {
    parts.push({ text: userText });
  } else if (parts.length === 0) {
    return null;
  }
  return parts;
}

function parseQuestions(raw) {
  let text = raw.trim();
  // Strip markdown code fences if present
  text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
  const arr = JSON.parse(text);
  if (!Array.isArray(arr)) throw new Error('AI 返回的不是数组');
  return arr.filter(q => q && q.type);
}

async function doGenerate() {
  const key = getAiKey();
  if (!key) { showKeyInput = true; rerender(); return; }

  const userParts = buildUserParts();
  if (!userParts) { genError = '请先上传素材或输入描述内容'; rerender(); return; }

  generating = true;
  genError = '';
  rerender();

  try {
    const systemParts = [{ text: SYSTEM_PROMPT }];
    const allParts = [...systemParts, ...userParts];
    const raw = await callGemini(key, allParts);
    pack.questions = parseQuestions(raw);
    generating = false;
    rerender();
  } catch (e) {
    generating = false;
    genError = e.message;
    rerender();
  }
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
        <input type="text" id="ceTitle" value="${esc(pack.title)}" placeholder="例如：一般现在时练习">
      </div>
      <div class="parent-field">
        <label>课程描述（选填）</label>
        <input type="text" id="ceDesc" value="${esc(pack.description)}" placeholder="简单说明这个课程包的内容">
      </div>
    </div>
    ${renderUploadSection()}
    ${showKeyInput ? renderKeyInput() : ''}
    ${renderGenerateButton()}
    ${renderPreview()}
    <div class="ce-save">
      <div class="parent-msg" id="ceMsg"></div>
      ${pack.questions.length ? `<button class="btn btn--primary btn--block" id="ceSave">保存课程包（${pack.questions.length} 题）</button>` : ''}
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
    <h3>📎 上传学习素材（可选）</h3>
    <p class="ce-upload-hint">上传课本照片或 PDF，AI 会从中提取内容生成练习题</p>
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
      <label>描述你想要的练习内容</label>
      <textarea id="materialText" rows="4" placeholder="例如：&#10;• 生成10道关于一般现在时 vs 现在进行时的题目&#10;• 根据上面的课文，出一套选择题和填空题&#10;• 帮我出一些 there be 句型的练习">${esc(materialText)}</textarea>
    </div>
  </div>`;
}

function renderKeyInput() {
  return `<div class="ce-form">
    <h3>🔑 配置 AI 服务</h3>
    <p class="parent-desc">需要一个 Google Gemini API key（免费）来生成题目：</p>
    <ol class="ce-key-steps">
      <li>打开 <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener">Google AI Studio</a></li>
      <li>登录 Google 账号，点击「Create API Key」</li>
      <li>复制生成的 key，粘贴到下方</li>
    </ol>
    <div class="parent-field">
      <input type="password" id="aiKeyInput" placeholder="粘贴你的 Gemini API key">
    </div>
    <div class="ce-form-btns">
      <button class="btn btn--primary" id="saveKeyBtn">保存并生成</button>
      <button class="btn btn--outline" id="cancelKeyBtn">取消</button>
    </div>
  </div>`;
}

function renderGenerateButton() {
  if (showKeyInput) return '';
  const hasKey = !!getAiKey();
  if (generating) {
    return `<div class="ce-generate">
      <div class="ce-generating">
        <span class="ce-spinner"></span>
        AI 正在生成题目，请稍候…
      </div>
    </div>`;
  }
  return `<div class="ce-generate">
    <button class="btn btn--secondary btn--block" id="generateBtn">
      🤖 AI 生成练习题
    </button>
    ${!hasKey ? '<p class="ce-gen-hint">首次使用需配置免费的 AI 服务</p>' : '<p class="ce-gen-hint">基于上方素材/描述自动生成题目</p>'}
    ${genError ? `<p class="ce-gen-error">❌ ${esc(genError)}</p>` : ''}
    ${hasKey ? '<button class="btn btn--text" id="changeKeyBtn" style="font-size:0.8rem">更换 API key</button>' : ''}
  </div>`;
}

function renderPreview() {
  if (!pack.questions.length) return '';
  const typeLabels = { choice: '选择题', fill: '填空题', reorder: '排序题', match: '配对题', error: '纠错题', scenario: '情景题' };
  const items = pack.questions.map((q, i) => {
    const label = typeLabels[q.type] || q.type;
    const text = q.sentence || q.correctSentence || q.instruction || '';
    return `<div class="ce-q-item">
      <span class="ce-q-num">${i + 1}</span>
      <span class="ce-q-badge">${label}</span>
      <span class="ce-q-text">${esc(text.slice(0, 80))}</span>
    </div>`;
  }).join('');

  return `<div class="ce-section">
    <div class="ce-section-header">
      <h3>✅ 已生成 ${pack.questions.length} 道题目</h3>
      <button class="btn btn--outline btn--small" id="regenBtn">🔄 重新生成</button>
    </div>
    ${items}
  </div>`;
}

// --- Mount ---

function mountEditor() {
  const $ = id => document.getElementById(id);

  // Back button
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
      if (removed?.text) materialText = materialText.replace(removed.text, '').trim();
      rerender();
    });
  });

  // Text area sync
  $('materialText')?.addEventListener('input', e => { materialText = e.target.value; });

  // Generate button
  $('generateBtn')?.addEventListener('click', doGenerate);
  $('regenBtn')?.addEventListener('click', doGenerate);

  // API key
  $('saveKeyBtn')?.addEventListener('click', () => {
    const key = $('aiKeyInput')?.value.trim();
    if (!key) return;
    setAiKey(key);
    showKeyInput = false;
    doGenerate();
  });
  $('cancelKeyBtn')?.addEventListener('click', () => { showKeyInput = false; rerender(); });
  $('changeKeyBtn')?.addEventListener('click', () => { showKeyInput = true; rerender(); });

  // Save
  $('ceSave')?.addEventListener('click', savePack);
}

async function savePack() {
  const title = document.getElementById('ceTitle')?.value.trim();
  const desc = document.getElementById('ceDesc')?.value.trim() || '';
  const msg = document.getElementById('ceMsg');

  if (!title) { msg.textContent = '请填写课程名称'; msg.className = 'parent-msg parent-msg--error'; return; }
  if (!pack.questions.length) { msg.textContent = '请先生成题目'; msg.className = 'parent-msg parent-msg--error'; return; }

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
