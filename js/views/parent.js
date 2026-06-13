import { store } from '../store.js';
import { cloud, friendlyError } from '../cloud.js';
import * as courseEditor from './courseEditor.js';
import { SUB_SKILL_NAMES } from '../data/skill-names.js';
import { curriculum, BUILT_IN_ID } from '../curriculum.js';
import { generateSyllabus, hasApiKey } from '../unitGenerator.js';

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

function renderDashboard(packs) {
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
          ? '<span class="badge badge--success" style="font-size:0.75rem;">使用中</span>'
          : `<button class="btn btn--tiny btn--primary" data-switch-curr="${c.id}">切换</button>`}
        ${!c.builtIn ? `<button class="btn btn--tiny btn--danger-text" data-del-curr="${c.id}">删除</button>` : ''}
      </div>
    </div>`;
  }).join('');

  // Course packs section (backward compat)
  let packSection = '';
  if (packs && packs.length) {
    const packItems = packs.map(p => {
      const count = Array.isArray(p.questions) ? p.questions.length : 0;
      return `<div class="ce-pack-item">
        <div class="ce-pack-info">
          <strong>📦 ${esc(p.title)}</strong>
          <span class="ce-pack-meta">${count} 题</span>
        </div>
        <div class="ce-pack-btns">
          <button class="btn btn--tiny" data-edit-pack="${p.id}">编辑</button>
          <button class="btn btn--tiny btn--danger-text" data-del-pack="${p.id}">删除</button>
        </div>
      </div>`;
    }).join('');
    packSection = `
      <div class="ce-section" style="margin-top:var(--space-lg)">
        <div class="ce-section-header"><h3>📦 独立课程包</h3></div>
        ${packItems}
      </div>`;
  }

  return `<div class="parent-card parent-card--wide">
    <div class="parent-header">
      <h2>🏠 家长专区</h2>
      <button class="btn btn--small btn--outline" id="lockBtn">🔒 退出专区</button>
    </div>

    <div class="ce-section">
      <div class="ce-section-header">
        <h3>📚 课程体系</h3>
        <span style="font-size:0.8rem;color:var(--color-text-light);">当前：${esc(curriculum.getActiveTitle())}</span>
      </div>
      ${currItems}
    </div>

    <div class="parent-grid" style="margin-top:var(--space-lg)">
      <div class="parent-feature parent-feature--active" id="newCurrCard" style="cursor:pointer;">
        <div class="parent-feature-icon">🤖</div>
        <h3>AI 创建课程体系</h3>
        <p>输入学习目标，AI 自动生成完整 12 单元课程大纲</p>
        <span class="btn btn--primary btn--small" style="margin-top:var(--space-sm);">+ 创建课程体系</span>
      </div>
      <div class="parent-feature parent-feature--active" id="reportCard" style="cursor:pointer;">
        <div class="parent-feature-icon">📊</div>
        <h3>学习报告</h3>
        <p>查看孩子的学习进度和薄弱环节分析</p>
        <span class="btn btn--primary btn--small" style="margin-top:var(--space-sm);">查看报告</span>
      </div>
    </div>

    <div class="parent-grid" style="margin-top:var(--space-md)">
      <div class="parent-feature parent-feature--active" id="aiGenCard" style="cursor:pointer;">
        <div class="parent-feature-icon">📝</div>
        <h3>独立练习包</h3>
        <p>创建独立的 AI 练习题集（不影响课程体系）</p>
        <span class="btn btn--outline btn--small" style="margin-top:var(--space-sm);">创建课程包</span>
      </div>
    </div>

    ${packSection}

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
    const target = document.getElementById('ceRoot') || document.getElementById('parentContent') || el;
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
        let packs = [];
        try { packs = await cloud.listCoursePacks(); } catch (e2) { console.warn('Load packs failed:', e2.message); }
        el.outerHTML = renderDashboard(packs);
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

function renderCurriculumCreator() {
  return `<div class="parent-card parent-card--wide" id="currCreator">
    <div class="parent-header">
      <button class="btn btn--small btn--outline" id="currBackBtn">← 返回</button>
      <h2 style="margin:0;">🤖 AI 创建课程体系</h2>
      <div></div>
    </div>

    <div style="margin-top:var(--space-lg);">
      <p style="font-size:var(--text-sm);color:var(--color-text-light);margin-bottom:var(--space-md);line-height:1.6;">
        输入学习目标，AI 会自动设计一套 12 单元的课程大纲。<br>
        每个单元的练习题会在孩子第一次进入该单元时按需生成。
      </p>

      <div class="parent-field">
        <label>学习目标</label>
        <input type="text" id="currGoalInput" placeholder="例如：PET 语法训练 / 雅思5分语法 / KET 口语习题 / 新概念英语第二册语法">
      </div>

      <div class="parent-field">
        <label>课程名称（选填，默认使用目标作为名称）</label>
        <input type="text" id="currTitleInput" placeholder="例如：雅思5分冲刺">
      </div>

      <div id="currGenArea">
        <button class="btn btn--primary btn--block" id="currGenBtn" style="margin-top:var(--space-md);">
          🤖 生成课程大纲
        </button>
      </div>

      <div id="currMsg" style="margin-top:var(--space-md);"></div>
      <div id="currSyllabusArea"></div>
    </div>
  </div>`;
}

function mountCurriculumCreator() {
  document.getElementById('currBackBtn')?.addEventListener('click', () => {
    location.hash = 'parent';
  });

  const genBtn = document.getElementById('currGenBtn');
  if (!genBtn) return;

  genBtn.addEventListener('click', async () => {
    const goal = document.getElementById('currGoalInput')?.value.trim();
    const msg = document.getElementById('currMsg');
    if (!goal) {
      if (msg) msg.innerHTML = '<p style="color:var(--color-danger);font-size:var(--text-sm);">请输入学习目标</p>';
      return;
    }
    if (!hasApiKey()) {
      if (msg) msg.innerHTML = '<p style="color:var(--color-danger);font-size:var(--text-sm);">请先在「独立练习包」中配置 AI API key</p>';
      return;
    }

    genBtn.disabled = true;
    genBtn.innerHTML = '<span class="ce-spinner" style="display:inline-block;width:16px;height:16px;margin-right:8px;vertical-align:middle;"></span> AI 正在设计大纲…';
    if (msg) msg.innerHTML = '';

    try {
      const syllabus = await generateSyllabus(goal);
      renderSyllabusPreview(syllabus, goal);
    } catch (e) {
      genBtn.disabled = false;
      genBtn.textContent = '🤖 重试生成';
      if (msg) msg.innerHTML = `<p style="color:var(--color-danger);font-size:var(--text-sm);">生成失败：${esc(e.message)}</p>`;
    }
  });
}

function renderSyllabusPreview(syllabus, goal) {
  const area = document.getElementById('currSyllabusArea');
  if (!area) return;

  const items = syllabus.map((s, i) => `
    <div style="display:flex;gap:12px;padding:12px 0;border-bottom:1px solid #f0f0f0;">
      <div style="flex-shrink:0;width:36px;height:36px;border-radius:50%;background:var(--color-primary);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:0.85rem;">
        ${i + 1}
      </div>
      <div style="flex:1;min-width:0;">
        <div style="font-weight:600;font-size:0.95rem;">${esc(s.title)}</div>
        <div style="font-size:0.8rem;color:var(--color-text-light);margin-top:2px;">${esc(s.description)}</div>
        <div style="font-size:0.7rem;color:var(--color-muted);margin-top:4px;">
          ${(s.skills || []).map(sk => `<span style="background:#f0f0f0;padding:1px 6px;border-radius:3px;margin-right:4px;">${esc(sk)}</span>`).join('')}
        </div>
      </div>
    </div>`).join('');

  area.innerHTML = `
    <div style="margin-top:var(--space-lg);border:2px solid var(--color-primary);border-radius:var(--radius-lg);padding:var(--space-lg);">
      <h3 style="margin:0 0 var(--space-md);font-size:1.1rem;">📋 课程大纲预览</h3>
      ${items}
      <div style="margin-top:var(--space-lg);display:flex;gap:var(--space-md);">
        <button class="btn btn--primary" id="currConfirmBtn" style="flex:1;">✅ 确认并创建课程</button>
        <button class="btn btn--outline" id="currRegenBtn">🔄 重新生成</button>
      </div>
    </div>`;

  document.getElementById('currConfirmBtn')?.addEventListener('click', () => {
    const title = document.getElementById('currTitleInput')?.value.trim() || goal;
    const id = 'curr_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
    store.addCurriculum(id, { title, description: goal, goal, syllabus });
    store.switchCurriculum(id);
    location.hash = '';
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

  return `<div class="parent-card parent-card--wide" id="reportContent">
    <div class="parent-header">
      <button class="btn btn--small btn--outline" id="reportBackBtn">← 返回</button>
      <h2 style="margin:0;">📊 学习报告</h2>
      <div></div>
    </div>

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
      zone.innerHTML = '<div class="parent-card" style="text-align:center"><div class="parent-icon">⏳</div><p>加载中…</p></div>';
      let packs = [];
      try { packs = await cloud.listCoursePacks(); } catch { /* ignore */ }
      zone.innerHTML = renderDashboard(packs);
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
      zone.innerHTML = '<div class="parent-card" style="text-align:center"><div class="parent-icon">⏳</div><p>加载中…</p></div>';
      let packs = [];
      try { packs = await cloud.listCoursePacks(); } catch { /* ignore */ }
      zone.innerHTML = renderDashboard(packs);
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
  document.getElementById('aiGenCard')?.addEventListener('click', () => { location.hash = 'parent/new'; });
  document.getElementById('reportCard')?.addEventListener('click', () => { location.hash = 'parent/report'; });
  document.getElementById('newCurrCard')?.addEventListener('click', () => { location.hash = 'parent/curriculum'; });

  document.querySelectorAll('[data-switch-curr]').forEach(btn => {
    btn.addEventListener('click', () => {
      store.switchCurriculum(btn.dataset.switchCurr);
      location.hash = 'parent';
      window.dispatchEvent(new HashChangeEvent('hashchange'));
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

  document.querySelectorAll('[data-edit-pack]').forEach(btn => {
    btn.addEventListener('click', () => { location.hash = 'parent/edit/' + btn.dataset.editPack; });
  });

  document.querySelectorAll('[data-del-pack]').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('确定删除这个课程包？')) return;
      btn.disabled = true;
      try {
        await cloud.deleteCoursePack(btn.dataset.delPack);
        const card = document.querySelector('.parent-card');
        if (card) {
          card.innerHTML = '<div class="parent-icon">⏳</div><p>刷新中…</p>';
          const packs = await cloud.listCoursePacks();
          card.outerHTML = renderDashboard(packs);
          mountDashboard();
        }
      } catch (e) {
        alert('删除失败：' + e.message);
        btn.disabled = false;
      }
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
