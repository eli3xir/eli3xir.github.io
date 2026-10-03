# eli3xir.github.io

个人网站：[eli3xir.github.io](https://eli3xir.github.io)。GitHub Pages 静态部署。

## 当前体验

房间物件通向六个内容世界。全站共 55 个 HTML 页面：房间、6 个板块、39 篇文章、9 个交互实验。共享的 Three.js 场景、角色 Mote 和原创配乐在站内切页时连续运行。

- Three.js 0.185.1、本地 GLB、Cycles lightmap、程序化模型、GPU 粒子、接触阴影与光晕。
- Cormorant Garamond / Space Grotesk 本地字体；中文使用设备字体。
- 原创 `After Hours`：112 BPM、四声部、逐采样生成 PCM；默认静音，访客手势开启。
- 文章搜索、标签、目录、锚点与代码复制；本地 KaTeX 公式渲染。
- 五种房间色调、移动导航、画质控制、减少动态效果及 WebGL / 加载失败降级。

既有文章内容保留。一处失效的 openEuler ISO 本地链接改为官方仓库地址。旧文章的外部图床仍可能失效，界面保留图片说明与来源链接。

## 本地预览

```sh
python -m http.server 8765 --bind 127.0.0.1
```

打开 `http://127.0.0.1:8765/`。页面使用模块与绝对路径，请通过 HTTP 服务访问。

## 开发与验证

要求 Node.js 22 或以上。

```sh
npm install
npm --prefix tools install
npm run build:blog
npm test
npm run validate
npx playwright-core install chromium
npm run test:browser
npm run test:performance
```

浏览器检查自带临时 HTTP 服务，输出放在忽略的 `tools/test-results/`。可以通过 `BROWSER_EXECUTABLE` 指定已有 Chromium，通过 `BROWSER_ANGLE=d3d11` 选择 Windows Direct3D 后端。

博客源文件位于 `tools/posts/`。`build:blog` 会生成 39 篇文章和列表页，保持现有路由。`tools/integrate-experience.cjs` 用于给既有内容 HTML 接入体验层，重复运行保持实验脚本类型及入口一致。

## 目录

| 路径 | 职责 |
| --- | --- |
| `js/experience/` | 路由、页面内容、导航、输入与无障碍 |
| `js/world/` | 房间、模型、角色、光照、粒子与 GPU 资源释放 |
| `js/audio/` | 逐采样音色、编曲、生成线程与播放时钟 |
| `assets/` | 房间、光照图、字体、既有文章图片与实验预览 |
| `vendor/` | 本地依赖及许可 |
| `tools/` | 博客构建、验证、浏览器审计及回归检查 |
| `docs/` | Wiki、实现/验收规格与运行 harness |

## 交付与迭代

`main` 分支由 GitHub Pages 发布。推送前执行内容、语法与浏览器验证；上线后检查部署版本和关键交互。当前艺术效果仍处于持续迭代，工程测试通过不等于视觉验收完成。具体记录见 [验证记录](docs/wiki/verification.md)。
