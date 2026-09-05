<template>
  <section class="card">
    <label class="field">
      <span>头颈平滑 <strong>{{ store.smooth.toFixed(2) }}</strong></span>
      <input
        v-model.number="store.smooth"
        type="range"
        min="0"
        max="0.35"
        step="0.01"
      />
      <span class="hint">越小越稳；0 = 关闭。推荐 0.08～0.12</span>
    </label>
    <label class="field">
      <span>BVH 缩放 <strong>{{ store.scale }}</strong></span>
      <input
        v-model.number="store.scale"
        type="range"
        min="0.005"
        max="0.05"
        step="0.001"
      />
      <span class="hint">ACCAD 常用 0.01</span>
    </label>
    <label class="field">
      <span>FBX 缩放 <strong>{{ store.fbxScale }}</strong></span>
      <input
        v-model.number="store.fbxScale"
        type="range"
        min="0.01"
        max="2"
        step="0.01"
      />
      <span class="hint">Mixamo 米制常用 1</span>
    </label>

    <button
      class="btn primary block"
      type="button"
      :disabled="!store.queue.length || store.busy"
      @click="store.processAll()"
    >
      {{ store.busy ? "处理中…" : "转换 / 打开并预览" }}
    </button>
    <button
      class="btn block"
      type="button"
      style="margin-top: 8px"
      :disabled="!store.activeItem?.originalVrma || store.busy"
      @click="store.resmoothActive()"
    >
      对选中项再平滑
    </button>

    <label class="check">
      <input v-model="store.compareMode" type="checkbox" />
      对比预览（左原始 / 右当前）
    </label>
  </section>
</template>

<script setup lang="ts">
import type { ToolkitStore } from "../composables/useToolkitStore";

defineProps<{ store: ToolkitStore }>();
</script>
