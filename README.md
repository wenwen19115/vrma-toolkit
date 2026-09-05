# vrma-toolkit

独立动作调试台：**BVH / FBX → VRMA**、已有 VRMA 再平滑、头轨抖动、对比预览、批量 zip。

架构见 [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)。

## 可视化界面（推荐）

```bash
yarn
yarn dev
```

浏览器打开（默认 http://localhost:5177）：

1. 拖入 / 选择 `.bvh` / `.fbx` / `.vrma`
2. 调头颈平滑、BVH/FBX 缩放
3. **转换 / 打开并预览** — 看抖动指标；可开对比（左原始 / 右当前）
4. **对选中项再平滑**（不必回 BVH）
5. 单条下载或队列 **打包 zip**；可换本地 `.vrm` 预览

## 命令行

```bash
# BVH 批转
yarn convert -- --in path\to\bvh_or_dir --out path\to\out --smooth 0.10 --scale 0.01

# FBX 批转（Mixamo/类人型尽力；默认 scale=1）
yarn convert -- --fbx --in path\to\fbx_or_dir --out path\to\out --smooth 0.10 --scale 1

# 对已有 VRMA 再平滑
yarn convert -- --smooth-vrma --in path\to\vrma_or_dir --out path\to\out --smooth 0.10
```

## 来源与许可

- 转换核心基于 [vrm-c/bvh2vrma](https://github.com/vrm-c/bvh2vrma)（MIT）
- BVH / FBX 素材各自遵守原许可（如 ACCAD CC BY 3.0）

## 目录

```
bin/vrma-convert.mjs   # CLI
src/core/              # GLB / 平滑 / 抖动
src/convert/           # BVH·FBX·再平滑入口
src/bvh-converter/     # 骨骼映射与导出
src/preview/           # 单窗 / 双窗预览
src/ui/                # Vite + Vue
docs/ARCHITECTURE.md
```
