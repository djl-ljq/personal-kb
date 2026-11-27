// build.mjs — 把 md 源文件构建成可浏览的静态站（输出 _site/）
// 用法：npm run build   预览：npm run preview
import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync, existsSync, rmSync, copyFileSync } from 'node:fs';
import { join, dirname, extname, relative, posix } from 'node:path';
import { marked } from 'marked';

const ROOT = process.cwd();
const OUT = join(ROOT, '_site');
const SKIP_DIRS = new Set(['node_modules', '_site', '.git', 'dist', 'raw', 'private', 'build']);

/* ---------- 1. 收集 md 文件 ---------- */
function walk(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    if (name.startsWith('.') && name !== '.well-known') continue;
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) {
      if (SKIP_DIRS.has(name)) continue;
      walk(full, acc);
    } else if (extname(name).toLowerCase() === '.md') {
      acc.push(relative(ROOT, full).split('\\').join('/'));
    }
  }
  return acc;
}

/* ---------- 2. front-matter ---------- */
function splitFrontMatter(raw) {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!m) return { meta: {}, body: raw };
  const meta = {};
  for (const line of m[1].split(/\r?\n/)) {
    const kv = line.match(/^([A-Za-z_][\w-]*)\s*:\s*(.*)$/);
    if (kv) meta[kv[1]] = kv[2].replace(/^["']|["']$/g, '').trim();
  }
  return { meta, body: raw.slice(m[0].length) };
}

/* ---------- 3. 标题与摘要 ---------- */
function firstHeading(body) {
  const m = body.match(/^#\s+(.+)$/m);
  return m ? m[1].replace(/[*`_]/g, '').trim() : null;
}
function firstParagraph(body) {
  for (const block of body.split(/\r?\n\r?\n/)) {
    const t = block.trim();
    if (!t || t.startsWith('#') || t.startsWith('|') || t.startsWith('```') || t.startsWith('>') || t.startsWith('-')) continue;
    return t.replace(/[*`_\[\]]|\(https?:[^)]*\)/g, '').slice(0, 120);
  }
  return '';
}

/* ---------- 4. 锚点 id ---------- */
function slugify(text) {
  return text
    .replace(/<[^>]+>/g, '')
    .replace(/[`*_~]/g, '')
    .trim()
    .toLowerCase()
    .replace(/[\s]+/g, '-')
    .replace(/[，。、：；！？（）【】《》“”‘’｜·]/g, '')
    .replace(/[^\p{L}\p{N}-]/gu, '');
}

/* ---------- 5. 链接改写：.md -> .html（根相对） ---------- */
function rewriteLinks(html, fromRel) {
  return html.replace(/href="([^"#?]+)\.md(#[^"]*)?"/g, (full, target, hash = '') => {
    if (/^[a-z]+:\/\//i.test(target)) return full;
    const fromDir = posix.dirname(fromRel);
    let resolved = posix.normalize(posix.join(fromDir === '.' ? '' : fromDir, target));
    if (resolved.startsWith('..')) resolved = target.replace(/^\.\//, '');
    if (!existsSync(join(ROOT, resolved + '.md'))) {
      const alt = target.replace(/^\.\//, '');
      if (existsSync(join(ROOT, alt + '.md'))) resolved = alt;
    }
    return `href="/${resolved}.html${hash}"`;
  });
}

/* ---------- 6. 导航 ---------- */
const GROUP_LABEL = {
  entry: '入口',
  '': '方法论（00–03）',
  stages: '交付链 · 十步',
  playbooks: '剧本',
  index: '索引',
  templates: '模板',
  digests: '每日简报',
  journal: '项目复盘',
};
const GROUP_ORDER = ['entry', '', 'stages', 'playbooks', 'index', 'templates', 'digests', 'journal'];

function groupOf(rel) {
  const d = posix.dirname(rel);
  return d === '.' ? '' : d.split('/')[0];
}
// 导航分组（README 是首页，不在侧栏重复出现；AGENTS 单独归「入口」）
function navGroupOf(rel) {
  if (rel === 'README.md') return null;
  if (rel === 'AGENTS.md') return 'entry';
  return groupOf(rel);
}

/* ---------- 7. 页面模板 ---------- */
const CSS = `
:root{--bg:#fff;--fg:#1f2328;--muted:#656d76;--line:#d8dee4;--soft:#f6f8fa;--accent:#0969da;--accent-soft:#ddf4ff}
*{box-sizing:border-box}
html{-webkit-text-size-adjust:100%}
body{margin:0;background:var(--bg);color:var(--fg);font:16px/1.75 -apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Hiragino Sans GB","Microsoft YaHei",sans-serif}
a{color:var(--accent);text-decoration:none}
a:hover{text-decoration:underline}
.wrap{display:flex;min-height:100vh;max-width:1280px;margin:0 auto}
aside{width:272px;flex:0 0 272px;border-right:1px solid var(--line);padding:24px 16px;position:sticky;top:0;height:100vh;overflow-y:auto;background:#fcfcfd}
.brand{font-weight:700;font-size:15px;letter-spacing:.2px;margin:0 0 14px 8px;display:block;color:var(--fg)}
.brand span{color:var(--muted);font-weight:400;display:block;font-size:12px;margin-top:2px}
#q{width:100%;padding:7px 10px;border:1px solid var(--line);border-radius:6px;font-size:13px;margin-bottom:14px;background:#fff;color:var(--fg)}
#q:focus{outline:2px solid var(--accent-soft);border-color:var(--accent)}
.grp{margin:16px 0 6px 8px;font-size:11px;font-weight:600;color:var(--muted);letter-spacing:.08em;text-transform:uppercase}
nav a{display:block;padding:5px 10px;border-radius:6px;font-size:14px;color:#424a53;margin:1px 0;line-height:1.4}
nav a:hover{background:var(--soft);text-decoration:none}
nav a.on{background:var(--accent-soft);color:#0a3069;font-weight:600}
main{flex:1;min-width:0;padding:44px 56px 96px}
article{max-width:820px}
h1,h2,h3,h4{line-height:1.35;margin:1.9em 0 .6em;font-weight:650}
h1{font-size:1.9em;margin-top:0}
h2{font-size:1.35em;padding-bottom:.3em;border-bottom:1px solid var(--line)}
h3{font-size:1.12em}
p,li{color:#24292f}
table{border-collapse:collapse;width:100%;margin:1.2em 0;font-size:14px;display:block;overflow-x:auto}
th,td{border:1px solid var(--line);padding:8px 12px;text-align:left;vertical-align:top}
th{background:var(--soft);font-weight:600;white-space:nowrap}
tr:nth-child(2n) td{background:#fcfcfd}
code{background:var(--soft);padding:.15em .4em;border-radius:4px;font-size:.88em;font-family:ui-monospace,SFMono-Regular,"Cascadia Code",Consolas,monospace}
pre{background:var(--soft);padding:14px 16px;border-radius:8px;overflow-x:auto;border:1px solid #eaeef2}
pre code{background:none;padding:0;font-size:13px;line-height:1.6}
blockquote{margin:1.2em 0;padding:.2em 1em;border-left:3px solid var(--line);color:var(--muted)}
blockquote p{margin:.6em 0}
hr{border:0;border-top:1px solid var(--line);margin:2.4em 0}
img{max-width:100%}
.crumb{font-size:12.5px;color:var(--muted);margin-bottom:18px}
.crumb a{color:var(--muted)}
.foot{margin-top:64px;padding-top:18px;border-top:1px solid var(--line);font-size:12.5px;color:var(--muted);display:flex;justify-content:space-between;gap:16px;flex-wrap:wrap}
.cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:12px;margin:24px 0}
.card{border:1px solid var(--line);border-radius:10px;padding:14px 16px;background:#fcfcfd}
.card b{display:block;font-size:14.5px;margin-bottom:4px}
.card small{color:var(--muted);font-size:12.5px;line-height:1.5}
.card:hover{border-color:var(--accent);text-decoration:none}
@media(max-width:900px){
  .wrap{display:block}
  aside{position:static;width:auto;height:auto;border-right:0;border-bottom:1px solid var(--line);padding:16px}
  nav{display:flex;flex-wrap:wrap;gap:4px}
  .grp{margin:8px 0 2px 4px;width:100%}
  nav a{padding:4px 8px;font-size:13px}
  main{padding:24px 20px 72px}
  h1{font-size:1.55em}
}
`;

function navHtml(files, current, titles) {
  const groups = new Map();
  for (const f of files) {
    const g = navGroupOf(f);
    if (g === null) continue;
    if (!groups.has(g)) groups.set(g, []);
    groups.get(g).push(f);
  }
  const order = [...GROUP_ORDER, ...[...groups.keys()].filter((g) => !GROUP_ORDER.includes(g))];
  let out = '';
  for (const g of order) {
    const list = (groups.get(g) || []).sort((a, b) => a.localeCompare(b, 'zh-Hans-CN'));
    if (!list.length) continue;
    out += `<div class="grp">${GROUP_LABEL[g] || g}</div>`;
    for (const f of list) {
      const t = titles[f] || posix.basename(f, '.md');
      const cls = f === current ? ' class="on"' : '';
      out += `<a href="/${f.replace(/\.md$/, '.html')}" data-t="${t.replace(/"/g, '')}"${cls}>${t}</a>`;
    }
  }
  return out;
}

function layout({ title, desc, body, nav, crumb, source }) {
  return `<!DOCTYPE html>
<html lang="zh-CN"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}</title>
<meta name="description" content="${desc}">
<link rel="stylesheet" href="/style.css">
</head><body>
<div class="wrap">
<aside>
  <a class="brand" href="/">个人工作知识库<span>方法 · 模板 · 复盘</span></a>
  <input id="q" type="search" placeholder="筛选标题…" autocomplete="off">
  <nav id="nav">${nav}</nav>
</aside>
<main><article>
${crumb}
${body}
<div class="foot"><span>${source ? `源文件：<code>${source}</code>` : ''}</span><span>人和 AI 都能读的个人知识库</span></div>
</article></main>
</div>
<script>
const q=document.getElementById('q'),links=[...document.querySelectorAll('#nav a')];
q.addEventListener('input',()=>{const v=q.value.trim().toLowerCase();links.forEach(a=>{a.style.display=!v||a.dataset.t.toLowerCase().includes(v)?'':'none'})});
document.addEventListener('keydown',e=>{if(e.key==='/'&&document.activeElement!==q){e.preventDefault();q.focus()}});
</script>
</body></html>`;
}

/* ---------- 8. 构建 ---------- */
rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

const files = walk(ROOT).filter((f) => !f.startsWith('AGENTS.md') || true);
const titles = {};
const bodies = {};

for (const f of files) {
  const raw = readFileSync(join(ROOT, f), 'utf8');
  const { meta, body } = splitFrontMatter(raw);
  bodies[f] = body;
  titles[f] = meta.title || firstHeading(body) || posix.basename(f, '.md').replace(/^[\d_]+/, '');
}

for (const f of files) {
  const body = bodies[f];
  let html = marked.parse(body, { gfm: true, breaks: false, mangle: false, headerIds: false });

  // 标题加 id（供锚点跳转）
  html = html.replace(/<h([1-6])>([\s\S]*?)<\/h\1>/g, (m, lv, inner) => {
    const id = slugify(inner);
    return id ? `<h${lv} id="${id}">${inner}</h${lv}>` : m;
  });
  html = rewriteLinks(html, f);

  const dir = posix.dirname(f);
  const crumb = dir === '.'
    ? `<div class="crumb">首页</div>`
    : `<div class="crumb"><a href="/">首页</a> / ${GROUP_LABEL[dir.split('/')[0]] || dir.split('/')[0]} / ${titles[f]}</div>`;

  const page = layout({
    title: `${titles[f]} · 个人工作知识库`,
    desc: firstParagraph(body).replace(/"/g, ''),
    body: html,
    nav: navHtml(files, f, titles),
    crumb,
    source: f,
  });

  const target = join(OUT, f.replace(/\.md$/, '.html'));
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, page, 'utf8');
}

/* 首页：用 README 渲染 + 分区卡片 */
const rootFiles = files.filter((f) => groupOf(f) === '' && /^\d\d_/.test(f));
const cards = rootFiles
  .map((f) => `<a class="card" href="/${f.replace(/\.md$/, '.html')}"><b>${titles[f]}</b><small>${firstParagraph(bodies[f]).slice(0, 70)}</small></a>`)
  .join('');
const indexBody = marked.parse(splitFrontMatter(bodies['README.md'] || '# 个人工作知识库').body) +
  `<h2>四份核心文件</h2><div class="cards">${cards}</div>`;
writeFileSync(join(OUT, 'index.html'), layout({
  title: '个人工作知识库',
  desc: '一个人的方法、模板与踩坑记录。人和 AI 都能读。',
  body: indexBody,
  nav: navHtml(files, '', titles),
  crumb: '',
  source: 'README.md',
}), 'utf8');

writeFileSync(join(OUT, 'style.css'), CSS, 'utf8');

/* AI 入口原样带出去，方便 raw 访问 */
if (existsSync(join(ROOT, 'AGENTS.md'))) copyFileSync(join(ROOT, 'AGENTS.md'), join(OUT, 'AGENTS.md'));

console.log(`✓ 构建完成：${files.length} 个页面 → _site/`);
