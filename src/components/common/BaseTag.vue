<script setup lang="ts">
withDefaults(
  defineProps<{
    variant?: 'accent' | 'warm'
  }>(),
  {
    variant: 'accent',
  },
)
</script>

<template>
  <span
    class="inline-block rounded-chip border border-line-soft px-1.5 py-px font-mono text-[10.5px]"
    :class="variant === 'accent' ? 'bg-accent-soft text-accent' : 'bg-warm-soft text-warm'"
  >
    <slot />
  </span>
</template>
