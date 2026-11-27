# 上线说明（Cloudflare Pages + GitHub）

目标：仓库放 GitHub（给 AI 读），Cloudflare Pages 连同一个仓库构建成可浏览的站（给人读）。
一套内容，两副面孔。全程免费，不用买服务器、不用备案。

构建脚本在 `tools/` 下，产物输出到仓库根的 `_site/`。

本地构建：

```bash
cd D:/personal-kb/tools
npm install      # 首次
npm run build    # 产物 → D:/personal-kb/_site/
npm run preview  # http://127.0.0.1:4173
```

---

## 一、推到 GitHub（已完成 ✅）

仓库：https://github.com/djl-ljq/personal-kb （Public，main 分支已推送）

后续更新只要：

```bash
cd D:/personal-kb
git add -A && git commit -m "更新内容" && git push
```

## 二、接 Cloudflare Pages（网页点几下，不用命令行）

1. 打开 Cloudflare Dashboard → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**
2. 授权 GitHub，选中 `personal-kb` 仓库
3. 构建设置（照抄，注意构建命令要先 `cd tools`）：

| 项 | 值 |
|---|---|
| Framework preset | `None` |
| Build command | `cd tools && npm install && npm run build` |
| Build output directory | `_site` |
| Root directory | 留空 |
| 环境变量 | 不需要 |

4. **Save and Deploy**，等 1–2 分钟，拿到 `https://personal-kb.pages.dev` 这类地址

之后每次 `git push`，Pages 会自动重新构建，不用手动点。

## 三、命令行方式（可选，不想点网页就用这个）

```bash
cd D:/personal-kb
npx wrangler pages deploy _site --project-name personal-kb
```

首次会要求登录 Cloudflare 账号（浏览器授权）。

## 四、给 AI 用的地址

**最省 token 的做法**：让 AI 先读 `llms.txt`，里面已列好全部文件的可直接 GET 链接。

- 入口约定：`https://raw.githubusercontent.com/djl-ljq/personal-kb/main/AGENTS.md`
- 全量清单：`https://raw.githubusercontent.com/djl-ljq/personal-kb/main/llms.txt`
- 主题索引：`https://raw.githubusercontent.com/djl-ljq/personal-kb/main/docs/TOPICS.md`

⚠️ 中文文件名**必须 URL 编码**，不编码会 404。别自己拼，从 `llms.txt` 里复制。

新会话第一句可以直接写：

```
先读 https://raw.githubusercontent.com/djl-ljq/personal-kb/main/AGENTS.md，
按里面的约定跟我协作；需要某个文件时从 llms.txt 里取链接。
```

## 五、不要提交的东西

`.gitignore` 已排除：`.env`、`*.key`、`node_modules/`、`_site/`、`dist/`、`raw/`、`private/`、`_staging/`、`.workbuddy/`。

**仍然要自己把关的**：客户名称、合同金额、内网地址（10.50.x.x）、测试账号、项目代号。
这个站是公开的，搜索引擎会抓。写之前先想一遍「这段被甲方看到有没有问题」。

## 六、内容怎么加

| 加什么 | 放哪 |
|---|---|
| 长期有效的方法 | `docs/00`–`03` 四份文件 |
| 新主题 | `docs/` 下建 `主题.md`，并在 `docs/TOPICS.md` 加一行 |
| 新阶段卡 | `docs/stages/` |
| 新剧本 | `docs/playbooks/` |
| 新模板 | `docs/templates/` |
| 每日简报 | `digests/YYYY-MM-DD.md` + `digests/INDEX.md` 追加一行 |
| 项目复盘 | `docs/journal/`（**脱敏后**再进公开库） |

**根目录不要放新文件**，只保留 `README.md` / `AGENTS.md` / `llms.txt`。
加完 → `git add -A && git commit -m "..." && git push`

构建脚本会自动把它收进侧栏，不用手工改导航；`tools/`、`_staging/`、`.workbuddy/` 不会被发布。

## 七、已知边界

- 站内搜索只做侧栏标题筛选，不做全文检索。要全文搜，用编辑器或 GitHub 的搜索框。
- Cloudflare Pages 免费额度：500 次构建/月、单站点 2 万个文件、单文件 25 MiB、带宽不限。当前 27 个页面，远远用不完。
- 国内访问 `*.pages.dev` 的体验因地区与运营商而异，不如国内 CDN 稳定；这是免费方案要接受的代价。
