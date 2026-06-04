import { store } from './store.js';
import * as home from './views/home.js';
import * as unit from './views/unit.js';
import * as discover from './views/discover.js';
import * as practice from './views/practice.js';
import * as mission from './views/mission.js';
import * as portfolio from './views/portfolio.js';
import * as stats from './views/stats.js';

const app = document.getElementById('app');

const routes = {
  '': home,
  'unit': unit,
  'discover': discover,
  'practice': practice,
  'mission': mission,
  'portfolio': portfolio,
  'stats': stats,
};

const titles = {
  '': 'Grammar Quest',
  'unit': '关卡详情',
  'discover': '发现',
  'practice': '练习',
  'mission': '任务',
  'portfolio': '我的作品集',
  'stats': '我的',
};

function router() {
  const hash = location.hash.slice(1) || '';
  const parts = hash.split('/');
  const route = parts[0] || '';
  const params = parts.slice(1);

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

  mountTabBar();
  mountBackButton();
}

function renderShell(route, content) {
  const showTabBar = !['practice', 'discover', 'mission'].includes(route);
  const showBackBtn = route !== '' && route !== 'portfolio' && route !== 'stats';
  const title = titles[route] || 'Grammar Quest';

  const navRight = route === ''
    ? ''
    : '';

  return `
    <nav class="nav-bar">
      ${showBackBtn
        ? `<button class="nav-bar__back" id="navBackBtn" aria-label="返回">←</button>`
        : '<div style="width:36px;"></div>'}
      <span class="nav-bar__title">${title}</span>
      <div class="nav-bar__right">${navRight}</div>
    </nav>
    <main>${content}</main>
    ${showTabBar ? renderTabBar(route) : ''}`;
}

function renderTabBar(route) {
  const tabs = [
    { route: '', icon: '🗺️', label: '地图' },
    { route: 'portfolio', icon: '📁', label: '作品集' },
    { route: 'stats', icon: '📊', label: '我的' },
  ];

  const items = tabs.map(tab => {
    const active = tab.route === route ? ' active' : '';
    return `
      <button class="tab-bar__item${active}" data-route="${tab.route}">
        <span class="tab-bar__icon">${tab.icon}</span>
        <span class="tab-bar__label">${tab.label}</span>
      </button>`;
  }).join('');

  return `<nav class="tab-bar">${items}</nav>`;
}

function mountTabBar() {
  document.querySelectorAll('.tab-bar__item').forEach(btn => {
    btn.addEventListener('click', () => {
      const route = btn.dataset.route;
      location.hash = route;
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

// Initialize
store.init();
window.addEventListener('hashchange', router);
router();
