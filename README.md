# eli3xir.github.io

我的个人作品集主页，由 [GitHub Pages](https://pages.github.com/) 托管。

在线地址：<https://eli3xir.github.io>

## 技术栈

纯静态站，无构建步骤，所有依赖已本地化到 `vendor/`：

- **Three.js** `0.185.1` — WebGL 背景（全屏 fbm 噪声 shader，鼠标/滚动驱动）
- **GSAP** `3.15.0` + ScrollTrigger — 滚动叙事、文字切分入场、卡片倾斜
- **Lenis** `1.3.25` — 惯性平滑滚动
- 内嵌霓虹贪吃蛇（原生 canvas，`js/snake.js`）

## 本地预览

```bash
python -m http.server 8000
# 访问 http://localhost:8000
```

## 文件结构

```
├── index.html          # 单页结构：Hero / 关于 / 技能 / 项目 / 游戏 / 联系
├── css/style.css       # 暗色主题样式
├── js/main.js          # shader 背景 + 交互逻辑（ES Module）
├── js/snake.js         # 贪吃蛇小游戏
└── vendor/             # three / gsap / lenis 本地化依赖
```

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
