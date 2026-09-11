// 「这是什么」——站点定位的正式住址，也是可以单独发给别人的地址（/#about）。
//
// 为什么单独开一页：定位长文案原本放在首页内容区，但新用户打开站点会被
// app.js 的 isPlacementNeeded() 直接重定向到 #placement，根本到不了首页。
// 也就是说那段话对它真正的读者（第一次点开链接的家长）到达率是 0，
// 却天天挡在孩子和练习按钮之间——两头不讨好。

export function render() {
  return `
    <div class="view view-about">
      <div class="about-hero">
        <h1 class="about-hero__title">给中国孩子的英语语法精准练习</h1>
        <p class="about-hero__lead">
          不做通用题库——按孩子的<strong>考试目标</strong>和<strong>当前水平</strong>定制课程，只练该练的。
          家长可自定义整套课程；写作由 AI 逐句批改，指出错在哪、为什么错。
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
          内置 PET、雅思 6 分、雅思 7 分三套课程，打开就能用。
          如果孩子的目标不在其中，家长可以在「家长专区」按目标和水平定制一套新的，
          也可以上传自己的教材或考纲让课程照着编排。
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

      <div class="about-actions">
        <a class="btn btn--primary btn--large" href="#placement">让孩子先做 3 分钟摸底</a>
        <a class="btn btn--secondary" href="#parent">进入家长专区</a>
      </div>
    </div>`;
}
