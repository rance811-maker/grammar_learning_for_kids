// 「语法小贴士」排版。
//
// 课程数据里的贴士是一整段纯文本：用空行分节，标题写成 **…** / 【…】 / 「1. …」，
// 要点用「- 」开头，还有「例：」「常见错误：」和 ✔ / ✘ 例句。原来直接塞进一个 div，
// 换行被吞掉、星号原样露出来，七八百字挤成一面墙。这里把它排成「标题 + 要点 + 例句 + 易错」的小卡片；
// 分节多的贴士折叠起来，只展开第一节，手机上一屏看得完。

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// 行内：**加粗**、【强调】
const inline = (s) => esc(s)
  .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  .replace(/【([^】]{1,30})】/g, '<strong>$1</strong>');

// 一行是不是小节标题，是的话返回标题文字
function headingOf(line) {
  let m = line.match(/^\*\*(.+?)\*\*$/);
  if (m) return m[1];
  m = line.match(/^【(.+?)】$/);
  if (m) return m[1];
  m = line.match(/^(\d+)[.、．]\s*(.{2,40})$/);
  if (m && !/[。；;]$/.test(m[2])) return `${m[1]}. ${m[2]}`;
  return null;
}

function lineHtml(raw) {
  const line = raw.replace(/^\s+/, '');
  if (/^(✔|✓|正确[：:])/.test(line)) return `<li class="tip-ex tip-ex--ok">${inline(line.replace(/^(✔|✓|正确[：:])\s*/, ''))}</li>`;
  if (/^(✘|✗|×|错误[：:])/.test(line)) {
    // 「错句 → 改法（原因）」：只划掉错句，改法照常显示
    const body = line.replace(/^(✘|✗|×|错误[：:])\s*/, '');
    const at = body.search(/\s*(→|->|⇒)\s*/);
    if (at > 0) {
      const fix = body.slice(at).replace(/^\s*(→|->|⇒)\s*/, '');
      return `<li class="tip-ex tip-ex--bad"><s>${inline(body.slice(0, at))}</s> <span class="tip-fix">→ ${inline(fix)}</span></li>`;
    }
    return `<li class="tip-ex tip-ex--bad"><s>${inline(body)}</s></li>`;
  }
  if (/^(常见错误|易错|注意)[：:]/.test(line)) return `<li class="tip-warn">${inline(line)}</li>`;
  if (/^(例|例句|e\.g\.)[：:]/i.test(line)) return `<li class="tip-ex">${inline(line.replace(/^(例|例句|e\.g\.)[：:]\s*/i, ''))}</li>`;
  if (/^[-•·]\s+/.test(line)) return `<li>${inline(line.replace(/^[-•·]\s+/, ''))}</li>`;
  return `<li class="tip-p">${inline(line)}</li>`;
}

export function renderTip(tip) {
  const text = String(tip ?? '').replace(/\r/g, '').trim();
  if (!text) return '';
  // 没有分节、没有换行的短贴士（PET 等）：保持一段话
  if (!/\n/.test(text)) return `<p class="tip-lead">${inline(text)}</p>`;

  const blocks = text.split(/\n\s*\n/).map((b) => b.split('\n').filter((l) => l.trim())).filter((b) => b.length);
  let title = '';
  const sections = [];
  blocks.forEach((lines, i) => {
    const h = headingOf(lines[0].trim());
    // 第一块只有一行标题，后面还有内容 → 整张贴士的总标题
    if (i === 0 && h && lines.length === 1 && blocks.length > 1) { title = h; return; }
    if (h) sections.push({ heading: h, lines: lines.slice(1) });
    else if (lines.length === 1 && /^【.+?】/.test(lines[0].trim()) && lines[0].length < 60) sections.push({ heading: lines[0].trim().replace(/^【|】$/g, ''), lines: [] });
    else if (/^【(.+?)】(.+)$/.test(lines[0].trim())) {
      const [, hh, rest] = lines[0].trim().match(/^【(.+?)】(.+)$/);
      sections.push({ heading: hh, lines: [rest, ...lines.slice(1)] });
    } else sections.push({ heading: '', lines });
  });

  const body = (lines) => (lines.length ? `<ul class="tip-list">${lines.map(lineHtml).join('')}</ul>` : '');
  const headed = sections.filter((s) => s.heading).length;
  const fold = headed >= 3;   // 三节以上就折叠，只展开第一节
  let opened = false;
  const html = sections.map((s) => {
    if (!s.heading) return body(s.lines);
    if (!fold) return `<div class="tip-sec"><div class="tip-h">${inline(s.heading)}</div>${body(s.lines)}</div>`;
    const open = !opened; opened = true;
    return `<details class="tip-sec"${open ? ' open' : ''}><summary class="tip-h">${inline(s.heading)}</summary>${body(s.lines)}</details>`;
  }).join('');
  return `${title ? `<div class="tip-title">${inline(title)}</div>` : ''}${html}`;
}
