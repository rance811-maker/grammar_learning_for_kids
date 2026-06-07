# 切回 Netlify 操作手册

> 触发方式：用户说「切回 netlify」，助手读本文件照做。
> 目标：把最新代码（main 分支）部署到原网址 **https://grammar-quest-pet.netlify.app/**，
> 并让账号系统（Supabase 邮件链接）在该网址上正常工作。

## 背景与关键信息

- **Netlify 站点 ID**：`1df0b778-c38b-4a8e-ac7d-42d2e3e4bc77`
- **站点名**：`grammar-quest-pet`
- **原网址**：https://grammar-quest-pet.netlify.app/
- **部署源**：`main` 分支根目录（纯静态，无需构建）
- **当前可用的备用线上**：GitHub Pages（https://rance811-maker.github.io/grammar_learning_for_kids/），切回 Netlify 后可保留作备份
- 站点里所有资源用**相对路径**，根目录(Netlify)和子路径(Pages)都能正常工作。

## 前置条件（需要用户确认/提供）

1. **Netlify 额度已恢复**（之前是 "Account credit usage exceeded" 被卡）。
2. **一个有效的 Netlify 个人令牌**（旧令牌 `nfp_Y8rr...` 应已吊销）。
   - 用户到 Netlify → User settings → Applications → Personal access tokens 新建一个，发给助手。

## 助手执行步骤

### 1) 部署最新代码到 Netlify
云端环境无法直连 Netlify（403 Host not in allowlist），所以用 GitHub Actions runner 部署：

1. 确保 main 是最新的（必要时先 bump `js/app.js` 的 `BUILD_VERSION` 和 `index.html` 的 `?v=` 并推送）。
2. 从 main 新建临时分支 `deploy-netlify-temp`，加入工作流 `.github/workflows/deploy.yml`：

```yaml
name: Deploy to Netlify
on:
  push:
    branches: [deploy-netlify-temp]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm install -g netlify-cli@17
      - env:
          NETLIFY_AUTH_TOKEN: <用户给的新令牌>
        run: |
          netlify link --id 1df0b778-c38b-4a8e-ac7d-42d2e3e4bc77
          netlify deploy --prod --dir=.
```
   注意：netlify-cli v17 **不要**加 `--no-build`（会报 unknown option）。默认就不构建。

3. push 临时分支触发 Actions，用 `mcp__github__actions_*` 工具盯运行结果。
4. 成功后清理：删除临时分支与工作流（git 代理删不了远程分支时，让用户在 GitHub 网页删）。
5. 部署成功后**提醒用户去 Netlify 吊销这个一次性令牌**。

### 2) 让账号系统在 Netlify 网址上工作（重要）
去 Supabase 控制台 → **Authentication → URL Configuration**：
- **Redirect URLs** 里 Add：`https://grammar-quest-pet.netlify.app/`
- 视需要把 **Site URL** 也改成该网址（决定邮件链接默认跳哪个域名）。
- 保留 GitHub Pages 那个网址在白名单里也无妨（两个域名都能用）。

> 不做这步：在 Netlify 域名上点"找回密码/确认"邮件里的链接会跳转失败。

### 3)（可选，一劳永逸）把 Netlify 直连仓库自动部署
桌面浏览器 app.netlify.com → 项目 grammar-quest-pet → Site configuration →
Build & deploy → Continuous deployment → Link repository → GitHub →
`rance811-maker/grammar_learning_for_kids`，设置 Branch=`main`、Build command=空、
Publish directory=`.`。之后推 main 自动部署，无需再走临时工作流。

## 验证

- 打开 https://grammar-quest-pet.netlify.app/ ，右下角 build 角标 = 最新版本号。
- 注册/登录/找回密码在该网址上能跑通（依赖第 2 步的 Redirect URL）。
