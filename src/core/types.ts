export type SourceKind = "bvh" | "fbx" | "vrma";

export interface JitterStats {
  avgDeg: number;
  maxDeg: number;
  keys: number;
  /** 命中的头/颈节点名 */
  nodeName: string | null;
}

export interface ConvertOptions {
  scale?: number;
  /** 头颈双向 slerp；越小越稳。0 = 关闭 */
  smoothAlpha?: number;
}

export interface QueueItemBase {
  id: string;
  name: string;
  kind: SourceKind;
  originalVrma: ArrayBuffer | null;
  currentVrma: ArrayBuffer | null;
  jitterBefore: JitterStats | null;
  jitterAfter: JitterStats | null;
  error: string | null;
}
