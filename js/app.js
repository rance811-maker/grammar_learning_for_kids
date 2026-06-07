import { store } from './store.js';
import { cloud } from './cloud.js';
import * as home from './views/home.js';
import * as unit from './views/unit.js';
import * as discover from './views/discover.js';
import * as practice from './views/practice.js';
import * as mission from './views/mission.js';
import * as portfolio from './views/portfolio.js';
import * as stats from './views/stats.js';
import * as placement from './views/placement.js';
import * as review from './views/review.js';
import * as settings from './views/settings.js';
import * as account from './views/account.js';

// Bump this on every deploy so we can confirm which code is actually live.
const BUILD_VERSION = '20260608e';
console.log('%cGrammar Quest build ' + BUILD_VERSION, 'color:#58CC02;font-weight:bold;font-size:14px');

// Tiny, unobtrusive build marker (bottom-right). Lets us verify the deployed
// version at a glance instead of guessing about stale caches.
function showBuildBadge() {
  if (document.getElementById('buildBadge')) return;
  const badge = document.createElement('div');
  badge.id = 'buildBadge';
  badge.textContent = 'build ' + BUILD_VERSION;
  badge.style.cssText =
    'position:fixed;bottom:3px;right:5px;z-index:9999;font:10px/1 monospace;' +
    'color:#bbb;pointer-events:none;user-select:none;';
  document.body.appendChild(badge);
}

const app = document.getElementById('app');

const routes = {
  '': home,
  'unit': unit,
  'discover': discover,
  'practice': practice,
  'mission': mission,
  'portfolio': portfolio,
  'stats': stats,
  'placement': placement,
  'review': review,
  'settings': settings,
  'account': account,
};

const titles = {
  '': 'Grammar Quest',
  'unit': '关卡详情',
  'discover': '发现',
  'practice': '练习',
  'mission': '任务',
  'portfolio': '我的作品集',
  'stats': '我的',
  'placement': '摸底测试',
  'review': '复习中心',
  'settings': '设置',
  'account': '我的账号',
};

function router() {
  const hash = location.hash.slice(1) || '';
  const parts = hash.split('/');
  const route = parts[0] || '';
  const params = parts.slice(1);

  if (route === '' && store.isPlacementNeeded()) {
    location.hash = 'placement';
    return;
  }

  const view = routes[route];
  if (!view) {
    location.hash = '';
    return;
  }

  const content = view.render(...params);
  app.innerHTML = renderShell(route, content);

  if (view.mount) {
    view.mount(...params);
  }

  mountNav();
  mountBackButton();
}

const NAV_ITEMS = [
  { route: '', icon: '🗺️', label: '学习地图' },
  { route: 'review', icon: '🎯', label: '复习中心' },
  { route: 'portfolio', icon: '📁', label: '我的作品集' },
  { route: 'stats', icon: '📊', label: '我的进度' },
  { route: 'account', icon: '👤', label: '我的账号' },
  { route: 'settings', icon: '⚙️', label: '设置' },
];

const RANKS = {
  bronze: { icon: '🥉', name: '青铜' },
  silver: { icon: '🥈', name: '白银' },
  gold: { icon: '🥇', name: '黄金' },
  diamond: { icon: '💎', name: '钻石' },
  master: { icon: '👑', name: '大师' },
};

// Map sub-routes (unit/practice/discover/mission) back to the 地图 nav item.
function activeNavRoute(route) {
  if (route === 'practice') {
    // The review-mode practice session belongs under the 复习中心 tab.
    return location.hash.startsWith('#practice/review') ? 'review' : '';
  }
  return ['review', 'portfolio', 'stats', 'settings', 'account'].includes(route) ? route : '';
}

function renderShell(route, content) {
  const topLevelRoutes = ['', 'review', 'portfolio', 'stats', 'settings', 'account'];
  const showBackBtn = !topLevelRoutes.includes(route);
  const title = titles[route] || 'Grammar Quest';

  return `
    <div class="layout">
      ${renderSidebar(route)}
      <div class="main-col">
        <header class="topbar">
          ${showBackBtn
            ? `<button class="topbar__back" id="navBackBtn">← 返回</button>`
            : '<span class="topbar__back-placeholder"></span>'}
          <h1 class="topbar__title">${title}</h1>
          <span class="topbar__spacer"></span>
        </header>
        <main class="content">${content}</main>
      </div>
    </div>`;
}

function renderSidebar(route) {
  const active = activeNavRoute(route);
  const items = NAV_ITEMS.map(item => `
    <button class="sidebar__item${item.route === active ? ' active' : ''}" data-route="${item.route}">
      <span class="sidebar__item-icon">${item.icon}</span>
      <span class="sidebar__item-label">${item.label}</span>
    </button>`).join('');

  const p = store.state.player;
  const rank = RANKS[p.rank] || RANKS.bronze;
  const accountLine = store.isLoggedIn()
    ? `☁️ ${escapeHtml(store.account.name)}`
    : `👤 访客模式`;

  return `
    <aside class="sidebar">
      <div class="sidebar__brand">
        <span class="sidebar__brand-logo">🏆</span>
        <span class="sidebar__brand-text">Grammar Quest<small>语法冒险</small></span>
      </div>
      <nav class="sidebar__nav">${items}</nav>
      <div class="sidebar__footer">
        <button class="sidebar__account" data-route="account">${accountLine}</button>
        <div class="sidebar__rank">${rank.icon} ${rank.name}</div>
        <div class="sidebar__score">⭐ ${p.totalScore} 积分</div>
        <div class="sidebar__streak">🔥 连续 ${p.currentStreak} 天</div>
      </div>
    </aside>`;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

function mountNav() {
  document.querySelectorAll('.sidebar__item, .sidebar__account').forEach(btn => {
    btn.addEventListener('click', () => {
      location.hash = btn.dataset.route;
    });
  });
}

function mountBackButton() {
  const backBtn = document.getElementById('navBackBtn');
  if (backBtn) {
    backBtn.addEventListener('click', () => {
      // Determine a logical parent route
      const hash = location.hash.slice(1) || '';
      const parts = hash.split('/');
      const route = parts[0];

      if (route === 'practice' && parts[1] === 'review') {
        location.hash = 'review';
        return;
      }
      if (route === 'discover' || route === 'practice' || route === 'mission') {
        const unitId = parts[1];
        if (unitId) {
          location.hash = `unit/${unitId}`;
          return;
        }
      }
      if (route === 'unit') {
        location.hash = '';
        return;
      }
      // Fallback: go to home
      location.hash = '';
    });
  }
}

// Supabase 在确认/找回密码邮件的链接里，会把令牌放在 URL 的 # 片段中
// （形如 #access_token=...&type=recovery）。这会和我们的 hash 路由冲突，
// 所以要在路由之前把它"消费"掉。
async function consumeAuthCallback() {
  const h = location.hash.slice(1);
  if (!h.includes('access_token=')) return;
  const p = new URLSearchParams(h);
  const access_token = p.get('access_token');
  const refresh_token = p.get('refresh_token');
  const type = p.get('type');
  if (!access_token) return;

  if (type === 'recovery') {
    // 进入"设置新密码"界面，令牌交给 account 视图使用。
    window.__gqRecovery = { access_token, refresh_token };
    history.replaceState(null, '', '#account/reset');
    return;
  }

  // 邮箱确认 / 魔法链接：直接登录并回到首页。
  try {
    cloud.applyRecoverySession({ access_token, refresh_token });
    await cloud.fetchUser();
    store._refreshAccount();
    await store.syncFromCloud();
  } catch (e) {
    console.warn('Auth callback failed:', e.message);
  }
  history.replaceState(null, '', '#');
}

// Initialize
store.init();
window.addEventListener('hashchange', router);

consumeAuthCallback().then(() => {
  router();
  showBuildBadge();
  // If logged in, pull the latest cloud state in the background and re-render
  // once it arrives (the local cached copy was already shown above).
  if (store.isLoggedIn()) {
    store.syncFromCloud().then(changed => { if (changed) router(); });
  }
});
