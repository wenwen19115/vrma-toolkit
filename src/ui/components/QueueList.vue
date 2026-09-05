<template>
  <section class="card list-card">
    <div class="list-head">
      <span>队列 {{ store.queue.length }}</span>
      <div class="list-actions">
        <button
          v-if="store.canZip"
          class="link"
          type="button"
          @click="store.downloadZip()"
        >
          打包 zip
        </button>
        <button
          v-if="store.queue.length"
          class="link"
          type="button"
          @click="store.clearQueue()"
        >
          清空
        </button>
      </div>
    </div>
    <ul class="list">
      <li
        v-for="item in store.queue"
        :key="item.id"
        :class="{ on: item.id === store.activeId }"
        @click="store.selectItem(item.id)"
      >
        <div class="name" :title="item.name">
          <span class="kind">{{ item.kind }}</span>
          {{ item.name }}
        </div>
        <div class="meta">
          <span v-if="item.error" class="err">{{ item.error }}</span>
          <span v-else-if="item.currentVrma">{{
            formatSize(item.currentVrma.byteLength)
          }}</span>
          <span v-else class="muted">待处理</span>
        </div>
      </li>
    </ul>
  </section>
</template>

<script setup lang="ts">
import {
  formatSize,
  type ToolkitStore,
} from "../composables/useToolkitStore";

defineProps<{ store: ToolkitStore }>();
</script>
