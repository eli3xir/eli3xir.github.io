# 公开参考与核验

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