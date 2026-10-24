<script setup lang="ts">
// 等寬字體文字區塊，用於顯示轉寫結果、向量預覽等純文字輸出。
defineProps<{
  content: string
}>()
</script>

<template>
  <pre
    class="m-0 max-h-[340px] overflow-x-auto overflow-y-auto rounded-control border border-line-soft bg-surface-sunken p-3 font-mono text-[12.5px] leading-relaxed"
    >{{ content }}</pre>
</template>
