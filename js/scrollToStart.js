// 换题后让新题从开头显示。
//
// 答题时为了看反馈，页面常常滚到了下面；新题渲染后浏览器停在原来的位置，
// 孩子得自己往上翻才看得到题目。这里把新题的开头滚回到顶部那几条固定栏的下方。
// 只在已经滚过了题目开头时才往回滚，页面本来就在上面就不动，免得画面乱跳。

// 横跨页面顶部、滚动时钉在上面的栏：手机上的图标导航、页面标题栏、练习进度条。
// 电脑上的侧栏也是 sticky，但它在左边、不挡内容，按宽度排除。
function coveredTop() {
  let cover = 0;
  for (const el of document.querySelectorAll('.sidebar, .topbar, .practice-header')) {
    const pos = getComputedStyle(el).position;
    if (pos !== 'sticky' && pos !== 'fixed') continue;
    const r = el.getBoundingClientRect();
    if (r.width < window.innerWidth * 0.5 || r.height > window.innerHeight * 0.4) continue;
    cover = Math.max(cover, r.height);
  }
  return cover;
}

export function scrollToStart(el) {
  if (!el || typeof window === 'undefined' || !el.getBoundingClientRect) return;
  const target = el.getBoundingClientRect().top + window.scrollY - coveredTop() - 8;
  if (window.scrollY <= target + 2) return;
  const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  window.scrollTo({ top: Math.max(0, target), behavior: reduce ? 'auto' : 'smooth' });
}
