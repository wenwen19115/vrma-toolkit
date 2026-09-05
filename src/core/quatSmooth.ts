import * as THREE from "three";

/**
 * 对交错 xyzw 四元数数组做双向 slerp 低通。
 * @param alpha 越小越稳（更糊）
 */
export function smoothQuatAccessor(
  values: Float32Array | number[],
  alpha: number
): void {
  const n = values.length / 4;
  if (n < 3 || alpha <= 0) return;

  const q = new THREE.Quaternion();
  const prev = new THREE.Quaternion();
  const tmp = new THREE.Quaternion();
  const fwd = new Float32Array(values.length);

  prev.set(values[0]!, values[1]!, values[2]!, values[3]!).normalize();
  fwd[0] = prev.x;
  fwd[1] = prev.y;
  fwd[2] = prev.z;
  fwd[3] = prev.w;
  for (let i = 1; i < n; i++) {
    q.set(
      values[i * 4]!,
      values[i * 4 + 1]!,
      values[i * 4 + 2]!,
      values[i * 4 + 3]!
    ).normalize();
    if (prev.dot(q) < 0) q.set(-q.x, -q.y, -q.z, -q.w);
    tmp.copy(prev).slerp(q, alpha);
    prev.copy(tmp);
    fwd[i * 4] = prev.x;
    fwd[i * 4 + 1] = prev.y;
    fwd[i * 4 + 2] = prev.z;
    fwd[i * 4 + 3] = prev.w;
  }

  prev.set(
    fwd[(n - 1) * 4]!,
    fwd[(n - 1) * 4 + 1]!,
    fwd[(n - 1) * 4 + 2]!,
    fwd[(n - 1) * 4 + 3]!
  );
  values[(n - 1) * 4] = prev.x;
  values[(n - 1) * 4 + 1] = prev.y;
  values[(n - 1) * 4 + 2] = prev.z;
  values[(n - 1) * 4 + 3] = prev.w;
  for (let i = n - 2; i >= 0; i--) {
    q.set(fwd[i * 4]!, fwd[i * 4 + 1]!, fwd[i * 4 + 2]!, fwd[i * 4 + 3]!);
    if (prev.dot(q) < 0) q.set(-q.x, -q.y, -q.z, -q.w);
    tmp.copy(prev).slerp(q, alpha);
    prev.copy(tmp);
    values[i * 4] = prev.x;
    values[i * 4 + 1] = prev.y;
    values[i * 4 + 2] = prev.z;
    values[i * 4 + 3] = prev.w;
  }
}

/** AnimationClip 上头/颈轨平滑（BVH 转换路径） */
export function smoothHeadNeckClipTracks(
  clip: THREE.AnimationClip,
  boneNames: Set<string>,
  alpha: number
): void {
  if (alpha <= 0 || !boneNames.size) return;
  for (const track of clip.tracks) {
    if (!track.name.endsWith(".quaternion")) continue;
    const boneName = track.name.slice(0, -".quaternion".length);
    if (!boneNames.has(boneName)) continue;
    smoothQuatAccessor(track.values, alpha);
  }
}

export function collectHeadNeckBoneNames(
  vrmBoneMap: Map<string, THREE.Object3D>,
  clip: THREE.AnimationClip
): Set<string> {
  const names = new Set<string>();
  for (const key of ["head", "neck"] as const) {
    const bone = vrmBoneMap.get(key);
    if (!bone) continue;
    let cur: THREE.Object3D | null = bone;
    for (let i = 0; i < 4 && cur; i++) {
      names.add(cur.name);
      cur = cur.parent;
    }
  }
  for (const track of clip.tracks) {
    if (!track.name.endsWith(".quaternion")) continue;
    const boneName = track.name.slice(0, -".quaternion".length);
    if (/head|neck|skull|endsite/i.test(boneName)) names.add(boneName);
  }
  return names;
}
