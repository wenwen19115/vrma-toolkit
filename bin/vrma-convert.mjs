/**
 * CLI: BVH/FBX → VRMA，或对已有 VRMA 再平滑
 *
 *   yarn convert -- --in <dir|file> --out <dir> [--smooth 0.10] [--scale 0.01]
 *   yarn convert -- --smooth-vrma --in <vrma|dir> --out <dir> [--smooth 0.10]
 *   yarn convert -- --fbx --in <fbx|dir> --out <dir> [--smooth 0.10] [--scale 1]
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { Blob as NodeBlob } from "node:buffer";

class FileReaderPolyfill {
  result = null;
  onload = null;
  onloadend = null;
  onerror = null;
  readAsArrayBuffer(blob) {
    Promise.resolve(blob.arrayBuffer())
      .then((buf) => {
        this.result = buf;
        const ev = { target: this };
        this.onload?.(ev);
        this.onloadend?.(ev);
      })
      .catch((err) => this.onerror?.(err));
  }
  readAsDataURL(blob) {
    Promise.resolve(blob.arrayBuffer())
      .then((buf) => {
        this.result =
          "data:application/octet-stream;base64," +
          Buffer.from(buf).toString("base64");
        const ev = { target: this };
        this.onload?.(ev);
        this.onloadend?.(ev);
      })
      .catch((err) => this.onerror?.(err));
  }
}
globalThis.FileReader = FileReaderPolyfill;
if (typeof globalThis.Blob === "undefined") {
  globalThis.Blob = NodeBlob;
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

function parseArgs(argv) {
  const opts = {
    in: null,
    out: null,
    smooth: 0.1,
    scale: null,
    help: false,
    smoothVrma: false,
    fbx: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "-h" || a === "--help") opts.help = true;
    else if (a === "--in") opts.in = argv[++i];
    else if (a === "--out") opts.out = argv[++i];
    else if (a === "--smooth") opts.smooth = Number(argv[++i]);
    else if (a === "--scale") opts.scale = Number(argv[++i]);
    else if (a === "--smooth-vrma") opts.smoothVrma = true;
    else if (a === "--fbx") opts.fbx = true;
  }
  return opts;
}

function listByExt(inputPath, extRe) {
  const st = fs.statSync(inputPath);
  if (st.isFile()) {
    if (!extRe.test(inputPath)) {
      throw new Error(`input file must match ${extRe}`);
    }
    return [inputPath];
  }
  return fs
    .readdirSync(inputPath)
    .filter((f) => extRe.test(f))
    .map((f) => path.join(inputPath, f))
    .sort();
}

function outName(src, fromExt, prefix = "") {
  return (
    prefix +
    path
      .basename(src)
      .replace(fromExt, "")
      .replace(/^Female1_/i, "accad_")
      .toLowerCase() +
    ".vrma"
  );
}

function printHelp() {
  console.log(`vrma-toolkit — BVH / FBX → VRMA · VRMA 再平滑

Usage:
  yarn convert -- --in <bvh|dir> --out <dir> [--smooth 0.10] [--scale 0.01]
  yarn convert -- --fbx --in <fbx|dir> --out <dir> [--smooth 0.10] [--scale 1]
  yarn convert -- --smooth-vrma --in <vrma|dir> --out <dir> [--smooth 0.10]

Options:
  --in            输入文件或目录
  --out           输出目录
  --smooth        头颈 slerp alpha（默认 0.10；越小越稳）
  --scale         单位缩放（BVH 默认 0.01；FBX 默认 1）
  --fbx           按 FBX 批转
  --smooth-vrma   对已有 .vrma 再平滑（不重跑 BVH）
`);
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help || !opts.in || !opts.out) {
    printHelp();
    process.exit(opts.help ? 0 : 1);
  }

  process.env.VRMA_HEAD_SMOOTH_ALPHA = String(
    Number.isFinite(opts.smooth) ? opts.smooth : 0.1
  );

  const inPath = path.resolve(opts.in);
  const outDir = path.resolve(opts.out);
  fs.mkdirSync(outDir, { recursive: true });

  let ok = 0;
  let fail = 0;

  if (opts.smoothVrma) {
    const { smoothVrmaBuffer } = await import(
      pathToFileURL(path.join(ROOT, "src/convert/smoothVrmaBuffer.ts")).href
    );
    const files = listByExt(inPath, /\.vrma$/i);
    console.log(`smooth-vrma ${files.length} file(s); smooth=${opts.smooth}`);
    for (const file of files) {
      const name = path.basename(file).replace(/\.vrma$/i, "") + ".vrma";
      try {
        const nodeBuf = fs.readFileSync(file);
        const ab = nodeBuf.buffer.slice(
          nodeBuf.byteOffset,
          nodeBuf.byteOffset + nodeBuf.byteLength
        );
        const out = smoothVrmaBuffer(ab, opts.smooth);
        fs.writeFileSync(path.join(outDir, name), Buffer.from(out));
        console.log("ok", name, Buffer.from(out).length);
        ok++;
      } catch (e) {
        fail++;
        console.error("FAIL", path.basename(file), e?.message || e);
      }
    }
    console.log(`done ok=${ok} fail=${fail} → ${outDir}`);
    return;
  }

  if (opts.fbx) {
    const { fbxBufferToVrma } = await import(
      pathToFileURL(path.join(ROOT, "src/convert/fbxToVrma.ts")).href
    );
    const scale = opts.scale ?? 1;
    const files = listByExt(inPath, /\.fbx$/i);
    console.log(
      `fbx→vrma ${files.length} file(s); scale=${scale} smooth=${opts.smooth}`
    );
    for (const file of files) {
      const name = outName(file, /\.fbx$/i);
      try {
        const nodeBuf = fs.readFileSync(file);
        const ab = nodeBuf.buffer.slice(
          nodeBuf.byteOffset,
          nodeBuf.byteOffset + nodeBuf.byteLength
        );
        const out = await fbxBufferToVrma(ab, {
          scale,
          smoothAlpha: opts.smooth,
        });
        fs.writeFileSync(path.join(outDir, name), Buffer.from(out));
        console.log("ok", name, Buffer.from(out).length);
        ok++;
      } catch (e) {
        fail++;
        console.error("FAIL", path.basename(file), e?.message || e);
      }
    }
    console.log(`done ok=${ok} fail=${fail} → ${outDir}`);
    return;
  }

  const { BVHLoader } = await import("three/examples/jsm/loaders/BVHLoader.js");
  const { convertBVHToVRMAnimation } = await import(
    pathToFileURL(
      path.join(ROOT, "src/bvh-converter/convertBVHToVRMAnimation.ts")
    ).href
  );

  const scale = opts.scale ?? 0.01;
  const files = listByExt(inPath, /\.bvh$/i);
  console.log(
    `bvh→vrma ${files.length} file(s); scale=${scale} smooth=${opts.smooth}`
  );

  for (const file of files) {
    const name = outName(file, /\.bvh$/i);
    try {
      const text = fs.readFileSync(file, "utf8");
      const bvh = new BVHLoader().parse(text);
      const buf = await convertBVHToVRMAnimation(bvh, {
        scale,
        smoothAlpha: opts.smooth,
      });
      fs.writeFileSync(path.join(outDir, name), Buffer.from(buf));
      console.log("ok", name, Buffer.from(buf).length);
      ok++;
    } catch (e) {
      fail++;
      console.error("FAIL", path.basename(file), e?.message || e);
    }
  }
  console.log(`done ok=${ok} fail=${fail} → ${outDir}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
