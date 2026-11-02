import { store } from '../store.js';

// 「这是什么」——站点定位的正式住址，也是可以单独发给别人的地址（/#about）。
//
// 为什么单独开一页：定位长文案原本放在首页内容区，但新用户打开站点会被
// app.js 的 isPlacementNeeded() 直接重定向到 #placement，根本到不了首页。
// 也就是说那段话对它真正的读者（第一次点开链接的家长）到达率是 0，
// 却天天挡在孩子和练习按钮之间——两头不讨好。

export function render() {
  // 底部的大按钮：还没做过摸底（或没登录，先去注册）才给「做摸底」。
  // 已经在学的孩子点品牌名就能进这一页，以前点一下大绿按钮就重做摸底、学习计划进度清零，
  // 而且一句提示都没有。重新摸底只放在家长专区，要家长密码加确认。
  const placementCta = store.isDemo() || store.isPlacementNeeded()
    ? '<a class="btn btn--primary btn--large" href="#placement">让孩子先做 3 分钟摸底</a>'
    : '<a class="btn btn--primary btn--large" href="#">回到学习地图</a>';
  return `
    <div class="view view-about">
      <div class="about-hero">
        <h1 class="about-hero__title">给中国孩子的英语语法精准练习</h1>
        <p class="about-hero__lead">
          不做通用题库——按孩子的<strong>考试目标</strong>和<strong>当前水平</strong>定制课程，只练该练的。
          家长还可以定制自己的课程（要自备 AI key，或付费请我们做）；写作由 AI 逐句批改，指出错在哪、为什么错；
          开口说的英语也能拿来批改，找出真说话时还在犯的错。
        </p>
      </div>

      <div class="about-section">
        <h2>先摸底，再定计划</h2>
        <p>
          孩子第一次进来先做 12 道题，每个单元一题。做完就知道哪些语法点已经掌握、
          哪些还要练，后面的学习计划按这个结果排——不是所有孩子都从第一单元开始。
        </p>
      </div>

      <div class="about-section">
        <h2>家长可以自定义整套课程</h2>
        <p>
          内置 PET、雅思 6 分、雅思 7 分三套课程，免费注册就能用。
          如果孩子的目标不在其中，有两条路：一是家长在「家长专区」填上自己的 AI key（Gemini 或 Claude），
          按目标和水平自己生成一套，还可以上传教材或考纲让课程照着编排；
          二是不想折腾，付费请我们按孩子的情况定制。
        </p>
        <p class="about-note">
          每套课程都能在「查看语法提纲」里看清 12 个单元分别练什么、按什么顺序练。
        </p>
      </div>

      <div class="about-section">
        <h2>写作是逐句批改的</h2>
        <p>
          孩子写完一段话，AI 会一句一句看：哪句有问题、错在哪、为什么错，
          并给出改正后的完整句子。它也会检查前后是否自相矛盾——
          比如上一句说 dinner、下一句写成 lunch，这类错误单看一句是发现不了的。
        </p>
        <p class="about-note">
          批改由网站免费提供，每个账号每月 5 篇；家长配了自己的 AI key 就不限次数。
        </p>
      </div>

      <div class="about-section">
        <h2>开口说的话也能批改</h2>
        <p>
          题做对了、作文写对了，一开口还是会说出 "Yesterday I go..."——做题和说话是两回事。
          在「口语实战场」把一段真实开口的录音传上来（一节外教课，或者对着题目自己说三分钟），
          按时态、冠词、单复数等八类语法挑出错误，每一条都能点回录音那一秒核对。
          攒几节课之后，告诉孩子反复犯的是哪几类、每一类该怎么练。
        </p>
        <p class="about-note">
          口语批改要花真钱（语音转文字 + AI 逐句看），所以每个账号先有 3 次免费，每次录音最长 10 分钟。
        </p>
      </div>

      <div class="about-section about-section--plain">
        <h2>关于"精准"这两个字</h2>
        <p>
          课程按 CEFR 等级、参考剑桥英语语法纲要（English Grammar Profile）编排，
          从基础到进阶排序。但要说清楚：<strong>它不是官方考纲</strong>。
          剑桥并不公布固定的语法清单，任何声称"覆盖官方考点百分之多少"的说法都不成立。
          这里说的精准，指的是<strong>按孩子的实际水平只练该练的</strong>，不是宣称押中考题。
        </p>
      </div>

      <div class="about-section about-section--plain">
        <h2>我们记录哪些数据</h2>
        <p>
          为了知道网站好不好用，我们会记录访问和练习情况：打开了哪些页面、停留多久、
          用的是手机还是电脑、完成了哪一关和对了几题。没登录时这些记录是匿名的；
          登录后会关联到你的账号（比如能看到这个账号最近一次是什么时候来的）。
          不记录 IP 地址，也不记录答题内容。
          登录后，学习进度会保存在你的账号里，方便换设备继续练。
        </p>
        <p>
          孩子提交的作文会发给网站的批改服务，由 AI 逐句批改，不会公开；
          家长配了自己的 AI key 时，作文直接发给那家 AI 服务（Google 的 Gemini 或 Anthropic 的 Claude）。
        </p>
        <p>
          口语实战场另说：录音文件只留在你自己的设备上，不上传；转写出来的文字和批改结果存在你的账号下。
          批改过程中，录音会发给语音识别服务 Deepgram 转成文字，文字再发给 Anthropic 的 Claude 逐句批改——
          这两步是批改必需的。设置里可以随时把服务器上属于你的口语记录全部删掉。
        </p>
      </div>

      <div class="about-actions">
        ${placementCta}
        <a class="btn btn--secondary" href="#parent">进入家长专区</a>
      </div>
    </div>`;
}
