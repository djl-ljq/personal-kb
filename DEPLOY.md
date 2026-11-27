# 上线说明（Cloudflare Pages + GitHub）

目标：仓库放 GitHub（给 AI 读），Cloudflare Pages 连同一个仓库构建成可浏览的站（给人读）。
一套内容，两副面孔。全程免费，不用买服务器、不用备案。

本机已经能构建，产物在 `_site/`。预览：`npm run build` 后打开 `_site/index.html`，或 `npm run preview`。

---

## 一、推到 GitHub（3 条命令）

先在 GitHub 网页建一个空仓库，名字随意，建议 `personal-kb`，**选 Public**（公开才能让任何 AI 直接读）。

```bash
cd D:/personal-kb
git remote add origin https://github.com/<你的用户名>/personal-kb.git
git push -u origin main
```

> 分支名如果报错，先 `git branch -M main`。

## 二、接 Cloudflare Pages（网页点几下，不用命令行）

1. 打开 Cloudflare Dashboard → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**
2. 授权 GitHub，选中刚建的 `personal-kb` 仓库
3. 构建设置（照抄）：

| 项 | 值 |
|---|---|
| Framework preset | `None` |
| Build command | `npm install && npm run build` |
| Build output directory | `_site` |
| 环境变量 | 不需要 |

4. **Save and Deploy**，等 1–2 分钟，拿到 `https://personal-kb.pages.dev` 这类地址

之后每次 `git push`，Pages 会自动重新构建，不用手动点。

## 三、命令行方式（可选，不想点网页就用这个）

```bash
npx wrangler pages deploy _site --project-name personal-kb
```

首次会要求登录 Cloudflare 账号（浏览器授权）。

## 四、给 AI 用的地址

站建好后，AI 读这两个地址中的任意一个：

- 原文（推荐，最省 token）：`https://raw.githubusercontent.com/<用户名>/personal-kb/main/AGENTS.md`
- 若只想要某一节：`https://raw.githubusercontent.com/<用户名>/personal-kb/main/02_标准方案与报告模板库.md`（中文文件名建议 URL 编码，或用 `index/TOPICS.md` 里的位置说明）

新会话第一句可以直接写：

```
先读 https://raw.githubusercontent.com/<用户名>/personal-kb/main/AGENTS.md，
按里面的约定跟我协作，需要细节时再按 index/TOPICS.md 去取。
```

## 五、不要提交的东西

`.gitignore` 已排除：`.env`、`*.key`、`node_modules/`、`_site/`、`dist/`、`raw/`、`private/`。

**仍然要自己把关的**：客户名称、合同金额、内网地址（10.50.x.x）、测试账号、项目代号。
这个站是公开的，搜索引擎会抓。写之前先想一遍「这段被甲方看到有没有问题」。

## 六、内容怎么加

- 长期有效的方法 → 改 `00`–`03` 四份文件
- 新主题 → 在根目录或对应子目录建 `主题.md`，并在 `index/TOPICS.md` 加一行
- 每日简报 → 丢进 `digests/`
- 项目复盘 → 丢进 `journal/`（**脱敏后**再进公开库）
- 加完 → `git add -A && git commit -m "..." && git push`

构建脚本会自动把它收进侧栏，不用手工改导航。

## 七、已知边界

- 站内搜索只做侧栏标题筛选，不做全文检索。要全文搜，用编辑器或 GitHub 的搜索框。
- Cloudflare Pages 免费额度：500 次构建/月、单站点 2 万个文件、单文件 25 MiB、带宽不限。当前 11 个页面，远远用不完。
- 国内访问 `*.pages.dev` 的体验因地区与运营商而异，不如国内 CDN 稳定；这是免费方案要接受的代价。
