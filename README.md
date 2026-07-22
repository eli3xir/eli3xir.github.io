# eli3xir.github.io

我的个人作品集主页，由 [GitHub Pages](https://pages.github.com/) 托管。

在线地址：<https://eli3xir.github.io>

## 技术栈

纯静态站，无构建步骤，所有依赖已本地化到 `vendor/`：

- **Three.js** `0.185.1` — WebGL 背景（全屏 fbm 噪声 shader，鼠标/滚动驱动）
- **主题引擎** — 春夏秋冬四季主题（整套配色+底色切换）+ 中国传统节日自动限定（春节/元宵/端午/中秋）+ 季节粒子（花瓣/萤火/落叶/雪/烟花/灯笼/桂花）
- **GSAP** `3.15.0` + ScrollTrigger — 滚动叙事、文字切分入场、卡片倾斜
- **Lenis** `1.3.25` — 惯性平滑滚动
- **APlayer + Meting**（CDN）— 左下角迷你音乐播放器（网易云歌单）
- 点击粒子特效、自定义光标、文章页浮动目录（TOC）

## 本地预览

```bash
python -m http.server 8000
# 访问 http://localhost:8000
```

## 文件结构

```
├── index.html          # 单页结构：Hero / 关于 / 技能 / 项目 / 文章 / 联系
├── css/style.css       # 主页暗色主题样式
├── css/blog.css        # 博客页样式
├── js/main.js          # shader 背景 + 交互逻辑（ES Module）
├── js/blog.js          # 博客列表搜索/标签过滤
├── blog/               # 生成的博客静态页（文章列表 + 39 篇文章）
├── tools/
│   ├── posts/          # Markdown 源文件（迁移自原 Hexo 博客）
│   └── build-blog.js   # 静态博客构建脚本（markdown-it + highlight.js）
└── vendor/             # three / gsap / lenis 本地化依赖
```

## 博客构建

不用任何博客框架，只有一个 ~150 行的 Node 脚本：

```bash
cd tools && npm install   # 仅首次
node build-blog.js        # 读取 tools/posts/*.md → 生成 blog/*.html
```

文章含数学公式时自动注入 KaTeX（CDN）；代码块用 highlight.js 构建期高亮。

## 部署

仓库名为 `<用户名>.github.io`，推送到 `main` 分支后 GitHub Pages 自动发布：

```bash
git add -A
git commit -m "更新内容"
git push
```

## 性能与无障碍

- 渲染分辨率上限 `devicePixelRatio ≤ 2`，后台标签页自动暂停渲染
- `prefers-reduced-motion` 下关闭动画、平滑滚动与渲染循环
- 自定义光标仅在 `pointer: fine` 设备启用
