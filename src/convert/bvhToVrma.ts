import { BVHLoader } from "three/examples/jsm/loaders/BVHLoader.js";
import { convertBVHToVRMAnimation } from "../bvh-converter/convertBVHToVRMAnimation";
import type { ConvertOptions } from "../core/types";

export async function bvhTextToVrma(
  text: string,
  options?: ConvertOptions
): Promise<ArrayBuffer> {
  const loader = new BVHLoader();
  const bvh = loader.parse(text);
  return convertBVHToVRMAnimation(bvh, options);
}

export async function bvhBufferToVrma(
  buffer: ArrayBuffer,
  options?: ConvertOptions
): Promise<ArrayBuffer> {
  const text = new TextDecoder().decode(buffer);
  return bvhTextToVrma(text, options);
}
