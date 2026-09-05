<template>
  <div class="app">
    <header class="top">
      <div>
        <h1>VRMA Toolkit</h1>
        <p class="sub">BVH / FBX / VRMA · 头颈平滑 · 抖动 · 对比 · zip</p>
      </div>
      <div class="top-actions">
        <button class="btn" type="button" @click="stageRef?.pickVrm()">
          换预览 VRM
        </button>
        <button
          class="btn primary"
          type="button"
          :disabled="!store.canDownload || store.busy"
          @click="store.downloadActive()"
        >
          下载 .vrma
        </button>
      </div>
    </header>

    <div class="body">
      <aside class="side">
        <DropZone :store="store" />
        <ControlsPanel :store="store" />
        <JitterPanel :store="store" />
        <QueueList :store="store" />
        <p v-if="store.status" class="status" :data-kind="store.statusKind">
          {{ store.status }}
        </p>
      </aside>

      <StageView ref="stageRef" :store="store" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useToolkitStore } from "./composables/useToolkitStore";
import DropZone from "./components/DropZone.vue";
import ControlsPanel from "./components/ControlsPanel.vue";
import QueueList from "./components/QueueList.vue";
import JitterPanel from "./components/JitterPanel.vue";
import StageView from "./components/StageView.vue";

const store = useToolkitStore();
const stageRef = ref<{ pickVrm: () => void } | null>(null);
</script>

<style scoped>
.app {
  height: 100%;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 14px 18px;
  border-bottom: 1px solid var(--border);
  background: var(--panel);
}

h1 {
  margin: 0;
  font-size: 18px;
  font-weight: 650;
  letter-spacing: 0.02em;
}

.sub {
  margin: 4px 0 0;
  color: var(--muted);
  font-size: 12px;
}

.top-actions {
  display: flex;
  gap: 8px;
}

.body {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: 320px 1fr;
}

.side {
  border-right: 1px solid var(--border);
  padding: 14px;
  overflow: auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
  background: #151821;
}

.status {
  margin: 0;
  font-size: 12px;
  color: var(--muted);
}

.status[data-kind="ok"] {
  color: var(--ok);
}
.status[data-kind="warn"] {
  color: var(--warn);
}
.status[data-kind="err"] {
  color: var(--danger);
}

@media (max-width: 900px) {
  .body {
    grid-template-columns: 1fr;
    grid-template-rows: auto 1fr;
  }
  .side {
    border-right: none;
    border-bottom: 1px solid var(--border);
    max-height: 46vh;
  }
}
</style>
