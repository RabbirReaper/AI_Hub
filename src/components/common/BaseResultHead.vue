<script setup lang="ts">
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
    <span v-if="meta">{{ meta }}</span>
  </div>
</template>
