<script setup lang="ts">
// 錯誤訊息框，顯示 ApiError.message。
defineProps<{
  message: string
}>()
</script>

<template>
  <div
    class="break-words rounded-control border border-bad bg-bad-soft px-3.5 py-2.5 font-mono text-sm leading-relaxed text-bad"
  >
    {{ message }}
  </div>
</template>
