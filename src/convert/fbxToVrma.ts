import * as THREE from "three";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js";
import type { BVH } from "three/examples/jsm/loaders/BVHLoader";
import { convertBVHToVRMAnimation } from "../bvh-converter/convertBVHToVRMAnimation";
import type { ConvertOptions } from "../core/types";

/**
 * 浏览器内 FBX → VRMA（Mixamo / 类人型尽力）。
 * 无 SkinnedMesh 或无动画时抛中文错误。
 */
export async function fbxBufferToVrma(
  buffer: ArrayBuffer,
  options?: ConvertOptions
): Promise<ArrayBuffer> {
  const loader = new FBXLoader();
  let root: THREE.Group;
  try {
    root = loader.parse(buffer, "");
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(`FBX 解析失败：${msg}`);
  }

  let skinned: THREE.SkinnedMesh | null = null;
  root.traverse((obj) => {
    if (skinned) return;
    if ((obj as THREE.SkinnedMesh).isSkinnedMesh) {
      skinned = obj as THREE.SkinnedMesh;
    }
  });
  if (!skinned?.skeleton) {
    throw new Error("FBX 里没有 SkinnedMesh/骨骼，无法转 VRMA（需要类人型蒙皮）");
  }

  const clip = root.animations?.[0];
  if (!clip || !clip.tracks?.length) {
    throw new Error("FBX 里没有动画剪辑，请导出带动作的 Mixamo/类人型 FBX");
  }

  // convertBVHToVRMAnimation 期望 BVH 形状：{ skeleton, clip }
  const bvh = {
    skeleton: skinned.skeleton,
    clip: clip.clone(),
  } as BVH;

  try {
    return await convertBVHToVRMAnimation(bvh, {
      // Mixamo 常已是米制；默认不缩小。可用 options.scale 覆盖。
      scale: options?.scale ?? 1,
      smoothAlpha: options?.smoothAlpha,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(`FBX→VRMA 失败（可能非类人型骨骼）：${msg}`);
  }
}
