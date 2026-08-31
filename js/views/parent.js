import { store } from '../store.js';
import { cloud, friendlyError } from '../cloud.js';
import * as courseEditor from './courseEditor.js';
import { SUB_SKILL_NAMES } from '../data/skill-names.js';
import { curriculum, BUILT_IN_ID } from '../curriculum.js';
import { generateSyllabus, generateAllUnits, hasApiKey, friendlyAiError, buildMaterial, generateUnitPreview, generateCoverage, hasBlueprint, deterministicCoverage } from '../unitGenerator.js';

// AI 服务配置（与 unitGenerator/courseEditor 共用的存储键）
const AI_PROVIDER_KEY = 'gq-ai-provider';
function getAiProvider() { try { return localStorage.getItem(AI_PROVIDER_KEY) || 'gemini'; } catch { return 'gemini'; } }
function setAiProvider(p) { try { localStorage.setItem(AI_PROVIDER_KEY, p); } catch { /* */ } }
function setAiKeyVal(p, k) { try { localStorage.setItem(p === 'claude' ? 'gq-ai-key-claude' : 'gq-ai-key-gemini', k); } catch { /* */ } }

// 上传素材（PDF/照片）暂存
let currFiles = [];

const LOCKOUT_KEY = 'gq-parent-lockout';
const MAX_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 10;

// 解锁状态只存在内存里，从不持久化。
// 刷新/关闭页面，或离开家长专区切到别的页面，都会回到"已上锁"状态。
// 这样把设备交给孩子时，孩子点开家长专区一定会被要求重新输入 PIN，
// 不会因为家长刚进过而处于"已登入"状态。
let unlocked = false;

async function sha256(str) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function isUnlocked() { return unlocked; }
function setUnlocked() { unlocked = true; }
function clearUnlock() { unlocked = false; }

// 离开家长专区时自动上锁（由 app.js 的路由在切到别的页面时调用）。
export function lock() { unlocked = false; }

// 失败锁定信息存 localStorage：即使关掉标签页/刷新也照样锁着，
// 防止用"关页面重开"的方式把连错次数清零来绕过锁定。
function getActiveLockout() {
  try {
    const d = JSON.parse(localStorage.getItem(LOCKOUT_KEY));
    if (d && d.until && d.until > Date.now()) return d;       // 仍在锁定中
    if (d && d.until && d.until <= Date.now()) clearLockout(); // 锁定期已过，清零
    return null;
  } catch { return null; }
}
// 记一次失败：累加计数，达到上限就开始计时锁定。返回最新记录。
function recordFailedAttempt() {
  let count = 0;
  try { count = (JSON.parse(localStorage.getItem(LOCKOUT_KEY)) || {}).count || 0; } catch { /* ignore */ }
  count += 1;
  const rec = { count };
  if (count >= MAX_ATTEMPTS) rec.until = Date.now() + LOCKOUT_MINUTES * 60000;
  localStorage.setItem(LOCKOUT_KEY, JSON.stringify(rec));
  return rec;
}
function clearLockout() {
  try { localStorage.removeItem(LOCKOUT_KEY); } catch { /* ignore */ }
}

export function render(sub) {
  if (!store.isLoggedIn()) {
    return `<div class="parent-zone"><div class="parent-card">
      <div class="parent-icon">🔒</div>
      <h2>家长专区</h2>
      <p class="parent-desc">请先登录账号才能使用家长专区</p>
      <button class="btn btn--primary" onclick="location.hash='account'">去登录</button>
    </div></div>`;
  }
  if (sub === 'reset') return renderReset();
  return `<div class="parent-zone"><div class="parent-card" id="parentContent">
    <div class="parent-icon">⏳</div><p>加载中…</p>
  </div></div>`;
}

function renderSetup() {
  return `<div class="parent-card">
    <div class="parent-icon">🔐</div>
    <h2>设置家长密码</h2>
    <p class="parent-desc">设置一个 6 位数字密码，用于进入家长专区。<br>孩子不知道这个密码，就无法修改课程内容。</p>
    <div class="parent-field">
      <label>设置密码（6位数字）</label>
      <input type="password" id="pinInput" maxlength="6" inputmode="numeric" pattern="[0-9]*" placeholder="请输入6位数字">
    </div>
    <div class="parent-field">
      <label>确认密码</label>
      <input type="password" id="pinConfirm" maxlength="6" inputmode="numeric" pattern="[0-9]*" placeholder="再输入一次">
    </div>
    <div class="parent-msg" id="parentMsg"></div>
    <button class="btn btn--primary btn--block" id="setupBtn">确认设置</button>
  </div>`;
}

function renderLocked() {
  const lockout = getActiveLockout();
  if (lockout) {
    const min = Math.ceil((lockout.until - Date.now()) / 60000);
    return `<div class="parent-card">
      <div class="parent-icon">⏰</div>
      <h2>操作太频繁</h2>
      <p class="parent-desc">错误次数过多，请 ${min} 分钟后再试</p>
    </div>`;
  }
  return `<div class="parent-card">
    <div class="parent-icon">🔒</div>
    <h2>家长专区</h2>
    <p class="parent-desc">请输入家长密码</p>
    <div class="parent-field">
      <input type="password" id="pinInput" maxlength="6" inputmode="numeric" pattern="[0-9]*" placeholder="6位数字密码" autofocus>
    </div>
    <div class="parent-msg" id="parentMsg"></div>
    <button class="btn btn--primary btn--block" id="verifyBtn">进入</button>
    <button class="btn btn--text" id="resetLink">忘记密码？用账号密码重置</button>
  </div>`;
}

function renderDashboard() {
  // Curriculum section
  const allCurr = curriculum.listAll();
  const activeId = curriculum.getActiveId();
  const currItems = allCurr.map(c => {
    const isActive = c.id === activeId;
    const genCount = c.builtIn ? 12 : Object.keys(store.state.curricula?.[c.id]?.unitsData || {}).length;
    return `<div class="ce-pack-item">
      <div class="ce-pack-info">
        <strong>${isActive ? '✅ ' : ''}${esc(c.title)}${c.builtIn ? ' (内置)' : ''}</strong>
        <span class="ce-pack-meta">${c.builtIn ? '12 个单元 · 完整内容' : `${genCount}/12 单元已生成`}</span>
        ${c.description && !c.builtIn ? `<span class="ce-pack-desc">${esc(c.description)}</span>` : ''}
      </div>
      <div class="ce-pack-btns">
        ${isActive
          ? '<span class="badge badge--success" style="font-size:0.75rem;">✅ 孩子正在学</span>'
          : `<button class="btn btn--tiny btn--primary" data-switch-curr="${c.id}">让孩子学这套</button>`}
        ${!c.builtIn && genCount < 12 ? `<button class="btn btn--tiny btn--outline" data-genall-curr="${c.id}">⚡ 补齐剩余 ${12 - genCount} 单元</button>` : ''}
        ${!c.builtIn ? `<button class="btn btn--tiny btn--danger-text" data-del-curr="${c.id}">删除</button>` : ''}
      </div>
    </div>`;
  }).join('');

  return `<div class="parent-card parent-card--wide" id="dashboardCard">
    <div class="parent-header">
      <h2>🏠 家长专区</h2>
      <button class="btn btn--small btn--outline" id="lockBtn">🔒 退出专区</button>
    </div>

    <div class="ce-section">
      <div class="ce-section-header">
        <h3>📚 课程体系</h3>
        <span style="font-size:0.8rem;color:var(--color-text-light);">孩子正在学：${esc(curriculum.getActiveTitle())}</span>
      </div>
      <p style="font-size:0.75rem;color:var(--color-muted);margin:0 0 10px;line-height:1.5;">
        孩子同一时间只学一套课程。点「让孩子学这套」即可切换。<br>
        AI 课程的单元在孩子首次进入时会自动生成；也可点「补齐剩余单元」提前一次性生成好。
      </p>
      ${currItems}
    </div>

    <div class="parent-grid" style="margin-top:var(--space-lg)">
      <a class="parent-feature parent-feature--active" id="newCurrCard" href="#parent/curriculum" style="cursor:pointer;text-decoration:none;color:inherit;display:block;">
        <div class="parent-feature-icon">🤖</div>
        <h3>AI 创建课程</h3>
        <p>描述目标或上传教材/考纲（PDF·拍照），AI 自动生成完整 12 单元课程</p>
        <span class="btn btn--primary btn--small" style="margin-top:var(--space-sm);">+ 创建课程</span>
      </a>
      <a class="parent-feature parent-feature--active" id="reportCard" href="#parent/report" style="cursor:pointer;text-decoration:none;color:inherit;display:block;">
        <div class="parent-feature-icon">📊</div>
        <h3>学习报告</h3>
        <p>查看孩子的学习进度和薄弱环节分析</p>
        <span class="btn btn--primary btn--small" style="margin-top:var(--space-sm);">查看报告</span>
      </a>
    </div>

    <div class="parent-actions">
      <button class="btn btn--small btn--outline" id="changePinBtn">修改家长密码</button>
    </div>
  </div>`;
}

function esc(s) {
  return String(s || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

function renderReset() {
  return `<div class="parent-zone"><div class="parent-card">
    <div class="parent-icon">🔑</div>
    <h2>重置家长密码</h2>
    <p class="parent-desc">输入你的账号登录密码来验证身份</p>
    <div class="parent-field">
      <label>账号密码</label>
      <input type="password" id="accountPwd" placeholder="输入登录密码">
    </div>
    <div class="parent-field">
      <label>新家长密码（6位数字）</label>
      <input type="password" id="newPin" maxlength="6" inputmode="numeric" pattern="[0-9]*" placeholder="请输入6位数字">
    </div>
    <div class="parent-field">
      <label>确认新密码</label>
      <input type="password" id="newPinConfirm" maxlength="6" inputmode="numeric" pattern="[0-9]*" placeholder="再输入一次">
    </div>
    <div class="parent-msg" id="parentMsg"></div>
    <button class="btn btn--primary btn--block" id="resetBtn">验证并重置</button>
    <button class="btn btn--text" id="backLink">← 返回</button>
  </div></div>`;
}

// --- Mount logic ---

export function mount(sub, param) {
  if (!store.isLoggedIn()) return;
  if (sub === 'reset') { mountReset(); return; }
  loadAndRender(sub, param);
}

async function loadAndRender(sub, param) {
  const el = document.getElementById('parentContent');
  if (!el) return;

  function showError(msg) {
    const target = document.getElementById('ceRoot')
      || document.getElementById('parentContent')
      || document.querySelector('#currCreator, #reportContent, #dashboardCard')
      || document.querySelector('.parent-zone .parent-card')
      || document.querySelector('.content')
      || el;
    target.innerHTML = `<div class="parent-icon">⚠️</div>
      <p>加载失败：${msg}</p>
      <button class="btn btn--primary" onclick="location.reload()">重试</button>`;
  }

  try {
    if (isUnlocked()) {
      if (sub === 'report') {
        el.outerHTML = renderReport();
        mountReport();
        return;
      }
      if (sub === 'curriculum') {
        el.outerHTML = renderCurriculumCreator();
        mountCurriculumCreator();
        return;
      }
      if (sub === 'new' || sub === 'edit') {
        el.outerHTML = '<div class="parent-card parent-card--wide" id="ceRoot"><p>加载编辑器…</p></div>';
        const ceRoot = document.getElementById('ceRoot');
        try {
          await courseEditor.init(ceRoot, sub === 'edit' ? param : null);
        } catch (e2) {
          console.error('Course editor init failed:', e2);
          ceRoot.innerHTML = `<div class="parent-icon">⚠️</div>
            <p>编辑器加载失败：${e2.message}</p>
            <button class="btn btn--primary" onclick="location.hash='parent'">返回</button>`;
        }
      } else {
        el.outerHTML = renderDashboard();
        mountDashboard();
      }
      return;
    }
    const hash = await cloud.loadParentPin();
    if (!hash) {
      el.outerHTML = renderSetup();
      mountSetup();
    } else {
      el.outerHTML = renderLocked();
      mountLocked(hash);
    }
  } catch (e) {
    console.error('Parent zone load failed:', e);
    showError(e.message);
  }
}

// --- Curriculum Creator ---

// 目标 → CEFR 等级映射（剑桥体系）。自定义目标无固定等级。
const GOAL_CEFR = {
  '剑桥 KET 语法（CEFR A2）': 'A2',
  '剑桥 PET 语法（CEFR B1）': 'B1',
  '剑桥 B2 First 语法与 Use of English（CEFR B2）': 'B2',
  '雅思 5.0 语法（CEFR B1）': 'B1',
  '雅思 5.5 语法（CEFR B2）': 'B2',
  '雅思 6.0 语法（CEFR B2）': 'B2',
  '雅思 6.5 语法（CEFR B2）': 'B2',
  '雅思 7.0 语法（CEFR C1）': 'C1',
};

function selectField(id, label, options, placeholder) {
  const opts = [`<option value="">${placeholder || '请选择…'}</option>`]
    .concat(options.map(o => `<option value="${esc(o)}">${esc(o)}</option>`))
    .join('');
  return `<div class="parent-field"><label>${label}</label><select id="${id}">${opts}</select></div>`;
}

function renderCurriculumCreator() {
  return `<div class="parent-card parent-card--wide" id="currCreator">
    <div class="parent-header">
      <button class="btn btn--small btn--outline" id="currBackBtn">← 返回</button>
      <h2 style="margin:0;">🤖 创建孩子的专属课程</h2>
      <div></div>
    </div>

    <div class="curr-form" style="margin-top:var(--space-lg);">
      <div style="background:var(--color-bg);border:1px solid var(--color-border);border-left:3px solid var(--color-secondary);border-radius:8px;padding:12px 14px;margin-bottom:var(--space-lg);">
        <div style="font-weight:700;font-size:0.9rem;margin-bottom:2px;">📝 专注书面语法准确性</div>
        <p style="font-size:0.78rem;color:var(--color-text-light);margin:0;line-height:1.55;">
          本工具专攻<strong>书面语法</strong>（服务写作与阅读），按 <strong>CEFR 等级</strong>对标语法能力（参考剑桥 English Grammar Profile）。<strong>不训练听力与口语</strong>。<br>
          <span style="color:var(--color-muted);">说明：这是语法教学蓝图，非某场考试的官方考纲——剑桥并未公布固定语法清单。</span>
        </p>
      </div>

      <div class="curr-form-row">
        ${selectField('currGrade', '1. 孩子几年级？', ['学龄前', '一年级', '二年级', '三年级', '四年级', '五年级', '六年级', '初中', '高中', '成人'])}
        ${selectField('currTimeframe', '期望在多长时间内达到', ['1 个月', '3 个月', '半年', '1 年', '不限'])}
      </div>

      <div class="parent-field">
        <label>2. 目标：对标哪个剑桥等级？<span style="color:var(--color-danger);">（必填）</span></label>
        <select id="currGoalSelect">
          <option value="">请选择一个明确目标…</option>
          <optgroup label="剑桥通用五级 · 语法专项">
            <option value="剑桥 KET 语法（CEFR A2）">剑桥 KET · A2 语法</option>
            <option value="剑桥 PET 语法（CEFR B1）">剑桥 PET · B1 语法</option>
            <option value="剑桥 B2 First 语法与 Use of English（CEFR B2）">剑桥 B2 First（原 FCE）· B2 语法</option>
          </optgroup>
          <optgroup label="雅思 · 语法专项（按 CEFR 对应）">
            <option value="雅思 5.0 语法（CEFR B1）">雅思 5.0 语法（≈ B1）</option>
            <option value="雅思 5.5 语法（CEFR B2）">雅思 5.5 语法（≈ B2）</option>
            <option value="雅思 6.0 语法（CEFR B2）">雅思 6.0 语法（≈ B2）</option>
            <option value="雅思 6.5 语法（CEFR B2）">雅思 6.5 语法（≈ B2）</option>
            <option value="雅思 7.0 语法（CEFR C1）">雅思 7.0 语法（≈ C1）</option>
          </optgroup>
          <option value="__custom__">其他（自定义语法目标）…</option>
        </select>
        <input type="text" id="currGoalCustom" placeholder="自定义语法目标，如：初中语法总复习 / 时态专项" style="display:none;margin-top:8px;">
        <p style="font-size:0.72rem;color:var(--color-muted);margin:6px 0 0;">对标 CEFR 等级，AI 就按该等级应掌握的书面语法点生成，也方便你核对覆盖是否到位。</p>
      </div>

      <div class="parent-field">
        <label>3. 希望基于哪些教材 / 试卷 / 文章？（可选）</label>
        <div style="display:flex;gap:16px;align-items:center;flex-wrap:wrap;">
          <button type="button" class="btn btn--small btn--outline" id="currPickFile">📁 选择文件</button>
          <button type="button" class="btn btn--small btn--outline" id="currPickCam">📷 拍照上传</button>
          <span style="font-size:0.75rem;color:var(--color-muted);">PDF / JPG / PNG / WebP</span>
        </div>
        <input type="file" id="currFileInput" accept=".pdf,image/*" multiple hidden>
        <input type="file" id="currCamInput" accept="image/*" capture="environment" hidden>
        <div id="currFileList" style="margin-top:10px;"></div>
      </div>

      <div class="parent-field">
        <label>4. 孩子目前最明显的困难是什么？（可选，但很有用）</label>
        <textarea id="currDifficulty" rows="2" placeholder="例如：时态总搞混 / 不会写完整句子 / 词汇量小 / 一到阅读就失分 / 会做但很慢"></textarea>
      </div>

      <div class="curr-form-row">
        ${selectField('currDaily', '5. 每天可投入多少时间？', ['10 分钟', '20 分钟', '30 分钟', '1 小时以上'])}
        ${selectField('currInvolvement', '6. 你希望自己参与到什么程度？', ['我陪着一起学', '每天检查+看报告', '偶尔看看报告', '全交给孩子自主'])}
      </div>

      <div class="parent-field">
        <label>课程名称（选填，默认用学习目标）</label>
        <input type="text" id="currTitleInput" placeholder="例如：雅思 Band7 冲刺">
      </div>

      <div id="currKeyPanel"></div>

      <div id="currGenArea">
        <button class="btn btn--primary btn--block" id="currGenBtn" style="margin-top:var(--space-md);">
          🤖 生成课程
        </button>
      </div>

      <div id="currMsg" style="margin-top:var(--space-md);"></div>
      <div id="currSyllabusArea"></div>
    </div>
  </div>`;
}

function renderCurrFileList() {
  const host = document.getElementById('currFileList');
  if (!host) return;
  if (!currFiles.length) { host.innerHTML = ''; return; }
  host.innerHTML = currFiles.map((f, i) => `
    <div style="display:inline-flex;align-items:center;gap:6px;background:#f0f0f0;border-radius:16px;padding:4px 10px;margin:0 6px 6px 0;font-size:0.8rem;">
      <span>${f.type.startsWith('image/') ? '🖼️' : '📄'} ${esc(f.name.length > 22 ? f.name.slice(0, 20) + '…' : f.name)}</span>
      <button type="button" data-rm-file="${i}" style="border:none;background:none;cursor:pointer;color:#c0392b;font-weight:700;">×</button>
    </div>`).join('');
  host.querySelectorAll('[data-rm-file]').forEach(b => b.addEventListener('click', () => {
    currFiles.splice(Number(b.dataset.rmFile), 1);
    renderCurrFileList();
  }));
}

const PROVIDER_NAMES = { gemini: 'Gemini', claude: 'Claude' };
// key 编辑器是否展开。已配置时默认收起，点「更换 / 重新录入」再展开。
let _keyEditorOpen = false;

function mountCurrKeyPanel() {
  const host = document.getElementById('currKeyPanel');
  if (!host) return;
  const p = getAiProvider();
  const configured = hasApiKey();

  // 已配置且未展开编辑器 → 显示一张紧凑的「已配置」卡片，仍可随时更换 / 重新录入。
  if (configured && !_keyEditorOpen) {
    host.innerHTML = `
      <div class="parent-field" style="background:var(--color-bg-soft,#F1F8E9);border:1px solid #C5E1A5;border-radius:10px;padding:10px 14px;display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
        <span style="font-size:0.9rem;">🔑 AI 服务：<b>${PROVIDER_NAMES[p] || p}</b> · 已配置 ✓</span>
        <button class="btn btn--tiny btn--outline" id="currKeyEdit" style="margin-left:auto;">更换 / 重新录入 key</button>
      </div>`;
    document.getElementById('currKeyEdit')?.addEventListener('click', () => { _keyEditorOpen = true; mountCurrKeyPanel(); });
    return;
  }

  // 未配置，或用户主动点了「更换」→ 显示完整编辑器。
  host.innerHTML = `
    <div class="parent-field" style="background:#FFF8E1;border:1px solid #F0E0A8;border-radius:10px;padding:12px 14px;">
      <label>🔑 ${configured ? '更换 / 重新录入 API key' : '配置 AI 服务（生成需要，配一次即可）'}</label>
      <select id="currProvider" style="width:100%;padding:8px;border-radius:8px;border:1px solid #ddd;margin-bottom:8px;">
        <option value="gemini" ${p === 'gemini' ? 'selected' : ''}>Gemini（免费额度·输出上限较低，长单元可能被截断）</option>
        <option value="claude" ${p === 'claude' ? 'selected' : ''}>Claude（按量付费·质量更高更稳，推荐正式生成）</option>
      </select>
      <input type="password" id="currKeyInput" placeholder="粘贴${configured ? '新的 ' : ''}API key" autocomplete="off" style="width:100%;padding:8px;border-radius:8px;border:1px solid #ddd;">
      <div style="display:flex;gap:10px;align-items:center;margin-top:8px;flex-wrap:wrap;">
        <button class="btn btn--small btn--primary" id="currKeySave">保存 key</button>
        ${configured ? '<button class="btn btn--small btn--outline" id="currKeyCancel">取消</button>' : ''}
        <span style="font-size:0.72rem;color:#999;">Gemini: aistudio.google.com/apikey · Claude: console.anthropic.com</span>
      </div>
      <div style="font-size:0.72rem;color:#999;margin-top:6px;">key 只存在你这台设备的浏览器里，不会上传服务器。</div>
    </div>`;
  document.getElementById('currProvider')?.addEventListener('change', e => setAiProvider(e.target.value));
  document.getElementById('currKeyCancel')?.addEventListener('click', () => { _keyEditorOpen = false; mountCurrKeyPanel(); });
  document.getElementById('currKeySave')?.addEventListener('click', () => {
    const prov = document.getElementById('currProvider').value;
    const key = document.getElementById('currKeyInput').value.trim();
    if (!key) return;
    setAiProvider(prov);
    setAiKeyVal(prov, key);
    _keyEditorOpen = false;
    mountCurrKeyPanel();
  });
}

function mountCurriculumCreator() {
  currFiles = [];
  _keyEditorOpen = false;
  document.getElementById('currBackBtn')?.addEventListener('click', () => { location.hash = 'parent'; });
  mountCurrKeyPanel();

  const fileInput = document.getElementById('currFileInput');
  const camInput = document.getElementById('currCamInput');
  document.getElementById('currPickFile')?.addEventListener('click', () => fileInput?.click());
  document.getElementById('currPickCam')?.addEventListener('click', () => camInput?.click());
  const addFiles = (list) => {
    for (const f of list) currFiles.push(f);
    renderCurrFileList();
  };
  fileInput?.addEventListener('change', e => { addFiles(e.target.files); e.target.value = ''; });
  camInput?.addEventListener('change', e => { addFiles(e.target.files); e.target.value = ''; });

  // 目标选择器：选「其他（自定义）」时才显示自由输入框
  const goalSelect = document.getElementById('currGoalSelect');
  const goalCustom = document.getElementById('currGoalCustom');
  goalSelect?.addEventListener('change', () => {
    const custom = goalSelect.value === '__custom__';
    if (goalCustom) { goalCustom.style.display = custom ? 'block' : 'none'; if (custom) goalCustom.focus(); }
  });

  const genBtn = document.getElementById('currGenBtn');
  if (!genBtn) return;

  genBtn.addEventListener('click', async () => {
    const val = (id) => document.getElementById(id)?.value.trim() || '';
    const goalSel = val('currGoalSelect');
    const goal = goalSel === '__custom__' ? val('currGoalCustom') : goalSel;
    const profile = {
      grade: val('currGrade'),
      goal,
      cefr: GOAL_CEFR[goalSel] || '',
      timeframe: val('currTimeframe'),
      difficulty: val('currDifficulty'),
      dailyMinutes: val('currDaily'),
      involvement: val('currInvolvement'),
    };
    const msg = document.getElementById('currMsg');
    if (!profile.goal && currFiles.length === 0) {
      if (msg) msg.innerHTML = '<p style="color:var(--color-danger);font-size:var(--text-sm);">请选择第 2 题「目标」，或上传素材</p>';
      goalSelect?.focus();
      return;
    }
    if (!hasApiKey()) {
      if (msg) msg.innerHTML = '<p style="color:var(--color-danger);font-size:var(--text-sm);">请先在上方配置 AI API key</p>';
      mountCurrKeyPanel();
      return;
    }

    genBtn.disabled = true;
    genBtn.innerHTML = '<span class="ce-spinner" style="display:inline-block;width:16px;height:16px;margin-right:8px;vertical-align:middle;"></span> AI 正在设计课程…';
    const setMsg = (t) => { if (msg) msg.innerHTML = `<p style="color:var(--color-secondary-dark);font-size:var(--text-sm);">${esc(t)}</p>`; };
    let stopTicker = () => {};

    try {
      let material = '';
      if (currFiles.length) {
        material = await buildMaterial({ files: currFiles, onStatus: setMsg });
      }
      stopTicker = startTicker(msg, SYLLABUS_GEN_STEPS);
      const enrichedGoal = buildGoalFromProfile(profile);
      const syllabus = await generateSyllabus(enrichedGoal, material);
      stopTicker();
      if (msg) msg.innerHTML = '';
      renderSyllabusPreview(syllabus, profile, material);
    } catch (e) {
      stopTicker();
      genBtn.disabled = false;
      genBtn.textContent = '🤖 重试生成';
      if (msg) msg.innerHTML = `<p style="color:var(--color-danger);font-size:var(--text-sm);">生成失败：${esc(friendlyAiError(e))}</p>`;
    }
  });
}

// 把结构化档案拼成一段给 AI 的目标描述，让它据此校准难度/深度/节奏。
function buildGoalFromProfile(pf) {
  const parts = [];
  if (pf.goal) parts.push(`学习目标：${pf.goal}`);
  if (pf.cefr) parts.push(`对应 CEFR 等级：${pf.cefr}`);
  if (pf.grade) parts.push(`孩子年级：${pf.grade}`);
  if (pf.timeframe) parts.push(`期望时限：${pf.timeframe}`);
  if (pf.difficulty) parts.push(`目前主要困难：${pf.difficulty}`);
  if (pf.dailyMinutes) parts.push(`每天可投入：${pf.dailyMinutes}`);
  const head = parts.join('；');
  const levelRule = pf.cefr
    ? `请严格对照剑桥 English Grammar Profile 中 ${pf.cefr} 等级应掌握的书面语法点来设计 12 单元，只覆盖该等级的语法结构，不要放入更高等级的内容。`
    : '请据目标选择合适难度的书面语法点设计 12 单元。';
  return (head ? head + '。' : '')
    + '本课程只训练【书面语法准确性】（服务写作与阅读），不涉及听力与口语。'
    + levelRule
    + '若填写了「目前主要困难」，请在前几个单元优先覆盖这些薄弱点。';
}

// 在元素里轮播一组提示文字，等待时给出"正在进行"的反馈。返回停止函数。
function startTicker(el, messages, interval = 2200) {
  if (!el) return () => {};
  let i = 0;
  const apply = () => {
    el.innerHTML = `<p style="color:var(--color-secondary-dark);font-size:var(--text-sm);">${messages[i % messages.length]}</p>`;
    i++;
  };
  apply();
  const t = setInterval(apply, interval);
  return () => clearInterval(t);
}

const SYLLABUS_GEN_STEPS = [
  '🧠 正在理解学习目标…',
  '📐 正在规划单元梯度…',
  '✍️ 正在编写 12 单元大纲…',
  '🔖 正在标注每单元语法点…',
];

// 批量生成 UI：在 hostEl 内渲染进度条并跑 generateAllUnits。
// 完成后给出"进入学习地图"以及（若有失败）"重试失败单元"。
async function renderAndRunBatch(hostEl, title) {
  if (!hostEl) return;
  if (!hasApiKey()) {
    hostEl.innerHTML = `<div class="parent-card parent-card--wide" style="text-align:center;">
      <div class="parent-icon">🔑</div>
      <p>请先在「独立练习包」中配置 AI API key，再生成单元内容。</p>
      <button class="btn btn--primary" id="batchToHomeBtn">进入学习地图</button>
    </div>`;
    document.getElementById('batchToHomeBtn')?.addEventListener('click', goHome);
    return;
  }

  hostEl.innerHTML = `<div class="parent-card parent-card--wide">
    <h2 style="margin-top:0;">🤖 生成单元内容</h2>
    <p class="batch-sub">正在为《${esc(title)}》的每个单元生成故事、练习题和写作任务，每个单元约 20–90 秒，请保持页面打开…</p>
    <div class="batch-progress"><div class="batch-progress__fill" id="batchFill"></div></div>
    <div class="batch-status" id="batchStatus">准备中…</div>
    <div id="batchActions"></div>
  </div>`;

  const fill = document.getElementById('batchFill');
  const statusEl = document.getElementById('batchStatus');

  let res;
  try {
    res = await generateAllUnits({
      onProgress: (r, uid, kind) => {
        if (fill) fill.style.width = Math.round((r.done / r.total) * 100) + '%';
        const tag = kind === 'ok' ? '✅ 已生成' : kind === 'skip' ? '（已存在）' : '⚠️ 失败';
        if (statusEl) statusEl.textContent = `进度 ${r.done}/${r.total} · 单元 ${uid} ${tag}`;
      },
    });
  } catch (e) {
    if (statusEl) statusEl.innerHTML = `<span style="color:var(--color-danger);">生成中断：${esc(friendlyAiError(e))}</span>`;
    const actions = document.getElementById('batchActions');
    if (actions) actions.innerHTML = `<button class="btn btn--primary" id="batchToHomeBtn">进入学习地图</button>`;
    document.getElementById('batchToHomeBtn')?.addEventListener('click', goHome);
    return;
  }

  const failCount = res.failed.length;
  if (statusEl) {
    statusEl.innerHTML = failCount
      ? `完成 ${res.done}/${res.total} 个单元，其中 <strong style="color:var(--color-danger);">${failCount} 个生成失败</strong>（孩子进入该单元时可单独重试）`
      : `🎉 全部 ${res.total} 个单元已生成完毕！`;
  }
  const actions = document.getElementById('batchActions');
  if (actions) {
    actions.innerHTML = `
      ${failCount ? '<button class="btn btn--outline" id="batchRetryBtn">🔄 重试失败单元</button>' : ''}
      <button class="btn btn--primary" id="batchDoneBtn">进入学习地图</button>`;
    document.getElementById('batchDoneBtn')?.addEventListener('click', goHome);
    document.getElementById('batchRetryBtn')?.addEventListener('click', () => renderAndRunBatch(hostEl, title));
  }
}

function goHome() {
  location.hash = '';
  window.dispatchEvent(new HashChangeEvent('hashchange'));
}

function renderSyllabusPreview(syllabus, profile, material = '') {
  const area = document.getElementById('currSyllabusArea');
  if (!area) return;
  const goal = (profile && profile.goal) || '';

  const items = syllabus.map((s, i) => `
    <div style="display:flex;gap:12px;padding:12px 0;border-bottom:1px solid var(--color-border);">
      <div style="flex-shrink:0;width:32px;height:32px;border-radius:50%;background:var(--color-primary);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:0.85rem;">
        ${i + 1}
      </div>
      <div style="flex:1;min-width:0;">
        <div style="font-weight:600;font-size:0.95rem;overflow-wrap:anywhere;">${esc(s.title)}</div>
        <div style="font-size:0.8rem;color:var(--color-text-light);margin-top:2px;line-height:1.5;overflow-wrap:anywhere;">${esc(s.description)}</div>
        <div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:6px;">
          ${(s.skills || []).map(sk => `<span style="font-size:0.68rem;color:var(--color-text-light);background:var(--color-bg);border:1px solid var(--color-border);padding:1px 6px;border-radius:4px;white-space:nowrap;">${esc(sk)}</span>`).join('')}
        </div>
      </div>
    </div>`).join('');

  area.innerHTML = `
    <div style="margin-top:var(--space-lg);border:2px solid var(--color-primary);border-radius:var(--radius-lg);padding:var(--space-lg);background:var(--color-card);overflow:hidden;">
      <h3 style="margin:0 0 var(--space-md);font-size:1.1rem;">📋 课程大纲预览</h3>
      ${items}

      <div style="margin-top:var(--space-lg);padding-top:var(--space-md);border-top:1px dashed var(--color-border);">
        <div style="font-weight:700;margin-bottom:4px;">🧐 先核实一下，再决定</div>
        <p style="font-size:0.78rem;color:var(--color-text-light);margin:0 0 12px;line-height:1.5;">
          创建前，帮你确认这套课程靠不靠谱：① 对照该 CEFR 等级的语法蓝图看覆盖是否到位；② 可试生成第 1 单元、亲眼看看题目质量。
        </p>
        <div id="currCoverage"></div>
        <button class="btn btn--outline btn--block" id="currTrialBtn" style="margin-top:12px;">🔍 试生成第 1 单元，看看真实题目</button>
        <div id="currTrialArea" style="margin-top:10px;"></div>
      </div>

      <div style="margin-top:var(--space-lg);display:flex;gap:var(--space-md);">
        <button class="btn btn--primary" id="currConfirmBtn" style="flex:1;">✅ 确认并创建课程</button>
        <button class="btn btn--outline" id="currRegenBtn">🔄 重新生成</button>
      </div>
    </div>`;

  // ① 考纲覆盖核对 —— 自动跑一次，把「是否覆盖到位」明示给家长
  runCoverageCheck(goal, (profile && profile.cefr) || '', syllabus);
  // ② 试生成第 1 单元
  document.getElementById('currTrialBtn')?.addEventListener('click', () => runTrialUnit(syllabus[0], material, (profile && profile.cefr) || ''));

  document.getElementById('currConfirmBtn')?.addEventListener('click', () => {
    const title = document.getElementById('currTitleInput')?.value.trim() || goal || '我的课程';
    const descParts = [goal || '（据上传素材生成）'];
    if (profile && (profile.grade || profile.level)) {
      descParts.push([profile.grade, profile.level].filter(Boolean).join('·'));
    }
    const id = 'curr_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
    store.addCurriculum(id, {
      title,
      description: descParts.filter(Boolean).join(' · '),
      goal,
      material,
      profile: profile || null,
      syllabus,
    });
    store.switchCurriculum(id);
    showPostCreate(title);
  });

  document.getElementById('currRegenBtn')?.addEventListener('click', () => {
    area.innerHTML = '';
    const genBtn = document.getElementById('currGenBtn');
    if (genBtn) {
      genBtn.disabled = false;
      genBtn.textContent = '🤖 生成课程大纲';
      genBtn.click();
    }
  });

  // Hide the original generate button
  const genArea = document.getElementById('currGenArea');
  if (genArea) genArea.style.display = 'none';
}

// 把覆盖核对结果渲染进 host。deterministic=true 时标注为「逐条比对固定蓝图」。
function renderCoverageBox(host, cov, cefr, deterministic) {
  const points = cov.points || [];
  const coveredN = points.filter(p => p.covered).length;
  const rows = points.map(p => `
    <div style="display:flex;gap:8px;align-items:baseline;padding:3px 0;">
      <span>${p.covered ? '✅' : '❌'}</span>
      <span style="flex:1;min-width:0;">${esc(p.point)}</span>
      <span style="color:var(--color-muted);font-size:0.72rem;white-space:nowrap;">${p.covered ? ('第 ' + (p.unit || '?') + ' 单元') : '未覆盖'}</span>
    </div>`).join('');
  const gaps = (cov.gaps || []).length
    ? `<div style="color:var(--color-danger);font-size:0.8rem;margin-top:8px;">⚠️ 待补齐：${cov.gaps.map(esc).join('、')}</div>`
    : '';
  const source = deterministic
    ? `对照固定 ${esc(cefr || '')} 语法蓝图 · 逐条比对`
    : `AI 对照 CEFR 语法点`;
  host.innerHTML = `
    <div style="border:1px solid var(--color-border);border-radius:10px;padding:14px;background:var(--color-bg);">
      <div style="font-weight:700;margin-bottom:2px;">✅ 语法覆盖核对 · 覆盖 ${coveredN}/${points.length} 项</div>
      <div style="font-size:0.7rem;color:var(--color-muted);margin-bottom:8px;">${source}</div>
      <div style="font-size:0.82rem;color:var(--color-text-light);margin-bottom:8px;">${esc(cov.summary || '')}</div>
      ${rows}
      ${gaps}
    </div>`;
}

// ① 语法覆盖核对：已知 CEFR 等级 → 对照内置蓝图做「确定性比对」（无需 AI）；
// 自定义目标（无固定蓝图）→ 退回 AI 核对。
async function runCoverageCheck(goal, cefr, syllabus) {
  const host = document.getElementById('currCoverage');
  if (!host) return;

  if (cefr && hasBlueprint(cefr)) {
    const cov = deterministicCoverage(cefr, syllabus);
    renderCoverageBox(host, cov, cefr, true);
    return;
  }

  host.innerHTML = `<div style="font-size:0.82rem;color:var(--color-secondary-dark);">🔎 正在对照 CEFR 语法点核对覆盖…</div>`;
  try {
    const cov = await generateCoverage(goal, cefr, syllabus);
    renderCoverageBox(host, cov, cefr, false);
  } catch (e) {
    host.innerHTML = `<div style="font-size:0.8rem;color:var(--color-danger);">覆盖核对失败：${esc(friendlyAiError(e))} <button class="btn btn--tiny btn--outline" id="covRetry">重试</button></div>`;
    document.getElementById('covRetry')?.addEventListener('click', () => runCoverageCheck(goal, cefr, syllabus));
  }
}

// 把一道题渲染成简短可读的一行（供试生成预览）。
function briefQuestion(q) {
  const typeName = { choice: '选择', fill: '填空', reorder: '排序', error: '纠错', match: '配对', scenario: '情景' }[q.type] || q.type;
  let body = q.sentence || q.instruction || (Array.isArray(q.words) ? q.words.join(' ') : '') || '';
  let ans = '';
  if (q.type === 'choice' || q.type === 'scenario') {
    if (Array.isArray(q.options)) body += `　【${q.options.join(' / ')}】`;
    ans = (q.options || [])[q.correctIndex] || '';
  } else if (q.type === 'fill') {
    ans = (q.acceptableAnswers && q.acceptableAnswers.length ? q.acceptableAnswers : [q.answer || q.correctAnswer]).filter(Boolean).join(' / ');
  } else if (q.type === 'reorder') {
    ans = q.correctSentence || '';
  } else if (q.type === 'error') {
    ans = q.correction || '';
  }
  return `<div style="padding:6px 0;border-top:1px dashed var(--color-border);font-size:0.82rem;line-height:1.5;">
    <span style="color:var(--color-secondary);font-weight:600;">[${typeName}]</span> ${esc(body)}
    ${ans ? `<div style="color:var(--color-primary-dark);font-size:0.76rem;margin-top:2px;">答案：${esc(ans)}</div>` : ''}
  </div>`;
}

// 把自动校验报告渲染成一段可读的说明（供家长看到「第二个 AI 已复核」）。
function renderVerifyNote(v) {
  if (!v) return '';
  if (v.error) {
    return `<div style="font-size:0.72rem;color:var(--color-muted);margin-top:8px;">🤖 自动复核未完成：${esc(v.error)}</div>`;
  }
  const dropped = v.dropped || 0;
  const badge = dropped > 0
    ? `<span style="color:var(--color-secondary-dark);">已自动剔除 ${dropped} 道有疑问的题</span>`
    : `<span style="color:var(--color-primary-dark);">全部通过复核</span>`;
  return `<div style="margin-top:10px;padding:8px 10px;border-radius:8px;background:var(--color-bg-soft, rgba(0,0,0,0.03));font-size:0.76rem;line-height:1.5;">
    🤖 <b>第二个 AI 校验员</b>已用全新视角逐题复核：${badge}。
    <div style="color:var(--color-muted);margin-top:2px;">${esc(v.summary || '')}</div>
  </div>`;
}

// ② 试生成第 1 单元：真实生成一个单元的内容（不落库），把真题摆给家长看。
async function runTrialUnit(sylItem, material, cefr = '') {
  const btn = document.getElementById('currTrialBtn');
  const host = document.getElementById('currTrialArea');
  if (!sylItem || !host) return;
  if (btn) { btn.disabled = true; btn.innerHTML = '<span class="ce-spinner" style="display:inline-block;width:14px;height:14px;margin-right:6px;vertical-align:middle;"></span> 正在试生成第 1 单元并自动复核（约 30–120 秒）…'; }
  try {
    const data = await generateUnitPreview(sylItem, material, cefr);
    const story = (data.discover && data.discover.story) || {};
    const tip = (data.discover && data.discover.tip) || '';
    const lv1 = (data.levels && (data.levels['1'] || data.levels[1])) || [];
    const samples = lv1.slice(0, 3).map(briefQuestion).join('');
    host.innerHTML = `
      <div style="border:1px solid var(--color-border);border-radius:10px;padding:14px;background:var(--color-bg);">
        <div style="font-weight:700;margin-bottom:6px;">📖 第 1 单元 · 试生成结果（仅预览，不影响课程）</div>
        ${story.title ? `<div style="font-weight:600;font-size:0.9rem;">${esc(story.title)}</div>` : ''}
        ${story.text ? `<div style="font-size:0.8rem;color:var(--color-text-light);margin:4px 0;line-height:1.5;">${esc(String(story.text).slice(0, 160))}…</div>` : ''}
        ${tip ? `<div style="font-size:0.8rem;color:var(--color-secondary-dark);margin:4px 0;">💡 ${esc(tip)}</div>` : ''}
        <div style="font-weight:600;font-size:0.82rem;margin-top:8px;">练习题样例：</div>
        ${samples || '<div style="font-size:0.8rem;color:var(--color-muted);">（本单元第 1 关暂无题目样例）</div>'}
        ${renderVerifyNote(data._verify)}
        <div style="font-size:0.72rem;color:var(--color-muted);margin-top:8px;">题目质量满意就「确认并创建」；不满意可「重新生成」大纲。</div>
      </div>`;
    if (btn) { btn.style.display = 'none'; }
  } catch (e) {
    if (host) host.innerHTML = `<div style="font-size:0.8rem;color:var(--color-danger);">试生成失败：${esc(friendlyAiError(e))}</div>`;
    if (btn) { btn.disabled = false; btn.innerHTML = '🔍 重试：试生成第 1 单元'; }
  }
}

// 课程创建成功后：询问是否立即批量生成全部单元。
function showPostCreate(title) {
  const host = document.getElementById('currCreator');
  if (!host) { goHome(); return; }
  host.outerHTML = '<div id="postCreateHost"></div>';
  const ph = document.getElementById('postCreateHost');
  ph.innerHTML = `<div class="parent-card parent-card--wide" style="text-align:center;">
    <div class="parent-icon">✅</div>
    <h2>课程已创建</h2>
    <p class="parent-desc">《${esc(title)}》已添加并设为当前课程。<br>
    是否现在就生成全部 12 个单元的练习题？也可以稍后等孩子进入某个单元时再单独生成。</p>
    <div style="display:flex;gap:var(--space-md);justify-content:center;flex-wrap:wrap;margin-top:var(--space-lg);">
      <button class="btn btn--primary" id="genAllNowBtn">🤖 一键生成全部单元</button>
      <button class="btn btn--outline" id="genLaterBtn">稍后再说</button>
    </div>
  </div>`;
  document.getElementById('genLaterBtn')?.addEventListener('click', goHome);
  document.getElementById('genAllNowBtn')?.addEventListener('click', () => renderAndRunBatch(ph, title));
}

// --- Learning Report ---

function renderReport() {
  const player = store.state.player;
  const history = store.state.history;
  const mastery = store.state.mastery;
  const mistakes = store.state.mistakes || [];

  // --- (a) Overview stats ---
  const totalScore = player.totalScore;
  const currentStreak = player.currentStreak;
  const accuracyRate = store.getAccuracyRate();
  const accuracyPct = Math.round(accuracyRate * 100);

  // Count completed levels across all units
  let completedLevels = 0;
  for (let u = 1; u <= 12; u++) {
    const unit = store.state.units[u];
    if (!unit) continue;
    for (let lv = 1; lv <= 5; lv++) {
      if (unit.practiceLevels[lv]?.completed) completedLevels++;
    }
  }

  // --- (b) Last 7 days activity ---
  const dayLabels = [];
  const dayCounts = [];
  let maxDayCount = 0;
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const month = d.getMonth() + 1;
    const day = d.getDate();
    dayLabels.push(`${month}/${day}`);
    const count = history.filter(h => h.date === dateStr).length;
    dayCounts.push(count);
    if (count > maxDayCount) maxDayCount = count;
  }

  const chartBarMax = Math.max(maxDayCount, 1);
  const chartBars = dayCounts.map((count, idx) => {
    const heightPct = Math.round((count / chartBarMax) * 100);
    const barColor = count > 0 ? '#4caf50' : '#e0e0e0';
    return `<div style="display:flex;flex-direction:column;align-items:center;flex:1;gap:4px;">
      <span style="font-size:0.75rem;color:#666;">${count}</span>
      <div style="width:24px;background:${barColor};border-radius:4px 4px 0 0;height:${Math.max(heightPct, 4)}px;min-height:4px;transition:height 0.3s;"></div>
      <span style="font-size:0.7rem;color:#999;">${dayLabels[idx]}</span>
    </div>`;
  }).join('');

  // --- (c) Mastery breakdown ---
  const masteryEntries = Object.entries(mastery)
    .map(([skill, data]) => ({
      skill,
      name: SUB_SKILL_NAMES[skill] || skill,
      mastery: Math.round((data.mastery || 0) * 100),
      attempts: data.attempts || 0,
    }))
    .sort((a, b) => a.mastery - b.mastery);

  const masteryRows = masteryEntries.length > 0
    ? masteryEntries.map(entry => {
        let color = '#4caf50'; // green
        if (entry.mastery < 50) color = '#f44336'; // red
        else if (entry.mastery < 80) color = '#ff9800'; // yellow/orange
        return `<div style="display:flex;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid #f0f0f0;">
          <div style="flex:1;min-width:0;">
            <div style="font-size:0.85rem;font-weight:500;color:#333;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(entry.name)}</div>
            <div style="font-size:0.7rem;color:#999;">${entry.attempts} 次练习</div>
          </div>
          <div style="width:100px;flex-shrink:0;">
            <div style="background:#e0e0e0;border-radius:4px;height:8px;overflow:hidden;">
              <div style="background:${color};height:100%;width:${entry.mastery}%;border-radius:4px;transition:width 0.3s;"></div>
            </div>
          </div>
          <span style="font-size:0.85rem;font-weight:600;color:${color};min-width:40px;text-align:right;">${entry.mastery}%</span>
        </div>`;
      }).join('')
    : '<p style="color:#999;font-size:0.85rem;">还没有掌握度数据，开始练习后这里会显示各技能掌握情况。</p>';

  // --- (d) Weakest skills ---
  const weakest = store.getWeakestSkills(5);
  const weakestSection = weakest.length > 0
    ? `<div style="background:#fff3e0;border:1px solid #ffe0b2;border-radius:8px;padding:16px;">
        <h3 style="margin:0 0 12px;font-size:1rem;color:#e65100;">⚠️ 薄弱环节（需重点加强）</h3>
        ${weakest.map(w => {
          const pct = Math.round((w.mastery || 0) * 100);
          return `<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;">
            <span style="font-size:0.85rem;color:#333;">${esc(SUB_SKILL_NAMES[w.skill] || w.skill)}</span>
            <span style="font-size:0.85rem;font-weight:600;color:#f44336;">${pct}%</span>
          </div>`;
        }).join('')}
      </div>`
    : '';

  // --- (e) Recent 10 sessions ---
  const recentSessions = [...history].reverse().slice(0, 10);
  const sessionRows = recentSessions.length > 0
    ? recentSessions.map(s => {
        const unitTitle = curriculum.getUnit(s.unitId)?.title || `单元 ${s.unitId}`;
        const starsDisplay = '⭐'.repeat(s.stars || 0);
        const accPct = s.accuracy != null ? Math.round(s.accuracy * 100) : (s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0);
        return `<tr>
          <td style="padding:8px 6px;font-size:0.8rem;color:#666;">${esc(s.date || '')}</td>
          <td style="padding:8px 6px;font-size:0.8rem;">${esc(unitTitle)} Lv.${s.level || '-'}</td>
          <td style="padding:8px 6px;font-size:0.8rem;">${starsDisplay || '-'}</td>
          <td style="padding:8px 6px;font-size:0.8rem;text-align:right;">${accPct}%</td>
          <td style="padding:8px 6px;font-size:0.8rem;text-align:right;font-weight:600;">${s.score || 0}</td>
        </tr>`;
      }).join('')
    : '<tr><td colspan="5" style="padding:16px;text-align:center;color:#999;font-size:0.85rem;">暂无练习记录</td></tr>';

  // --- (f) Mistake notebook summary ---
  const mistakeCount = mistakes.length;
  const recentMistakes = [...mistakes].reverse().slice(0, 5);
  const mistakeRows = recentMistakes.length > 0
    ? recentMistakes.map(m => {
        const q = m.question || {};
        const text = q.sentence || q.instruction || q.context || '(无题目内容)';
        return `<div style="padding:8px 0;border-bottom:1px solid #f0f0f0;">
          <div style="font-size:0.8rem;color:#333;line-height:1.4;">${esc(text)}</div>
          <div style="font-size:0.7rem;color:#999;margin-top:2px;">${esc(m.date || '')} · 单元 ${m.unitId || '?'} Lv.${m.level || '?'}</div>
        </div>`;
      }).join('')
    : '<p style="color:#999;font-size:0.85rem;">错题本是空的，太棒了！</p>';

  // --- (g) Summary header: 学员 / 时段 / 预估达成度 / 小结 ---
  const studentName = (player.name && player.name.trim()) || (store.account && store.account.name) || '学员';
  const activeId = store.state.activeCurriculumId;
  const activeGoal = (store.state.curricula?.[activeId]?.goal || '').trim();
  const dates = history.map(h => h.date).filter(Boolean).sort();
  const firstDate = dates[0] || '';
  const lastDate = dates[dates.length - 1] || '';
  const activeDays = new Set(dates).size;
  const totalSessions = history.length;
  const weekCount = dayCounts.reduce((a, b) => a + b, 0);
  const mVals = Object.values(mastery).map(d => d.mastery || 0);
  const avgMastery = mVals.length ? mVals.reduce((a, b) => a + b, 0) / mVals.length : 0;
  const completion = completedLevels / 60;
  const achievePct = totalSessions
    ? Math.round(100 * (0.5 * avgMastery + 0.3 * accuracyRate + 0.2 * completion))
    : null;
  const levelLabel = achievePct == null ? '—'
    : achievePct >= 80 ? '优秀' : achievePct >= 60 ? '熟练' : achievePct >= 40 ? '基础' : '入门';
  let summaryText;
  if (!totalSessions) {
    summaryText = '还没有练习记录。完成第一课后，这里会自动生成学习小结与建议。';
  } else {
    const weakName = weakest[0] ? (SUB_SKILL_NAMES[weakest[0].skill] || weakest[0].skill) : '';
    const advice = accuracyPct >= 85 ? '掌握得很扎实，可以挑战更高难度或进入复习巩固'
      : accuracyPct >= 65 ? '整体不错，建议多练薄弱环节后稳步推进'
      : '建议放慢进度、重点复习错题与薄弱技能';
    summaryText = `近 7 天练习 ${weekCount} 次、累计 ${totalSessions} 次，综合正确率 ${accuracyPct}%`
      + (weakName ? `，目前最薄弱的是「${esc(weakName)}」` : '')
      + `。建议：${advice}。`;
  }
  const periodText = firstDate
    ? `${firstDate} 至 ${lastDate} · 活跃 ${activeDays} 天 · 共 ${totalSessions} 次练习`
    : '暂无练习记录';

  const summaryCard = `
    <div style="margin-top:20px;background:linear-gradient(135deg,#eef6ff,#f3f0ff);border:1px solid #dfe7f5;border-radius:12px;padding:18px 20px;">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:10px;">
        <div>
          <div style="font-size:1.05rem;font-weight:700;color:#1a3a5c;">👦 ${esc(studentName)}</div>
          <div style="font-size:0.8rem;color:#5a6b82;margin-top:2px;">课程：${esc(curriculum.getActiveTitle())}${activeGoal ? ` · 目标：${esc(activeGoal)}` : ''}</div>
          <div style="font-size:0.78rem;color:#7a8aa0;margin-top:4px;">学习时段：${esc(periodText)}</div>
        </div>
        <div style="text-align:center;background:#fff;border-radius:10px;padding:10px 16px;box-shadow:0 1px 3px rgba(0,0,0,0.06);">
          <div style="font-size:0.72rem;color:#888;">预估达成度</div>
          <div style="font-size:1.6rem;font-weight:800;color:#1976d2;line-height:1.1;">${achievePct == null ? '—' : achievePct + '%'}</div>
          <div style="font-size:0.72rem;color:#666;">${levelLabel}</div>
        </div>
      </div>
      <p style="margin:12px 0 0;font-size:0.85rem;line-height:1.6;color:#374a63;">📝 ${summaryText}</p>
      <p style="margin:6px 0 0;font-size:0.68rem;color:#9aa7b8;">* 达成度为综合掌握度、正确率与完成进度的估算，仅供参考。</p>
    </div>`;

  return `<div class="parent-card parent-card--wide" id="reportContent">
    <div class="parent-header">
      <button class="btn btn--small btn--outline" id="reportBackBtn">← 返回</button>
      <h2 style="margin:0;">📊 学习报告</h2>
      <div></div>
    </div>

    ${summaryCard}

    <!-- (a) Overview -->
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:12px;margin-top:20px;">
      <div style="background:#f5f5f5;border-radius:8px;padding:16px;text-align:center;">
        <div style="font-size:1.5rem;font-weight:700;color:#1976d2;">${totalScore}</div>
        <div style="font-size:0.8rem;color:#666;margin-top:4px;">总积分</div>
      </div>
      <div style="background:#f5f5f5;border-radius:8px;padding:16px;text-align:center;">
        <div style="font-size:1.5rem;font-weight:700;color:#e65100;">${currentStreak}</div>
        <div style="font-size:0.8rem;color:#666;margin-top:4px;">连续天数</div>
      </div>
      <div style="background:#f5f5f5;border-radius:8px;padding:16px;text-align:center;">
        <div style="font-size:1.5rem;font-weight:700;color:#2e7d32;">${accuracyPct}%</div>
        <div style="font-size:0.8rem;color:#666;margin-top:4px;">综合正确率</div>
      </div>
      <div style="background:#f5f5f5;border-radius:8px;padding:16px;text-align:center;">
        <div style="font-size:1.5rem;font-weight:700;color:#6a1b9a;">${completedLevels}</div>
        <div style="font-size:0.8rem;color:#666;margin-top:4px;">已完成课程</div>
      </div>
    </div>

    <!-- (b) 7-day trend -->
    <div style="margin-top:24px;">
      <h3 style="font-size:1rem;margin:0 0 12px;color:#333;">学习趋势（近7天）</h3>
      <div style="background:#fafafa;border-radius:8px;padding:16px;">
        <div style="display:flex;align-items:flex-end;height:100px;gap:4px;">
          ${chartBars}
        </div>
      </div>
    </div>

    <!-- (c) Mastery breakdown -->
    <div style="margin-top:24px;">
      <h3 style="font-size:1rem;margin:0 0 12px;color:#333;">语法掌握度</h3>
      <div style="max-height:300px;overflow-y:auto;">
        ${masteryRows}
      </div>
    </div>

    <!-- (d) Weakest skills -->
    ${weakestSection ? `<div style="margin-top:24px;">${weakestSection}</div>` : ''}

    <!-- (e) Recent sessions -->
    <div style="margin-top:24px;">
      <h3 style="font-size:1rem;margin:0 0 12px;color:#333;">最近练习记录</h3>
      <div style="overflow-x:auto;">
        <table style="width:100%;border-collapse:collapse;">
          <thead>
            <tr style="border-bottom:2px solid #e0e0e0;">
              <th style="padding:8px 6px;text-align:left;font-size:0.75rem;color:#999;font-weight:600;">日期</th>
              <th style="padding:8px 6px;text-align:left;font-size:0.75rem;color:#999;font-weight:600;">课程</th>
              <th style="padding:8px 6px;text-align:left;font-size:0.75rem;color:#999;font-weight:600;">星级</th>
              <th style="padding:8px 6px;text-align:right;font-size:0.75rem;color:#999;font-weight:600;">正确率</th>
              <th style="padding:8px 6px;text-align:right;font-size:0.75rem;color:#999;font-weight:600;">得分</th>
            </tr>
          </thead>
          <tbody>
            ${sessionRows}
          </tbody>
        </table>
      </div>
    </div>

    <!-- (f) Mistakes -->
    <div style="margin-top:24px;">
      <h3 style="font-size:1rem;margin:0 0 12px;color:#333;">错题本概况</h3>
      <p style="font-size:0.85rem;color:#666;margin:0 0 8px;">共 ${mistakeCount} 道错题</p>
      ${mistakeRows}
    </div>
  </div>`;
}

function mountReport() {
  document.getElementById('reportBackBtn')?.addEventListener('click', () => {
    location.hash = 'parent';
  });
}

function mountSetup() {
  const btn = document.getElementById('setupBtn');
  const msg = document.getElementById('parentMsg');
  if (!btn) return;

  btn.addEventListener('click', async () => {
    const pin = document.getElementById('pinInput').value;
    const confirm = document.getElementById('pinConfirm').value;
    msg.textContent = '';
    msg.className = 'parent-msg';

    if (!/^\d{6}$/.test(pin)) {
      msg.textContent = '请输入6位数字';
      msg.classList.add('parent-msg--error');
      return;
    }
    if (pin !== confirm) {
      msg.textContent = '两次输入不一致';
      msg.classList.add('parent-msg--error');
      return;
    }

    btn.disabled = true;
    btn.textContent = '设置中…';
    try {
      const h = await sha256(pin);
      await cloud.saveParentPin(h);
      setUnlocked();
      const zone = btn.closest('.parent-zone') || btn.closest('.parent-card').parentElement;
      zone.innerHTML = renderDashboard();
      mountDashboard();
    } catch (e) {
      msg.textContent = '保存失败：' + e.message;
      msg.classList.add('parent-msg--error');
      btn.disabled = false;
      btn.textContent = '确认设置';
    }
  });
}

function mountLocked(storedHash) {
  const btn = document.getElementById('verifyBtn');
  const msg = document.getElementById('parentMsg');
  const pinInput = document.getElementById('pinInput');
  if (!btn) return;

  async function verify() {
    const pin = pinInput.value;
    msg.textContent = '';
    msg.className = 'parent-msg';

    if (getActiveLockout()) {
      const card = btn.closest('.parent-card');
      if (card) card.outerHTML = renderLocked();
      return;
    }
    if (!pin) {
      msg.textContent = '请输入密码';
      msg.classList.add('parent-msg--error');
      return;
    }

    const h = await sha256(pin);
    if (h === storedHash) {
      clearLockout();
      setUnlocked();
      const zone = btn.closest('.parent-zone') || btn.closest('.parent-card').parentElement;
      zone.innerHTML = renderDashboard();
      mountDashboard();
    } else {
      const rec = recordFailedAttempt();
      if (rec.until) {
        // 刚触发锁定：切到锁定倒计时界面。
        const card = btn.closest('.parent-card');
        if (card) card.outerHTML = renderLocked();
      } else {
        msg.textContent = `密码错误（${rec.count}/${MAX_ATTEMPTS}）`;
        msg.classList.add('parent-msg--error');
        pinInput.value = '';
        pinInput.focus();
      }
    }
  }

  btn.addEventListener('click', verify);
  if (pinInput) pinInput.addEventListener('keydown', e => { if (e.key === 'Enter') verify(); });

  const resetLink = document.getElementById('resetLink');
  if (resetLink) resetLink.addEventListener('click', () => { location.hash = 'parent/reset'; });
}

function mountDashboard() {
  document.getElementById('lockBtn')?.addEventListener('click', () => { clearUnlock(); location.hash = ''; });
  document.getElementById('changePinBtn')?.addEventListener('click', () => { location.hash = 'parent/reset'; });
  // 「创建课程」「学习报告」现为原生 <a href> 链接，靠浏览器导航，不依赖 JS 绑定（更稳）。

  document.querySelectorAll('[data-switch-curr]').forEach(btn => {
    btn.addEventListener('click', () => {
      store.switchCurriculum(btn.dataset.switchCurr);
      location.hash = 'parent';
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    });
  });

  document.querySelectorAll('[data-genall-curr]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.genallCurr;
      store.switchCurriculum(id); // 确保是当前课程（已是则无操作）
      const card = document.getElementById('dashboardCard');
      const host = card?.parentElement;
      if (host) renderAndRunBatch(host, curriculum.getActiveTitle());
    });
  });

  document.querySelectorAll('[data-del-curr]').forEach(btn => {
    btn.addEventListener('click', () => {
      if (!confirm('确定删除这个课程体系？相关学习进度也会清除。')) return;
      store.removeCurriculum(btn.dataset.delCurr);
      location.hash = 'parent';
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    });
  });
}

function mountReset() {
  const btn = document.getElementById('resetBtn');
  const backLink = document.getElementById('backLink');
  const msg = document.getElementById('parentMsg');
  if (!btn) return;

  btn.addEventListener('click', async () => {
    const pwd = document.getElementById('accountPwd').value;
    const pin = document.getElementById('newPin').value;
    const confirm = document.getElementById('newPinConfirm').value;
    msg.textContent = '';
    msg.className = 'parent-msg';

    if (!pwd) { msg.textContent = '请输入账号密码'; msg.classList.add('parent-msg--error'); return; }
    if (!/^\d{6}$/.test(pin)) { msg.textContent = '家长密码需为6位数字'; msg.classList.add('parent-msg--error'); return; }
    if (pin !== confirm) { msg.textContent = '两次输入不一致'; msg.classList.add('parent-msg--error'); return; }

    btn.disabled = true;
    btn.textContent = '验证中…';
    try {
      const email = store.account && store.account.email;
      if (!email) throw new Error('未找到账号信息');
      await cloud.signIn(email, pwd);
      const h = await sha256(pin);
      await cloud.saveParentPin(h);
      clearLockout();
      setUnlocked();
      msg.textContent = '家长密码已重置';
      msg.classList.add('parent-msg--success');
      setTimeout(() => { location.hash = 'parent'; }, 800);
    } catch (e) {
      msg.textContent = friendlyError(e);
      msg.classList.add('parent-msg--error');
      btn.disabled = false;
      btn.textContent = '验证并重置';
    }
  });

  if (backLink) backLink.addEventListener('click', () => { location.hash = 'parent'; });
}
