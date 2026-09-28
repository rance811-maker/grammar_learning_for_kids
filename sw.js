// Service worker：只做一件事——断网时用上次联网时存下的文件兜底，
// 让从桌面图标打开的 Grammar Quest 在没网时不是一片白屏。
//
// 策略是「网络优先」：联网时每个请求都照常走网络，和没有 service worker 时完全一样，
// 不会出现「部署了新版、用户还看到旧版」的问题；拿到响应顺手存一份，只有网络失败才读存档。
// 只管本站的 GET 请求。Supabase、CDN 这些跨站请求一律不碰。
//
// 以后如果要撤掉它：把本文件换成下面这一行再部署，不要直接删文件——
// 文件删了，浏览器会一直留着已经装上的旧版本。
//   self.addEventListener('install', () => self.skipWaiting()); self.addEventListener('activate', () => self.registration.unregister());

const CACHE = 'gq-offline-v1';

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== CACHE) await caches.delete(k);
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  e.respondWith(networkFirst(req, url));
});

async function networkFirst(req, url) {
  // 存档的键去掉 ?v=：每次部署版本号都变，带着它存，存档会越攒越多
  const key = url.origin + url.pathname;
  try {
    const res = await fetch(req);
    if (res.status === 200 && res.type === 'basic') {
      const copy = res.clone();
      caches.open(CACHE).then((c) => c.put(key, copy)).catch(() => {});
    }
    return res;
  } catch (err) {
    const hit = (await caches.match(key))
      || (req.mode === 'navigate' ? await caches.match(url.origin + '/') : undefined);
    if (hit) return hit;
    throw err;
  }
}
