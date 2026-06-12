import { store } from '../store.js';
import { cloud, friendlyError } from '../cloud.js';

const UNLOCK_KEY = 'gq-parent-unlocked';
const LOCKOUT_KEY = 'gq-parent-lockout';
const UNLOCK_MINUTES = 30;
const MAX_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 10;

async function sha256(str) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function isUnlocked() {
  try {
    const d = JSON.parse(sessionStorage.getItem(UNLOCK_KEY));
    return d && d.until > Date.now();
  } catch { return false; }
}
function setUnlocked() {
  sessionStorage.setItem(UNLOCK_KEY, JSON.stringify({ until: Date.now() + UNLOCK_MINUTES * 60000 }));
}
function clearUnlock() { sessionStorage.removeItem(UNLOCK_KEY); }

function getLockout() {
  try {
    const d = JSON.parse(sessionStorage.getItem(LOCKOUT_KEY));
    return d && d.until > Date.now() ? d : null;
  } catch { return null; }
}
function setLockout() {
  sessionStorage.setItem(LOCKOUT_KEY, JSON.stringify({ until: Date.now() + LOCKOUT_MINUTES * 60000 }));
}

let attemptCount = 0;

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
  const lockout = getLockout();
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
  return `<div class="parent-card parent-card--wide">
    <div class="parent-header">
      <h2>🏠 家长专区</h2>
      <button class="btn btn--small btn--outline" id="lockBtn">🔒 退出专区</button>
    </div>
    <div class="parent-grid">
      <div class="parent-feature">
        <div class="parent-feature-icon">📦</div>
        <h3>课程包管理</h3>
        <p>上传素材，创建和管理孩子的学习课程</p>
        <span class="parent-coming">即将上线</span>
      </div>
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

export function mount(sub) {
  if (!store.isLoggedIn()) return;
  if (sub === 'reset') { mountReset(); return; }
  loadAndRender();
}

async function loadAndRender() {
  const el = document.getElementById('parentContent');
  if (!el) return;

  try {
    if (isUnlocked()) {
      el.outerHTML = renderDashboard();
      mountDashboard();
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
    el.innerHTML = `<div class="parent-icon">⚠️</div>
      <p>加载失败：${e.message}</p>
      <button class="btn btn--primary" onclick="location.reload()">重试</button>`;
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

    if (getLockout()) {
      msg.textContent = '请稍后再试';
      msg.classList.add('parent-msg--error');
      return;
    }
    if (!pin) {
      msg.textContent = '请输入密码';
      msg.classList.add('parent-msg--error');
      return;
    }

    const h = await sha256(pin);
    if (h === storedHash) {
      attemptCount = 0;
      setUnlocked();
      const zone = btn.closest('.parent-zone') || btn.closest('.parent-card').parentElement;
      zone.innerHTML = renderDashboard();
      mountDashboard();
    } else {
      attemptCount++;
      if (attemptCount >= MAX_ATTEMPTS) {
        setLockout();
        attemptCount = 0;
        const card = btn.closest('.parent-card');
        if (card) { card.outerHTML = renderLocked(); }
      } else {
        msg.textContent = `密码错误（${attemptCount}/${MAX_ATTEMPTS}）`;
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
  const lockBtn = document.getElementById('lockBtn');
  if (lockBtn) lockBtn.addEventListener('click', () => { clearUnlock(); location.hash = ''; });

  const changePinBtn = document.getElementById('changePinBtn');
  if (changePinBtn) changePinBtn.addEventListener('click', () => { location.hash = 'parent/reset'; });
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
      clearUnlock();
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
