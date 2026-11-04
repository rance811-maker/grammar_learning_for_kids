import { store } from '../store.js';

// 「这是什么」：站点的营销页，也是可以单独发给别人的地址（/#about），
// 公众号「阅读原文」、私聊回答「这是什么」都发它。
//
// 读者是还没决定注册的家长和雅思自学者：首屏一句话说清这是什么、能解决什么问题，
// 再用四步 + 截图讲清注册后怎么练，最后把收费、适合谁、数据这些问题放进可展开的问答里。
// 写法要快、要准：只讲用户关心的，不讲实现细节；每句话都要和产品实际一致。
//
// 为什么单独开一页：新用户打开站点会被 isPlacementNeeded() 直接送进摸底，到不了首页，
// 介绍放在首页对第一次点开链接的家长到达率是 0。

const IMG = 'img/about/';

// 长截图在 CSS 里只露上面一截（max-height），底边加一道渐隐，不像没加载完
function shot(file, alt, w, h) {
  const crop = h / w > 1.65;
  return `<figure class="about-shot${crop ? ' about-shot--crop' : ''}"><img src="${IMG}${file}" alt="${alt}" width="${w}" height="${h}" loading="lazy" decoding="async"></figure>`;
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

const icon = (e) => `<span aria-hidden="true">${e}</span>`;

const FAQ = [
  ['要收费吗？',
    '注册和做题都免费，题量不限。AI 批改有免费额度：写作每月 5 篇，下个月 1 号恢复；口语实战场可以免费体验 3 次，每次录音最长 10 分钟。'],
  ['适合什么水平？',
    '看水平，不看年龄。PET 课是 B1，适合备考 PET 的小学高年级和初中生；雅思 6 分课是 B2、7 分课是 C1，适合高中生和成人。三套课在首页随时切换，进度各记各的。'],
  ['孩子能自己用吗？',
    '能。界面是中文，首页一个大按钮直达今天要练的内容，每道题都有中文解析。家长第一次进家长专区时设一个 6 位数字密码，之后孩子改不了每日目标，也不能重置进度。'],
  ['手机能用吗？换设备进度还在吗？',
    '手机、平板、电脑的浏览器直接打开，不用下载。进度存在账号里，换设备登录接着学；几个孩子各用一个账号，进度不会串。'],
  ['内置课程不合适怎么办？',
    '家长可以用自己的 AI key，按孩子的目标和水平生成一套专属课程，也可以上传孩子正在用的教材，按教材的顺序出题。不会配置的话，可以付费请我们定制，加微信 rance811 沟通。'],
  ['孩子的数据安全吗？',
    '注册只要昵称、邮箱和密码，昵称不用写真名。进度存在账号里，别的用户看不到。作文和口语只用于 AI 批改，不公开；口语录音交给语音识别服务转成文字，我们的服务器不存录音，回放用的录音只留在你自己的设备上，服务器上的口语批改记录可以随时一键删除。我们统计页面访问和练习完成情况，只用来改进网站，统计里不记 IP，也不记答题内容。'],
];

export function render() {
  // 主按钮：没登录先去注册（注册完会自动进摸底）；登录过期的去重新登录；
  // 还没做摸底的去做摸底；已经在学的回学习地图。
  // 已经在学的孩子点品牌名就能进这一页，以前点一下大绿按钮就重做摸底、学习计划进度清零，
  // 而且一句提示都没有。重新摸底只放在家长专区，要家长密码加确认。
  const demo = store.isDemo();
  let primary;
  if (store.sessionExpired()) primary = '<a class="btn btn--primary btn--large" href="#account">重新登录，接着学</a>';
  else if (demo) primary = '<a class="btn btn--primary btn--large" href="#account/register">免费注册，做 3 分钟摸底</a>';
  else if (store.isPlacementNeeded()) primary = '<a class="btn btn--primary btn--large" href="#placement">开始 3 分钟摸底</a>';
  else primary = '<a class="btn btn--primary btn--large" href="#">回到学习地图</a>';
  const secondary = demo
    ? '<a class="about-actions__link" href="#">不注册，先看示例账号 ›</a>'
    : '<a class="btn btn--secondary" href="#parent">进入家长专区</a>';
  const actions = `<div class="about-actions">${primary}${secondary}</div>`;

  return `
    <div class="view view-about">
      <div class="about-hero">
        <h1 class="about-hero__title">语法题没少刷，<span class="about-hero__hl">错的还是那几处？</span></h1>
        <p class="about-hero__lead">备考 PET 和雅思的英语语法练习：先用 3 分钟摸底，找出没掌握的语法点，先练这几个。</p>
        <ul class="about-facts">
          <li><b>3 套课</b>PET · 雅思 6 分 / 7 分</li>
          <li><b>1,499 道题</b>每题有中文解析</li>
          <li><b>AI 批改</b>写作逐句改，口语也能查</li>
          <li><b>免费练</b>手机浏览器直接用</li>
        </ul>
        ${actions}
      </div>

      <h2 class="about-h2">注册后这样练</h2>
      ${step(1, '3 分钟摸底，先练缺的',
        '12 道题，每个语法点一道。会的不用从头学，学习计划从没掌握的排起。之后每天打开首页点一个按钮就能练，默认每天 2 关。',
        shot('placement.webp', '摸底结果：掌握了的语法点打勾，没掌握的打叉', 780, 1250))}
      ${step(2, '不只选 ABC，错哪儿标哪儿',
        '选择、填空、找错、排序、连线、情境对话 6 种题型，填空要自己写出来。每个空单独判，填错的空当场给出正确写法。',
        shot('practice.webp', '多空填空题：填对的空标绿，填错的 sat 标红，并给出正确写法 was sitting', 780, 698))}
      ${step(3, '写作，AI 逐句批改',
        '写完 AI 逐句检查：错的句子标出错在哪、为什么错，并给出改好的整句；雅思课还多给一句「7 分写法」。每月免费批改 5 篇。',
        shot('writing.webp', '写作批改结果：错句划掉，给出改正后的句子和中文原因', 780, 960))}
      ${step(4, '错题自己回来',
        '做错的题和正确率最低的语法点会被自动挑出来，点一下就能专项复习；平时练新内容时，也会穿插几道薄弱语法点的题。',
        shot('review.webp', '复习中心：一键复习薄弱点，列出正确率最低的语法点', 780, 1630))}

      <div class="about-section">
        <h2>${icon('🎙️')} 口语录音也能查语法</h2>
        <p>做题全对，一开口还是 "Yesterday I go…"？在「口语实战场」上传一段 10 分钟以内的录音（外教课片段，或者对着题目说几分钟），AI 挑出时态、冠词、单复数等语法错误，每一条都标着在录音里的时间。每个账号可以免费体验 3 次。</p>
      </div>

      <div class="about-section about-section--split">
        <div>
          <h2>${icon('👨‍👩‍👧')} 家长每周看一眼就够</h2>
          <p>学习报告写明练了几天、正确率多少、最弱的几个语法点，还有一段中文小结。用你自己的手机登录孩子的账号就能看；家长专区用家长自己设的密码锁着，孩子改不了。</p>
        </div>
        ${shot('report.webp', '家长学习报告：预估达成度、中文小结、积分、连续天数和综合正确率', 780, 1230)}
      </div>

      <div class="about-section about-section--split">
        <div>
          <h2>${icon('📝')} 自学雅思：冲 6 分、7 分</h2>
          <p>雅思 6 分（B2）、7 分（C1）两套课，练写作和口语里用得上的语法。7 分课每道题都标明用在写作 Task 1/2 还是口语 Part 1–3；每个单元先读一篇范文，理解题选错了先给一句中文提示，让你再想一次。注册后在首页换成雅思课就能学。</p>
        </div>
        ${shot('ielts.webp', '雅思 7 分课：读范文后的理解题选错了，先给中文提示再选一次', 780, 1280)}
      </div>

      <h2 class="about-h2">常见问题</h2>
      <div class="about-faq">
        ${FAQ.map(([q, a]) => `<details><summary>${q}</summary><p>${a}</p></details>`).join('')}
      </div>

      ${actions}
      <p class="about-contact">有问题直接加微信 rance811</p>
    </div>`;
}
