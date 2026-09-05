/** GLB / VRMA 读写（无 DOM） */

export interface GlbParts {
  json: Record<string, unknown>;
  bin: Uint8Array;
  raw: Uint8Array;
}

export function parseGlb(buffer: ArrayBuffer): GlbParts {
  const raw = new Uint8Array(buffer.slice(0));
  const view = new DataView(raw.buffer, raw.byteOffset, raw.byteLength);
  if (view.getUint32(0, true) !== 0x46546c67) {
    throw new Error("不是有效的 GLB/VRMA");
  }
  const jsonLen = view.getUint32(12, true);
  const jsonStart = 20;
  const jsonBytes = raw.subarray(jsonStart, jsonStart + jsonLen);
  const json = JSON.parse(new TextDecoder().decode(jsonBytes)) as Record<
    string,
    unknown
  >;
  const jsonPad = (4 - (jsonLen % 4)) % 4;
  const binChunkStart = 12 + 8 + jsonLen + jsonPad;
  const binLen = view.getUint32(binChunkStart, true);
  const bin = raw.subarray(binChunkStart + 8, binChunkStart + 8 + binLen);
  return { json, bin, raw };
}

export function buildGlb(
  json: Record<string, unknown>,
  bin: Uint8Array
): ArrayBuffer {
  const buffers = json.buffers as Array<{ byteLength?: number }> | undefined;
  if (buffers?.[0]) buffers[0].byteLength = bin.length;

  const jsonBytes = new TextEncoder().encode(JSON.stringify(json));
  const jsonPad = (4 - (jsonBytes.length % 4)) % 4;
  const jsonChunkLen = jsonBytes.length + jsonPad;
  const binPad = (4 - (bin.length % 4)) % 4;
  const binChunkLen = bin.length + binPad;
  const total = 12 + 8 + jsonChunkLen + 8 + binChunkLen;

  const out = new ArrayBuffer(total);
  const view = new DataView(out);
  const u8 = new Uint8Array(out);

  view.setUint32(0, 0x46546c67, true);
  view.setUint32(4, 2, true);
  view.setUint32(8, total, true);

  view.setUint32(12, jsonChunkLen, true);
  view.setUint32(16, 0x4e4f534a, true);
  u8.set(jsonBytes, 20);
  for (let i = 0; i < jsonPad; i++) u8[20 + jsonBytes.length + i] = 0x20;

  const binHeader = 20 + jsonChunkLen;
  view.setUint32(binHeader, binChunkLen, true);
  view.setUint32(binHeader + 4, 0x004e4942, true);
  u8.set(bin, binHeader + 8);
  return out;
}

export function isHeadNeckNodeName(name: string): boolean {
  if (/endsite/i.test(name)) return false;
  return /head|neck|skull/i.test(name);
}

type Accessor = {
  bufferView: number;
  byteOffset?: number;
  count: number;
  componentType: number;
  type: string;
};

type BufferView = {
  buffer: number;
  byteOffset?: number;
  byteLength: number;
};

type Node = { name?: string };
type Channel = {
  sampler: number;
  target: { node: number; path: string };
};
type Sampler = { input: number; output: number; interpolation?: string };
type Animation = {
  channels: Channel[];
  samplers: Sampler[];
};

export function getAccessorFloats(
  parts: GlbParts,
  accessorIndex: number
): Float32Array {
  const accessors = parts.json.accessors as Accessor[];
  const views = parts.json.bufferViews as BufferView[];
  const acc = accessors[accessorIndex];
  if (!acc) throw new Error("accessor 不存在");
  const bv = views[acc.bufferView];
  if (!bv) throw new Error("bufferView 不存在");
  const start = (bv.byteOffset ?? 0) + (acc.byteOffset ?? 0);
  const comps = acc.type === "VEC4" ? 4 : acc.type === "VEC3" ? 3 : 1;
  const bytes = acc.count * comps * 4;
  return new Float32Array(
    parts.bin.buffer,
    parts.bin.byteOffset + start,
    bytes / 4
  );
}

/** 找到第一个 head 类 rotation 通道的 output accessor 下标 */
export function findHeadRotationAccessorIndex(
  parts: GlbParts
): { accessorIndex: number; nodeName: string } | null {
  const anims = parts.json.animations as Animation[] | undefined;
  const nodes = (parts.json.nodes as Node[]) ?? [];
  if (!anims?.length) return null;
  for (const anim of anims) {
    for (const ch of anim.channels) {
      if (ch.target.path !== "rotation") continue;
      const node = nodes[ch.target.node];
      const name = node?.name ?? "";
      if (!isHeadNeckNodeName(name)) continue;
      if (!/head/i.test(name)) continue;
      const samp = anim.samplers[ch.sampler];
      if (!samp) continue;
      return { accessorIndex: samp.output, nodeName: name };
    }
  }
  for (const anim of anims) {
    for (const ch of anim.channels) {
      if (ch.target.path !== "rotation") continue;
      const node = nodes[ch.target.node];
      const name = node?.name ?? "";
      if (!isHeadNeckNodeName(name)) continue;
      const samp = anim.samplers[ch.sampler];
      if (!samp) continue;
      return { accessorIndex: samp.output, nodeName: name };
    }
  }
  return null;
}

export function forEachHeadNeckRotationAccessor(
  parts: GlbParts,
  fn: (accessorIndex: number, nodeName: string) => void
): void {
  const anims = parts.json.animations as Animation[] | undefined;
  const nodes = (parts.json.nodes as Node[]) ?? [];
  if (!anims?.length) return;
  const seen = new Set<number>();
  for (const anim of anims) {
    for (const ch of anim.channels) {
      if (ch.target.path !== "rotation") continue;
      const node = nodes[ch.target.node];
      const name = node?.name ?? "";
      if (!/head|neck|skull|endsite/i.test(name)) continue;
      const samp = anim.samplers[ch.sampler];
      if (!samp || seen.has(samp.output)) continue;
      seen.add(samp.output);
      fn(samp.output, name);
    }
  }
}
