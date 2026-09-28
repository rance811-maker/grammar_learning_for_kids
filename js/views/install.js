import { isStandalone, platform, canOneTapInstall, oneTapInstall } from '../pwa.js';

// 「添加到主屏幕」引导页。
//
// 每种手机的入口都不一样，家长照着自己那台的步骤点就行：
// 认出来的设备排第一、默认展开，并标「你的设备」；其他设备收起来，给别的手机用时再看。
// 安卓 Chrome 和电脑 Chrome / Edge 能直接弹系统安装框，顶部给一个「一键添加」按钮。

const SITE = '<span class="inst-url">www.grammar-quest.net</span>';

// iPhone 上桌面图标和 Safari 各存各的数据（系统规定，网站改不了），不说清楚家长会以为进度丢了
const IOS_STORAGE_NOTE = `
  <p class="inst-warn"><strong>先登录再添加。</strong>苹果设备上，桌面图标和 Safari 各存各的学习记录。先在「账号」里登录家长账号，从桌面图标打开后再登录一次，进度就接上了；没登录的话，桌面图标里会从摸底测试重新开始。</p>`;

const GUIDES = {
  inapp: {
    title: '在微信、QQ、小红书里打开的',
    steps: [
      '点右上角的「…」',
      '选「在浏览器打开」（苹果手机上是「在 Safari 中打开」）',
      '到了浏览器里，再按下面对应手机的步骤添加',
    ],
    note: '<p class="inst-note">App 里打开的网页没法直接添加到桌面，要先换到浏览器。</p>',
  },
  ios: {
    title: 'iPhone / iPad',
    steps: [
      `用 Safari 打开 ${SITE}`,
      '点屏幕底部的「分享」按钮（一个方框，中间有向上的箭头）；iPad 在右上角',
      '往下滑，点「添加到主屏幕」',
      '点右上角「添加」',
    ],
    note: IOS_STORAGE_NOTE,
  },
  android: {
    title: '安卓手机',
    steps: [
      `用 Chrome 或 Edge 打开 ${SITE}`,
      '点右上角的「⋮」菜单',
      '点「添加到主屏幕」或「安装应用」',
      '按提示点「安装」或「添加」',
    ],
    note: `<p class="inst-note">华为、小米、OPPO、vivo 自带的浏览器，菜单里一般叫「添加到桌面」或「添加快捷方式」。如果提示没有权限，到手机设置里给这个浏览器打开「桌面快捷方式」权限。安卓上桌面图标和浏览器共用学习记录，进度不会断。</p>`,
  },
  desktop: {
    title: '电脑',
    steps: [
      'Chrome、Edge：点地址栏右边的「安装」小图标；没看到的话，在右上角菜单里找「安装 Grammar Quest」',
      'Mac 上的 Safari（macOS 14 以后）：点菜单栏「文件」→「添加到程序坞」',
    ],
    note: '<p class="inst-note">装好以后在开始菜单、程序坞里就能找到，打开是一个单独的窗口。Mac 的 Safari 和苹果手机一样，要登录后进度才接得上。</p>',
  },
};

function guideBlock(key, mine) {
  const g = GUIDES[key];
  return `
    <details class="inst-guide${mine ? ' inst-guide--mine' : ''}"${mine ? ' open' : ''}>
      <summary>${g.title}${mine ? '<span class="inst-mine">你的设备</span>' : ''}</summary>
      <ol class="inst-steps">${g.steps.map((s) => `<li>${s}</li>`).join('')}</ol>
      ${g.note}
    </details>`;
}

function oneTapBlock() {
  return `
    <div class="inst-onetap" id="instOneTap"${canOneTapInstall() ? '' : ' hidden'}>
      <button class="btn btn--primary btn--large" id="instOneTapBtn" type="button">一键添加到桌面</button>
      <span class="inst-note">这台设备支持直接添加，点一下按提示确认就行。</span>
    </div>`;
}

export function render() {
  const mine = platform();
  const order = [mine, ...['inapp', 'ios', 'android', 'desktop'].filter((k) => k !== mine)];
  const done = isStandalone()
    ? '<p class="inst-done">✅ 你现在就是从桌面图标打开的，已经添加好了。下面的步骤可以用来给别的设备添加。</p>'
    : '';

  return `
    <div class="view view-install">
      <div class="fb-card">
        <h2 class="fb-title">📲 放到桌面，像 App 一样用</h2>
        <p class="fb-lead">添加以后，桌面上会多一个图标，点开是全屏的，没有地址栏，用起来和 App 一样。不用下载安装包，也不占手机空间；网站更新了，打开就是新版。</p>
        ${done}
        ${done ? '' : oneTapBlock()}
        ${order.map((k, i) => guideBlock(k, i === 0 && !done)).join('')}
      </div>
    </div>`;
}

let readyHandler = null;

export function mount() {
  const box = document.getElementById('instOneTap');
  const btn = document.getElementById('instOneTapBtn');

  // 浏览器的安装事件可能在页面画出来之后才到，到了再把按钮亮出来
  if (readyHandler) window.removeEventListener('gq-install-ready', readyHandler);
  readyHandler = () => { if (box) box.hidden = false; };
  window.addEventListener('gq-install-ready', readyHandler);

  if (btn) {
    btn.addEventListener('click', async () => {
      const ok = await oneTapInstall();
      if (box) {
        box.innerHTML = ok
          ? '<p class="inst-done">✅ 已添加，去桌面找「语法冒险」图标。</p>'
          : '<span class="inst-note">没有添加。想加的时候，照下面的步骤在浏览器菜单里操作。</span>';
      }
    });
  }
}
