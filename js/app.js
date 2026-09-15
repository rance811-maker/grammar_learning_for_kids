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
import * as account from './views/account.js';
import * as parent from './views/parent.js';
import * as syllabus from './views/syllabus.js';
import * as about from './views/about.js';
import { curriculum } from './curriculum.js';

// Bump this on every deploy so we can confirm which code is actually live.
const BUILD_VERSION = '20260620x';
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
  'account': account,
  'parent': parent,
  'syllabus': syllabus,
  'about': about,
};

const titles = {
  '': '学习地图',
  'unit': '关卡详情',
  'discover': '发现',
  'practice': '练习',
  'mission': '任务',
  'portfolio': '我的作品集',
  'stats': '我的',
  'placement': '摸底测试',
  'review': '复习中心',
  'account': '账号与同步',
  'parent': '家长专区',
  'syllabus': '语法提纲',
  'about': '这是什么',
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

  // 「设置」已并入家长专区。旧链接/书签仍可能指到这里，直接重定向。
  if (route === 'settings') {
    location.hash = 'parent';
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
  mountCloudSaveBanner();
}

const NAV_ITEMS = [
  { route: '', icon: '🗺️', label: '学习地图' },
  { route: 'review', icon: '🎯', label: '复习中心' },
  { route: 'portfolio', icon: '📁', label: '我的作品集' },
  { route: 'stats', icon: '📊', label: '我的进度' },
  { route: 'parent', icon: '🔒', label: '家长专区' },
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
  return ['review', 'portfolio', 'stats', 'parent'].includes(route) ? route : '';
}

function renderShell(route, content) {
  const topLevelRoutes = ['', 'review', 'portfolio', 'stats', 'account', 'parent', 'about'];
  const showBackBtn = !topLevelRoutes.includes(route);
  const title = titles[route] || 'Grammar Quest';

  return `
    ${renderSiteBand()}
    <div class="layout">
      ${renderSidebar(route)}
      <div class="main-col">
        <header class="topbar${showBackBtn ? '' : ' topbar--title-only'}">
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

// 站点带：全站唯一说明"这是什么网站、给谁用"的地方。
//
// 之前这段定位放在首页内容区，但新用户打开会被 isPlacementNeeded() 直接
// 重定向到 #placement，根本到不了首页——对它真正的读者（第一次点开链接的
// 家长）到达率是 0，却天天挡在孩子和练习按钮之间。
//
// 刻意不 sticky：家长在第 0 秒本来就在页面顶部，进站必见；孩子往下一滚
// 它就让位，日常占用接近 0。sticky 的只有下面那条页面带。
function renderSiteBand() {
  return `
    <div class="siteband">
      <a class="siteband__brand" href="#about">
        <span class="siteband__logo">🏆</span>
        <span class="siteband__name">Grammar Quest<span class="siteband__sub"> 语法冒险</span></span>
      </a>
      <span class="siteband__tagline">给中国孩子的英语语法精准练习<button
              class="siteband__what" id="siteWhatBtn" type="button"
              aria-label="这是什么网站" aria-expanded="false" aria-controls="siteWhatPop"
              title="这是什么网站">${infoIcon()}</button></span>
      ${renderSoundBtn()}
      ${renderSiteWhatPop()}
    </div>`;
}

// 图标用 SVG 画，不用字符「?」：字符的位置由字体度量决定，在 18px 的圆圈里
// 既压不住基线也居不了中，不同系统字体下还会偏得不一样。圆点加圆角竖条这两个
// 形状是自己定的坐标，任何字体、任何缩放下都正。
function infoIcon() {
  return `<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false">
    <circle cx="8" cy="8" r="8"></circle>
    <circle class="siteband__what-mark" cx="8" cy="4.3" r="1.15"></circle>
    <rect class="siteband__what-mark" x="7" y="6.7" width="2" height="5.3" rx="1"></rect>
  </svg>`;
}

// 「这是什么 ›」原来是个链接，点一下把人从当前页面带走——对一个只想
// 扫一眼「这网站是干嘛的」的家长来说代价太大。改成浮层：原地看完，
// 想看全文再走。
function renderSiteWhatPop() {
  return `
    <div class="siteband__pop" id="siteWhatPop" role="dialog"
         aria-label="这是什么网站" hidden>
      <p class="siteband__pop-lead">
        不做通用题库——按孩子的<strong>考试目标</strong>和<strong>当前水平</strong>定制课程，只练该练的。
      </p>
      <ul class="siteband__pop-list">
        <li>先做 12 道题摸底，学习计划按结果排，不是所有孩子都从第一单元开始</li>
        <li>内置 PET、雅思 6 分、雅思 7 分三套课程，打开就能用</li>
        <li>写作由 AI 逐句批改，指出错在哪、为什么错</li>
      </ul>
      <a class="siteband__pop-more" href="#about">看完整介绍 ›</a>
    </div>`;
}

// 音效开关放站点带右端：每一页都在，孩子随手就能静音，不用进家长专区输密码。
// 原来放在页面带里，但页面带在顶层页面只剩一个标题，为了一个图标撑起一整条
// 白带不划算——现在页面带在宽屏的顶层页面直接不显示了。
function renderSoundBtn() {
  const on = store.state.settings.soundEnabled;
  return `<button class="topbar__sound${on ? '' : ' topbar__sound--off'}" id="soundBtn"
                  aria-label="${on ? '关闭音效' : '打开音效'}"
                  title="${on ? '关闭音效' : '打开音效'}"
                  aria-pressed="${on}">${on ? '🔊' : '🔇'}</button>`;
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
    ? `<span class="sidebar__account-name">☁️ ${escapeHtml(store.account.name)}</span>
       <span class="sidebar__account-role">当前家长账号登录中</span>`
    : `<span class="sidebar__account-name">👤 登录 / 注册</span>
       <span class="sidebar__account-role">登录后可跨设备同步</span>`;

  const currTitle = curriculum.getActiveTitle();
  const currIsBuiltIn = curriculum.isBuiltIn();
  const currBadge = currIsBuiltIn ? '' : `
    <div class="sidebar__curriculum" title="${escapeHtml(currTitle)}">
      <span class="sidebar__curriculum-label">📚 当前课程</span>
      <span class="sidebar__curriculum-name">${escapeHtml(currTitle)}</span>
    </div>`;

  return `
    <aside class="sidebar">
      ${currBadge}
      <nav class="sidebar__nav">${items}</nav>
      <div class="sidebar__footer">
        <div class="sidebar__account-panel">
          <button class="sidebar__account" data-route="account">${accountLine}</button>
          <div class="sidebar__stats">
            <span class="sidebar__stat sidebar__stat--rank">${rank.icon} ${rank.name}</span>
            <span class="sidebar__stat sidebar__stat--score">⭐ ${p.totalScore} 积分</span>
            <span class="sidebar__stat sidebar__stat--streak">🔥 连续 ${p.currentStreak} 天</span>
          </div>
        </div>
      </div>
    </aside>`;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

// 云端保存失败的提示条。
//
// 这是开放给外部用户前必须补的一环：保存失败原来只在 console 里留一行，
// 用户以为存上了，换台设备才发现进度少了一截。现在自动重试仍失败就明确告知，
// 并说清数据还在本机、没有丢——避免家长以为已经彻底没了。
function mountCloudSaveBanner() {
  if (window.__gqCloudBannerMounted) return;
  window.__gqCloudBannerMounted = true;

  window.addEventListener('gq-cloud-save', (e) => {
    const ok = e.detail && e.detail.ok;
    let el = document.getElementById('cloudSaveBanner');

    if (ok) {
      if (el) el.remove();
      return;
    }
    if (el) return;                       // 同一轮失败不重复弹

    el = document.createElement('div');
    el.id = 'cloudSaveBanner';
    el.className = 'cloud-banner';
    el.innerHTML = `
      <span class="cloud-banner__text">
        ⚠️ 学习记录没能存到云端（已自动重试 3 次）。
        <strong>数据还在这台设备上，没有丢</strong>，但现在换设备登录会看不到最新进度。
        网络恢复后继续练习会自动重试。
      </span>
      <button class="cloud-banner__close" aria-label="关闭">✕</button>`;
    el.querySelector('.cloud-banner__close').addEventListener('click', () => el.remove());
    document.body.appendChild(el);
  });
}

function mountNav() {
  document.querySelectorAll('.sidebar__item, .sidebar__account').forEach(btn => {
    btn.addEventListener('click', () => {
      location.hash = btn.dataset.route;
    });
  });

  mountSiteWhat();

  // 音效不跟着「设置」搬进家长专区——孩子在安静场合想静音，
  // 不该还得叫家长来输一次 6 位密码。
  const soundBtn = document.getElementById('soundBtn');
  if (soundBtn) {
    soundBtn.addEventListener('click', () => {
      const on = !store.state.settings.soundEnabled;
      store.state.settings.soundEnabled = on;
      store.save();
      soundBtn.textContent = on ? '🔊' : '🔇';
      soundBtn.title = on ? '关闭音效' : '打开音效';
      soundBtn.setAttribute('aria-label', on ? '关闭音效' : '打开音效');
      soundBtn.setAttribute('aria-pressed', String(on));
      soundBtn.classList.toggle('topbar__sound--off', !on);
    });
  }
}

// 浮层的开合。每次路由重绘都会重新挂一遍，所以监听器绑在按钮和 document
// 上的那份要能反复安装而不叠加——document 上的两个用具名函数 + 先摘后挂。
let whatOutsideHandler = null;
let whatKeyHandler = null;

function mountSiteWhat() {
  const btn = document.getElementById('siteWhatBtn');
  const pop = document.getElementById('siteWhatPop');

  if (whatOutsideHandler) document.removeEventListener('click', whatOutsideHandler);
  if (whatKeyHandler) document.removeEventListener('keydown', whatKeyHandler);
  whatOutsideHandler = null;
  whatKeyHandler = null;
  if (!btn || !pop) return;

  const close = () => {
    pop.hidden = true;
    btn.setAttribute('aria-expanded', 'false');
  };

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    const open = pop.hidden;
    pop.hidden = !open;
    btn.setAttribute('aria-expanded', String(open));
  });

  // 浮层里点链接要能正常跳转，所以只拦冒泡、不 preventDefault。
  pop.addEventListener('click', (e) => e.stopPropagation());

  whatOutsideHandler = () => { if (!pop.hidden) close(); };
  whatKeyHandler = (e) => {
    if (e.key === 'Escape' && !pop.hidden) { close(); btn.focus(); }
  };
  document.addEventListener('click', whatOutsideHandler);
  document.addEventListener('keydown', whatKeyHandler);
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
    store.syncFromCloud().then(changed => {
      if (!changed) return;
      // 正在答题/摸底时不要重跑路由：那会新建一场会话，孩子眼前的题突然换掉。
      const r = (location.hash.slice(1) || '').split('/')[0];
      if (r === 'practice' || r === 'placement') return;
      router();
    });
  }
});
