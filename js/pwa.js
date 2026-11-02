// 「添加到桌面」的引导页和学习地图上的提示卡 2026-11-01 去掉了：步骤太绕，家长理解和操作都难。
// 但以前照着添加过的人还会从桌面图标打开，manifest 和 service worker 留着，保证他们照常能用。
//
// 这里只剩两件事：
// 1. 注册 service worker（根目录 sw.js）。它平时一律走网络，只在断网时用存档兜底，
//    不会让人看到旧版本；已经添加到桌面的人靠它断网时不白屏。
// 2. 截住安卓 Chrome / 电脑 Chrome、Edge 的安装事件，不让浏览器自己弹「安装应用」横条——
//    功能去掉了，就别让浏览器从旁边再冒出来。

import { track } from './analytics.js';

export function initPwa() {
  window.addEventListener('beforeinstallprompt', (e) => e.preventDefault());
  // 还有人从浏览器菜单自己装的话，后台照样记一笔
  window.addEventListener('appinstalled', () => track('install'));

  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
    navigator.serviceWorker.register('sw.js').catch((e) => console.warn('Service worker 注册失败:', e.message));
  }
}
