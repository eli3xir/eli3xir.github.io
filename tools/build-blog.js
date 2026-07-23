/**
 * 静态博客构建脚本（无框架）：读取 tools/posts/*.md，生成 blog/ 下的静态页面。
 * 用法：node tools/build-blog.js
 */
const fs = require('fs');
const path = require('path');
const MarkdownIt = require('markdown-it');
const hljs = require('highlight.js');

const ROOT = path.resolve(__dirname, '..');
const POSTS_DIR = path.join(__dirname, 'posts');
const OUT_DIR = path.join(ROOT, 'blog');

/* ---------- front matter 解析（YAML 子集：标量 + 列表） ---------- */
function parseFrontMatter(src) {
  const m = src.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!m) return { data: {}, body: src };
  const data = {};
  let curKey = null;
  for (const line of m[1].split(/\r?\n/)) {
    const li = line.match(/^\s+-\s+(.+)$/);
    if (li && curKey) { data[curKey].push(li[1].trim()); continue; }
    const kv = line.match(/^(\w+):\s*(.*)$/);
    if (kv) {
      curKey = kv[1];
      data[curKey] = kv[2] === '' ? [] : kv[2].trim();
    }
  }
  return { data, body: src.slice(m[0].length) };
}

/* ---------- markdown 渲染（代码高亮） ---------- */
const md = new MarkdownIt({
  html: true,
  linkify: true,
  highlight(str, lang) {
    if (lang && hljs.getLanguage(lang)) {
      try {
        return `<pre class="hljs"><code>${hljs.highlight(str, { language: lang, ignoreIllegals: true }).value}</code></pre>`;
      } catch (_) { /* fall through */ }
    }
    return `<pre class="hljs"><code>${md.utils.escapeHtml(str)}</code></pre>`;
  },
});

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/* ---------- 数学公式保护：先抽出 $$..$$ 和 $..$，渲染后再放回，避免下划线被 markdown 吃掉 ---------- */
function protectMath(body) {
  const maths = [];
  const stash = (m) => { maths.push(m); return `@@MATH${maths.length - 1}@@`; };
  body = body.replace(/\$\$([\s\S]+?)\$\$/g, stash);
  body = body.replace(/(?<!\$)\$([^$\n]+?)\$(?!\$)/g, stash);
  return { body, maths };
}
function restoreMath(html, maths) {
  return html.replace(/@@MATH(\d+)@@/g, (_, i) => maths[Number(i)]);
}

/* ---------- 读取文章 ---------- */
const posts = fs.readdirSync(POSTS_DIR).filter((f) => f.endsWith('.md')).map((file) => {
  const { data, body } = parseFrontMatter(fs.readFileSync(path.join(POSTS_DIR, file), 'utf8'));
  const date = new Date(String(data.date || '').replace(' ', 'T'));
  return {
    file,
    title: String(data.title || file.replace(/\.md$/, '')),
    date,
    dateStr: isNaN(date) ? '' : date.toISOString().slice(0, 10),
    year: isNaN(date) ? '' : String(date.getFullYear()),
    tags: (Array.isArray(data.tags) ? data.tags : []).filter((t) => t && t !== 'null'),
    categories: (Array.isArray(data.categories) ? data.categories : []).filter((c) => c && c !== 'null'),
    description: typeof data.description === 'string' ? data.description : '',
    slug: String(data.abbrlink || file.replace(/\.md$/, '')),
    body,
    hasMath: /\$\$|\\\(|\\frac|\\sum|\\int/.test(body),
  };
}).sort((a, b) => b.date - a.date);

// 过滤正文为空的文章（源文件就是空草稿）
const skipped = posts.filter((p) => p.body.trim().length < 10);
if (skipped.length) {
  console.log(`skipped ${skipped.length} empty posts:`);
  skipped.forEach((p) => console.log(`  - ${p.title}`));
}
const livePosts = posts.filter((p) => p.body.trim().length >= 10);
posts.length = 0;
posts.push(...livePosts);

const allTags = [...new Set(posts.flatMap((p) => p.tags))].sort((a, b) => a.localeCompare(b, 'zh'));

/* ---------- 页面模板 ---------- */
function layout({ title, description, content, extraHead = '' }) {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${esc(title)} · eli3xir</title>
  <meta name="description" content="${esc(description || title)}">
  <link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='8' fill='%230a0a0f'/%3E%3Ctext x='16' y='23' font-size='18' font-weight='bold' text-anchor='middle' fill='%237c5cff'%3Ee3%3C/text%3E%3C/svg%3E">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;700&family=Noto+Sans+SC:wght@400;500;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="../css/blog.css">
  ${extraHead}
</head>
<body>
  <header class="blog-nav">
    <a class="nav-logo" href="/">eli3xir<span class="accent">.</span></a>
    <nav>
      <a href="/blog/" style="color:var(--fg);border-bottom:2px solid var(--accent)">文章</a>
      <a href="/radio/">电台</a>
      <a href="/lab/">实验</a>
      <a href="/projects/">项目</a>
      <a href="/about/">关于</a>
    </nav>
  </header>
  ${content}
  <footer class="blog-footer">© ${new Date().getFullYear()} eli3xir · 共 ${posts.length} 篇文章</footer>
  <script src="../js/click-fx.js"></script>
  <script src="../js/page-transition.js"></script>
  <script src="../js/player.js"></script>
</body>
</html>`;
}

/* ---------- 文章页 ---------- */
fs.rmSync(OUT_DIR, { recursive: true, force: true });
fs.mkdirSync(OUT_DIR, { recursive: true });

for (const p of posts) {
  const { body: protectedBody, maths } = protectMath(p.body);
  const html = restoreMath(md.render(protectedBody), maths)
    .replace(/<img /g, '<img loading="lazy" ');
  const katexHead = p.hasMath
    ? `<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.22/dist/katex.min.css">
  <script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.22/dist/katex.min.js"></script>
  <script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.22/dist/contrib/auto-render.min.js"
    onload="renderMathInElement(document.querySelector('.post-content'), { delimiters: [
      { left: '$$', right: '$$', display: true },
      { left: '$', right: '$', display: false },
      { left: '\\\\(', right: '\\\\)', display: false },
      { left: '\\\\[', right: '\\\\]', display: true }
    ] });"></script>`
    : '';
  const content = `
  <main class="post">
    <div class="post-head">
      <h1>${esc(p.title)}</h1>
      <div class="post-meta">
        <time>${p.dateStr}</time>
        ${p.categories.map((c) => `<span class="chip cat">${esc(c)}</span>`).join('')}
        ${p.tags.map((t) => `<span class="chip">${esc(t)}</span>`).join('')}
      </div>
    </div>
    <article class="post-content">${html}</article>
    <a class="back-link" href="./index.html">← 返回文章列表</a>
  </main>
  <script src="../js/post.js"></script>`;
  fs.writeFileSync(path.join(OUT_DIR, `${p.slug}.html`), layout({ title: p.title, description: p.description, content, extraHead: katexHead }));
}

/* ---------- 列表页 ---------- */
const listItems = posts.map((p) => `
      <li class="post-item" data-title="${esc(p.title.toLowerCase())}" data-tags="${esc(p.tags.join(',').toLowerCase())}">
        <a href="./${p.slug}.html">
          <span class="post-date">${p.dateStr}</span>
          <span class="post-title">${esc(p.title)}</span>
          <span class="post-tags">${p.tags.map((t) => `<span class="chip">${esc(t)}</span>`).join('')}</span>
        </a>
      </li>`).join('');

const tagChips = allTags.map((t) => `<button class="chip tag-btn" data-tag="${esc(t.toLowerCase())}">${esc(t)}</button>`).join('');

const indexContent = `
  <main class="blog-index">
    <h1>文章<span class="count">${posts.length}</span></h1>
    <div class="toolbar">
      <input id="search" type="search" placeholder="搜索标题或标签…" autocomplete="off">
    </div>
    <div class="tag-cloud">${tagChips}</div>
    <ul class="post-list">${listItems}
    </ul>
    <p class="empty-hint" hidden>没有匹配的文章</p>
  </main>
  <script src="../js/blog.js"></script>`;

fs.writeFileSync(path.join(OUT_DIR, 'index.html'), layout({ title: '文章', description: 'eli3xir 的技术博客文章列表', content: indexContent }));

console.log(`built ${posts.length} posts + index -> blog/`);

/* ---------- 主页「最新动态」注入 ---------- */
const homePath = path.join(ROOT, 'index.html');
if (fs.existsSync(homePath)) {
  let home = fs.readFileSync(homePath, 'utf8');
  const latestItems = posts.slice(0, 3).map((p) => `        <li>
          <a class="post-item reveal" href="blog/${p.slug}.html" data-hover>
            <span class="post-date">${p.dateStr.slice(0, 7).replace('-', '.')}</span>
            <span class="post-title">${esc(p.title)}</span>
            <span class="post-arrow" aria-hidden="true">→</span>
          </a>
        </li>`).join('\n');
  home = home.replace(/<!--LATEST:BEGIN-->[\s\S]*?<!--LATEST:END-->/,
    `<!--LATEST:BEGIN-->\n${latestItems}\n<!--LATEST:END-->`);
  fs.writeFileSync(homePath, home);
  console.log('homepage latest posts updated');
}
// 输出最新 3 篇，供首页引用
for (const p of posts.slice(0, 3)) console.log(`LATEST|${p.dateStr}|${p.title}|blog/${p.slug}.html`);
