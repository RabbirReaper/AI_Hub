<script setup lang="ts">
// Phase 1 先寫死 idle，Phase 2 接上 stores/models.ts 的 health/healthLabel。
import type { HealthState } from '@/types/ui'

withDefaults(
  defineProps<{
    health?: HealthState
    label?: string
  }>(),
  {
    health: 'idle',
    label: '尚未連線',
  },
)

defineEmits<{
  click: []
}>()
</script>

<template>
  <button
    type="button"
    class="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1.5 font-mono text-xs text-ink-soft"
    @click="$emit('click')"
  >
    <span
      class="h-[7px] w-[7px] flex-none rounded-full bg-ink-faint"
      :class="[health === 'live' && 'bg-ok', health === 'down' && 'bg-bad']"
    />
    <span>{{ label }}</span>
  </button>
</template>
