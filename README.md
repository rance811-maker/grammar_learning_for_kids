# Grammar Quest · 语法冒险

一款对齐 **Cambridge Think 2** 教材、瞄准 **PET（B1）** 语法考点的趣味闯关式英语语法练习工具。专为 11 岁左右、备考 PET 的孩子设计。

> 设计理念：语法不是孤立的知识点，而是**用来说句子、写作文的工具**。所以每个关卡不只是做题，还要"学以致用"——用刚学的语法完成一个真实写作任务。

---

## 核心特色

- **闯关地图**：12 个语法 Unit，像多邻国一样一关一关解锁
- **三阶段学习**：每个 Unit = 发现（Discover）→ 练习（Practice）→ 任务（Mission）
- **6 种趣味题型**：选择、配对、排序、找错、填空、情境对话
- **能量 + 连击 + 段位**：3 颗能量、combo 加成、青铜→大师段位
- **自适应出题**：追踪每个语法点的掌握度，薄弱点自动加练（间隔重复）
- **作品集**：每个写作任务的成果保存成"文章卡片"，看得见自己的进步
- **进度追踪**：掌握度、正确率、连续天数、徽章墙、历史战绩
- **中文界面 + 英文题目**：操作和语法解释用中文，题目内容全英文

---

## 12 个语法关卡

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

共 **480 道练习题** + 36 道发现题 + 60 个写作脚手架。

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

进度自动保存在浏览器 **localStorage**，换设备/清缓存会丢失（单机工具，无后端）。

---

## 技术架构

```
grammar-quest/
├── index.html              # 应用骨架，挂载点 #app
├── css/style.css           # 全部样式 + 动画（受多邻国启发的配色）
└── js/
    ├── app.js              # 路由（hash 路由）+ 应用外壳（顶栏 + 底部 tab）
    ├── store.js            # 状态管理 + localStorage 持久化 + 段位/解锁/掌握度
    ├── engine.js           # 自适应出题引擎 + 答案判定 + 计分
    ├── data/
    │   ├── units.js        # 归一化适配器：把原始题库转成统一格式，导出 units
    │   └── units-01-03.js  # 原始题库（按批次组织）
    │   └── units-04-06.js
    │   └── units-07-09.js
    │   └── units-10-12.js
    └── views/              # 各页面视图（每个导出 render() / mount()）
        ├── home.js         # 关卡地图
        ├── unit.js         # 关卡详情（三阶段）
        ├── discover.js     # 发现阶段（读故事 + 注意语法）
        ├── practice.js     # 练习阶段（6 种题型 + 反馈 + 结算）
        ├── mission.js      # 写作任务（脚手架 + 语法检查 + 成果）
        ├── portfolio.js    # 作品集
        └── stats.js        # 我的（段位/掌握度/徽章/历史）
```

**数据流**：`views` → `engine`（出题/判题）→ `store`（读写状态）→ `localStorage`。

**为什么有适配器层**：题库（`units-*.js`）按内容创作的紧凑格式编写，`units.js` 在加载时把它归一化成引擎和视图期望的统一结构（按 id 索引的对象、`levels[n].questions`、统一的题型字段名、为每题分配稳定 id）。这样内容创作和程序逻辑解耦，方便扩展。

---

## 如何扩展题库

在对应的 `units-XX.js` 批次里给某个 Unit 的 `practice[level]` 数组加题即可。题型格式见 `units.js` 里的归一化函数注释。每道题建议带上 `subSkill` 字段（用于掌握度追踪和薄弱点复习）。

---

## 数据 / 隐私

- 全部数据存在本机浏览器，不上传任何服务器
- 没有账号、没有登录、没有网络请求
- 适合家长放心给孩子用
