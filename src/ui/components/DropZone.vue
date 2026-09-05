<template>
  <section class="card drop" @dragover.prevent @drop.prevent="onDrop">
    <input
      ref="inputRef"
      type="file"
      accept=".bvh,.fbx,.vrma"
      multiple
      hidden
      @change="onPick"
    />
    <button class="btn block" type="button" @click="inputRef?.click()">
      选择 / 拖入 BVH · FBX · VRMA
    </button>
    <p class="hint">多文件进队列；VRMA 可直接预览与再平滑</p>
  </section>
</template>

<script setup lang="ts">
import { ref } from "vue";
import type { ToolkitStore } from "../composables/useToolkitStore";

const props = defineProps<{ store: ToolkitStore }>();
const inputRef = ref<HTMLInputElement | null>(null);

function onPick(ev: Event) {
  const input = ev.target as HTMLInputElement;
  if (input.files) props.store.addFiles(input.files);
  input.value = "";
}

function onDrop(ev: DragEvent) {
  if (ev.dataTransfer?.files) props.store.addFiles(ev.dataTransfer.files);
}
</script>
