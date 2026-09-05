<template>
  <section class="card">
    <div class="list-head"><span>头轨抖动</span></div>
    <template v-if="item">
      <p
        v-if="item.jitterBefore?.nodeName || item.jitterAfter?.nodeName"
        class="hint"
      >
        节点：{{ item.jitterAfter?.nodeName || item.jitterBefore?.nodeName }}
      </p>
      <div class="jitter-grid">
        <div>
          <div class="label">原始 avg / max</div>
          <div class="val">{{ fmt(item.jitterBefore) }}</div>
        </div>
        <div>
          <div class="label">当前 avg / max</div>
          <div class="val">{{ fmt(item.jitterAfter) }}</div>
        </div>
      </div>
      <p class="hint">单位 ° / 帧；max 高说明头抖明显</p>
    </template>
    <p v-else class="hint">选中队列项并处理后显示</p>
  </section>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { JitterStats } from "../../core/types";
import type { ToolkitStore } from "../composables/useToolkitStore";

const props = defineProps<{ store: ToolkitStore }>();
const item = computed(() => props.store.activeItem);

function fmt(j: JitterStats | null | undefined) {
  if (!j || !j.keys) return "—";
  return `${j.avgDeg.toFixed(2)}° / ${j.maxDeg.toFixed(2)}°`;
}
</script>
