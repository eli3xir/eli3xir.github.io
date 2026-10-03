# 网站运行与测试

运行环境：Node.js 22+，本地预览可用 Python 3。目标为 GitHub Pages 静态托管。

## 命令

仓库根目录运行 `npm install`，再执行 `npm --prefix tools install` 安装博客生成依赖。

| 命令 | 验证范围 |
| --- | --- |
| `npm run build:blog` | 从 Markdown 重建 39 篇文章和列表；不递归删除博客目录 |
| `npm test` | 节拍、路由、拒绝存储、采样、接入脚本重复运行 |
| `npm run validate` | 55 页入口、import map、本地文件、脚本类型/语法及正文保留 |
| `npm run test:browser` | 全量连续/直接访问、交互与降级行为；自动创建本地服务 |
| `npm run test:audio` | 实际 OfflineAudioContext 渲染完整配乐、音量与重叠提示音，检查峰值/削波 |
| `npm run test:performance` | 指定 GPU 下的桌面与手机视口帧间隔；注明模拟限制 |

首次浏览器检查前执行 `npx playwright-core install chromium`。已安装的浏览器可通过环境变量 `BROWSER_EXECUTABLE` 指定。Windows 可以用 `BROWSER_ANGLE=d3d11`；报告实际渲染器。

手动预览：`python -m http.server 8765 --bind 127.0.0.1`，访问 `http://127.0.0.1:8765/`。绝对路径、模块与导航要求 HTTP 服务。

## 输出与诊断

检查输出在忽略目录 `tools/test-results/`；截图研究与临时脚本在 `temp-docs/`。稳定结果写入 [验证记录](../../wiki/verification.md)。`window.studio.diagnostics()` 提供当前画面调用、几何和纹理统计。`AUDIT_QUICK=1` 只测七个入口；完整验收不设置它。`AUDIT_SCREENSHOTS=0` 可只跑行为。

单个行为复查可用 `AUDIT_CASE` 指定场景名称的片段，例如 `reduced-motion experiment`。输出的 `scope` 明确区分完整、入口和单场景检查。

`compact scenes` 检查短屏、手机和平板的实际模型投影、文字间距、滚动与尺寸改变；`late audio activation` 包含真实 AudioContext 外部暂停与手势恢复，核对时钟冻结、按钮状态及持续音轨身份。`HDR room maps` 核对全部 122 张光照图的实际尺寸、UV 通道与亮度倍率。手机尺寸模拟仍需真实设备补充验收。

`test:audio` 同时检查 32 kHz 与 24 kHz、默认和最大音量。报告合成时间、PCM 字节数、整体/乐章 RMS 与峰值；信号通过不能替代音乐听感评审，也不能用桌面合成时间推断真实手机性能。

失效的旧外部图床独立记入 `knownExternalFailures`；新的站内资源失败仍使检查失败。PNG 截图和帧间隔不能自动决定艺术效果是否合格。

## 推送与发布

2026-10-03 的环境中仓库旧代理为 7890，实际环境代理为 7897。使用命令级覆盖 `git -c http.proxy=http://127.0.0.1:7897 push`；不修改全局代理。

首版已合并并推送 `main`，GitHub Pages 的 `55ea138` [发布任务](https://github.com/eli3xir/eli3xir.github.io/actions/runs/37092164788) 成功，55 个线上页面及入口已实际核对。发布以远端提交和 GitHub Pages 实际访问核对，不能只依据本地提交声明上线。

线上浏览器复查设置 `BASE_URL=https://eli3xir.github.io`；有代理需求时设置 `BROWSER_PROXY=http://127.0.0.1:7897`。报告的 `base` 和 `scope` 记录实际目标与范围，本地、入口与全量结果应分别说明。
