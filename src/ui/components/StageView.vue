<template>
  <main class="stage" :class="{ compare: store.compareMode }">
    <div v-show="!store.compareMode" ref="singleWrap" class="pane">
      <canvas ref="singleCanvas" class="canvas" />
      <div v-if="label" class="tag">{{ label }}</div>
    </div>
    <div v-show="store.compareMode" ref="dualWrap" class="dual">
      <div class="pane">
        <canvas ref="leftCanvas" class="canvas" />
        <div class="tag">原始</div>
      </div>
      <div class="pane">
        <canvas ref="rightCanvas" class="canvas" />
        <div class="tag">当前</div>
      </div>
    </div>
    <div v-if="!ready" class="overlay">正在加载预览模型…</div>
  </main>
</template>

<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { DualPreview, DEFAULT_VRM, PreviewHost } from "../../preview";
import type { ToolkitStore } from "../composables/useToolkitStore";

const props = defineProps<{ store: ToolkitStore }>();

const singleWrap = ref<HTMLElement | null>(null);
const dualWrap = ref<HTMLElement | null>(null);
const singleCanvas = ref<HTMLCanvasElement | null>(null);
const leftCanvas = ref<HTMLCanvasElement | null>(null);
const rightCanvas = ref<HTMLCanvasElement | null>(null);

const ready = ref(false);
const label = ref("");

let singleHost: PreviewHost | null = null;
let dual: DualPreview | null = null;
let resizeObs: ResizeObserver | null = null;
let vrmUrl = DEFAULT_VRM;

async function ensureHosts() {
  await nextTick();
  if (!singleHost && singleCanvas.value) {
    singleHost = new PreviewHost(singleCanvas.value);
    if (singleWrap.value) {
      resizeObs = new ResizeObserver(() => singleHost?.resize());
      resizeObs.observe(singleWrap.value);
    }
    await singleHost.loadVrm(vrmUrl);
  }
  if (!dual && leftCanvas.value && rightCanvas.value) {
    dual = new DualPreview(leftCanvas.value, rightCanvas.value);
    if (dualWrap.value) dual.observe(dualWrap.value);
    await dual.loadVrm(vrmUrl);
  }
}

async function playCurrent() {
  if (!ready.value) return;
  const item = props.store.activeItem;
  try {
    if (props.store.compareMode) {
      if (!dual || !item?.originalVrma || !item.currentVrma) {
        dual?.stop();
        label.value = "";
        return;
      }
      await dual.playPair(item.originalVrma, item.currentVrma);
      label.value = item.name;
    } else {
      if (!singleHost || !item?.currentVrma) {
        singleHost?.stopClip();
        label.value = "";
        return;
      }
      await singleHost.playVrmaBuffer(item.currentVrma.slice(0));
      label.value = item.name;
    }
  } catch (e) {
    props.store.setStatus((e as Error).message || "预览失败", "err");
  }
}

async function loadVrmFile(file: File) {
  const url = URL.createObjectURL(file);
  vrmUrl = url;
  await ensureHosts();
  await singleHost?.loadVrm(url);
  await dual?.loadVrm(url);
  props.store.setStatus(`预览模型：${file.name}`, "ok");
  await playCurrent();
}

function pickVrm() {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".vrm";
  input.addEventListener("change", async () => {
    const file = input.files?.[0];
    if (file) await loadVrmFile(file);
  });
  input.click();
}

defineExpose({ pickVrm });

onMounted(async () => {
  try {
    await ensureHosts();
    ready.value = true;
    props.store.setStatus(
      "就绪：拖入 BVH / FBX / VRMA 后点「转换 / 打开并预览」",
      "ok"
    );
  } catch {
    ready.value = true;
    props.store.setStatus(
      "默认 VRM 加载失败，请点「换预览 VRM」本地选择",
      "warn"
    );
  }
});

watch(
  () => [props.store.playToken, props.store.compareMode, props.store.activeId],
  () => {
    void playCurrent();
  }
);

watch(
  () => props.store.compareMode,
  async () => {
    await nextTick();
    singleHost?.resize();
    dual?.left.resize();
    dual?.right.resize();
    await playCurrent();
  }
);

onBeforeUnmount(() => {
  resizeObs?.disconnect();
  singleHost?.dispose();
  dual?.dispose();
});
</script>

<style scoped>
.stage {
  position: relative;
  min-height: 0;
  background:
    radial-gradient(ellipse at 50% 20%, #1c2433 0%, transparent 55%),
    var(--bg);
}

.pane {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 0;
}

.dual {
  display: grid;
  grid-template-columns: 1fr 1fr;
  height: 100%;
  min-height: 0;
}

.dual .pane {
  border-right: 1px solid var(--border);
}

.dual .pane:last-child {
  border-right: none;
}

.canvas {
  width: 100%;
  height: 100%;
  display: block;
}

.tag {
  position: absolute;
  left: 10px;
  top: 10px;
  font-size: 11px;
  color: var(--muted);
  background: rgba(10, 12, 16, 0.55);
  padding: 4px 8px;
  border-radius: 6px;
  max-width: 80%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.overlay {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  color: var(--muted);
  pointer-events: none;
  background: rgba(10, 12, 16, 0.35);
}
</style>
