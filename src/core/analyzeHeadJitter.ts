import type { JitterStats } from "./types";
import {
  findHeadRotationAccessorIndex,
  getAccessorFloats,
  parseGlb,
} from "./glbIo";

export function analyzeHeadJitter(buffer: ArrayBuffer): JitterStats {
  const parts = parseGlb(buffer);
  const hit = findHeadRotationAccessorIndex(parts);
  if (!hit) {
    return { avgDeg: 0, maxDeg: 0, keys: 0, nodeName: null };
  }
  const q = getAccessorFloats(parts, hit.accessorIndex);
  const n = q.length / 4;
  if (n < 2) {
    return { avgDeg: 0, maxDeg: 0, keys: n, nodeName: hit.nodeName };
  }
  let maxDeg = 0;
  let sum = 0;
  let count = 0;
  for (let i = 1; i < n; i++) {
    const a = i * 4;
    const b = (i - 1) * 4;
    let d =
      q[a]! * q[b]! +
      q[a + 1]! * q[b + 1]! +
      q[a + 2]! * q[b + 2]! +
      q[a + 3]! * q[b + 3]!;
    d = Math.min(1, Math.max(-1, Math.abs(d)));
    const deg = (Math.acos(d) * 2 * 180) / Math.PI;
    maxDeg = Math.max(maxDeg, deg);
    sum += deg;
    count++;
  }
  return {
    avgDeg: sum / count,
    maxDeg,
    keys: n,
    nodeName: hit.nodeName,
  };
}
