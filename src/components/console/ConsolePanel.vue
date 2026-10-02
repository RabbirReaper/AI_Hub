<script setup lang="ts">
// 各面板外殼：head（標題 + endpoint 標示）+ body，7 個 view 全用。
defineProps<{
  title: string
  endpoint: string
}>()
</script>

<template>
  <section class="overflow-hidden rounded-card border border-line bg-surface shadow-panel">
    <div
      class="flex flex-wrap items-baseline justify-between gap-3 border-b border-line-soft px-[18px] py-[15px]"
    >
      <h2 class="m-0 font-display text-[17px] font-semibold tracking-tight">{{ title }}</h2>
      <code
        class="max-w-full overflow-x-auto rounded-chip border border-line-soft bg-surface-sunken px-2 py-0.5 font-mono text-[11.5px] whitespace-nowrap text-ink-faint"
        >{{ endpoint }}</code
      >
    </div>
    <div class="flex flex-col gap-4 p-[18px]">
      <slot />
    </div>
  </section>
</template>
