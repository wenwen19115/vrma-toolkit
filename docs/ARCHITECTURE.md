# VRMA Toolkit 架构

动作调试台：BVH / FBX → VRMA、已有 VRMA 再平滑、抖动指标、对比预览、批量 zip。

## 分层（单向依赖）

```
ui (Vue) → convert / preview / core
convert → core + bvh-converter
preview → three / three-vrm（无 convert）
bin/CLI → convert / core（与 UI 同 SoT）
```

| 目录 | 职责 |
| --- | --- |
| `src/core/` | 类型、GLB 读写、四元数双向 slerp、头轨抖动统计（无 Vue / 无 DOM） |
| `src/convert/` | `bvhToVrma` / `fbxToVrma` / `smoothVrmaBuffer` |
| `src/bvh-converter/` | 骨骼映射与 GLTF 导出（来自 bvh2vrma）；平滑走 `core/quatSmooth` |
| `src/preview/` | `PreviewHost` 单窗；`DualPreview` 左右对比 |
| `src/ui/` | 壳与面板；状态在 `useToolkitStore`；`App.vue` 只接线 |
| `bin/` | CLI：`--in/--out`、`--smooth-vrma`、`--fbx` |

## 队列 SoT

每条：`originalVrma`（未平滑/直开）+ `currentVrma`（可下/可播）+ `jitterBefore` / `jitterAfter`。

- 打开 VRMA：两者同文件；「再平滑」只改 `currentVrma`
- BVH/FBX：先 `smoothAlpha=0` 得 original，再按滑条平滑得 current
- 对比：左 original / 右 current；zip = 所有有 `currentVrma` 的项

## 数据流

1. 拖入 → `addFiles` 入队
2. 「转换 / 打开」→ convert 或直读 → 算 jitter → `playToken++` 触发预览
3. 「再平滑」→ `smoothVrmaBuffer(original)` → 更新 current / jitterAfter
4. 下载单条 / `fflate` zip
