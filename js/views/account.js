import { store } from '../store.js';
import { cloudEnabled, friendlyError } from '../cloud.js';
import { takeReturn } from './gate.js';

export function render(sub) {
  // 云端未配置：只能本机使用。
  if (!cloudEnabled()) {
    return `
      <div class="view view-account">
        <div class="account-card">
          <div class="account-card__icon">📡</div>
          <div class="account-card__title">云端账号暂未开启</div>
          <p class="account-card__desc">
            目前学习进度只保存在这台设备上。开启云端账号后，小朋友就能在
            手机、平板、电脑之间同步学习记录啦。
          </p>
        </div>
      </div>`;
  }

  // 找回密码：用户点了邮件里的链接后进入"设置新密码"。
  if (sub === 'reset') {
    return `
      <div class="view view-account">
        <div class="account-card account-card--form">
          <div class="account-card__icon">🔑</div>
          <div class="account-card__title">设置新密码</div>
          <p class="account-card__desc">输入一个新密码，至少 6 个字符。</p>
          <label class="account-field">
            <span>新密码</span>
            <input type="password" id="newPass" placeholder="新密码" autocomplete="new-password" />
          </label>
          <label class="account-field">
            <span>再输一遍</span>
            <input type="password" id="newPass2" placeholder="再输一遍新密码" autocomplete="new-password" />
          </label>
          <div class="account-msg" id="accMsg"></div>
          <button class="btn btn--primary account-submit" id="resetSubmit">保存新密码</button>
        </div>
      </div>`;
  }

  // 已登录：显示账号信息 + 退出。
  if (store.isLoggedIn() && store.account) {
    const name = store.account.name;
    const email = store.account.email || '';
    return `
      <div class="view view-account">
        <div class="account-card">
          <div class="account-card__icon">🧒</div>
          <div class="account-card__title">你好，${escapeHtml(name)}！</div>
          <p class="account-card__desc">
            学习记录正在自动云端同步，换设备登录同一个账号就能接着学。
          </p>
          <div class="account-status">☁️ 已登录 · 自动同步中</div>
          ${email ? `<div class="account-hint">邮箱：${escapeHtml(email)}</div>` : ''}
          <button class="btn btn--secondary" id="logoutBtn" style="margin-top:var(--space-md);">退出登录</button>
          <p class="account-hint">退出后这台设备上只能看示例，重新登录就能接着学。</p>
        </div>
      </div>`;
  }

  // 未登录：登录/注册/忘记密码。#account/register 直接打开注册。
  const local = store.hasLocalProgress();
  return `
    <div class="view view-account">
      <div class="account-card">
        <div class="account-card__icon">${store.sessionExpired() ? '🔑' : '🚀'}</div>
        <div class="account-card__title">${store.sessionExpired() ? '登录已过期，请重新登录' : '注册后开始学习'}</div>
        <p class="account-card__desc">
          ${store.sessionExpired()
            ? '重新登录就能接着学。这台设备上还没上传的记录，登录后会一起同步到云端。'
            : `免费注册，只要一个家长邮箱。学习进度自动存到云端，手机、平板、电脑登录同一个账号都能接着学。
          ${local ? '<br>这台设备上以前做过的练习还在，注册后会一起带进新账号。' : ''}`}
        </p>
      </div>

      <div class="account-card account-card--form">
        <div class="account-tabs">
          <button class="account-tab account-tab--active" data-tab="login">登录</button>
          <button class="account-tab" data-tab="register">注册新账号</button>
        </div>

        <label class="account-field account-field--name" style="display:none;">
          <span>名字（昵称）</span>
          <input type="text" id="accName" placeholder="小朋友的名字" autocomplete="off" autocapitalize="off" />
        </label>
        <label class="account-field">
          <span>邮箱</span>
          <input type="email" id="accEmail" placeholder="家长邮箱（用于找回密码）" autocomplete="off" autocapitalize="off" />
        </label>
        <label class="account-field">
          <span>密码</span>
          <input type="password" id="accPass" placeholder="至少 6 个字符" autocomplete="off" />
        </label>

        <div class="account-msg" id="accMsg"></div>

        <button class="btn btn--primary account-submit" id="accSubmit">登录</button>
        <button class="account-link" id="forgotLink" type="button">忘记密码？</button>
        <p class="account-hint" id="accHint">${loginHint()}</p>
      </div>
    </div>`;
}

export function mount(sub) {
  if (!cloudEnabled()) return;

  if (sub === 'reset') return mountReset();
  if (store.isLoggedIn() && store.account) return mountLoggedIn();
  mountAuthForm(sub === 'register' ? 'register' : 'login');
}

function mountReset() {
  const recovery = window.__gqRecovery;
  const submit = document.getElementById('resetSubmit');
  const msg = document.getElementById('accMsg');
  const p1 = document.getElementById('newPass');
  const p2 = document.getElementById('newPass2');
  if (!submit) return;

  function showMsg(text, kind) {
    msg.textContent = text || '';
    msg.className = 'account-msg' + (kind ? ' account-msg--' + kind : '');
  }

  if (!recovery || !recovery.access_token) {
    showMsg('恢复链接无效或已过期，请重新点"忘记密码"获取邮件。', 'error');
    submit.disabled = true;
    return;
  }

  submit.addEventListener('click', async () => {
    const a = p1.value || '';
    const b = p2.value || '';
    if (a.length < 6) { showMsg('密码至少要 6 个字符', 'error'); p1.focus(); return; }
    if (a !== b) { showMsg('两次输入的密码不一样哦', 'error'); p2.focus(); return; }
    submit.disabled = true;
    submit.textContent = '保存中…';
    showMsg('');
    try {
      await store.applyNewPassword(recovery, a);
      window.__gqRecovery = null;
      showMsg('新密码已保存，正在进入…', 'ok');
      location.hash = '';
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    } catch (e) {
      showMsg(friendlyError(e), 'error');
      submit.disabled = false;
      submit.textContent = '保存新密码';
    }
  });
}

function mountLoggedIn() {
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      if (!confirm('确定要退出登录吗？退出后这台设备上只能看示例，重新登录就能接着学。')) return;
      logoutBtn.disabled = true;
      let res = await store.logout();
      if (res.unsynced) {
        // 还有练习没传上云端（断网或登录过期）：退出后这台设备上的这些记录就看不到了
        if (!confirm('还有学习记录没能存到云端（网络不通或登录已过期）。现在退出，这些记录会从这台设备上移走（留有备份，但换设备看不到）。\n\n建议先联网、或重新登录一次再退出。仍然要退出吗？')) {
          logoutBtn.disabled = false;
          return;
        }
        res = await store.logout({ force: true });
      }
      location.hash = '';
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    });
  }
}

// 登录提示：这台设备上有没注册时做的练习，要说清楚登录已有账号会换成账号里的进度
function loginHint() {
  return store.hasLocalProgress()
    ? '登录已有账号后，这台设备会换成账号里的进度；以前没注册时做的练习不会并进去（想保留，请注册新账号）。'
    : '登录后，这台设备会切换成你账号里保存的进度。';
}
const registerLabel = () => (store.hasLocalProgress() ? '注册并带上本机进度' : '注册');

function mountAuthForm(initialMode) {
  const tabs = document.querySelectorAll('.account-tab');
  const submitBtn = document.getElementById('accSubmit');
  const hint = document.getElementById('accHint');
  const msg = document.getElementById('accMsg');
  const nameField = document.querySelector('.account-field--name');
  const nameInput = document.getElementById('accName');
  const emailInput = document.getElementById('accEmail');
  const passInput = document.getElementById('accPass');
  const forgotLink = document.getElementById('forgotLink');
  if (!submitBtn) return;

  let mode = 'login'; // 'login' | 'register'

  function showMsg(text, kind) {
    msg.textContent = text || '';
    msg.className = 'account-msg' + (kind ? ' account-msg--' + kind : '');
  }

  function setMode(next) {
    mode = next;
    tabs.forEach(t => t.classList.toggle('account-tab--active', t.dataset.tab === mode));
    nameField.style.display = mode === 'register' ? '' : 'none';
    submitBtn.textContent = mode === 'login' ? '登录' : registerLabel();
    hint.textContent = mode === 'login'
      ? loginHint()
      : (store.hasLocalProgress() ? '注册后，这台设备上以前做过的练习会一起带进新账号。' : '注册后先做 12 道题摸底，生成你自己的学习计划。');
    showMsg('');
  }

  tabs.forEach(t => t.addEventListener('click', () => setMode(t.dataset.tab)));
  if (initialMode === 'register') setMode('register');

  async function submit() {
    const name = (nameInput.value || '').trim();
    const email = (emailInput.value || '').trim();
    const pass = passInput.value || '';
    if (mode === 'register' && !name) { showMsg('请先输入名字哦', 'error'); nameInput.focus(); return; }
    if (!email) { showMsg('请输入邮箱', 'error'); emailInput.focus(); return; }
    if (!pass) { showMsg('请输入密码', 'error'); passInput.focus(); return; }

    submitBtn.disabled = true;
    submitBtn.textContent = '请稍候…';
    showMsg('');
    try {
      if (mode === 'register') {
        const res = await store.register(name, email, pass);
        if (res.needsConfirm) {
          showMsg('注册成功！我们给 ' + email + ' 发了一封确认邮件，请点开邮件里的链接，然后回来登录。', 'ok');
          submitBtn.disabled = false;
          submitBtn.textContent = registerLabel();
          return;
        }
      } else {
        await store.login(email, pass);
      }
      showMsg('成功！正在进入…', 'ok');
      // 回到注册前想去的页面（家长专区、摸底）；新账号回首页会自动进摸底
      let back = takeReturn();
      // 已经做过摸底的账号不再送进摸底（重做会重排学习计划）
      if (back.split('/')[0] === 'placement' && !store.isPlacementNeeded()) back = '';
      location.hash = back;
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    } catch (e) {
      showMsg(friendlyError(e), 'error');
      submitBtn.disabled = false;
      submitBtn.textContent = mode === 'login' ? '登录' : registerLabel();
    }
  }

  submitBtn.addEventListener('click', submit);
  passInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.isComposing) submit();
  });

  // 忘记密码：发送找回邮件到输入框里的邮箱。
  forgotLink.addEventListener('click', async () => {
    const email = (emailInput.value || '').trim();
    if (!email) { showMsg('请先在上面填写你注册时用的邮箱，再点忘记密码', 'error'); emailInput.focus(); return; }
    forgotLink.disabled = true;
    showMsg('');
    try {
      await store.requestPasswordReset(email);
      showMsg('找回密码的邮件已发到 ' + email + '，请到邮箱点开链接重设密码～', 'ok');
    } catch (e) {
      showMsg(friendlyError(e), 'error');
    } finally {
      forgotLink.disabled = false;
    }
  });
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}
