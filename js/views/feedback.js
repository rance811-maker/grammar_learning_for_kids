import { curriculum } from '../curriculum.js';

// 意见反馈：给家长和孩子一个找得到的地方说「这里坏了 / 这里不好用」。
//
// 联系方式和「申请专业定制」页一致。邮箱在运行时拼出来再显示，
// 不直接写进页面源码，免得被爬虫收进垃圾邮件名单。
//
// 反馈最难的不是收，是看懂。所以页面帮用户把设备、浏览器、版本号、
// 当前课程这些他自己说不清的信息自动填好，他只要补上「遇到了什么」。

const WECHAT = 'rance811';
const mailAddr = () => ['rance811', 'gmail.com'].join('@');

function browserName() {
  const ua = navigator.userAgent;
  if (/MicroMessenger/i.test(ua)) return '微信内置浏览器';
  if (/Edg\//.test(ua)) return 'Edge';
  if (/Firefox\//.test(ua)) return 'Firefox';
  if (/Chrome\//.test(ua)) return 'Chrome';
  if (/Safari\//.test(ua)) return 'Safari';
  return '其他浏览器';
}

function deviceName() {
  const ua = navigator.userAgent;
  const phone = /iPhone|Android.+Mobile|Mobile/i.test(ua) || innerWidth < 720;
  const tablet = /iPad|Tablet/i.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  const kind = tablet ? '平板' : phone ? '手机' : '电脑';
  return `${kind}（屏幕宽 ${innerWidth}）`;
}

function buildVersion() {
  const t = document.getElementById('buildBadge')?.textContent || '';
  return t.replace(/^build\s*/, '') || '未知';
}

function template() {
  return [
    '【Grammar Quest 问题反馈】',
    `设备：${deviceName()}`,
    `浏览器：${browserName()}`,
    `版本：${buildVersion()}`,
    `当前课程：${curriculum.getActiveTitle()}`,
    '',
    '问题出在哪一页：',
    '我做了什么：',
    '我看到了什么：',
    '我本来期望看到什么：',
    '（有截图的话一起发来，最有帮助）',
  ].join('\n');
}

export function render() {
  return `
    <div class="view view-feedback">
      <div class="fb-card">
        <h2 class="fb-title">💬 意见反馈</h2>
        <p class="fb-lead">
          用着遇到问题、觉得哪里不好用，或者希望加什么功能，都可以直接告诉我们。孩子自己发现的问题也欢迎，家长帮忙转述就行。
        </p>

        <h3 class="fb-h">联系我们</h3>
        <div class="req-contact">
          <div class="req-contact__row">
            <span class="req-contact__label">微信</span>
            <code class="req-contact__value">${WECHAT}</code>
            <button class="btn btn--tiny btn--outline" data-fb-copy="wechat">复制</button>
          </div>
          <div class="req-contact__row">
            <span class="req-contact__label">邮箱</span>
            <code class="req-contact__value" id="fbMail"></code>
            <button class="btn btn--tiny btn--outline" data-fb-copy="mail">复制</button>
            <a class="btn btn--tiny btn--outline" id="fbMailto" href="#feedback">写邮件</a>
          </div>
        </div>

        <h3 class="fb-h">说清这几件事，我们能更快定位问题</h3>
        <ol class="fb-list">
          <li>问题出在哪一页，比如「复习中心」「第 3 单元 Lv.2」</li>
          <li>当时做了什么，点了哪个按钮</li>
          <li>看到了什么，和你期望的有什么不同</li>
          <li>最好附一张截图</li>
        </ol>

        <div class="fb-tpl">
          <div class="fb-tpl__head">
            <span>反馈模板（设备和版本已自动填好）</span>
            <button class="btn btn--small btn--primary" data-fb-copy="tpl">复制反馈模板</button>
          </div>
          <pre class="fb-tpl__body" id="fbTpl"></pre>
          <p class="fb-note">复制后粘贴到微信或邮件里，补上你遇到的情况发给我们。</p>
        </div>
      </div>
    </div>`;
}

export function mount() {
  const mail = mailAddr();
  const tpl = template();
  const mailEl = document.getElementById('fbMail');
  if (mailEl) mailEl.textContent = mail;
  const tplEl = document.getElementById('fbTpl');
  if (tplEl) tplEl.textContent = tpl;

  // 「写邮件」直接带上主题和模板；邮箱同样运行时才拼进链接
  const mailto = document.getElementById('fbMailto');
  if (mailto) {
    mailto.href = `mailto:${mail}?subject=${encodeURIComponent('Grammar Quest 反馈')}&body=${encodeURIComponent(tpl)}`;
  }

  const texts = { wechat: WECHAT, mail, tpl };
  document.querySelectorAll('[data-fb-copy]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const text = texts[btn.dataset.fbCopy];
      const done = () => {
        const old = btn.textContent;
        btn.textContent = '已复制';
        setTimeout(() => { btn.textContent = old; }, 1500);
      };
      if (navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(text).then(done).catch(() => alert(text));
      } else {
        alert(text);
      }
    });
  });
}
