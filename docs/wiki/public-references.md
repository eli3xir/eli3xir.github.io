# 公开参考与核验

2026-10-05 房间反射调整阅读 Three.js 官方 [PMREMGenerator](https://threejs.org/docs/pages/PMREMGenerator.html)、[MeshStandardMaterial](https://threejs.org/docs/pages/MeshStandardMaterial.html) 与 [MeshPhysicalMaterial](https://threejs.org/docs/pages/MeshPhysicalMaterial.html)，并对照本地固定 0.185.1 的生成器、物理材质着色块和 [r185 WebGLRenderer](https://github.com/mrdoob/three.js/blob/r185/src/renderers/WebGLRenderer.js)。采用按粗糙度过滤的静态房间环境；透射容器使用完整 opacity，液体作为后方实体绘制。文档与本地版本分开核对，未把最新版本算法直接归于本地依赖。实际比较固定取景的通用反射与房间反射、原透明表面与调整后的瓶口/液面；早期全画面角色眨眼不同，不能称为逐像素严格 A/B。全部新反射由既有房间生成，没有下载参考模型、视频或图像资产。

研究日期：2026-10-03。公开搜索可以广泛覆盖主题，无法证明已穷尽全网；以下记录可追溯的来源、采用范围和不确定性。

## 模型与社区案例

| 来源 | 核验范围 | 对本项目的启发 |
| --- | --- | --- |
| [Anthropic Opus 5.5 发布页](https://www.anthropic.com/claude-opus-5-5) | 官方页面日期为 2026-09-22，型号已核实 | 社区所谓视频需进一步区分代码动画与生成视频 |
| [OpenChamber 案例索引](https://data.openchamber.dev/opus-5-5-videos/) | 公开索引可读取；计数随日期变化 | 检索 Three.js、Blender、Web Audio 与程序化作品 |
| [社区案例与提示词索引](https://github.com/X-RayLuan/awesome-opus-5-5-video-prompts) | 公开仓库可读；原帖和视频链接另行核实 | 寻找叙事、声音与连续母题的案例，不复制大段提示词 |
| [玻璃金箔马赛克原帖](https://x.com/LCSlates/status/2102503027340988559) | X 返回 403，社区索引描述可读，原作者陈述未直接核实 | 同一组元素在场景之间变形的思路；仅作为待核实的灵感 |
| [道路变成乐谱原帖](https://x.com/chetanankola/status/2103001194696458512) | X 返回 403；索引描述可读 | 空间运动和声音之间的因果联系；不将索引等同原帖证据 |
| [山谷舟行原帖](https://x.com/MengTo/status/2102760783344189761) | X 返回 403；索引内部存在 Opus 5/5.5 归属不一致 | 参考昼夜布光的设计原则，模型归属保持待核实 |
| [pdoom-video 源码仓库](https://github.com/mexicat/pdoom-video) | 作者公开仓库与 README 可读 | 编排、场景时间线与确定性渲染；其既有音乐不能证明逐采样配乐合成 |

社区热度、制作耗时和“一次提示完成”等说法不作为技术事实或验收证据。第三方视频、音乐和模型的转载权与索引代码的许可不同。

## 视觉、交互和技术

| 来源 | 用途 |
| --- | --- |
| [Lusion 官方网站](https://lusion.co/) | 空间尺度、艺术指导和目的明确的互动参考 |
| [Bruno Simon 官方网站](https://bruno-simon.com/) | 物件导航、个人气质与幽默感参考 |
| [Codrops 持续场景转场](https://tympanus.net/codrops/2026/06/30/building-persistent-page-transitions-with-webgpu-and-vanilla-javascript/) | 学习渲染场景持续存在、DOM 内容换页的架构原则；本项目使用 WebGL |
| [Codrops 粒子实验](https://tympanus.net/codrops/2025/09/11/when-cells-collide-the-making-of-an-organic-particle-experiment-with-rapier-three-js/) | 学习粒子的材质和交互具有统一艺术方向 |
| [社区 Three.js 视觉 skill](https://github.com/bitzzdev/skills/blob/main/threejs-awwwards-site/SKILL.md) | 仅审阅为参考；不自动安装或采用其全部技术约束 |
| [GSAP Timeline 官方文档](https://gsap.com/docs/v3/GSAP/Timeline/) | 多阶段运动的同步与可控时间线 |
| [Three.js GLTFLoader](https://threejs.org/docs/pages/GLTFLoader.html) | 模型读取、失败处理、资源生命周期 |
| [Three.js UnrealBloomPass](https://threejs.org/docs/pages/UnrealBloomPass.html) | 亮部光晕、阈值和色调映射；避免全画面过曝 |
| [Three.js Vector3](https://threejs.org/docs/pages/Vector3.html) / [Camera](https://threejs.org/docs/pages/Camera.html) | 将角色实际发光点投影为页面纸幕圆心；相机矩阵先更新 |
| [MDN AudioBuffer.getChannelData](https://developer.mozilla.org/en-US/docs/Web/API/AudioBuffer/getChannelData) | 写入逐采样 PCM 数据 |
| [MDN BaseAudioContext.currentTime](https://developer.mozilla.org/en-US/docs/Web/API/BaseAudioContext/currentTime) | 声音播放和视觉同步时钟 |
| [MDN AudioWorkletProcessor.process](https://developer.mozilla.org/en-US/docs/Web/API/AudioWorkletProcessor/process) | 对比实时逐采样合成与离线缓冲生成的工作方式 |
| [MDN OfflineAudioContext](https://developer.mozilla.org/en-US/docs/Web/API/OfflineAudioContext) / [Web Audio 规范](https://webaudio.github.io/web-audio-api/) | 在浏览器实际渲染完整配乐与重叠提示音，检查有限值、峰值及削波 |
| [Blender 4.5 Render Baking](https://docs.blender.org/manual/en/4.5/render/cycles/baking.html) / [Denoise](https://docs.blender.org/manual/en/4.5/compositing/types/filter/denoise.html) | 既有 UV 的漫反射光照烘焙，法线引导 HDR 去噪与显示颜色分离；网页正文已下载核对 |
| [W3C 对比度最低要求](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html) | 普通文字 4.5:1、大字 3:1；用于后续动态背景上的实际文字检查，当前不是全站符合性声明 |
| [Three.js PMREMGenerator](https://threejs.org/docs/pages/PMREMGenerator.html) | 核对从场景和指定位置生成反射环境的 API，并对照本地 0.185.1 实现；实际房间反射仍待候选画面对照 |
| [Three.js CatmullRomCurve3](https://threejs.org/docs/pages/CatmullRomCurve3.html) / [TubeGeometry](https://threejs.org/docs/pages/TubeGeometry.html) / [CanvasTexture](https://threejs.org/docs/pages/CanvasTexture.html) | 项目工作台使用同一路径描述实体线路与传输位置，复用画布纹理显示实际消息 |
| [MDN AnalyserNode](https://developer.mozilla.org/en-US/docs/Web/API/AnalyserNode) / [getFloatTimeDomainData](https://developer.mozilla.org/en-US/docs/Web/API/AnalyserNode/getFloatTimeDomainData) / [setTargetAtTime](https://developer.mozilla.org/en-US/docs/Web/API/AudioParam/setTargetAtTime) | 唱机电平表读取实际声部波形，旁路分析输出可不连接；声部开关使用渐变增益。避免依赖兼容性有限的 cancelAndHoldAtTime |

本项目新几何、动画和配乐原创实现。采用外部代码或资产时必须记录来源、版本、许可及实际使用范围。

2026-10-04 对照 Three.js r185 官方 [MeshPhysicalMaterial 源码](https://github.com/mrdoob/three.js/blob/r185/src/materials/MeshPhysicalMaterial.js) 和 [Texture 源码](https://github.com/mrdoob/three.js/blob/r185/src/textures/Texture.js)，核对各向异性方向/强度通道、非颜色数据、mipmap 与纹理过滤。首次文档目录链接返回 404，改为固定版本官方源文件核验。唱片数据纹理由本站代码生成，未采用第三方材质图；物理材质增加每像素开销，不能仅凭减少三角形宣称所有设备更快。

## 实际查看与采用

2026-10-04 对照 [Three.js BufferAttribute](https://threejs.org/docs/pages/BufferAttribute.html) 的动态缓冲使用与更新规则、[Canvas measureText](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/measureText) 的文本测量和 [Intl.Segmenter](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/Segmenter) 的字素簇分割。粒子文字按本地字体采样、复用同一位置/目标数组，12 字限制不会截断组合表情；不引入字形图片。

同轮阅读 Ryan Juckett 的 [Damped Springs（2012）](https://www.ryanjuckett.com/damped-springs/) 临界阻尼推导，核对固定目标下的位置与速度解析步进。本站使用该数学形式实现重排，加入原创的有界打散、指针斥力和三维排字台，未复制文章的 C++ 实现。30/120 Hz 等时长对照仅覆盖无外力、无边界碰撞的归位，不能据此宣称所有输入或设备帧率完全一致。

2026-10-04 阅读 Mark Finch 的 [GPU Gems 水面章节](https://developer.nvidia.com/gpugems/gpugems/part-i-natural-effects/chapter-1-effective-water-simulation-physical-models)，采用几何波动与细小表面扰动分层、由同一高度函数求取姿态的思路。本站实现为四组方向正弦波和四点浮动近似，没有使用 Gerstner 水平位移或完整流体解算。另核对 [Three.js r185 Water 源码](https://github.com/mrdoob/three.js/blob/r185/examples/jsm/objects/Water.js) 的反射/水面组织方式；当前使用原创程序天空的 PMREM 环境与物理材质，没有复制该示例的平面反射代码、法线图片或外部船模。

同轮查看 r185 官方 [Material 源码](https://github.com/mrdoob/three.js/blob/r185/src/materials/Material.js)：默认自定义程序缓存键来自 `onBeforeCompile` 的函数字符串，闭包里的不同帆尺寸不会自动形成不同键。主帆/前帆及其深度材质显式提供尺寸和方向键，并用实际画面检查两片帆。

2026-10-04 阅读 Kyle Wetton 的 [交互角色教程（2019）](https://tympanus.net/codrops/2019/10/14/how-to-create-an-interactive-3d-character-with-three-js/)，参考角色关注点、点击动作与过渡的组织方式；没有采用演示人物、Mixamo 动画或随机表演机制。关于页动作按本站原文的兴趣原创编排，保留同一 Mote 和连续空间。另对照 [InstancedMesh 官方说明](https://threejs.org/docs/pages/InstancedMesh.html) 与本地实现，棋盘用一份实例网格表示方格，并观察其实际释放事件。

2026-10-04 对照 Three.js 官方 [Object3D](https://threejs.org/docs/pages/Object3D.html) 与 [Material](https://threejs.org/docs/pages/Material.html) 的克隆和资源说明，并检查本地 r185 实现。皮肤预览克隆物件与独立材质，继续共享首页几何和光照；以实际资源身份和 dispose 事件验证所有权。没有引入新版文档中本地版本不支持的统一释放接口，也没有新增外部模型或贴图。

2026-10-04 对照 [MeshPhysicalMaterial 文档](https://threejs.org/docs/pages/MeshPhysicalMaterial.html) 核对透射与不透明度、厚度的关系；随后追踪固定 r185 的 [WebGLRenderer 透射过程](https://github.com/mrdoob/three.js/blob/r185/src/renderers/WebGLRenderer.js)、[WebGLBackground](https://github.com/mrdoob/three.js/blob/r185/src/renderers/webgl/WebGLBackground.js) 与 [WebGLShadowMap](https://github.com/mrdoob/three.js/blob/r185/src/renderers/webgl/WebGLShadowMap.js)。本站实际对照显示：阴影开启、场景无显式背景时瓶颈发白；显式背景可保留阴影并恢复透射。该观察针对本站当前渲染链，不泛化为所有 Three.js 场景。新瓶身、液面和气泡均由本站代码生成。

玻璃金箔马赛克视频的公开下载副本时长 80.04 秒。使用 Blender 4.5.12 LTS 解码观察第 8、30、62 秒：同一组块体组成海面与太阳，局部破裂，随后整体卷曲。这提供了持续元素、材质和变形承载叙事的参考；下载副本与内容观察不能直接证明原帖的模型归属或生成方式。视频与参考帧仅存于临时研究目录，没有作为本站资产发布。

Three.js 0.185.1：来自官方 npm 包，模块文件与既有 core/module 逐字节一致；采用需要的 addon 闭包，MIT 许可随代码本地保留。KaTeX 0.16.22 来自官方 npm 包，MIT 许可及字体本地保留。Cormorant Garamond 和 Space Grotesk 从 Google Fonts 官方仓库取得，SIL OFL 文本随字体保留。既有 PixiJS 依赖继续保留；粒子文字现改用与首屏共用的 Three.js 装置，五句预设、指针拨动与重组玩法保留，并加入自由输入。

本站没有发布第三方参考视频、音频、下载的新外部模型或 AI 图片。新的模型与声音来自本仓库原创代码，房间使用既有 model-studio 资产。

2026-10-03 通过只读 Git 克隆核对 [C++ 聊天室仓库](https://gitee.com/buptsg2019/cpp-chat-room)：默认分支 HEAD 为 `e8e0cd44ed8f74ffba5109ee7a8a7332b04ffc41`，当前公开树仅有 README 与许可；README 支持 C++、Linux、多线程、MySQL 的原项目说明，并链接作者实现笔记。本站对应笔记为 [50706.html](../../blog/50706.html)，保留原内容。新增通信工作台是浏览器本地流程演示，不宣称已运行该仓库后端或核验了缺失的服务器实现。

2026-10-04 阅读 NASA [Apollo Experience Report — Lunar Module Landing Gear Subsystem](https://ntrs.nasa.gov/api/citations/19720018253/downloads/19720018253.pdf)，并实际渲染查看 PDF 第 15、23 页（印刷页 8、16）的展开机构、主/次支柱、脚垫和 Apollo 11 月面照片。本站借鉴四腿支撑和可见结构连接，几何由代码原创；没有采用该报告图片作为网页资产，也没有按工程尺寸精确复刻。

同轮核对 NASA [月球与地球数值对比](https://science.nasa.gov/moon/by-the-numbers/) 的月面重力 1.624 m/s²，作为月尘简化运动的重力常数；阅读 [Flag Day – Flying High](https://www.nasa.gov/history/flag-day-flying-high-the-stars-and-stripes-in-space/) 关于无风环境、旗面横杆的说明，移除原实验持续飘动。红色小旗沿用原实验的色彩，不标示真实任务身份。研究 PDF 和参考帧仅保存在忽略的临时目录。
2026-10-04 阅读 Jos Stam 的 [Stable Fluids（1999）](https://graphics.stanford.edu/courses/cs448-01-spring/papers/stam.pdf) 与 Mark Harris 的 [GPU Gems 第 38 章](https://developer.nvidia.com/gpugems/gpugems/part-vi-beyond-triangles/chapter-38-fast-fluid-dynamics-simulation-gpu)，采用回溯输运、压力投影、双缓冲、正方形单元及涡量补偿的组织思路。本站为原创 JavaScript/GLSL 二维近似，有限压力迭代仍有残余散度，未采用文章的示例资产或声称流体工程精度。

染料校正对照 Selle 等的 [An Unconditionally Stable MacCormack Method](https://yingjie.math.gatech.edu/publications/SFKLR.pdf) 及 [作者书目页](https://andyselle.com/papers/7/)，阅读前向/反向误差估计与限制器，保留局部极值约束；没有将当前实现描述为已证明二阶精度。Stanford 镜像本次返回 404，已通过作者提供的 Georgia Tech PDF 核对正文。

同时核对固定 [Three.js r185 WebGLRenderer](https://github.com/mrdoob/three.js/blob/r185/src/renderers/WebGLRenderer.js) 的目标切换/浮点回读和 [WebGLCapabilities](https://github.com/mrdoob/three.js/blob/r185/src/renderers/webgl/WebGLCapabilities.js) 的类型支持。当前以 RGBA32F 附件与手工双线性取样避免依赖浮点线性过滤，检测扩展后再检查帧缓冲完整性；交接使用同步回读，未宣称完全没有主线程停顿。所有混色器几何、染料、玻璃和输入动作由本站代码产生，没有引入外部流体视频或图片。

2026-10-04 阅读 IAU [Startrails — First Place](https://iauarchive.eso.org/public/images/detail/ann21047m/) 的说明，并下载、实际查看该页星轨照片：地球自转轴定义天极，北极星靠近天极但不是严格重合；前景树木与固定背景提供尺度。本站采用共同角速度和稳定装置的构图关系，页面称“天极”，未把参考图片发布为资产。

同轮阅读 ESO [A hypnotising view of Paranal](https://www.eso.org/public/images/potw2546a/) 关于长曝光和叠加固定画面、天极旋转的文字；图片请求失败，没有将该图记为已观看。数值核对 NASA [Earth Fact Sheet](https://nssdc.gsfc.nasa.gov/planetary/factsheet/earthfact.html) 的 23.9345 小时恒星自转周期，以及 USNO [Sidereal Time](https://aa.usno.navy.mil/data/siderealtime) 对约 23 小时 56 分恒星日的解释。本站将一至六小时加速为数秒并标注示意星空；颜色、星位、相机与曝光弧线均由原创代码生成，不推断实际观测日期或地点。

2026-10-04 阅读 NASA 的 [NGC 628：Webb 与 Hubble 对照](https://science.nasa.gov/asset/webb/webb-and-hubbles-views-of-spiral-galaxy-ngc-628/) 并实际查看该页并排图像：可见光中的暗尘埃与红外指定颜色中的发光结构承担不同视觉信息。另阅读 [NGC 1300 对照说明](https://science.nasa.gov/asset/webb/webb-and-hubbles-views-of-spiral-galaxy-ngc-1300/)，该页图片未单独查看，不记为图像观察依据。本站借鉴同一对象随观察波段揭示结构的关系，未复制参考图或宣称复现某个真实星系。

同轮下载并阅读 ESA/Hubble [A galactic disc, edge-on and up close](https://esahubble.org/images/potw1228a/) 的正文，实际查看 NGC 4565 侧面图像：薄盘、遮光尘埃和盘外星光形成层次。浏览工具重试失败后通过 HTTP 下载取得正文与图片，临时文件没有发布。本站使用原创程序密度和几何表现薄盘、隆起及近似遮挡；均匀转动和点击加速是交互演示，不表示真实恒星轨道或 N 体演化。

2026-10-04 阅读并实际查看 kube 的 [Liquid Glass in the Browser: Refraction with CSS and SVG](https://kube.io/blog/liquid-glass-css-svg/) 透镜演示，参考曲面法线、折射方向、位移图边界和实时 backdrop-filter 的组织方式。本站自行生成光学场与纸面，不采用其演示图片。文章的归一化文字与标准的位移幅度表述不完全一致，实现以 [W3C Filter Effects 的 feDisplacementMap 定义](https://www.w3.org/TR/filter-effects-1/#feDisplacementMapElement) 为准：反向读取位置由 `scale × (channel − 0.5)` 给出；同时阅读 [MDN 元素说明](https://developer.mozilla.org/en-US/docs/Web/SVG/Reference/Element/feDisplacementMap) 核对公式与默认线性色彩空间，本站显式使用 sRGB 编码映射。

同轮阅读 Chrome 官方 [HTML-in-canvas origin trial changes](https://developer.chrome.com/blog/html-in-canvas-ot-changes) 的 2026-09-29 更新，确认它仍处试用且存在版本间 API 变化。本站没有采用试用 API、启用实验标志或将 CanvasTexture 说成实际 DOM 渲染；下方实验直接使用原生 HTML 按钮和 SVG backdrop 位移。三维首屏仅折射自己的纸面纹理，两处共享内容状态。当前真实像素检查针对 Chromium，其他浏览器使用清晰模式；不由 CSS.supports 的返回值推断所有浏览器都能正确折射。
2026-10-04 阅读 Glenn Fiedler 的 [Fix Your Timestep!](https://gafferongames.com/post/fix_your_timestep/)，采用固定步进、有限累计与负载保护的思路；超过预算时允许模拟放慢，避免无限追赶。下载并阅读 Erin Catto 的 [Continuous Collision（GDC 2013）](https://box2d.org/files/ErinCatto_ContinuousCollision_GDC2013.pdf)，实际查看第九页的接触时刻图，参考最早碰撞与剩余时间推进来避免球穿过薄砖。本站自行编写二维圆与矩形面的连续检测，并用圆角二次求交排除扩张方框的假碰撞；没有使用 Box2D 或声称实现整份讲义。

同轮阅读 [Three.js InstancedMesh 文档](https://threejs.org/docs/pages/InstancedMesh.html)，核对矩阵/颜色更新、边界重算和实例释放接口，落地于本站固定 r185 依赖。四组实例在重复游玩中复用缓冲，离开时实例、几何与材质分别释放；官方文档的通用性能动机不能替代本站实测帧率。

玩法沿用原实验的五行九列、三次机会和行分值，并对照 Atari 官方 [Breakout 家用版手册](https://atari.com/pages/breakout) 中移动挡板、发球与漏接的说明；该页为 1978 年家用版本，未混称为 1976 年街机规则。另阅读并实际查看 The Strong 博物馆的 [Breakout 街机藏品](https://artsandculture.google.com/asset/arcade-game-breakout/lAGqT3nqUqeBig?hl=en)，借鉴独立边框、控制位置和分层色带带来的可读性。本站为原创风格化游戏台，不复制街机外观、五球规则、参考照片或声音资产。
2026-10-04 阅读 CAVE 官方 [弹幕射击说明](https://www.cave.co.jp/gameonline/danmakushooting.html)，并下载、实际查看页面第一张游戏画面：可辨认的弹幕轨迹和空隙构成躲避体验。同轮阅读 [虫姬样产品页](https://www.cave.co.jp/business/%E8%99%AB%E5%A7%AB%E3%81%95%E3%81%BE/) 并实际查看第三张图库画面，用于观察弹丸、角色与复杂背景的层次。浏览器图片抓取失败后通过 HTTP 下载取得原图；两张参考仅在临时目录，不发布为网站资产。本站保留原实验的三种弹型，自行设计椭圆装置、角色艇和着色，不复制商业游戏的人物、关卡、美术或声音。

同轮阅读 Three.js 官方 [InstancedBufferGeometry](https://threejs.org/docs/pages/InstancedBufferGeometry.html)、[InstancedBufferAttribute](https://threejs.org/docs/pages/InstancedBufferAttribute.html) 和 [BufferAttribute](https://threejs.org/docs/pages/BufferAttribute.html)，核对实例数量、属性复用、`needsUpdate`、组件更新范围及首次使用前指定 usage 的要求。本站在固定 r185 的 WebGL 渲染中使用预分配实例四边形，GPU 像素位置另行测量；文档中的 WebGPU 专属属性释放不用于 WebGL，WebGL 通过所属几何释放缓冲。碰撞与固定步进继续采用前一轮已核对的时间分割原则，未引入第三方弹幕脚本或视频。
2026-10-04 整站性能复查核对固定 r185 渲染器源码及 Three.js [WebGLRenderer](https://threejs.org/docs/pages/WebGLRenderer.html) 的 `compileAsync`：应先配置灯光和环境，再预编译材质；该方法利用并行编译扩展。结合 [InstancedMesh](https://threejs.org/docs/pages/InstancedMesh.html) 的颜色属性初始化，在第一次实际碰撞前固定碎片的颜色版本。CPU 采样中出现首次 `getProgramInfoLog` 等待，本站将相关准备移到初始化阶段，保留错误检查；折射通路与流体注入核另外实测，不能仅凭调用预编译就声明首次操作无停顿。
2026-10-04 从失效图的时间戳 alt 和原文句子找到猫猫子在博客园的[传输层-Transport Layer（上）](https://www.cnblogs.com/maomaozi/p/14111386.html)。正文与本站既有笔记的相关段落、十二张图的名称/顺序一致，全部图像实际查看后按原字节保存，包含原作者水印。文章展示出处链接；旧 CDN 字节不可取回，因此对应依据是名称和语境，不声称旧文件哈希一致。来源与新文件摘要记录在 [图片清单](../../assets/blog/transport/manifest.json)。此次为恢复既有文章图示，未把第三方图像用于网站 3D 或品牌视觉。

2026-10-04 核对 [Three.js WebGLRenderer](https://threejs.org/docs/pages/WebGLRenderer.html) 的像素比与画布尺寸接口，并对照本站固定 r185 的实现使用；画质切换复用渲染器。阅读 [MDN storage 事件](https://developer.mozilla.org/en-US/docs/Web/API/Window/storage_event)，区分同页选择通知与其他同源文档的存储通知；阅读 [MDN postMessage](https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage)，子实验握手同时验证来源、窗口和数值范围。文档说明用于接口设计，具体状态与资源不重建的结论来自本站浏览器审计。

## 文章章节与稳定阅读布局

2026-10-04 阅读 [CommonMark 0.31.2 强调规则](https://spec.commonmark.org/0.31.2/#emphasis-and-strong-emphasis)，核对标点后、中文字符前的双星号无法满足右侧分隔条件；仅把两篇中的三处既有强调改为明确 strong 元素，保持字词与标点。阅读 [Typography Handbook](https://typographyhandbook.com/) 的行宽与行距建议作为排版参考，中文正文实际采用桌面 17 px、窄屏 16 px 与独立行宽检查；没有把拉丁字符行长建议当作中文硬指标，也未声称实际查看该站截图。

阅读 [MDN scrollIntoView](https://developer.mozilla.org/en-US/docs/Web/API/Element/scrollIntoView) 的 scroll-margin 说明与 [img 尺寸说明](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/img)，用于章节定位和图片加载前的比例预留。构建从真实源文件提取元数据，浏览器解码另核对全部 70 张本地图；其中一张扩展名为 PNG 的历史文件实际为有损 WebP，按 [Google WebP 容器规范](https://developers.google.com/speed/webp/docs/riff_container) 识别内容而非后缀。阅读 [Three.js CapsuleGeometry](https://threejs.org/docs/pages/CapsuleGeometry.html)，并核对本地 r185 的 height 为中段长度，修复手臂几何与手掌连接。没有新增第三方视觉资产。

## 旧图床配图追溯

2026-10-04 实际请求六篇中的全部 67 个旧 Gitee 图片地址，均为 HTTP 404；Gitee 图床仓库和对应公开 GitHub 仓库也未取得原文件。恢复依据及逐图链接见 [清单](../../assets/blog/recovered/manifest.json)，没有宣称旧图字节相同。

网络笔记从 [概述公开存档](https://geekdaxue.co/read/cessstudy@eygo6g/gdrwok)、[物理层公开存档](https://geekdaxue.co/read/cessstudy@eygo6g/ap71m3)、[数据链路层公开存档](https://geekdaxue.co/read/cessstudy@eygo6g/acda1t) 取得完整文章与图片，实际查看 58 张候选图，并核对本地笔记的相邻文字和小节。概述的 [腾讯云转载页](https://cloud.tencent.com/developer/article/2095455) 列出原 CSDN 系列链接；原作者账户为 weixin_45067603，图片中保留王道考研、CSDN 等署名。CSDN 概述只取得简介与系列入口，其余两页请求未成功，不把存档阅读写成原站全文阅读。

第三十一轮曾推断数据链路层存档多出 CRC 可靠性说明和海明码中间分组表，因而排除这两张；其中 CRC 推断已被第三十八轮原文件证据推翻，原第 13 图正是可靠性说明。此前误配的接收端除法图已纠正，详见下文。停止等待协议的 ACK 迟到图与本站已有文件 SHA-256 同为 `618cc806f815d0cb6fa4af56e5cc1d751eb0495c1013815c7d459685f8a0e741`，这一单图字节结论仍成立。

组成原理的七份 CSDN 文件名与原 alt 时间戳一致，实际查看系统、运算、存储、指令、CPU、总线和 I/O 架构图，保留原文八次展示；扫描图作者仍未知，不能把存储平台写成作者。Python 笔记的 [Vim 键位图](https://doc.shiyanlou.com/document-uid731737labid7100timestamp1531381084391.png) 与旧文件名一致，图内标明 ViEmu、fdl 汉化；源内容实际是 JPEG，按 JPEG 保存。人脸项目的 [深度可分离卷积图](https://img-blog.csdnimg.cn/20191030154355407.png) 与原 alt 同名且内容相符。上述九份唯一文件均实际查看并保留原字节。

第三十一轮尚未确认 MTCNN 级联与图像金字塔的两张时间戳图片。当时已检索到 OpenCV 学堂的级联说明及 [码农的后花园文章](https://www.cnblogs.com/xiamuzi/p/13637756.html)，但相似段落不足以确认原图或裁切，未将候选图发布为恢复结果。第三十八轮已通过下述同名原文件解决。恢复图只用于既有技术文章，不用于网站品牌、3D 美术或原创署名。

2026-10-05 重新检查项目原链接时，发现 [当前 PicGo 仓库](https://gitee.com/buptsg2019/picgo) 可访问。`git ls-remote` 取得 master 提交 `f2dca76bbe1f19fa7294573a31458d6be27b6ff5`；以原 URL 文件名从该提交逐一取得全部 67 处图片。独立请求 [Git 文件树 API](https://gitee.com/api/v5/repos/buptsg2019/picgo/git/trees/f2dca76bbe1f19fa7294573a31458d6be27b6ff5?recursive=1)，返回 887 项且未截断；每份下载的 Git blob 摘要与对应条目相同。旧 `sg2019` 级联 raw 地址仍实测 404，当前所有者路径可取原文件；没有独立证据确定账户改名时间或历史过程。

逐项比较：56 处与第三十一轮文件逐字节一致，9 处不同，2 处此前未恢复。实际查看全部九组前后对照及两张新增图：CRC 原图为 1035×163 的可靠性说明，卷积原图为 583×314 的上半部裁切；其余不同文件主题相同但像素或压缩不同，均按固定版本原字节保存。两张 MTCNN 图分别为 500×580 和 601×202。清单记录原地址、固定来源、Git blob、SHA-256、位置及先前替代记录；Gitee 只作为文件来源，不替代 ViEmu、fdl、王道考研、CSDN 等原署名。

同轮实际阅读 [MTCNN 作者项目页](https://kpzhang93.github.io/MTCNN_face_detection_alignment/)，核对三阶段检测/对齐说明、作者、2016 年论文和代码入口；未声称阅读全文 PDF。只读克隆原 [Flask 人脸项目](https://gitee.com/buptsg2019/flask-face-recognition-api)，实际 HEAD 为 `630512dacf9715d4bb5a798814bf6282b34a5417`，阅读 README 及 utils.py 中缩放和 NMS 实现用于后续研究；此次配图恢复没有新增浏览器模型推理或复制人脸数据集。

2026-10-04 阅读 MDN 的 [dialog 元素](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/dialog) 与 [showModal](https://developer.mozilla.org/en-US/docs/Web/API/HTMLDialogElement/showModal)，核对顶层模态框、背景不可交互、初始焦点及可见关闭入口；没有依赖较新的 closedby 或声明式调用属性。继续阅读 [WAI-ARIA APG 模态框模式](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/)，按其键盘行为实现双向焦点循环、Escape 和返回入口。实际 Chromium 检查中第五次 Tab 曾落到 BODY，因此补充了显式首尾循环；这不等于已完成全部浏览器或辅助技术验证。

## 房间里的个人资料与配色

2026-10-05 核对原关于页已链接的 [eli3xir GitHub 资料](https://github.com/eli3xir)，下载该页使用的[账户头像](https://avatars.githubusercontent.com/u/307186276?s=256&v=4)并实际查看。文件为 420×420 的几何图案，保留 1,569 字节原文件；来源、日期、尺寸与 SHA-256 记录在 [清单](../../assets/profile/manifest.json)。没有从头像推断个人身份或新增经历。画框色样直接取本站既有五种配色，文字、纸纹与指针由本仓库绘制。

同轮阅读 Three.js 官方 [Texture](https://threejs.org/docs/pages/Texture.html) 和 [CanvasTexture](https://threejs.org/docs/pages/CanvasTexture.html)，核对 channel、颜色空间和纹理更新；结合实际 GLB 的属性与顶点，选择新增 uv2 而保留原烘焙坐标。最初尝试让头像旋转对齐纸卡，但实际查看原 photo_card 光照图后确认阴影已烘焙在原位置，最终恢复原变换。采用依据来自原资产和真实截图，没有把文档接口说明当作成品视觉验证。

2026-10-05 项目便签的事实取自仓库既有 [项目页](../../projects/index.html)：C++ 多客户端聊天室与 MySQL、Flask 接口和 MTCNN/FaceNet、Pascal-S 的 lex/yacc/LLVM 技术路线。只增加三个卡片锚点，原介绍和仓库链接保留；没有以搜索摘要补造项目进度。通信节点、检测框、语法树与存储草图为代码绘制的解释性示意，不声称是实际程序输出。

复核 Three.js 官方 [CanvasTexture](https://threejs.org/docs/pages/CanvasTexture.html)、[Texture](https://threejs.org/docs/pages/Texture.html) 与 [Raycaster](https://threejs.org/docs/pages/Raycaster.html)，用于一次生成的共享图集、独立 UV 与按实际相交物件选择项目。实际 GLB 保留十张纸面的不同尺寸和旋转，天花板下表面用于限制飞行高度。连续录像发现穿过顶面的失败，比只检查屏幕投影得到更强的反证；后续加入实际几何高度与角色灯点到镜头的遮挡检查。

## 可操作的表达式与语法树

2026-10-05 从项目原链接只读克隆 [Pascal-S-compiler](https://gitee.com/buptsg2019/pascal-s-compiler)，实际 HEAD 为 `7a8b8917c8b1d3e2b1df6c7584c28cdcbb16a865`。网页抓取部分失败后改用仓库和 raw README 核实，没有把缓存页日期当作新提交。阅读 pascal.l、pascal.y、AbstractTree.cpp 与 pas/1.pas：赋值使用 `:=`，expr / term / factor 分层赋予乘法优先级，括号返回内部表达式；一元负号构造零减节点。整数加减乘由 LLVM Builder 的 CreateAdd / CreateSub / CreateMul 生成。词法器虽然有 div token，语法中的 DIVI 分支被注释；本次网页演示因此没有声称支持它。

阅读 LLVM 官方 [Implementing a Parser and AST](https://llvm.org/docs/tutorial/MyFirstLanguageFrontend/LangImpl02.html) 的 AST、表达式和括号部分，核对树表示语义结构以及括号不必成为节点的解释。该教程的语言是 Kaleidoscope，不能据此推断原 Pascal 项目的全部功能。网页新增解析器由本仓库实现，限定一条整数赋值式；它真实生成树和结果，但不是原 LLVM 编译器的浏览器移植。三维字块、连杆与传值动画也由本仓库程序生成，没有引入第三方视觉资产。

## 真实的浏览器人脸检测

2026-10-05 继续核对原 [Flask 人脸项目](https://gitee.com/buptsg2019/flask-face-recognition-api) 的固定提交 `630512dacf9715d4bb5a798814bf6282b34a5417`：读取 net/mtcnn.py 的全部 P/R/O 网络层、utils.py 的缩放和三阶段后处理、align 与 camera 的 RGB/阈值调用，以及 H5 内部张量与 Keras 2.0.4 元数据。仅导出三份 MTCNN 权重并保留原 MIT 许可；没有发布原个人照片、结果目录或 92 MB 的 FaceNet 模型。

实际阅读 [MTCNN 作者项目页](https://kpzhang93.github.io/MTCNN_face_detection_alignment/) 及 [论文 PDF](https://kpzhang93.github.io/MTCNN_face_detection_alignment/paper/spl.pdf) 的前三页相关文本，核对图像金字塔、三阶段网络和五个关键点。没有把 PDF 截图工具返回的引用当作已看见图像，也没有声称复现论文中的评估精度。网页阈值和边框计算依据原项目实现。

阅读 TensorFlow 官方 [模型与层](https://www.tensorflow.org/js/guide/models_and_layers)、[运行环境与后端](https://www.tensorflow.org/js/guide/platform_environment)、[4.22 API](https://js.tensorflow.org/api/4.22.0/) 和固定版本 [WASM README](https://github.com/tensorflow/tfjs/blob/tfjs-v4.22.0/tfjs-backend-wasm/README.md)，据此选择 core + 单线程 WASM，并显式释放中间张量。上游运行文件保持原字节，Apache 许可和 README 保存在 vendor/tfjs；版本与摘要见模型清单。

示例取自 [scikit-image 的 astronaut 数据说明](https://scikit-image.org/docs/0.25.x/api/skimage.data.html#skimage.data.astronaut) 与 [v0.25.2 原 PNG](https://raw.githubusercontent.com/scikit-image/scikit-image/v0.25.2/skimage/data/astronaut.png)。进一步用 curl 读取短链接跳转后的 [NASA on The Commons 原页](https://www.flickr.com/photos/nasacommons/16504233985/)，核对 canonical、Eileen Collins / STS-93 图注、NASA 署名与 Commons 许可入口；示例仅用于解释检测算法。图片保留 791,555 字节原内容及 SHA-256，没有重绘或修改肖像。

数值参考由独立 NumPy 算子直接读取原 H5，组合未经修改的原 Python 后处理与 OpenCV 缩放；它不等同于运行完整旧版 Keras。初次逐行按顺序比较发现两个相近分数的候选互换，改为唯一几何对应后核对全部框、分数和关键点，并在验证记录保留该差异。

线上画面复查发现慢加载后照片未显示，继续核对 Three.js 官方 [Texture](https://threejs.org/docs/pages/Texture.html) 的首次使用后尺寸不可变约束，并用延迟真实输入和 GPU 读回复现 `GL_INVALID_VALUE`。显示层改为固定尺寸画布原位重绘，保存同一纹理和照片比例；独立参考纹理的逐像素比较验证实际上传，不能以正确的模型输出推断 GPU 照片已经显示。

## 装置保持比例的连续升降

2026-10-05 对照原实际录像中被纵向压扁的照片，改为完整模型经过台面开口升降。核对 Three.js 官方 [Material](https://threejs.org/docs/pages/Material.html) 的 clippingPlanes、clipShadows 与 [Plane](https://threejs.org/docs/pages/Plane.html) 的变换：裁切面使用世界坐标，负有符号距离一侧不绘制；必须启用 renderer.localClippingEnabled，阴影裁切另行启用。独立 GPU 读回比较实际照片的裁切与未裁切渲染，分别检查开口以下透明、以上像素保持。轨迹、井口与托盘均为本仓库代码，没有引入外部模型或视频转场。

## 后处理中的细线与轮廓

2026-10-05 阅读 Three.js 官方 [RenderTarget](https://threejs.org/docs/pages/RenderTarget.html)、[EffectComposer](https://threejs.org/docs/pages/EffectComposer.html)、[多重采样示例](https://threejs.org/examples/webgl_multisampled_renderbuffers.html) 与 [r185 SMAA 示例](https://github.com/mrdoob/three.js/blob/r185/examples/webgl_postprocessing_smaa.html)，并读取本地 0.185.1 的 EffectComposer、SMAAPass、FXAAPass、FXAAShader、WebGLTextures 和 WebGLRenderer。核对默认离屏 samples 为零、颜色与深度格式、采样支持及合成器交换行为；未把默认画布的 antialias 属性视为离屏画面已经抗锯齿的证据。

同一冻结镜头下比较原输出、默认及较低阈值的 SMAA、FXAA、完整缓冲区 MSAA、仅场景 MSAA 和 2 倍像素比。此次主体的细线与小字选择仅场景 MSAA，省电及格式不支持时使用 FXAA；这是本网站的取舍，不推断某种算法在所有场景都更好。新增两份 FXAA 文件直接取自 [three 0.185.1 发布包](https://registry.npmjs.org/three/-/three-0.185.1.tgz)，原包 SHA-512 与重新获取的 [npm 版本元数据](https://registry.npmjs.org/three/0.185.1) 一致，发布文件再与归档成员逐字节比较；沿用 vendor/three/LICENSE。

恢复检查进一步参考官方 [PMREMGenerator](https://threejs.org/docs/pages/PMREMGenerator.html)、[WebGL 上下文丢失说明](https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/isContextLost)，并读取本地 r185.1 的 PMREMGenerator、WebGLRenderer 与 WebGLTextures。实际截图确认恢复后金属反射丢失；由场景生成的目标没有可重新上传的原图，因此在恢复事件中重建。共享房间保留原探针与过渡权重，避免中途换色回跳；这是针对本项目资源生命周期的修复。

## 手机项目页的真实场景与表单顺序

2026-10-05 从线上截图追查项目首屏留白，DOM 测量确认不可见的三个 Grid 面板仍按最高者占位。参考 MDN 的 [Grid 布局说明](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/grid) 与 Three.js [PerspectiveCamera](https://threejs.org/docs/pages/PerspectiveCamera.html) 的 setViewOffset，再用本地固定版本与真实浏览器核对。新布局让活动表单位于三维区域之后，投影按窗口视锥与文档区域位置建立；按实际投影边界求解尺度，模型、照片和控制器保持原对象。此处依据是该站的截图、DOM 与几何测量，没有把响应式模拟称作真机测试。

## 唱机的木材与压制黄铜

2026-10-05 核对 Three.js 官方 [MeshPhysicalMaterial](https://threejs.org/docs/pages/MeshPhysicalMaterial.html)、[MeshStandardMaterial](https://threejs.org/docs/pages/MeshStandardMaterial.html) 与 [Texture](https://threejs.org/docs/pages/Texture.html)：方向性反射用于拉丝，清漆层与木材底层分别控制；色纹使用 sRGB，起伏与粗糙度保留线性数据。代码生成的三份纹理启用 mipmap 与各向异性过滤，并在网站固定 r185.1 中实际渲染、丢失和恢复上下文。材质和压纹造型为本站原创程序实现；这是风格化制作质感，不宣称复刻某件历史唱机或真实木种扫描。
