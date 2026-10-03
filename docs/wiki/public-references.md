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
| [MDN AudioBuffer.getChannelData](https://developer.mozilla.org/en-US/docs/Web/API/AudioBuffer/getChannelData) | 写入逐采样 PCM 数据 |
| [MDN BaseAudioContext.currentTime](https://developer.mozilla.org/en-US/docs/Web/API/BaseAudioContext/currentTime) | 声音播放和视觉同步时钟 |
| [MDN AudioWorkletProcessor.process](https://developer.mozilla.org/en-US/docs/Web/API/AudioWorkletProcessor/process) | 对比实时逐采样合成与离线缓冲生成的工作方式 |

本项目新几何、动画和配乐原创实现。采用外部代码或资产时必须记录来源、版本、许可及实际使用范围。
