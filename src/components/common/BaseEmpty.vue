<script setup lang="ts">
// 虛線框空狀態提示，用於「尚無資料」等場景。
defineProps<{
  text: string
}>()
</script>

<template>
  <div
    class="rounded-lg border border-dashed border-line px-3 py-7 text-center text-sm text-ink-faint"
  >
    {{ text }}
  </div>
</template>
