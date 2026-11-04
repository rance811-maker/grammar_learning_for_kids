import { store } from '../store.js';

// 「这是什么」：站点的营销页，也是可以单独发给别人的地址（/#about），
// 公众号「阅读原文」、私聊回答「这是什么」都发它。
//
// 读者是还没决定注册的家长和雅思自学者：先一句话说清解决什么问题，
// 再用四步 + 截图讲清每天怎么练，最后把收费、适合谁、数据这些问题放进可展开的问答里。
// 写法要快、要准：只讲用户关心的，不讲实现细节。
//
// 为什么单独开一页：新用户打开站点会被 isPlacementNeeded() 直接送进摸底，到不了首页，
// 介绍放在首页对第一次点开链接的家长到达率是 0。

const IMG = 'img/about/';

function shot(file, alt, w, h) {
  return `<figure class="about-shot"><img src="${IMG}${file}" alt="${alt}" width="${w}" height="${h}" loading="lazy" decoding="async"></figure>`;
}

function step(n, title, body, img) {
  return `
    <div class="about-step">
      <div class="about-step__text">
        <div class="about-step__num">${n}</div>
        <h3>${title}</h3>
        <p>${body}</p>
      </div>
      ${img}
    </div>`;
}

const FAQ = [
  ['要收费吗？',
    '注册和练习都免费。写作 AI 批改每个账号每月免费 5 篇，口语实战场有 3 次免费。家长配了自己的 AI key，写作批改不限次数。'],
  ['适合什么水平？',
    '按水平选，不按年龄：PET 课对应 B1；雅思 6 分课对应 B2，雅思 7 分课对应 C1，适合中学生和成人。不确定的，先做 3 分钟摸底。'],
  ['孩子能自己用吗？',
    '能。界面是中文，首页一个大按钮直达今天要练的那一关，每道题都有中文解析。家长专区有 6 位数字密码，孩子改不了每日目标，也不能重置进度。'],
  ['手机能用吗？换设备进度还在吗？',
    '手机、平板、电脑的浏览器直接打开，不用下载。进度存在账号里，换设备登录接着学；几个孩子各用一个账号，进度不会串。'],
  ['内置课程不合适怎么办？',
    '家长可以在家长专区用自己的 AI key，按孩子的目标和水平生成一套课程，还能上传教材让课程照着编排；也可以付费请我们定制，加微信 rance811 沟通。'],
  ['孩子的数据安全吗？',
    '注册只要昵称、邮箱和密码，昵称不用填真名。进度存在账号里，只有自己能看。作文和口语转写只用于 AI 批改，不公开；口语录音只留在你自己的设备上，服务器上的口语记录可以随时一键删除。我们会统计页面访问和练习完成情况，用来改进网站，不记录 IP 和答题内容。'],
];

export function render() {
  // 主按钮：还没做过摸底（或没登录，先去注册）才给「做摸底」。
  // 已经在学的孩子点品牌名就能进这一页，以前点一下大绿按钮就重做摸底、学习计划进度清零，
  // 而且一句提示都没有。重新摸底只放在家长专区，要家长密码加确认。
  const demo = store.isDemo();
  const primary = demo || store.isPlacementNeeded()
    ? `<a class="btn btn--primary btn--large" href="#placement">${demo ? '免费注册，做 3 分钟摸底' : '开始 3 分钟摸底'}</a>`
    : '<a class="btn btn--primary btn--large" href="#">回到学习地图</a>';
  const secondary = demo
    ? '<a class="btn btn--secondary" href="#">先看看示例</a>'
    : '<a class="btn btn--secondary" href="#parent">进入家长专区</a>';
  const actions = `<div class="about-actions">${primary}${secondary}</div>`;

  return `
    <div class="view view-about">
      <div class="about-hero">
        <h1 class="about-hero__title">语法题没少刷，<span class="about-hero__hl">错的还是那几处？</span></h1>
        <p class="about-hero__lead">先用 3 分钟摸底，找到缺的那几个语法点，只练这几个。</p>
        <ul class="about-facts">
          <li><b>3 套课</b>PET · 雅思 6 分 · 雅思 7 分</li>
          <li><b>1,499 道题</b>每题有中文解析</li>
          <li><b>AI 批改</b>写作逐句改，口语也能改</li>
          <li><b>免费</b>手机浏览器直接用</li>
        </ul>
        ${actions}
      </div>

      <h2 class="about-h2">每天这样练</h2>
      ${step(1, '3 分钟摸底，只练缺的',
        '12 道题，一个单元一道。会的单元直接解锁，没掌握的排进学习计划。之后每天点首页一个按钮就行。',
        shot('placement.webp', '摸底结果：会的单元打勾，没掌握的打叉', 780, 1250))}
      ${step(2, '自己动手写，错哪儿标哪儿',
        '选择、填空、找错、排序、连线、情境对话 6 种题型。填空一个空一个空判，错的空直接给出正确写法；wouldn\'t 和 would not 都算对。',
        shot('practice.webp', '多空填空题：对的空标绿，错的空标红并给出正确写法', 780, 963))}
      ${step(3, '写作，AI 逐句批改',
        '每一句都标出错在哪、为什么错，给出改好的整句；雅思课还给「7 分写法」。每个账号每月免费批改 5 篇。',
        shot('writing.webp', 'AI 批改结果：错句划掉，给出改正和中文原因，附 7 分写法', 780, 1750))}
      ${step(4, '错题自己回来',
        '做错的题和正确率最低的语法点自动挑出来，点一下就专项复习。平时闯关也会穿插几道。',
        shot('review.webp', '复习中心：一键复习薄弱点，列出正确率最低的语法点', 780, 1630))}

      <div class="about-section">
        <h2>🎙️ 开口说的也能批改</h2>
        <p>做题对了，一开口还是 "Yesterday I go…"？在「口语实战场」上传一段录音（外教课，或者对着题目说三分钟），
          挑出时态、冠词、单复数等语法错误，每一条都能点回录音那一秒。每个账号 3 次免费。</p>
      </div>

      <div class="about-section about-section--split">
        <div>
          <h2>👨‍👩‍👧 家长每周看一眼就够</h2>
          <p>学习报告写明练了几天、正确率多少、最弱的 5 个语法点，还有一段中文小结。家长专区用密码锁着，孩子改不了。</p>
        </div>
        ${shot('report.webp', '家长学习报告：活跃天数、正确率、近 7 天趋势', 780, 1590)}
      </div>

      <div class="about-section about-section--split">
        <div>
          <h2>📝 备考雅思、自己学</h2>
          <p>雅思 6 分（B2）、7 分（C1）两套课，注册就能学。7 分课的题大多标明用在写作还是口语，读的是口语 Part 2–3 这样的考试语篇；选错了先给一句中文提示，让你再想一次。</p>
        </div>
        ${shot('ielts.webp', '雅思 7 分课：选错后先给中文提示，再选一次', 780, 1280)}
      </div>

      <h2 class="about-h2">常见问题</h2>
      <div class="about-faq">
        ${FAQ.map(([q, a]) => `<details><summary>${q}</summary><p>${a}</p></details>`).join('')}
      </div>

      ${actions}
    </div>`;
}
