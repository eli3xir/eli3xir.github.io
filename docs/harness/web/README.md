# 网站运行与测试

运行环境：Node.js 22+，本地预览可用 Python 3。目标为 GitHub Pages 静态托管。

## 命令

仓库根目录运行 `npm install`，再执行 `npm --prefix tools install` 安装博客生成依赖。

| 命令 | 验证范围 |
| --- | --- |
| `npm run build:blog` | 从 Markdown 重建 39 篇文章和列表；不递归删除博客目录 |
| `npm run build:lightmaps` | 将 manifest 中的原始 JPEG 字节打包，不改变图片、UV 或 HDR 倍率 |
| `npm test` | 节拍、路由、拒绝存储、采样、接入脚本重复运行 |
| `npm run validate` | 55 页入口、import map、本地文件、脚本类型/语法及正文保留 |
| `npm run test:browser` | 全量连续/直接访问、交互与降级行为；自动创建本地服务 |
| `npm run test:audio` | 实际 OfflineAudioContext 渲染完整配乐、音量与重叠提示音，检查峰值/削波 |
| `npm run test:loading` | 真实 HTTP 慢速分块传输、下载中往返导航、停滞连接取消 |
| `npm run test:lightmaps` | 资源包完整、缺失、索引损坏、单张图片损坏的实际浏览器恢复 |
| `npm run test:performance` | 指定 GPU 下的桌面与手机视口帧间隔；注明模拟限制 |

首次浏览器检查前执行 `npx playwright-core install chromium`。已安装的浏览器可通过环境变量 `BROWSER_EXECUTABLE` 指定。Windows 可以用 `BROWSER_ANGLE=d3d11`；报告实际渲染器。

手动预览：`python -m http.server 8765 --bind 127.0.0.1`，访问 `http://127.0.0.1:8765/`。绝对路径、模块与导航要求 HTTP 服务。

## 输出与诊断

检查输出在忽略目录 `tools/test-results/`；截图研究与临时脚本在 `temp-docs/`。稳定结果写入 [验证记录](../../wiki/verification.md)。`window.studio.diagnostics()` 提供当前画面调用、几何和纹理统计。`AUDIT_QUICK=1` 只测七个入口；完整验收不设置它。`AUDIT_SCREENSHOTS=0` 可只跑行为。

单个行为复查可用 `AUDIT_CASE` 指定场景名称的片段，例如 `reduced-motion experiment`。输出的 `scope` 明确区分完整、入口和单场景检查。

`compact scenes` 检查短屏、手机和平板的实际模型投影、文字间距、滚动与尺寸改变；`late audio activation` 包含真实 AudioContext 外部暂停与手势恢复，核对时钟冻结、按钮状态及持续音轨身份。`HDR room maps` 核对全部 122 张光照图的实际尺寸、UV 通道与亮度倍率。手机尺寸模拟仍需真实设备补充验收。

`npm run test:reading` 检查两种视口的真实文章翻阅：按钮/键盘与模型命中、空白区域、连点连续性、暂停时钟、减少动态效果、45 次翻阅的纹理数量、原文进入与跨板块返回。输出 `tools/test-results/reading-audit.json` 及初始/翻页中截图；可设置 `BASE_URL` 检查部署版本。

`npm run test:signal` 检查项目工作台的发送端选择、键盘与实体命中、发送/到达内容、暂停声音、40 次发送的纹理稳定、减少动态效果、跨板块返回和无 WebGL 降级，验证实现笔记锚点与原项目保留。报告 `signal-audit.json` 包含实际 base；`signal-flow-*` 与 `signal-done-*` 截图记录传输和到达画面。支持 `BASE_URL` 与代理参数。

`npm run test:radio` 检查唱片命中、键盘播放、暂停与抬针、四声部静音及实际 master PCM、音轨/分析节点身份、跨页订阅释放、浏览器暂停恢复、减少动态效果、刷新偏好及无 WebGL 操作。`radio-audit.json` 记录真实 base 和采样峰值；手机视口同时模拟缺少 `cancelAndHoldAtTime` 的环境，开关只依赖通用的渐变增益 API。

电台专项还核对音波发射坐标系的四个参考点，覆盖桌面、手机以及切换到平板/短屏后滚动；检查静音、音量为零、暂停和减少动态效果下的发射状态，并确认跨页保持同一份粒子几何。画面复核仍需查看实际喇叭口音波，矩阵检查不能代替艺术判断。

`npm run test:potion` 检查实际暂停音频后的瓶塞返回、键盘/玻璃命中、空白区域、连点姿态与单次续接、半拍提示音、系统中断、减少动态效果、离开时取消队列，以及无 WebGL 的九实验入口。`potion-audit.json` 和 `potion-lift-*` / `potion-idle-*` 截图记录两种视口；新增按钮后的短屏/平板构图可用 `AUDIT_CASE='compact scenes'` 单独复核。支持 `BASE_URL` 检查发布版本。

药瓶专项还从 GPU 的实际透射纹理采样空背景，避免仅检查材质参数而漏掉阴影之后的白底问题。首次显现上传气泡几何后，连续 30 次反应应保持纹理/几何数量及对象身份；离开时液体与气泡的几何/材质各释放一次。暂停和减少动态时同步检查气泡状态与液面扰动，画面仍需人工复核。

`npm run test:skin` 检查实时房间配色：键盘与实体色样命中、空白区域、两组按钮同步、颜色途中改向、暂停/半拍/系统中断、减少动态、刷新和返回首页。实际核对副本共享几何/光照而材质独立，离开时仅释放独占材质，四次往返的 GPU 数量稳定。另阻塞首次模型响应后进入首页，确认同一请求的就绪状态正确回传；模拟一次 503 后重试，并覆盖存储失败、无 WebGL、320 短屏、768 平板与 844 横屏。`skin-audit.json` 记录实际 base；支持线上复查。截图只代表电脑上的视口模拟。

`npm run test:about` 检查键盘/棋盘命中、空白区域、途中改选、真实音频暂停与中断、半拍起步、减少动态、原文与联系入口。通过实际编译的水面 shader 检查波纹位置和强度；以手与棋子的世界坐标核对接触。连续 24 次动作应保持 GPU 几何/纹理，离开时水面几何/材质、瓷砖纹理、棋盘实例各释放一次，共享角色旋转与光环恢复。320、390、768、844 宽度各按三种活动的 41 个进度采样动作范围与锚点位置；包含无 WebGL。输出 `about-audit.json` 及活动/布局截图，支持 `BASE_URL`。等待正文平滑滚动实际到达后再验收，不将四元数的正负零当成姿态跳变。

关于专项还实际点击跑道与水面，覆盖全部三个物件入口；三种活动之间九种有序改选检查位置连续和手臂缩放，防止离开棋盘时继续跟踪棋子。程序状态检查之外，保存连续操作录像复核动作衔接和手机滚动。

`npm run test:character` 在真实角色闭眼期间暂停配乐及挂起 AudioContext，检查音频时间冻结时眼睛连续睁开，之后仍会自然眨眼；暂停下完成一圈活动，减少动态时眼睛稳定。关于进入实验室后保持共享角色、同一组音源与节拍，并再次核对暂停时睁眼。两种视口输出 `character-audit.json`、帧采样和暂停截图，支持 `BASE_URL` 线上复查；帧采样是表情状态证据，不是主观声音试听。

`npm run test:ocean` 检查首屏风力的键盘/船身命中、空白区域、改向连续、暂停/半拍/系统中断；通过浮点渲染目标比较 GPU 波高/斜率和 CPU 取样。驾驶区核对风力交接、W/S、键盘按钮、长按及取消、多点触控模拟、离屏停止帧增长；资源检查包含自定义帆影材质。另覆盖四种紧凑尺寸的波动范围、减少动态的显式开始和无 WebGL。输出 `ocean-audit.json` 与截图，支持线上 `BASE_URL`。所有手机尺寸和触控输入均为电脑模拟。

`room focus carries` 检查同一角色与相机的连续物件探索，包括途中改选、启用配乐、系统暂停音频和减少动态效果。`portal follows` 同时核对角色发光点、粒子、纸幕圆心与揭示结束的姿态连续性。

`room stays hidden` 暂缓光照图响应，核对模型不提前显现；随后释放请求并检查房间就绪，再模拟单张光照图失败，确认仍可进入房间。

正常加载时光照 JPEG 由一个 `lightmaps.bin` 请求提供；`model.lightmapSource` 记录包内成功数量与独立原图回退数量。包构建与校验入口为 `tools/pack-room-lightmaps.mjs`，修改光照图后先重建再运行 `validate`。包内图片经 Blob URL 解码，不能再从 `image.src` 推导原文件名；使用 `texture.userData.lightmapFile` 与 manifest 对应。

`test:audio` 同时检查 32 kHz 与 24 kHz、默认和最大音量。报告合成时间、PCM 字节数、整体/乐章 RMS 与峰值；信号通过不能替代音乐听感评审，也不能用桌面合成时间推断真实手机性能。

失效的旧外部图床独立记入 `knownExternalFailures`；新的站内资源失败仍使检查失败。PNG 截图和帧间隔不能自动决定艺术效果是否合格。

## 推送与发布

2026-10-03 的环境中仓库旧代理为 7890，实际环境代理为 7897。使用命令级覆盖 `git -c http.proxy=http://127.0.0.1:7897 push`；不修改全局代理。

首版已合并并推送 `main`，GitHub Pages 的 `55ea138` [发布任务](https://github.com/eli3xir/eli3xir.github.io/actions/runs/37092164788) 成功，55 个线上页面及入口已实际核对。发布以远端提交和 GitHub Pages 实际访问核对，不能只依据本地提交声明上线。

线上浏览器复查设置 `BASE_URL=https://eli3xir.github.io`；有代理需求时设置 `BROWSER_PROXY=http://127.0.0.1:7897`。报告的 `base` 和 `scope` 记录实际目标与范围，本地、入口与全量结果应分别说明。

`npm run test:partext` 检查粒子文字输入、中文输入法组合、空白、字素簇限制、快速重排与实体打散、暂停/半拍/系统中断、双向交接、鼠标拨动/移出和触控取消。核对 30/120 Hz 固定目标的等时长状态、同一几何/数组、反复操作的资源数与离开释放；另覆盖四种紧凑尺寸的打散范围、减少动态显式开始和无 WebGL。输出 `partext-audit.json` 与静止/打散/实验截图，支持 `BASE_URL` 线上复核。手机与触控是电脑模拟，数值步进检查不代替视觉与真机验收。