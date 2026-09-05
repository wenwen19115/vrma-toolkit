import { computed, reactive, ref, shallowRef } from "vue";
import { zipSync } from "fflate";
import { analyzeHeadJitter } from "../../core/analyzeHeadJitter";
import type { JitterStats, SourceKind } from "../../core/types";
import { bvhBufferToVrma } from "../../convert/bvhToVrma";
import { fbxBufferToVrma } from "../../convert/fbxToVrma";
import { smoothVrmaBuffer } from "../../convert/smoothVrmaBuffer";

export interface QueueItem {
  id: string;
  name: string;
  kind: SourceKind;
  sourceFile: File;
  originalVrma: ArrayBuffer | null;
  currentVrma: ArrayBuffer | null;
  jitterBefore: JitterStats | null;
  jitterAfter: JitterStats | null;
  error: string | null;
}

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function kindOf(name: string): SourceKind | null {
  if (/\.bvh$/i.test(name)) return "bvh";
  if (/\.fbx$/i.test(name)) return "fbx";
  if (/\.vrma$/i.test(name)) return "vrma";
  return null;
}

function safeJitter(buf: ArrayBuffer): JitterStats | null {
  try {
    return analyzeHeadJitter(buf);
  } catch {
    return null;
  }
}

export function formatSize(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

export function useToolkitStore() {
  const queue = ref<QueueItem[]>([]);
  const activeId = ref<string | null>(null);
  const busy = ref(false);
  const smooth = ref(0.1);
  const scale = ref(0.01);
  const fbxScale = ref(1);
  const compareMode = ref(false);
  const status = ref("");
  const statusKind = ref<"ok" | "warn" | "err">("ok");
  const playToken = shallowRef(0);

  const activeItem = computed(
    () => queue.value.find((q) => q.id === activeId.value) ?? null
  );
  const canDownload = computed(() => !!activeItem.value?.currentVrma);
  const canZip = computed(() =>
    queue.value.some((q) => q.currentVrma != null)
  );

  function setStatus(msg: string, kind: "ok" | "warn" | "err" = "ok") {
    status.value = msg;
    statusKind.value = kind;
  }

  function bumpPlay() {
    playToken.value++;
  }

  function addFiles(files: FileList | File[]) {
    const list = [...files];
    let added = 0;
    for (const file of list) {
      const kind = kindOf(file.name);
      if (!kind) continue;
      queue.value.push({
        id: uid(),
        name: file.name,
        kind,
        sourceFile: file,
        originalVrma: null,
        currentVrma: null,
        jitterBefore: null,
        jitterAfter: null,
        error: null,
      });
      added++;
    }
    if (!added) {
      setStatus("请选择 .bvh / .fbx / .vrma", "warn");
      return;
    }
    if (!activeId.value && queue.value.length) {
      activeId.value = queue.value[0]!.id;
    }
    setStatus(`已加入 ${added} 个文件`, "ok");
  }

  function clearQueue() {
    queue.value = [];
    activeId.value = null;
    bumpPlay();
  }

  function selectItem(id: string) {
    activeId.value = id;
    bumpPlay();
  }

  async function processOne(item: QueueItem) {
    item.error = null;
    try {
      if (item.kind === "vrma") {
        const buf = await item.sourceFile.arrayBuffer();
        item.originalVrma = buf.slice(0);
        item.currentVrma = buf.slice(0);
        item.jitterBefore = safeJitter(item.originalVrma);
        item.jitterAfter = item.jitterBefore;
        return;
      }

      const src = await item.sourceFile.arrayBuffer();
      const scaleOpt = item.kind === "fbx" ? fbxScale.value : scale.value;

      const original =
        item.kind === "bvh"
          ? await bvhBufferToVrma(src, { scale: scaleOpt, smoothAlpha: 0 })
          : await fbxBufferToVrma(src, { scale: scaleOpt, smoothAlpha: 0 });

      item.originalVrma = original;
      item.jitterBefore = safeJitter(original);

      if (smooth.value > 0) {
        item.currentVrma = smoothVrmaBuffer(original.slice(0), smooth.value);
      } else {
        item.currentVrma = original.slice(0);
      }
      item.jitterAfter = safeJitter(item.currentVrma);
    } catch (e) {
      item.error = (e as Error).message || "处理失败";
      item.originalVrma = null;
      item.currentVrma = null;
      item.jitterBefore = null;
      item.jitterAfter = null;
    }
  }

  async function processAll() {
    if (!queue.value.length || busy.value) return;
    busy.value = true;
    setStatus("处理中…", "ok");
    try {
      for (const item of queue.value) {
        await processOne(item);
      }
      const firstOk =
        queue.value.find((q) => q.id === activeId.value && q.currentVrma) ||
        queue.value.find((q) => q.currentVrma);
      if (firstOk) {
        activeId.value = firstOk.id;
        bumpPlay();
        setStatus(
          `完成：成功 ${queue.value.filter((q) => q.currentVrma).length} / ${queue.value.length}`,
          "ok"
        );
      } else {
        setStatus("全部失败，请看队列错误", "err");
      }
    } finally {
      busy.value = false;
    }
  }

  function resmoothActive() {
    const item = activeItem.value;
    if (!item?.originalVrma) {
      setStatus("先处理出 VRMA，再点再平滑", "warn");
      return;
    }
    try {
      if (smooth.value <= 0) {
        item.currentVrma = item.originalVrma.slice(0);
      } else {
        item.currentVrma = smoothVrmaBuffer(
          item.originalVrma.slice(0),
          smooth.value
        );
      }
      item.jitterAfter = safeJitter(item.currentVrma);
      item.error = null;
      bumpPlay();
      setStatus(`已再平滑：${item.name}`, "ok");
    } catch (e) {
      setStatus((e as Error).message || "再平滑失败", "err");
    }
  }

  function downloadActive() {
    const item = activeItem.value;
    if (!item?.currentVrma) return;
    const base = item.name.replace(/\.(bvh|fbx|vrma)$/i, "").toLowerCase();
    const blob = new Blob([item.currentVrma], { type: "model/gltf-binary" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${base}.vrma`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function downloadZip() {
    const files: Record<string, Uint8Array> = {};
    for (const item of queue.value) {
      if (!item.currentVrma) continue;
      const base = item.name.replace(/\.(bvh|fbx|vrma)$/i, "").toLowerCase();
      files[`${base}.vrma`] = new Uint8Array(item.currentVrma.slice(0));
    }
    if (!Object.keys(files).length) {
      setStatus("没有可打包的 VRMA", "warn");
      return;
    }
    const zipped = zipSync(files, { level: 6 });
    const blob = new Blob([zipped], { type: "application/zip" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "vrma-batch.zip";
    a.click();
    URL.revokeObjectURL(a.href);
    setStatus(`已打包 ${Object.keys(files).length} 个文件`, "ok");
  }

  return reactive({
    queue,
    activeId,
    activeItem,
    busy,
    smooth,
    scale,
    fbxScale,
    compareMode,
    status,
    statusKind,
    playToken,
    canDownload,
    canZip,
    setStatus,
    addFiles,
    clearQueue,
    selectItem,
    processAll,
    resmoothActive,
    downloadActive,
    downloadZip,
    bumpPlay,
  });
}

export type ToolkitStore = ReturnType<typeof useToolkitStore>;
