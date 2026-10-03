# 房间光照烘焙

运行 [rebake-room.py](../../../tools/blender/rebake-room.py) 生成可对照的候选贴图。依赖 Blender 4.5 LTS 及既有 model-studio 的 `room/room.blend`；源场景不在网站仓库内，必须用 `--source` 指定。网站运行只需要现有 GLB、JPEG 与 manifest，不依赖 Blender。

```powershell
& 'D:/Software/blender/blender.exe' --background --python tools/blender/rebake-room.py -- --source 'D:/model-studio/room/room.blend' --out 'D:/eli3xir.github.io/temp-docs/lightmaps-candidate' --objects wall_back,floor,gramo_cab --samples 512
```

`--objects all` 使用当前 manifest 的全部对象；`--resume` 跳过已完成项并保留候选记录，源文件、几何或采样设置变动时需要新的输出目录。运行前确认输出目录为预期的候选位置。源 `.blend` 和站内 GLB 仅读取。

`--web-max-size` 默认为 1024，保持站内旧贴图的实际分辨率上限；高分辨率 EXR 留作源图。调整上限时可用 `--resume --encode-only` 重新编码已完成的 EXR，避免重新烘焙。候选 JPEG 的尺寸与 `size` 一致，`bakeSize` 另记原始采样尺寸。

工具从发布 GLB 提取实际几何、第一层 UV 和 lightmap UV，保留导出后的倒角，核对世界坐标包围盒。光照使用原始暖光设置，Cycles 烘焙直接与间接漫反射，不重复烘焙基础色。

自动选择实际可用的 OptiX、CUDA 或 HIP 设备；没有设备时使用 CPU。烘焙本身不使用普通渲染去噪选项；另以物体空间法线为引导，在 Compositor 的 Denoise 节点执行 HDR 去噪。

输出保留原始与去噪 EXR，并以最大线性亮度归一化后，用 Standard/sRGB 保存 JPEG。manifest 的 `scale` 恢复每张图的 HDR 强度；没有 `scale` 的旧图使用 1。不能把新 JPEG 单独替换并忽略倍率，也不能先应用 AgX/ACES 的显示色调再把它作为光照数据。

`bake-report.json` 记录源场景/GLB 校验和、采样、设备、每张贴图倍率、耗时与字节数。候选 EXR、完整日志与截图保存在忽略目录；经原场景、局部特写、全部皮肤和移动视口对照后，只发布 JPEG 与 manifest。

HDR 光照会影响 Bloom 阈值与高光范围。贴图对照须同步检查后处理，避免新的真实亮度被扩成大片白光。最后运行网站验证与浏览器交互检查；烘焙成功不等于艺术验收通过。
