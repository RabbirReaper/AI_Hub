<script setup lang="ts">
import type { PanelStatus } from '@/types/ui'

withDefaults(
  defineProps<{
    status?: PanelStatus
    text?: string
  }>(),
  {
    status: 'idle',
    text: '',
  },
)
</script>

<template>
  <span
    class="inline-flex min-h-5 items-center gap-1.5 font-mono text-xs text-ink-faint"
    :class="[status === 'err' && 'text-bad', status === 'ok' && 'text-ok']"
  >
    <span
      v-if="status === 'busy'"
      class="h-[11px] w-[11px] flex-none animate-spin rounded-full border-2 border-line border-t-accent"
    />
    <span v-if="text">{{ text }}</span>
  </span>
</template>
