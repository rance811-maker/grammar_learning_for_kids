# 两个产品 Skill（分享用 Takeaway）

配合《自己出题 · AI 时代的产品课》系列分享使用。

| Skill | 解决什么 | 什么时候用 |
|---|---|---|
| **`prd-coach`** | 把模糊想法追问成可执行需求 | 你说"我想做个 X"，但还没想清楚 |
| **`biz-review`** | 判断这事作为生意成不成立 | 自用产品做出来了，想知道能否商业化 |

两个 skill 对应两条不同的路：**自用**只需要 `prd-coach`；**想做成生意**，才需要 `biz-review`。

---

## 安装

### 方式一：装到某个项目里（推荐新手）

```bash
# 在你的项目根目录下
mkdir -p .claude/skills
# 把 prd-coach/ 和 biz-review/ 两个目录复制进去
```

目录结构应该长这样：

```
你的项目/
└── .claude/
    └── skills/
        ├── prd-coach/
        │   └── SKILL.md
        └── biz-review/
            └── SKILL.md
```

### 方式二：全局安装（所有项目都能用）

```bash
mkdir -p ~/.claude/skills
cp -r prd-coach biz-review ~/.claude/skills/
```

装好后在 Claude Code 里执行 `/skills` 就能看到它们。

---

## 用法

装好之后，**你不需要记命令**——正常说话就会被自动调起：

```
我想做一个帮我孩子练英语语法的小工具
```
→ 自动进入 `prd-coach`，开始逐条追问，最后产出 `PRD.md`

```
我这个工具能不能商业化？
```
→ 自动进入 `biz-review`，五个维度逐一评审，最后给结论和评分

也可以直接点名调用：

```
/prd-coach
/biz-review
```

---

## 两句话心法

- **AI 不会拒绝一个烂需求，它会认真地把烂需求实现出来。** 所以动手前先用 `prd-coach` 把需求逼清楚。
- **代码是最便宜的部分，商业化要解决的全是代码解决不了的。** 所以投入前先用 `biz-review` 照照镜子。
