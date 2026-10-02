<script setup lang="ts">
defineProps<{
  content: string
}>()
</script>

<template>
  <pre
    class="m-0 max-h-[340px] overflow-x-auto overflow-y-auto rounded-control border border-line-soft bg-surface-sunken p-3 font-mono text-[12.5px] leading-relaxed"
    >{{ content }}</pre>
</template>
