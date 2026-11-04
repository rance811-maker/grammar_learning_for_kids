# Grammar Quest · 语法冒险

给中国孩子的英语语法精准练习网站（www.grammar-quest.net）。中文界面、英文题目，内置三套语法课程：

- **PET（CEFR B1）**：给 10–13 岁、备考剑桥 PET 的孩子
- **雅思 6 分（CEFR B2）**、**雅思 7 分（CEFR C1）**：给备考雅思的学生

家长还可以定制自己的课程：自备 AI key（Gemini / Claude）在家长专区生成，或者付费请我们定制。

> 设计理念：语法不是孤立的知识点，而是**用来说句子、写作文的工具**。所以每个关卡不只是做题，还要"学以致用"——用刚学的语法完成一个真实写作任务。

---

## 核心特色

- **注册后才能使用**：没登录只能看示例数据（每页标明「示例数据」），练习、摸底、写作、家长专区需要先注册
- **摸底测试**：注册后先做 12 题快速摸底（每单元 1 题），已掌握的语法自动解锁
- **学习计划 + 冲刺模式**：根据摸底结果生成「10 次练习」冲刺计划，主页一键「开始今天的练习」，全部完成可获结业证书
- **闯关地图**：12 个语法 Unit，像多邻国一样一关一关解锁
- **三阶段学习**：每个 Unit = 发现（Discover）→ 练习（Practice）→ 任务（Mission）
- **6 种趣味题型**：选择、配对、排序、找错、填空、情境对话
- **能量 + 连击 + 段位**：能量、combo 加成、青铜→大师段位
- **自适应出题**：追踪每个语法点的掌握度，薄弱点自动加练（间隔重复）
- **错题本 + 复习中心**：答错的题自动收进错题本，一键「复习我的薄弱点」
- **模拟挑战（BOSS）**：跨单元综合大考，正确率达 70% 即通关并获得证书徽章
- **作文逐句批改**：写作任务交上去由 AI 逐句批改。网站免费提供，每个账号每月 5 篇；家长配了自己的 AI key 不限次数
- **口语实战场**：上传一段开口说英语的录音，按语法类别挑出说错的地方
- **作品集**：每个写作任务的成果保存成"文章卡片"，看得见自己的进步
- **进度追踪**：掌握度、正确率、连续天数、徽章墙、历史战绩
- **音效 + 庆祝动画**：答题反馈音、连击音、满星/通关撒花（页面顶部随时可以关声音）
- **家长专区**（要家长密码）：每日目标、重新摸底、学习报告、切换 / 定制课程、AI key、重置进度
- **云端账号**：进度存在账号里，手机、平板、电脑登录同一个账号都能接着学
- **中文界面 + 英文题目**：操作和语法解释用中文，题目内容全英文

---

## PET 课程的 12 个单元

（雅思 6 分、7 分两套课程的单元见 `courses/ielts6.html`、`courses/ielts7.html`。）

| # | 语法点 | 写作任务 |
|---|--------|----------|
| 1 | Present Simple & Continuous | My Daily Life |
| 2 | Past Simple & Past Continuous | My Weekend Adventure |
| 3 | Present Perfect vs Past Simple | My Bucket List 人生愿望清单 |
| 4 | Comparatives & Superlatives | Restaurant Review 美食评测 |
| 5 | Modal Verbs | Advice Column 建议信箱 |
| 6 | Future Forms | Dream Holiday Plan 梦想假期 |
| 7 | First & Second Conditionals | If I Had Superpowers 超能力幻想 |
| 8 | Passive Voice | Breaking News 新闻播报 |
| 9 | Relative Clauses | Guess Who 猜猜是谁 |
| 10 | Gerunds & Infinitives | About Me 兴趣档案 |
| 11 | Reported Speech | Interview Report 采访报道 |
| 12 | Articles & Quantifiers | My Fridge & Shopping List |

PET 课程共 **480 道练习题**（12 个单元 × 5 关 × 8 题）+ 发现题 + 写作任务。

---

## 本地运行

纯静态站点，**零依赖、无需构建**。但因为用了 ES Module，必须通过 HTTP 服务打开（不能直接双击 `index.html`，`file://` 协议下模块加载会被浏览器拦截）。

任选一种方式启动本地服务器：

```bash
# Python（最常见）
cd grammar-quest
python3 -m http.server 8000

# 或 Node
npx serve grammar-quest

# 或 VS Code 装 "Live Server" 插件，右键 index.html → Open with Live Server
```

然后浏览器打开 `http://localhost:8000`。

网站要注册后才能练习，账号和进度存在 **Supabase**（`js/supabaseConfig.js`），浏览器 localStorage 里只是本机缓存。没登录时看到的是示例数据。
作文批改走 Supabase 云函数 `supabase/functions/gq-review-writing`，口语实战场的后端在 `netlify/functions`。建表脚本和说明见 `docs/`。

---

## 技术架构

```
grammar-quest/
├── index.html              # 应用骨架，挂载点 #app
├── css/style.css           # 全部样式 + 动画（受多邻国启发的配色）
├── courses/                # 三套内置课程的静态介绍页（给搜索引擎）
├── netlify/functions/      # 口语实战场的后端
├── supabase/functions/     # 作文批改云函数
├── docs/                   # 建表脚本、账号系统说明
└── js/
    ├── app.js              # 路由（hash 路由）+ 应用外壳（侧边栏 + 顶栏）
    ├── store.js            # 状态管理 + 云端同步 + 段位/解锁/掌握度/计划/错题本
    ├── cloud.js            # Supabase 登录、存档读写
    ├── curriculum.js       # 当前在学哪套课（内置 / 自定义）
    ├── engine.js           # 自适应出题引擎 + 答案判定 + 计分（含复习/BOSS 出题）
    ├── writingCoach.js     # 作文批改（网站云函数，或家长自己的 AI key）
    ├── unitGenerator.js    # 用家长的 AI key 生成自定义课程
    ├── analytics.js        # 访问统计
    ├── sound.js            # Web Audio 合成音效（无音频文件依赖）
    ├── celebrate.js        # 撒花庆祝动画（纯 DOM，无依赖）
    ├── data/
    │   ├── units.js        # 归一化适配器：把 PET 原始题库转成统一格式
    │   ├── units-01-03.js  # PET 原始题库（按批次组织，另有 04-06、07-09、10-12）
    │   ├── courses/        # 雅思 6 分、7 分课程
    │   ├── builtinCourses.js # 三套内置课程的登记
    │   └── skill-names.js  # 语法点的中文名映射
    └── views/              # 各页面视图（每个导出 render() / mount()）
        ├── home.js         # 学习地图 + 学习计划 + 今日练习 + BOSS 入口
        ├── placement.js    # 摸底测试
        ├── unit.js         # 单元详情（三阶段）
        ├── discover.js     # 发现阶段（读故事 + 注意语法）
        ├── practice.js     # 练习阶段（6 种题型 + 反馈 + 结算，复用于复习/BOSS）
        ├── mission.js      # 写作任务（脚手架 + AI 批改 + 成果）
        ├── review.js       # 复习中心（错题本 + 薄弱点）
        ├── portfolio.js    # 作品集
        ├── stats.js        # 我的（段位/掌握度/徽章/历史）
        ├── oral.js         # 口语实战场
        ├── parent.js       # 家长专区（设置、学习报告、课程定制、AI key）
        ├── account.js      # 登录 / 注册 / 找回密码
        ├── gate.js         # 没登录时的注册引导
        ├── syllabus.js     # 语法提纲
        ├── about.js        # 「这是什么」
        ├── feedback.js     # 意见反馈
        └── install.js      # 添加到桌面
```

**数据流**：`views` → `engine`（出题/判题）→ `store`（读写状态）→ localStorage 缓存 + Supabase 云端存档。

**为什么有适配器层**：题库（`units-*.js`）按内容创作的紧凑格式编写，`units.js` 在加载时把它归一化成引擎和视图期望的统一结构（按 id 索引的对象、`levels[n].questions`、统一的题型字段名、为每题分配稳定 id）。这样内容创作和程序逻辑解耦，方便扩展。

---

## 如何扩展题库

在对应的 `units-XX.js` 批次里给某个 Unit 的 `practice[level]` 数组加题即可。题型格式见 `units.js` 里的归一化函数注释。每道题建议带上 `subSkill` 字段（用于掌握度追踪和薄弱点复习）。

---

## 数据 / 隐私

和网站「这是什么」页的说明一致：

- 注册要一个家长邮箱；学习进度存在云端账号里，换设备登录接着学
- 访问统计记录打开了哪些页面、停留多久、设备类型、完成了哪一关和对了几题；没登录时是匿名的，登录后关联到账号。不记录 IP 和答题内容
- 作文发给网站的批改服务由 AI 逐句批改，不公开；家长配了自己的 AI key 时，直接发给那家 AI 服务。家长的 key 只存在那台设备的浏览器里
- 口语实战场：录音文件不存到服务器（批改时发给语音识别服务转成文字），转写文字和批改结果存在账号下，可以随时全部删除
