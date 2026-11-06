<script setup lang="ts">
// 結果區塊的標題列：左側標題、右側選填的 meta 資訊（筆數、耗時等），以及選填的操作按鈕插槽。
withDefaults(
  defineProps<{
    title: string
    meta?: string
  }>(),
  {
    meta: undefined,
  },
)
</script>

<template>
  <div
    class="flex flex-wrap items-center justify-between gap-2.5 font-mono text-[11px] tracking-widest text-ink-faint uppercase"
  >
    <span>{{ title }}</span>
    <span class="flex items-center gap-2.5">
      <span v-if="meta">{{ meta }}</span>
      <slot />
    </span>
  </div>
</template>
