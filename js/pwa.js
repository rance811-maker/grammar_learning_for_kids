// 「添加到主屏幕」：让网站从桌面图标打开时像个 App——全屏、没有地址栏、有自己的图标。
//
// 这里管三件事：
// 1. 注册 service worker（根目录 sw.js）。安卓 Chrome 要有它才提供「安装应用」，
//    它平时一律走网络，只在断网时用存档兜底，不会让人看到旧版本。
// 2. 截住安卓 Chrome / 电脑 Chrome、Edge 的安装事件，家长点「添加」时直接弹系统安装框。
//    iPhone 没有这个事件，只能照着引导页手动加。
// 3. 学习地图顶部的一张小提示卡：手机上、不是从桌面图标打开的、没点过「不再提示」才出现。

const HINT_OFF_KEY = 'gq-install-hint-off';
let deferredPrompt = null;

export function isStandalone() {
  return matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
}

// 微信、QQ、小红书这类 App 里打开的网页没法添加到桌面，要先换到浏览器，单独归一类
export function platform() {
  const ua = navigator.userAgent;
  if (/MicroMessenger|QQ\/|Weibo|XiaoHongShu|DingTalk|AlipayClient|aweme|Lark/i.test(ua)) return 'inapp';
  if (/iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) return 'ios';
  if (/Android/i.test(ua)) return 'android';
  return 'desktop';
}

export function canOneTapInstall() {
  return !!deferredPrompt;
}

// 弹系统安装框。返回用户是否确认安装。
export async function oneTapInstall() {
  if (!deferredPrompt) return false;
  const p = deferredPrompt;
  deferredPrompt = null;              // 这个事件只能用一次
  p.prompt();
  const { outcome } = await p.userChoice;
  if (outcome === 'accepted') setHintOff();
  return outcome === 'accepted';
}

function hintOff() {
  try { return localStorage.getItem(HINT_OFF_KEY) === '1'; } catch { return false; }
}
function setHintOff() {
  try { localStorage.setItem(HINT_OFF_KEY, '1'); } catch { /* 无痕模式等存不了就算了 */ }
}

export function initPwa() {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();               // 不让浏览器自己弹横条，由提示卡和引导页上的按钮触发
    deferredPrompt = e;
    window.dispatchEvent(new Event('gq-install-ready'));
  });
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    setHintOff();
    document.querySelector('.install-hint')?.remove();
  });

  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
    navigator.serviceWorker.register('sw.js').catch((e) => console.warn('Service worker 注册失败:', e.message));
  }
}

export function mountInstallHint(host) {
  if (!host || isStandalone() || platform() === 'desktop' || hintOff()) return;
  const el = document.createElement('div');
  el.className = 'install-hint';
  el.innerHTML = `
    <span class="install-hint__icon" aria-hidden="true">📲</span>
    <span class="install-hint__text">
      <strong>放到桌面，像 App 一样用</strong>
      <span>点图标就能打开，不用找网址</span>
    </span>
    <button class="btn btn--primary install-hint__go" type="button">添加</button>
    <button class="install-hint__close" type="button" aria-label="不再提示" title="不再提示">✕</button>`;
  host.prepend(el);

  el.querySelector('.install-hint__go').addEventListener('click', async () => {
    if (canOneTapInstall()) {
      if (await oneTapInstall()) el.remove();
      return;
    }
    location.hash = 'install';
  });
  el.querySelector('.install-hint__close').addEventListener('click', () => {
    setHintOff();
    el.remove();
  });
}
