import { store } from '../store.js';
import { cloud, friendlyError } from '../cloud.js';
import * as courseEditor from './courseEditor.js';

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
  const packList = packs && packs.length
    ? packs.map(p => {
        const count = Array.isArray(p.questions) ? p.questions.length : 0;
        const date = (p.updated_at || '').slice(0, 10);
        return `<div class="ce-pack-item">
          <div class="ce-pack-info">
            <strong>📦 ${esc(p.title)}</strong>
            <span class="ce-pack-meta">${count} 题 · ${date}</span>
            ${p.description ? `<span class="ce-pack-desc">${esc(p.description)}</span>` : ''}
          </div>
          <div class="ce-pack-btns">
            <button class="btn btn--tiny" onclick="location.hash='parent/edit/${p.id}'">编辑</button>
            <button class="btn btn--tiny btn--danger-text" data-del-pack="${p.id}">删除</button>
          </div>
        </div>`;
      }).join('')
    : '<p class="ce-empty">还没有课程包，点上方按钮创建第一个吧</p>';

  return `<div class="parent-card parent-card--wide">
    <div class="parent-header">
      <h2>🏠 家长专区</h2>
      <button class="btn btn--small btn--outline" id="lockBtn" onclick="location.hash=''">🔒 退出专区</button>
    </div>
    <div class="ce-section">
      <div class="ce-section-header">
        <h3>我的课程包</h3>
        <button class="btn btn--primary btn--small" id="newPackBtn" onclick="location.hash='parent/new'">+ 创建课程包</button>
      </div>
      ${packList}
    </div>
    <div class="parent-grid" style="margin-top:var(--space-lg)">
      <div class="parent-feature">
        <div class="parent-feature-icon">🤖</div>
        <h3>AI 生成课程</h3>
        <p>上传文档或输入主题，AI 自动生成练习题</p>
        <span class="parent-coming">即将上线</span>
      </div>
      <div class="parent-feature">
        <div class="parent-feature-icon">📊</div>
        <h3>学习报告</h3>
        <p>查看孩子的学习进度和薄弱环节分析</p>
        <span class="parent-coming">即将上线</span>
      </div>
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
    const target = document.getElementById('ceRoot') || document.getElementById('parentContent') || el;
    target.innerHTML = `<div class="parent-icon">⚠️</div>
      <p>加载失败：${msg}</p>
      <button class="btn btn--primary" onclick="location.reload()">重试</button>`;
  }

  try {
    if (isUnlocked()) {
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
  document.getElementById('newPackBtn')?.addEventListener('click', () => { location.hash = 'parent/new'; });

  document.querySelectorAll('[data-edit-pack]').forEach(btn => {
    btn.addEventListener('click', () => { location.hash = 'parent/edit/' + btn.dataset.editPack; });
  });

  document.querySelectorAll('[data-del-pack]').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('确定删除这个课程包？')) return;
      btn.disabled = true;
      try {
        await cloud.deleteCoursePack(btn.dataset.delPack);
        location.hash = 'parent';
        const el = document.querySelector('.parent-card');
        if (el) {
          el.innerHTML = '<div class="parent-icon">⏳</div><p>刷新中…</p>';
          const packs = await cloud.listCoursePacks();
          el.outerHTML = renderDashboard(packs);
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
