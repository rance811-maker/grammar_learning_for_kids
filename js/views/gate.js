// 没登录时点「开始练习 / 摸底 / 写作 / 家长专区」看到的页面：先注册。
// 由 app.js 的 router 在这些页面前拦下来渲染，不是一个能直接访问的路由。

const WHAT = {
  practice: { icon: '✏️', title: '注册后就能开始练习' },
  discover: { icon: '🔍', title: '注册后就能开始学这一课' },
  mission: { icon: '📝', title: '注册后就能写作文、让 AI 老师批改' },
  placement: { icon: '🧭', title: '注册后先做 3 分钟摸底' },
  parent: { icon: '🔒', title: '家长专区需要先注册' },
};

const RETURN_KEY = 'gq-return';

// 注册 / 登录成功后回到哪里。只记和示例数据无关的页面：练习、发现这些页面的单元和关卡
// 是在示例进度上点出来的，换成自己的进度后多半还没解锁，回首页更合适。
const RETURNABLE = new Set(['parent', 'placement']);

export function rememberReturn(route, params) {
  try {
    if (RETURNABLE.has(route)) sessionStorage.setItem(RETURN_KEY, [route, ...params].join('/'));
    else sessionStorage.removeItem(RETURN_KEY);
  } catch { /* 隐私模式等情况下存不了，回首页即可 */ }
}

/** 注册 / 登录成功后跳转的目标（取一次就清掉）。 */
export function takeReturn() {
  try {
    const r = sessionStorage.getItem(RETURN_KEY) || '';
    sessionStorage.removeItem(RETURN_KEY);
    return r;
  } catch {
    return '';
  }
}

export function render(route) {
  const w = WHAT[route] || WHAT.practice;
  return `
    <div class="view view-gate">
      <div class="gate-card">
        <div class="gate-card__icon">${w.icon}</div>
        <h2 class="gate-card__title">${w.title}</h2>
        <p class="gate-card__desc">
          免费注册，只要一个家长邮箱。注册后先做 12 道题摸底，学习计划按孩子的水平来排；进度自动存到云端，换手机、电脑都能接着学。
        </p>
        <div class="gate-card__actions">
          <a class="btn btn--primary gate-card__btn" href="#account/register">免费注册</a>
          <a class="btn btn--secondary gate-card__btn" href="#account">我有账号，去登录</a>
        </div>
        <a class="gate-card__back" href="#">先看看示例 ›</a>
      </div>
    </div>`;
}
