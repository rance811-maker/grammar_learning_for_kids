import { store } from '../store.js';
import { cloudEnabled, friendlyError } from '../cloud.js';

export function render() {
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

  // 已登录：显示账号信息 + 退出。
  if (store.isLoggedIn()) {
    const name = store.account.name;
    return `
      <div class="view view-account">
        <div class="account-card">
          <div class="account-card__icon">🧒</div>
          <div class="account-card__title">你好，${escapeHtml(name)}！</div>
          <p class="account-card__desc">
            学习记录正在自动云端同步，换设备登录同一个名字就能接着学。
          </p>
          <div class="account-status">☁️ 已登录 · 自动同步中</div>
          <button class="btn btn--secondary" id="logoutBtn" style="margin-top:var(--space-md);">退出登录</button>
          <p class="account-hint">退出后这台设备会回到"访客模式"。</p>
        </div>
      </div>`;
  }

  // 未登录：访客 + 登录/注册入口。
  return `
    <div class="view view-account">
      <div class="account-card">
        <div class="account-card__icon">🚀</div>
        <div class="account-card__title">访客模式</div>
        <p class="account-card__desc">
          现在你正在以访客身份学习，随时可以玩，进度保存在这台设备上。
          想在别的设备上也能接着学？登录一个账号吧！
        </p>
      </div>

      <div class="account-card account-card--form">
        <div class="account-tabs">
          <button class="account-tab account-tab--active" data-tab="login">登录</button>
          <button class="account-tab" data-tab="register">注册新账号</button>
        </div>

        <label class="account-field">
          <span>名字</span>
          <input type="text" id="accName" placeholder="小朋友的名字" autocomplete="off" autocapitalize="off" />
        </label>
        <label class="account-field">
          <span>密码</span>
          <input type="password" id="accPass" placeholder="至少 3 个字符" autocomplete="off" />
        </label>

        <div class="account-msg" id="accMsg"></div>

        <button class="btn btn--primary account-submit" id="accSubmit">登录</button>
        <p class="account-hint" id="accHint">
          登录后，当前这台设备上的学习进度会保留下来一起带走。
        </p>
      </div>
    </div>`;
}

export function mount() {
  if (!cloudEnabled()) return;

  // 已登录态：绑定退出。
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      if (confirm('确定要退出登录吗？这台设备会回到访客模式。')) {
        store.logout();
        location.hash = '';
        window.dispatchEvent(new HashChangeEvent('hashchange'));
      }
    });
    return;
  }

  // 未登录态：登录/注册表单。
  const tabs = document.querySelectorAll('.account-tab');
  const submitBtn = document.getElementById('accSubmit');
  const hint = document.getElementById('accHint');
  const msg = document.getElementById('accMsg');
  const nameInput = document.getElementById('accName');
  const passInput = document.getElementById('accPass');
  if (!submitBtn) return;

  let mode = 'login'; // 'login' | 'register'

  function setMode(next) {
    mode = next;
    tabs.forEach(t => t.classList.toggle('account-tab--active', t.dataset.tab === mode));
    submitBtn.textContent = mode === 'login' ? '登录' : '注册并保存进度';
    hint.textContent = mode === 'login'
      ? '登录后，这台设备会切换成你账号里保存的进度。'
      : '注册后，当前这台设备上的学习进度会一起带进新账号。';
    showMsg('');
  }

  function showMsg(text, kind) {
    msg.textContent = text || '';
    msg.className = 'account-msg' + (kind ? ' account-msg--' + kind : '');
  }

  tabs.forEach(t => t.addEventListener('click', () => setMode(t.dataset.tab)));

  async function submit() {
    const name = (nameInput.value || '').trim();
    const pass = passInput.value || '';
    if (!name) { showMsg('请先输入名字哦', 'error'); nameInput.focus(); return; }
    if (!pass) { showMsg('请输入密码', 'error'); passInput.focus(); return; }

    submitBtn.disabled = true;
    submitBtn.textContent = '请稍候…';
    showMsg('');
    try {
      if (mode === 'register') {
        await store.register(name, pass);
      } else {
        await store.login(name, pass);
      }
      showMsg('成功！正在进入…', 'ok');
      location.hash = '';
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    } catch (e) {
      showMsg(friendlyError(e), 'error');
      submitBtn.disabled = false;
      submitBtn.textContent = mode === 'login' ? '登录' : '注册并保存进度';
    }
  }

  submitBtn.addEventListener('click', submit);
  passInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.isComposing) submit();
  });
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}
