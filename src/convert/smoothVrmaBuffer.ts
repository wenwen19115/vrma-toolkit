import {
  buildGlb,
  forEachHeadNeckRotationAccessor,
  getAccessorFloats,
  parseGlb,
} from "../core/glbIo";
import { smoothQuatAccessor } from "../core/quatSmooth";

/** 对已有 VRMA buffer 再平滑头/颈 rotation，不改 humanoid 扩展 */
export function smoothVrmaBuffer(
  buffer: ArrayBuffer,
  alpha: number
): ArrayBuffer {
  if (alpha <= 0) return buffer.slice(0);
  const parts = parseGlb(buffer);
  let touched = 0;
  forEachHeadNeckRotationAccessor(parts, (accessorIndex) => {
    const values = getAccessorFloats(parts, accessorIndex);
    smoothQuatAccessor(values, alpha);
    touched++;
  });
  if (!touched) {
    throw new Error("VRMA 里找不到 head/neck 旋转轨，无法平滑");
  }
  return buildGlb(parts.json, parts.bin);
}
