// 生成给搜索引擎看的静态页面：三套内置课程的语法大纲页 + sitemap.xml。
//
// 为什么需要：网站本体是纯前端单页应用，页面源码里只有一个空的 <div id="app">，
// 内容全靠 JavaScript 画出来。百度爬虫基本不执行 JavaScript，看到的是一张白纸；
// Google 会执行，但新访客一进来就被带去摸底测试，能收录的内容很薄。
// 这几页是纯 HTML，不依赖脚本，内容直接取自课程数据，和应用里看到的一致。
//
// 课程内容有改动时重新运行一次，再把生成的文件一起提交：
//   node scripts/build-seo-pages.mjs
import { writeFileSync, mkdirSync } from 'fs';
import { BUILTIN_COURSES } from '../js/data/builtinCourses.js';
import { skillName } from '../js/data/skill-names.js';

const SITE = 'https://www.grammar-quest.net';
const TODAY = new Date().toISOString().slice(0, 10);

// 每套课程对外的名字和网址。应用里的课程名偏长，这里用家长会搜的叫法。
const META = {
  __pet__: {
    slug: 'pet',
    name: 'PET 语法训练',
    h1: 'PET 语法训练：12 个单元语法点清单',
    lead: '对标剑桥 PET（CEFR B1）的英语语法课程',
  },
  'preset-ielts6': {
    slug: 'ielts6',
    name: '雅思 6 分语法课程',
    h1: '雅思 6 分语法：12 个单元语法点清单',
    lead: '对标雅思 6 分（CEFR B2）的英语语法课程，以真实考试题型为准',
  },
  'preset-ielts7': {
    slug: 'ielts7',
    name: '雅思 7 分语法课程',
    h1: '雅思 7 分语法：12 个单元语法点清单',
    lead: '对标雅思 7.0（CEFR C1）的英语语法课程',
  },
};

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[c]));

function levelQuestions(lv) {
  return Array.isArray(lv) ? lv : (lv?.questions || []);
}

function countQuestions(unitList) {
  let n = 0;
  for (const u of unitList) for (const lv of Object.values(u.levels || {})) n += levelQuestions(lv).length;
  return n;
}

function skillsOfUnit(u) {
  const seen = new Set();
  for (const lv of Object.values(u.levels || {})) for (const q of levelQuestions(lv)) if (q.subSkill) seen.add(q.subSkill);
  for (const q of u.discover?.questions || []) if (q.subSkill) seen.add(q.subSkill);
  return [...seen];
}

// 两种数据形状统一成：[{ title, description, skills }]
function outline(course) {
  if (course.units) {
    const us = Array.isArray(course.units) ? course.units : Object.values(course.units);
    return { units: us.map((u) => ({ title: u.title, description: u.description, skills: skillsOfUnit(u) })), qn: countQuestions(us) };
  }
  const us = Object.values(course.unitsData || {});
  return {
    units: course.syllabus.map((s) => ({ title: s.title, description: s.description, skills: s.skills || [] })),
    qn: countQuestions(us),
  };
}

const STYLE = `
:root{--ink:#1d2433;--muted:#5b6475;--line:#e3e7ee;--bg:#f7f8fa;--card:#fff;--brand:#3f9a00;--brand-soft:#eef8e4}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);line-height:1.75;
  font-family:-apple-system,BlinkMacSystemFont,"PingFang SC","Hiragino Sans GB","Microsoft YaHei","Noto Sans SC",sans-serif}
a{color:var(--brand)}
.wrap{max-width:760px;margin:0 auto;padding-inline:16px;padding-block:20px 48px}
.top{display:flex;flex-wrap:wrap;align-items:baseline;column-gap:8px;font-weight:700;text-decoration:none;color:var(--ink);margin-bottom:24px;white-space:nowrap}
.top small{font-weight:400;color:var(--muted);white-space:normal}
@media (max-width:520px){.top small{flex-basis:100%}}
h1{font-size:clamp(24px,5vw,32px);line-height:1.35;margin:0 0 10px;text-wrap:balance}
.lead{color:var(--muted);margin:0 0 18px}
.facts{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 22px;padding:0;list-style:none}
.facts li{background:var(--card);border:1px solid var(--line);border-radius:999px;padding:3px 12px;font-size:14px}
.cta{display:inline-block;background:#58cc02;color:#fff;text-decoration:none;font-weight:700;
  padding:10px 20px;border-radius:12px;box-shadow:0 3px 0 #46a302}
.steps{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:14px 18px;margin:26px 0}
.steps h2{font-size:18px;margin:0 0 6px}
.steps ol{margin:0;padding-left:1.4em}
.unit{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:14px 18px;margin:0 0 12px}
.unit h2{font-size:18px;margin:0 0 2px}
.unit h2 span{color:var(--muted);font-weight:400;font-size:15px;margin-right:6px}
.unit p{margin:0 0 8px;color:var(--muted)}
.chips{display:flex;flex-wrap:wrap;gap:6px;margin:0;padding:0;list-style:none}
.chips li{background:var(--brand-soft);color:#2f6d00;border-radius:8px;padding:1px 9px;font-size:14px}
.more{margin-top:30px;padding-top:16px;border-top:1px solid var(--line);font-size:15px}
.more a{margin-right:14px}
footer{margin-top:26px;font-size:13px;color:var(--muted)}
`;

function page(course, all) {
  const m = META[course.id];
  const { units, qn } = outline(course);
  const url = `${SITE}/courses/${m.slug}.html`;
  const title = `${m.h1}｜Grammar Quest`;
  const desc = `${m.lead}。共 12 个单元、${qn} 道练习题，每个语法点分七步练：读故事发现规律，再认识、理解、运用、辨析、挑战，最后写作运用。先摸底再定计划，薄弱点专项复习，免费使用。`;
  const ld = {
    '@context': 'https://schema.org',
    '@type': 'Course',
    name: m.name,
    description: desc,
    url,
    inLanguage: 'zh-CN',
    educationalLevel: `CEFR ${course.cefr}`,
    isAccessibleForFree: true,
    provider: { '@type': 'Organization', name: 'Grammar Quest', url: `${SITE}/` },
    hasPart: units.map((u, i) => ({ '@type': 'CreativeWork', name: `第 ${i + 1} 单元 ${u.title}`, description: u.description })),
  };
  const others = all.filter((c) => c.id !== course.id)
    .map((c) => `<a href="${META[c.id].slug}.html">${esc(META[c.id].name)}</a>`).join('');

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${url}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Grammar Quest">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${url}">
<meta property="og:locale" content="zh_CN">
<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🏆</text></svg>">
<script type="application/ld+json">${JSON.stringify(ld)}</script>
<style>${STYLE}</style>
</head>
<body>
<div class="wrap">
  <a class="top" href="../">🏆 Grammar Quest <small>语法冒险 · 给中国孩子的英语语法精准练习</small></a>
  <main>
    <h1>${esc(m.h1)}</h1>
    <p class="lead">${esc(m.lead)}。下面是这套课程 12 个单元各自练哪些语法点，按学习顺序排列。</p>
    <ul class="facts">
      <li>CEFR ${esc(course.cefr)}</li><li>12 个单元</li><li>${qn} 道练习题</li><li>免费使用</li><li>电脑 · 手机都能用</li>
    </ul>
    <a class="cta" href="../">免费开始：先让孩子做 3 分钟摸底</a>

    <section class="steps">
      <h2>每个单元怎么练</h2>
      <ol>
        <li><b>发现</b>：先读一个小故事，自己发现语法规律</li>
        <li><b>认识、理解、运用、辨析、挑战</b>：五关练习，从看懂规则到分清易混点</li>
        <li><b>写作</b>：用学到的语法写一段自己的话</li>
      </ol>
      <p style="margin:8px 0 0;color:var(--muted)">哪里薄弱，复习中心会优先挑出来集中练。</p>
    </section>

    ${units.map((u, i) => `<section class="unit">
      <h2><span>第 ${i + 1} 单元</span>${esc(u.title)}</h2>
      ${u.description ? `<p>${esc(u.description)}</p>` : ''}
      ${u.skills.length ? `<ul class="chips">${u.skills.map((s) => `<li>${esc(skillName(s))}</li>`).join('')}</ul>` : ''}
    </section>`).join('\n    ')}

    <p class="more">其他课程：${others}<a href="../">回到 Grammar Quest</a></p>
  </main>
  <footer>课程按 CEFR 等级、参考剑桥英语语法纲要（English Grammar Profile）编排，不是官方考纲。</footer>
</div>
</body>
</html>
`;
}

mkdirSync('courses', { recursive: true });
const urls = [{ loc: `${SITE}/`, priority: '1.0' }];
for (const c of BUILTIN_COURSES) {
  if (!META[c.id]) continue;
  const html = page(c, BUILTIN_COURSES);
  writeFileSync(`courses/${META[c.id].slug}.html`, html);
  urls.push({ loc: `${SITE}/courses/${META[c.id].slug}.html`, priority: '0.8' });
  console.log(`courses/${META[c.id].slug}.html  ${html.length} 字节`);
}

// 网站是 #/ 路由，#about 之类在搜索引擎眼里和首页是同一个网址，不能单独列进 sitemap
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${u.loc}</loc><lastmod>${TODAY}</lastmod><priority>${u.priority}</priority></url>`).join('\n')}
</urlset>
`;
writeFileSync('sitemap.xml', sitemap);
console.log(`sitemap.xml  ${urls.length} 个网址`);
